import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { UpdateClipperSchema, validateBody } from "@/lib/validation";
import { logRequest } from "@/lib/logger";

type RouteParams = { params: Promise<{ id: string }> };

// GET a single clipper with all posts and stats
// Query params:
//   - fromDate=YYYY-MM-DD: Filter posts from this date
//   - toDate=YYYY-MM-DD: Filter posts until this date
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now();

  try {
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
      logRequest(request, 404, startTime, "Clipper not found");
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

    logRequest(request, 200, startTime);
    return NextResponse.json({
      ...clipper,
      posts: postsWithPayable,
      totalViews,
      totalPayableViews,
      totalLikes,
      totalComments,
      totalShares,
    });
  } catch (error) {
    logRequest(request, 500, startTime, String(error));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT update a clipper
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now();

  try {
    const { id } = await params;

    // Validate input with Zod
    const validation = await validateBody(request, UpdateClipperSchema);
    if (!validation.success) {
      logRequest(request, 400, startTime, validation.error);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { name, clipperGroup, youtubeChannel, tiktokUsername, instagramUsername } = validation.data;

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

    logRequest(request, 200, startTime);
    return NextResponse.json(clipper);
  } catch (error) {
    logRequest(request, 500, startTime, String(error));
    return NextResponse.json({ error: "Failed to update clipper" }, { status: 500 });
  }
}

// DELETE a clipper
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now();

  try {
    const { id } = await params;

    await prisma.clipper.delete({
      where: { id },
    });

    logRequest(request, 200, startTime);
    return NextResponse.json({ success: true });
  } catch (error) {
    logRequest(request, 500, startTime, String(error));
    return NextResponse.json({ error: "Failed to delete clipper" }, { status: 500 });
  }
}
