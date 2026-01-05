"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

type DateRangePickerProps = {
  fromDate: string | null;
  toDate: string | null;
  onChange: (fromDate: string | null, toDate: string | null) => void;
};

type PresetOption = {
  label: string;
  days: number;
};

const PRESETS: PresetOption[] = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isInRange(date: Date, from: Date | null, to: Date | null): boolean {
  if (!from || !to) return false;
  return date >= from && date <= to;
}

export default function DateRangePicker({
  fromDate,
  toDate,
  onChange,
}: DateRangePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectingStart, setSelectingStart] = useState(true);
  const [tempFrom, setTempFrom] = useState<Date | null>(
    fromDate ? parseDate(fromDate) : null
  );
  const [tempTo, setTempTo] = useState<Date | null>(
    toDate ? parseDate(toDate) : null
  );
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync temp values when props change
  useEffect(() => {
    setTempFrom(fromDate ? parseDate(fromDate) : null);
    setTempTo(toDate ? parseDate(toDate) : null);
  }, [fromDate, toDate]);

  // Detect active preset
  useEffect(() => {
    if (!fromDate || !toDate) {
      setActivePreset(null);
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = parseDate(fromDate);
    const to = parseDate(toDate);

    if (!isSameDay(to, today)) {
      setActivePreset(null);
      return;
    }

    const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const matchingPreset = PRESETS.find(p => p.days === diffDays);
    setActivePreset(matchingPreset ? matchingPreset.days : null);
  }, [fromDate, toDate]);

  const handlePresetClick = (days: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = new Date(today);
    from.setDate(from.getDate() - days + 1);

    onChange(formatDate(from), formatDate(today));
    setActivePreset(days);
    setShowPicker(false);
  };

  const handleDayClick = (date: Date) => {
    if (selectingStart) {
      setTempFrom(date);
      setTempTo(null);
      setSelectingStart(false);
    } else {
      if (tempFrom && date < tempFrom) {
        setTempTo(tempFrom);
        setTempFrom(date);
      } else {
        setTempTo(date);
      }
      setSelectingStart(true);

      // Auto-apply when both dates selected
      const from = tempFrom && date < tempFrom ? date : tempFrom;
      const to = tempFrom && date < tempFrom ? tempFrom : date;
      if (from && to) {
        onChange(formatDate(from), formatDate(to));
        setActivePreset(null);
        setShowPicker(false);
      }
    }
  };

  const handleClear = () => {
    setTempFrom(null);
    setTempTo(null);
    setActivePreset(null);
    onChange(null, null);
    setShowPicker(false);
  };

  const navigateMonth = (direction: number) => {
    setViewDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const formatDisplayDate = (date: string) => {
    if (!date) return "";
    return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const hasDateFilter = fromDate || toDate;

  // Calendar rendering
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const monthName = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
          hasDateFilter
            ? "border-blue-500 text-blue-600"
            : "border-zinc-200 dark:border-zinc-800"
        }`}
      >
        <Calendar size={16} />
        <span className="text-sm font-medium">
          {activePreset
            ? `Last ${activePreset} days`
            : hasDateFilter
            ? `${formatDisplayDate(fromDate || "")}${fromDate && toDate ? " – " : ""}${formatDisplayDate(toDate || "")}`
            : "All Time"}
        </span>
        {hasDateFilter && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="ml-1 p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
          >
            <X size={14} />
          </button>
        )}
      </button>

      {showPicker && (
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Preset buttons */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            {PRESETS.map((preset) => (
              <button
                key={preset.days}
                onClick={() => handlePresetClick(preset.days)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activePreset === preset.days
                    ? "bg-blue-600 text-white"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="flex-1 px-4 py-3 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
            >
              All
            </button>
          </div>

          {/* Calendar */}
          <div className="p-4">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-semibold">{monthName}</span>
              <button
                onClick={() => navigateMonth(1)}
                className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-zinc-400 py-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, i) => {
                if (!date) {
                  return <div key={`empty-${i}`} className="w-9 h-9" />;
                }

                const isToday = isSameDay(date, today);
                const isStart = tempFrom && isSameDay(date, tempFrom);
                const isEnd = tempTo && isSameDay(date, tempTo);
                const inRange = isInRange(date, tempFrom, tempTo);
                const isFuture = date > today;

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => !isFuture && handleDayClick(date)}
                    disabled={isFuture}
                    className={`w-9 h-9 text-sm rounded-lg transition-colors relative ${
                      isFuture
                        ? "text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
                        : isStart || isEnd
                        ? "bg-blue-600 text-white font-semibold"
                        : inRange
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : isToday
                        ? "bg-zinc-200 dark:bg-zinc-700 font-semibold"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {/* Selection hint */}
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500">
              {!tempFrom
                ? "Click to select start date"
                : !tempTo
                ? "Click to select end date"
                : "Click a date to start new selection"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
