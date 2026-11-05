"use client";

import React, { useState, useEffect } from "react";
import { User, DEFAULT_DEPARTMENTS, UserPermissions } from "@/types";
import { Locale, translations } from "@/lib/i18n";
import { useDrawerDismiss } from "@/lib/use-drawer-dismiss";
import {
  X,
  UserPlus,
  Users,
  Shield,
  CheckCircle2,
  AlertCircle,
  Building2,
  KeyRound,
  Check,
  Settings2,
  Plus,
  Crown,
} from "lucide-react";

interface TeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User;
  locale: Locale;
  departments?: string[];
  onDepartmentCreated?: () => void;
  onUserCreated: () => void;
}

export const TeamMembersModal: React.FC<TeamMembersModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  locale,
  departments: propDepartments,
  onDepartmentCreated,
  onUserCreated,
}) => {
  const t = translations[locale];
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPermissionsUser, setEditingPermissionsUser] = useState<User | null>(null);

  // Departments state
  const [departments, setDepartments] = useState<string[]>(
    propDepartments && propDepartments.length > 0
      ? propDepartments
      : Array.from(DEFAULT_DEPARTMENTS)
  );
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [isAddingDept, setIsAddingDept] = useState(false);
  const [showDeptManager, setShowDeptManager] = useState(false);

  // Form state
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
    if (isOpen) {
      fetchDepartments();
    }
  }, [isOpen]);

  useEffect(() => {
    if (propDepartments && propDepartments.length > 0) {
      setDepartments(propDepartments);
    }
  }, [propDepartments]);

  const canManage =
    currentUser.role === "SUPERADMIN" ||
    currentUser.role === "ADMIN" ||
    currentUser.canManageUsers;

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
    setShowAddForm(false);
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
        setShowAddForm(false);
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

  useDrawerDismiss({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold">
              {locale === "bn"
                ? "অফিস টিম, পারমিশন ও ডিপার্টমেন্ট কন্ট্রোল"
                : "Office Team, Permissions & Departments"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-emerald-100 hover:text-white hover:bg-emerald-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {canManage && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>অফিস কর্মী ও বিভাগ ব্যবস্থাপনা</span>
                  {currentUser.role === "SUPERADMIN" && (
                    <span className="bg-amber-100 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 border border-amber-300">
                      <Crown className="w-3 h-3 text-amber-600" />
                      SuperAdmin Access
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  সুপার অ্যাডমিন হিসেবে অ্যাকাউন্ট তৈরি, পারমিশন বরাদ্দ ও নতুন বিভাগ পরিচালনা করুন।
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeptManager(!showDeptManager)}
                  className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center space-x-1 cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{showDeptManager ? "ডিপার্টমেন্ট লুকান" : "ডিপার্টমেন্টসমূহ (" + departments.length + ")"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(!showAddForm);
                    setEditingPermissionsUser(null);
                  }}
                  className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center space-x-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showAddForm ? "ফর্ম বন্ধ" : "+ নতুন কর্মী যোগ"}</span>
                </button>
              </div>
            </div>
          )}

          {statusMessage && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold flex items-center space-x-2 ${
                statusMessage.success
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                  : "bg-red-50 text-red-800 border border-red-300"
              }`}
            >
              {statusMessage.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Department Management Panel */}
          {showDeptManager && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-3 animate-in fade-in duration-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-700" />
                  <span>বিদ্যমান বিভাগসমূহ ও নতুন বিভাগ তৈরি (Department Management)</span>
                </h4>
              </div>

              {/* Department tags */}
              <div className="flex flex-wrap gap-2">
                {departments.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs"
                  >
                    <Building2 className="w-3 h-3 text-emerald-600" />
                    <span>{d}</span>
                  </span>
                ))}
              </div>

              {/* Add department form */}
              <form onSubmit={handleCreateDepartment} className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  required
                  value={newDepartmentName}
                  onChange={(e) => setNewDepartmentName(e.target.value)}
                  placeholder="নতুন বিভাগের নাম লিখুন (যেমন: MIS, HR, Finance, Operations)..."
                  className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isAddingDept || !newDepartmentName.trim()}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isAddingDept ? "তৈরি হচ্ছে..." : "বিভাগ যোগ করুন"}</span>
                </button>
              </form>
            </div>
          )}

          {/* Edit Permissions Modal Box */}
          {editingPermissionsUser && (
            <form
              onSubmit={handleSavePermissions}
              className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-300 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <div className="flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-emerald-800" />
                  <h3 className="text-xs font-bold text-emerald-950">
                    পারমিশন সেটিংস: {editingPermissionsUser.name} ({editingPermissionsUser.email})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPermissionsUser(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    বিভাগ (Department)
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Granular Permission Toggles */}
              <div>
                <label className="block text-[11px] font-bold text-slate-800 mb-2">
                  ব্যবহারকারীর কাজের অনুমতিসমূহ (Select what this user can do):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:border-emerald-400 transition">
                    <input
                      type="checkbox"
                      checked={perms.canCreateTask}
                      onChange={(e) => setPerms({ ...perms, canCreateTask: e.target.checked })}
                      className="rounded text-emerald-700 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-semibold block text-slate-900">টাস্ক তৈরি (Create Tasks)</span>
                      <span className="text-[10px] text-slate-500">নতুন টাস্ক যোগ করতে পারবে</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:border-emerald-400 transition">
                    <input
                      type="checkbox"
                      checked={perms.canCompleteTask}
                      onChange={(e) => setPerms({ ...perms, canCompleteTask: e.target.checked })}
                      className="rounded text-emerald-700 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-semibold block text-slate-900">টাস্ক সম্পন্ন (Complete / ✓)</span>
                      <span className="text-[10px] text-slate-500">কাজ শেষ চিহ্ন দিতে পারবে</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:border-emerald-400 transition">
                    <input
                      type="checkbox"
                      checked={perms.canAssignTask}
                      onChange={(e) => setPerms({ ...perms, canAssignTask: e.target.checked })}
                      className="rounded text-emerald-700 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-semibold block text-slate-900">অন্যকে অ্যাসাইন (Assign Others)</span>
                      <span className="text-[10px] text-slate-500">অন্যদের কাছে কাজ বণ্টন করতে পারবে</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:border-emerald-400 transition">
                    <input
                      type="checkbox"
                      checked={perms.canEditTask}
                      onChange={(e) => setPerms({ ...perms, canEditTask: e.target.checked })}
                      className="rounded text-emerald-700 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-semibold block text-slate-900">টাস্ক সম্পাদনা (Edit Tasks)</span>
                      <span className="text-[10px] text-slate-500">বিবরণ ও ডেডলাইন পরিবর্তন</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:border-emerald-400 transition">
                    <input
                      type="checkbox"
                      checked={perms.canDeleteTask}
                      onChange={(e) => setPerms({ ...perms, canDeleteTask: e.target.checked })}
                      className="rounded text-emerald-700 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-semibold block text-slate-900">টাস্ক ডিলিট (Delete Tasks)</span>
                      <span className="text-[10px] text-slate-500">টাস্ক পুরোপুরি মুছে ফেলতে পারবে</span>
                    </div>
                  </label>

                  <label className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:border-emerald-400 transition">
                    <input
                      type="checkbox"
                      checked={perms.canViewAllTasks}
                      onChange={(e) => setPerms({ ...perms, canViewAllTasks: e.target.checked })}
                      className="rounded text-emerald-700 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-semibold block text-slate-900">সকল টাস্ক দর্শন (View All Tasks)</span>
                      <span className="text-[10px] text-slate-500">
                        {perms.canViewAllTasks
                          ? "পুরো অফিসের সকল টাস্ক দেখতে পারবে"
                          : "শুধু নিজের তৈরি বা অ্যাসাইন করা টাস্ক দেখতে পারবে"}
                      </span>
                    </div>
                  </label>

                  {currentUser.role === "SUPERADMIN" && (
                    <label className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200 cursor-pointer hover:border-emerald-400 transition">
                      <input
                        type="checkbox"
                        checked={perms.canManageUsers}
                        onChange={(e) => setPerms({ ...perms, canManageUsers: e.target.checked })}
                        className="rounded text-emerald-700 focus:ring-emerald-500"
                      />
                      <div>
                        <span className="font-semibold block text-slate-900">সদস্য পরিচালনা (Manage Users)</span>
                        <span className="text-[10px] text-slate-500">কর্মী তৈরি ও পারমিশন কন্ট্রোল</span>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPermissionsUser(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm cursor-pointer"
                >
                  {isSubmitting ? "সংরক্ষণ হচ্ছে..." : "পারমিশন সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          )}

          {/* New User Registration Form */}
          {showAddForm && (
            <form onSubmit={handleCreateUser} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-800">নতুন অফিস কর্মীর তথ্য</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">নাম (Name)</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="উদা: মোঃ জসীম উদ্দিন"
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ইমেইল (Email)</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@company.com"
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">বিভাগ (Department)</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">পদবী (Designation)</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="MIS Specialist / Operations Lead"
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ভূমিকা (Role)</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="MEMBER">Member (Officer / Staff)</option>
                    <option value="MANAGER">Manager (Department Lead)</option>
                    <option value="ADMIN">Admin (Executive Admin)</option>
                    {currentUser.role === "SUPERADMIN" && (
                      <option value="SUPERADMIN">SuperAdmin (Full Access)</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">পাসওয়ার্ড</label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                  />
                </div>
              </div>

              {/* Checkbox permissions on user creation */}
              <div className="pt-2">
                <span className="block text-[11px] font-bold text-slate-700 mb-1">প্রাথমিক পারমিশন:</span>
                <div className="flex flex-wrap gap-2 text-xs">
                  <label className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perms.canCreateTask}
                      onChange={(e) => setPerms({ ...perms, canCreateTask: e.target.checked })}
                      className="rounded text-emerald-700"
                    />
                    <span>Can Create Task</span>
                  </label>
                  <label className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perms.canCompleteTask}
                      onChange={(e) => setPerms({ ...perms, canCompleteTask: e.target.checked })}
                      className="rounded text-emerald-700"
                    />
                    <span>Can Complete (✓)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perms.canAssignTask}
                      onChange={(e) => setPerms({ ...perms, canAssignTask: e.target.checked })}
                      className="rounded text-emerald-700"
                    />
                    <span>Can Assign Others</span>
                  </label>
                  <label className="flex items-center space-x-1.5 bg-white px-2 py-1 rounded border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={perms.canViewAllTasks}
                      onChange={(e) => setPerms({ ...perms, canViewAllTasks: e.target.checked })}
                      className="rounded text-emerald-700"
                    />
                    <span>View All Office Tasks</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm cursor-pointer"
                >
                  {isSubmitting ? "তৈরি হচ্ছে..." : "সদস্য সংরক্ষণ করুন"}
                </button>
              </div>
            </form>
          )}

          {/* Members Table with Department and Permissions */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-900 text-white font-semibold">
                <tr>
                  <th className="py-2.5 px-3">নাম ও পদবী</th>
                  <th className="py-2.5 px-3">বিভাগ (Department)</th>
                  <th className="py-2.5 px-3">সক্রিয় পারমিশন (Permissions)</th>
                  <th className="py-2.5 px-3 text-center">ভূমিকা (Role)</th>
                  {canManage && <th className="py-2.5 px-3 text-center">অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <span>{u.name}</span>
                        {u.role === "SUPERADMIN" && (
                          <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">{u.designation || "-"}</div>
                      <div className="text-[10px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Building2 className="w-3 h-3 text-emerald-700" />
                        {u.department || "Business Operations"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[280px]">
                        {u.canCreateTask && (
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[10px]">
                            Create
                          </span>
                        )}
                        {u.canCompleteTask && (
                          <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                            Complete ✓
                          </span>
                        )}
                        {u.canAssignTask && (
                          <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded text-[10px]">
                            Assign
                          </span>
                        )}
                        {u.canViewAllTasks ? (
                          <span className="bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded text-[10px] font-bold">
                            View All Office
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded text-[10px]">
                            Own & Assigned Only
                          </span>
                        )}
                        {u.canManageUsers && (
                          <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded text-[10px] font-bold">
                            Manage Users
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === "SUPERADMIN"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : u.role === "ADMIN"
                            ? "bg-purple-100 text-purple-800"
                            : u.role === "MANAGER"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    {canManage && (
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleOpenPermEdit(u)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-900 font-semibold rounded text-[11px] flex items-center space-x-1 mx-auto transition cursor-pointer"
                        >
                          <Settings2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>পারমিশন</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
