import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      designation: true,
      department: true,
      phone: true,
      canCreateTask: true,
      canCompleteTask: true,
      canAssignTask: true,
      canEditTask: true,
      canDeleteTask: true,
      canViewAllTasks: true,
      canManageUsers: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}
