import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { startOfDay, endOfDay, addDays, subDays, differenceInHours } from "date-fns";
import { OFFICE_DEPARTMENTS } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true, canViewAllTasks: true },
    });

    const canSeeAll =
      currentUser?.role === "SUPERADMIN" ||
      Boolean(currentUser?.canViewAllTasks);

    const baseWhere: any = {};
    if (!canSeeAll) {
      baseWhere.OR = [
        { assignments: { some: { userId: session.id } } },
        { assignedById: session.id },
      ];
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekEnd = endOfDay(addDays(now, 7));

    // 1. Core Counts
    const total = await prisma.task.count({ where: baseWhere });
    const done = await prisma.task.count({
      where: { ...baseWhere, status: "DONE" },
    });
    const pending = await prisma.task.count({
      where: { ...baseWhere, status: "PENDING" },
    });
    const inProgress = await prisma.task.count({
      where: { ...baseWhere, status: "IN_PROGRESS" },
    });
    const overdue = await prisma.task.count({
      where: {
        ...baseWhere,
        status: { not: "DONE" },
        dueDate: { lt: todayStart },
      },
    });

    const dueToday = await prisma.task.count({
      where: {
        ...baseWhere,
        status: { not: "DONE" },
        dueDate: { gte: todayStart, lte: todayEnd },
      },
    });

    const dueThisWeek = await prisma.task.count({
      where: {
        ...baseWhere,
        status: { not: "DONE" },
        dueDate: { gte: todayStart, lte: weekEnd },
      },
    });

    const ongoing = await prisma.task.count({
      where: { ...baseWhere, taskType: "ONGOING" },
    });

    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

    // 2. Status Breakdown Chart Data
    const statusChart = [
      { name: "Pending", nameBn: "মুলতুবি", count: pending, color: "#f59e0b" },
      { name: "In Progress", nameBn: "চলমান", count: inProgress, color: "#3b82f6" },
      { name: "Done", nameBn: "সম্পন্ন", count: done, color: "#10b981" },
      { name: "Overdue", nameBn: "মেয়াদোত্তীর্ণ", count: overdue, color: "#ef4444" },
    ];

    // 3. Department-wise Productivity & Task Load
    const allDepartments = await prisma.department.findMany({
      orderBy: { name: "asc" },
    });
    const deptList =
      allDepartments.length > 0
        ? allDepartments.map((d) => d.name)
        : ["MIS", "Sales and Marketing", "Business Operations"];

    const departmentChart = await Promise.all(
      deptList.map(async (dept) => {
        const deptTotal = await prisma.task.count({ where: { department: dept } });
        const deptDone = await prisma.task.count({ where: { department: dept, status: "DONE" } });
        const deptRate = deptTotal > 0 ? Math.round((deptDone / deptTotal) * 100) : 0;
        return {
          department: dept,
          total: deptTotal,
          completed: deptDone,
          rate: deptRate,
        };
      })
    );

    // 4. In-depth Employee Productivity Metrics
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        role: true,
        designation: true,
        department: true,
        assignments: {
          include: {
            task: {
              select: {
                id: true,
                status: true,
                dueDate: true,
                completedDate: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    const userProductivity = users.map((u) => {
      const assignedTasks = u.assignments.map((a) => a.task);
      const totalAssigned = assignedTasks.length;
      const completedTasks = assignedTasks.filter((t) => t.status === "DONE");
      const completed = completedTasks.length;

      // On-time completion: completed before or on dueDate (or task without deadline)
      const completedOnTime = completedTasks.filter((t) => {
        if (!t.dueDate) return true;
        if (!t.completedDate) return true;
        return new Date(t.completedDate) <= new Date(t.dueDate);
      }).length;

      const overdueTasks = assignedTasks.filter(
        (t) => t.status !== "DONE" && t.dueDate && new Date(t.dueDate) < todayStart
      );
      const overdue = overdueTasks.length;
      const pendingCount = totalAssigned - completed;

      // Turnaround time calculation
      let totalTurnaroundHours = 0;
      completedTasks.forEach((t) => {
        const finishTime = t.completedDate ? new Date(t.completedDate) : new Date();
        const diff = differenceInHours(finishTime, new Date(t.createdAt));
        totalTurnaroundHours += Math.max(1, diff);
      });
      const avgTurnaroundHours =
        completed > 0 ? Math.round(totalTurnaroundHours / completed) : 0;

      const userRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
      const onTimeRate =
        completed > 0 ? Math.round((completedOnTime / completed) * 100) : 100;

      // Calculated Productivity Score:
      // 55% completion rate + 35% on-time performance + 10% volume factor (up to 10 tasks)
      const volumeFactor = Math.min(10, totalAssigned) * 10;
      const rawScore = totalAssigned === 0
        ? 0
        : Math.round(userRate * 0.55 + onTimeRate * 0.35 + (volumeFactor * 0.1));
      const productivityScore = Math.min(100, Math.max(0, rawScore));

      let performanceGrade: "🏆 High Performer" | "⚡ Productive" | "📈 On Track" | "⚠️ Needs Follow-up" =
        "📈 On Track";
      let performanceGradeBn = "সন্তোষজনক";

      if (productivityScore >= 80) {
        performanceGrade = "🏆 High Performer";
        performanceGradeBn = "অত্যন্ত দক্ষ";
      } else if (productivityScore >= 65) {
        performanceGrade = "⚡ Productive";
        performanceGradeBn = "দক্ষ";
      } else if (productivityScore >= 45) {
        performanceGrade = "📈 On Track";
        performanceGradeBn = "সন্তোষজনক";
      } else {
        performanceGrade = "⚠️ Needs Follow-up";
        performanceGradeBn = "সহায়তা প্রয়োজন";
      }

      return {
        id: u.id,
        name: u.name,
        designation: u.designation || u.role,
        department: u.department,
        totalAssigned,
        completed,
        completedOnTime,
        overdue,
        pending: pendingCount,
        completionRate: userRate,
        onTimeRate,
        productivityScore,
        performanceGrade,
        performanceGradeBn,
        avgTurnaroundHours,
      };
    });

    // 5. Trend simulation (last 7 days)
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(now, i);
      const dStart = startOfDay(day);
      const dEnd = endOfDay(day);

      const dayDone = await prisma.task.count({
        where: {
          ...baseWhere,
          status: "DONE",
          completedDate: { gte: dStart, lte: dEnd },
        },
      });

      const dayCreated = await prisma.task.count({
        where: {
          ...baseWhere,
          createdAt: { gte: dStart, lte: dEnd },
        },
      });

      trendData.push({
        date: dStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        dateBn: dStart.toLocaleDateString("bn-BD", { month: "short", day: "numeric" }),
        completed: dayDone,
        created: dayCreated,
      });
    }

    return NextResponse.json({
      stats: {
        total,
        done,
        pending,
        inProgress,
        overdue,
        dueToday,
        dueThisWeek,
        ongoing,
        completionRate,
      },
      statusChart,
      departmentChart: departmentChart.filter((d) => d.total > 0),
      userProductivity,
      trendData,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Failed to load dashboard statistics" }, { status: 500 });
  }
}
