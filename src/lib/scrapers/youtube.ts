import { PostMetrics, SocialMediaScraper } from "./types";

// YouTube scraper using RapidAPI YouTube v3
// Sign up at: https://rapidapi.com/ytdlfree/api/youtube-v31/
export class YouTubeScraper implements SocialMediaScraper {
  private apiKey: string;
  private apiHost = "youtube-v31.p.rapidapi.com";

  constructor() {
    const key = process.env.RAPIDAPI_KEY;
    if (!key) {
      throw new Error("RAPIDAPI_KEY environment variable is required");
    }
    this.apiKey = key;
  }

  async getChannelPosts(channelUrl: string): Promise<PostMetrics[]> {
    // Extract channel ID or handle from URL/handle string
    const { type, value } = this.extractChannelIdentifier(channelUrl);
    console.log(`YouTube: Processing channel "${channelUrl}" -> type=${type}, value=${value}`);
    if (!value) {
      console.log("YouTube: No value extracted, skipping");
      return [];
    }

    try {
      // First, try to get channel ID via search if we have a handle
      let channelId = type === "id" ? value : null;

      if (type === "handle") {
        // Search for the channel to get its ID
        console.log(`YouTube: Searching for channel handle: ${value}`);
        const searchRes = await fetch(
          `https://${this.apiHost}/search?part=snippet&q=${encodeURIComponent(value)}&type=channel&maxResults=1`,
          {
            headers: {
              "X-RapidAPI-Key": this.apiKey,
              "X-RapidAPI-Host": this.apiHost,
            },
          }
        );

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          channelId = searchData.items?.[0]?.snippet?.channelId;
          console.log(`YouTube: Search found channel ID: ${channelId}`);
        }
      }

      if (!channelId) {
        console.log("YouTube: Could not find channel ID");
        return [];
      }

      // Get channel uploads playlist using channel ID
      console.log(`YouTube: Fetching channel details for ID: ${channelId}`);
      const channelRes = await fetch(
        `https://${this.apiHost}/channels?part=contentDetails&id=${channelId}`,
        {
          headers: {
            "X-RapidAPI-Key": this.apiKey,
            "X-RapidAPI-Host": this.apiHost,
          },
        }
      );

      if (!channelRes.ok) {
        console.log(`YouTube: Channel request failed with status ${channelRes.status}`);
        const errorText = await channelRes.text();
        console.log(`YouTube: Error response: ${errorText.substring(0, 200)}`);
        return [];
      }

      const channelData = await channelRes.json();
      console.log(`YouTube: Channel data items: ${channelData.items?.length || 0}`);
      const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        console.log("YouTube: No uploads playlist found");
        return [];
      }
      console.log(`YouTube: Found uploads playlist: ${uploadsPlaylistId}`);

      // Get videos from uploads playlist
      const videosRes = await fetch(
        `https://${this.apiHost}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50`,
        {
          headers: {
            "X-RapidAPI-Key": this.apiKey,
            "X-RapidAPI-Host": this.apiHost,
          },
        }
      );

      if (!videosRes.ok) return [];

      const videosData = await videosRes.json();
      const videoIds = videosData.items?.map((item: { snippet: { resourceId: { videoId: string } } }) =>
        item.snippet.resourceId.videoId
      ) || [];

      if (videoIds.length === 0) return [];

      // Get video statistics
      const statsRes = await fetch(
        `https://${this.apiHost}/videos?part=snippet,statistics&id=${videoIds.join(",")}`,
        {
          headers: {
            "X-RapidAPI-Key": this.apiKey,
            "X-RapidAPI-Host": this.apiHost,
          },
        }
      );

      if (!statsRes.ok) return [];

      const statsData = await statsRes.json();
      return (statsData.items || []).map((video: {
        id: string;
        snippet: { title: string; thumbnails?: { default?: { url: string } }; publishedAt: string };
        statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
      }) => ({
        postId: video.id,
        postUrl: `https://youtube.com/watch?v=${video.id}`,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails?.default?.url,
        views: parseInt(video.statistics.viewCount || "0"),
        likes: parseInt(video.statistics.likeCount || "0"),
        comments: parseInt(video.statistics.commentCount || "0"),
        shares: 0, // YouTube API doesn't provide share count
        postedAt: new Date(video.snippet.publishedAt),
      }));
    } catch (error) {
      console.error("YouTube scraper error:", error);
      return [];
    }
  }

  async getPostMetrics(postUrl: string): Promise<PostMetrics | null> {
    const videoId = this.extractVideoId(postUrl);
    if (!videoId) return null;

    try {
      const res = await fetch(
        `https://${this.apiHost}/videos?part=snippet,statistics&id=${videoId}`,
        {
          headers: {
            "X-RapidAPI-Key": this.apiKey,
            "X-RapidAPI-Host": this.apiHost,
          },
        }
      );

      if (!res.ok) return null;

      const data = await res.json();
      const video = data.items?.[0];
      if (!video) return null;

      return {
        postId: video.id,
        postUrl,
        title: video.snippet.title,
        thumbnail: video.snippet.thumbnails?.default?.url,
        views: parseInt(video.statistics.viewCount || "0"),
        likes: parseInt(video.statistics.likeCount || "0"),
        comments: parseInt(video.statistics.commentCount || "0"),
        shares: 0,
        postedAt: new Date(video.snippet.publishedAt),
      };
    } catch (error) {
      console.error("YouTube post metrics error:", error);
      return null;
    }
  }

  private extractChannelIdentifier(input: string): { type: "handle" | "id"; value: string | null } {
    // Handle direct @username format (e.g., "@RasmrFeed")
    if (input.startsWith("@")) {
      return { type: "handle", value: input.substring(1) };
    }

    // Handle URLs with @username (e.g., "youtube.com/@RasmrFeed")
    const handleMatch = input.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/);
    if (handleMatch) {
      return { type: "handle", value: handleMatch[1] };
    }

    // Handle channel ID URLs (e.g., "youtube.com/channel/UC...")
    const channelIdMatch = input.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
    if (channelIdMatch) {
      return { type: "id", value: channelIdMatch[1] };
    }

    // Handle custom URL (e.g., "youtube.com/c/ChannelName")
    const customMatch = input.match(/youtube\.com\/c\/([a-zA-Z0-9_-]+)/);
    if (customMatch) {
      return { type: "handle", value: customMatch[1] };
    }

    // If it looks like a channel ID (starts with UC), use it directly
    if (input.startsWith("UC") && input.length === 24) {
      return { type: "id", value: input };
    }

    // Otherwise treat as a handle
    if (input.length > 0) {
      return { type: "handle", value: input };
    }

    return { type: "handle", value: null };
  }

  private extractVideoId(url: string): string | null {
    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
      /youtu\.be\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }
}
