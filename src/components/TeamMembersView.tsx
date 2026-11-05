"use client";

import React, { useState, useEffect } from "react";
import { User, DEFAULT_DEPARTMENTS, UserPermissions } from "@/types";
import { Locale, translations } from "@/lib/i18n";
import { useDrawerDismiss } from "@/lib/use-drawer-dismiss";
import {
  UserPlus,
  Users,
  CheckCircle2,
  AlertCircle,
  Building2,
  KeyRound,
  Check,
  Settings2,
  Plus,
  Crown,
  Search,
  X,
} from "lucide-react";

interface TeamMembersViewProps {
  users: User[];
  currentUser: User;
  locale: Locale;
  departments?: string[];
  onDepartmentCreated?: () => void;
  onUserCreated: () => void;
}

export const TeamMembersView: React.FC<TeamMembersViewProps> = ({
  users,
  currentUser,
  locale,
  departments: propDepartments,
  onDepartmentCreated,
  onUserCreated,
}) => {
  const t = translations[locale];

  // Drawer state: NONE | DEPARTMENTS | ADD_EMPLOYEE | PERMISSIONS
  const [drawerMode, setDrawerMode] = useState<"NONE" | "DEPARTMENTS" | "ADD_EMPLOYEE" | "PERMISSIONS">("NONE");
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<User | null>(null);

  // Departments state
  const [departments, setDepartments] = useState<string[]>(
    propDepartments && propDepartments.length > 0
      ? propDepartments
      : Array.from(DEFAULT_DEPARTMENTS)
  );
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [isAddingDept, setIsAddingDept] = useState(false);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("ALL");

  // Form state for creating user
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("password123");
  const [role, setRole] = useState<"SUPERADMIN" | "ADMIN" | "MANAGER" | "MEMBER">("MEMBER");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("Business Operations");
  const [phone, setPhone] = useState("");

  // Permissions state
  const [perms, setPerms] = useState<UserPermissions>({
    canCreateTask: true,
    canCompleteTask: true,
    canAssignTask: true,
    canEditTask: true,
    canDeleteTask: false,
    canViewAllTasks: false,
    canManageUsers: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; text: string } | null>(null);

  const closeDrawer = () => {
    setDrawerMode("NONE");
    setEditingPermissionsUser(null);
  };

  useDrawerDismiss({
    isOpen: drawerMode !== "NONE",
    onClose: closeDrawer,
  });

  const fetchDepartments = async () => {
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
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (propDepartments && propDepartments.length > 0) {
      setDepartments(propDepartments);
    }
  }, [propDepartments]);

  const canManage =
    currentUser.role === "SUPERADMIN" ||
    Boolean(currentUser.canManageUsers);

  const handleOpenPermEdit = (user: User) => {
    setEditingPermissionsUser(user);
    setPerms({
      canCreateTask: user.canCreateTask,
      canCompleteTask: user.canCompleteTask,
      canAssignTask: user.canAssignTask,
      canEditTask: user.canEditTask,
      canDeleteTask: user.canDeleteTask,
      canViewAllTasks: user.canViewAllTasks,
      canManageUsers: user.canManageUsers,
    });
    setDepartment(user.department || "Business Operations");
    setDrawerMode("PERMISSIONS");
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPermissionsUser) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPermissionsUser.id,
          department,
          ...perms,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({
          success: true,
          text: `${editingPermissionsUser.name} এর পারমিশন সফলভাবে আপডেট হয়েছে (Permissions updated)`,
        });
        setDrawerMode("NONE");
        setEditingPermissionsUser(null);
        onUserCreated();
      } else {
        setStatusMessage({ success: false, text: data.error || "Failed to update permissions" });
      }
    } catch (e: any) {
      setStatusMessage({ success: false, text: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          designation: designation.trim() || null,
          department,
          phone: phone.trim() || null,
          ...perms,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ success: true, text: "নতুন ব্যবহারকারী সফলভাবে তৈরি করা হয়েছে (User created)" });
        setName("");
        setEmail("");
        setDesignation("");
        setPhone("");
        setDrawerMode("NONE");
        onUserCreated();
      } else {
        setStatusMessage({ success: false, text: data.error || "Failed to create user" });
      }
    } catch (e: any) {
      setStatusMessage({ success: false, text: e.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDepartmentName.trim();
    if (!trimmed) return;

    setIsAddingDept(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewDepartmentName("");
        await fetchDepartments();
        if (onDepartmentCreated) onDepartmentCreated();
        setStatusMessage({ success: true, text: `নতুন বিভাগ '${trimmed}' সফলভাবে তৈরি হয়েছে` });
      } else {
        setStatusMessage({ success: false, text: data.error || "Failed to create department" });
      }
    } catch {
      setStatusMessage({ success: false, text: "Error creating department" });
    } finally {
      setIsAddingDept(false);
    }
  };

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    if (selectedDeptFilter !== "ALL" && u.department !== selectedDeptFilter) {
      return false;
    }
    if (selectedRoleFilter !== "ALL" && u.role !== selectedRoleFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchDept = u.department?.toLowerCase().includes(q);
      const matchDesig = u.designation?.toLowerCase().includes(q);
      return matchName || matchEmail || matchDept || matchDesig;
    }
    return true;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Banner and Actions Card */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Users className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>অফিস কর্মী, ডিপার্টমেন্ট ও পারমিশন কন্ট্রোল</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                    {users.length} জন কর্মী
                  </span>
                  {currentUser.role === "SUPERADMIN" && (
                    <span className="bg-amber-100 text-amber-900 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border border-amber-300">
                      <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />
                      SuperAdmin Access
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  সুপার অ্যাডমিন হিসেবে অ্যাকাউন্ট তৈরি, অ্যাক্সেস লেভেল এবং প্রতিটি কর্মীর কাজের ক্ষমতা নিয়ন্ত্রণ করুন।
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons opening Right Sidebar Drawers */}
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerMode("DEPARTMENTS")}
                className="min-h-[44px] text-xs px-4 py-2 font-bold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition cursor-pointer shadow-xs"
              >
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>ডিপার্টমেন্টসমূহ ({departments.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerMode("ADD_EMPLOYEE")}
                className="min-h-[44px] text-xs px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ নতুন কর্মী যোগ করুন</span>
              </button>
            </div>
          )}
        </div>

        {/* Status notification toast */}
        {statusMessage && (
          <div
            className={`mt-4 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
              statusMessage.success
                ? "bg-emerald-50 text-emerald-900 border border-emerald-300"
                : "bg-red-50 text-red-900 border border-red-300"
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMessage.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="নাম, ইমেইল, পদবী বা ডিপার্টমেন্ট দিয়ে ফিল্টার করুন..."
              className="w-full min-h-[44px] pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Department Filter */}
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="min-h-[44px] text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">সকল বিভাগ (All Departments)</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {/* Role Filter */}
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="min-h-[44px] text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">সকল ভূমিকা (All Roles)</option>
              <option value="SUPERADMIN">SuperAdmin</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="MEMBER">Member</option>
            </select>
          </div>
        </div>
      </div>

      {/* Team Members List (Responsive: Desktop Table + Mobile Card Stack) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200 border-collapse">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr className="divide-x divide-slate-800">
                <th className="py-3 px-4 min-w-[200px]">নাম ও যোগাযোগ</th>
                <th className="py-3 px-4 w-48">বিভাগ (Department)</th>
                <th className="py-3 px-4 min-w-[260px]">সক্রিয় পারমিশন (Permissions)</th>
                <th className="py-3 px-4 w-32 text-center">ভূমিকা (Role)</th>
                {canManage && <th className="py-3 px-4 w-28 text-center">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-medium">কোনো কর্মী পাওয়া যায়নি (No team members found)</p>
                    <p className="text-xs text-slate-400 mt-1">অনুসন্ধান বা ফিল্টার পরিবর্তন করে চেষ্টা করুন।</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors divide-x divide-slate-50">
                    {/* User Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                            <span>{u.name}</span>
                            {u.role === "SUPERADMIN" && (
                              <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">{u.designation || "-"}</div>
                          <div className="text-[10px] text-slate-400 truncate">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 font-bold text-emerald-950 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                        <span>{u.department || "Business Operations"}</span>
                      </span>
                    </td>

                    {/* Permissions Badges */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {u.canCreateTask && (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-slate-200">
                            Create Task
                          </span>
                        )}
                        {u.canCompleteTask && (
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-200">
                            Complete ✓
                          </span>
                        )}
                        {u.canAssignTask && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-blue-200">
                            Assign Others
                          </span>
                        )}
                        {u.canViewAllTasks ? (
                          <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-purple-300">
                            View All Office
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] border border-slate-200">
                            Own Tasks Only
                          </span>
                        )}
                        {u.canManageUsers && (
                          <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-amber-300">
                            Manage Users
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Role Tag */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          u.role === "SUPERADMIN"
                            ? "bg-amber-100 text-amber-950 border border-amber-300"
                            : u.role === "ADMIN"
                            ? "bg-purple-100 text-purple-900 border border-purple-200"
                            : u.role === "MANAGER"
                            ? "bg-blue-100 text-blue-900 border border-blue-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    {/* Action Button */}
                    {canManage && (
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenPermEdit(u)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 font-bold rounded-lg text-xs flex items-center space-x-1 mx-auto transition cursor-pointer"
                        >
                          <Settings2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>পারমিশন</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Team Member Card Stack View */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 p-4">
              <p className="text-sm font-medium">কোনো কর্মী পাওয়া যায়নি (No team members found)</p>
              <p className="text-xs text-slate-400 mt-1">অনুসন্ধান বা ফিল্টার পরিবর্তন করে চেষ্টা করুন।</p>
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div key={u.id} className="p-4 space-y-3 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {u.role === "SUPERADMIN" && (
                          <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{u.designation || "-"}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </div>
                  </div>

                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                      u.role === "SUPERADMIN"
                        ? "bg-amber-100 text-amber-950 border border-amber-300"
                        : u.role === "ADMIN"
                        ? "bg-purple-100 text-purple-900 border border-purple-200"
                        : u.role === "MANAGER"
                        ? "bg-blue-100 text-blue-900 border border-blue-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {u.role}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-950 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{u.department || "Business Operations"}</span>
                  </span>
                </div>

                {/* Permissions Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {u.canCreateTask && (
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-slate-200">
                      Create Task
                    </span>
                  )}
                  {u.canCompleteTask && (
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold border border-emerald-200">
                      Complete ✓
                    </span>
                  )}
                  {u.canAssignTask && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-blue-200">
                      Assign Others
                    </span>
                  )}
                  {u.canViewAllTasks ? (
                    <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-purple-300">
                      View All Office
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] border border-slate-200">
                      Own Tasks Only
                    </span>
                  )}
                  {u.canManageUsers && (
                    <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md text-[10px] font-extrabold border border-amber-300">
                      Manage Users
                    </span>
                  )}
                </div>

                {/* 44px min-height action button on mobile */}
                {canManage && (
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenPermEdit(u)}
                      className="w-full min-h-[44px] bg-slate-100 hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Settings2 className="w-4 h-4 text-emerald-700" />
                      <span>পারমিশন পরিবর্তন করুন</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT SIDEBAR DRAWER: DEPARTMENTS / ADD EMPLOYEE / PERMISSIONS */}
      {/* ======================================================== */}
      {drawerMode !== "NONE" && (
        <div
          className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150 cursor-pointer"
          onClick={closeDrawer}
        >
          <div
            className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  {drawerMode === "DEPARTMENTS" && <Building2 className="w-4 h-4" />}
                  {drawerMode === "ADD_EMPLOYEE" && <UserPlus className="w-4 h-4" />}
                  {drawerMode === "PERMISSIONS" && <KeyRound className="w-4 h-4" />}
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {drawerMode === "DEPARTMENTS" && "ডিপার্টমেন্ট ব্যবস্থাপনা (Department Management)"}
                    {drawerMode === "ADD_EMPLOYEE" && "নতুন অফিস কর্মী যোগ করুন (Add New Employee)"}
                    {drawerMode === "PERMISSIONS" && "পারমিশন কনফিগারেশন (Configure Permissions)"}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDrawerMode("NONE");
                  setEditingPermissionsUser(null);
                }}
                className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* ---------------- 1. DEPARTMENTS DRAWER ---------------- */}
              {drawerMode === "DEPARTMENTS" && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      বিদ্যমান বিভাগসমূহ ({departments.length})
                    </h4>
                    <p className="text-xs text-slate-500 mb-3">
                      সকল বিভাগের তালিকা এবং প্রতিটি বিভাগের সক্রিয় কর্মী সংখ্যা:
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {departments.map((d) => {
                        const count = users.filter((u) => u.department === d).length;
                        return (
                          <div
                            key={d}
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs"
                          >
                            <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{d}</span>
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              {count} জন
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {canManage && (
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-emerald-700" />
                        <span>নতুন বিভাগ তৈরি করুন</span>
                      </h4>
                      <form onSubmit={handleCreateDepartment} className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            বিভাগের নাম (Department Name) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={newDepartmentName}
                            onChange={(e) => setNewDepartmentName(e.target.value)}
                            placeholder="যেমন: Human Resources, Supply Chain, Audit & Compliance..."
                            className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isAddingDept || !newDepartmentName.trim()}
                          className="w-full min-h-[44px] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm shadow-emerald-600/20"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{isAddingDept ? "যোগ হচ্ছে..." : "+ নতুন বিভাগ তৈরি করুন"}</span>
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* ---------------- 2. ADD EMPLOYEE DRAWER ---------------- */}
              {drawerMode === "ADD_EMPLOYEE" && (
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      নাম (Full Name) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="উদা: মোঃ জসীম উদ্দিন"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ইমেইল (Email Address) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="officer@company.com"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        বিভাগ (Department)
                      </label>
                      <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {departments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ভূমিকা (Role)
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as any)}
                        className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="MEMBER">Member (Officer / Staff)</option>
                        <option value="MANAGER">Manager (Department Lead)</option>
                        <option value="ADMIN">Admin (Executive Admin)</option>
                        {currentUser.role === "SUPERADMIN" && (
                          <option value="SUPERADMIN">SuperAdmin (Full Access)</option>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        পদবী (Designation)
                      </label>
                      <input
                        type="text"
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        placeholder="MIS Specialist / Operations Lead"
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        প্রাথমিক পাসওয়ার্ড (Password)
                      </label>
                      <input
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Checkbox permissions on user creation */}
                  <div className="pt-3 border-t border-slate-100">
                    <span className="block text-xs font-bold text-slate-800 mb-2">
                      প্রাথমিক কাজের অনুমতি (Initial Permissions):
                    </span>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={perms.canCreateTask}
                          onChange={(e) => setPerms({ ...perms, canCreateTask: e.target.checked })}
                          className="rounded text-emerald-700"
                        />
                        <span className="text-xs font-bold text-slate-800">Can Create Task (টাস্ক তৈরি করতে পারবে)</span>
                      </label>

                      <label className="flex items-center space-x-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={perms.canCompleteTask}
                          onChange={(e) => setPerms({ ...perms, canCompleteTask: e.target.checked })}
                          className="rounded text-emerald-700"
                        />
                        <span className="text-xs font-bold text-slate-800">Can Complete Task (টাস্ক সম্পন্ন/✓ করতে পারবে)</span>
                      </label>

                      <label className="flex items-center space-x-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={perms.canAssignTask}
                          onChange={(e) => setPerms({ ...perms, canAssignTask: e.target.checked })}
                          className="rounded text-emerald-700"
                        />
                        <span className="text-xs font-bold text-slate-800">Can Assign Others (অন্যকে দায়িত্ব দিতে পারবে)</span>
                      </label>

                      <label className="flex items-center space-x-2.5 bg-purple-50/70 p-2.5 rounded-xl border border-purple-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={perms.canViewAllTasks}
                          onChange={(e) => setPerms({ ...perms, canViewAllTasks: e.target.checked })}
                          className="rounded text-purple-700"
                        />
                        <span className="text-xs font-bold text-purple-950">View All Office Tasks (সকল বিভাগের কাজ দেখতে পারবে)</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setDrawerMode("NONE")}
                      className="min-h-[44px] px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="min-h-[44px] px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                    >
                      {isSubmitting ? "সংরক্ষণ হচ্ছে..." : "কর্মী তৈরি করুন"}
                    </button>
                  </div>
                </form>
              )}

              {/* ---------------- 3. PERMISSIONS DRAWER ---------------- */}
              {drawerMode === "PERMISSIONS" && editingPermissionsUser && (
                <form onSubmit={handleSavePermissions} className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {editingPermissionsUser.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{editingPermissionsUser.name}</h4>
                      <p className="text-xs text-slate-500">{editingPermissionsUser.email}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      বিভাগ (Department)
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Granular Permission Toggles */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      কাজের পারমিশন সেটিংস নির্বাচন করুন:
                    </label>
                    <div className="space-y-2.5 text-xs">
                      {/* Can Create Task */}
                      <label className="flex items-start space-x-2.5 bg-slate-50 hover:bg-emerald-50/50 p-3 rounded-xl border border-slate-200 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={perms.canCreateTask}
                          onChange={(e) => setPerms({ ...perms, canCreateTask: e.target.checked })}
                          className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-bold block text-slate-900">টাস্ক তৈরি (Create Tasks)</span>
                          <span className="text-[11px] text-slate-500">নতুন কাজ তৈরি ও ডাটা এন্ট্রি করার অনুমতি</span>
                        </div>
                      </label>

                      {/* Can Complete Task */}
                      <label className="flex items-start space-x-2.5 bg-slate-50 hover:bg-emerald-50/50 p-3 rounded-xl border border-slate-200 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={perms.canCompleteTask}
                          onChange={(e) => setPerms({ ...perms, canCompleteTask: e.target.checked })}
                          className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-bold block text-slate-900">টাস্ক সম্পন্ন (Complete / ✓)</span>
                          <span className="text-[11px] text-slate-500">কাজ শেষ হলে টিক চিহ্ন দিয়ে সম্পন্ন করার অনুমতি</span>
                        </div>
                      </label>

                      {/* Can Assign Others */}
                      <label className="flex items-start space-x-2.5 bg-slate-50 hover:bg-emerald-50/50 p-3 rounded-xl border border-slate-200 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={perms.canAssignTask}
                          onChange={(e) => setPerms({ ...perms, canAssignTask: e.target.checked })}
                          className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-bold block text-slate-900">অন্যকে অ্যাসাইন (Assign Others)</span>
                          <span className="text-[11px] text-slate-500">অন্যান্য সদস্যদের কাছে কাজ বণ্টন করার অনুমতি</span>
                        </div>
                      </label>

                      {/* Can Edit Task */}
                      <label className="flex items-start space-x-2.5 bg-slate-50 hover:bg-emerald-50/50 p-3 rounded-xl border border-slate-200 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={perms.canEditTask}
                          onChange={(e) => setPerms({ ...perms, canEditTask: e.target.checked })}
                          className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-bold block text-slate-900">টাস্ক সম্পাদনা (Edit Tasks)</span>
                          <span className="text-[11px] text-slate-500">বিবরণ, মন্তব্য ও ডেডলাইন পরিবর্তন করার অনুমতি</span>
                        </div>
                      </label>

                      {/* Can Delete Task */}
                      <label className="flex items-start space-x-2.5 bg-slate-50 hover:bg-emerald-50/50 p-3 rounded-xl border border-slate-200 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={perms.canDeleteTask}
                          onChange={(e) => setPerms({ ...perms, canDeleteTask: e.target.checked })}
                          className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-500"
                        />
                        <div>
                          <span className="font-bold block text-slate-900">টাস্ক ডিলিট (Delete Tasks)</span>
                          <span className="text-[11px] text-slate-500">টাস্ক পুরোপুরি মুছে ফেলার অনুমতি</span>
                        </div>
                      </label>

                      {/* Can View All Office Tasks */}
                      <label className="flex items-start space-x-2.5 bg-purple-50/70 hover:bg-purple-50 p-3 rounded-xl border border-purple-200 cursor-pointer transition">
                        <input
                          type="checkbox"
                          checked={perms.canViewAllTasks}
                          onChange={(e) => setPerms({ ...perms, canViewAllTasks: e.target.checked })}
                          className="mt-0.5 rounded text-purple-700 focus:ring-purple-500"
                        />
                        <div>
                          <span className="font-bold block text-purple-950">সকল টাস্ক দর্শন (View All Office)</span>
                          <span className="text-[11px] text-purple-800">
                            {perms.canViewAllTasks
                              ? "পুরো অফিসের সকল ডিপার্টমেন্টের টাস্ক দেখতে পারবে"
                              : "শুধু নিজের তৈরি বা অ্যাসাইন করা কাজ দেখতে পারবে"}
                          </span>
                        </div>
                      </label>

                      {/* Can Manage Users (SuperAdmin only) */}
                      {currentUser.role === "SUPERADMIN" && (
                        <label className="flex items-start space-x-2.5 bg-amber-50/70 hover:bg-amber-50 p-3 rounded-xl border border-amber-200 cursor-pointer transition">
                          <input
                            type="checkbox"
                            checked={perms.canManageUsers}
                            onChange={(e) => setPerms({ ...perms, canManageUsers: e.target.checked })}
                            className="mt-0.5 rounded text-amber-700 focus:ring-amber-500"
                          />
                          <div>
                            <span className="font-bold block text-amber-950">কর্মী পরিচালনা (Manage Users)</span>
                            <span className="text-[11px] text-amber-800">নতুন কর্মী যোগ ও পারমিশন কন্ট্রোল করার সুবিধা</span>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDrawerMode("NONE");
                        setEditingPermissionsUser(null);
                      }}
                      className="min-h-[44px] px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="min-h-[44px] px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm shadow-emerald-600/20 transition cursor-pointer"
                    >
                      {isSubmitting ? "সংরক্ষণ হচ্ছে..." : "পারমিশন সংরক্ষণ করুন"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
