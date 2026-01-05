import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { logRequest } from "@/lib/logger";

// Normalization rules for similar hashtags
const HASHTAG_GROUPS: Record<string, string[]> = {
  // Crypto
  "crypto": ["crypto", "cryptocurrency", "cryptotok"],
  "memecoin": ["memecoin", "memecoins", "memecointok"],
  "solana": ["solana", "sol", "solanamemecoins"],
  "bitcoin": ["bitcoin", "btc"],
  "ethereum": ["ethereum", "eth"],
  "pumpfun": ["pumpfun", "pump", "pumpanddump"],

  // Pokemon/TCG
  "pokemon": ["pokemon", "pokemontok", "pokemontiktok", "pokemoncommunity"],
  "pokemoncards": ["pokemoncards", "pokemoncard", "pokemontcg"],
  "tcg": ["tcg", "tradingcards", "tradingcardgame"],

  // Looksmaxxing
  "looksmax": ["looksmax", "looksmaxxing", "looksmaxing", "bonesmashing"],
  "mewing": ["mewing", "mew", "mewingresults"],

  // Streaming
  "streamer": ["streamer", "streamers", "streaming", "twitchstreamer"],
  "vtuber": ["vtuber", "vtubers", "vtuberen"],

  // General
  "fyp": ["fyp", "foryou", "foryoupage", "viral"],
};

// Build reverse lookup
const NORMALIZE_MAP: Record<string, string> = {};
Object.entries(HASHTAG_GROUPS).forEach(([canonical, variants]) => {
  variants.forEach(v => {
    NORMALIZE_MAP[v] = canonical;
  });
});

function normalizeHashtag(tag: string): string {
  const cleaned = tag.toLowerCase().replace(/^#/, "");
  return NORMALIZE_MAP[cleaned] || cleaned;
}

function extractHashtags(title: string | null): string[] {
  if (!title) return [];
  const matches = title.match(/#[a-zA-Z0-9_]+/g) || [];
  return [...new Set(matches.map(t => normalizeHashtag(t)))];
}

type HashtagStats = {
  hashtag: string;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  postCount: number;
  avgViews: number;
  topPost: {
    title: string;
    views: number;
    postUrl: string;
  } | null;
  byClipper: Record<string, { views: number; posts: number }>;
  trend: {
    currentPeriod: number;
    previousPeriod: number;
    change: number;
  } | null;
};

// GET hashtag analytics
// Query params:
//   - fromDate=YYYY-MM-DD: Filter posts from this date
//   - toDate=YYYY-MM-DD: Filter posts until this date
//   - clipperGroup=X: Filter by specific clipper group
//   - limit=N: Limit results (default 50)
//   - sortBy=views|posts|avgViews|trend (default views)
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const filterGroup = searchParams.get("clipperGroup");
    const limit = parseInt(searchParams.get("limit") || "50");
    const sortBy = searchParams.get("sortBy") || "views";

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
      },
      include: {
        clipper: {
          select: { clipperGroup: true },
        },
      },
    });

    // Aggregate hashtag stats
    const hashtagData: Record<string, {
      views: number;
      likes: number;
      comments: number;
      shares: number;
      posts: Array<{ title: string; views: number; postUrl: string; clipperGroup: string; postedAt: Date | null }>;
      byClipper: Record<string, { views: number; posts: number }>;
    }> = {};

    posts.forEach(post => {
      const hashtags = extractHashtags(post.title);
      const clipperGroup = post.clipper?.clipperGroup || "Unknown";

      hashtags.forEach(tag => {
        if (!hashtagData[tag]) {
          hashtagData[tag] = {
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            posts: [],
            byClipper: {},
          };
        }

        hashtagData[tag].views += post.views;
        hashtagData[tag].likes += post.likes;
        hashtagData[tag].comments += post.comments;
        hashtagData[tag].shares += post.shares;
        hashtagData[tag].posts.push({
          title: post.title || "",
          views: post.views,
          postUrl: post.postUrl,
          clipperGroup,
          postedAt: post.postedAt,
        });

        if (!hashtagData[tag].byClipper[clipperGroup]) {
          hashtagData[tag].byClipper[clipperGroup] = { views: 0, posts: 0 };
        }
        hashtagData[tag].byClipper[clipperGroup].views += post.views;
        hashtagData[tag].byClipper[clipperGroup].posts++;
      });
    });

    // Calculate trend (last 7 days vs previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Build result array
    const results: HashtagStats[] = Object.entries(hashtagData)
      .filter(([tag]) => tag !== "fyp" && tag !== "rasmr") // Filter out generic tags
      .map(([hashtag, data]) => {
        const sortedPosts = [...data.posts].sort((a, b) => b.views - a.views);
        const topPost = sortedPosts[0] || null;

        // Calculate trend
        const currentPeriodViews = data.posts
          .filter(p => p.postedAt && new Date(p.postedAt) >= sevenDaysAgo)
          .reduce((sum, p) => sum + p.views, 0);
        const previousPeriodViews = data.posts
          .filter(p => p.postedAt && new Date(p.postedAt) >= fourteenDaysAgo && new Date(p.postedAt) < sevenDaysAgo)
          .reduce((sum, p) => sum + p.views, 0);

        const trend = previousPeriodViews > 0
          ? {
              currentPeriod: currentPeriodViews,
              previousPeriod: previousPeriodViews,
              change: ((currentPeriodViews - previousPeriodViews) / previousPeriodViews) * 100
            }
          : null;

        return {
          hashtag: `#${hashtag}`,
          totalViews: data.views,
          totalLikes: data.likes,
          totalComments: data.comments,
          totalShares: data.shares,
          postCount: data.posts.length,
          avgViews: Math.round(data.views / data.posts.length),
          topPost: topPost ? {
            title: topPost.title,
            views: topPost.views,
            postUrl: topPost.postUrl,
          } : null,
          byClipper: data.byClipper,
          trend,
        };
      });

    // Sort results
    const sortFunctions: Record<string, (a: HashtagStats, b: HashtagStats) => number> = {
      views: (a, b) => b.totalViews - a.totalViews,
      posts: (a, b) => b.postCount - a.postCount,
      avgViews: (a, b) => b.avgViews - a.avgViews,
      trend: (a, b) => (b.trend?.change || -Infinity) - (a.trend?.change || -Infinity),
    };

    results.sort(sortFunctions[sortBy] || sortFunctions.views);

    logRequest(request, 200, startTime);
    return NextResponse.json({
      hashtags: results.slice(0, limit),
      total: results.length,
      filters: {
        fromDate,
        toDate,
        clipperGroup: filterGroup,
      },
    });
  } catch (error) {
    logRequest(request, 500, startTime, String(error));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
