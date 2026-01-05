"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock } from "lucide-react";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const redirect = searchParams.get("redirect") || "/";
        router.push(redirect);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "Invalid password");
      }
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
          required
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold">Clipper Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">Enter password to continue</p>
        </div>

        <Suspense fallback={<div className="h-24 flex items-center justify-center">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
