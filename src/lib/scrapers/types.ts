export type PostMetrics = {
  postId: string;
  postUrl: string;
  title?: string;
  thumbnail?: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  postedAt?: Date;
};

export type SocialMediaScraper = {
  getChannelPosts(channelUrl: string): Promise<PostMetrics[]>;
  getPostMetrics(postUrl: string): Promise<PostMetrics | null>;
};
