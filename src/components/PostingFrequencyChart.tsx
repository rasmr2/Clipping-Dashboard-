"use client";

import { useState, useEffect } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ZAxis,
} from "recharts";
import { formatNumber } from "@/lib/utils";

type FrequencyData = {
  clipperId: string;
  clipperName: string;
  clipperGroup: string | null;
  profilePicture: string | null;
  platform: string;
  totalPosts: number;
  totalViews: number;
  avgViews: number;
  postsPerWeek: number;
  firstPostDate: string | null;
  lastPostDate: string | null;
  daysSinceFirstPost: number;
};

type Props = {
  fromDate: string | null;
  toDate: string | null;
};

const PLATFORM_COLORS: Record<string, string> = {
  tiktok: "#00f2ea",
  youtube: "#ff0000",
  instagram: "#e1306c",
};

const CLIPPER_COLORS: Record<string, string> = {
  "Kesvi": "#8b5cf6",
  "Cardboard": "#f59e0b",
  "Xtex": "#10b981",
};

export default function PostingFrequencyChart({ fromDate, toDate }: Props) {
  const [data, setData] = useState<FrequencyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [colorBy, setColorBy] = useState<"platform" | "clipper">("clipper");
  const [hoveredPoint, setHoveredPoint] = useState<FrequencyData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);
        params.set("groupBy", "page");

        const res = await fetch(`/api/frequency?${params.toString()}`);
        if (res.ok) {
          const result = await res.json();
          setData(result.frequency);
        }
      } catch (error) {
        console.error("Failed to fetch frequency data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fromDate, toDate]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <p className="text-zinc-500 text-center">Loading frequency data...</p>
      </div>
    );
  }

  const getColor = (item: FrequencyData) => {
    if (colorBy === "platform") {
      return PLATFORM_COLORS[item.platform] || "#6b7280";
    }
    return CLIPPER_COLORS[item.clipperGroup || ""] || "#6b7280";
  };

  // Custom dot renderer with profile pictures
  const renderDot = (props: { cx: number; cy: number; payload: FrequencyData }) => {
    const { cx, cy, payload } = props;
    const size = 32;

    if (payload.profilePicture) {
      return (
        <g>
          <defs>
            <clipPath id={`clip-${payload.clipperId}-${payload.platform}`}>
              <circle cx={cx} cy={cy} r={size / 2} />
            </clipPath>
          </defs>
          <circle
            cx={cx}
            cy={cy}
            r={size / 2 + 2}
            fill={getColor(payload)}
            stroke={getColor(payload)}
            strokeWidth={2}
          />
          <image
            x={cx - size / 2}
            y={cy - size / 2}
            width={size}
            height={size}
            href={payload.profilePicture}
            clipPath={`url(#clip-${payload.clipperId}-${payload.platform})`}
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      );
    }

    // Fallback to colored circle with initial
    return (
      <g>
        <circle cx={cx} cy={cy} r={size / 2} fill={getColor(payload)} />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={12}
          fontWeight="bold"
        >
          {payload.clipperName.charAt(0).toUpperCase()}
        </text>
      </g>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: FrequencyData }> }) => {
    if (!active || !payload || !payload[0]) return null;
    const item = payload[0].payload;

    return (
      <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2 mb-2">
          {item.profilePicture && (
            <img
              src={item.profilePicture}
              alt={item.clipperName}
              className="w-8 h-8 rounded-full"
            />
          )}
          <div>
            <p className="font-semibold">{item.clipperName}</p>
            <p className="text-xs text-zinc-500 capitalize">{item.platform}</p>
          </div>
        </div>
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-zinc-500">Posts/Week:</span>{" "}
            <span className="font-medium">{item.postsPerWeek}</span>
          </p>
          <p>
            <span className="text-zinc-500">Avg Views:</span>{" "}
            <span className="font-medium">{formatNumber(item.avgViews)}</span>
          </p>
          <p>
            <span className="text-zinc-500">Total Posts:</span>{" "}
            <span className="font-medium">{item.totalPosts}</span>
          </p>
          <p>
            <span className="text-zinc-500">Total Views:</span>{" "}
            <span className="font-medium">{formatNumber(item.totalViews)}</span>
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Posting Frequency vs Performance</h2>
          <p className="text-sm text-zinc-500">Posts per week vs average views per post</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setColorBy("clipper")}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              colorBy === "clipper"
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            By Clipper
          </button>
          <button
            onClick={() => setColorBy("platform")}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              colorBy === "platform"
                ? "bg-blue-600 text-white"
                : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            By Platform
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 flex flex-wrap gap-4 border-b border-zinc-200 dark:border-zinc-800">
        {colorBy === "clipper" ? (
          Object.entries(CLIPPER_COLORS).map(([name, color]) => (
            <div key={name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-sm">{name}</span>
            </div>
          ))
        ) : (
          Object.entries(PLATFORM_COLORS).map(([platform, color]) => (
            <div key={platform} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-sm capitalize">{platform}</span>
            </div>
          ))
        )}
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              type="number"
              dataKey="postsPerWeek"
              name="Posts/Week"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              axisLine={{ stroke: "#4b5563" }}
              tickLine={{ stroke: "#4b5563" }}
              label={{
                value: "Posts per Week",
                position: "bottom",
                offset: 0,
                fill: "#9ca3af",
              }}
            />
            <YAxis
              type="number"
              dataKey="avgViews"
              name="Avg Views"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              axisLine={{ stroke: "#4b5563" }}
              tickLine={{ stroke: "#4b5563" }}
              tickFormatter={(value) => formatNumber(value)}
              label={{
                value: "Avg Views/Post",
                angle: -90,
                position: "insideLeft",
                fill: "#9ca3af",
              }}
            />
            <ZAxis type="number" dataKey="totalViews" range={[100, 500]} />
            <Tooltip content={<CustomTooltip />} />
            <Scatter
              data={data}
              shape={(props: unknown) => renderDot(props as { cx: number; cy: number; payload: FrequencyData })}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry)} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Data table below chart */}
      <div className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="p-4">
          <h3 className="font-semibold mb-3">Page Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="pb-2 pr-4">Page</th>
                  <th className="pb-2 pr-4">Platform</th>
                  <th className="pb-2 pr-4 text-right">Posts/Week</th>
                  <th className="pb-2 pr-4 text-right">Avg Views</th>
                  <th className="pb-2 pr-4 text-right">Total Posts</th>
                  <th className="pb-2 text-right">Total Views</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 10).map((item) => (
                  <tr
                    key={`${item.clipperId}-${item.platform}`}
                    className="border-b border-zinc-100 dark:border-zinc-800/50"
                  >
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        {item.profilePicture ? (
                          <img
                            src={item.profilePicture}
                            alt={item.clipperName}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                            style={{ backgroundColor: getColor(item) }}
                          >
                            {item.clipperName.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium">{item.clipperName}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4 capitalize">{item.platform}</td>
                    <td className="py-2 pr-4 text-right">{item.postsPerWeek}</td>
                    <td className="py-2 pr-4 text-right">{formatNumber(item.avgViews)}</td>
                    <td className="py-2 pr-4 text-right">{item.totalPosts}</td>
                    <td className="py-2 text-right">{formatNumber(item.totalViews)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
