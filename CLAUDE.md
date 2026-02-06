# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A gamified weekly Python challenge system for students. Students register, submit Python code solutions on weekends, get AI evaluation via OpenAI, earn XP/coins, level up (max 60), and redeem coins in a shop.

## Development Commands

```bash
pnpm install          # Install dependencies
pnpm start:dev        # Development with hot reload
pnpm build            # Build for production
pnpm start:prod       # Run production build
pnpm lint             # Lint and auto-fix
pnpm test             # Run unit tests
pnpm test:watch       # Run tests in watch mode
pnpm test:e2e         # Run e2e tests (uses test/jest-e2e.json)
```

Run a single test file:
```bash
pnpm test -- --testPathPattern=users.service
```

## Architecture

NestJS v11 application with MongoDB (Mongoose) and JWT authentication.

### Module Structure

- **AuthModule** - JWT/Passport authentication, login/register endpoints
- **UsersModule** - User management, XP/coins/leveling logic
- **ChallengesModule** - Weekly challenge CRUD, weekend-only access
- **SubmissionsModule** - Code submission handling, triggers AI evaluation, manual review system
- **AiModule** - Ollama integration for Python code evaluation (no execution, static analysis)
- **ShopModule** - Shop items and purchases with redemption codes
- **AnnouncementsModule** - Admin announcements
- **TransactionsModule** - Coin transaction history

### Key Patterns

**Global Guards/Pipes** (configured in `app.module.ts`):
- `JwtAuthGuard` - All routes require auth by default. Use `@Public()` decorator to bypass
- `ValidationPipe` with whitelist/transform enabled globally
- `LoggingInterceptor` for request logging

**Role-Based Access**:
- Use `@Roles(Role.ADMIN)` decorator with `RolesGuard`
- Roles: `STUDENT`, `ADMIN`

**Weekend-Only Access**:
- `WeekendOnlyGuard` restricts challenge/submission endpoints to Saturday/Sunday
- Bypass with `BYPASS_WEEKEND_CHECK=true` in `.env`

**Current User**:
- Use `@CurrentUser()` decorator to get authenticated user in controllers

### AI Code Evaluation (Manual via Ollama)

Code evaluation happens in `src/ai/ai.service.ts` using locally-hosted Ollama:
- **Submissions are NOT auto-evaluated** - they are stored with `PENDING` status
- Admin triggers evaluation manually via `POST /submissions/:id/analyze`
- Admin can view pending submissions via `GET /submissions/pending-analysis`
- Validates code (max 10KB, blocks dangerous imports like `os`, `subprocess`, `sys`)
- Sanitizes against prompt injection
- Sends to Ollama for static analysis (correctness, quality, efficiency, style)

**Setup Ollama:**
```bash
# Install Ollama (https://ollama.ai)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model (default: llama3.2)
ollama pull llama3.2

# Start Ollama server (runs on port 11434)
ollama serve
```

### Explanation Review System

Students must explain their code in their native language (Bicol, Tagalog, etc.) when submitting:
- `explanation` field required (min 50 chars) on submission
- Admins review explanations via `GET /submissions/pending-reviews` and `POST /submissions/:id/review`
- Reviewers can grant bonus XP (0-500) and coins (0-100) based on explanation quality

### Leveling Formula

```
XP required for level N = floor(100 * N^1.5)
Coins on level up = 50 + (floor(level/10) * 25) + (100 if milestone level)
```

## Environment Variables

Required: `JWT_SECRET`, `MONGODB_URI`
Optional: `OLLAMA_URL` (defaults to `http://localhost:11434`), `OLLAMA_MODEL` (defaults to `llama3.2`)
Development: `BYPASS_WEEKEND_CHECK=true` (allows weekday submissions)

## Database

MongoDB collections match schema files in `src/*/schemas/`:
- User, Challenge, Submission, ShopItem, Purchase, Announcement, Transaction

Create admin user by updating role in MongoDB:
```javascript
db.users.updateOne({ studentId: "..." }, { $set: { role: "ADMIN" } })
```
