"use client";

import React from "react";
import { NotificationItem } from "@/types";
import { Locale, translations } from "@/lib/i18n";
import { formatDate } from "@/lib/date-utils";
import { useDrawerDismiss } from "@/lib/use-drawer-dismiss";
import { Bell, X, CheckCheck, AlertCircle, MessageSquare, CheckCircle2 } from "lucide-react";

interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  locale: Locale;
  onMarkAllRead: () => void;
  onSelectNotification: (link?: string | null) => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({
  isOpen,
  onClose,
  notifications,
  locale,
  onMarkAllRead,
  onSelectNotification,
}) => {
  const t = translations[locale];

  useDrawerDismiss({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-150 cursor-pointer"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-150 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-white">{t.navNotifications}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            {notifications.filter((n) => !n.isRead).length} Unread Alerts
          </span>
          <button
            onClick={onMarkAllRead}
            className="min-h-[40px] px-2 flex items-center space-x-1.5 text-emerald-700 hover:text-emerald-900 font-bold transition cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {notifications.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">কোনো নোটিফিকেশন নেই</p>
          ) : (
            notifications.map((n) => {
              let Icon = Bell;
              let iconColor = "text-slate-500 bg-slate-100";
              if (n.type === "TASK_OVERDUE") {
                Icon = AlertCircle;
                iconColor = "text-red-600 bg-red-100";
              } else if (n.type === "TASK_ASSIGNED") {
                Icon = CheckCircle2;
                iconColor = "text-emerald-600 bg-emerald-100";
              } else if (n.type === "COMMENT_ADDED") {
                Icon = MessageSquare;
                iconColor = "text-blue-600 bg-blue-100";
              }

              return (
                <div
                  key={n.id}
                  onClick={() => onSelectNotification(n.link)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                    !n.isRead
                      ? "bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100/50"
                      : "bg-white border-slate-100 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start space-x-2.5">
                    <div className={`p-1.5 rounded-md shrink-0 ${iconColor}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 leading-snug">{n.title}</h4>
                      <p className="text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {formatDate(n.createdAt, locale, true)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
