import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { logRequest } from "@/lib/logger";

type FrequencyData = {
  clipperId: string;
  clipperName: string;
  clipperGroup: string | null;
  profilePicture: string | null;
  platform: string;
  totalPosts: number;
  totalViews: number;
  avgViews: number;
  postsPerWeek: number;
  firstPostDate: string | null;
  lastPostDate: string | null;
  daysSinceFirstPost: number;
};

// GET posting frequency analytics
// Query params:
//   - fromDate=YYYY-MM-DD: Filter posts from this date
//   - toDate=YYYY-MM-DD: Filter posts until this date
//   - clipperGroup=X: Filter by specific clipper group
//   - platform=X: Filter by platform (youtube, tiktok, instagram)
//   - groupBy=clipper|page (default: page) - group by clipper or individual page
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const filterGroup = searchParams.get("clipperGroup");
    const filterPlatform = searchParams.get("platform");
    const groupBy = searchParams.get("groupBy") || "page";

    // Build date filter
    const dateFilter: { postedAt?: { gte?: Date; lte?: Date } } = {};
    if (fromDate || toDate) {
      dateFilter.postedAt = {};
      if (fromDate) dateFilter.postedAt.gte = new Date(fromDate);
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.postedAt.lte = endDate;
      }
    }

    // Fetch posts with clipper info
    const posts = await prisma.post.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 ? dateFilter : {}),
        clipper: filterGroup ? { clipperGroup: filterGroup } : undefined,
        ...(filterPlatform ? { platform: filterPlatform } : {}),
      },
      include: {
        clipper: {
          select: {
            id: true,
            name: true,
            clipperGroup: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { postedAt: "asc" },
    });

    if (groupBy === "clipper") {
      // Group by clipper (aggregate all pages under each clipper)
      const clipperData: Record<string, {
        clipperGroup: string;
        profilePicture: string | null;
        posts: Array<{ views: number; postedAt: Date | null }>;
      }> = {};

      posts.forEach(post => {
        const group = post.clipper?.clipperGroup || post.clipper?.name || "Unknown";
        if (!clipperData[group]) {
          clipperData[group] = {
            clipperGroup: group,
            profilePicture: post.clipper?.profilePicture || null,
            posts: [],
          };
        }
        clipperData[group].posts.push({
          views: post.views,
          postedAt: post.postedAt,
        });
        // Update profile picture if we find one
        if (!clipperData[group].profilePicture && post.clipper?.profilePicture) {
          clipperData[group].profilePicture = post.clipper.profilePicture;
        }
      });

      const results = Object.entries(clipperData).map(([group, data]) => {
        const postsWithDates = data.posts.filter(p => p.postedAt);
        const firstPost = postsWithDates.length > 0
          ? new Date(Math.min(...postsWithDates.map(p => p.postedAt!.getTime())))
          : null;
        const lastPost = postsWithDates.length > 0
          ? new Date(Math.max(...postsWithDates.map(p => p.postedAt!.getTime())))
          : null;

        const daysSinceFirst = firstPost
          ? Math.max(1, Math.ceil((Date.now() - firstPost.getTime()) / (1000 * 60 * 60 * 24)))
          : 0;
        const weeks = Math.max(1, daysSinceFirst / 7);

        const totalViews = data.posts.reduce((sum, p) => sum + p.views, 0);

        return {
          clipperGroup: group,
          profilePicture: data.profilePicture,
          totalPosts: data.posts.length,
          totalViews,
          avgViews: Math.round(totalViews / data.posts.length),
          postsPerWeek: Math.round((data.posts.length / weeks) * 10) / 10,
          firstPostDate: firstPost?.toISOString() || null,
          lastPostDate: lastPost?.toISOString() || null,
          daysSinceFirstPost: daysSinceFirst,
        };
      });

      logRequest(request, 200, startTime);
      return NextResponse.json({
        frequency: results.sort((a, b) => b.totalViews - a.totalViews),
        groupBy: "clipper",
      });
    }

    // Group by individual page (clipper + platform)
    const pageData: Record<string, {
      clipperId: string;
      clipperName: string;
      clipperGroup: string | null;
      profilePicture: string | null;
      platform: string;
      posts: Array<{ views: number; postedAt: Date | null }>;
    }> = {};

    posts.forEach(post => {
      const key = `${post.clipperId}-${post.platform}`;
      if (!pageData[key]) {
        pageData[key] = {
          clipperId: post.clipperId,
          clipperName: post.clipper?.name || "Unknown",
          clipperGroup: post.clipper?.clipperGroup || null,
          profilePicture: post.clipper?.profilePicture || null,
          platform: post.platform,
          posts: [],
        };
      }
      pageData[key].posts.push({
        views: post.views,
        postedAt: post.postedAt,
      });
    });

    const results: FrequencyData[] = Object.values(pageData).map(data => {
      const postsWithDates = data.posts.filter(p => p.postedAt);
      const firstPost = postsWithDates.length > 0
        ? new Date(Math.min(...postsWithDates.map(p => p.postedAt!.getTime())))
        : null;
      const lastPost = postsWithDates.length > 0
        ? new Date(Math.max(...postsWithDates.map(p => p.postedAt!.getTime())))
        : null;

      const daysSinceFirst = firstPost
        ? Math.max(1, Math.ceil((Date.now() - firstPost.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      const weeks = Math.max(1, daysSinceFirst / 7);

      const totalViews = data.posts.reduce((sum, p) => sum + p.views, 0);

      return {
        clipperId: data.clipperId,
        clipperName: data.clipperName,
        clipperGroup: data.clipperGroup,
        profilePicture: data.profilePicture,
        platform: data.platform,
        totalPosts: data.posts.length,
        totalViews,
        avgViews: Math.round(totalViews / data.posts.length),
        postsPerWeek: Math.round((data.posts.length / weeks) * 10) / 10,
        firstPostDate: firstPost?.toISOString() || null,
        lastPostDate: lastPost?.toISOString() || null,
        daysSinceFirstPost: daysSinceFirst,
      };
    });

    logRequest(request, 200, startTime);
    return NextResponse.json({
      frequency: results.sort((a, b) => b.totalViews - a.totalViews),
      groupBy: "page",
      filters: {
        fromDate,
        toDate,
        clipperGroup: filterGroup,
        platform: filterPlatform,
      },
    });
  } catch (error) {
    logRequest(request, 500, startTime, String(error));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
