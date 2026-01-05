import { NextRequest } from "next/server";

type LogLevel = "info" | "warn" | "error";

interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  status?: number;
  duration?: number;
  error?: string;
  ip?: string;
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function formatLog(level: LogLevel, log: RequestLog): string {
  const prefix = `[${log.timestamp}] [${level.toUpperCase()}]`;
  const base = `${prefix} ${log.method} ${log.path}`;

  const parts = [base];
  if (log.status) parts.push(`status=${log.status}`);
  if (log.duration !== undefined) parts.push(`duration=${log.duration}ms`);
  if (log.ip) parts.push(`ip=${log.ip}`);
  if (log.error) parts.push(`error="${log.error}"`);

  return parts.join(" ");
}

export function logRequest(
  request: NextRequest,
  status: number,
  startTime: number,
  error?: string
): void {
  const duration = Date.now() - startTime;
  const log: RequestLog = {
    timestamp: new Date().toISOString(),
    method: request.method,
    path: request.nextUrl.pathname,
    status,
    duration,
    ip: getClientIP(request),
    error,
  };

  const level: LogLevel =
    status >= 500 ? "error" : status >= 400 ? "warn" : "info";
  console.log(formatLog(level, log));
}
