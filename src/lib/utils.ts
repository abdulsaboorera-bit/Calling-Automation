import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import mongoose from "mongoose";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toObjectId(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");

  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }

  if (cleaned.startsWith("0") && cleaned.length === 11) {
    cleaned = "+92" + cleaned.slice(1);
  }

  if (cleaned.startsWith("92") && !cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }

  if (!cleaned.startsWith("+") && cleaned.length === 10) {
    cleaned = "+92" + cleaned;
  }

  return cleaned;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

export function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case "positive":
      return "text-emerald-600 bg-emerald-50";
    case "neutral":
      return "text-amber-600 bg-amber-50";
    case "negative":
      return "text-red-600 bg-red-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "running":
      return "text-blue-600 bg-blue-50";
    case "completed":
      return "text-emerald-600 bg-emerald-50";
    case "paused":
      return "text-amber-600 bg-amber-50";
    case "failed":
      return "text-red-600 bg-red-50";
    case "cancelled":
      return "text-gray-600 bg-gray-50";
    case "draft":
      return "text-purple-600 bg-purple-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

export function getCallStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "text-emerald-600 bg-emerald-50";
    case "in_progress":
    case "ringing":
    case "answered":
      return "text-blue-600 bg-blue-50";
    case "no_answer":
      return "text-amber-600 bg-amber-50";
    case "busy":
      return "text-orange-600 bg-orange-50";
    case "voicemail":
      return "text-purple-600 bg-purple-50";
    case "failed":
      return "text-red-600 bg-red-50";
    case "do_not_call":
      return "text-gray-600 bg-gray-100";
    default:
      return "text-gray-600 bg-gray-50";
  }
}
