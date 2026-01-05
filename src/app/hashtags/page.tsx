"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Hash, TrendingUp, TrendingDown, Eye, Heart, MessageCircle, BarChart3 } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import DateRangePicker from "@/components/DateRangePicker";

type HashtagStats = {
  hashtag: string;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  postCount: number;
  avgViews: number;
  topPost: {
    title: string;
    views: number;
    postUrl: string;
  } | null;
  byClipper: Record<string, { views: number; posts: number }>;
  trend: {
    currentPeriod: number;
    previousPeriod: number;
    change: number;
  } | null;
};

type SortOption = "views" | "posts" | "avgViews" | "trend";

export default function HashtagsPage() {
  const [hashtags, setHashtags] = useState<HashtagStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("views");
  const [selectedHashtag, setSelectedHashtag] = useState<HashtagStats | null>(null);

  useEffect(() => {
    const fetchHashtags = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);
        params.set("sortBy", sortBy);
        params.set("limit", "100");

        const res = await fetch(`/api/hashtags?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setHashtags(data.hashtags);
        }
      } catch (error) {
        console.error("Failed to fetch hashtags:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchHashtags();
  }, [fromDate, toDate, sortBy]);

  const handleDateChange = (from: string | null, to: string | null) => {
    setFromDate(from);
    setToDate(to);
  };

  // Calculate totals
  const totalViews = hashtags.reduce((sum, h) => sum + h.totalViews, 0);
  const topHashtag = hashtags[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500">Loading hashtag analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Hash size={24} />
                Hashtag Analytics
              </h1>
              <p className="text-sm text-zinc-500">Track topic performance across all clippers</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onChange={handleDateChange}
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg"
          >
            <option value="views">Sort by Views</option>
            <option value="posts">Sort by Post Count</option>
            <option value="avgViews">Sort by Avg Views</option>
            <option value="trend">Sort by Trending</option>
          </select>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Hash size={16} />
              <span className="text-sm">Unique Topics</span>
            </div>
            <p className="text-2xl font-bold">{hashtags.length}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Eye size={16} />
              <span className="text-sm">Total Views</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(totalViews)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <TrendingUp size={16} />
              <span className="text-sm">Top Topic</span>
            </div>
            <p className="text-2xl font-bold">{topHashtag?.hashtag || "-"}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <BarChart3 size={16} />
              <span className="text-sm">Top Views</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(topHashtag?.totalViews || 0)}</p>
          </div>
        </div>

        {/* Hashtag Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Hashtag List */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">All Topics</h2>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-[600px] overflow-y-auto">
              {hashtags.map((hashtag, index) => (
                <button
                  key={hashtag.hashtag}
                  onClick={() => setSelectedHashtag(hashtag)}
                  className={`w-full p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
                    selectedHashtag?.hashtag === hashtag.hashtag ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-400 text-sm w-6">#{index + 1}</span>
                      <div>
                        <p className="font-semibold text-blue-600">{hashtag.hashtag}</p>
                        <p className="text-sm text-zinc-500">{hashtag.postCount} posts</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatNumber(hashtag.totalViews)}</p>
                      {hashtag.trend && (
                        <div className={`flex items-center gap-1 text-sm ${
                          hashtag.trend.change >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {hashtag.trend.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {Math.abs(hashtag.trend.change).toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Selected Hashtag Details */}
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">
                {selectedHashtag ? selectedHashtag.hashtag : "Select a topic"}
              </h2>
            </div>
            {selectedHashtag ? (
              <div className="p-4 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-zinc-500 flex items-center gap-1">
                      <Eye size={14} /> Total Views
                    </p>
                    <p className="text-xl font-bold">{formatNumber(selectedHashtag.totalViews)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 flex items-center gap-1">
                      <Heart size={14} /> Total Likes
                    </p>
                    <p className="text-xl font-bold">{formatNumber(selectedHashtag.totalLikes)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 flex items-center gap-1">
                      <MessageCircle size={14} /> Comments
                    </p>
                    <p className="text-xl font-bold">{formatNumber(selectedHashtag.totalComments)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500">Avg Views/Post</p>
                    <p className="text-xl font-bold">{formatNumber(selectedHashtag.avgViews)}</p>
                  </div>
                </div>

                {/* Trend */}
                {selectedHashtag.trend && (
                  <div className={`p-3 rounded-lg ${
                    selectedHashtag.trend.change >= 0
                      ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  }`}>
                    <div className="flex items-center gap-2">
                      {selectedHashtag.trend.change >= 0 ? (
                        <TrendingUp className="text-green-600" size={20} />
                      ) : (
                        <TrendingDown className="text-red-600" size={20} />
                      )}
                      <div>
                        <p className={`font-semibold ${
                          selectedHashtag.trend.change >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                        }`}>
                          {selectedHashtag.trend.change >= 0 ? "+" : ""}{selectedHashtag.trend.change.toFixed(1)}% this week
                        </p>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {formatNumber(selectedHashtag.trend.currentPeriod)} vs {formatNumber(selectedHashtag.trend.previousPeriod)} last week
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* By Clipper */}
                <div>
                  <h3 className="font-semibold mb-2">Performance by Clipper</h3>
                  <div className="space-y-2">
                    {Object.entries(selectedHashtag.byClipper)
                      .sort((a, b) => b[1].views - a[1].views)
                      .map(([clipper, stats]) => (
                        <div key={clipper} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-800 rounded">
                          <span className="font-medium">{clipper}</span>
                          <div className="text-right text-sm">
                            <span className="font-semibold">{formatNumber(stats.views)}</span>
                            <span className="text-zinc-500 ml-2">({stats.posts} posts)</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Top Post */}
                {selectedHashtag.topPost && (
                  <div>
                    <h3 className="font-semibold mb-2">Top Performing Post</h3>
                    <a
                      href={selectedHashtag.topPost.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    >
                      <p className="text-sm line-clamp-2">{selectedHashtag.topPost.title}</p>
                      <p className="text-sm text-zinc-500 mt-1">
                        {formatNumber(selectedHashtag.topPost.views)} views
                      </p>
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500">
                <Hash size={48} className="mx-auto mb-4 opacity-20" />
                <p>Click on a topic to see detailed analytics</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
