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
    // Extract channel ID or handle from URL
    const channelId = this.extractChannelId(channelUrl);
    if (!channelId) return [];

    try {
      // Get channel uploads playlist
      const channelRes = await fetch(
        `https://${this.apiHost}/channels?part=contentDetails&id=${channelId}`,
        {
          headers: {
            "X-RapidAPI-Key": this.apiKey,
            "X-RapidAPI-Host": this.apiHost,
          },
        }
      );

      if (!channelRes.ok) return [];

      const channelData = await channelRes.json();
      const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) return [];

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

  private extractChannelId(url: string): string | null {
    const patterns = [
      /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/@([a-zA-Z0-9_-]+)/,
      /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
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
