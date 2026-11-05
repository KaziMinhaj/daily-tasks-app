"use client";

import React, { useState, useRef, useEffect } from "react";
import { Task, User, OFFICE_DEPARTMENTS, TaskStatus } from "@/types";
import { Locale, translations } from "@/lib/i18n";
import { formatDate, getDateStatus, toBengaliDigits } from "@/lib/date-utils";
import {
  Check,
  Star,
  Filter,
  ArrowUpDown,
  Plus,
  MessageSquare,
  AlertCircle,
  Clock,
  Calendar,
  Sparkles,
  Edit2,
  Trash2,
  MapPin,
  RefreshCw,
  Building2,
  Lock,
  ChevronDown,
  X,
  RotateCcw,
} from "lucide-react";

interface TaskTableViewProps {
  tasks: Task[];
  users: User[];
  currentUser: User;
  locale: Locale;
  departments?: string[];
  onToggleTask: (taskId: string) => Promise<void>;
  onUpdateStatus?: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onOpenTaskDetails: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  filters: {
    status: string;
    assigneeId: string;
    taskType: string;
    priority: string;
    department: string;
    dateFilter?: string;
    customDate?: string;
    search: string;
    sortBy: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<any>>;
}

export const TaskTableView: React.FC<TaskTableViewProps> = ({
  tasks,
  users,
  currentUser,
  locale,
  departments = ["MIS", "Sales and Marketing", "Business Operations"],
  onToggleTask,
  onUpdateStatus,
  onOpenTaskDetails,
  onEditTask,
  onDeleteTask,
  filters,
  setFilters,
}) => {
  const t = translations[locale];

  const canComplete =
    currentUser.role === "SUPERADMIN" || Boolean(currentUser.canCompleteTask);

  const getTaskStatus = (task: Task): TaskStatus => {
    if (task.status === "DONE" || task.isCompleted) return "DONE";
    if (task.status === "IN_PROGRESS") return "IN_PROGRESS";
    return "PENDING";
  };

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case "DONE":
        return {
          container: "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/60",
          icon: <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />,
          label: t.statusDone,
        };
      case "IN_PROGRESS":
        return {
          container: "bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100/60",
          icon: <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />,
          label: t.statusInProgress,
        };
      case "PENDING":
      default:
        return {
          container: "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100/60",
          icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
          label: t.statusPending,
        };
    }
  };

  const handleStatusChange = async (task: Task, newStatus: TaskStatus) => {
    if (newStatus === "DONE" && !canComplete) {
      alert("আপনার টাস্ক সম্পন্ন করার অনুমতি নেই (No permission to mark tasks done)");
      return;
    }
    if (onUpdateStatus) {
      await onUpdateStatus(task.id, newStatus);
    } else {
      await onToggleTask(task.id);
    }
  };

  const canEditThisTask = (task: Task) => {
    if (currentUser.role === "SUPERADMIN") return true;
    if (!currentUser.canEditTask) return false;
    return (
      Boolean(currentUser.canViewAllTasks) ||
      task.assignedById === currentUser.id ||
      task.assignments.some((a) => a.userId === currentUser.id)
    );
  };

  const canDeleteThisTask = (task: Task) => {
    if (currentUser.role === "SUPERADMIN") return true;
    if (!currentUser.canDeleteTask) return false;
    return (
      Boolean(currentUser.canViewAllTasks) ||
      task.assignedById === currentUser.id
    );
  };

  // Instant client-side filter check so any toggle updates in 0ms without reload
  const visibleTasks = tasks.filter((task) => {
    // Status Filter (All, Pending, In Progress, Done)
    if (filters.status && filters.status !== "ALL") {
      const currentStatus = getTaskStatus(task);
      if (filters.status === "DONE" || filters.status === "completed") {
        if (currentStatus !== "DONE") return false;
      } else if (filters.status === "IN_PROGRESS" || filters.status === "in_progress") {
        if (currentStatus !== "IN_PROGRESS") return false;
      } else if (filters.status === "PENDING" || filters.status === "pending") {
        if (currentStatus !== "PENDING") return false;
      } else if (filters.status === "NOT_DONE" || filters.status === "not_completed") {
        if (currentStatus === "DONE") return false;
      } else if (task.status !== filters.status) {
        return false;
      }
    }

    if (filters.dateFilter && filters.dateFilter !== "ALL") {
      const now = new Date();
      const taskDue = task.dueDate ? new Date(task.dueDate) : null;
      if (filters.dateFilter === "ONGOING") {
        if (task.taskType !== "ONGOING" && taskDue !== null) return false;
      } else if (filters.dateFilter === "OVERDUE") {
        if (!taskDue || task.status === "DONE" || taskDue >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) return false;
      } else if (filters.dateFilter === "TODAY") {
        if (!taskDue) return false;
        const isToday =
          taskDue.getFullYear() === now.getFullYear() &&
          taskDue.getMonth() === now.getMonth() &&
          taskDue.getDate() === now.getDate();
        if (!isToday) return false;
      } else if (filters.dateFilter === "NEXT_3_DAYS") {
        if (!taskDue) return false;
        const diffMs = taskDue.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays > 3) return false;
      } else if (filters.dateFilter === "THIS_WEEK") {
        if (!taskDue) return false;
        const start = new Date(now);
        const day = (start.getDay() + 1) % 7; // Saturday as week start in BD
        start.setDate(start.getDate() - day);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        if (taskDue < start || taskDue >= end) return false;
      } else if (filters.dateFilter === "CUSTOM" && filters.customDate) {
        if (!taskDue) return false;
        const custom = new Date(filters.customDate);
        if (
          taskDue.getFullYear() !== custom.getFullYear() ||
          taskDue.getMonth() !== custom.getMonth() ||
          taskDue.getDate() !== custom.getDate()
        ) {
          return false;
        }
      }
    }

    return true;
  });

  const hasActiveFilters =
    (filters.status && filters.status !== "ALL") ||
    filters.department !== "ALL" ||
    filters.taskType !== "ALL" ||
    filters.assigneeId !== "ALL" ||
    (filters.dateFilter && filters.dateFilter !== "ALL") ||
    filters.sortBy !== "createdAt";

  const clearAllFilters = () => {
    setFilters({
      status: "ALL",
      assigneeId: "ALL",
      taskType: "ALL",
      department: "ALL",
      dateFilter: "ALL",
      customDate: "",
      priority: "",
      search: "",
      sortBy: "createdAt",
    });
  };

  return (
    <div className="space-y-3">
      {/* Modern Unified Filter Toolbar Container */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-sm w-full">
        {/* Left: Filter Controls Group */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Department Filter */}
          <div className="relative inline-flex items-center shrink-0">
            <select
              value={filters.department || "ALL"}
              onChange={(e) => setFilters((prev: any) => ({ ...prev, department: e.target.value }))}
              className={`appearance-none pl-3 pr-8 h-9 text-xs sm:text-sm font-medium rounded-lg border transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                filters.department && filters.department !== "ALL"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-2xs"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <option value="ALL">{locale === "bn" ? "বিভাগ" : "Department"}</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            <ChevronDown
              className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 transition ${
                filters.department && filters.department !== "ALL" ? "text-emerald-700" : "text-slate-400"
              }`}
            />
          </div>

          {/* Task Type Filter */}
          <div className="relative inline-flex items-center shrink-0">
            <select
              value={filters.taskType}
              onChange={(e) => setFilters((prev: any) => ({ ...prev, taskType: e.target.value }))}
              className={`appearance-none pl-3 pr-8 h-9 text-xs sm:text-sm font-medium rounded-lg border transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                filters.taskType && filters.taskType !== "ALL"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-2xs"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <option value="ALL">{locale === "bn" ? "ধরন" : "Type"}</option>
              <option value="ONE_TIME">{t.typeOneTime}</option>
              <option value="ONGOING">{t.typeOngoing}</option>
              <option value="RECURRING">{t.typeRecurring}</option>
            </select>
            <ChevronDown
              className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 transition ${
                filters.taskType && filters.taskType !== "ALL" ? "text-emerald-700" : "text-slate-400"
              }`}
            />
          </div>

          {/* Due Date Filter */}
          <div className="relative inline-flex items-center gap-1.5 shrink-0">
            <div className="relative inline-flex items-center">
              <select
                value={filters.dateFilter || "ALL"}
                onChange={(e) =>
                  setFilters((prev: any) => ({
                    ...prev,
                    dateFilter: e.target.value,
                    customDate: e.target.value === "CUSTOM" ? prev.customDate : "",
                  }))
                }
                className={`appearance-none pl-3 pr-8 h-9 text-xs sm:text-sm font-medium rounded-lg border transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                  filters.dateFilter && filters.dateFilter !== "ALL"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-2xs"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <option value="ALL">{locale === "bn" ? "শেষ তারিখ" : "Due Date"}</option>
                <option value="TODAY">{t.dueDateToday}</option>
                <option value="NEXT_3_DAYS">{t.dueDateNext3Days}</option>
                <option value="THIS_WEEK">{t.dueDateThisWeek}</option>
                <option value="OVERDUE">{t.dueDateOverdue}</option>
                <option value="ONGOING">{t.dueDateOngoing}</option>
                <option value="CUSTOM">{t.dueDateCustom}</option>
              </select>
              <ChevronDown
                className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 transition ${
                  filters.dateFilter && filters.dateFilter !== "ALL" ? "text-emerald-700" : "text-slate-400"
                }`}
              />
            </div>

            {filters.dateFilter === "CUSTOM" && (
              <input
                type="date"
                value={filters.customDate || ""}
                onChange={(e) =>
                  setFilters((prev: any) => ({ ...prev, customDate: e.target.value }))
                }
                className="h-9 px-2 text-xs sm:text-sm font-medium rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shrink-0"
              />
            )}
          </div>

          {/* Assignee Filter */}
          {(currentUser.role === "SUPERADMIN" || Boolean(currentUser.canViewAllTasks)) && (
            <div className="relative inline-flex items-center shrink-0">
              <select
                value={filters.assigneeId}
                onChange={(e) => setFilters((prev: any) => ({ ...prev, assigneeId: e.target.value }))}
                className={`appearance-none pl-3 pr-8 h-9 text-xs sm:text-sm font-medium rounded-lg border transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                  filters.assigneeId && filters.assigneeId !== "ALL"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-2xs"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <option value="ALL">{locale === "bn" ? "সকল সদস্য" : "All Assignees"}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 transition ${
                  filters.assigneeId && filters.assigneeId !== "ALL" ? "text-emerald-700" : "text-slate-400"
                }`}
              />
            </div>
          )}

          {/* Status Filter */}
          <div className="relative inline-flex items-center shrink-0">
            <select
              value={filters.status || "ALL"}
              onChange={(e) => setFilters((prev: any) => ({ ...prev, status: e.target.value }))}
              className={`appearance-none pl-3 pr-8 h-9 text-xs sm:text-sm font-medium rounded-lg border transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 ${
                filters.status && filters.status !== "ALL"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold shadow-2xs"
                  : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <option value="ALL">{locale === "bn" ? "স্ট্যাটাস" : "Status"}</option>
              <option value="PENDING">{t.filterStatusPending}</option>
              <option value="IN_PROGRESS">{t.filterStatusInProgress}</option>
              <option value="DONE">{t.filterStatusDone}</option>
            </select>
            <ChevronDown
              className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 transition ${
                filters.status && filters.status !== "ALL" ? "text-emerald-700" : "text-slate-400"
              }`}
            />
          </div>
        </div>

        {/* Right: Sort Dropdown & Quick Actions */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Sort Dropdown */}
          <div className="relative inline-flex items-center shrink-0">
            <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((prev: any) => ({ ...prev, sortBy: e.target.value }))}
              className="appearance-none pl-8 pr-8 h-9 text-xs sm:text-sm text-slate-700 font-medium rounded-lg border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer transition shadow-2xs"
            >
              <option value="createdAt">{t.sortNewest}</option>
              <option value="dueDate">{t.sortDueDate}</option>
              <option value="priority">{t.sortPriority}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>

          {/* Low-profile "Reset Filters" Text Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 px-2.5 h-9 text-xs sm:text-sm font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer shrink-0 border border-transparent hover:border-rose-200"
              title={locale === "bn" ? "সকল ফিল্টার মুছুন" : "Reset all active filters"}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{locale === "bn" ? "রিসেট" : "Reset"}</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. MOBILE RESPONSIVE CARD STACK VIEW (Screen < 768px)   */}
      {/* Replaces overflowing horizontal table with thumb cards!   */}
      {/* ======================================================== */}
      <div className="block md:hidden space-y-3">
        {visibleTasks.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
            <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">কোনো কাজ পাওয়া যায়নি (No tasks found)</p>
            <p className="text-xs text-slate-400">ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।</p>
          </div>
        ) : (
          visibleTasks.map((task) => {
            const dateInfo = getDateStatus(task.dueDate, task.status);
            const currentStatus = getTaskStatus(task);
            const isDone = currentStatus === "DONE";
            const badgeStyle = getStatusBadge(currentStatus);
            const canChangeThisTask = canEditThisTask(task) || canComplete;

            let cardBorder = "border-slate-200";
            let cardBg = "bg-white";
            if (isDone) {
              cardBorder = "border-emerald-300";
              cardBg = "bg-emerald-50/40";
            } else if (dateInfo.isOverdue) {
              cardBorder = "border-rose-300";
              cardBg = "bg-rose-50/40";
            } else if (dateInfo.isDueSoon) {
              cardBorder = "border-amber-300";
              cardBg = "bg-amber-50/30";
            }

            return (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border ${cardBorder} ${cardBg} shadow-xs space-y-3 transition active:scale-[0.99]`}
              >
                {/* Mobile Card Header */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {/* Status Selector / Badge on Mobile */}
                    {canChangeThisTask ? (
                      <div
                        className={`relative inline-flex items-center rounded-xl border text-[11px] font-bold transition shadow-2xs ${badgeStyle.container}`}
                      >
                        <div className="absolute left-2 pointer-events-none flex items-center">
                          {badgeStyle.icon}
                        </div>
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                          className="appearance-none bg-transparent pl-6 pr-5 py-1 font-bold cursor-pointer focus:outline-none"
                          title={locale === "bn" ? "স্ট্যাটাস পরিবর্তন করুন" : "Change status"}
                        >
                          <option value="PENDING" className="text-slate-800 bg-white font-medium">
                            {t.statusPending}
                          </option>
                          <option value="IN_PROGRESS" className="text-slate-800 bg-white font-medium">
                            {t.statusInProgress}
                          </option>
                          <option
                            value="DONE"
                            disabled={!canComplete}
                            className="text-slate-800 bg-white font-medium"
                          >
                            {t.statusDone}
                          </option>
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none opacity-60" />
                      </div>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${badgeStyle.container}`}
                      >
                        {badgeStyle.icon}
                        <span>{badgeStyle.label}</span>
                      </span>
                    )}

                    <div className="flex items-center gap-1.5">
                      {task.taskCode && (
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {task.taskCode}
                        </span>
                      )}
                      {task.priority ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                          <span>{locale === "bn" ? toBengaliDigits(task.priority) : task.priority}</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Due Date & Urgency Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {dateInfo.isOverdue && !isDone && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {t.overdueBadge}
                      </span>
                    )}
                    {dateInfo.isDueSoon && !isDone && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        {t.dueSoonBadge} ({dateInfo.daysRemaining}d)
                      </span>
                    )}
                    {task.taskType === "ONGOING" && (
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                        {t.ongoingBadge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Task Title & Details */}
                <div>
                  <button
                    onClick={() => onOpenTaskDetails(task)}
                    className={`text-left text-sm font-bold leading-snug hover:text-emerald-700 transition cursor-pointer ${
                      isDone ? "line-through text-slate-400" : "text-slate-900"
                    }`}
                  >
                    {task.title}
                  </button>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-emerald-700" />
                      <span>{task.department || "Business Operations"}</span>
                    </span>

                    {task.territory && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{task.territory}</span>
                      </span>
                    )}

                    {task.dueDate && task.taskType !== "ONGOING" && (
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                          dateInfo.isOverdue
                            ? "bg-rose-100 text-rose-800 font-bold"
                            : dateInfo.isDueSoon
                            ? "bg-amber-100 text-amber-800 font-bold"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(task.dueDate, locale)}</span>
                      </span>
                    )}
                  </div>

                  {task.remarks && (
                    <p className="text-xs text-slate-600 bg-white/70 p-2 rounded-lg border border-slate-200/60 mt-2 italic">
                      {task.remarks}
                    </p>
                  )}
                </div>

                {/* Mobile Card Footer: Assignees & Quick Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  {/* Assignees */}
                  <div className="flex flex-wrap items-center gap-1">
                    {task.assignments.length === 0 ? (
                      <span className="text-slate-400 text-xs italic">Unassigned</span>
                    ) : (
                      task.assignments.map((a) => (
                        <span
                          key={a.id}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {a.user.name.split(" ")[0]}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Actions: 44px Touch Targets */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onOpenTaskDetails(task)}
                      className="p-2.5 min-w-[40px] min-h-[40px] rounded-xl hover:bg-slate-100 text-slate-600 hover:text-emerald-700 flex items-center justify-center relative cursor-pointer"
                      title={t.comments}
                    >
                      <MessageSquare className="w-4 h-4" />
                      {task._count && task._count.comments > 0 ? (
                        <span className="absolute 1 top-1 right-1 bg-emerald-600 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                          {task._count.comments}
                        </span>
                      ) : null}
                    </button>

                    {canEditThisTask(task) && (
                      <button
                        onClick={() => onEditTask(task)}
                        className="p-2.5 min-w-[40px] min-h-[40px] rounded-xl hover:bg-slate-100 text-slate-600 hover:text-indigo-600 flex items-center justify-center cursor-pointer"
                        title={t.editTask}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

                    {canDeleteThisTask(task) && (
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-2.5 min-w-[40px] min-h-[40px] rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 flex items-center justify-center cursor-pointer"
                        title={t.deleteTask}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. DESKTOP MODERN ELEVATED TABLE VIEW (Screen >= 768px)  */}
      {/* ======================================================== */}
      <div className="hidden md:block bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-200 text-xs font-bold uppercase tracking-wider divide-x divide-slate-800">
                <th className="py-3.5 px-3 w-40 text-center">{t.colStatus}</th>
                <th className="py-3.5 px-3 w-36">{t.colDueDate}</th>
                <th className="py-3.5 px-3 w-28 text-center">{t.colPriority}</th>
                <th className="py-3.5 px-4 min-w-[260px]">{t.colTask}</th>
                <th className="py-3.5 px-4 min-w-[200px]">{t.colRemarks}</th>
                <th className="py-3.5 px-3 w-44">{t.colAssignee}</th>
                <th className="py-3.5 px-3 w-24 text-center">{t.colActions}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
              {visibleTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Sparkles className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">কোনো কাজ পাওয়া যায়নি / No tasks found</p>
                      <p className="text-xs text-slate-400">ফিল্টার পরিবর্তন করে চেষ্টা করুন।</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleTasks.map((task) => {
                  const dateInfo = getDateStatus(task.dueDate, task.status);
                  const currentStatus = getTaskStatus(task);
                  const isDone = currentStatus === "DONE";
                  const badgeStyle = getStatusBadge(currentStatus);
                  const canChangeThisTask = canEditThisTask(task) || canComplete;

                  let rowHighlight = "hover:bg-slate-50/80 transition-colors";
                  if (isDone) {
                    rowHighlight = "bg-emerald-50/50 hover:bg-emerald-100/50 border-l-4 border-l-emerald-600 text-slate-900";
                  } else if (dateInfo.isOverdue) {
                    rowHighlight = "bg-rose-50/50 hover:bg-rose-100/50 border-l-4 border-l-rose-500";
                  } else if (dateInfo.isDueSoon) {
                    rowHighlight = "bg-amber-50/40 hover:bg-amber-100/40 border-l-4 border-l-amber-500";
                  }

                  return (
                    <tr key={task.id} className={`divide-x divide-slate-100 ${rowHighlight}`}>
                      {/* Status Column */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {canChangeThisTask ? (
                          <div
                            className={`relative inline-flex items-center rounded-xl border text-xs font-bold transition shadow-2xs ${badgeStyle.container}`}
                          >
                            <div className="absolute left-2.5 pointer-events-none flex items-center">
                              {badgeStyle.icon}
                            </div>
                            <select
                              value={currentStatus}
                              onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                              className="appearance-none bg-transparent pl-7 pr-6 py-1.5 font-bold cursor-pointer focus:outline-none"
                              title={locale === "bn" ? "স্ট্যাটাস পরিবর্তন করুন" : "Change status"}
                            >
                              <option value="PENDING" className="text-slate-800 bg-white font-medium">
                                {t.statusPending}
                              </option>
                              <option value="IN_PROGRESS" className="text-slate-800 bg-white font-medium">
                                {t.statusInProgress}
                              </option>
                              <option
                                value="DONE"
                                disabled={!canComplete}
                                className="text-slate-800 bg-white font-medium"
                              >
                                {t.statusDone}
                              </option>
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-2 pointer-events-none opacity-60" />
                          </div>
                        ) : (
                          <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-2xs ${badgeStyle.container}`}
                          >
                            {badgeStyle.icon}
                            <span>{badgeStyle.label}</span>
                          </div>
                        )}
                      </td>

                      {/* Due Date Column */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {task.taskType === "ONGOING" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            {t.ongoingBadge}
                          </span>
                        ) : task.dueDate ? (
                          <div className="flex flex-col">
                            <span
                              className={`font-semibold ${
                                dateInfo.isOverdue
                                  ? "text-rose-700 font-bold"
                                  : dateInfo.isDueSoon
                                  ? "text-amber-800 font-bold"
                                  : "text-slate-800"
                              }`}
                            >
                              {formatDate(task.dueDate, locale)}
                            </span>
                            {dateInfo.isOverdue && (
                              <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5">
                                <AlertCircle className="w-3 h-3" />
                                {t.overdueBadge}
                              </span>
                            )}
                            {dateInfo.isDueSoon && (
                              <span className="text-[10px] text-amber-700 font-bold">
                                {t.dueSoonBadge} ({locale === "bn" ? toBengaliDigits(dateInfo.daysRemaining) : dateInfo.daysRemaining}d)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">চলমান (Ongoing)</span>
                        )}
                      </td>

                      {/* Priority Column */}
                      <td className="py-3 px-2 text-center">
                        {task.priority ? (
                          <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                            <span className="font-bold text-amber-900 text-xs">
                              {locale === "bn" ? toBengaliDigits(task.priority) : task.priority}
                            </span>
                          </div>
                        ) : task.priorityNote ? (
                          <span className="text-slate-600 text-xs italic">{task.priorityNote}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Task Description & Department */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            {task.taskCode && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-medium">
                                {task.taskCode}
                              </span>
                            )}
                            <button
                              onClick={() => onOpenTaskDetails(task)}
                              className={`font-semibold text-left text-xs hover:text-emerald-700 transition cursor-pointer ${
                                isDone ? "line-through text-slate-400" : "text-slate-900"
                              }`}
                            >
                              {task.title}
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                              <Building2 className="w-2.5 h-2.5 text-emerald-700" />
                              {task.department || "Business Operations"}
                            </span>

                            {task.territory && (
                              <span className="inline-flex items-center text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                <MapPin className="w-2.5 h-2.5 mr-0.5 text-slate-400" />
                                {task.territory}
                              </span>
                            )}

                            {task.taskType === "RECURRING" && (
                              <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md font-semibold">
                                {t.recurringBadge}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Completed Date / Remarks Column */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col space-y-0.5">
                          {task.completedDate && (
                            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded w-fit border border-emerald-200">
                              ✓ {formatDate(task.completedDate, locale, true)}
                            </span>
                          )}
                          <p className="text-xs text-slate-700 font-medium">
                            {task.remarks || <span className="text-slate-300 italic">-</span>}
                          </p>
                        </div>
                      </td>

                      {/* Assignee Column */}
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {task.assignments.length === 0 ? (
                            <span className="text-slate-400 text-[11px] italic">Unassigned</span>
                          ) : (
                            task.assignments.map((a) => (
                              <span
                                key={a.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                title={`${a.user.name} (${a.user.department || a.user.role})`}
                              >
                                {a.user.name.split(" ")[0]}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => onOpenTaskDetails(task)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-emerald-700 relative cursor-pointer"
                            title={t.comments}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {task._count && task._count.comments > 0 ? (
                              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[9px] w-3.5 h-3.5 rounded-full flex items-center justify-center font-bold">
                                {task._count.comments}
                              </span>
                            ) : null}
                          </button>

                          {canEditThisTask(task) && (
                            <button
                              onClick={() => onEditTask(task)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 cursor-pointer"
                              title={t.editTask}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDeleteThisTask(task) && (
                            <button
                              onClick={() => onDeleteTask(task.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title={t.deleteTask}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
