import { prisma } from "@/lib/db";
import { getScraper, isScrapingEnabled, PostMetrics } from "@/lib/scrapers";
import { TikTokScraper } from "@/lib/scrapers/tiktok";
import { NextRequest, NextResponse } from "next/server";
import { logRequest } from "@/lib/logger";

// Cache duration in hours (skip clipper if refreshed within this time)
const CACHE_DURATION_HOURS = 1;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  if (!isScrapingEnabled()) {
    logRequest(request, 400, startTime, "Scraping not configured");
    return NextResponse.json(
      { error: "Scraping not configured. Set RAPIDAPI_KEY environment variable." },
      { status: 400 }
    );
  }

  // Check for force refresh query param
  const forceRefresh = request.nextUrl.searchParams.get("force") === "true";
  const cacheThreshold = new Date(Date.now() - CACHE_DURATION_HOURS * 60 * 60 * 1000);

  try {
    // Get all clippers, optionally filtering by cache threshold
    const clippers = await prisma.clipper.findMany({
      where: forceRefresh ? undefined : {
        OR: [
          { lastRefreshedAt: null },
          { lastRefreshedAt: { lt: cacheThreshold } }
        ]
      }
    });

    // If all clippers are cached, return early
    if (clippers.length === 0) {
      const lastRefresh = await prisma.clipper.findFirst({
        orderBy: { lastRefreshedAt: "desc" },
        select: { lastRefreshedAt: true }
      });
      logRequest(request, 200, startTime);
      return NextResponse.json({
        success: true,
        cached: true,
        message: "All clippers were refreshed within the last hour",
        lastRefreshedAt: lastRefresh?.lastRefreshedAt,
        newPosts: 0,
        updatedPosts: 0,
      });
    }

    let totalPostsUpdated = 0;
    let totalNewPosts = 0;

    for (const clipper of clippers) {
      // Process each platform
      const platforms: Array<{ platform: "youtube" | "tiktok" | "instagram"; identifier: string | null }> = [
        { platform: "youtube", identifier: clipper.youtubeChannel },
        { platform: "tiktok", identifier: clipper.tiktokUsername },
        { platform: "instagram", identifier: clipper.instagramUsername },
      ];

      for (const { platform, identifier } of platforms) {
        if (!identifier) continue;

        try {
          const scraper = getScraper(platform);
          const posts = await scraper.getChannelPosts(identifier);

          for (const postData of posts) {
            const result = await upsertPost(clipper.id, platform, postData);
            if (result.isNew) {
              totalNewPosts++;
            } else {
              totalPostsUpdated++;
            }
          }

          // Fetch and update profile picture for TikTok accounts (if not already set)
          if (platform === "tiktok" && !clipper.profilePicture) {
            try {
              const tiktokScraper = scraper as TikTokScraper;
              const userInfo = await tiktokScraper.getUserInfo(identifier);
              if (userInfo.profilePicture) {
                await prisma.clipper.update({
                  where: { id: clipper.id },
                  data: { profilePicture: userInfo.profilePicture },
                });
              }
            } catch (e) {
              console.error(`Error fetching profile picture for ${clipper.name}:`, e);
            }
          }
        } catch (error) {
          console.error(`Error scraping ${platform} for ${clipper.name}:`, error);
        }
      }

      // Update lastRefreshedAt for this clipper
      await prisma.clipper.update({
        where: { id: clipper.id },
        data: { lastRefreshedAt: new Date() }
      });
    }

    logRequest(request, 200, startTime);
    return NextResponse.json({
      success: true,
      newPosts: totalNewPosts,
      updatedPosts: totalPostsUpdated,
      lastRefreshedAt: new Date(),
      clippersRefreshed: clippers.length,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    logRequest(request, 500, startTime, String(error));
    return NextResponse.json(
      { error: "Failed to refresh data" },
      { status: 500 }
    );
  }
}

async function upsertPost(
  clipperId: string,
  platform: string,
  data: PostMetrics
): Promise<{ isNew: boolean }> {
  // Check if post exists
  const existing = await prisma.post.findUnique({
    where: { postUrl: data.postUrl },
  });

  if (existing) {
    // Update existing post
    await prisma.post.update({
      where: { id: existing.id },
      data: {
        views: data.views,
        likes: data.likes,
        comments: data.comments,
        shares: data.shares,
        title: data.title,
        thumbnail: data.thumbnail,
      },
    });

    // Create a snapshot for historical tracking
    await prisma.metricSnapshot.create({
      data: {
        postId: existing.id,
        views: data.views,
        likes: data.likes,
        comments: data.comments,
        shares: data.shares,
      },
    });

    return { isNew: false };
  } else {
    // Create new post
    const post = await prisma.post.create({
      data: {
        clipperId,
        platform,
        postUrl: data.postUrl,
        postId: data.postId,
        title: data.title,
        thumbnail: data.thumbnail,
        views: data.views,
        likes: data.likes,
        comments: data.comments,
        shares: data.shares,
        postedAt: data.postedAt,
      },
    });

    // Create initial snapshot
    await prisma.metricSnapshot.create({
      data: {
        postId: post.id,
        views: data.views,
        likes: data.likes,
        comments: data.comments,
        shares: data.shares,
      },
    });

    return { isNew: true };
  }
}

// Vercel Cron handler - runs daily at midnight UTC
export async function GET(request: NextRequest) {
  // This endpoint can be triggered by Vercel Cron
  // Configure in vercel.json: { "crons": [{ "path": "/api/refresh", "schedule": "0 0 * * *" }] }
  return POST(request);
}
