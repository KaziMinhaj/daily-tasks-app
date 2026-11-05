import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sendTaskAssignedEmail } from "@/lib/email-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const task = await prisma.task.findFirst({
      where: {
        OR: [{ id }, { taskCode: id }],
      },
      include: {
        assignedBy: {
          select: { id: true, name: true, role: true, designation: true, department: true },
        },
        assignments: {
          include: {
            user: { select: { id: true, name: true, role: true, designation: true, department: true } },
          },
        },
        comments: {
          include: {
            user: { select: { id: true, name: true, role: true, designation: true, department: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        activityLogs: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Role check: If member without canViewAllTasks, must be assigned or creator
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true, canViewAllTasks: true },
    });

    const canSee =
      currentUser?.role === "SUPERADMIN" ||
      Boolean(currentUser?.canViewAllTasks) ||
      task.assignedById === session.id ||
      task.assignments.some((a) => a.userId === session.id);

    if (!canSee) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("GET /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { assignments: true },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        role: true,
        canEditTask: true,
        canAssignTask: true,
        canCompleteTask: true,
        canViewAllTasks: true,
        name: true,
      },
    });

    const isSuper = currentUser?.role === "SUPERADMIN";
    const isCreator = existingTask.assignedById === session.id;
    const isAssigned = existingTask.assignments.some((a) => a.userId === session.id);

    // 1. Strict permission check for editing:
    // If not SUPERADMIN, the user MUST have canEditTask permission!
    if (!isSuper && !currentUser?.canEditTask) {
      return NextResponse.json(
        { error: "আপনার টাস্ক সম্পাদনার অনুমতি নেই (You do not have permission to edit tasks)" },
        { status: 403 }
      );
    }

    // 2. Check task-level scope:
    // Can edit if SUPERADMIN, or has canViewAllTasks, or is creator or assigned to this task
    const canEditThisTask =
      isSuper ||
      Boolean(currentUser?.canViewAllTasks) ||
      isCreator ||
      isAssigned;

    if (!canEditThisTask) {
      return NextResponse.json(
        { error: "আপনার এই টাস্ক সম্পাদনার অনুমতি নেই (You can only edit tasks you created or are assigned to)" },
        { status: 403 }
      );
    }

    const updateData: any = {};
    const logDetails: string[] = [];

    if (body.title !== undefined && body.title !== existingTask.title) {
      updateData.title = body.title;
      logDetails.push(`Title changed to '${body.title}'`);
    }

    if (body.description !== undefined) {
      updateData.description = body.description;
    }

    if (body.remarks !== undefined && body.remarks !== existingTask.remarks) {
      updateData.remarks = body.remarks;
      logDetails.push(`Remarks updated`);
    }

    if (body.territory !== undefined) {
      updateData.territory = body.territory;
    }

    if (body.department !== undefined) {
      updateData.department = body.department;
      logDetails.push(`Department set to ${body.department}`);
    }

    if (body.priority !== undefined && body.priority !== existingTask.priority) {
      updateData.priority = body.priority ? Number(body.priority) : null;
      logDetails.push(`Priority changed to ${body.priority}`);
    }

    if (body.taskType !== undefined) {
      updateData.taskType = body.taskType;
    }

    if (body.recurrenceRule !== undefined) {
      updateData.recurrenceRule = body.recurrenceRule;
    }

    if (body.recurrenceFrequency !== undefined) {
      updateData.recurrenceFrequency = body.recurrenceFrequency;
    }

    if (body.recurrenceDays !== undefined) {
      updateData.recurrenceDays = body.recurrenceDays;
    }

    if (body.recurrenceDates !== undefined) {
      updateData.recurrenceDates = body.recurrenceDates;
    }

    if (body.recurrenceTime !== undefined) {
      updateData.recurrenceTime = body.recurrenceTime;
    }

    if (body.recurrenceTimezone !== undefined) {
      updateData.recurrenceTimezone = body.recurrenceTimezone;
    }

    if (body.dueDate !== undefined) {
      updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
      logDetails.push(`Due date updated`);
    }

    if (body.status !== undefined && body.status !== existingTask.status) {
      // Check canCompleteTask if setting to DONE
      if (body.status === "DONE" && !isSuper && !currentUser?.canCompleteTask) {
        return NextResponse.json(
          { error: "আপনার টাস্ক সম্পন্ন করার অনুমতি নেই (You do not have permission to mark tasks done)" },
          { status: 403 }
        );
      }
      updateData.status = body.status;
      updateData.isCompleted = body.status === "DONE";
      if (body.status === "DONE" && !existingTask.completedDate) {
        updateData.completedDate = new Date();
      } else if (body.status !== "DONE") {
        updateData.completedDate = null;
      }
      logDetails.push(`Status changed from ${existingTask.status} to ${body.status}`);
    }

    if (body.completedDate !== undefined) {
      updateData.completedDate = body.completedDate ? new Date(body.completedDate) : null;
    }

    let newlyAssignedIds: string[] = [];
    // Seamlessly update assignees and strictly enforce canAssignTask
    if (Array.isArray(body.assigneeIds)) {
      const canManageAssignees = isSuper || Boolean(currentUser?.canAssignTask);

      if (!canManageAssignees) {
        return NextResponse.json(
          { error: "আপনার সদস্য অ্যাসাইন বা পরিবর্তনের অনুমতি নেই (You do not have permission to assign members)" },
          { status: 403 }
        );
      }

      const previousAssigneeIds = (existingTask.assignments || []).map((a) => a.userId);
      newlyAssignedIds = body.assigneeIds.filter(
        (userId: string) => !previousAssigneeIds.includes(userId)
      );

      // 1. Remove previous assignments
      await prisma.taskAssignment.deleteMany({ where: { taskId: id } });

      // 2. Add remaining/new assignees if any were kept
      if (body.assigneeIds.length > 0) {
        await prisma.taskAssignment.createMany({
          data: body.assigneeIds.map((userId: string) => ({ taskId: id, userId })),
        });
      }
      logDetails.push(`Assignees updated (${body.assigneeIds.length} assigned)`);
    }

    // If dueDate changed to future, reset dueReminderSentAt so upcoming reminder can trigger
    if (body.dueDate !== undefined && body.dueDate !== existingTask.dueDate) {
      updateData.dueReminderSentAt = null;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
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

    // Notify newly assigned members via in-app & automated email
    if (newlyAssignedIds.length > 0) {
      const newAssignees = await prisma.user.findMany({
        where: { id: { in: newlyAssignedIds } },
        select: { id: true, name: true, email: true },
      });

      for (const u of newAssignees) {
        if (u.id !== session.id) {
          await prisma.notification.create({
            data: {
              userId: u.id,
              title: "টাস্ক অর্পণ (Task Assigned)",
              message: `${session.name} আপনাকে '${updatedTask.title}' টাস্কে নিযুক্ত করেছেন।`,
              type: "TASK_ASSIGNED",
              link: `/tasks/${updatedTask.id}`,
            },
          });
        }

        if (u.email) {
          console.log(`[PATCH /api/tasks/${id}] Dispatching assignment email to newly assigned ${u.email}...`);
          try {
            const emailRes = await sendTaskAssignedEmail(
              { email: u.email, name: u.name },
              {
                id: updatedTask.id,
                taskCode: updatedTask.taskCode,
                title: updatedTask.title,
                description: updatedTask.description,
                taskType: updatedTask.taskType,
                priority: updatedTask.priority,
                priorityNote: updatedTask.priorityNote,
                dueDate: updatedTask.dueDate,
                department: updatedTask.department,
                territory: updatedTask.territory,
                remarks: updatedTask.remarks,
                assignedByName: session.name,
              }
            );
            console.log(`[PATCH /api/tasks/${id}] Email dispatch result for ${u.email}:`, emailRes);
          } catch (err: any) {
            console.error(`[PATCH /api/tasks/${id}] Error sending email to ${u.email}:`, err.message || err);
          }
        }
      }
    }

    if (logDetails.length > 0) {
      await prisma.activityLog.create({
        data: {
          taskId: id,
          userId: session.id,
          action: "UPDATED",
          details: logDetails.join("; "),
        },
      });
    }

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error("PATCH /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existingTask = await prisma.task.findFirst({
      where: {
        OR: [{ id }, { taskCode: id }],
      },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true, canDeleteTask: true, canViewAllTasks: true },
    });

    const isSuper = currentUser?.role === "SUPERADMIN";

    // 1. Strict permission check: must be SUPERADMIN or have canDeleteTask: true
    if (!isSuper && !currentUser?.canDeleteTask) {
      return NextResponse.json(
        { error: "আপনার টাস্ক মুছে ফেলার অনুমতি নেই (You do not have permission to delete tasks)" },
        { status: 403 }
      );
    }

    // 2. Check scope: can delete all tasks if SUPERADMIN or canViewAllTasks, otherwise only creator
    const canDeleteThisTask =
      isSuper ||
      Boolean(currentUser?.canViewAllTasks) ||
      existingTask.assignedById === session.id;

    if (!canDeleteThisTask) {
      return NextResponse.json(
        { error: "আপনার কেবল নিজের তৈরি করা টাস্ক মুছে ফেলার অনুমতি আছে (You can only delete tasks you created)" },
        { status: 403 }
      );
    }

    // Clean up notifications linked to this task
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { link: `/tasks/${existingTask.id}` },
          { link: `/tasks/${existingTask.taskCode}` },
        ],
      },
    });

    await prisma.task.delete({ where: { id: existingTask.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[id] error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
