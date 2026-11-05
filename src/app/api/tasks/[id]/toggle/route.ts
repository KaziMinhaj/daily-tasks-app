import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

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

    const task = await prisma.task.findUnique({
      where: { id },
      include: { assignments: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        role: true,
        canCompleteTask: true,
        canViewAllTasks: true,
        name: true,
      },
    });

    const isSuper = currentUser?.role === "SUPERADMIN";

    // 1. Strict permission enforcement: check canCompleteTask
    if (!isSuper && !currentUser?.canCompleteTask) {
      return NextResponse.json(
        { error: "আপনার টাস্ক সম্পন্ন করার অনুমতি নেই (You do not have permission to mark tasks done)" },
        { status: 403 }
      );
    }

    // 2. Check scope authorization:
    // SuperAdmin, user with canViewAllTasks, creator, or assigned member
    const isAuthorized =
      isSuper ||
      Boolean(currentUser?.canViewAllTasks) ||
      task.assignedById === session.id ||
      task.assignments.some((a) => a.userId === session.id);

    if (!isAuthorized) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const nextIsCompleted = !task.isCompleted;
    const nextStatus = nextIsCompleted ? "DONE" : "PENDING";
    const nextCompletedDate = nextIsCompleted ? new Date() : null;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        isCompleted: nextIsCompleted,
        status: nextStatus,
        completedDate: nextCompletedDate,
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
      },
    });

    // Record Activity Log
    await prisma.activityLog.create({
      data: {
        taskId: id,
        userId: session.id,
        action: nextIsCompleted ? "COMPLETED" : "REOPENED",
        details: nextIsCompleted
          ? `Marked as done by ${session.name}`
          : `Reopened (marked as pending) by ${session.name}`,
      },
    });

    return NextResponse.json({ task: updatedTask });
  } catch (error) {
    console.error("PATCH /api/tasks/[id]/toggle error:", error);
    return NextResponse.json({ error: "Failed to toggle task completion" }, { status: 500 });
  }
}
