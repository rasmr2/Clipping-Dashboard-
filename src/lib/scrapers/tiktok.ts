import { PostMetrics, SocialMediaScraper } from "./types";

// TikTok scraper using RapidAPI TikTok API
// Sign up at: https://rapidapi.com/tikwm-tikwm-default/api/tiktok-scraper7/
export class TikTokScraper implements SocialMediaScraper {
  private apiKey: string;
  private apiHost = "tiktok-scraper7.p.rapidapi.com";

  constructor() {
    const key = process.env.RAPIDAPI_KEY;
    if (!key) {
      throw new Error("RAPIDAPI_KEY environment variable is required");
    }
    this.apiKey = key;
  }

  async getChannelPosts(username: string): Promise<PostMetrics[]> {
    // Clean username (remove @ if present)
    const cleanUsername = username.replace("@", "");

    try {
      const res = await fetch(
        `https://${this.apiHost}/user/posts?unique_id=${cleanUsername}&count=30`,
        {
          headers: {
            "X-RapidAPI-Key": this.apiKey,
            "X-RapidAPI-Host": this.apiHost,
          },
        }
      );

      if (!res.ok) return [];

      const data = await res.json();
      const videos = data.data?.videos || [];

      return videos.map((video: {
        video_id: string;
        title?: string;
        cover?: string;
        play_count: number;
        digg_count: number;
        comment_count: number;
        share_count: number;
        create_time: number;
      }) => ({
        postId: video.video_id,
        postUrl: `https://tiktok.com/@${cleanUsername}/video/${video.video_id}`,
        title: video.title,
        thumbnail: video.cover,
        views: video.play_count || 0,
        likes: video.digg_count || 0,
        comments: video.comment_count || 0,
        shares: video.share_count || 0,
        postedAt: new Date(video.create_time * 1000),
      }));
    } catch (error) {
      console.error("TikTok scraper error:", error);
      return [];
    }
  }

  async getPostMetrics(postUrl: string): Promise<PostMetrics | null> {
    try {
      const res = await fetch(
        `https://${this.apiHost}/video/info?url=${encodeURIComponent(postUrl)}`,
        {
          headers: {
            "X-RapidAPI-Key": this.apiKey,
            "X-RapidAPI-Host": this.apiHost,
          },
        }
      );

      if (!res.ok) return null;

      const data = await res.json();
      const video = data.data;
      if (!video) return null;

      return {
        postId: video.id,
        postUrl,
        title: video.title,
        thumbnail: video.cover,
        views: video.play_count || 0,
        likes: video.digg_count || 0,
        comments: video.comment_count || 0,
        shares: video.share_count || 0,
        postedAt: video.create_time ? new Date(video.create_time * 1000) : undefined,
      };
    } catch (error) {
      console.error("TikTok post metrics error:", error);
      return null;
    }
  }
}
