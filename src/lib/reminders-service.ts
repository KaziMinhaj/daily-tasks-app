import { prisma } from "./prisma";
import { addDays, startOfDay } from "date-fns";
import { sendTaskDueReminderEmail, sendTaskAssignedEmail } from "./email-service";

export interface MaintenanceReport {
  notificationsSent: number;
  dueReminderEmailsSent: number;
  recurringInstancesGenerated: number;
  overdueTasksDetected: number;
}

export function getTimezoneParts(date: Date, timeZone: string = "Asia/Dhaka") {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    for (const p of parts) {
      map[p.type] = p.value;
    }
    return {
      year: parseInt(map.year, 10),
      month: parseInt(map.month, 10),
      day: parseInt(map.day, 10),
      weekday: map.weekday.toUpperCase(),
      hour: parseInt(map.hour, 10),
      minute: parseInt(map.minute, 10),
      dateString: `${map.year}-${map.month}-${map.day}`,
    };
  } catch {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      weekday: [
        "SUNDAY",
        "MONDAY",
        "TUESDAY",
        "WEDNESDAY",
        "THURSDAY",
        "FRIDAY",
        "SATURDAY",
      ][date.getDay()],
      hour: date.getHours(),
      minute: date.getMinutes(),
      dateString: date.toISOString().slice(0, 10),
    };
  }
}

export function hasTimeArrived(
  currentHour: number,
  currentMinute: number,
  targetTimeStr?: string | null
): boolean {
  if (!targetTimeStr) return true;
  const [targetH, targetM] = targetTimeStr
    .split(":")
    .map((v) => parseInt(v, 10) || 0);
  if (currentHour > targetH) return true;
  if (currentHour === targetH && currentMinute >= targetM) return true;
  return false;
}

/**
 * Main scheduled job function.
 * 1. Finds non-completed tasks whose due dates are approaching within 24 hours,
 *    sends reminder email to assignees, and flags `dueReminderSentAt` in database.
 * 2. Checks overdue tasks and generates in-app alerts.
 * 3. Auto-generates next instances for recurring tasks that were completed.
 */
