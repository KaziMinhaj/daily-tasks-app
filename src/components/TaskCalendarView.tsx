"use client";

import React, { useState } from "react";
import { Task } from "@/types";
import { Locale, translations } from "@/lib/i18n";
import { formatDate, toBengaliDigits } from "@/lib/date-utils";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
} from "date-fns";
import { ChevronLeft, ChevronRight, RefreshCw, Star, Calendar as CalendarIcon } from "lucide-react";

interface TaskCalendarViewProps {
  tasks: Task[];
  locale: Locale;
  onOpenTaskDetails: (task: Task) => void;
}

export const TaskCalendarView: React.FC<TaskCalendarViewProps> = ({
  tasks,
  locale,
  onOpenTaskDetails,
}) => {
  const t = translations[locale];
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Ongoing tasks without fixed deadline
  const ongoingTasks = tasks.filter((t) => t.taskType === "ONGOING" || !t.dueDate);

  // Generate calendar days
  const rows = [];
  let days = [];
  let day = startDate;

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      const cloneDay = day;
      const dayTasks = tasks.filter(
        (task) => task.dueDate && isSameDay(new Date(task.dueDate), cloneDay)
      );

      const isCurrentMonth = isSameMonth(cloneDay, monthStart);
      const isToday = isSameDay(cloneDay, new Date());

      days.push(
        <div
          key={cloneDay.toISOString()}
          className={`min-h-[110px] p-2 border border-slate-200 transition-colors flex flex-col ${
            !isCurrentMonth ? "bg-slate-50/50 text-slate-400" : "bg-white"
          } ${isToday ? "ring-2 ring-emerald-500 bg-emerald-50/20" : ""}`}
        >
          {/* Day number header */}
          <div className="flex justify-between items-center mb-1">
            <span
              className={`text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center ${
                isToday ? "bg-emerald-700 text-white font-bold" : "text-slate-700"
              }`}
            >
              {locale === "bn" ? toBengaliDigits(format(cloneDay, "d")) : format(cloneDay, "d")}
            </span>
            {dayTasks.length > 0 && (
              <span className="text-[10px] text-slate-400 font-medium">
                {dayTasks.length} {locale === "bn" ? "টি" : "tasks"}
              </span>
            )}
          </div>

          {/* Tasks list */}
          <div className="space-y-1 overflow-y-auto max-h-[85px] pr-0.5">
            {dayTasks.map((tItem) => (
              <div
                key={tItem.id}
                onClick={() => onOpenTaskDetails(tItem)}
                className={`text-[11px] p-1 rounded font-medium truncate cursor-pointer transition flex items-center justify-between ${
                  tItem.status === "DONE"
                    ? "bg-slate-100 text-slate-500 line-through"
                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200"
                }`}
                title={tItem.title}
              >
                <span className="truncate">{tItem.title}</span>
                {tItem.priority ? (
                  <span className="text-[9px] text-amber-700 font-bold ml-1">⭐{tItem.priority}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div key={day.toISOString()} className="grid grid-cols-7 gap-px">
        {days}
      </div>
    );
    days = [];
  }

  const weekDayLabels =
    locale === "bn"
      ? ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      {/* Ongoing Tasks Tray at Top */}
      {ongoingTasks.length > 0 && (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center space-x-2 mb-3">
            <RefreshCw className="w-4 h-4 text-emerald-700 animate-spin-slow" />
            <h3 className="font-bold text-xs text-emerald-900 uppercase tracking-wide">
              {t.ongoingBadge} (চলমান কাজসমূহ - কোনো নির্দিষ্ট শেষ তারিখ নেই)
            </h3>
            <span className="bg-emerald-200 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {ongoingTasks.length}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {ongoingTasks.map((oTask) => (
              <div
                key={oTask.id}
                onClick={() => onOpenTaskDetails(oTask)}
                className="bg-white p-2.5 rounded-lg border border-emerald-200 shadow-xs hover:shadow-sm cursor-pointer transition flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-emerald-700">চলমান</span>
                  {oTask.priority && (
                    <span className="text-[10px] text-amber-700 font-bold">⭐ {oTask.priority}</span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-900 line-clamp-1">{oTask.title}</p>
                {oTask.remarks && (
                  <p className="text-[10px] text-slate-500 truncate mt-1">{oTask.remarks}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Calendar View */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-slate-800">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={prevMonth}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="min-h-[44px] px-4 text-xs font-bold rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
            >
              {locale === "bn" ? "আজ" : "Today"}
            </button>
            <button
              onClick={nextMonth}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Container for small screens */}
        <div className="overflow-x-auto">
          <div className="min-w-[620px] sm:min-w-0">
            {/* Weekday Names */}
            <div className="grid grid-cols-7 text-center border-b border-slate-200 pb-2 mb-1">
              {weekDayLabels.map((dayName, idx) => (
                <div
                  key={idx}
                  className="text-xs font-bold text-slate-600 uppercase tracking-wider"
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">{rows}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
