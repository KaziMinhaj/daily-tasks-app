"use client";

import React, { useEffect, useState } from "react";
import { DashboardStats, User, UserProductivityMetrics, OFFICE_DEPARTMENTS } from "@/types";
import { Locale, translations } from "@/lib/i18n";
import { toBengaliDigits } from "@/lib/date-utils";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  Users,
  RefreshCw,
  Award,
  BarChart3,
  Building2,
  Zap,
  Timer,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";

interface DashboardViewProps {
  locale: Locale;
  currentUser: User;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ locale, currentUser }) => {
  const t = translations[locale];
  const [data, setData] = useState<{
    stats: DashboardStats;
    statusChart: any[];
    departmentChart: any[];
    userProductivity: UserProductivityMetrics[];
    trendData: any[];
  } | null>(null);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center space-y-2">
          <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">লোড হচ্ছে... Loading productivity dashboard...</p>
        </div>
      </div>
    );
  }

  const { stats, statusChart, departmentChart, userProductivity, trendData } = data;

  const filteredProductivity = userProductivity.filter((u) => {
    if (selectedDeptFilter === "ALL") return true;
    return u.department === selectedDeptFilter;
  });

  const statCards = [
    {
      label: "মোট অফিস টাস্ক (Total)",
      value: stats.total,
      color: "border-slate-300 text-slate-900 bg-white",
      icon: BarChart3,
      iconColor: "text-slate-600 bg-slate-100",
    },
    {
      label: "সম্পন্ন কাজ (Completed)",
      value: stats.done,
      color: "border-emerald-300 text-emerald-950 bg-emerald-50/50",
      icon: CheckCircle2,
      iconColor: "text-emerald-700 bg-emerald-100",
    },
    {
      label: "চলমান ও মুলতুবি (Pending)",
      value: stats.pending + stats.inProgress,
      color: "border-amber-300 text-amber-950 bg-amber-50/50",
      icon: Clock,
      iconColor: "text-amber-700 bg-amber-100",
    },
    {
      label: "মেয়াদোত্তীর্ণ (Overdue)",
      value: stats.overdue,
      color: "border-red-300 text-red-950 bg-red-50/50",
      icon: AlertCircle,
      iconColor: "text-red-700 bg-red-100",
    },
    {
      label: "সামগ্রিক সম্পন্নের হার",
      value: `${stats.completionRate}%`,
      color: "border-blue-300 text-blue-950 bg-blue-50/50",
      icon: TrendingUp,
      iconColor: "text-blue-700 bg-blue-100",
    },
    {
      label: "আজকের নির্ধারিত (Due Today)",
      value: stats.dueToday,
      color: "border-teal-300 text-teal-950 bg-teal-50/50",
      icon: Calendar,
      iconColor: "text-teal-700 bg-teal-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border shadow-xs flex flex-col justify-between ${card.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 truncate">{card.label}</span>
                <div className={`p-1.5 rounded-lg ${card.iconColor}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold tracking-tight">
                  {locale === "bn" && typeof card.value === "number"
                    ? toBengaliDigits(card.value)
                    : card.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section: Department Distribution & Completion Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department-wise Task Load */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-700" />
            বিভাগ অনুযায়ী কাজের বণ্টন ও অগ্রগতি (Department Task Breakdown)
          </h3>
          <p className="text-xs text-slate-400 mb-4">অফিসের বিভিন্ন ডিপার্টমেন্টের কাজের মোট পরিমাণ ও সম্পন্নের হার</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentChart} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="department"
                  tick={{ fontSize: 10 }}
                  stroke="#64748b"
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    color: "#fff",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="total" name="Total Tasks" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7-Day Completion Trend */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <h3 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-700" />
            গত ৭ দিনের সামগ্রিক অগ্রগতি (Office Productivity Trend)
          </h3>
          <p className="text-xs text-slate-400 mb-4">দৈনিক তৈরিকৃত বনাম সমাপ্ত কাজের তুলনামূলক গ্রাফ</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey={locale === "bn" ? "dateBn" : "date"}
                  tick={{ fontSize: 11 }}
                  stroke="#64748b"
                />
                <YAxis tick={{ fontSize: 11 }} stroke="#64748b" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    color: "#fff",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name={t.completedTasks}
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="created"
                  name="Created"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Comprehensive Employee Productivity & Scorecard Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />
              কর্মীদের ব্যক্তিগত উৎপাদনশীলতা ও স্কোরকার্ড (Employee Productivity Scorecard)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              সময়মতো কাজ শেষ করার হার, সম্পন্নের অনুপাত ও সামগ্রিক পারফরম্যান্স স্কোর
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-600 font-medium">বিভাগ ফিল্টার:</span>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700"
            >
              <option value="ALL">সকল বিভাগ (All)</option>
              {OFFICE_DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-semibold">
              <tr>
                <th className="py-3 px-4">কর্মীর নাম ও পদবী</th>
                <th className="py-3 px-3">বিভাগ (Department)</th>
                <th className="py-3 px-3 text-center">বরাদ্দকৃত কাজ</th>
                <th className="py-3 px-3 text-center">সম্পন্ন</th>
                <th className="py-3 px-3 text-center">সময়মতো সম্পন্ন</th>
                <th className="py-3 px-3 text-center">বাকি / মেয়াদোত্তীর্ণ</th>
                <th className="py-3 px-3 text-center">গড় সমাপ্তি সময়</th>
                <th className="py-3 px-4">উৎপাদনশীলতা স্কোর (Productivity)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
              {filteredProductivity.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                    এই বিভাগে কোনো কর্মী পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredProductivity.map((u) => {
                  let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                  let barColor = "bg-slate-500";
                  if (u.productivityScore >= 80) {
                    badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold";
                    barColor = "bg-emerald-600";
                  } else if (u.productivityScore >= 65) {
                    badgeColor = "bg-blue-50 text-blue-800 border-blue-300 font-bold";
                    barColor = "bg-blue-600";
                  } else if (u.productivityScore >= 45) {
                    badgeColor = "bg-amber-50 text-amber-800 border-amber-300 font-semibold";
                    barColor = "bg-amber-500";
                  } else {
                    badgeColor = "bg-red-50 text-red-800 border-red-300 font-bold";
                    barColor = "bg-red-500";
                  }

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-400">{u.designation}</div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {u.department}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-bold">
                        {locale === "bn" ? toBengaliDigits(u.totalAssigned) : u.totalAssigned}
                      </td>

                      <td className="py-3 px-3 text-center text-emerald-700 font-bold">
                        {locale === "bn" ? toBengaliDigits(u.completed) : u.completed}
                      </td>

                      <td className="py-3 px-3 text-center text-teal-700 font-medium">
                        {locale === "bn" ? toBengaliDigits(u.completedOnTime) : u.completedOnTime}
                        <span className="text-[10px] text-slate-400 block">
                          ({locale === "bn" ? toBengaliDigits(u.onTimeRate) : u.onTimeRate}%)
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center font-bold">
                        {u.overdue > 0 ? (
                          <span className="text-red-600">
                            {locale === "bn" ? toBengaliDigits(u.overdue) : u.overdue} overdue
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            {locale === "bn" ? toBengaliDigits(u.pending) : u.pending} pending
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center text-slate-600">
                        {u.completed > 0 ? (
                          <span className="inline-flex items-center gap-0.5 font-medium text-[11px]">
                            <Timer className="w-3 h-3 text-slate-400" />
                            {locale === "bn"
                              ? `${toBengaliDigits(u.avgTurnaroundHours)} ঘণ্টা`
                              : `${u.avgTurnaroundHours} hrs`}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded text-[10px] border ${badgeColor}`}>
                              {locale === "bn" ? u.performanceGradeBn : u.performanceGrade}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {locale === "bn"
                                ? toBengaliDigits(u.productivityScore)
                                : u.productivityScore}
                              /100
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${barColor}`}
                              style={{ width: `${u.productivityScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Scorecard Card Stack View */}
        <div className="block md:hidden divide-y divide-slate-100">
          {filteredProductivity.length === 0 ? (
            <div className="py-8 text-center text-slate-400 italic text-xs">
              এই বিভাগে কোনো কর্মী পাওয়া যায়নি
            </div>
          ) : (
            filteredProductivity.map((u) => {
              let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
              let barColor = "bg-slate-500";
              if (u.productivityScore >= 80) {
                badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold";
                barColor = "bg-emerald-600";
              } else if (u.productivityScore >= 65) {
                badgeColor = "bg-blue-50 text-blue-800 border-blue-300 font-bold";
                barColor = "bg-blue-600";
              } else if (u.productivityScore >= 45) {
                badgeColor = "bg-amber-50 text-amber-800 border-amber-300 font-semibold";
                barColor = "bg-amber-500";
              } else {
                badgeColor = "bg-red-50 text-red-800 border-red-300 font-bold";
                barColor = "bg-red-500";
              }

              return (
                <div key={u.id} className="p-4 space-y-3 bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{u.name}</div>
                      <div className="text-xs text-slate-400">{u.designation}</div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {u.department}
                    </span>
                  </div>

                  {/* Score & Bar */}
                  <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${badgeColor}`}>
                        {locale === "bn" ? u.performanceGradeBn : u.performanceGrade}
                      </span>
                      <span className="font-bold text-slate-800">
                        উৎপাদনশীলতা: {locale === "bn" ? toBengaliDigits(u.productivityScore) : u.productivityScore} / 100
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${u.productivityScore}%` }}
                      />
                    </div>
                  </div>

                  {/* 4 Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">বরাদ্দকৃত</span>
                      <span className="font-bold text-slate-800">
                        {locale === "bn" ? toBengaliDigits(u.totalAssigned) : u.totalAssigned}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                      <span className="text-[10px] text-emerald-600 block">সম্পন্ন</span>
                      <span className="font-bold text-emerald-800">
                        {locale === "bn" ? toBengaliDigits(u.completed) : u.completed}
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-teal-50 border border-teal-100">
                      <span className="text-[10px] text-teal-600 block">সময়মতো</span>
                      <span className="font-bold text-teal-800">
                        {locale === "bn" ? toBengaliDigits(u.onTimeRate) : u.onTimeRate}%
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">বাকি/মেয়াদ</span>
                      <span className={`font-bold ${u.overdue > 0 ? "text-red-600" : "text-slate-600"}`}>
                        {locale === "bn" ? toBengaliDigits(u.overdue > 0 ? u.overdue : u.pending) : (u.overdue > 0 ? u.overdue : u.pending)}
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
