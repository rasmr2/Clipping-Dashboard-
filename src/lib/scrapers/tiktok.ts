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

    // Posts older than 6 weeks don't need refreshing
    const sixWeeksAgo = new Date(Date.now() - 6 * 7 * 24 * 60 * 60 * 1000);

    try {
      const allVideos: PostMetrics[] = [];
      let cursor: string | undefined = undefined;
      let hasMore = true;
      const maxPages = 10; // Limit to prevent infinite loops (10 pages * 35 = 350 posts max)
      let pageCount = 0;
      let reachedOldPosts = false;

      while (hasMore && pageCount < maxPages && !reachedOldPosts) {
        const apiUrl: string = cursor
          ? `https://${this.apiHost}/user/posts?unique_id=${cleanUsername}&count=35&cursor=${cursor}`
          : `https://${this.apiHost}/user/posts?unique_id=${cleanUsername}&count=35`;

        const res = await fetch(apiUrl, {
          headers: {
            "X-RapidAPI-Key": this.apiKey,
            "X-RapidAPI-Host": this.apiHost,
          },
        });

        if (!res.ok) break;

        const data = await res.json();
        const videos = data.data?.videos || [];

        if (videos.length === 0) break;

        for (const video of videos) {
          const postedAt = new Date(video.create_time * 1000);

          // Stop if we've reached posts older than 6 weeks
          if (postedAt < sixWeeksAgo) {
            reachedOldPosts = true;
            break;
          }

          allVideos.push({
            postId: video.video_id,
            postUrl: `https://tiktok.com/@${cleanUsername}/video/${video.video_id}`,
            title: video.title,
            thumbnail: video.cover,
            views: video.play_count || 0,
            likes: video.digg_count || 0,
            comments: video.comment_count || 0,
            shares: video.share_count || 0,
            postedAt,
          });
        }

        // Check for pagination cursor
        cursor = data.data?.cursor;
        hasMore = data.data?.hasMore === true && cursor !== undefined;
        pageCount++;

        // Small delay to avoid rate limiting
        if (hasMore && !reachedOldPosts) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`TikTok: Fetched ${allVideos.length} recent posts for @${cleanUsername} (${pageCount} pages, stopped at 6 weeks)`);
      return allVideos;
    } catch (error) {
      console.error("TikTok scraper error:", error);
      return [];
    }
  }

  async getUserInfo(username: string): Promise<{ profilePicture: string | null }> {
    const cleanUsername = username.replace("@", "");

    try {
      const res = await fetch(
        `https://${this.apiHost}/user/info?unique_id=${cleanUsername}`,
        {
          headers: {
            "X-RapidAPI-Key": this.apiKey,
            "X-RapidAPI-Host": this.apiHost,
          },
        }
      );

      if (!res.ok) return { profilePicture: null };

      const data = await res.json();
      const avatar = data.data?.user?.avatarLarger || data.data?.user?.avatarMedium || data.data?.user?.avatarThumb;

      return { profilePicture: avatar || null };
    } catch (error) {
      console.error("TikTok user info error:", error);
      return { profilePicture: null };
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
