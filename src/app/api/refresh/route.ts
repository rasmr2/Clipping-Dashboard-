import { prisma } from "@/lib/db";
import { getScraper, isScrapingEnabled, PostMetrics } from "@/lib/scrapers";
import { NextResponse } from "next/server";

export async function POST() {
  if (!isScrapingEnabled()) {
    return NextResponse.json(
      { error: "Scraping not configured. Set RAPIDAPI_KEY environment variable." },
      { status: 400 }
    );
  }

  try {
    // Get all clippers
    const clippers = await prisma.clipper.findMany();

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
        } catch (error) {
          console.error(`Error scraping ${platform} for ${clipper.name}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      newPosts: totalNewPosts,
      updatedPosts: totalPostsUpdated,
    });
  } catch (error) {
    console.error("Refresh error:", error);
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
export async function GET() {
  // This endpoint can be triggered by Vercel Cron
  // Configure in vercel.json: { "crons": [{ "path": "/api/refresh", "schedule": "0 0 * * *" }] }
  return POST();
}
