"use client";

import { useState } from "react";
import { X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddClipperModal({ isOpen, onClose, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [youtubeChannel, setYoutubeChannel] = useState("");
  const [tiktokUsername, setTiktokUsername] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/clippers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          youtubeChannel: youtubeChannel || null,
          tiktokUsername: tiktokUsername || null,
          instagramUsername: instagramUsername || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to add clipper");
      }

      setName("");
      setYoutubeChannel("");
      setTiktokUsername("");
      setInstagramUsername("");
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New Clipper</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
              placeholder="Clipper name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">YouTube Channel URL</label>
            <input
              type="text"
              value={youtubeChannel}
              onChange={(e) => setYoutubeChannel(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
              placeholder="https://youtube.com/@channel"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">TikTok Username</label>
            <input
              type="text"
              value={tiktokUsername}
              onChange={(e) => setTiktokUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
              placeholder="@username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Instagram Username</label>
            <input
              type="text"
              value={instagramUsername}
              onChange={(e) => setInstagramUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
              placeholder="@username"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Clipper"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
