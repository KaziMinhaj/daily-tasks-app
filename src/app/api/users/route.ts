import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hashPassword } from "@/lib/auth";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["SUPERADMIN", "ADMIN", "MANAGER", "MEMBER"]).default("MEMBER"),
  designation: z.string().optional().nullable(),
  department: z.string().default("Business Operations"),
  phone: z.string().optional().nullable(),
  canCreateTask: z.boolean().default(true),
  canCompleteTask: z.boolean().default(true),
  canAssignTask: z.boolean().default(true),
  canEditTask: z.boolean().default(true),
  canDeleteTask: z.boolean().default(false),
  canViewAllTasks: z.boolean().default(false),
  canManageUsers: z.boolean().default(false),
});

const updateUserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).optional(),
  role: z.enum(["SUPERADMIN", "ADMIN", "MANAGER", "MEMBER"]).optional(),
  designation: z.string().optional().nullable(),
  department: z.string().optional(),
  phone: z.string().optional().nullable(),
  password: z.string().min(6).optional(),
  canCreateTask: z.boolean().optional(),
  canCompleteTask: z.boolean().optional(),
  canAssignTask: z.boolean().optional(),
  canEditTask: z.boolean().optional(),
  canDeleteTask: z.boolean().optional(),
  canViewAllTasks: z.boolean().optional(),
  canManageUsers: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
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
        _count: {
          select: { assignments: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true, canManageUsers: true },
    });

    const isAuthorized =
      currentUser?.role === "SUPERADMIN" || Boolean(currentUser?.canManageUsers);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "আপনার ব্যবহারকারী যোগ করার অনুমতি নেই (You do not have permission to manage users)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const {
      name,
      email,
      password,
      role,
      designation,
      department,
      phone,
      canCreateTask,
      canCompleteTask,
      canAssignTask,
      canEditTask,
      canDeleteTask,
      canViewAllTasks,
      canManageUsers,
    } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role,
        designation,
        department: department || "Operations & Logistics",
        phone,
        canCreateTask,
        canCompleteTask,
        canAssignTask,
        canEditTask,
        canDeleteTask,
        canViewAllTasks,
        canManageUsers,
      },
      select: {
        id: true,
        name: true,
        email: true,
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
      },
    });

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true, canManageUsers: true },
    });

    const isAuthorized =
      currentUser?.role === "SUPERADMIN" || Boolean(currentUser?.canManageUsers);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "আপনার পারমিশন বা ব্যবহারকারী পরিবর্তনের অনুমতি নেই (Permission denied)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { id, password, ...rest } = parsed.data;

    const updateData: any = { ...rest };
    if (password) {
      updateData.password = await hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
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
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("PATCH /api/users error:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
