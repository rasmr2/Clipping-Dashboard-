import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

// GET a single clipper with all posts and stats
// Query params:
//   - fromDate=YYYY-MM-DD: Filter posts from this date
//   - toDate=YYYY-MM-DD: Filter posts until this date
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  // Build date filter for posts
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

  const clipper = await prisma.clipper.findUnique({
    where: { id },
    include: {
      posts: {
        where: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        include: {
          snapshots: {
            orderBy: { recordedAt: "desc" },
            take: 30, // Last 30 snapshots for charts
          },
        },
        orderBy: { views: "desc" },
      },
    },
  });

  if (!clipper) {
    return NextResponse.json({ error: "Clipper not found" }, { status: 404 });
  }

  // Payable views cap: 1,000,000 per post
  const PAYABLE_VIEW_CAP = 1_000_000;

  // Calculate totals
  const totalViews = clipper.posts.reduce((sum, post) => sum + post.views, 0);
  const totalPayableViews = clipper.posts.reduce(
    (sum, post) => sum + Math.min(post.views, PAYABLE_VIEW_CAP),
    0
  );
  const totalLikes = clipper.posts.reduce((sum, post) => sum + post.likes, 0);
  const totalComments = clipper.posts.reduce((sum, post) => sum + post.comments, 0);
  const totalShares = clipper.posts.reduce((sum, post) => sum + post.shares, 0);

  // Add payableViews to each post
  const postsWithPayable = clipper.posts.map((post) => ({
    ...post,
    payableViews: Math.min(post.views, PAYABLE_VIEW_CAP),
  }));

  return NextResponse.json({
    ...clipper,
    posts: postsWithPayable,
    totalViews,
    totalPayableViews,
    totalLikes,
    totalComments,
    totalShares,
  });
}

// PUT update a clipper
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  const body = await request.json();
  const { name, youtubeChannel, tiktokUsername, instagramUsername, clipperGroup } = body;

  const clipper = await prisma.clipper.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(clipperGroup !== undefined && { clipperGroup }),
      ...(youtubeChannel !== undefined && { youtubeChannel: youtubeChannel || null }),
      ...(tiktokUsername !== undefined && { tiktokUsername: tiktokUsername || null }),
      ...(instagramUsername !== undefined && { instagramUsername: instagramUsername || null }),
    },
  });

  return NextResponse.json(clipper);
}

// DELETE a clipper
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  await prisma.clipper.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
