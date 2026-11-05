"use client";

import React, { useState, useEffect, useCallback } from "react";
import { User, Task, TaskStatus, NotificationItem } from "@/types";
import { Locale } from "@/lib/i18n";
import { Navbar } from "@/components/Navbar";
import { TaskTableView } from "@/components/TaskTableView";
import { TaskKanbanView } from "@/components/TaskKanbanView";
import { TaskCalendarView } from "@/components/TaskCalendarView";
import { DashboardView } from "@/components/DashboardView";
import { TaskModal } from "@/components/TaskModal";
import { TaskDetailDrawer } from "@/components/TaskDetailDrawer";
import { TeamMembersView } from "@/components/TeamMembersView";
import { NotificationPopover } from "@/components/NotificationPopover";
import { LoginForm } from "@/components/LoginForm";
import { RefreshCw, Plus, FileSpreadsheet } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [locale, setLocale] = useState<Locale>("bn");

  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    "table" | "kanban" | "calendar" | "dashboard" | "team"
  >("table");

  // Data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<string[]>([
    "MIS",
    "Sales and Marketing",
    "Business Operations",
  ]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
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

  // Modals & Drawers
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDetailTaskId, setSelectedDetailTaskId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // 1. Initial Auth Check
  useEffect(() => {
    checkCurrentUser();
    const savedLocale = localStorage.getItem("sales_locale") as Locale;
    if (savedLocale === "en" || savedLocale === "bn") {
      setLocale(savedLocale);
    }
  }, []);

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem("sales_locale", newLocale);
  };

  const checkCurrentUser = async () => {
    try {
      setIsAuthChecking(true);
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsAuthChecking(false);
    }
  };

  // 2. Fetch Tasks with Filters
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoadingTasks(true);
      const params = new URLSearchParams();
      if (filters.status && filters.status !== "ALL") params.append("status", filters.status);
      if (filters.assigneeId && filters.assigneeId !== "ALL")
        params.append("assigneeId", filters.assigneeId);
      if (filters.taskType && filters.taskType !== "ALL")
        params.append("taskType", filters.taskType);
      if (filters.department && filters.department !== "ALL")
        params.append("department", filters.department);
      if (filters.dateFilter && filters.dateFilter !== "ALL")
        params.append("dateFilter", filters.dateFilter);
      if (filters.customDate) params.append("customDate", filters.customDate);
      if (filters.priority) params.append("priority", filters.priority);
      if (filters.search) params.append("search", filters.search);
      if (filters.sortBy) params.append("sortBy", filters.sortBy);

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      }
    } catch (e) {
      console.error("Failed to load tasks", e);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [user, filters]);

  // 3. Fetch Users & Notifications
  const fetchUsers = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (e) {
      console.error("Failed to load users", e);
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
      }
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  }, [user]);

  const fetchDepartments = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/departments");
      if (res.ok) {
        const data = await res.json();
        const names = (data.departments || []).map((d: any) => d.name);
        if (names.length > 0) {
          setDepartments(names);
        }
      }
    } catch (e) {
      console.error("Failed to fetch departments", e);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchUsers();
      fetchNotifications();
      fetchDepartments();
    }
  }, [user, fetchTasks, fetchUsers, fetchNotifications, fetchDepartments]);

  // Task Handlers
  const handleToggleTask = async (taskId: string) => {
    // 1. Instant optimistic update
    setTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id === taskId) {
          const nextCompleted = !t.isCompleted;
          return {
            ...t,
            isCompleted: nextCompleted,
            status: (nextCompleted ? "DONE" : "PENDING") as TaskStatus,
            completedDate: nextCompleted ? new Date().toISOString() : null,
          };
        }
        return t;
      });

      // Instantly filter out tasks that no longer match the active filter
      if (filters.status && filters.status !== "ALL") {
        return updated.filter((t) => {
          const currentStatus = t.status === "DONE" || t.isCompleted ? "DONE" : (t.status === "IN_PROGRESS" ? "IN_PROGRESS" : "PENDING");
          if (filters.status === "DONE" || filters.status === "completed") return currentStatus === "DONE";
          if (filters.status === "IN_PROGRESS" || filters.status === "in_progress") return currentStatus === "IN_PROGRESS";
          if (filters.status === "PENDING" || filters.status === "pending") return currentStatus === "PENDING";
          if (filters.status === "NOT_DONE" || filters.status === "not_completed") return currentStatus !== "DONE";
          return t.status === filters.status;
        });
      }
      return updated;
    });

    try {
      const res = await fetch(`/api/tasks/${taskId}/toggle`, { method: "PATCH" });
      if (res.ok) {
        const data = await res.json();
        setTasks((prev) => {
          if (filters.status && filters.status !== "ALL") {
            const currentStatus = data.task.status === "DONE" || data.task.isCompleted ? "DONE" : (data.task.status === "IN_PROGRESS" ? "IN_PROGRESS" : "PENDING");
            if (filters.status === "DONE" || filters.status === "completed") {
              if (currentStatus !== "DONE") return prev.filter((t) => t.id !== taskId);
            } else if (filters.status === "IN_PROGRESS" || filters.status === "in_progress") {
              if (currentStatus !== "IN_PROGRESS") return prev.filter((t) => t.id !== taskId);
            } else if (filters.status === "PENDING" || filters.status === "pending") {
              if (currentStatus !== "PENDING") return prev.filter((t) => t.id !== taskId);
            } else if (filters.status === "NOT_DONE" || filters.status === "not_completed") {
              if (currentStatus === "DONE") return prev.filter((t) => t.id !== taskId);
            }
          }
          return prev.map((t) => (t.id === taskId ? data.task : t));
        });
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to update task");
        fetchTasks();
      }
    } catch {
      fetchTasks();
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    // 0ms optimistic update
    setTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id === taskId) {
          const isCompleted = newStatus === "DONE";
          return {
            ...t,
            status: newStatus,
            isCompleted,
            completedDate: isCompleted ? (t.completedDate || new Date().toISOString()) : null,
          };
        }
        return t;
      });

      // Instantly filter out tasks that no longer match the active filter
      if (filters.status && filters.status !== "ALL") {
        return updated.filter((t) => {
          const currentStatus = t.status === "DONE" || t.isCompleted ? "DONE" : (t.status === "IN_PROGRESS" ? "IN_PROGRESS" : "PENDING");
          if (filters.status === "DONE" || filters.status === "completed") return currentStatus === "DONE";
          if (filters.status === "IN_PROGRESS" || filters.status === "in_progress") return currentStatus === "IN_PROGRESS";
          if (filters.status === "PENDING" || filters.status === "pending") return currentStatus === "PENDING";
          if (filters.status === "NOT_DONE" || filters.status === "not_completed") return currentStatus !== "DONE";
          return t.status === filters.status;
        });
      }
      return updated;
    });

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchTasks();
      } else {
        const errData = await res.json();
        alert(errData.error || "Failed to update status");
        fetchTasks();
      }
    } catch (e) {
      console.error("Failed to update status", e);
      fetchTasks();
    }
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      if (taskData.id) {
        const res = await fetch(`/api/tasks/${taskData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
        if (res.ok) {
          fetchTasks();
        } else {
          const err = await res.json();
          alert(err.error || "Failed to update task");
        }
      } else {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
        if (res.ok) {
          fetchTasks();
        } else {
          const err = await res.json();
          alert(err.error || "Failed to create task");
        }
      }
    } catch (e) {
      console.error("Failed to save task", e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete task");
      }
    } catch (e) {
      console.error("Failed to delete task", e);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {
      console.error("Mark read failed", e);
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <FileSpreadsheet className="w-10 h-10 text-emerald-700 animate-bounce" />
          <p className="text-xs font-semibold text-slate-600">অফিস কার্যক্রম ও টাস্ক ট্র্যাকার প্রস্তুত হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginForm
        onLoginSuccess={(loggedInUser) => setUser(loggedInUser)}
        locale={locale}
        setLocale={handleSetLocale}
      />
    );
  }

  const canCreate =
    user.role === "SUPERADMIN" || Boolean(user.canCreateTask);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100/60 font-sans">
      {/* Top Navbar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={(tab) => setActiveTab(tab)}
        locale={locale}
        setLocale={handleSetLocale}
        onLogout={handleLogout}
        notifications={notifications}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 pb-24 md:pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              {activeTab === "table" && (locale === "bn" ? "সার্বিক অফিস কাজের শিট" : "Office Activity & Task Sheet")}
              {activeTab === "kanban" && (locale === "bn" ? "কানবান প্রসেস বোর্ড" : "Office Kanban Workflow")}
              {activeTab === "calendar" && (locale === "bn" ? "তারিখ অনুযায়ী শিডিউল" : "Office Calendar Schedule")}
              {activeTab === "dashboard" && (locale === "bn" ? "কর্মী উৎপাদনশীলতা ও অ্যানালিটিক্স" : "Workforce Productivity & Analytics")}
              {activeTab === "team" && (locale === "bn" ? "অফিস টিম, পারমিশন ও ডিপার্টমেন্ট" : "Office Team, Permissions & Departments")}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              {activeTab === "team"
                ? (locale === "bn"
                    ? "অফিসের সকল কর্মকর্তা ও কর্মচারীদের কাজের অনুমতি এবং বিভাগ পরিচালনা"
                    : "Manage workforce roles, department assignments, and system permissions")
                : (locale === "bn"
                    ? "অফিসের সকল ডিপার্টমেন্ট ও কর্মীদের কার্যক্ষমতা ট্র্যাকিং"
                    : "Comprehensive company-wide task tracking & employee performance")}
            </p>
          </div>

          {canCreate && (activeTab === "table" || activeTab === "kanban" || activeTab === "calendar") && (
            <button
              onClick={() => {
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
              className="flex items-center justify-center space-x-1.5 px-4 py-2.5 min-h-[44px] bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-700/20 transition cursor-pointer self-start sm:self-auto w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{locale === "bn" ? "নতুন কাজ তৈরি" : "Create Task"}</span>
            </button>
          )}
        </div>

        {/* View Switcher Container */}
        {activeTab === "table" && (
          <TaskTableView
            tasks={tasks}
            users={users}
            currentUser={user}
            locale={locale}
            departments={departments}
            onToggleTask={handleToggleTask}
            onUpdateStatus={handleUpdateStatus}
            onOpenTaskDetails={(t) => {
              setSelectedDetailTaskId(t.id);
              setIsDetailOpen(true);
            }}
            onEditTask={(t) => {
              setEditingTask(t);
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            filters={filters}
            setFilters={setFilters}
          />
        )}

        {activeTab === "kanban" && (
          <TaskKanbanView
            tasks={tasks}
            users={users}
            currentUser={user}
            locale={locale}
            onUpdateStatus={handleUpdateStatus}
            onOpenTaskDetails={(t) => {
              setSelectedDetailTaskId(t.id);
              setIsDetailOpen(true);
            }}
            onEditTask={(t) => {
              setEditingTask(t);
              setIsTaskModalOpen(true);
            }}
          />
        )}

        {activeTab === "calendar" && (
          <TaskCalendarView
            tasks={tasks}
            locale={locale}
            onOpenTaskDetails={(t) => {
              setSelectedDetailTaskId(t.id);
              setIsDetailOpen(true);
            }}
          />
        )}

        {activeTab === "dashboard" && (
          <DashboardView locale={locale} currentUser={user} />
        )}

        {activeTab === "team" && (
          <TeamMembersView
            users={users}
            currentUser={user}
            locale={locale}
            departments={departments}
            onDepartmentCreated={fetchDepartments}
            onUserCreated={fetchUsers}
          />
        )}
      </main>

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        taskToEdit={editingTask}
        users={users}
        currentUser={user}
        locale={locale}
        departments={departments}
        onDepartmentCreated={fetchDepartments}
        onSaveTask={handleSaveTask}
      />

      {/* Task Detail & Comments Drawer */}
      <TaskDetailDrawer
        taskId={selectedDetailTaskId}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedDetailTaskId(null);
        }}
        currentUser={user}
        locale={locale}
        onTaskUpdated={fetchTasks}
      />

      {/* Notification Popover Drawer */}
      <NotificationPopover
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        locale={locale}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onSelectNotification={(link) => {
          setIsNotificationsOpen(false);
          if (link && link.startsWith("/tasks/")) {
            const rawId = link.replace(/^\/tasks\/?/, "").split(/[?#]/)[0];
            if (rawId) {
              setSelectedDetailTaskId(rawId);
              setIsDetailOpen(true);
            }
          }
        }}
      />
    </div>
  );
}
