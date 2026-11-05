import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { DEFAULT_DEPARTMENTS } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let departments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    });

    // If no departments exist yet, populate with default departments
    if (departments.length === 0) {
      for (const deptName of DEFAULT_DEPARTMENTS) {
        await prisma.department.upsert({
          where: { name: deptName },
          update: {},
          create: { name: deptName },
        });
      }
      departments = await prisma.department.findMany({
        orderBy: { name: "asc" },
      });
    }

    return NextResponse.json({ departments });
  } catch (error) {
    console.error("GET /api/departments error:", error);
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
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
        { error: "নতুন বিভাগ তৈরির অনুমতি নেই (Permission denied to create departments)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const name = body.name?.trim();

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Department name must be at least 2 characters" }, { status: 400 });
    }

    const existing = await prisma.department.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json({ error: "Department already exists" }, { status: 409 });
    }

    const department = await prisma.department.create({
      data: { name },
    });

    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    console.error("POST /api/departments error:", error);
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
  }
}
