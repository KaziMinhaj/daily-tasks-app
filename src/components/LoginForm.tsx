"use client";

import React, { useState } from "react";
import { Locale, translations } from "@/lib/i18n";
import {
  FileSpreadsheet,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

interface LoginFormProps {
  onLoginSuccess: (user: any) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onLoginSuccess,
  locale,
  setLocale,
}) => {
  const t = translations[locale];
  const [view, setView] = useState<"LOGIN" | "FORGOT_PASSWORD">("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (res.ok) {
        onLoginSuccess(data.user);
      } else {
        setErrorMessage(data.error || "Login failed. Please check your credentials.");
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), locale }),
      });

      const data = await res.json();
      if (res.ok) {
        setResetSent(true);
      } else {
        setErrorMessage(data.error || "Failed to send reset link. Please try again.");
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-emerald-50/40 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Card Header */}
        <div className="bg-slate-900 text-white p-6 text-center relative border-b border-slate-800">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-500/20">
            {view === "LOGIN" ? (
              <FileSpreadsheet className="w-6 h-6 text-white" />
            ) : (
              <KeyRound className="w-6 h-6 text-white" />
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            {view === "LOGIN" ? t.loginTitle : t.forgotPasswordTitle}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {view === "LOGIN" ? t.loginSubtitle : t.forgotPasswordSubtitle}
          </p>

          <button
            onClick={() => setLocale(locale === "en" ? "bn" : "en")}
            className="absolute top-4 right-4 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 cursor-pointer transition"
          >
            {locale === "en" ? "বাংলা" : "English"}
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {view === "LOGIN" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.email}</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full min-h-[44px] text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">{t.password}</label>
                  <button
                    type="button"
                    onClick={() => {
                      setView("FORGOT_PASSWORD");
                      setErrorMessage(null);
                      setResetSent(false);
                    }}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                  >
                    {t.forgotPassword}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] text-sm pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer transition"
                    title={
                      showPassword
                        ? locale === "bn"
                          ? "পাসওয়ার্ড লুকান"
                          : "Hide password"
                        : locale === "bn"
                        ? "পাসওয়ার্ড দেখুন"
                        : "Show password"
                    }
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm shadow-emerald-600/20 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? (locale === "bn" ? "লগইন হচ্ছে..." : "Logging in...") : t.loginButton}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* Forgot Password View */
            <div className="space-y-4">
              {resetSent ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-2">
                    <div className="flex items-center space-x-2 font-bold text-sm text-emerald-900">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>{t.resetLinkSentTitle}</span>
                    </div>
                    <p className="leading-relaxed text-slate-700">{t.resetLinkSentDesc}</p>
                    <p className="text-[11px] font-mono text-emerald-800 bg-emerald-100/60 p-1.5 rounded-lg">
                      {email}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setView("LOGIN");
                        setResetSent(false);
                      }}
                      className="w-full min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm shadow-emerald-600/20 transition flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>{t.backToLogin}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setResetSent(false)}
                      className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer text-center"
                    >
                      {locale === "bn" ? "ভিন্ন ইমেইল ব্যবহার করবেন?" : "Use a different email?"}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">{t.email}</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full min-h-[44px] text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full min-h-[44px] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm shadow-emerald-600/20 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                  >
                    <span>{isLoading ? t.sendingResetLink : t.sendResetLink}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setView("LOGIN");
                      setErrorMessage(null);
                    }}
                    className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{t.backToLogin}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
