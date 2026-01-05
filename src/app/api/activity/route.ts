import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { logRequest } from "@/lib/logger";

type PostActivity = {
  date: string;
  count: number;
  views: number;
  posts: Array<{
    title: string;
    views: number;
    clipperName: string;
    platform: string;
  }>;
};

// GET posting activity for calendar heatmap
// Query params:
//   - fromDate=YYYY-MM-DD: Filter posts from this date
//   - toDate=YYYY-MM-DD: Filter posts until this date
//   - clipperId=X: Filter by specific clipper ID
//   - clipperGroup=X: Filter by specific clipper group
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const clipperId = searchParams.get("clipperId");
    const clipperGroup = searchParams.get("clipperGroup");

    // Default to last year if no dates specified
    const defaultFromDate = new Date();
    defaultFromDate.setFullYear(defaultFromDate.getFullYear() - 1);

    // Build date filter
    const dateFilter: { postedAt?: { gte?: Date; lte?: Date } } = {
      postedAt: {
        gte: fromDate ? new Date(fromDate) : defaultFromDate,
      }
    };

    if (toDate) {
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.postedAt!.lte = endDate;
    }

    // Build clipper filter
    const clipperFilter: { clipperId?: string; clipper?: { clipperGroup: string } } = {};
    if (clipperId) {
      clipperFilter.clipperId = clipperId;
    }
    if (clipperGroup) {
      clipperFilter.clipper = { clipperGroup };
    }

    // Fetch posts
    const posts = await prisma.post.findMany({
      where: {
        ...dateFilter,
        ...clipperFilter,
        postedAt: { not: null, ...dateFilter.postedAt },
      },
      include: {
        clipper: {
          select: {
            name: true,
            clipperGroup: true,
          },
        },
      },
      orderBy: { postedAt: "desc" },
    });

    // Group by date
    const activity: Record<string, PostActivity> = {};

    posts.forEach(post => {
      if (!post.postedAt) return;

      const dateStr = post.postedAt.toISOString().split("T")[0];

      if (!activity[dateStr]) {
        activity[dateStr] = {
          date: dateStr,
          count: 0,
          views: 0,
          posts: [],
        };
      }

      activity[dateStr].count++;
      activity[dateStr].views += post.views;
      activity[dateStr].posts.push({
        title: post.title || "Untitled",
        views: post.views,
        clipperName: post.clipper?.name || "Unknown",
        platform: post.platform,
      });
    });

    // Fill in missing dates with zeros (for the last year)
    const today = new Date();
    const startDate = fromDate ? new Date(fromDate) : defaultFromDate;
    const currentDate = new Date(startDate);

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split("T")[0];
      if (!activity[dateStr]) {
        activity[dateStr] = {
          date: dateStr,
          count: 0,
          views: 0,
          posts: [],
        };
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    logRequest(request, 200, startTime);
    return NextResponse.json({
      activity,
      totalPosts: posts.length,
      filters: {
        fromDate,
        toDate,
        clipperId,
        clipperGroup,
      },
    });
  } catch (error) {
    logRequest(request, 500, startTime, String(error));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
