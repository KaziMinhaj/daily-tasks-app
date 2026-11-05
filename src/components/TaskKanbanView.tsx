"use client";

import React, { useState } from "react";
import { Task, User, TaskStatus } from "@/types";
import { Locale, translations } from "@/lib/i18n";
import { formatDate, getDateStatus, toBengaliDigits } from "@/lib/date-utils";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  RefreshCw,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Calendar,
  MapPin,
  Building2,
} from "lucide-react";

interface TaskKanbanViewProps {
  tasks: Task[];
  users: User[];
  currentUser: User;
  locale: Locale;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  onOpenTaskDetails: (task: Task) => void;
  onEditTask: (task: Task) => void;
}

export const TaskKanbanView: React.FC<TaskKanbanViewProps> = ({
  tasks,
  users,
  currentUser,
  locale,
  onUpdateStatus,
  onOpenTaskDetails,
  onEditTask,
}) => {
  const t = translations[locale];
  const [mobileActiveTab, setMobileActiveTab] = useState<TaskStatus | "ALL">("ALL");

  const columns: { id: TaskStatus; title: string; countColor: string; headerBg: string; borderColor: string }[] = [
    {
      id: "PENDING",
      title: t.statusPending,
      countColor: "bg-amber-100 text-amber-900 border border-amber-200",
      headerBg: "bg-amber-50/50",
      borderColor: "border-t-4 border-t-amber-500",
    },
    {
      id: "IN_PROGRESS",
      title: t.statusInProgress,
      countColor: "bg-indigo-100 text-indigo-900 border border-indigo-200",
      headerBg: "bg-indigo-50/50",
      borderColor: "border-t-4 border-t-indigo-500",
    },
    {
      id: "DONE",
      title: t.statusDone,
      countColor: "bg-emerald-100 text-emerald-900 border border-emerald-200",
      headerBg: "bg-emerald-50/50",
      borderColor: "border-t-4 border-t-emerald-500",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Mobile Segmented Lane Switcher (Screen < 768px) */}
      <div className="flex md:hidden items-center bg-slate-200/80 p-1 rounded-2xl gap-1 overflow-x-auto">
        <button
          onClick={() => setMobileActiveTab("ALL")}
          className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl transition cursor-pointer min-h-[40px] text-center whitespace-nowrap ${
            mobileActiveTab === "ALL"
              ? "bg-white text-slate-900 shadow-xs"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {locale === "bn" ? "সব লেন" : "All Lanes"} ({tasks.length})
        </button>
        {columns.map((col) => {
          const count = tasks.filter((t) => t.status === col.id).length;
          const isActive = mobileActiveTab === col.id;
          return (
            <button
              key={col.id}
              onClick={() => setMobileActiveTab(col.id)}
              className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl transition cursor-pointer min-h-[40px] text-center whitespace-nowrap ${
                isActive
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>{col.title}</span>{" "}
              <span className="text-[10px] opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Kanban Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {columns.map((column) => {
          const columnTasks = tasks.filter((t) => t.status === column.id);

          // If on mobile and a specific column is active, hide others
          if (mobileActiveTab !== "ALL" && mobileActiveTab !== column.id) {
            return null;
          }

          return (
            <div
              key={column.id}
              className={`bg-slate-100/70 rounded-2xl p-3.5 sm:p-4 shadow-xs border border-slate-200 flex flex-col min-h-[480px] sm:min-h-[550px] ${column.borderColor}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
                <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <span>{column.title}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${column.countColor}`}>
                    {locale === "bn" ? toBengaliDigits(columnTasks.length) : columnTasks.length}
                  </span>
                </h2>
              </div>

              {/* Task Cards Column */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
                {columnTasks.length === 0 ? (
                  <div className="text-center py-14 text-slate-400 text-xs italic">
                    কোনো কাজ নেই (No tasks in this lane)
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    const dateInfo = getDateStatus(task.dueDate, task.status);

                    return (
                      <div
                        key={task.id}
                        className="bg-white rounded-xl p-3.5 shadow-xs border border-slate-200 hover:shadow-sm transition-all flex flex-col space-y-2.5 cursor-pointer active:scale-[0.99]"
                        onClick={() => onOpenTaskDetails(task)}
                      >
                        {/* Priority and Task Code */}
                        <div className="flex items-center justify-between">
                          {task.priority ? (
                            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                              <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                              <span>{locale === "bn" ? toBengaliDigits(task.priority) : task.priority}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400">Regular</span>
                          )}

                          {task.taskCode && (
                            <span className="text-[10px] text-slate-600 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                              {task.taskCode}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-slate-900 text-xs line-clamp-2 leading-relaxed">
                          {task.title}
                        </h3>

                        {/* Department Tag */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5" />
                            <span>{task.department || "Operations"}</span>
                          </span>
                          {task.territory && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center">
                              <MapPin className="w-2.5 h-2.5 mr-0.5" />
                              <span>{task.territory}</span>
                            </span>
                          )}
                        </div>

                        {/* Remarks */}
                        {task.remarks && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100 line-clamp-2 italic">
                            {task.remarks}
                          </p>
                        )}

                        {/* Dates and Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          {task.taskType === "ONGOING" ? (
                            <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200 font-medium flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" />
                              <span>{t.ongoingBadge}</span>
                            </span>
                          ) : task.dueDate ? (
                            <span
                              className={`px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                                dateInfo.isOverdue
                                  ? "bg-rose-100 text-rose-800 font-bold border border-rose-200"
                                  : dateInfo.isDueSoon
                                  ? "bg-amber-100 text-amber-900 font-bold border border-amber-200"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(task.dueDate, locale)}</span>
                            </span>
                          ) : null}
                        </div>

                        {/* Footer: Assignees, Comments, Stage Switch Buttons */}
                        <div
                          className="pt-2 border-t border-slate-100 flex items-center justify-between mt-auto"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Assignees */}
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {task.assignments.slice(0, 3).map((a) => (
                              <div
                                key={a.id}
                                className="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-xs"
                                title={a.user.name}
                              >
                                {a.user.name.slice(0, 1)}
                              </div>
                            ))}
                          </div>

                          {/* Quick Stage Move Buttons (Comfortable Touch Targets) */}
                          {(() => {
                            const canEdit =
                              currentUser.role === "SUPERADMIN" ||
                              (Boolean(currentUser.canEditTask) &&
                                (Boolean(currentUser.canViewAllTasks) ||
                                  task.assignedById === currentUser.id ||
                                  task.assignments.some((a) => a.userId === currentUser.id)));
                            const canComplete =
                              currentUser.role === "SUPERADMIN" || Boolean(currentUser.canCompleteTask);

                            return (
                              <div className="flex items-center space-x-1">
                                {column.id === "IN_PROGRESS" && canEdit && (
                                  <button
                                    onClick={() => onUpdateStatus(task.id, "PENDING")}
                                    className="p-2 min-w-[36px] min-h-[36px] rounded-lg hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition"
                                    title="Move back to Pending"
                                  >
                                    <ArrowLeft className="w-4 h-4" />
                                  </button>
                                )}

                                {column.id === "PENDING" && canEdit && (
                                  <button
                                    onClick={() => onUpdateStatus(task.id, "IN_PROGRESS")}
                                    className="p-2 min-w-[36px] min-h-[36px] rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium flex items-center justify-center cursor-pointer transition"
                                    title="Start Progress"
                                  >
                                    <ArrowRight className="w-4 h-4" />
                                  </button>
                                )}

                                {column.id !== "DONE" && canComplete && (
                                  <button
                                    onClick={() => onUpdateStatus(task.id, "DONE")}
                                    className="p-2 min-w-[36px] min-h-[36px] rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium flex items-center justify-center cursor-pointer transition"
                                    title="Complete"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                )}

                                {column.id === "DONE" && canEdit && (
                                  <button
                                    onClick={() => onUpdateStatus(task.id, "IN_PROGRESS")}
                                    className="p-2 min-w-[36px] min-h-[36px] rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium flex items-center justify-center cursor-pointer transition"
                                    title="Reopen"
                                  >
                                    <ArrowLeft className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
