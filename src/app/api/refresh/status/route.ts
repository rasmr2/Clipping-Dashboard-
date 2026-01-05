import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { logRequest } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get the most recent lastRefreshedAt from any clipper
    const lastRefreshed = await prisma.clipper.findFirst({
      orderBy: { lastRefreshedAt: "desc" },
      select: { lastRefreshedAt: true }
    });

    logRequest(request, 200, startTime);
    return NextResponse.json({
      lastRefreshedAt: lastRefreshed?.lastRefreshedAt || null,
    });
  } catch (error) {
    console.error("Error fetching refresh status:", error);
    logRequest(request, 500, startTime, String(error));
    return NextResponse.json({ lastRefreshedAt: null });
  }
}
