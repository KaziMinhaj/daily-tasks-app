// Utility for handling dates, Bangla numerals, Dhaka timezone, and sheets date formats
import { format, isPast, isToday, differenceInDays, parse, isValid } from "date-fns";

const bnDigits: { [key: string]: string } = {
  "0": "০", "1": "১", "2": "২", "3": "৩", "4": "৪",
  "5": "৫", "6": "৬", "7": "৭", "8": "৮", "9": "৯"
};

const enDigits: { [key: string]: string } = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9"
};

const bnMonths: { [key: string]: string } = {
  "জানুয়ারি": "Jan", "ফেব্রুয়ারি": "Feb", "মার্চ": "Mar", "এপ্রিল": "Apr",
  "মে": "May", "জুন": "Jun", "জুলাই": "Jul", "আগস্ট": "Aug",
  "সেপ্টেম্বর": "Sep", "অক্টোবর": "Oct", "নভেম্বর": "Nov", "ডিসেম্বর": "Dec"
};

const bnMonthNames = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];

export function toBengaliDigits(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return "";
  return String(input).replace(/[0-9]/g, (w) => bnDigits[w] || w);
}

export function toEnglishDigits(input: string | null | undefined): string {
  if (!input) return "";
  return input.replace(/[০-৯]/g, (w) => enDigits[w] || w);
}

export function isOngoingText(text: string | null | undefined): boolean {
  if (!text) return false;
  const normalized = text.trim().toLowerCase();
  return (
    normalized.includes("চলমান") ||
    normalized.includes("ongoing") ||
    normalized.includes("recurring") ||
    normalized.includes("প্রতি")
  );
}

/**
 * Robust date parser supporting English & Bangla date expressions:
 * - 27-Aug-2026, 27-August-2026
 * - 27/08/2026, 27-08-2026, 2026-08-27
 * - ৩/৯/২৬, ২৭-আগস্ট-২০২৬
 */
export function parseSheetDate(rawDateStr: string | null | undefined): { date: Date | null; isOngoing: boolean } {
  if (!rawDateStr) return { date: null, isOngoing: false };
  const str = rawDateStr.trim();

  if (isOngoingText(str)) {
    return { date: null, isOngoing: true };
  }

  // Convert any Bengali numerals to English digits
  let normalized = toEnglishDigits(str);

  // Replace Bengali month names if present
  for (const [bnMonth, enMonth] of Object.entries(bnMonths)) {
    if (normalized.includes(bnMonth)) {
      normalized = normalized.replace(bnMonth, enMonth);
    }
  }

  // Try standard Date constructor first (handles ISO strings and standard formats)
  const d1 = new Date(normalized);
  if (isValid(d1) && !isNaN(d1.getTime()) && normalized.length >= 8 && !/^\d+$/.test(normalized)) {
    return { date: d1, isOngoing: false };
  }

  // Try common custom formats
  const candidateFormats = [
    "dd-MMM-yyyy",
    "d-MMM-yyyy",
    "dd-MMMM-yyyy",
    "dd/MM/yyyy",
    "d/M/yyyy",
    "dd-MM-yyyy",
    "d-M-yyyy",
    "yyyy-MM-dd",
    "d/M/yy",
    "dd/MM/yy"
  ];

  for (const fmt of candidateFormats) {
    try {
      const parsed = parse(normalized, fmt, new Date());
      if (isValid(parsed) && !isNaN(parsed.getTime())) {
        return { date: parsed, isOngoing: false };
      }
    } catch {
      // Continue next format
    }
  }

  return { date: null, isOngoing: false };
}

export function formatDate(
  date: Date | string | null | undefined,
  locale: "en" | "bn" = "en",
  showTime = false
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d) || isNaN(d.getTime())) return "";

  if (locale === "bn") {
    const day = toBengaliDigits(format(d, "dd"));
    const month = bnMonthNames[d.getMonth()];
    const year = toBengaliDigits(format(d, "yyyy"));
    if (showTime) {
      const timeStr = toBengaliDigits(format(d, "hh:mm a"));
      return `${day} ${month}, ${year} (${timeStr})`;
    }
    return `${day} ${month}, ${year}`;
  }

  const fmt = showTime ? "dd MMM, yyyy (hh:mm a)" : "dd MMM, yyyy";
  return format(d, fmt);
}

export function getDateStatus(
  dueDate: Date | string | null | undefined,
  status: string
): { isOverdue: boolean; isDueSoon: boolean; daysRemaining: number | null } {
  if (!dueDate || status === "DONE") {
    return { isOverdue: false, isDueSoon: false, daysRemaining: null };
  }

  const d = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  if (!isValid(d) || isNaN(d.getTime())) {
    return { isOverdue: false, isDueSoon: false, daysRemaining: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);

  const diffDays = differenceInDays(target, today);

  if (diffDays < 0) {
    return { isOverdue: true, isDueSoon: false, daysRemaining: diffDays };
  }
  if (diffDays <= 3) {
    return { isOverdue: false, isDueSoon: true, daysRemaining: diffDays };
  }

  return { isOverdue: false, isDueSoon: false, daysRemaining: diffDays };
}
