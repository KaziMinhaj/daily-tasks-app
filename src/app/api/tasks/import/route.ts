import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseCSVText, importTasksFromRows } from "@/lib/csv-import";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true, canCreateTask: true },
    });

    if (currentUser?.role !== "SUPERADMIN" && !currentUser?.canCreateTask) {
      return NextResponse.json(
        { error: "আপনার টাস্ক ইমপোর্ট/তৈরি করার অনুমতি নেই (You do not have permission to create or import tasks)" },
        { status: 403 }
      );
    }

    let csvContent = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      csvContent = await file.text();
    } else {
      const body = await req.json();
      csvContent = body.csvContent;
    }

    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json({ error: "Empty CSV content" }, { status: 400 });
    }

    const parsedRows = parseCSVText(csvContent);

    if (parsedRows.length === 0) {
      return NextResponse.json({ error: "No valid task rows could be parsed from the CSV" }, { status: 400 });
    }

    const createdTasks = await importTasksFromRows(parsedRows, session.id, [session.id]);

    return NextResponse.json({
      success: true,
      count: createdTasks.length,
      tasks: createdTasks,
    });
  } catch (error) {
    console.error("POST /api/tasks/import error:", error);
    return NextResponse.json({ error: "Failed to import tasks" }, { status: 500 });
  }
}
