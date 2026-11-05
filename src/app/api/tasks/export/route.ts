import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { formatDate } from "@/lib/date-utils";
import Papa from "papaparse";



export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const formatType = searchParams.get("format") || "csv"; // csv or json
    const locale = (searchParams.get("locale") as "en" | "bn") || "bn";

    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true, canViewAllTasks: true },
    });

    const canSeeAll =
      currentUser?.role === "SUPERADMIN" || Boolean(currentUser?.canViewAllTasks);

    const where: any = {};
    if (!canSeeAll) {
      where.OR = [
        { assignments: { some: { userId: session.id } } },
        { assignedById: session.id },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        assignments: {
          include: { user: { select: { name: true, designation: true } } },
        },
      },
    });

    if (formatType === "json") {
      return NextResponse.json({ tasks });
    }

    // Prepare rows mirroring the Google Sheet structure
    const rows = tasks.map((t) => {
      let dueDateStr = "";
      if (t.taskType === "ONGOING") {
        dueDateStr = "চলমান";
      } else if (t.dueDate) {
        dueDateStr = formatDate(t.dueDate, locale);
      }

      const priorityStr = t.priority ? `⭐ ${t.priority}` : t.priorityNote || "";
      const assigneesStr = t.assignments.map((a) => a.user.name).join(", ");
      const remarksStr = t.completedDate
        ? `${formatDate(t.completedDate, locale)} - ${t.remarks || ""}`
        : t.remarks || "";

      return {
        "✓": t.isCompleted ? "✓" : "",
        "Due Date": dueDateStr,
        "Priority": priorityStr,
        "Task": t.title,
        "Completed Date / Remarks": remarksStr,
        "Assignees": assigneesStr,
        "Territory": t.territory || "",
        "Status": t.status,
      };
    });

    const csvData = Papa.unparse(rows);
    // Include UTF-8 BOM (\uFEFF) so Excel opens Bengali characters natively
    const csvWithBOM = "\uFEFF" + csvData;

    return new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="daily_sells_activities_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/tasks/export error:", error);
    return NextResponse.json({ error: "Failed to export tasks" }, { status: 500 });
  }
}
