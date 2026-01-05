import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get the most recent lastRefreshedAt from any clipper
    const lastRefreshed = await prisma.clipper.findFirst({
      orderBy: { lastRefreshedAt: "desc" },
      select: { lastRefreshedAt: true }
    });

    return NextResponse.json({
      lastRefreshedAt: lastRefreshed?.lastRefreshedAt || null,
    });
  } catch (error) {
    console.error("Error fetching refresh status:", error);
    return NextResponse.json({
      lastRefreshedAt: null,
      error: error instanceof Error ? error.message : "Unknown error",
      dbUrl: process.env.TURSO_DATABASE_URL ? "set" : "not set"
    });
  }
}
