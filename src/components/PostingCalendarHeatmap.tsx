"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatNumber } from "@/lib/utils";

type PostActivity = {
  date: string;
  count: number;
  views: number;
  posts: Array<{
    title: string;
    views: number;
    clipperName: string;
    platform: string;
  }>;
};

type ClipperGroup = {
  clipperGroup: string;
  totalViews: number;
  postCount: number;
};

type Props = {
  fromDate: string | null;
  toDate: string | null;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function PostingCalendarHeatmap({ fromDate, toDate }: Props) {
  const [activityData, setActivityData] = useState<Record<string, PostActivity>>({});
  const [clipperGroups, setClipperGroups] = useState<ClipperGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<PostActivity | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Current month navigation
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // Fetch clipper groups for filter dropdown
  useEffect(() => {
    const fetchClipperGroups = async () => {
      try {
        const res = await fetch("/api/clippers?grouped=true");
        if (res.ok) {
          const data = await res.json();
          setClipperGroups(data);
        }
      } catch (error) {
        console.error("Failed to fetch clipper groups:", error);
      }
    };
    fetchClipperGroups();
  }, []);

  // Fetch activity data
  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);
        if (selectedGroup !== "all") params.set("clipperGroup", selectedGroup);

        const res = await fetch(`/api/activity?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setActivityData(data.activity);
        }
      } catch (error) {
        console.error("Failed to fetch activity:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [fromDate, toDate, selectedGroup]);

  // Generate days for the current selected month
  const currentMonthDays = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days: Array<{ date: string; dayOfWeek: number; dayOfMonth: number; isFuture: boolean }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isFuture = date > today;
      days.push({
        date: date.toISOString().split("T")[0],
        dayOfWeek: date.getDay(),
        dayOfMonth: day,
        isFuture,
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Generate month options for dropdown (last 24 months)
  const monthOptions = useMemo(() => {
    const options: Array<{ year: number; month: number; label: string }> = [];
    for (let i = 0; i < 24; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      options.push({
        year: date.getFullYear(),
        month: date.getMonth(),
        label: `${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
      });
    }
    return options;
  }, []);

  // Navigation handlers
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();
    if (isCurrentMonth) return; // Don't go past current month

    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleMonthSelect = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();

  // Calculate max count for color scaling
  const maxCount = useMemo(() => {
    return Math.max(1, ...Object.values(activityData).map(d => d.count));
  }, [activityData]);

  // Get color intensity based on count (red → white → green)
  const getColor = (count: number, isFuture: boolean = false) => {
    if (isFuture) return "bg-zinc-50 dark:bg-zinc-900/50";
    if (count === 0) return "bg-zinc-100 dark:bg-zinc-800/50";
    const intensity = Math.min(count / Math.max(maxCount * 0.6, 1), 1);
    // Red (few) → White (medium) → Green (many)
    if (intensity < 0.2) return "bg-red-100 dark:bg-red-900/40";
    if (intensity < 0.4) return "bg-red-50 dark:bg-red-800/30";
    if (intensity < 0.6) return "bg-slate-50 dark:bg-slate-700/40";
    if (intensity < 0.8) return "bg-emerald-50 dark:bg-emerald-800/30";
    return "bg-emerald-100 dark:bg-emerald-700/40";
  };

  // Get text color based on background
  const getTextColor = (count: number, isFuture: boolean = false) => {
    if (isFuture) return "text-zinc-300 dark:text-zinc-600";
    if (count === 0) return "text-zinc-400 dark:text-zinc-500";
    const intensity = Math.min(count / Math.max(maxCount * 0.6, 1), 1);
    if (intensity < 0.2) return "text-red-700 dark:text-red-300";
    if (intensity < 0.4) return "text-red-600 dark:text-red-400";
    if (intensity < 0.6) return "text-slate-600 dark:text-slate-300";
    if (intensity < 0.8) return "text-emerald-600 dark:text-emerald-400";
    return "text-emerald-700 dark:text-emerald-300";
  };

  // Calculate stats
  const stats = useMemo(() => {
    const values = Object.values(activityData);
    const totalPosts = values.reduce((sum, d) => sum + d.count, 0);
    const totalViews = values.reduce((sum, d) => sum + d.views, 0);
    const activeDays = values.filter(d => d.count > 0).length;
    const maxDay = values.reduce((max, d) => d.count > max.count ? d : max, { count: 0, date: "", views: 0, posts: [] });

    // Calculate streak
    let currentStreak = 0;
    const sortedDates = Object.keys(activityData).sort().reverse();

    for (const date of sortedDates) {
      if (activityData[date].count > 0) {
        currentStreak++;
      } else {
        break;
      }
    }

    return { totalPosts, totalViews, activeDays, maxDay, currentStreak };
  }, [activityData]);

  const handleMouseEnter = (e: React.MouseEvent, day: PostActivity | undefined, dateStr: string) => {
    const activity = day || { date: dateStr, count: 0, views: 0, posts: [] };
    setHoveredDay(activity);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <p className="text-zinc-500 text-center">Loading activity data...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Posting Activity</h2>
          <p className="text-sm text-zinc-500">Daily posting frequency over the last year</p>
        </div>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
        >
          <option value="all">All Clippers</option>
          {clipperGroups.map((group) => (
            <option key={group.clipperGroup} value={group.clipperGroup}>
              {group.clipperGroup}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <p className="text-sm text-zinc-500">Total Posts</p>
          <p className="text-xl font-bold">{stats.totalPosts}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500">Total Views</p>
          <p className="text-xl font-bold">{formatNumber(stats.totalViews)}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500">Active Days</p>
          <p className="text-xl font-bold">{stats.activeDays}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500">Current Streak</p>
          <p className="text-xl font-bold">{stats.currentStreak} days</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500">Best Day</p>
          <p className="text-xl font-bold">{stats.maxDay.count} posts</p>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <button
          onClick={goToPrevMonth}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {MONTHS[currentMonth]} {currentYear}
          </h2>
          <select
            value={`${currentYear}-${currentMonth}`}
            onChange={(e) => handleMonthSelect(e.target.value)}
            className="px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
          >
            {monthOptions.map((opt) => (
              <option key={`${opt.year}-${opt.month}`} value={`${opt.year}-${opt.month}`}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={goToNextMonth}
          disabled={isCurrentMonth}
          className={`p-2 rounded-lg transition-colors ${
            isCurrentMonth
              ? "text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
              : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
          }`}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Full Width Calendar */}
      <div className="p-6">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {DAYS.map(day => (
            <div key={day} className="text-sm font-medium text-zinc-500 text-center py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for days before the 1st */}
          {currentMonthDays.length > 0 && Array.from({ length: currentMonthDays[0].dayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {currentMonthDays.map((day) => {
            const activity = activityData[day.date];
            const count = activity?.count || 0;
            const textColor = getTextColor(count, day.isFuture);
            return (
              <div
                key={day.date}
                className={`aspect-square rounded-xl ${getColor(count, day.isFuture)} ${
                  day.isFuture ? "cursor-default" : "cursor-pointer hover:ring-2 hover:ring-blue-300 hover:shadow-md"
                } transition-all flex flex-col items-center justify-center p-2 border border-zinc-200/50 dark:border-zinc-700/30`}
                onMouseEnter={(e) => !day.isFuture && handleMouseEnter(e, activity, day.date)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <span className={`text-lg font-medium ${textColor}`}>
                  {day.dayOfMonth}
                </span>
                {count > 0 && !day.isFuture && (
                  <span className={`text-xs mt-0.5 ${textColor} opacity-75`}>
                    {count} post{count !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-2 mt-8 text-sm text-zinc-500">
          <span>Fewer posts</span>
          <div className="w-6 h-6 rounded-lg bg-red-100 dark:bg-red-900/40 border border-zinc-200/50" />
          <div className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-800/30 border border-zinc-200/50" />
          <div className="w-6 h-6 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-zinc-200/50" />
          <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-800/30 border border-zinc-200/50" />
          <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-700/40 border border-zinc-200/50" />
          <span>More posts</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="fixed z-50 bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 text-sm pointer-events-none"
          style={{
            left: Math.min(tooltipPos.x + 10, window.innerWidth - 220),
            top: tooltipPos.y - 80,
          }}
        >
          <p className="font-semibold">{hoveredDay.date}</p>
          <p className="text-zinc-500">{hoveredDay.count} post{hoveredDay.count !== 1 ? "s" : ""}</p>
          {hoveredDay.views > 0 && (
            <p className="text-zinc-500">{formatNumber(hoveredDay.views)} views</p>
          )}
          {hoveredDay.posts.length > 0 && (
            <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 max-w-[200px]">
              {hoveredDay.posts.slice(0, 3).map((post, i) => (
                <p key={i} className="text-xs truncate text-zinc-600 dark:text-zinc-400">
                  {post.clipperName}: {post.title || "Untitled"}
                </p>
              ))}
              {hoveredDay.posts.length > 3 && (
                <p className="text-xs text-zinc-400">+{hoveredDay.posts.length - 3} more</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
