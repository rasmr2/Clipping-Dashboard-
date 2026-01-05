# Clipper Dashboard

Analytics dashboard for tracking content clipper performance across social media platforms (TikTok, YouTube, Instagram).

## Features

### Clipper Management
- **Multi-platform tracking** - Track clippers across TikTok, YouTube, and Instagram from a single dashboard
- **Clipper grouping** - Group multiple accounts under one clipper identity (e.g., "Kesvi" can have multiple TikTok pages)
- **Leaderboard views** - View stats by individual page or aggregated by clipper

### Analytics
- **Payable Views** - Views capped at 1M per post for payment calculations (a post with 1.5M views = 1M payable views)
- **Date filtering** - Filter all stats by custom date ranges
- **Topic/Hashtag analytics** - Track performance by hashtags with auto-normalization of similar tags (e.g., #memecoin and #memecoins grouped together)
- **Posting frequency calendar** - Visual heatmap showing daily posting activity with month-by-month navigation

### Data Collection
- **Automated scraping** - Fetches metrics from TikTok, YouTube, and Instagram via RapidAPI
- **Pagination support** - Fetches up to 350 posts per TikTok account
- **Historical snapshots** - Stores metric snapshots over time for trend analysis

## Tech Stack

- **Framework**: Next.js 16 with Turbopack
- **Database**: SQLite (local) / Turso LibSQL (production)
- **ORM**: Prisma 7
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **APIs**: RapidAPI (TikTok Scraper, YouTube v3)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── clippers/       # CRUD for clippers, stats aggregation
│   │   ├── activity/       # Posting activity for calendar heatmap
│   │   ├── frequency/      # Posting frequency analytics
│   │   ├── hashtags/       # Topic/hashtag analytics
│   │   └── refresh/        # Trigger data refresh from APIs
│   ├── clippers/[id]/      # Individual clipper detail page
│   ├── hashtags/           # Full hashtag analytics page
│   └── page.tsx            # Main dashboard with tabs
├── components/
│   ├── AddClipperModal.tsx
│   ├── DateRangePicker.tsx
│   └── PostingCalendarHeatmap.tsx
└── lib/
    ├── db.ts               # Prisma client setup (SQLite/Turso)
    ├── utils.ts            # Utility functions
    └── scrapers/
        ├── index.ts        # Scraper factory
        ├── types.ts        # Shared types
        ├── tiktok.ts       # TikTok API scraper
        ├── youtube.ts      # YouTube API scraper
        └── instagram.ts    # Instagram API scraper
```

## Database Schema

```prisma
model Clipper {
  id                String    # Unique identifier
  name              String    # Display name
  clipperGroup      String?   # Group name for consolidation
  profilePicture    String?   # Profile picture URL
  youtubeChannel    String?   # YouTube channel URL or handle
  tiktokUsername    String?   # TikTok username
  instagramUsername String?   # Instagram username
  posts             Post[]
}

model Post {
  id        String          # Unique identifier
  clipperId String          # Reference to clipper
  platform  String          # "youtube", "tiktok", "instagram"
  postUrl   String          # Direct URL to post
  postId    String?         # Platform-specific ID
  title     String?         # Post title/caption
  thumbnail String?         # Thumbnail URL
  views     Int             # View count
  likes     Int             # Like count
  comments  Int             # Comment count
  shares    Int             # Share count
  postedAt  DateTime?       # When post was published
  snapshots MetricSnapshot[]
}

model MetricSnapshot {
  id         String    # Unique identifier
  postId     String    # Reference to post
  views      Int
  likes      Int
  comments   Int
  shares     Int
  recordedAt DateTime  # When snapshot was taken
}
```

## Setup

### Prerequisites
- Node.js 18+
- RapidAPI account with subscriptions to:
  - [TikTok Scraper](https://rapidapi.com/tikwm-tikwm-default/api/tiktok-scraper7/)
  - [YouTube v3](https://rapidapi.com/ytdlfree/api/youtube-v31/)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your RAPIDAPI_KEY

# Initialize database
npx prisma db push

# Start development server
npm run dev
```

### Environment Variables

```env
# Required for scraping
RAPIDAPI_KEY=your_rapidapi_key_here

# For production (Turso database)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_auth_token
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clippers` | GET | List all clippers with stats |
| `/api/clippers` | POST | Create a new clipper |
| `/api/clippers?grouped=true` | GET | Get clippers aggregated by group |
| `/api/clippers/[id]` | GET | Get single clipper with posts |
| `/api/clippers/[id]` | DELETE | Delete a clipper |
| `/api/refresh` | POST | Refresh data from all platforms |
| `/api/hashtags` | GET | Get hashtag analytics |
| `/api/activity` | GET | Get posting activity by date |
| `/api/frequency` | GET | Get posting frequency stats |

### Query Parameters

Most endpoints support:
- `fromDate` - Filter from date (YYYY-MM-DD)
- `toDate` - Filter to date (YYYY-MM-DD)
- `clipperGroup` - Filter by clipper group name

## Deployment

### Vercel (Recommended)

1. Push to GitHub (database and env files are gitignored)
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Set up Turso database for production

### Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --yes
```

## Key Concepts

### Payable Views
Views are capped at 1,000,000 per post for payment calculations. This prevents viral outliers from skewing payment calculations.

```typescript
const payableViews = Math.min(post.views, 1_000_000);
```

### Hashtag Normalization
Similar hashtags are automatically grouped:
- `#memecoin`, `#memecoins`, `#memecointok` → `#memecoin`
- `#crypto`, `#cryptocurrency` → `#crypto`
- `#pokemon`, `#pokemontok` → `#pokemon`

### Clipper Groups
Multiple social media accounts can be grouped under one clipper identity for consolidated reporting.

## Privacy

The following files are gitignored and will NOT be uploaded to GitHub:
- `.env*` - API keys and secrets
- `dev.db` - Local SQLite database with all clipper/post data
- `/src/generated/prisma` - Generated Prisma client

## License

Private - All rights reserved
