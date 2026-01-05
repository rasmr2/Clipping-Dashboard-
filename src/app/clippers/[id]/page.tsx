"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, Heart, MessageCircle, Share2, ExternalLink, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatNumber, formatDate } from "@/lib/utils";

type Post = {
  id: string;
  platform: string;
  postUrl: string;
  title: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  postedAt: string | null;
  snapshots: Array<{
    views: number;
    likes: number;
    recordedAt: string;
  }>;
};

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
  posts: Post[];
};

export default function ClipperDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [clipper, setClipper] = useState<Clipper | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchClipper = async () => {
      try {
        const res = await fetch(`/api/clippers/${id}`);
        if (res.ok) {
          const data = await res.json();
          setClipper(data);
        }
      } catch (error) {
        console.error("Failed to fetch clipper:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchClipper();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this clipper and all their posts?")) return;

    setDeleting(true);
    try {
      await fetch(`/api/clippers/${id}`, { method: "DELETE" });
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to delete clipper:", error);
      setDeleting(false);
    }
  };

  // Aggregate snapshots for chart
  const getChartData = () => {
    if (!clipper) return [];

    const dailyData: Record<string, { date: string; views: number; likes: number }> = {};

    clipper.posts.forEach(post => {
      post.snapshots.forEach(snapshot => {
        const date = new Date(snapshot.recordedAt).toLocaleDateString();
        if (!dailyData[date]) {
          dailyData[date] = { date, views: 0, likes: 0 };
        }
        dailyData[date].views += snapshot.views;
        dailyData[date].likes += snapshot.likes;
      });
    });

    return Object.values(dailyData).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (!clipper) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 mb-4">Clipper not found</p>
          <Link href="/" className="text-blue-600 hover:underline">Go back</Link>
        </div>
      </div>
    );
  }

  const chartData = getChartData();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{clipper.name}</h1>
              <div className="flex gap-4 text-sm text-zinc-500">
                {clipper.youtubeChannel && <span>YouTube</span>}
                {clipper.tiktokUsername && <span>TikTok: @{clipper.tiktokUsername}</span>}
                {clipper.instagramUsername && <span>Instagram: @{clipper.instagramUsername}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Eye size={16} />
              <span className="text-sm">Total Views</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(clipper.totalViews)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Heart size={16} />
              <span className="text-sm">Total Likes</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(clipper.totalLikes)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <MessageCircle size={16} />
              <span className="text-sm">Total Comments</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(clipper.totalComments)}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-500 mb-1">
              <Share2 size={16} />
              <span className="text-sm">Total Shares</span>
            </div>
            <p className="text-2xl font-bold">{formatNumber(clipper.totalShares)}</p>
          </div>
        </div>

        {/* Growth Chart */}
        {chartData.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Growth Over Time</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => formatNumber(v)} />
                  <Tooltip formatter={(value) => formatNumber(Number(value) || 0)} />
                  <Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} dot={false} name="Views" />
                  <Line type="monotone" dataKey="likes" stroke="#ec4899" strokeWidth={2} dot={false} name="Likes" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Posts List */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-lg font-semibold">All Posts ({clipper.posts.length})</h2>
          </div>

          {clipper.posts.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <p>No posts tracked yet. Data will appear after the next refresh.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {clipper.posts.map((post) => (
                <div key={post.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        post.platform === "youtube" ? "bg-red-100 text-red-700" :
                        post.platform === "tiktok" ? "bg-zinc-200 text-zinc-700" :
                        "bg-pink-100 text-pink-700"
                      }`}>
                        {post.platform}
                      </span>
                      <a
                        href={post.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        {post.title || "View Post"}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    {post.postedAt && (
                      <p className="text-sm text-zinc-500 mt-1">
                        Posted {formatDate(new Date(post.postedAt))}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-right text-sm">
                    <div>
                      <p className="text-zinc-500">Views</p>
                      <p className="font-semibold">{formatNumber(post.views)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Likes</p>
                      <p className="font-semibold">{formatNumber(post.likes)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Comments</p>
                      <p className="font-semibold">{formatNumber(post.comments)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Shares</p>
                      <p className="font-semibold">{formatNumber(post.shares)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
