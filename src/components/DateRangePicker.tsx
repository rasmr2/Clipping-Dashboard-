"use client";

import { useState } from "react";
import { Calendar, X } from "lucide-react";

type DateRangePickerProps = {
  fromDate: string | null;
  toDate: string | null;
  onChange: (fromDate: string | null, toDate: string | null) => void;
};

export default function DateRangePicker({
  fromDate,
  toDate,
  onChange,
}: DateRangePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempFrom, setTempFrom] = useState(fromDate || "");
  const [tempTo, setTempTo] = useState(toDate || "");

  const handleApply = () => {
    onChange(tempFrom || null, tempTo || null);
    setShowPicker(false);
  };

  const handleClear = () => {
    setTempFrom("");
    setTempTo("");
    onChange(null, null);
    setShowPicker(false);
  };

  const formatDisplayDate = (date: string) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const hasDateFilter = fromDate || toDate;

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
          hasDateFilter
            ? "border-blue-500 text-blue-600"
            : "border-zinc-200 dark:border-zinc-800"
        }`}
      >
        <Calendar size={16} />
        <span>
          {hasDateFilter
            ? `${formatDisplayDate(fromDate || "")}${fromDate && toDate ? " - " : ""}${formatDisplayDate(toDate || "")}`
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
        <div className="absolute top-full left-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-20 p-4 min-w-[300px]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={tempFrom}
                onChange={(e) => setTempFrom(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={tempTo}
                onChange={(e) => setTempTo(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={handleClear}
                className="flex-1 px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Clear
              </button>
              <button
                onClick={handleApply}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
