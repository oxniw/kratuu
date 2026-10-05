# kratuu (กระทู้)

A minimalist two-tone (black and white) webboard platform inspired by Thai forum culture and Swiss editorial typography.

## Features

- **Strict 2-Color Palette**: Pure monochrome design (`#000000` & `#ffffff`) with an instant 1-click invert toggle (Dark / Light).
- **Frictionless Posting**: Write threads with a guest handle (`สมาชิกหมายเลข_xxxx`) and an optional 4-digit PIN for future edits or deletion.
- **Full Markdown Support**: Live preview editor with formatting controls for headings, quotes, lists, and code blocks.
- **Vote System**: Minimalist upvote and downvote counters (`▲` / `▼`).
- **Tag Filtering & Instant Search**: Filter topics by Thai or English tags, sort by Latest, Top, or Most Discussed.
- **Nested Discussions**: Multi-level reply threads to facilitate in-depth discourse.
- **Local Storage Library**: Bookmarks and reading history saved directly in your browser.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Database**: SQLite via `@libsql/client`
- **Markdown**: `marked`
- **Icons**: `lucide-react`

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.
# kratuu
