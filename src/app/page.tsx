"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Eye, Heart, MessageCircle, Share2, Youtube, Instagram } from "lucide-react";
import AddClipperModal from "@/components/AddClipperModal";
import { formatNumber } from "@/lib/utils";

type Clipper = {
  id: string;
  name: string;
  youtubeChannel: string | null;
  tiktokUsername: string | null;
  instagramUsername: string | null;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  postCount: number;
};

export default function Dashboard() {
  const [clippers, setClippers] = useState<Clipper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchClippers = async () => {
    try {
      const res = await fetch("/api/clippers");
      const data = await res.json();
      setClippers(data);
    } catch (error) {
      console.error("Failed to fetch clippers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClippers();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/refresh", { method: "POST" });
      await fetchClippers();
    } catch (error) {
      console.error("Refresh failed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const totalStats = clippers.reduce(
    (acc, clipper) => ({
      views: acc.views + clipper.totalViews,
      likes: acc.likes + clipper.totalLikes,
      comments: acc.comments + clipper.totalComments,
      shares: acc.shares + clipper.totalShares,
      posts: acc.posts + clipper.postCount,
    }),
    { views: 0, likes: 0, comments: 0, shares: 0, posts: 0 }
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Clipper Dashboard</h1>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              Refresh Data
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
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Eye size={16} />
              <span className="text-sm">Total Views</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(totalStats.views)}</p>
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

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">Clipper Leaderboard</h2>
            <p className="text-sm text-zinc-500">Ranked by total views</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-zinc-500">Loading...</div>
          ) : clippers.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <p>No clippers yet. Add your first clipper to get started!</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {clippers.map((clipper, index) => (
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
                  <div className="grid grid-cols-4 gap-6 text-right">
                    <div>
                      <p className="text-sm text-zinc-500">Views</p>
                      <p className="font-semibold">{formatNumber(clipper.totalViews)}</p>
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
      </main>

      <AddClipperModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchClippers}
      />
    </div>
  );
}
