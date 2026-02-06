# Weekly Python Challenge System

A gamified weekly Python challenge system for Computer Studies departments. Students can register, complete weekend coding challenges, have their code evaluated by AI, level up, and redeem coins for prizes.

## Features

- **Student Registration** - Register with name, student ID, and password
- **Weekend-Only Challenges** - Challenges open only on Saturday and Sunday
- **AI Code Evaluation** - Python code analyzed by OpenAI GPT (no execution)
- **Leveling System** - Max level 60 with 6 tiers
- **Coin Rewards** - Earn coins on level up and challenge completion
- **Shop System** - Redeem coins for prizes
- **Admin Dashboard** - Post announcements and manage challenges

## Tech Stack

- **Framework**: NestJS v11
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with Passport.js
- **AI**: OpenAI API

---

## Setup

### Prerequisites

- Node.js 18+
- MongoDB
- OpenAI API Key (optional, for AI evaluation)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/challenge_system` |
| `JWT_SECRET` | Secret key for JWT tokens | Required |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `OPENAI_API_KEY` | OpenAI API key | Optional |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4` |
| `BYPASS_WEEKEND_CHECK` | Skip weekend restriction (dev) | `false` |

### Running

```bash
# Development
pnpm start:dev

# Production
pnpm build
pnpm start:prod
```

---

## API Documentation

Base URL: `http://localhost:3000`

### Authentication

All endpoints except `/auth/register` and `/auth/login` require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Auth Endpoints

### Register Student

```http
POST /auth/register
```

**Body:**
```json
{
  "name": "John Doe",
  "studentId": "STU123456",
  "password": "Password123",
  "email": "john@example.com"
}
```

**Response:** `201 Created`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "studentId": "STU123456",
    "name": "John Doe",
    "level": 1,
    "xp": 0,
    "coins": 0,
    "tier": "Newbie"
  }
}
```

### Login

```http
POST /auth/login
```

**Body:**
```json
{
  "studentId": "STU123456",
  "password": "Password123"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

### Get Current User

```http
GET /auth/me
```

**Response:** `200 OK`
```json
{
  "id": "507f1f77bcf86cd799439011",
  "studentId": "STU123456",
  "name": "John Doe",
  "level": 5,
  "xp": 450,
  "xpRequired": 1118,
  "xpProgress": 40,
  "coins": 250,
  "tier": "Newbie",
  "tierColor": "#808080"
}
```

---

## User Endpoints

### Get Profile

```http
GET /users/profile
```

Returns the current user's profile with stats.

### Get Leaderboard

```http
GET /users/leaderboard?limit=10
```

**Response:** `200 OK`
```json
[
  {
    "rank": 1,
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "level": 45,
    "tier": "Expert"
  }
]
```

### List All Users (Admin)

```http
GET /users?page=1&limit=20
```

### Grant Coins (Admin)

```http
POST /users/:id/grant-coins
```

**Body:**
```json
{
  "amount": 100,
  "reason": "Competition winner"
}
```

---

## Challenge Endpoints

### Get Current Week's Challenge

```http
GET /challenges/current
```

> **Note:** Only accessible on Saturday and Sunday

**Response:** `200 OK`
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "FizzBuzz Challenge",
  "description": "Write a function that...",
  "problemStatement": "Given a number n...",
  "starterCode": "def fizzbuzz(n):\n    pass",
  "difficulty": 2,
  "baseXpReward": 150,
  "bonusCoins": 20,
  "testCases": [
    { "input": "15" }
  ]
}
```

**Error (Weekday):** `403 Forbidden`
```json
{
  "message": "Challenges are only available on Saturday and Sunday. Please come back during the weekend!"
}
```

### List All Challenges (Admin)

```http
GET /challenges?page=1&limit=20
```

### Create Challenge (Admin)

```http
POST /challenges
```

**Body:**
```json
{
  "title": "FizzBuzz Challenge",
  "description": "Classic programming challenge",
  "problemStatement": "Write a function fizzbuzz(n) that returns...",
  "starterCode": "def fizzbuzz(n):\n    pass",
  "testCases": [
    { "input": "3", "expectedOutput": "Fizz" },
    { "input": "5", "expectedOutput": "Buzz" },
    { "input": "15", "expectedOutput": "FizzBuzz" }
  ],
  "evaluationPrompt": "Check if the solution correctly handles divisibility...",
  "difficulty": 2,
  "baseXpReward": 150,
  "bonusCoins": 20,
  "weekNumber": 6,
  "year": 2026,
  "isActive": false
}
```

### Update Challenge (Admin)

```http
PATCH /challenges/:id
```

### Delete Challenge (Admin)

```http
DELETE /challenges/:id
```

### Activate Challenge (Admin)

```http
POST /challenges/:id/activate
```

### Deactivate Challenge (Admin)

```http
POST /challenges/:id/deactivate
```

---

## Submission Endpoints

### Submit Code

```http
POST /submissions
```

> **Note:** Only accessible on Saturday and Sunday

**Body:**
```json
{
  "challengeId": "507f1f77bcf86cd799439011",
  "code": "def fizzbuzz(n):\n    if n % 15 == 0:\n        return 'FizzBuzz'\n    ...",
  "explanation": "Ang code na ini nagche-check kun ang numero divisible sa 15, 3, o 5. Kung divisible sa 15, nagbabalik siya nin 'FizzBuzz'. Kung sa 3 sana, 'Fizz'. Kung sa 5 sana, 'Buzz'. Kung dae, ibabalik na sana ang numero.",
  "explanationLanguage": "Bicol"
}
```

> **Note:** `explanation` is required (min 50 characters). Students must explain their code in their native language (e.g., Bicol, Tagalog, Cebuano) to demonstrate understanding.

**Response:** `201 Created`
```json
{
  "id": "507f1f77bcf86cd799439012",
  "status": "PENDING",
  "message": "Submission received. Evaluation in progress..."
}
```

### Get My Submissions

```http
GET /submissions?page=1&limit=20
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "challengeId": { "title": "FizzBuzz", "difficulty": 2 },
      "status": "PASSED",
      "aiScore": 85,
      "xpEarned": 180,
      "coinsEarned": 24,
      "isReviewed": true,
      "explanationScore": 90,
      "bonusXpFromReview": 50,
      "bonusCoinsFromReview": 10,
      "createdAt": "2026-02-01T10:30:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

