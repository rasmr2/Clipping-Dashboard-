import { PostMetrics, SocialMediaScraper } from "./types";

// Instagram scraper using RapidAPI Instagram Scraper 2025
// Sign up at: https://rapidapi.com/DavidGelling/api/instagram-scraper-20251
export class InstagramScraper implements SocialMediaScraper {
  private apiKey: string;
  private apiHost = "instagram-scraper-20251.p.rapidapi.com";

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
        `https://${this.apiHost}/v1/posts?username_or_id_or_url=${cleanUsername}`,
        {
          headers: {
            "X-RapidAPI-Key": this.apiKey,
            "X-RapidAPI-Host": this.apiHost,
          },
        }
      );

      if (!res.ok) return [];

      const data = await res.json();
      const posts = data.data?.items || data.items || data.posts || [];

      return posts.map((post: {
        id: string;
        code: string;
        caption?: { text: string };
        thumbnail_url?: string;
        play_count?: number;
        like_count: number;
        comment_count: number;
        taken_at: number;
      }) => ({
        postId: post.id,
        postUrl: `https://instagram.com/p/${post.code}`,
        title: post.caption?.text?.slice(0, 100),
        thumbnail: post.thumbnail_url,
        views: post.play_count || 0, // Views only for videos/reels
        likes: post.like_count || 0,
        comments: post.comment_count || 0,
        shares: 0, // Instagram API doesn't provide share count
        postedAt: new Date(post.taken_at * 1000),
      }));
    } catch (error) {
      console.error("Instagram scraper error:", error);
      return [];
    }
  }

  async getPostMetrics(postUrl: string): Promise<PostMetrics | null> {
    try {
      const res = await fetch(
        `https://${this.apiHost}/v1/post_info?code_or_id_or_url=${encodeURIComponent(postUrl)}`,
        {
          headers: {
            "X-RapidAPI-Key": this.apiKey,
            "X-RapidAPI-Host": this.apiHost,
          },
        }
      );

      if (!res.ok) return null;

      const data = await res.json();
      const post = data.data;
      if (!post) return null;

      return {
        postId: post.id,
        postUrl,
        title: post.caption?.text?.slice(0, 100),
        thumbnail: post.thumbnail_url,
        views: post.play_count || 0,
        likes: post.like_count || 0,
        comments: post.comment_count || 0,
        shares: 0,
        postedAt: post.taken_at ? new Date(post.taken_at * 1000) : undefined,
      };
    } catch (error) {
      console.error("Instagram post metrics error:", error);
      return null;
    }
  }
}
