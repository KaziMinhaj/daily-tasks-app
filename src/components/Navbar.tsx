"use client";

import React, { useState } from "react";
import { User, NotificationItem } from "@/types";
import { Locale, translations } from "@/lib/i18n";
import { useDrawerDismiss } from "@/lib/use-drawer-dismiss";
import {
  Table2,
  Kanban,
  CalendarDays,
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  Bell,
  LogOut,
  Globe,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

interface NavbarProps {
  user: User;
  activeTab: "table" | "kanban" | "calendar" | "dashboard" | "team";
  setActiveTab: (tab: "table" | "kanban" | "calendar" | "dashboard" | "team") => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  onLogout: () => void;
  notifications: NotificationItem[];
  onOpenNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  locale,
  setLocale,
  onLogout,
  notifications,
  onOpenNotifications,
}) => {
  const t = translations[locale];
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useDrawerDismiss({
    isOpen: isMobileMenuOpen,
    onClose: () => setIsMobileMenuOpen(false),
  });

  const navItems = [
    { id: "table", label: t.navTasks, icon: Table2 },
    { id: "kanban", label: t.navKanban, icon: Kanban },
    { id: "calendar", label: t.navCalendar, icon: CalendarDays },
    {
      id: "dashboard",
      label: locale === "bn" ? "ড্যাশবোর্ড ও অ্যানালিটিক্স" : "Productivity & Stats",
      icon: LayoutDashboard,
    },
    {
      id: "team",
      label: locale === "bn" ? "টিম ও রোলস" : "Office Team & Roles",
      icon: Users,
    },
  ] as const;

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand Title */}
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-900/40 shrink-0">
                <FileSpreadsheet className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate flex items-center gap-1.5">
                    {locale === "bn" ? "অফিস টাস্ক ও অ্যাক্টিভিটি ট্র্যাকার" : "Daily Tasks & Activities"}
                    <span className="hidden sm:inline-flex text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                      Enterprise
                    </span>
                  </h1>
                </div>
                <p className="text-[11px] text-slate-400 hidden md:block truncate">
                  {locale === "bn"
                    ? "সকল ডিপার্টমেন্টের কার্যক্রম ও উৎপাদনশীলতা ব্যবস্থাপনা"
                    : "Workforce activities & team productivity tracker"}
                </p>
              </div>
            </div>

            {/* Desktop Right Action Tools */}
            <div className="flex items-center space-x-1.5 sm:space-x-3">
              {/* Language Switcher */}
              <button
                onClick={() => setLocale(locale === "en" ? "bn" : "en")}
                className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 min-h-[38px] sm:min-h-[40px] rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-xs font-semibold text-slate-200 transition border border-slate-700/60 cursor-pointer active:scale-95"
                title="Toggle Language"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs">{locale === "en" ? "বাংলা" : "EN"}</span>
              </button>

              {/* Notifications Button */}
              <button
                onClick={onOpenNotifications}
                className="relative p-2 min-w-[38px] min-h-[38px] sm:min-w-[40px] sm:min-h-[40px] rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 transition border border-slate-700/60 flex items-center justify-center cursor-pointer active:scale-95"
                title={t.navNotifications}
                aria-label="Open notifications"
              >
                <Bell className="w-4 h-4 text-slate-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* User Profile Pill (Desktop) */}
              <div className="hidden md:flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-700 to-indigo-600 border border-slate-700 flex items-center justify-center font-bold text-xs text-white shadow-xs">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="text-left text-xs max-w-[130px]">
                  <div className="font-semibold text-white truncate flex items-center gap-1">
                    <span className="truncate">{user.name}</span>
                    {user.role === "SUPERADMIN" && (
                      <span className="text-[9px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1 py-0.2 rounded font-bold uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {user.department || user.designation || user.role}
                  </div>
                </div>
              </div>

              {/* Logout (Desktop) */}
              <button
                onClick={onLogout}
                className="hidden md:flex p-2 rounded-lg hover:bg-rose-900/40 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                title={t.navLogout}
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Hamburger Toggle Button (min 44px touch target) */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2.5 min-w-[44px] min-h-[44px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center cursor-pointer active:scale-95"
                aria-label="Toggle mobile navigation menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-rose-400" />
                ) : (
                  <Menu className="w-5 h-5 text-emerald-400" />
                )}
              </button>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex space-x-1.5 overflow-x-auto pb-1.5 pt-0.5 border-t border-slate-800/80">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Dropdown Drawer Menu & Backdrop */}
        {isMobileMenuOpen && (
          <>
            {/* Click-outside backdrop */}
            <div
              className="md:hidden fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div
              className="md:hidden relative z-50 border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-5 space-y-3 shadow-2xl animate-in slide-in-from-top-3 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
            {/* User Info Strip on Mobile */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/70 border border-slate-700/60 mb-2">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">{user.name}</p>
                  <p className="text-[11px] text-emerald-400">
                    {user.department || user.designation || user.role}
                  </p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200 bg-rose-950/60 border border-rose-800/50 px-2.5 py-1.5 rounded-lg font-medium cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.navLogout}</span>
              </button>
            </div>

            {/* Navigation links with comfortable 44px min-height touch targets */}
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-3.5 min-h-[44px] rounded-xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span className="flex-1 text-left text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
      </header>

      {/* Mobile Bottom Navigation Bar (Ultra-Convenient 1-Thumb Switching on Handsets) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl px-2 py-1 flex items-center justify-around">
        {[
          { id: "table", label: t.navTasks, icon: Table2 },
          { id: "kanban", label: t.navKanban, icon: Kanban },
          { id: "calendar", label: t.navCalendar, icon: CalendarDays },
          { id: "dashboard", label: locale === "bn" ? "ড্যাশবোর্ড" : "Stats", icon: LayoutDashboard },
          { id: "team", label: locale === "bn" ? "টিম" : "Team", icon: Users },
        ].map((tabItem) => {
          const Icon = tabItem.icon;
          const isActive = activeTab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              onClick={() => {
                setActiveTab(tabItem.id as any);
                setIsMobileMenuOpen(false);
              }}
              className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-1 rounded-xl transition cursor-pointer ${
                isActive ? "text-emerald-700 font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <div
                className={`p-1 rounded-lg transition ${
                  isActive ? "bg-emerald-100 text-emerald-800" : ""
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[64px]">
                {tabItem.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
