export type UserRole = "SUPERADMIN" | "ADMIN" | "MANAGER" | "MEMBER";

export interface Department {
  id: string;
  name: string;
  createdAt: string;
}

export const DEFAULT_DEPARTMENTS = [
  "MIS",
  "Sales and Marketing",
  "Business Operations",
] as const;

export const OFFICE_DEPARTMENTS = DEFAULT_DEPARTMENTS;

export interface UserPermissions {
  canCreateTask: boolean;
  canCompleteTask: boolean;
  canAssignTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  canViewAllTasks: boolean; // if false, user only sees tasks they created or are assigned to!
  canManageUsers: boolean;
}

export interface User extends UserPermissions {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation?: string | null;
  department: string;
  phone?: string | null;
}

export type TaskType = "ONE_TIME" | "ONGOING" | "RECURRING";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "DONE";
export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";

export interface CustomRecurrenceSlot {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  userId: string;
  user: User;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  comment: string;
  createdAt: string;
  user: User;
}

export interface ActivityLog {
  id: string;
  taskId: string;
  userId?: string | null;
  action: string;
  details?: string | null;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

export interface Task {
  id: string;
  taskCode?: string | null;
  title: string;
  description?: string | null;
  taskType: TaskType;
  recurrenceRule?: string | null;
  recurrenceFrequency?: RecurrenceFrequency | string | null;
  recurrenceDays?: string | null;
  recurrenceDates?: string | null;
  recurrenceTime?: string | null;
  recurrenceTimezone?: string | null;
  lastGeneratedAt?: string | null;
  parentTaskId?: string | null;
  status: TaskStatus;
  isCompleted: boolean;
  priority?: number | null;
  priorityNote?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  remarks?: string | null;
  territory?: string | null;
  department: string;
  dueReminderSentAt?: string | null;
  assignedById: string;
  assignedBy?: User;
  assignments: TaskAssignment[];
  comments?: TaskComment[];
  activityLogs?: ActivityLog[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    comments: number;
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export interface UserProductivityMetrics {
  id: string;
  name: string;
  designation: string;
  department: string;
  totalAssigned: number;
  completed: number;
  completedOnTime: number;
  overdue: number;
  pending: number;
  completionRate: number;
  onTimeRate: number;
  productivityScore: number;
  performanceGrade: "🏆 High Performer" | "⚡ Productive" | "📈 On Track" | "⚠️ Needs Follow-up";
  performanceGradeBn: string;
  avgTurnaroundHours: number;
}

export interface DashboardStats {
  total: number;
  done: number;
  pending: number;
  inProgress: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  ongoing: number;
  completionRate: number;
}
