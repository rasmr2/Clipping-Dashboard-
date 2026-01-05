import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET all clippers with aggregated stats
// Query params:
//   - grouped=true: Consolidate by clipperGroup
//   - clipperGroup=X: Filter by specific clipper group
//   - fromDate=YYYY-MM-DD: Filter posts from this date
//   - toDate=YYYY-MM-DD: Filter posts until this date
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const grouped = searchParams.get("grouped") === "true";
  const filterGroup = searchParams.get("clipperGroup");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  // Build date filter for posts
  const dateFilter: { postedAt?: { gte?: Date; lte?: Date } } = {};
  if (fromDate || toDate) {
    dateFilter.postedAt = {};
    if (fromDate) dateFilter.postedAt.gte = new Date(fromDate);
    if (toDate) {
      // Include the entire end date (set to end of day)
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.postedAt.lte = endDate;
    }
  }

  const clippers = await prisma.clipper.findMany({
    where: filterGroup ? { clipperGroup: filterGroup } : undefined,
    include: {
      posts: {
        where: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        select: {
          views: true,
          likes: true,
          comments: true,
          shares: true,
          postedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Payable views cap: 1,000,000 per post
  const PAYABLE_VIEW_CAP = 1_000_000;

  // Calculate totals for each clipper/page
  const clippersWithStats = clippers.map((clipper) => {
    const totalViews = clipper.posts.reduce((sum, post) => sum + post.views, 0);
    const totalPayableViews = clipper.posts.reduce(
      (sum, post) => sum + Math.min(post.views, PAYABLE_VIEW_CAP),
      0
    );
    const totalLikes = clipper.posts.reduce((sum, post) => sum + post.likes, 0);
    const totalComments = clipper.posts.reduce((sum, post) => sum + post.comments, 0);
    const totalShares = clipper.posts.reduce((sum, post) => sum + post.shares, 0);
    const postCount = clipper.posts.length;

    return {
      id: clipper.id,
      name: clipper.name,
      clipperGroup: clipper.clipperGroup,
      youtubeChannel: clipper.youtubeChannel,
      tiktokUsername: clipper.tiktokUsername,
      instagramUsername: clipper.instagramUsername,
      createdAt: clipper.createdAt,
      totalViews,
      totalPayableViews,
      totalLikes,
      totalComments,
      totalShares,
      postCount,
    };
  });

  // If grouped, consolidate by clipperGroup
  if (grouped) {
    const groupedMap = new Map<string, {
      clipperGroup: string;
      pages: typeof clippersWithStats;
      totalViews: number;
      totalPayableViews: number;
      totalLikes: number;
      totalComments: number;
      totalShares: number;
      postCount: number;
    }>();

    for (const clipper of clippersWithStats) {
      const group = clipper.clipperGroup || "Unknown";
      if (!groupedMap.has(group)) {
        groupedMap.set(group, {
          clipperGroup: group,
          pages: [],
          totalViews: 0,
          totalPayableViews: 0,
          totalLikes: 0,
          totalComments: 0,
          totalShares: 0,
          postCount: 0,
        });
      }
      const g = groupedMap.get(group)!;
      g.pages.push(clipper);
      g.totalViews += clipper.totalViews;
      g.totalPayableViews += clipper.totalPayableViews;
      g.totalLikes += clipper.totalLikes;
      g.totalComments += clipper.totalComments;
      g.totalShares += clipper.totalShares;
      g.postCount += clipper.postCount;
    }

    const groupedResults = Array.from(groupedMap.values());
    groupedResults.sort((a, b) => b.totalViews - a.totalViews);
    return NextResponse.json(groupedResults);
  }

  // Sort by total views descending
  clippersWithStats.sort((a, b) => b.totalViews - a.totalViews);

  return NextResponse.json(clippersWithStats);
}

// POST create a new clipper
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, clipperGroup, youtubeChannel, tiktokUsername, instagramUsername } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const clipper = await prisma.clipper.create({
    data: {
      name,
      clipperGroup: clipperGroup || name.split(" - ")[0] || name, // Auto-extract group from name
      youtubeChannel: youtubeChannel || null,
      tiktokUsername: tiktokUsername || null,
      instagramUsername: instagramUsername || null,
    },
  });

  return NextResponse.json(clipper);
}
