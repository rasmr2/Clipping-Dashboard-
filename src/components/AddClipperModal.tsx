"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

type Page = {
  id: string;
  pageName: string;
  tiktokUsername: string;
  youtubeChannel: string;
  instagramUsername: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const createEmptyPage = (): Page => ({
  id: crypto.randomUUID(),
  pageName: "",
  tiktokUsername: "",
  youtubeChannel: "",
  instagramUsername: "",
});

export default function AddClipperModal({ isOpen, onClose, onSuccess }: Props) {
  const [clipperName, setClipperName] = useState("");
  const [pages, setPages] = useState<Page[]>([createEmptyPage()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const addPage = () => {
    setPages([...pages, createEmptyPage()]);
  };

  const removePage = (id: string) => {
    if (pages.length > 1) {
      setPages(pages.filter((p) => p.id !== id));
    }
  };

  const updatePage = (id: string, field: keyof Page, value: string) => {
    setPages(pages.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Create all pages
      for (const page of pages) {
        const displayName = page.pageName
          ? `${clipperName} - ${page.pageName}`
          : clipperName;

        const res = await fetch("/api/clippers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: displayName,
            clipperGroup: clipperName,
            youtubeChannel: page.youtubeChannel || null,
            tiktokUsername: page.tiktokUsername || null,
            instagramUsername: page.instagramUsername || null,
          }),
        });

        if (!res.ok) {
          throw new Error(`Failed to add page: ${page.pageName || "unnamed"}`);
        }
      }

      // Reset form
      setClipperName("");
      setPages([createEmptyPage()]);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setClipperName("");
    setPages([createEmptyPage()]);
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New Clipper</h2>
          <button onClick={handleClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Clipper Name *</label>
            <input
              type="text"
              value={clipperName}
              onChange={(e) => setClipperName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
              placeholder="e.g., Kesvi"
              required
            />
            <p className="text-xs text-zinc-500 mt-1">This groups all pages under one clipper</p>
          </div>

          <div className="border-t pt-4 dark:border-zinc-700">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium">Pages</label>
              <button
                type="button"
                onClick={addPage}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus size={16} />
                Add Page
              </button>
            </div>

            <div className="space-y-4">
              {pages.map((page, index) => (
                <div
                  key={page.id}
                  className="p-3 border rounded-lg dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                      Page {index + 1}
                    </span>
                    {pages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePage(page.id)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={page.pageName}
                      onChange={(e) => updatePage(page.id, "pageName", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm"
                      placeholder="Page name (e.g., rasmrfeed)"
                    />
                    <input
                      type="text"
                      value={page.tiktokUsername}
                      onChange={(e) => updatePage(page.id, "tiktokUsername", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm"
                      placeholder="TikTok username"
                    />
                    <input
                      type="text"
                      value={page.youtubeChannel}
                      onChange={(e) => updatePage(page.id, "youtubeChannel", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm"
                      placeholder="YouTube channel URL"
                    />
                    <input
                      type="text"
                      value={page.instagramUsername}
                      onChange={(e) => updatePage(page.id, "instagramUsername", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 text-sm"
                      placeholder="Instagram username"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Adding..." : `Add Clipper (${pages.length} page${pages.length > 1 ? "s" : ""})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
