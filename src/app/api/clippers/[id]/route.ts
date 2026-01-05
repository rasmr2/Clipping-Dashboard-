import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

// GET a single clipper with all posts and stats
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;

  const clipper = await prisma.clipper.findUnique({
    where: { id },
    include: {
      posts: {
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

  // Calculate totals
  const totalViews = clipper.posts.reduce((sum, post) => sum + post.views, 0);
  const totalLikes = clipper.posts.reduce((sum, post) => sum + post.likes, 0);
  const totalComments = clipper.posts.reduce((sum, post) => sum + post.comments, 0);
  const totalShares = clipper.posts.reduce((sum, post) => sum + post.shares, 0);

  return NextResponse.json({
    ...clipper,
    totalViews,
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
  const { name, youtubeChannel, tiktokUsername, instagramUsername } = body;

  const clipper = await prisma.clipper.update({
    where: { id },
    data: {
      name,
      youtubeChannel: youtubeChannel || null,
      tiktokUsername: tiktokUsername || null,
      instagramUsername: instagramUsername || null,
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
