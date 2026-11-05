import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(
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
    const commentText = body.comment?.trim();

    if (!commentText) {
      return NextResponse.json({ error: "Comment text cannot be empty" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: { assignments: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId: id,
        userId: session.id,
        comment: commentText,
      },
      include: {
        user: { select: { id: true, name: true, role: true, designation: true } },
      },
    });

    // Activity Log
    await prisma.activityLog.create({
      data: {
        taskId: id,
        userId: session.id,
        action: "COMMENT_ADDED",
        details: `${session.name} added a comment`,
      },
    });

    // Notify task creator and assignees
    const notifyUserIds = new Set<string>();
    if (task.assignedById !== session.id) notifyUserIds.add(task.assignedById);
    for (const a of task.assignments) {
      if (a.userId !== session.id) notifyUserIds.add(a.userId);
    }

    for (const targetUserId of notifyUserIds) {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: "নতুন মন্তব্য (New Comment)",
          message: `${session.name} '${task.title}' কাজে মন্তব্য করেছেন: "${commentText.slice(0, 50)}${commentText.length > 50 ? '...' : ''}"`,
          type: "COMMENT_ADDED",
          link: `/tasks/${task.id}`,
        },
      });
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/[id]/comments error:", error);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }
}
