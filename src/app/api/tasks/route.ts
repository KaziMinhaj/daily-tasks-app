import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hashPassword } from "@/lib/auth";
import { sendTaskAssignedEmail } from "@/lib/email-service";
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek } from "date-fns";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional().nullable(),
  taskType: z.enum(["ONE_TIME", "ONGOING", "RECURRING"]).default("ONE_TIME"),
  recurrenceRule: z.string().optional().nullable(),
  recurrenceFrequency: z.string().optional().nullable(),
  recurrenceDays: z.string().optional().nullable(),
  recurrenceDates: z.string().optional().nullable(),
  recurrenceTime: z.string().optional().nullable(),
  recurrenceTimezone: z.string().optional().nullable(),
  priority: z.number().int().min(1).max(10).optional().nullable(),
  priorityNote: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  territory: z.string().optional().nullable(),
  department: z.string().default("Operations"),
  assigneeIds: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's current permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true, canViewAllTasks: true, canCreateTask: true },
    });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const assigneeId = searchParams.get("assigneeId");
    const taskType = searchParams.get("taskType");
    const priority = searchParams.get("priority");
    const department = searchParams.get("department");
    const dateFilter = searchParams.get("dateFilter");
    const customDate = searchParams.get("customDate");
    const overdueOnly = searchParams.get("overdueOnly") === "true";
    const search = searchParams.get("search")?.trim();
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    // Permission visibility:
    // Only SUPERADMIN or users with canViewAllTasks=true can see all tasks.
    // Otherwise, user only sees tasks they created or are assigned to!
    const canSeeAll =
      currentUser?.role === "SUPERADMIN" ||
      Boolean(currentUser?.canViewAllTasks);

    const conditions: any[] = [];

    if (!canSeeAll) {
      conditions.push({
        OR: [
          { assignments: { some: { userId: session.id } } },
          { assignedById: session.id },
        ],
      });
    }

    if (status && status !== "ALL") {
      if (status === "DONE" || status === "completed") {
        conditions.push({
          OR: [{ status: "DONE" }, { isCompleted: true }],
        });
      } else if (status === "IN_PROGRESS" || status === "in_progress") {
        conditions.push({
          status: "IN_PROGRESS",
          isCompleted: false,
        });
      } else if (status === "PENDING" || status === "pending") {
        conditions.push({
          status: "PENDING",
          isCompleted: false,
        });
      } else if (status === "NOT_DONE" || status === "not_completed") {
        conditions.push({
          status: { not: "DONE" },
          isCompleted: false,
        });
      } else {
        conditions.push({ status });
      }
    }

    if (taskType && taskType !== "ALL") {
      conditions.push({ taskType });
    }

    if (department && department !== "ALL") {
      conditions.push({ department });
    }

    if (priority && !isNaN(Number(priority))) {
      conditions.push({ priority: Number(priority) });
    }

    if (assigneeId && assigneeId !== "ALL") {
      conditions.push({ assignments: { some: { userId: assigneeId } } });
    }

    // Due Date Range Filtering
    if (dateFilter && dateFilter !== "ALL") {
      const now = new Date();
      if (dateFilter === "TODAY") {
        conditions.push({
          dueDate: {
            gte: startOfDay(now),
            lte: endOfDay(now),
          },
        });
      } else if (dateFilter === "NEXT_3_DAYS") {
        conditions.push({
          dueDate: {
            gte: startOfDay(now),
            lte: endOfDay(addDays(now, 3)),
          },
        });
      } else if (dateFilter === "THIS_WEEK") {
        conditions.push({
          dueDate: {
            gte: startOfWeek(now, { weekStartsOn: 6 }), // Saturday start
            lte: endOfWeek(now, { weekStartsOn: 6 }),
          },
        });
      } else if (dateFilter === "OVERDUE") {
        conditions.push({
          status: { not: "DONE" },
          dueDate: { lt: startOfDay(now) },
        });
      } else if (dateFilter === "ONGOING") {
        conditions.push({
          OR: [{ taskType: "ONGOING" }, { dueDate: null }],
        });
      } else if (dateFilter === "CUSTOM" && customDate) {
        const parsed = new Date(customDate);
        if (!isNaN(parsed.getTime())) {
          conditions.push({
            dueDate: {
              gte: startOfDay(parsed),
              lte: endOfDay(parsed),
            },
          });
        }
      }
    }

    if (overdueOnly) {
      conditions.push({
        status: { not: "DONE" },
        dueDate: { lt: new Date() },
      });
    }

    if (search) {
      conditions.push({
        OR: [
          { title: { contains: search } },
          { description: { contains: search } },
          { remarks: { contains: search } },
          { territory: { contains: search } },
          { department: { contains: search } },
          { taskCode: { contains: search } },
        ],
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    let orderBy: any = { createdAt: "desc" };
    if (sortBy === "dueDate") {
      orderBy = { dueDate: sortOrder };
    } else if (sortBy === "priority") {
      orderBy = { priority: sortOrder };
    } else if (sortBy === "title") {
      orderBy = { title: sortOrder };
    } else if (sortBy === "status") {
      orderBy = { status: sortOrder };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy,
      include: {
        assignedBy: {
          select: { id: true, name: true, role: true, designation: true, department: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, name: true, role: true, designation: true, department: true },
            },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check permission to create task
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true, canCreateTask: true, canAssignTask: true, name: true },
    });

    if (user?.role !== "SUPERADMIN" && !user?.canCreateTask) {
      return NextResponse.json(
        { error: "আপনার টাস্ক তৈরি করার অনুমতি নেই (You do not have permission to create tasks)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;
    const count = await prisma.task.count();
    const taskCode = `TSK-${String(count + 1).padStart(3, "0")}`;

    const dueDate = data.dueDate && data.taskType !== "ONGOING" ? new Date(data.dueDate) : null;

    // Resolve assignees: support both user IDs and direct email addresses
    const resolvedUserIds: string[] = [];
    for (const item of data.assigneeIds) {
      if (!item) continue;
      if (item.includes("@")) {
        const cleanEmail = item.trim().toLowerCase();
        let matchedUser = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });
        if (!matchedUser) {
          matchedUser = await prisma.user.create({
            data: {
              email: cleanEmail,
              name: cleanEmail.split("@")[0],
              role: "MEMBER",
              department: data.department || "Business Operations",
              password: await hashPassword("Default@1234"),
              canCreateTask: false,
              canCompleteTask: true,
              canAssignTask: false,
              canEditTask: false,
              canDeleteTask: false,
              canViewAllTasks: false,
            },
          });
        }
        resolvedUserIds.push(matchedUser.id);
      } else {
        resolvedUserIds.push(item);
      }
    }

    // Filter assignees based on canAssignTask permission
    let assigneesToCreate = resolvedUserIds;
    if (user?.role !== "SUPERADMIN" && !user?.canAssignTask) {
      // If user cannot assign tasks to others, self-assign only
      assigneesToCreate = [session.id];
    }

    const task = await prisma.task.create({
      data: {
        taskCode,
        title: data.title,
        description: data.description,
        taskType: data.taskType,
        recurrenceRule: data.recurrenceRule,
        recurrenceFrequency: data.recurrenceFrequency,
        recurrenceDays: data.recurrenceDays,
        recurrenceDates: data.recurrenceDates,
        recurrenceTime: data.recurrenceTime,
        recurrenceTimezone: data.recurrenceTimezone || "Asia/Dhaka",
        priority: data.priority,
        priorityNote: data.priorityNote,
        dueDate,
        remarks: data.remarks,
        territory: data.territory,
        department: data.department || "Business Operations",
        assignedById: session.id,
        assignments: {
          create: assigneesToCreate.map((userId) => ({ userId })),
        },
      },
      include: {
        assignedBy: {
          select: { id: true, name: true, role: true, designation: true, department: true },
        },
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, designation: true, department: true } },
          },
        },
      },
    });

    // Activity Log
    await prisma.activityLog.create({
      data: {
        taskId: task.id,
        userId: session.id,
        action: "CREATED",
        details: `Task '${task.title}' created by ${session.name}`,
      },
    });

    // Notify assignees (In-app + Automated Email notification)
    for (const assignment of task.assignments) {
      const assignedUser = assignment.user;
      if (assignedUser.id !== session.id) {
        await prisma.notification.create({
          data: {
            userId: assignedUser.id,
            title: "নতুন টাস্ক বরাদ্দ (New Task Assigned)",
            message: `${session.name} আপনাকে '${task.title}' কাজে নিযুক্ত করেছেন।`,
            type: "TASK_ASSIGNED",
            link: `/tasks/${task.id}`,
          },
        });
      }

      // Automated email notification to assigned member
      if (assignedUser.email) {
        console.log(`[POST /api/tasks] Dispatching assignment email to ${assignedUser.email} for task ${task.taskCode}...`);
        try {
          const emailRes = await sendTaskAssignedEmail(
            { email: assignedUser.email, name: assignedUser.name },
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
              assignedByName: session.name,
            }
          );
          console.log(`[POST /api/tasks] Email dispatch result for ${assignedUser.email}:`, emailRes);
        } catch (err: any) {
          console.error(`[POST /api/tasks] Error sending email to ${assignedUser.email}:`, err.message || err);
        }
      } else {
        console.warn(`[POST /api/tasks] Assigned user ${assignedUser.name} (${assignedUser.id}) has no email address configured.`);
      }
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
