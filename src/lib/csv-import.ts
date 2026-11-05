import Papa from "papaparse";
import { parseSheetDate, toEnglishDigits } from "./date-utils";
import { prisma } from "./prisma";

export interface ParsedSheetRow {
  isCompleted: boolean;
  dueDate: Date | null;
  taskType: "ONE_TIME" | "ONGOING" | "RECURRING";
  recurrenceRule?: string;
  priority: number | null;
  priorityNote?: string;
  title: string;
  remarks: string;
  completedDate?: Date | null;
}

export function parseCSVText(csvContent: string): ParsedSheetRow[] {
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rows: ParsedSheetRow[] = [];

  for (const rawRow of result.data as Record<string, string>[]) {
    // Find column keys flexibly
    const keys = Object.keys(rawRow);
    const getVal = (possibleNames: string[]): string => {
      const foundKey = keys.find((k) =>
        possibleNames.some((name) => k.toLowerCase().includes(name.toLowerCase()))
      );
      return foundKey ? (rawRow[foundKey] || "").trim() : "";
    };

    const doneVal = getVal(["✓", "done", "check", "status", "সম্পন্ন", "complete"]);
    const dueVal = getVal(["due date", "due", "নির্ধারিত তারিখ", "তারিখ", "deadline"]);
    const priorityVal = getVal(["priority", "অগ্রাধিকার", "star", "⭐"]);
    const taskVal = getVal(["task", "কাজ", "বিবরণ", "title", "description"]);
    const remarksVal = getVal(["remarks", "completed date", "notes", "মন্তব্য", "সমাপ্তি"]);

    if (!taskVal && !dueVal && !remarksVal) continue; // Skip totally blank lines

    // Parse Checkbox / Done
    const isDone =
      doneVal === "✓" ||
      doneVal.toLowerCase() === "true" ||
      doneVal === "1" ||
      doneVal.toLowerCase() === "yes" ||
      doneVal.includes("সম্পন্ন") ||
      doneVal.toLowerCase() === "done";

    // Parse Due Date & Ongoing/Recurring
    const { date: parsedDueDate, isOngoing } = parseSheetDate(dueVal);

    let taskType: "ONE_TIME" | "ONGOING" | "RECURRING" = "ONE_TIME";
    let recurrenceRule: string | undefined;

    if (isOngoing || taskVal.includes("প্রতি") || dueVal.includes("প্রতি")) {
      if (taskVal.includes("প্রতি শনিবার") || dueVal.includes("শনিবার")) {
        taskType = "RECURRING";
        recurrenceRule = "WEEKLY:SATURDAY";
      } else if (taskVal.includes("প্রতি") || dueVal.includes("প্রতি")) {
        taskType = "RECURRING";
        recurrenceRule = "RECURRING";
      } else {
        taskType = "ONGOING";
      }
    }

    // Parse Priority
    let priorityNum: number | null = null;
    let priorityNote: string | undefined;

    if (priorityVal) {
      const engDigits = toEnglishDigits(priorityVal);
      const match = engDigits.match(/\d+/);
      if (match) {
        const val = parseInt(match[0], 10);
        if (val >= 1 && val <= 10) {
          priorityNum = val;
        }
      }
      if (!priorityNum && priorityVal.length > 0) {
        priorityNote = priorityVal;
      }
    }

    rows.push({
      isCompleted: isDone,
      dueDate: parsedDueDate,
      taskType,
      recurrenceRule,
      priority: priorityNum,
      priorityNote,
      title: taskVal || "Untitled Task",
      remarks: remarksVal,
      completedDate: isDone ? new Date() : null,
    });
  }

  return rows;
}

export async function importTasksFromRows(
  rows: ParsedSheetRow[],
  assignedById: string,
  defaultAssigneeIds: string[] = []
) {
  const createdTasks = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const taskCode = `IMP-${Date.now().toString().slice(-4)}-${i + 1}`;

    const task = await prisma.task.create({
      data: {
        taskCode,
        title: row.title,
        taskType: row.taskType,
        recurrenceRule: row.recurrenceRule,
        status: row.isCompleted ? "DONE" : "PENDING",
        isCompleted: row.isCompleted,
        priority: row.priority,
        priorityNote: row.priorityNote,
        dueDate: row.dueDate,
        completedDate: row.completedDate,
        remarks: row.remarks,
        assignedById,
        assignments: {
          create: defaultAssigneeIds.map((userId) => ({ userId })),
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        taskId: task.id,
        userId: assignedById,
        action: "IMPORTED",
        details: `Imported from Google Sheet row: "${row.title}"`,
      },
    });

    createdTasks.push(task);
  }

  return createdTasks;
}