### Get Submission Details

```http
GET /submissions/:id
```

**Response:** `200 OK`
```json
{
  "id": "507f1f77bcf86cd799439012",
  "code": "def fizzbuzz(n):...",
  "explanation": "Ang code na ini nagche-check kun ang numero divisible sa 15, 3, o 5...",
  "explanationLanguage": "Bicol",
  "status": "PASSED",
  "aiScore": 85,
  "aiFeedback": "Good solution! Consider using a dictionary for cleaner code.",
  "aiAnalysis": {
    "correctness": 90,
    "codeQuality": 80,
    "efficiency": 85,
    "style": 75
  },
  "aiSuggestions": [
    "Use a dictionary mapping for divisors",
    "Add type hints for better readability"
  ],
  "xpEarned": 180,
  "coinsEarned": 24,
  "isReviewed": true,
  "reviewedAt": "2026-02-01T14:00:00Z",
  "explanationScore": 90,
  "reviewerFeedback": "Magayon an explanation! Klaro na naintindihan mo an logic.",
  "bonusXpFromReview": 50,
  "bonusCoinsFromReview": 10,
  "createdAt": "2026-02-01T10:30:00Z",
  "evaluatedAt": "2026-02-01T10:30:15Z"
}
```

### Get Submission Stats

```http
GET /submissions/stats
```

**Response:** `200 OK`
```json
{
  "total": 15,
  "passed": 12,
  "failed": 2,
  "pending": 1,
  "totalXpEarned": 2150,
  "totalCoinsEarned": 340,
  "averageScore": 78
}
```

### Get Challenge Submissions (Admin)

```http
GET /submissions/challenge/:challengeId?page=1&limit=20
```

### Get Pending Reviews (Admin)

```http
GET /submissions/pending-reviews?page=1&limit=20
```

Returns submissions that have been evaluated by AI but not yet reviewed by an admin.

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "userId": { "name": "Juan Dela Cruz", "studentId": "STU123456" },
      "challengeId": { "title": "FizzBuzz", "difficulty": 2 },
      "code": "def fizzbuzz(n):...",
      "explanation": "Ang code na ini nagche-check kun ang numero divisible sa 15, 3, o 5...",
      "explanationLanguage": "Bicol",
      "status": "PASSED",
      "aiScore": 85,
      "aiFeedback": "Good solution!",
      "createdAt": "2026-02-01T10:30:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

### Review Submission (Admin)

```http
POST /submissions/:id/review
```

Review a student's code explanation and grant bonus XP/coins based on their understanding.

