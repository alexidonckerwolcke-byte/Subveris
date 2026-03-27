# Subveris - AI-Powered Subscription Management Platform

## Overview

Subveris is an intelligent fintech SaaS platform designed to help users automatically detect, analyze, and optimize their recurring subscriptions and expenses. The application combines financial data tracking, behavioral psychology principles, and AI-powered recommendations to help users make smarter spending decisions.

**Core Purpose:** Track subscription usage, calculate cost-per-use metrics, identify savings opportunities, and provide actionable insights to reduce wasteful spending on unused or underutilized services.

**Key Capabilities:**
- Automatic subscription detection and categorization
- Usage tracking and value analysis (cost per use)
- Behavioral insights showing opportunity costs
- AI-powered recommendations for alternatives and cancellations
- Financial projections and savings goals
- Bank account integration simulation

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React with TypeScript using Vite as the build tool

**UI Component System:**
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** for styling with custom design system
- Design philosophy follows "Hybrid Fintech System" combining Stripe's clarity with Linear's typography precision
- Inter font family used throughout for optimal readability of financial data
- Comprehensive theme system supporting light/dark modes with CSS variables

**State Management:**
- **TanStack Query (React Query)** for server state management and caching
- Query client configured with credentials for session-based auth
- Optimistic updates and automatic cache invalidation on mutations

**Routing:**
- **Wouter** for lightweight client-side routing
- Main routes: Dashboard, Subscriptions, Insights, Savings, Bank Accounts, Settings

**Form Handling:**
- **React Hook Form** with **Zod** schema validation
- **@hookform/resolvers** for seamless integration

### Backend Architecture

**Server Framework:** Express.js with TypeScript

**API Design:**
- RESTful API endpoints under `/api/*` namespace
- JSON request/response format
- Express middleware for body parsing and request logging
- Custom logging utility with timestamps

**Database & ORM:**
- **Drizzle ORM** for type-safe database operations
- **@neondatabase/serverless** for PostgreSQL connectivity (Neon Database)
- Schema-first approach with database schema defined in `shared/schema.ts`
- Drizzle Kit for migrations (output to `./migrations` directory)

**Data Models:**
- **Subscriptions**: Core entity tracking recurring payments with usage metrics
- **Transactions**: Bank transaction records for subscription detection
- **Insights**: AI-generated recommendations and observations
- **Bank Connections**: Connected financial accounts metadata
- **Users**: User account information

**Session Management:**
- Session-based authentication approach (infrastructure present)
- **connect-pg-simple** for PostgreSQL session storage
- **express-session** for session middleware

### Data Storage Solutions

**Primary Database:** PostgreSQL (via Neon serverless)

**Schema Highlights:**
- Subscriptions table with status tracking (active/unused/to-cancel)
- Category system: streaming, software, fitness, cloud-storage, news, gaming, productivity, finance, education, other
- Billing frequency support: monthly, yearly, weekly, quarterly
- Usage metrics: usage count, last used date, cost-per-use calculations
- Currency support with default USD

**Storage Layer Pattern:**
- Abstract `IStorage` interface in `server/storage.ts`
- Designed for dependency injection and testability
- Methods for CRUD operations on all entities
- Computed metrics and aggregations (dashboard metrics, spending analysis)

### Authentication and Authorization

**Planned Mechanism:**
- Session-based authentication (passport infrastructure included but not fully implemented)
- User model exists in schema
- Password handling with **passport-local** strategy

**Current State:** 
- No active authentication enforcement in routes
- Infrastructure prepared for future implementation

### Build and Development

**Development Mode:**
- Vite dev server with HMR (Hot Module Replacement)
- Express server runs via tsx (TypeScript execution)
- Vite middleware mode integrated with Express

**Production Build:**
- Custom build script using esbuild for server bundling
- Vite build for client static assets
- Server dependencies bundled to reduce cold start times
- Allowlist approach for critical dependencies to bundle

**Static File Serving:**
- Client assets served from `dist/public` in production
- Fallback to index.html for client-side routing

## External Dependencies

### Third-Party Services

**Open Banking / Financial Data:**
- **Plaid/Yodlee (US)** - Mentioned for bank connection integration
- **PSD2 (Europe)** - Referenced for Open Banking compliance
- Currently simulated via transactions table, not actively integrated

**AI Services:**
- Infrastructure present for AI recommendation generation
- No active API integration in current codebase

### Key NPM Packages

**UI & Design:**
- `@radix-ui/*` - Accessible component primitives (30+ components)
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` - Type-safe component variants
- `lucide-react` - Icon library
- `recharts` - Data visualization for spending charts
- `embla-carousel-react` - Carousel functionality
- `date-fns` - Date manipulation and formatting

**Data & Forms:**
- `zod` - Schema validation
- `drizzle-zod` - Zod schema generation from Drizzle schemas
- `react-hook-form` - Form state management

**Backend:**
- `express` - Web server framework
- `drizzle-orm` - Database ORM
- `cors` - CORS middleware
- `express-rate-limit` - API rate limiting
- `passport` / `passport-local` - Authentication

**Development:**
- `tsx` - TypeScript execution
- `vite` - Build tool and dev server
- `@replit/*` - Replit-specific development plugins

### Browser APIs

- LocalStorage for theme persistence
- MediaQuery API for dark mode preference detection
- Fetch API for HTTP requests

### Database Connection

**Provider:** Neon Database (serverless PostgreSQL) OR Supabase
- Connection via `DATABASE_URL` environment variable
- WebSocket-compatible for serverless environments
- Configured in `drizzle.config.ts`

**Supabase Integration (Optional):**
- Server-side client: `server/supabase.ts` - Uses `SUPABASE_SERVICE_ROLE_KEY`
- Client-side client: `client/src/lib/supabase.ts` - Uses `VITE_SUPABASE_ANON_KEY`
- Supabase storage implementation: `server/supabaseStorage.ts`
- The app automatically falls back to in-memory storage if Supabase is not configured correctly
- To use Supabase, set the following secrets:
  - `SUPABASE_URL` - Must be the API URL (e.g., `https://yourproject.supabase.co`), NOT the dashboard URL
  - `SUPABASE_SERVICE_ROLE_KEY` - Server-side secret key
  - `SUPABASE_ANON_KEY` - Client-side public key
  - `VITE_SUPABASE_URL` - Same as SUPABASE_URL (for client)
  - `VITE_SUPABASE_ANON_KEY` - Same as SUPABASE_ANON_KEY (for client)
- To create Supabase tables, run the SQL in `supabase-schema.sql` in your Supabase dashboard
- To seed initial data, run: `npm run seed:supabase`