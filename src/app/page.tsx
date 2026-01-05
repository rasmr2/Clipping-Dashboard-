"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Eye, Heart, MessageCircle, Share2, Youtube, Instagram, ChevronDown, Users, User, DollarSign, Hash, TrendingUp, TrendingDown, BarChart2, UserPlus } from "lucide-react";
import AddClipperModal from "@/components/AddClipperModal";
import AddPageModal from "@/components/AddPageModal";
import DateRangePicker from "@/components/DateRangePicker";
import PostingCalendarHeatmap from "@/components/PostingCalendarHeatmap";
import { formatNumber } from "@/lib/utils";

type Clipper = {
  id: string;
  name: string;
  clipperGroup: string | null;
  youtubeChannel: string | null;
  tiktokUsername: string | null;
  instagramUsername: string | null;
  totalViews: number;
  totalPayableViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  postCount: number;
};

type ClipperGroup = {
  clipperGroup: string;
  pages: Clipper[];
  totalViews: number;
  totalPayableViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  postCount: number;
};

type HashtagStats = {
  hashtag: string;
  totalViews: number;
  totalLikes: number;
  postCount: number;
  avgViews: number;
  trend: {
    change: number;
  } | null;
  byClipper: Record<string, { views: number; posts: number }>;
};

export default function Dashboard() {
  const [clippers, setClippers] = useState<Clipper[]>([]);
  const [groupedClippers, setGroupedClippers] = useState<ClipperGroup[]>([]);
  const [hashtags, setHashtags] = useState<HashtagStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [addPageToGroup, setAddPageToGroup] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);

  // Main tab state
  const [mainTab, setMainTab] = useState<"clippers" | "topics" | "frequency">("clippers");

  // Filter state
  const [viewMode, setViewMode] = useState<"clipper" | "page">("clipper");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const fetchRefreshStatus = async () => {
    try {
      const res = await fetch("/api/refresh/status");
      const data = await res.json();
      setLastRefreshedAt(data.lastRefreshedAt);
    } catch (error) {
      console.error("Failed to fetch refresh status:", error);
    }
  };

  const fetchClippers = async () => {
    try {
      // Build query params with date filters
      const params = new URLSearchParams();
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      const dateQuery = params.toString();

      // Fetch clippers, grouped data, hashtags, and refresh status
      const [groupedRes, allRes, hashtagsRes] = await Promise.all([
        fetch(`/api/clippers?grouped=true${dateQuery ? `&${dateQuery}` : ""}`),
        fetch(`/api/clippers${dateQuery ? `?${dateQuery}` : ""}`),
        fetch(`/api/hashtags?limit=50${dateQuery ? `&${dateQuery}` : ""}`),
        fetchRefreshStatus(),
      ]);
      const groupedData = await groupedRes.json();
      const allData = await allRes.json();
      const hashtagsData = await hashtagsRes.json();
      setGroupedClippers(groupedData);
      setClippers(allData);
      setHashtags(hashtagsData.hashtags || []);
    } catch (error) {
      console.error("Failed to fetch clippers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClippers();
  }, [fromDate, toDate]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const data = await res.json();
      if (data.lastRefreshedAt) {
        setLastRefreshedAt(data.lastRefreshedAt);
      }
      await fetchClippers();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const openAddPageModal = (clipperGroup: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    setAddPageToGroup(clipperGroup);
    setShowAddPageModal(true);
  };

  // Format relative time (e.g., "5 minutes ago")
  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Get unique clipper groups for filter dropdown
  const clipperGroups = [...new Set(clippers.map(c => c.clipperGroup).filter(Boolean))] as string[];

  // Filter clippers based on selection
  const filteredClippers = selectedGroup
    ? clippers.filter(c => c.clipperGroup === selectedGroup)
    : clippers;

  // Calculate total stats based on current view
  const displayData = viewMode === "clipper" && !selectedGroup ? groupedClippers : filteredClippers;
  const totalStats = displayData.reduce(
    (acc, item) => ({
      views: acc.views + item.totalViews,
      payableViews: acc.payableViews + item.totalPayableViews,
      likes: acc.likes + item.totalLikes,
      comments: acc.comments + item.totalComments,
      shares: acc.shares + item.totalShares,
      posts: acc.posts + item.postCount,
    }),
    { views: 0, payableViews: 0, likes: 0, comments: 0, shares: 0, posts: 0 }
  );

  const handleDateChange = (from: string | null, to: string | null) => {
    setFromDate(from);
    setToDate(to);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Clipper Dashboard</h1>
          <div className="flex gap-2 items-center">
            {lastRefreshedAt && (
              <span className="text-sm text-zinc-500" title={new Date(lastRefreshedAt).toLocaleString()}>
                Updated {formatRelativeTime(lastRefreshedAt)}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus size={16} />
              Add Clipper
            </button>
          </div>
        </div>
        {/* Main Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setMainTab("clippers")}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                mainTab === "clippers"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <Users size={16} />
              Clippers
            </button>
            <button
              onClick={() => setMainTab("topics")}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                mainTab === "topics"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <Hash size={16} />
              Topics
            </button>
            <button
              onClick={() => setMainTab("frequency")}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                mainTab === "frequency"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <BarChart2 size={16} />
              Frequency
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Date Filter - shown on both tabs */}
        <div className="flex gap-4 mb-6">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onChange={handleDateChange}
          />
        </div>

        {mainTab === "clippers" && (
          <>
            {/* Clipper Filters */}
            <div className="flex gap-4 mb-6">
              {/* View Mode Toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowViewDropdown(!showViewDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  {viewMode === "clipper" ? <Users size={16} /> : <User size={16} />}
                  <span>{viewMode === "clipper" ? "By Clipper" : "By Page"}</span>
                  <ChevronDown size={16} />
                </button>
                {showViewDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-10 min-w-[150px]">
                    <button
                      onClick={() => { setViewMode("clipper"); setSelectedGroup(null); setShowViewDropdown(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${viewMode === "clipper" && !selectedGroup ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                    >
                      <Users size={16} />
                      By Clipper
                    </button>
                    <button
                      onClick={() => { setViewMode("page"); setSelectedGroup(null); setShowViewDropdown(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${viewMode === "page" && !selectedGroup ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                    >
                      <User size={16} />
                      By Page
                    </button>
                  </div>
                )}
              </div>

              {/* Clipper Group Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <span>{selectedGroup || "All Clippers"}</span>
                  <ChevronDown size={16} />
                </button>
                {showGroupDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-10 min-w-[150px]">
                    <button
                      onClick={() => { setSelectedGroup(null); setShowGroupDropdown(false); }}
                      className={`w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${!selectedGroup ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                    >
                      All Clippers
                    </button>
                    {clipperGroups.map(group => (
                      <button
                        key={group}
                        onClick={() => { setSelectedGroup(group); setViewMode("page"); setShowGroupDropdown(false); }}
                        className={`w-full text-left px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${selectedGroup === group ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedGroup && (
                <button
                  onClick={() => { setSelectedGroup(null); setViewMode("clipper"); }}
                  className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Clear filter
                </button>
              )}
            </div>
          </>
        )}

        {/* Clippers Tab Content */}
        {mainTab === "clippers" && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <Eye size={16} />
                  <span className="text-sm">Total Views</span>
                </div>
                <p className="text-2xl font-bold">{formatNumber(totalStats.views)}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                  <DollarSign size={16} />
                  <span className="text-sm">Payable Views</span>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatNumber(totalStats.payableViews)}</p>
              </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Heart size={16} />
              <span className="text-sm">Total Likes</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(totalStats.likes)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <MessageCircle size={16} />
              <span className="text-sm">Total Comments</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(totalStats.comments)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Share2 size={16} />
              <span className="text-sm">Total Shares</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(totalStats.shares)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <span className="text-sm">Total Posts</span>
            </div>
            <p className="text-2xl font-bold">{totalStats.posts}</p>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">
              {viewMode === "clipper" && !selectedGroup ? "Clipper Leaderboard" : "Page Leaderboard"}
              {selectedGroup && ` - ${selectedGroup}`}
            </h2>
            <p className="text-sm text-zinc-500">Ranked by total views</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-500">Loading...</div>
          ) : displayData.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <p>No clippers yet. Add your first clipper to get started!</p>
            </div>
          ) : viewMode === "clipper" && !selectedGroup ? (
            // Grouped view - show consolidated clipper stats
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {groupedClippers.map((group, index) => (
                <button
                  key={group.clipperGroup}
                  onClick={() => { setSelectedGroup(group.clipperGroup); setViewMode("page"); }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : index === 1
                        ? "bg-zinc-200 text-zinc-700"
                        : index === 2
                        ? "bg-orange-100 text-orange-700"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{group.clipperGroup}</h3>
                    <p className="text-sm text-zinc-500">{group.pages.length} page{group.pages.length !== 1 ? "s" : ""}</p>
                  </div>
                  <button
                    onClick={(e) => openAddPageModal(group.clipperGroup, e)}
                    className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Add page to this clipper"
                  >
                    <UserPlus size={18} />
                  </button>
                  <div className="grid grid-cols-5 gap-4 text-right">
                    <div>
                      <p className="text-sm text-zinc-500">Views</p>
                      <p className="font-semibold">{formatNumber(group.totalViews)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-600">Payable</p>
                      <p className="font-semibold text-green-600">{formatNumber(group.totalPayableViews)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Likes</p>
                      <p className="font-semibold">{formatNumber(group.totalLikes)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Comments</p>
                      <p className="font-semibold">{formatNumber(group.totalComments)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Posts</p>
                      <p className="font-semibold">{group.postCount}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // Page view - show individual pages
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {filteredClippers.map((clipper, index) => (
                <Link
                  key={clipper.id}
                  href={`/clippers/${clipper.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : index === 1
                        ? "bg-zinc-200 text-zinc-700"
                        : index === 2
                        ? "bg-orange-100 text-orange-700"
                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{clipper.name}</h3>
                    <div className="flex gap-2 mt-1">
                      {clipper.youtubeChannel && (
                        <span className="text-red-500" title="YouTube">
                          <Youtube size={14} />
                        </span>
                      )}
                      {clipper.tiktokUsername && (
                        <span className="text-zinc-800 dark:text-zinc-200" title="TikTok">TT</span>
                      )}
                      {clipper.instagramUsername && (
                        <span className="text-pink-500" title="Instagram">
                          <Instagram size={14} />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-4 text-right">
                    <div>
                      <p className="text-sm text-zinc-500">Views</p>
                      <p className="font-semibold">{formatNumber(clipper.totalViews)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-green-600">Payable</p>
                      <p className="font-semibold text-green-600">{formatNumber(clipper.totalPayableViews)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Likes</p>
                      <p className="font-semibold">{formatNumber(clipper.totalLikes)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Comments</p>
                      <p className="font-semibold">{formatNumber(clipper.totalComments)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500">Posts</p>
                      <p className="font-semibold">{clipper.postCount}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
          </>
        )}

        {/* Topics Tab Content */}
        {mainTab === "topics" && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">Topic Leaderboard</h2>
              <p className="text-sm text-zinc-500">Ranked by total views</p>
            </div>

            {loading ? (
              <div className="p-8 text-center text-zinc-500">Loading...</div>
            ) : hashtags.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <p>No hashtag data yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {hashtags.map((hashtag, index) => (
                  <div
                    key={hashtag.hashtag}
                    className="flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : index === 1
                          ? "bg-zinc-200 text-zinc-700"
                          : index === 2
                          ? "bg-orange-100 text-orange-700"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-600">{hashtag.hashtag}</h3>
                      <p className="text-sm text-zinc-500">{hashtag.postCount} posts</p>
                    </div>
                    <div className="grid grid-cols-4 gap-6 text-right">
                      <div>
                        <p className="text-sm text-zinc-500">Views</p>
                        <p className="font-semibold">{formatNumber(hashtag.totalViews)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Avg/Post</p>
                        <p className="font-semibold">{formatNumber(hashtag.avgViews)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Likes</p>
                        <p className="font-semibold">{formatNumber(hashtag.totalLikes)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Trend</p>
                        {hashtag.trend ? (
                          <p className={`font-semibold flex items-center justify-end gap-1 ${
                            hashtag.trend.change >= 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {hashtag.trend.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {Math.abs(hashtag.trend.change).toFixed(0)}%
                          </p>
                        ) : (
                          <p className="text-zinc-400">-</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Frequency Tab Content */}
        {mainTab === "frequency" && (
          <PostingCalendarHeatmap fromDate={fromDate} toDate={toDate} />
        )}
      </main>

      <AddClipperModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchClippers}
      />

      <AddPageModal
        isOpen={showAddPageModal}
        clipperGroup={addPageToGroup || ""}
        onClose={() => {
          setShowAddPageModal(false);
          setAddPageToGroup(null);
        }}
        onSuccess={fetchClippers}
      />
    </div>
  );
}