**Body:**
```json
{
  "explanationScore": 90,
  "bonusXp": 50,
  "bonusCoins": 10,
  "feedback": "Magayon an explanation! Klaro na naintindihan mo an logic."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `explanationScore` | int | Yes | Score for the explanation (0-100) |
| `bonusXp` | int | No | Additional XP to grant (0-500) |
| `bonusCoins` | int | No | Additional coins to grant (0-100) |
| `feedback` | string | No | Feedback to the student (max 1000 chars) |

**Response:** `200 OK`
```json
{
  "message": "Submission reviewed successfully",
  "submission": {
    "id": "507f1f77bcf86cd799439012",
    "isReviewed": true,
    "explanationScore": 90,
    "reviewerFeedback": "Magayon an explanation! Klaro na naintindihan mo an logic.",
    "bonusXpFromReview": 50,
    "bonusCoinsFromReview": 10,
    "reviewedAt": "2026-02-01T14:00:00Z"
  }
}
```

---

## Shop Endpoints

### List Available Items

```http
GET /shop/items
```

**Response:** `200 OK`
```json
[
  {
    "id": "507f1f77bcf86cd799439013",
    "name": "Coffee Voucher",
    "description": "Free coffee at the campus cafe",
    "imageUrl": "https://...",
    "coinPrice": 100,
    "stock": 50,
    "minLevel": 1,
    "canAfford": true
  }
]
```

### Purchase Item

```http
POST /shop/purchase/:itemId
```

**Body:**
```json
{
  "quantity": 1
}
```

**Response:** `201 Created`
```json
{
  "message": "Purchase successful",
  "purchase": {
    "id": "507f1f77bcf86cd799439014",
    "itemId": "507f1f77bcf86cd799439013",
    "quantity": 1,
    "totalCost": 100,
    "redemptionCode": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

### Get My Purchases

```http
GET /shop/purchases?page=1&limit=20
```

### Create Shop Item (Admin)

```http
POST /shop/items
```

**Body:**
```json
{
  "name": "Coffee Voucher",
  "description": "Free coffee at the campus cafe",
  "coinPrice": 100,
  "stock": 50,
  "minLevel": 1,
  "isActive": true
}
```

### Update Shop Item (Admin)

```http
PATCH /shop/items/:id
```

### Delete Shop Item (Admin)

```http
DELETE /shop/items/:id
```

### Lookup by Redemption Code (Admin)

```http
GET /shop/purchases/code/:code
```

### Redeem Purchase (Admin)

```http
POST /shop/purchases/:id/redeem
```

---

## Announcement Endpoints

### List Published Announcements

```http
GET /announcements
```

**Response:** `200 OK`
```json
[
  {
    "id": "507f1f77bcf86cd799439015",
    "title": "Welcome to Week 6!",
    "content": "This week's challenge is about recursion...",
    "author": { "name": "Admin" },
    "isPinned": true,
    "publishedAt": "2026-02-01T08:00:00Z"
  }
]
```

### Create Announcement (Admin)

```http
POST /announcements
```

**Body:**
```json
{
  "title": "Welcome to Week 6!",
  "content": "This week's challenge is about recursion...",
  "isPinned": false,
  "isPublished": false
}
```

### Update Announcement (Admin)

```http
PATCH /announcements/:id
```

### Delete Announcement (Admin)

```http
DELETE /announcements/:id
```

### Publish Announcement (Admin)

```http
POST /announcements/:id/publish
```

### Unpublish Announcement (Admin)

```http
POST /announcements/:id/unpublish
```

### Toggle Pin (Admin)

```http
POST /announcements/:id/toggle-pin
```

---

## Transaction Endpoints

### Get My Transactions

```http
GET /transactions?page=1&limit=20
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439016",
      "type": "LEVEL_UP_REWARD",
      "amount": 75,
      "balance": 325,
      "description": "Reached Level 6",
      "createdAt": "2026-02-01T11:00:00Z"
    },
    {
      "id": "507f1f77bcf86cd799439017",
      "type": "SHOP_PURCHASE",
      "amount": -100,
      "balance": 250,
      "description": "Purchased 1x Coffee Voucher",
      "createdAt": "2026-02-01T12:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 10, "totalPages": 1 }
}
```

### Get Transaction Summary

```http
GET /transactions/summary
```

**Response:** `200 OK`
```json
{
  "totalEarned": 450,
  "totalSpent": 200,
  "byType": {
    "LEVEL_UP_REWARD": 300,
    "CHALLENGE_BONUS": 150,
    "SHOP_PURCHASE": -200,
    "ADMIN_GRANT": 0
  }
}
```

---

## Leveling System

### Tier Definitions

| Tier | Levels | Color |
|------|--------|-------|
| Newbie | 0-10 | Gray |
| Beginner | 11-20 | Green |
| Intermediate | 21-30 | Blue |
| Advanced | 31-40 | Purple |
| Expert | 41-50 | Gold |
| Master | 51-60 | Orange |

### XP Formula

```
XP required for level N = floor(100 * N^1.5)
```

| Level | XP Required |
|-------|-------------|
| 1 | 100 |
| 5 | 1,118 |
| 10 | 3,162 |
| 20 | 8,944 |
| 30 | 16,432 |
| 40 | 25,298 |
| 50 | 35,355 |
| 60 | 46,476 |

### Coin Rewards on Level Up

```
Coins = 50 + (floor(level/10) * 25) + milestone_bonus
Milestone bonus = 100 coins every 10 levels
```

| Level | Coins Earned |
|-------|--------------|
| 5 | 50 |
| 10 | 150 (50 + 0 + 100) |
| 20 | 175 (50 + 25 + 100) |
| 30 | 200 (50 + 50 + 100) |
| 60 | 275 (50 + 125 + 100) |

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions or weekend restriction |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Duplicate entry |

---

## Rate Limits

- **Submissions**: Max 5 per hour per challenge per user

---

## Creating an Admin User

To create an admin user, register normally then update the role in MongoDB:

```javascript
db.users.updateOne(
  { studentId: "ADMIN001" },
  { $set: { role: "ADMIN" } }
)
```

---

## License

MIT
