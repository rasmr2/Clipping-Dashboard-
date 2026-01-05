import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET all clippers with aggregated stats
export async function GET() {
  const clippers = await prisma.clipper.findMany({
    include: {
      posts: {
        select: {
          views: true,
          likes: true,
          comments: true,
          shares: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Calculate totals for each clipper
  const clippersWithStats = clippers.map((clipper) => {
    const totalViews = clipper.posts.reduce((sum, post) => sum + post.views, 0);
    const totalLikes = clipper.posts.reduce((sum, post) => sum + post.likes, 0);
    const totalComments = clipper.posts.reduce((sum, post) => sum + post.comments, 0);
    const totalShares = clipper.posts.reduce((sum, post) => sum + post.shares, 0);
    const postCount = clipper.posts.length;

    return {
      id: clipper.id,
      name: clipper.name,
      youtubeChannel: clipper.youtubeChannel,
      tiktokUsername: clipper.tiktokUsername,
      instagramUsername: clipper.instagramUsername,
      createdAt: clipper.createdAt,
      totalViews,
      totalLikes,
      totalComments,
      totalShares,
      postCount,
    };
  });

  // Sort by total views descending
  clippersWithStats.sort((a, b) => b.totalViews - a.totalViews);

  return NextResponse.json(clippersWithStats);
}

// POST create a new clipper
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, youtubeChannel, tiktokUsername, instagramUsername } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const clipper = await prisma.clipper.create({
    data: {
      name,
      youtubeChannel: youtubeChannel || null,
      tiktokUsername: tiktokUsername || null,
      instagramUsername: instagramUsername || null,
    },
  });

  return NextResponse.json(clipper);
}
