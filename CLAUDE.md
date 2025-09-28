# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
cd ongi-app
npm run dev          # Start development server (usually on http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database Management
```bash
npm run supabase -- login                    # Login to Supabase CLI
npm run supabase -- db push                  # Push schema changes
npm run supabase -- gen types typescript --schema public > types/supabase.ts  # Generate types
```

## Architecture Overview

This is a **Next.js 14 (App Router) + Supabase** restaurant management system for "온기한식뷔페" (Ongi Korean Buffet). The application is designed for tablet-based operations with two main user roles: **counter staff** and **admin**.

### Tech Stack
- **Frontend:** Next.js 14 with TypeScript, App Router, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Storage)
- **Authentication:** Custom PIN-based JWT sessions (NOT Supabase Auth)
- **Styling:** Tailwind CSS with Naver-inspired brand colors (#03C75A)

### Project Structure
```
ongi/
├── ongi-app/                    # Main Next.js application
├── supabase/                    # Supabase configuration & migrations
├── *.sql                       # Database schema files (root level)
├── supabase.ts                 # Generated TypeScript database types
└── README.md                   # Detailed implementation status
```

### Core Database Schema
**Main Tables:**
- `company` - Client companies with 4-digit access codes
- `admin_user` - System users (admin/counter roles) with PIN authentication
- `entry` - Daily meal entries (company + person count + payment status)
- `payment` - Payment records with receipt file references
- `receipt` - Receipt file storage metadata (Supabase Storage)
- `audit_log` - Activity tracking (planned, not fully implemented)

**Key Constraints:**
- Company codes are unique 4-digit strings
- Entry counts must be 1-20 people
- RLS policies enforce role-based data access

## Authentication System

**PIN-Based Authentication:**
- Custom JWT implementation using `jose` library (NOT Supabase Auth)
- bcrypt-hashed PINs stored in `admin_user.pin_hash`
- Session management via HTTP-only cookies (7-day duration)
- Failed login lockout: 3 attempts → 5-minute lockout
- Role-based access: `admin` vs `counter`

**Session Flow:**
1. User enters PIN on `/login`
2. Server validates against `admin_user` table
3. JWT token created and set as HTTP-only cookie
4. Middleware checks session on protected routes

## Application Features

### Counter App (`/counter`)
**Purpose:** Daily operations for meal entry and payment processing
- Monthly calendar view (split into 1-16 and 17-31 day sections)
- Company selection with 4-digit code verification
- Entry creation with person count (1-20)
- Multi-selection for batch payment processing
- Receipt upload (camera/file) to Supabase Storage
- Real-time payment status updates

### Admin Dashboard (`/admin`)
**Purpose:** Management oversight and company administration
- Revenue summary cards (monthly/total)
- Company CRUD operations
- Recent payment history table
- Access to administrative functions

## Key Implementation Details

### File Organization
- **App Router Structure:** Route groups `(auth)` and `(protected)`
- **Server Components:** Data fetching with Supabase service client
- **Client Components:** Interactive UI with Server Actions
- **Middleware:** Authentication enforcement at `/middleware.ts`

### Data Flow
- Server Actions handle form submissions and mutations
- Supabase service client (server-side) for privileged operations
- Supabase client (client-side) for read operations
- Type-safe database operations with generated types

### Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AUTH_SECRET=32_character_random_string
```

## Current Implementation Status

### Completed Features
- Core database schema with RLS policies
- PIN authentication with lockout protection
- Counter app with entry creation and payment processing
- Admin dashboard with company management
- Receipt upload and Supabase Storage integration
- Monthly filtering and batch payment operations

### Known Issues & Incomplete Features
- Tailwind CSS packages may need reinstallation (network issues during setup)
- Audit logging implementation incomplete
- Admin PIN reset/change UI missing
- CSV export functionality not implemented
- Counter audit log view missing from dashboard
- Comprehensive testing suite needed

### Development Notes
- The application uses a custom authentication system instead of Supabase Auth
- All database operations go through RLS policies for security
- Receipt files are stored in a private Supabase Storage bucket
- The app is optimized for tablet usage with touch-friendly UI
- Monthly views are split to fit tablet screens better (1-16 vs 17-31 days)

## Security Considerations
- Service role key never exposed to client code
- RLS policies enforce data isolation between companies
- PIN-based auth with brute force protection
- Receipt files in private storage with signed URL access
- Input validation using Zod schemas throughout