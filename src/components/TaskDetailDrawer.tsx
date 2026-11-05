"use client";

import React, { useState, useEffect } from "react";
import { Task, User } from "@/types";
import { Locale, translations } from "@/lib/i18n";
import { formatDate, getDateStatus, toBengaliDigits } from "@/lib/date-utils";
import { useDrawerDismiss } from "@/lib/use-drawer-dismiss";
import {
  X,
  Check,
  Star,
  Calendar,
  RefreshCw,
  Send,
  MessageSquare,
  History,
  User as UserIcon,
  MapPin,
  Clock,
  Building2,
  Lock,
  AlertCircle,
} from "lucide-react";

interface TaskDetailDrawerProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  locale: Locale;
  onTaskUpdated: () => void;
}

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  taskId,
  isOpen,
  onClose,
  currentUser,
  locale,
  onTaskUpdated,
}) => {
  const t = translations[locale];
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<"comments" | "audit">("comments");

  useEffect(() => {
    if (taskId && isOpen) {
      setTask(null);
      setFetchError(null);
      loadTaskDetails(taskId);
    } else if (!isOpen) {
      setTask(null);
      setFetchError(null);
    }
  }, [taskId, isOpen]);

  const loadTaskDetails = async (id: string) => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const res = await fetch(`/api/tasks/${encodeURIComponent(id)}`);
      if (res.ok) {
        const json = await res.json();
        setTask(json.task);
      } else {
        const json = await res.json().catch(() => null);
        const errMsg =
          json?.error ||
          (res.status === 404
            ? (locale === "bn" ? "এই কাজটি খুঁজে পাওয়া যায়নি (মুছে ফেলা হতে পারে)।" : "This task could not be found.")
            : res.status === 403
            ? (locale === "bn" ? "এই কাজটি দেখার অনুমতি আপনার নেই।" : "You do not have permission to view this task.")
            : (locale === "bn" ? "কাজ লোড করতে সমস্যা হয়েছে।" : "Failed to load task details."));
        setFetchError(errMsg);
      }
    } catch (e) {
      console.error("Failed to load task details", e);
      setFetchError(locale === "bn" ? "নেটওয়ার্ক সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।" : "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const canComplete =
    currentUser.role === "SUPERADMIN" || Boolean(currentUser.canCompleteTask);

  const canModifyAssignees =
    currentUser.role === "SUPERADMIN" || Boolean(currentUser.canAssignTask);

  const handleToggle = async () => {
    if (!task) return;
    if (!canComplete) {
      alert("আপনার টাস্ক সম্পন্ন করার অনুমতি নেই (You do not have permission to mark tasks done)");
      return;
    }
    try {
      const res = await fetch(`/api/tasks/${task.id}/toggle`, { method: "PATCH" });
      if (res.ok) {
        await loadTaskDetails(task.id);
        onTaskUpdated();
      }
    } catch (e) {
      console.error("Failed to toggle status", e);
    }
  };

  const handleRemoveAssignee = async (userIdToRemove: string) => {
    if (!task) return;
    if (!canModifyAssignees) {
      alert("আপনার অ্যাসাইনকৃত সদস্য পরিবর্তনের অনুমতি নেই (Permission denied to modify assignees)");
      return;
    }

    const updatedAssigneeIds = task.assignments
      .map((a) => a.userId)
      .filter((id) => id !== userIdToRemove);

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeIds: updatedAssigneeIds }),
      });
      if (res.ok) {
        await loadTaskDetails(task.id);
        onTaskUpdated();
      }
    } catch (e) {
      console.error("Failed to remove assignee", e);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !commentInput.trim()) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: commentInput.trim() }),
      });
      if (res.ok) {
        setCommentInput("");
        await loadTaskDetails(task.id);
        onTaskUpdated();
      }
    } catch (e) {
      console.error("Failed to post comment", e);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  useDrawerDismiss({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono px-2.5 py-1 rounded-md font-bold">
              {task?.taskCode || "TASK"}
            </span>
            <span className="font-bold text-sm sm:text-base text-white">
              {locale === "bn" ? "কাজের বিস্তারিত" : "Task Details"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <span className="text-xs text-slate-500 font-medium">
              {locale === "bn" ? "টাস্ক লোড হচ্ছে..." : "Loading task..."}
            </span>
          </div>
        ) : fetchError || !task ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-2xs">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="max-w-xs space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                {locale === "bn" ? "টাস্ক পাওয়া যায়নি" : "Task Unavailable"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {fetchError || (locale === "bn"
                  ? "এই টাস্কটি মুছে ফেলা হয়েছে অথবা আপনার এটি দেখার অনুমতি নেই।"
                  : "This task may have been removed or you do not have permission to view it.")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 min-h-[40px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
            >
              {locale === "bn" ? "বন্ধ করুন" : "Close"}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* Action Bar: Checkbox Toggle */}
            <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
              <button
                onClick={handleToggle}
                disabled={!canComplete}
                className={`min-h-[44px] flex items-center space-x-2.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${
                  task.isCompleted
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : canComplete
                    ? "bg-white text-slate-700 border border-slate-300 hover:border-emerald-600"
                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                }`}
                title={!canComplete ? "No permission to complete" : ""}
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center border ${
                    task.isCompleted ? "border-white bg-emerald-700" : "border-slate-400"
                  }`}
                >
                  {task.isCompleted && <Check className="w-3 h-3 text-white stroke-[3]" />}
                </div>
                <span>
                  {task.isCompleted
                    ? t.markAsPending
                    : canComplete
                    ? t.markAsDone
                    : "সম্পূর্ণের অনুমতি নেই"}
                </span>
                {!canComplete && <Lock className="w-3.5 h-3.5 ml-1 text-slate-400" />}
              </button>

              <div className="text-right flex items-center gap-2">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                  {task.department || "Operations"}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    task.status === "DONE"
                      ? "bg-emerald-100 text-emerald-800"
                      : task.status === "IN_PROGRESS"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {task.status === "DONE"
                    ? t.statusDone
                    : task.status === "IN_PROGRESS"
                    ? t.statusInProgress
                    : t.statusPending}
                </span>
              </div>
            </div>

            {/* Task Title & Details */}
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">{task.title}</h2>
              {task.description && (
                <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {task.description}
                </p>
              )}
            </div>

            {/* Metadata Pills */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Due Date */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                  {t.colDueDate}
                </span>
                {task.taskType === "ONGOING" ? (
                  <span className="font-bold text-emerald-800 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> {t.ongoingBadge}
                  </span>
                ) : task.dueDate ? (
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {formatDate(task.dueDate, locale)}
                  </span>
                ) : (
                  <span className="text-slate-400">None</span>
                )}
              </div>

              {/* Priority */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                  {t.colPriority}
                </span>
                {task.priority ? (
                  <span className="font-bold text-amber-900 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                    {locale === "bn" ? toBengaliDigits(task.priority) : task.priority} / 10
                  </span>
                ) : (
                  <span className="text-slate-400">Normal</span>
                )}
              </div>
            </div>

            {/* Remarks / Completed Date */}
            {task.remarks && (
              <div className="bg-amber-50/60 border border-amber-200/80 p-3 rounded-lg text-xs">
                <span className="font-bold text-amber-950 block mb-1">
                  {t.colRemarks}:
                </span>
                <p className="text-amber-900">{task.remarks}</p>
                {task.completedDate && (
                  <span className="text-[10px] text-emerald-700 font-medium block mt-1">
                    ✓ সম্পন্ন: {formatDate(task.completedDate, locale, true)}
                  </span>
                )}
              </div>
            )}

            {/* Recurrence Schedule Info */}
            {task.taskType === "RECURRING" && (
              <div className="bg-indigo-50/70 border border-indigo-200/80 p-3 rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    {locale === "bn" ? "পুনরাবৃত্তি সময়সূচী (Schedule):" : "Recurrence Schedule:"}
                  </span>
                  <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                    {task.recurrenceFrequency || "ACTIVE"}
                  </span>
                </div>
                <div className="text-indigo-900 text-[11px]">
                  {task.recurrenceFrequency === "DAILY" &&
                    (locale === "bn"
                      ? `প্রতিদিন ${task.recurrenceTime || "09:00"} টায় স্বয়ংক্রিয়ভাবে টাস্ক তৈরি হবে`
                      : `Triggers daily at ${task.recurrenceTime || "09:00"}`)}
                  {task.recurrenceFrequency === "WEEKLY" &&
                    (locale === "bn"
                      ? `প্রতি সপ্তাহে (${task.recurrenceDays || "শনিবার"}) ${task.recurrenceTime || "09:00"} টায় টাস্ক তৈরি হবে`
                      : `Triggers weekly on ${task.recurrenceDays || "SATURDAY"} at ${task.recurrenceTime || "09:00"}`)}
                  {task.recurrenceFrequency === "MONTHLY" &&
                    (locale === "bn"
                      ? `প্রতি মাসের ${task.recurrenceDates || "১"} তারিখে ${task.recurrenceTime || "09:00"} টায় টাস্ক তৈরি হবে`
                      : `Triggers on day ${task.recurrenceDates || "1"} of each month at ${task.recurrenceTime || "09:00"}`)}
                  {task.recurrenceFrequency === "CUSTOM" &&
                    (locale === "bn"
                      ? `নির্দিষ্ট একাধিক তারিখ ও সময়ে টাস্ক সক্রিয় হবে`
                      : `Triggers on designated arbitrary dates & times`)}
                  {!task.recurrenceFrequency && (task.recurrenceRule || "Weekly recurrence")}
                  {task.recurrenceTimezone && (
                    <span className="text-[10px] text-indigo-600 block mt-0.5">
                      🌐 {task.recurrenceTimezone}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Assignees with direct Deselect / Remove action */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700">{t.assignees}</span>
                <span className="text-[10px] text-slate-400">
                  {task.assignments.length} assigned
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {task.assignments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">কোনো সদস্য নির্ধারিত নেই (Unassigned)</p>
                ) : (
                  task.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-xs border border-slate-200"
                    >
                      <UserIcon className="w-3 h-3 text-slate-500" />
                      <span className="font-semibold text-slate-800">{a.user.name}</span>
                      <span className="text-[10px] text-slate-500">
                        ({a.user.department || a.user.designation || a.user.role})
                      </span>
                      {canModifyAssignees && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignee(a.userId)}
                          className="p-0.5 rounded-full hover:bg-red-100 text-slate-400 hover:text-red-600 transition ml-1"
                          title="Deselect / Remove user"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tabs: Comments & Audit History */}
            <div className="border-t border-slate-200 pt-4">
              <div className="flex border-b border-slate-200 mb-4">
                <button
                  onClick={() => setActiveTab("comments")}
                  className={`flex items-center space-x-1.5 py-2 px-3 text-xs font-bold border-b-2 transition ${
                    activeTab === "comments"
                      ? "border-emerald-700 text-emerald-800"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{t.comments} ({task.comments?.length || 0})</span>
                </button>
                <button
                  onClick={() => setActiveTab("audit")}
                  className={`flex items-center space-x-1.5 py-2 px-3 text-xs font-bold border-b-2 transition ${
                    activeTab === "audit"
                      ? "border-emerald-700 text-emerald-800"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>{t.activityHistory} ({task.activityLogs?.length || 0})</span>
                </button>
              </div>

              {/* Comments Thread Tab */}
              {activeTab === "comments" && (
                <div className="space-y-3">
                  <form onSubmit={handlePostComment} className="flex gap-2">
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder={t.writeComment}
                      className="flex-1 min-h-[44px] text-sm px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !commentInput.trim()}
                      className="min-w-[44px] min-h-[44px] px-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center cursor-pointer shadow-xs"
                      title={t.postComment}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {!task.comments || task.comments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4 text-center">{t.noComments}</p>
                    ) : (
                      task.comments.map((c) => (
                        <div key={c.id} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-slate-800">{c.user.name}</span>
                            <span className="text-[10px] text-slate-400">
                              {formatDate(c.createdAt, locale, true)}
                            </span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">{c.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Audit History Tab */}
              {activeTab === "audit" && (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {!task.activityLogs || task.activityLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">No logs recorded</p>
                  ) : (
                    task.activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start space-x-2 text-xs py-1.5 border-b border-slate-100">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-slate-800">
                            <span className="font-semibold">{log.user?.name || "System"}:</span>{" "}
                            {log.details || log.action}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(log.createdAt, locale, true)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
