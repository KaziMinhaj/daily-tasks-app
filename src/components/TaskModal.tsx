"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Task,
  User,
  TaskType,
  RecurrenceFrequency,
  DEFAULT_DEPARTMENTS,
} from "@/types";
import { Locale, translations } from "@/lib/i18n";
import { toBengaliDigits } from "@/lib/date-utils";
import { useDrawerDismiss } from "@/lib/use-drawer-dismiss";
import {
  X,
  Star,
  RefreshCw,
  Users,
  CheckSquare,
  Check,
  Building2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  Clock,
  Globe,
  Calendar,
} from "lucide-react";

const WEEKDAYS = [
  { id: "SATURDAY", shortEn: "Sat", shortBn: "শনি", fullEn: "Saturday" },
  { id: "SUNDAY", shortEn: "Sun", shortBn: "রবি", fullEn: "Sunday" },
  { id: "MONDAY", shortEn: "Mon", shortBn: "সোম", fullEn: "Monday" },
  { id: "TUESDAY", shortEn: "Tue", shortBn: "মঙ্গল", fullEn: "Tuesday" },
  { id: "WEDNESDAY", shortEn: "Wed", shortBn: "বুধ", fullEn: "Wednesday" },
  { id: "THURSDAY", shortEn: "Thu", shortBn: "বৃহস্পতি", fullEn: "Thursday" },
  { id: "FRIDAY", shortEn: "Fri", shortBn: "শুক্র", fullEn: "Friday" },
];

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  users: User[];
  currentUser: User;
  locale: Locale;
  departments?: string[];
  onDepartmentCreated?: () => void;
  onSaveTask: (taskData: any) => Promise<void>;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  users,
  currentUser,
  locale,
  departments: propDepartments,
  onDepartmentCreated,
  onSaveTask,
}) => {
  const t = translations[locale];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("ONE_TIME");
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>("WEEKLY");
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>(["SATURDAY"]);
  const [recurrenceMonthDay, setRecurrenceMonthDay] = useState<number>(1);
  const [recurrenceTime, setRecurrenceTime] = useState<string>("09:00");
  const [recurrenceTimezone, setRecurrenceTimezone] = useState<string>("Asia/Dhaka");
  const [customSlots, setCustomSlots] = useState<{ date: string; time: string }[]>([
    { date: "", time: "09:00" },
  ]);
  const [priority, setPriority] = useState<number>(7);
  const [dueDate, setDueDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [territory, setTerritory] = useState("");
  const [department, setDepartment] = useState("Business Operations");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic departments state
  const [departmentList, setDepartmentList] = useState<string[]>(
    propDepartments && propDepartments.length > 0
      ? propDepartments
      : Array.from(DEFAULT_DEPARTMENTS)
  );
  const [showNewDeptInput, setShowNewDeptInput] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [isCreatingDept, setIsCreatingDept] = useState(false);

  // Assignee Dropdown UI state
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = useState(false);
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // Sync propDepartments
  useEffect(() => {
    if (propDepartments && propDepartments.length > 0) {
      setDepartmentList(propDepartments);
    }
  }, [propDepartments]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsAssigneeDropdownOpen(false);
      }
    };
    if (isAssigneeDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isAssigneeDropdownOpen]);

  // Ensure trigger and dropup remain nicely in view when opened
  useEffect(() => {
    if (isAssigneeDropdownOpen && assigneeDropdownRef.current) {
      assigneeDropdownRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isAssigneeDropdownOpen]);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title || "");
      setDescription(taskToEdit.description || "");
      const resolvedType: TaskType =
        taskToEdit.taskType === "RECURRING" ? "RECURRING" : "ONE_TIME";
      setTaskType(resolvedType);

      // Recurrence frequency
      let freq: RecurrenceFrequency = "WEEKLY";
      if (
        taskToEdit.recurrenceFrequency === "DAILY" ||
        taskToEdit.recurrenceFrequency === "WEEKLY" ||
        taskToEdit.recurrenceFrequency === "MONTHLY" ||
        taskToEdit.recurrenceFrequency === "CUSTOM"
      ) {
        freq = taskToEdit.recurrenceFrequency;
      } else if (taskToEdit.recurrenceRule?.includes("DAILY")) {
        freq = "DAILY";
      } else if (taskToEdit.recurrenceRule?.includes("MONTHLY")) {
        freq = "MONTHLY";
      }
      setRecurrenceFrequency(freq);

      // Recurrence days
      if (taskToEdit.recurrenceDays) {
        const days = taskToEdit.recurrenceDays
          .split(",")
          .map((d) => d.trim().toUpperCase())
          .filter(Boolean);
        if (days.length > 0) setRecurrenceDays(days);
      } else {
        setRecurrenceDays(["SATURDAY"]);
      }

      // Recurrence dates / custom slots
      if (taskToEdit.recurrenceDates) {
        if (freq === "MONTHLY") {
          const num = parseInt(taskToEdit.recurrenceDates, 10);
          if (!isNaN(num) && num >= 1 && num <= 31) {
            setRecurrenceMonthDay(num);
          }
        } else if (freq === "CUSTOM") {
          try {
            const parsed = JSON.parse(taskToEdit.recurrenceDates);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCustomSlots(parsed);
            }
          } catch {
            setCustomSlots([{ date: "", time: "09:00" }]);
          }
        }
      }

      setRecurrenceTime(taskToEdit.recurrenceTime || "09:00");
      setRecurrenceTimezone(taskToEdit.recurrenceTimezone || "Asia/Dhaka");
      setPriority(taskToEdit.priority || 7);
      setDueDate(
        taskToEdit.dueDate ? new Date(taskToEdit.dueDate).toISOString().slice(0, 10) : ""
      );
      setRemarks(taskToEdit.remarks || "");
      setTerritory(taskToEdit.territory || "");
      setDepartment(taskToEdit.department || "Business Operations");
      const initialIds = (taskToEdit.assignments || []).map((a) => a.userId);
      setSelectedAssigneeIds(initialIds);
      setStatus(taskToEdit.status || "PENDING");
    } else {
      setTitle("");
      setDescription("");
      setTaskType("ONE_TIME");
      setRecurrenceFrequency("WEEKLY");
      setRecurrenceDays(["SATURDAY"]);
      setRecurrenceMonthDay(1);
      setRecurrenceTime("09:00");
      setRecurrenceTimezone("Asia/Dhaka");
      setCustomSlots([{ date: "", time: "09:00" }]);
      setPriority(7);
      setDueDate("");
      setRemarks("");
      setTerritory("");
      setDepartment(currentUser.department || "Business Operations");
      setSelectedAssigneeIds([currentUser.id]); // Default to creator/self
      setStatus("PENDING");
    }
    setIsAssigneeDropdownOpen(false);
    setAssigneeSearchQuery("");
  }, [taskToEdit, isOpen, currentUser]);

  useDrawerDismiss({ isOpen, onClose });

  const toggleRecurrenceDay = (dayId: string) => {
    setRecurrenceDays((prev) => {
      if (prev.includes(dayId)) {
        if (prev.length <= 1) return prev; // Keep at least one selected
        return prev.filter((d) => d !== dayId);
      } else {
        return [...prev, dayId];
      }
    });
  };

  const handleAddCustomSlot = () => {
    setCustomSlots((prev) => [...prev, { date: "", time: "09:00" }]);
  };

  const handleRemoveCustomSlot = (index: number) => {
    setCustomSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCustomSlotChange = (
    index: number,
    field: "date" | "time",
    value: string
  ) => {
    setCustomSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    );
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) {
      alert(
        taskToEdit
          ? "আপনার টাস্ক সম্পাদনার অনুমতি নেই (No permission to edit task)"
          : "আপনার টাস্ক তৈরির অনুমতি নেই (No permission to create task)"
      );
      return;
    }
    if (!title.trim()) return;

    let recurrenceDatesValue: string | null = null;
    if (taskType === "RECURRING") {
      if (recurrenceFrequency === "MONTHLY") {
        recurrenceDatesValue = String(recurrenceMonthDay);
      } else if (recurrenceFrequency === "CUSTOM") {
        const validSlots = customSlots.filter((s) => s.date.trim());
        recurrenceDatesValue = validSlots.length > 0 ? JSON.stringify(validSlots) : null;
      }
    }

    const recurrenceDaysValue =
      taskType === "RECURRING" && recurrenceFrequency === "WEEKLY"
        ? recurrenceDays.join(",")
        : null;

    const structuredRule =
      taskType === "RECURRING"
        ? JSON.stringify({
            frequency: recurrenceFrequency,
            days: recurrenceDays,
            dates: recurrenceDatesValue,
            time: recurrenceTime,
            timezone: recurrenceTimezone,
            customSlots: customSlots.filter((s) => s.date.trim()),
          })
        : null;

    setIsSubmitting(true);
    try {
      await onSaveTask({
        id: taskToEdit?.id,
        title: title.trim(),
        description: description.trim() || null,
        taskType,
        recurrenceRule: structuredRule,
        recurrenceFrequency: taskType === "RECURRING" ? recurrenceFrequency : null,
        recurrenceDays: recurrenceDaysValue,
        recurrenceDates: recurrenceDatesValue,
        recurrenceTime: taskType === "RECURRING" ? recurrenceTime : null,
        recurrenceTimezone: taskType === "RECURRING" ? recurrenceTimezone : null,
        priority: priority || null,
        dueDate: dueDate || null,
        remarks: remarks.trim() || null,
        territory: territory.trim() || null,
        department,
        assigneeIds: selectedAssigneeIds,
        status,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle assignee selection (Select or Deselect)
  const toggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Remove single assignee (Deselect)
  const removeAssignee = (userId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedAssigneeIds((prev) => prev.filter((id) => id !== userId));
  };

  // Clear all assignees
  const clearAllAssignees = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedAssigneeIds([]);
  };

  // Select all visible assignees
  const selectAllAssignees = () => {
    const allIds = filteredUsers.map((u) => u.id);
    setSelectedAssigneeIds(allIds);
  };

  // Handle adding a new department inline
  const handleAddNewDepartment = async () => {
    const trimmed = newDeptName.trim();
    if (!trimmed) return;
    setIsCreatingDept(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        if (!departmentList.includes(trimmed)) {
          setDepartmentList((prev) => [...prev, trimmed]);
        }
        setDepartment(trimmed);
        setNewDeptName("");
        setShowNewDeptInput(false);
        if (onDepartmentCreated) onDepartmentCreated();
      } else {
        alert(data.error || "Failed to create department");
      }
    } catch {
      alert("Error creating department");
    } finally {
      setIsCreatingDept(false);
    }
  };

  // Filtered users for multi-select dropdown
  const filteredUsers = users.filter((u) => {
    if (!assigneeSearchQuery.trim()) return true;
    const q = assigneeSearchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.department && u.department.toLowerCase().includes(q)) ||
      (u.designation && u.designation.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const canManageAssignees =
    currentUser.role === "SUPERADMIN" || Boolean(currentUser.canAssignTask);

  const canSave = taskToEdit
    ? (currentUser.role === "SUPERADMIN" || Boolean(currentUser.canEditTask))
    : (currentUser.role === "SUPERADMIN" || Boolean(currentUser.canCreateTask));

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {taskToEdit ? t.editTask : t.addTask}
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {taskToEdit ? "কাজের বিবরণ ও সময়সূচী পরিবর্তন করুন" : "নতুন কাজের বিবরণ, অ্যাসাইনি ও সময় নির্ধারণ করুন"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Form and Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!canSave && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold flex items-center gap-2">
              <span>⚠️ আপনার এই টাস্ক {taskToEdit ? "সম্পাদনার" : "তৈরি করার"} অনুমতি নেই (No permission).</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.taskTitle} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                locale === "bn"
                  ? "কাজের বিবরণ বাংলায় বা ইংরেজিতে লিখুন..."
                  : "Enter task title/description..."
              }
              className="w-full min-h-[44px] text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          {/* Department Selection with Add Option */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>বিভাগ / ডিপার্টমেন্ট (Department)</span>
              </label>
              {(currentUser.role === "SUPERADMIN" ||
                currentUser.role === "ADMIN" ||
                currentUser.canManageUsers) && (
                <button
                  type="button"
                  onClick={() => setShowNewDeptInput(!showNewDeptInput)}
                  className="text-xs text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-1 py-1 px-2 rounded-md hover:bg-emerald-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showNewDeptInput ? "বাতিল" : "+ নতুন বিভাগ যোগ করুন"}</span>
                </button>
              )}
            </div>

            {showNewDeptInput ? (
              <div className="flex items-center gap-2 mb-2 p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="যেমন: Human Resources, Supply Chain..."
                  className="flex-1 min-h-[40px] text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddNewDepartment}
                  disabled={isCreatingDept || !newDeptName.trim()}
                  className="min-h-[40px] px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {isCreatingDept ? "..." : "যুক্ত করুন"}
                </button>
              </div>
            ) : null}

            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full min-h-[44px] text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {departmentList.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Task Type Switcher (2 Equal-Width Toggle Buttons: One-time & Recurring) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {locale === "bn" ? "কাজের ধরন (Task Type)" : "Task Type"}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTaskType("ONE_TIME")}
                className={`min-h-[44px] px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer ${
                  taskType === "ONE_TIME"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{locale === "bn" ? "এককালীন কাজ (One-time)" : "One-time"}</span>
              </button>
              <button
                type="button"
                onClick={() => setTaskType("RECURRING")}
                className={`min-h-[44px] px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer ${
                  taskType === "RECURRING"
                    ? "bg-indigo-50 text-indigo-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <RefreshCw className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{locale === "bn" ? "পুনরাবৃত্তিমূলক (Recurring)" : "Recurring"}</span>
              </button>
            </div>
          </div>

          {/* Recurrence Schedule Section (Visible ONLY when Recurring is selected) */}
          {taskType === "RECURRING" && (
            <div className="bg-gradient-to-br from-indigo-50/80 via-slate-50/60 to-indigo-50/40 p-4 rounded-2xl border border-indigo-200/90 shadow-2xs space-y-3.5 animate-in fade-in duration-200">
              {/* Recurrence Frequency Tabs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>{locale === "bn" ? "পুনরাবৃত্তির সময়সূচী (Frequency)" : "Recurrence Frequency"}</span>
                  </label>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100/90 text-indigo-700">
                    {locale === "bn" ? "স্বয়ংক্রিয় শিডিউলার" : "Auto-Scheduler"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: "DAILY", labelEn: "Daily", labelBn: "প্রতিদিন" },
                      { id: "WEEKLY", labelEn: "Weekly", labelBn: "সাপ্তাহিক" },
                      { id: "MONTHLY", labelEn: "Monthly", labelBn: "মাসিক" },
                      { id: "CUSTOM", labelEn: "Custom", labelBn: "কাস্টম" },
                    ] as const
                  ).map((freq) => (
                    <button
                      key={freq.id}
                      type="button"
                      onClick={() => setRecurrenceFrequency(freq.id)}
                      className={`min-h-[38px] px-2.5 py-1.5 rounded-lg border text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                        recurrenceFrequency === freq.id
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-indigo-50/60 hover:border-indigo-300"
                      }`}
                    >
                      {locale === "bn" ? freq.labelBn : freq.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Frequency Fields */}
              {/* 1. DAILY Frequency */}
              {recurrenceFrequency === "DAILY" && (
                <div className="space-y-2 bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                  <label className="block text-xs font-bold text-slate-700">
                    {locale === "bn" ? "প্রতিদিন টাস্ক তৈরির সময় (Execution Time)" : "Daily Execution Time"}
                  </label>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                    <input
                      type="time"
                      value={recurrenceTime}
                      onChange={(e) => setRecurrenceTime(e.target.value)}
                      required
                      className="flex-1 min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {locale === "bn"
                      ? "প্রতিদিন নির্ধারিত এই সময়ে স্বয়ংক্রিয়ভাবে নতুন টাস্ক তৈরি ও সংশ্লিষ্টদের অ্যাসাইন করা হবে।"
                      : "A new task will be automatically instantiated and assigned every day at this designated time."}
                  </p>
                </div>
              )}

              {/* 2. WEEKLY Frequency */}
              {recurrenceFrequency === "WEEKLY" && (
                <div className="space-y-3 bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {locale === "bn" ? "সপ্তাহের দিনসমূহ নির্বাচন করুন (Select Days of Week)" : "Select Days of Week"}
                    </label>
                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                      {WEEKDAYS.map((day) => {
                        const isSelected = recurrenceDays.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => toggleRecurrenceDay(day.id)}
                            className={`min-h-[40px] py-1 px-0.5 flex flex-col items-center justify-center rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300"
                            }`}
                            title={day.fullEn}
                          >
                            <span>{locale === "bn" ? day.shortBn : day.shortEn}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {locale === "bn" ? "টাস্ক তৈরির সময় (Execution Time)" : "Execution Time"}
                    </label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                      <input
                        type="time"
                        value={recurrenceTime}
                        onChange={(e) => setRecurrenceTime(e.target.value)}
                        required
                        className="flex-1 min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {locale === "bn"
                        ? `নির্বাচিত দিনগুলোতে (${recurrenceDays.length} দিন) ঠিক এই সময়ে টাস্ক তৈরি হবে।`
                        : `Task will trigger on selected days at the designated execution time.`}
                    </p>
                  </div>
                </div>
              )}

              {/* 3. MONTHLY Frequency */}
              {recurrenceFrequency === "MONTHLY" && (
                <div className="space-y-3 bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {locale === "bn" ? "মাসের নির্ধারিত তারিখ (Day of Month: 1 - 31)" : "Day of Month (1st - 31st)"}
                    </label>
                    <select
                      value={recurrenceMonthDay}
                      onChange={(e) => setRecurrenceMonthDay(Number(e.target.value))}
                      className="w-full min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((dayNum) => (
                        <option key={dayNum} value={dayNum}>
                          {locale === "bn"
                            ? dayNum === 31
                              ? `প্রতি মাসের ৩১ তারিখ (বা মাসের শেষ দিন)`
                              : `প্রতি মাসের ${toBengaliDigits(dayNum)} তারিখ`
                            : dayNum === 31
                            ? `31st of every month (or last day of month)`
                            : `${dayNum}${getOrdinalSuffix(dayNum)} of every month`}
                        </option>
                      ))}
                    </select>
                    {recurrenceMonthDay >= 29 && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2 flex items-start gap-1.5">
                        <span className="shrink-0 text-xs">💡</span>
                        <span>
                          {locale === "bn"
                            ? `যেসব মাসে ${toBengaliDigits(recurrenceMonthDay)} দিন নেই (যেমন ফেব্রুয়ারিতে ২৮/২৯ দিন বা এপ্রিল, জুন, সেপ্টেম্বর ও নভেম্বরে ৩০ দিন), সেসব মাসে স্বয়ংক্রিয়ভাবে মাসের শেষ দিনে টাস্ক তৈরি হবে।`
                            : `For months with fewer days (e.g. February with 28/29 days or 30-day months), this task will automatically trigger on the last day of that month.`}
                        </span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {locale === "bn" ? "টাস্ক তৈরির সময় (Execution Time)" : "Execution Time"}
                    </label>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                      <input
                        type="time"
                        value={recurrenceTime}
                        onChange={(e) => setRecurrenceTime(e.target.value)}
                        required
                        className="flex-1 min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {locale === "bn"
                        ? `প্রতি মাসের ${toBengaliDigits(recurrenceMonthDay)} তারিখে ঠিক এই সময়ে টাস্ক কার্যকর হবে।`
                        : `Task will trigger on the ${recurrenceMonthDay}${getOrdinalSuffix(recurrenceMonthDay)} of each month at this time.`}
                    </p>
                  </div>
                </div>
              )}

              {/* 4. CUSTOM Frequency */}
              {recurrenceFrequency === "CUSTOM" && (
                <div className="space-y-3 bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      {locale === "bn" ? "কাস্টম নির্দিষ্ট তারিখ ও সময়সূচী (Arbitrary Dates & Times)" : "Arbitrary Dates & Times"}
                    </label>
                    <button
                      type="button"
                      onClick={handleAddCustomSlot}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 py-1 px-2 rounded-md hover:bg-indigo-50 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{locale === "bn" ? "+ তারিখ যোগ করুন" : "+ Add Date"}</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {customSlots.map((slot, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <span className="text-[11px] font-bold text-slate-400 w-5 text-center">
                          {index + 1}.
                        </span>
                        <input
                          type="date"
                          value={slot.date}
                          onChange={(e) => handleCustomSlotChange(index, "date", e.target.value)}
                          required
                          className="flex-1 min-h-[36px] text-xs px-2.5 py-1.5 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="time"
                          value={slot.time}
                          onChange={(e) => handleCustomSlotChange(index, "time", e.target.value)}
                          required
                          className="w-28 min-h-[36px] text-xs px-2 py-1.5 rounded-md border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {customSlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomSlot(index)}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                            title="Remove slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {locale === "bn"
                      ? "তালিকার প্রতিটি নির্দিষ্ট তারিখ ও সময়ে স্বয়ংক্রিয়ভাবে টাস্ক কার্যকর হবে।"
                      : "A new task will automatically be triggered on each specified date and time in the list."}
                  </p>
                </div>
              )}

              {/* Timezone Selector / Info */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-2 border-t border-indigo-100">
                <span className="flex items-center gap-1 font-medium">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{locale === "bn" ? "সময় অঞ্চল (Timezone):" : "Timezone:"}</span>
                </span>
                <select
                  value={recurrenceTimezone}
                  onChange={(e) => setRecurrenceTimezone(e.target.value)}
                  className="text-[11px] font-semibold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                  <option value="UTC">UTC (GMT+0)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                </select>
              </div>
            </div>
          )}

          {/* Due Date & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {taskType === "RECURRING"
                  ? locale === "bn"
                    ? "প্রারম্ভিক শেষ তারিখ (ঐচ্ছিক)"
                    : "Initial Due Date (Optional)"
                  : t.colDueDate}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-h-[44px] text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {t.priorityLevel}: ⭐ {locale === "bn" ? toBengaliDigits(priority) : priority}
              </label>
              <div className="flex items-center space-x-1 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setPriority(star)}
                    className="p-1 sm:p-0.5 hover:scale-125 transition-transform cursor-pointer"
                    title={`Priority ${star}`}
                  >
                    <Star
                      className={`w-4 h-4 sm:w-4 sm:h-4 ${
                        star <= priority
                          ? "text-amber-500 fill-amber-400"
                          : "text-slate-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Status (if editing) */}
          {taskToEdit && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.colStatus}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full min-h-[44px] text-sm px-3.5 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="PENDING">{t.statusPending}</option>
                <option value="IN_PROGRESS">{t.statusInProgress}</option>
                <option
                  value="DONE"
                  disabled={
                    currentUser.role !== "SUPERADMIN" && !currentUser.canCompleteTask
                  }
                >
                  {t.statusDone}{" "}
                  {currentUser.role !== "SUPERADMIN" && !currentUser.canCompleteTask
                    ? "(No Permission)"
                    : ""}
                </option>
              </select>
            </div>
          )}

          {/* Remarks / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.remarksNote} (যেমন: "১০ তারিখ মধ্যে", "ডিপো চালান বাকি")
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={locale === "bn" ? "অগ্রগতির মন্তব্য লিখুন..." : "Enter progress notes..."}
              className="w-full min-h-[44px] text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          {/* ======================================================== */}
          {/* ASSIGNEES MULTI-SELECT DROPDOWN COMPONENT */}
          {/* ======================================================== */}
          <div ref={assigneeDropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>
                  দায়িত্বপ্রাপ্ত সদস্য (Assignees) —{" "}
                  <span className="text-emerald-700 font-bold">
                    {selectedAssigneeIds.length} জন নির্বাচিত
                  </span>
                </span>
              </label>

              {selectedAssigneeIds.length > 0 && canManageAssignees && (
                <button
                  type="button"
                  onClick={clearAllAssignees}
                  className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 py-1 px-2 rounded-md hover:bg-red-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Deselect All (সবগুলো বাতিল)</span>
                </button>
              )}
            </div>

            {/* Clickable Multi-Select Trigger Box & Dropup Menu Wrapper */}
            <div className="relative">
              <div
                onClick={() => {
                  if (canManageAssignees) {
                    setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen);
                  }
                }}
                className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl border bg-white flex items-center justify-between gap-2 cursor-pointer transition ${
                  isAssigneeDropdownOpen
                    ? "border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs"
                    : "border-slate-300 hover:border-slate-400"
                }`}
              >
                {/* Selected Assignees Chips */}
                <div className="flex flex-wrap items-center gap-1.5 flex-1">
                  {selectedAssigneeIds.length === 0 ? (
                    <span className="text-slate-400 text-xs italic">
                      সদস্য নির্বাচন করতে ক্লিক করুন (Click to select assignees)...
                    </span>
                  ) : (
                    selectedAssigneeIds.map((id) => {
                      const u = users.find((user) => user.id === id);
                      const displayName = u ? u.name : id;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-700 text-white shadow-xs group"
                        >
                          <span className="truncate max-w-[160px]">{displayName}</span>
                          {canManageAssignees && (
                            <button
                              type="button"
                              onClick={(e) => removeAssignee(id, e)}
                              className="p-0.5 rounded-full hover:bg-emerald-900 text-emerald-200 hover:text-white transition cursor-pointer"
                              title="Deselect this user"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      );
                    })
                  )}
                </div>

                {/* Dropdown Chevron */}
                {canManageAssignees && (
                  <div className="flex items-center gap-1 text-slate-400 pl-1 border-l border-slate-200">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                      {selectedAssigneeIds.length}
                    </span>
                    <ChevronUp
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isAssigneeDropdownOpen ? "rotate-180 text-emerald-700" : ""
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Floating Multi-Select Dropdown Menu (Opens Upward / Dropup) */}
              {isAssigneeDropdownOpen && canManageAssignees && (
                <div className="absolute left-0 right-0 bottom-full mb-2 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-150">
                  {/* Search Bar & Quick Action Controls */}
                  <div className="p-2.5 border-b border-slate-100 bg-slate-50 space-y-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={assigneeSearchQuery}
                        onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                        placeholder="নাম, ডিপার্টমেন্ট বা পদবী দিয়ে খুঁজুন..."
                        className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      {assigneeSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setAssigneeSearchQuery("")}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">
                        {selectedAssigneeIds.length} / {users.length} সদস্য নির্বাচিত
                      </span>
                      <div className="flex items-center gap-2 font-semibold">
                        <button
                          type="button"
                          onClick={selectAllAssignees}
                          className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                        >
                          Select All (সবাই)
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={clearAllAssignees}
                          className="text-red-600 hover:text-red-800 cursor-pointer"
                        >
                          Deselect All (খালি)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Team Members List */}
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 p-1">
                    {assigneeSearchQuery.trim().includes("@") &&
                      !users.some(
                        (u) =>
                          u.email.toLowerCase() ===
                          assigneeSearchQuery.trim().toLowerCase()
                      ) && (
                        <div
                          onClick={() => {
                            const emailToAdd = assigneeSearchQuery.trim().toLowerCase();
                            if (!selectedAssigneeIds.includes(emailToAdd)) {
                              setSelectedAssigneeIds((prev) => [...prev, emailToAdd]);
                            }
                            setAssigneeSearchQuery("");
                          }}
                          className="flex items-center justify-between px-3 py-2.5 mb-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold cursor-pointer transition"
                        >
                          <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4 text-emerald-700" />
                            <span className="text-xs truncate max-w-[240px]">
                              ইমেইল ঠিকানায় অর্পণ করুন: {assigneeSearchQuery.trim()}
                            </span>
                          </div>
                          <span className="text-[10px] bg-emerald-700 text-white px-2 py-0.5 rounded-full font-bold">
                            + Add Email
                          </span>
                        </div>
                      )}

                    {filteredUsers.length === 0 && !assigneeSearchQuery.trim().includes("@") ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">
                        কোনো সদস্য পাওয়া যায়নি (No members matched)
                      </div>
                    ) : (
                      filteredUsers.map((u) => {
                        const isSelected = selectedAssigneeIds.includes(u.id);
                        return (
                          <div
                            key={u.id}
                            onClick={() => toggleAssignee(u.id)}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition select-none ${
                              isSelected
                                ? "bg-emerald-50/90 text-emerald-950 font-medium"
                                : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            {/* Left: Checkbox + User Details */}
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Checkbox */}
                              <div
                                className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                                  isSelected
                                    ? "bg-emerald-700 border-emerald-700 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>

                              {/* Name & Department */}
                              <div className="min-w-0">
                                <p className="text-xs font-bold truncate">{u.name}</p>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                  <span className="bg-slate-100 text-slate-700 px-1 rounded truncate">
                                    {u.department || "Business Operations"}
                                  </span>
                                  {u.designation && (
                                    <span className="truncate">· {u.designation}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right: State Tag */}
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                isSelected
                                  ? "bg-emerald-200/80 text-emerald-800"
                                  : "text-slate-400"
                              }`}
                            >
                              {isSelected ? "অ্যাসাইন করা" : "যোগ করুন"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Dropdown Footer Done Button */}
                  <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAssigneeDropdownOpen(false)}
                      className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-md cursor-pointer"
                    >
                      সম্পন্ন (Done)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !canSave}
              className="min-h-[44px] px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-600/20 transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "..." : taskToEdit ? t.saveChanges : t.createTask}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
