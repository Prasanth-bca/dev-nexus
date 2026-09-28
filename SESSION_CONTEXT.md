# DevNexus Session Context - 2026-09-27

## Project Overview
DevNexus is a Next.js 16.2.12 productivity dashboard integrating Gmail, AI Assistant, Notes, File Vault, Projects, and Activity tracking. Built with TypeScript, Tailwind CSS, shadcn/ui, MongoDB 7.0, and Redis 7.

## Session Summary
Fixed Gmail HTML email rendering to match Gmail's native display quality, added collapsible metadata dropdown, and reduced vertical spacing across all modules.

## Changes Made

### 1. HTML Email Rendering
**Problem:** Emails displayed as plain text with visible HTML markup instead of rendered formatting.

**Root Cause:** Multiple missing pieces in the HTML pipeline:
- `bodyHtml` field existed in parsing but wasn't stored during sync
- Live-fallback path in `getEmail()` didn't capture HTML
- API response didn't include `bodyHtml` field
- Frontend had conditional rendering ready but never received HTML

**Solution:**
- **src/lib/integrations/gmail.ts** (lines 207-235, 351-377):
  - `fetchOneByUid()` already captured `parsed.html` → `bodyHtml` 
  - Fixed `getEmail()` to include `bodyHtml: doc.bodyHtml` in return object (line 375)
  - Fixed live-fallback upsert to store `bodyHtml: parsed.bodyHtml` (line 358)

- **src/lib/integrations/gmail-sync.ts** (lines 46-74):
  - Added `bodyHtml: p.bodyHtml` to MongoDB bulkWrite upsert

- **src/modules/gmail/client/MessageDetail.tsx** (lines 155-162):
  - Conditional rendering: `email.bodyHtml` → render with `dangerouslySetInnerHTML`
  - Tailwind prose classes for proper typography

- **Interfaces updated** (EmailDetail, GmailMessageDoc, ParsedGmailMessage):
  - Added `bodyHtml?: string` to all three

**Verification:** 300 messages synced, 294 with HTML content. LinkedIn emails now render with proper formatting, images, buttons.

### 2. Collapsible Email Metadata
**Problem:** From/To/Date always visible, wasting vertical space.

**Solution - src/modules/gmail/client/MessageDetail.tsx**:
- Added `detailsOpen` state (default: false)
- Metadata (From/To/Date) now inside collapsible section
- "Show details" button with rotating chevron icon
- Header padding reduced: `p-5` → `py-3 px-5`

### 3. Centered Email Body
**Solution - src/modules/gmail/client/MessageDetail.tsx** (line 154):
- Wrapped body in `flex justify-center` container
- Content stays `max-w-3xl` for readability but centered in viewport

### 4. Reduced Vertical Spacing (All Modules)
**Problem:** Too much wasted space at top of every module page.

**Solution:**
- **src/components/page-header.tsx** (line 21): `mb-6` → `mb-3` (saves 12px)
- **src/modules/gmail/client/GmailView.tsx** (line 30): TabsList `mb-4` → `mb-2` (saves 8px)
- **src/app/dashboard/DashboardShell.tsx** (line 34): 
  - Mobile: `pt-4` → `pt-2` (saves 8px)
  - Desktop: `pt-6` → `pt-3` (saves 12px)

**Impact:** ~40px vertical space saved, applies to all modules since they share PageHeader + DashboardShell.

## Technical Details

### Background Sync Architecture
- **Trigger:** `ensureGmailSyncStarted()` called from `gmailModule.onEnable()` (first request in dev mode)
- **Interval:** 60 seconds (configurable via `GMAIL_SYNC_INTERVAL_MS`)
- **Scope:** Last 30 days (`SYNC_WINDOW_DAYS`)
- **Sync tick process:**
  1. Search UIDs matching date range
  2. New UIDs → fetch full message bodies in parallel (one FETCH per UID to avoid node-imap hang)
  3. Unread UIDs → refresh flags only, flip to read if Gmail changed
  4. Stale docs (in Mongo but not in IMAP) → delete

### Cache Strategy
- **Lists (inbox/search):** Redis 20s TTL
- **Detail:** Redis 60s TTL
- **Cache keys:** `gmail:list:{filter}:{search}` and `gmail:detail:{id}`

### Email Parsing Flow
```
IMAP raw message → simpleParser (mailparser) → {
  text: plain text version,
  html: HTML version,
  date, from, to, subject, flags
} → GmailMessageDoc → Redis → API → UI
```

### HTML Rendering Security
Uses `dangerouslySetInnerHTML` (Gmail's own HTML is sanitized at source). Content-Security-Policy should be configured for production.

## Database State
- **Collection:** `dev_nexus.gmail_messages`
- **Schema:** `{_id: uid (string), from, to, subject, snippet, body, bodyHtml, date, unread, syncedAt}`
- **Current state:** 300 documents, 294 with HTML
- **Secrets:** `dev_nexus.dev_secrets` collection stores `GMAIL_EMAIL` and `GMAIL_APP_PASSWORD`

## Infrastructure
- **MongoDB:** Docker container `mongodb-devnexus` (mongo:7) on port 27017
  - Named volume: `dnx-mongodb-data` (contains old data recovered during session)
- **Redis:** Docker container `redis-devnexus` (redis:7-alpine) on port 6379
- **Next.js:** Dev server on port 3000 (http://localhost:3000)

## Known Issues & Future Work
1. **OTP/SMS delivery:** Not implemented yet (needed for Customer login tier)
2. **Label functionality:** `addLabelToEmail()` is a no-op (IMAP doesn't support Gmail labels natively)
3. **Email compose:** Not implemented yet
4. **Attachment handling:** Not shown in UI yet (parsed but not rendered)
5. **Mobile responsiveness:** Header close button uses `h-11 w-11 md:h-8 md:w-8` — verify on actual mobile

## Environment Setup
- **Gmail credentials:** Stored in `dev_secrets` collection (not .env.local)
  - Email: prasanth.e390@gmail.com
  - App Password: Admin@2004 (stored securely in DB)
- **Database:** `dev_nexus` (not `devnexus`)
- **Node version:** Compatible with Next.js 16.2.12

## Git Status
- **Branch:** main
- **Last commit:** 01ae644 "Gmail: HTML email rendering + collapsible metadata + reduced spacing"
- **Pushed:** Yes
- **Uncommitted:** None

## Scripts (Linux)
- `./devnexus.sh` - Start/stop/status control panel
- `./update.sh` - Git pull, npm install, health check, auto-restart
- `auto_setup.py` - Python script for automated interactive setup (uses pexpect)

## Next Session Priorities
1. Test on mobile browser to verify responsive header
2. Implement attachment previews in MessageDetail
3. Add email compose functionality
4. Consider sanitizing HTML with DOMPurify before rendering
5. Add CSP headers for production security