export async function runScheduledMaintenance(): Promise<MaintenanceReport> {
  const report: MaintenanceReport = {
    notificationsSent: 0,
    dueReminderEmailsSent: 0,
    recurringInstancesGenerated: 0,
    overdueTasksDetected: 0,
  };

  const now = new Date();
  const in24Hours = addDays(now, 1);

  // 1. Process Due Date Approaching Tasks (within next 24 hours)
  // Logic: Check for non-completed tasks whose due dates are approaching (e.g. within next 24h)
  // Prevention: `dueReminderSentAt: null` ensures the user receives this reminder only once per task.
  const approachingTasks = await prisma.task.findMany({
    where: {
      status: { not: "DONE" },
      isCompleted: false,
      dueDate: {
        gte: now,
        lte: in24Hours,
      },
      dueReminderSentAt: null, // Must not have received a reminder yet!
    },
    include: {
      assignments: {
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  for (const task of approachingTasks) {
    for (const assignment of task.assignments) {
      const user = assignment.user;
      if (!user) continue;

      // In-app notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: "সময়সীমা সন্নিকটে (Due in 24 Hours)",
          message: `'${task.title}' কাজের মেয়াদ আগামী ২৪ ঘণ্টার মধ্যে শেষ হবে।`,
          type: "TASK_DUE_SOON",
          link: `/tasks/${task.id}`,
        },
      });
      report.notificationsSent++;

      // Action: Send reminder email to the assignee
      if (user.email) {
        try {
          await sendTaskDueReminderEmail(
            { email: user.email, name: user.name },
            {
              id: task.id,
              taskCode: task.taskCode,
              title: task.title,
              description: task.description,
              taskType: task.taskType,
              priority: task.priority,
              priorityNote: task.priorityNote,
              dueDate: task.dueDate,
              department: task.department,
              territory: task.territory,
              remarks: task.remarks,
            }
          );
          report.dueReminderEmailsSent++;
        } catch (err) {
          console.error(`Failed to send due reminder email for task ${task.id}:`, err);
        }
      }
    }

    // Prevention: Record timestamp in database so this task never triggers duplicate reminder
    await prisma.task.update({
      where: { id: task.id },
      data: {
        dueReminderSentAt: new Date(),
      },
    });
  }

  // 2. Process Overdue Tasks (In-app notifications)
  const overdueTasks = await prisma.task.findMany({
    where: {
      status: { not: "DONE" },
      isCompleted: false,
      dueDate: {
        lt: startOfDay(now),
      },
    },
    include: {
      assignments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  report.overdueTasksDetected = overdueTasks.length;

  for (const task of overdueTasks) {
    for (const assignment of task.assignments) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId: assignment.userId,
          title: "মেয়াদোত্তীর্ণ কাজ (Overdue)",
          createdAt: { gte: startOfDay(now) },
        },
      });

      if (!existing) {
        await prisma.notification.create({
          data: {
            userId: assignment.userId,
            title: "মেয়াদোত্তীর্ণ কাজ (Overdue)",
            message: `'${task.title}' কাজের নির্ধারিত সময় অতিবাহিত হয়েছে। অতি দ্রুত সম্পন্ন করুন।`,
            type: "TASK_OVERDUE",
            link: `/tasks/${task.id}`,
          },
        });
        report.notificationsSent++;
      }
    }
  }

  // 3. Process Automated RECURRING Tasks (Instantiate according to exact schedule)
  const recurringTasks = await prisma.task.findMany({
    where: {
      taskType: "RECURRING",
    },
    include: {
      assignments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  for (const parent of recurringTasks) {
    const tz = getTimezoneParts(now, parent.recurrenceTimezone || "Asia/Dhaka");
    const freq = (
      parent.recurrenceFrequency ||
      (parent.recurrenceRule?.includes("DAILY")
        ? "DAILY"
        : parent.recurrenceRule?.includes("MONTHLY")
        ? "MONTHLY"
        : "WEEKLY")
    ).toUpperCase();

    const targetTime = parent.recurrenceTime || "09:00";
    const timeReached = hasTimeArrived(tz.hour, tz.minute, targetTime);

    // Check if an instance was already generated for this recurring task today
    let alreadyGeneratedToday = false;
    if (parent.lastGeneratedAt) {
      const lastTz = getTimezoneParts(
        parent.lastGeneratedAt,
        parent.recurrenceTimezone || "Asia/Dhaka"
      );
      if (lastTz.dateString === tz.dateString) {
        alreadyGeneratedToday = true;
      }
    }

    let shouldGenerate = false;
    let scheduledDueDate: Date = new Date(`${tz.dateString}T23:59:59.999Z`);
    let executionNote = "";

    if (freq === "DAILY") {
      if (timeReached && !alreadyGeneratedToday) {
        shouldGenerate = true;
        executionNote = `Daily recurring task triggered at ${targetTime} (${tz.dateString})`;
      }
    } else if (freq === "WEEKLY") {
      const rawDays =
        parent.recurrenceDays ||
        (parent.recurrenceRule?.includes("SATURDAY") ? "SATURDAY" : "SATURDAY");
      const normalizedDays = rawDays
        .toUpperCase()
        .split(",")
        .map((d) => d.trim());

      const isDayMatch = normalizedDays.some(
        (d) =>
          tz.weekday.startsWith(d) ||
          d.startsWith(tz.weekday.slice(0, 3)) ||
          d === tz.weekday
      );

      if (isDayMatch && timeReached && !alreadyGeneratedToday) {
        shouldGenerate = true;
        executionNote = `Weekly recurring task triggered on ${tz.weekday} at ${targetTime}`;
      }
    } else if (freq === "MONTHLY") {
      const targetDay = parseInt(parent.recurrenceDates || "1", 10) || 1;
      const daysInMonth = new Date(tz.year, tz.month, 0).getDate();
      const effectiveDay = Math.min(targetDay, daysInMonth);

      if (tz.day === effectiveDay && timeReached && !alreadyGeneratedToday) {
        shouldGenerate = true;
        executionNote = `Monthly recurring task triggered on day ${effectiveDay} at ${targetTime}`;
      }
    } else if (freq === "CUSTOM") {
      if (parent.recurrenceDates) {
        try {
          const slots: Array<{ date: string; time: string; generated?: boolean }> =
            JSON.parse(parent.recurrenceDates);
          let updatedSlots = false;

          for (const slot of slots) {
            if (slot.generated) continue;
            const isToday = slot.date === tz.dateString;
            const isPastDate = slot.date < tz.dateString;
            const slotTimeArrived = hasTimeArrived(tz.hour, tz.minute, slot.time);

            if (isPastDate || (isToday && slotTimeArrived)) {
              const count = await prisma.task.count();
              const taskCode = `TSK-${String(count + 1).padStart(3, "0")}`;
              const slotDueDate = new Date(`${slot.date}T${slot.time || "23:59"}:00Z`);

              const newInstance = await prisma.task.create({
                data: {
                  taskCode,
                  title: parent.title,
                  description: parent.description,
                  taskType: "ONE_TIME",
                  parentTaskId: parent.id,
                  priority: parent.priority,
                  priorityNote: parent.priorityNote,
                  dueDate: slotDueDate,
                  remarks: parent.remarks,
                  territory: parent.territory,
                  department: parent.department,
                  status: "PENDING",
                  isCompleted: false,
                  assignedById: parent.assignedById,
                  assignments: {
                    create: parent.assignments.map((a) => ({ userId: a.userId })),
                  },
                },
                include: {
                  assignments: {
                    include: { user: true },
                  },
                },
              });

              slot.generated = true;
              updatedSlots = true;
              report.recurringInstancesGenerated++;

              await prisma.activityLog.create({
                data: {
                  taskId: newInstance.id,
                  userId: parent.assignedById,
                  action: "RECURRING_GENERATED",
                  details: `Custom recurring instance generated for ${slot.date} at ${slot.time}`,
                },
              });

              for (const a of newInstance.assignments) {
                if (a.user) {
                  await prisma.notification.create({
                    data: {
                      userId: a.userId,
                      title: "স্বয়ংক্রিয় টাস্ক তৈরি (Scheduled Task Generated)",
                      message: `'${parent.title}' কাজের নির্ধারিত সময়সূচী অনুযায়ী নতুন টাস্ক তৈরি হয়েছে।`,
                      type: "TASK_ASSIGNED",
                      link: `/tasks/${newInstance.id}`,
                    },
                  });
                  report.notificationsSent++;

                  if (a.user.email) {
                    try {
                      await sendTaskAssignedEmail(
                        { email: a.user.email, name: a.user.name },
                        {
                          id: newInstance.id,
                          taskCode: newInstance.taskCode,
                          title: newInstance.title,
                          description: newInstance.description,
                          priority: newInstance.priority,
                          dueDate: newInstance.dueDate,
                          department: newInstance.department,
                          territory: newInstance.territory,
                          remarks: newInstance.remarks,
                          assignedByName: "System Scheduler (স্বয়ংক্রিয় সময়সূচী)",
                        }
                      );
                    } catch (e) {
                      console.error("Email send failed for recurring custom instance:", e);
                    }
                  }
                }
              }
            }
          }

          if (updatedSlots) {
            await prisma.task.update({
              where: { id: parent.id },
              data: {
                recurrenceDates: JSON.stringify(slots),
                lastGeneratedAt: now,
              },
            });
          }
        } catch (e) {
          console.error("Failed to parse custom recurrenceDates:", e);
        }
      }
    }

    if (shouldGenerate) {
      const count = await prisma.task.count();
      const taskCode = `TSK-${String(count + 1).padStart(3, "0")}`;

      const newInstance = await prisma.task.create({
        data: {
          taskCode,
          title: parent.title,
          description: parent.description,
          taskType: "ONE_TIME",
          parentTaskId: parent.id,
          priority: parent.priority,
          priorityNote: parent.priorityNote,
          dueDate: scheduledDueDate,
          remarks: parent.remarks,
          territory: parent.territory,
          department: parent.department,
          status: "PENDING",
          isCompleted: false,
          assignedById: parent.assignedById,
          assignments: {
            create: parent.assignments.map((a) => ({ userId: a.userId })),
          },
        },
        include: {
          assignments: {
            include: { user: true },
          },
        },
      });

      await prisma.task.update({
        where: { id: parent.id },
        data: {
          lastGeneratedAt: now,
        },
      });

      await prisma.activityLog.create({
        data: {
          taskId: newInstance.id,
          userId: parent.assignedById,
          action: "RECURRING_GENERATED",
          details: executionNote,
        },
      });

      report.recurringInstancesGenerated++;

      for (const a of newInstance.assignments) {
        if (a.user) {
          await prisma.notification.create({
            data: {
              userId: a.userId,
              title: "স্বয়ংক্রিয় টাস্ক তৈরি (Scheduled Task Generated)",
              message: `'${parent.title}' কাজের নির্ধারিত সময়সূচী অনুযায়ী নতুন টাস্ক তৈরি হয়েছে।`,
              type: "TASK_ASSIGNED",
              link: `/tasks/${newInstance.id}`,
            },
          });
          report.notificationsSent++;

          if (a.user.email) {
            try {
              await sendTaskAssignedEmail(
                { email: a.user.email, name: a.user.name },
                {
                  id: newInstance.id,
                  taskCode: newInstance.taskCode,
                  title: newInstance.title,
                  description: newInstance.description,
                  priority: newInstance.priority,
                  dueDate: newInstance.dueDate,
                  department: newInstance.department,
                  territory: newInstance.territory,
                  remarks: newInstance.remarks,
                  assignedByName: "System Scheduler (স্বয়ংক্রিয় সময়সূচী)",
                }
              );
            } catch (e) {
              console.error("Email send failed for recurring instance:", e);
            }
          }
        }
      }
    }
  }

  return report;
}

/**
 * In-process periodic background runner (every 60 seconds)
 * Ensures the system automatically runs maintenance and instantiates recurring tasks accurately.
 */
let isCronInitialized = false;

export function initBackgroundCron() {
  if (isCronInitialized) return;
  isCronInitialized = true;

  console.log(
    "⏰ Background cron job initialized: checking approaching due tasks and recurring schedules every 1 minute."
  );

  // Run initial check after 3 seconds of startup
  setTimeout(() => {
    runScheduledMaintenance().catch((err) =>
      console.error("Initial scheduled maintenance error:", err)
    );
  }, 3000);

  // Set recurring interval: every 60 seconds (1 minute)
  setInterval(() => {
    runScheduledMaintenance().catch((err) =>
      console.error("Scheduled maintenance error:", err)
    );
  }, 60 * 1000);
}
