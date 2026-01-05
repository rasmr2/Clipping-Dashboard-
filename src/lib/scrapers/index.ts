import { YouTubeScraper } from "./youtube";
import { TikTokScraper } from "./tiktok";
import { InstagramScraper } from "./instagram";
import { PostMetrics } from "./types";

export { YouTubeScraper, TikTokScraper, InstagramScraper };
export type { PostMetrics, SocialMediaScraper } from "./types";

// Helper to get a scraper instance for a platform
export function getScraper(platform: "youtube" | "tiktok" | "instagram") {
  switch (platform) {
    case "youtube":
      return new YouTubeScraper();
    case "tiktok":
      return new TikTokScraper();
    case "instagram":
      return new InstagramScraper();
  }
}

// Check if API key is configured
export function isScrapingEnabled(): boolean {
  return !!process.env.RAPIDAPI_KEY;
}
