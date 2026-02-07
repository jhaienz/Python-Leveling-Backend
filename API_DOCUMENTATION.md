# Challenge System API Documentation

Base URL: `http://localhost:3000` (or your deployed URL)

## Authentication

All endpoints require JWT authentication except those marked as **Public**.

Include the token in the `Authorization` header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Auth Endpoints

### Register (Public)
```http
POST /auth/register
```

**Request Body:**
```json
{
  "name": "Juan Dela Cruz",
  "studentId": "STU123456",
  "password": "Password123",
  "email": "juan@example.com"  // optional
}
```

**Validation:**
- `name`: required, max 100 chars
- `studentId`: required, 6-12 alphanumeric characters
- `password`: required, 8-50 chars, must contain uppercase, lowercase, and number
- `email`: optional, valid email format

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "Juan Dela Cruz",
    "studentId": "STU123456"
  }
}
```

---

### Login (Public)
```http
POST /auth/login
```

**Request Body:**
```json
{
  "studentId": "STU123456",
  "password": "Password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "Juan Dela Cruz",
    "studentId": "STU123456"
  }
}
```

---

### Get Current User
```http
GET /auth/me
```

**Response:**
```json
{
  "id": "...",
  "name": "Juan Dela Cruz",
  "studentId": "STU123456",
  "level": 5,
  "xp": 450,
  "xpToNextLevel": 500,
  "coins": 250,
  "tier": "BRONZE",
  "role": "STUDENT"
}
```

---

## Challenges Endpoints

### Get Week Info
```http
GET /challenges/week-info
```

**Response:**
```json
{
  "year": 2026,
  "weekNumber": 6,
  "message": "Current week is Week 6 of 2026"
}
```

---

### Get Active Challenge (Weekend Only)
```http
GET /challenges/active
```
or
```http
GET /challenges/current
```

**Note:** This endpoint only works on Saturday 12:00 AM to Sunday 11:59 PM (Asia/Manila timezone).

**Response:**
```json
[
  {
    "id": "...",
    "title": "FizzBuzz Challenge",
    "description": "Classic programming challenge",
    "problemStatement": "Write a function that prints numbers 1-100...",
    "starterCode": "def fizzbuzz():\n    pass",
    "difficulty": 2,
    "baseXpReward": 100,
    "bonusCoins": 10,
    "testCases": [
      { "input": "15" },
      { "input": "30" }
    ]
  }
]
```

**Error (Weekday):**
```json
{
  "statusCode": 403,
  "message": "Challenges are only available on Saturday and Sunday. Please come back during the weekend!"
}
```

---

## Submissions Endpoints

### Create Submission (Weekend Only)
```http
POST /submissions
```

**Important:** Only ONE submission per challenge is allowed. Once submitted, you cannot submit again for the same challenge.

**Request Body:**
```json
{
  "challengeId": "challenge_mongo_id",
  "code": "def fizzbuzz():\n    for i in range(1, 101):\n        ...",
  "explanation": "Ang akon code kay nag-gamit nin loop para mag-iterate halin sa 1 hanggang 100...",
  "explanationLanguage": "Bicol"  // optional
}
```

**Validation:**
- `code`: required, max 10KB
- `challengeId`: required, valid MongoDB ObjectId
- `explanation`: required, 50-5000 characters (explain in your native language)
- `explanationLanguage`: optional (e.g., "Bicol", "Tagalog", "Cebuano", "English")

**Response:**
```json
{
  "id": "submission_id",
  "status": "PENDING",
  "message": "Submission received. Waiting for admin to analyze."
}
```

**Error (Already Submitted):**
```json
{
  "statusCode": 400,
  "message": "You have already submitted a solution for this challenge. Only one submission per challenge is allowed."
}
```

---

### Submission Status Values

| Status | Description |
|--------|-------------|
| `PENDING` | Waiting for admin to trigger AI evaluation |
| `ONGOING` | Currently being evaluated by AI |
| `COMPLETED` | Passed evaluation - XP and coins awarded |
| `FAILED` | Failed evaluation |
| `ERROR` | Error occurred during evaluation |

---

### Get My Submissions
```http
GET /submissions?page=1&limit=20
```

**Response:**
```json
{
  "data": [
    {
      "id": "...",
      "challengeId": { "_id": "...", "title": "FizzBuzz", "difficulty": 2 },
      "status": "COMPLETED",
      "aiScore": 85,
      "xpEarned": 100,
      "coinsEarned": 10,
      "isReviewed": true,
      "explanationScore": 90,
      "bonusXpFromReview": 50,
      "bonusCoinsFromReview": 10,
      "createdAt": "2026-02-07T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

---

### Get Submission Stats
```http
GET /submissions/stats
```

**Response:**
```json
{
  "total": 10,
  "passed": 7,
  "failed": 2,
  "pending": 1,
  "totalXpEarned": 700,
  "totalCoinsEarned": 85,
  "averageScore": 78
}
```

---

### Get Submission Details
```http
GET /submissions/:id
```

**Response:**
```json
{
  "id": "...",
  "challengeId": { "_id": "...", "title": "FizzBuzz", "difficulty": 2, "problemStatement": "..." },
  "code": "def fizzbuzz():\n    ...",
  "explanation": "Ang akon code...",
  "explanationLanguage": "Bicol",
  "status": "COMPLETED",
  "aiScore": 85,
  "aiFeedback": "Good solution with clean code...",
  "aiAnalysis": {
    "correctness": 90,
    "codeQuality": 80,
    "efficiency": 85,
    "style": 85
  },
  "aiSuggestions": [
    "Consider using list comprehension for cleaner code"
  ],
  "xpEarned": 100,
  "coinsEarned": 10,
  "isReviewed": true,
  "reviewedAt": "2026-02-07T12:00:00.000Z",
  "explanationScore": 90,
  "reviewerFeedback": "Excellent explanation in Bicol!",
  "bonusXpFromReview": 50,
  "bonusCoinsFromReview": 10,
  "createdAt": "2026-02-07T10:00:00.000Z",
  "evaluatedAt": "2026-02-07T11:00:00.000Z"
}
```

---

## Users Endpoints

### Get My Profile
```http
GET /users/profile
```

**Response:**
```json
{
  "id": "...",
  "name": "Juan Dela Cruz",
  "studentId": "STU123456",
  "level": 5,
  "xp": 450,
  "xpToNextLevel": 559,
  "xpProgress": 80.5,
  "coins": 250,
  "tier": "BRONZE",
  "role": "STUDENT",
  "createdAt": "2026-01-15T08:00:00.000Z"
}
```

**Tiers:**
- `BEGINNER`: Level 1-9
- `BRONZE`: Level 10-19
- `SILVER`: Level 20-29
- `GOLD`: Level 30-39
- `PLATINUM`: Level 40-49
- `DIAMOND`: Level 50-59
- `MASTER`: Level 60

---

### Get Leaderboard (All-Time)
```http
GET /users/leaderboard?limit=10
```

**Description:** Returns users ranked by total level and XP (all-time progress).

**Response:**
```json
[
  {
    "rank": 1,
    "id": "...",
    "name": "Top Student",
    "level": 25,
    "tier": "SILVER"
  },
  {
    "rank": 2,
    "id": "...",
    "name": "Second Best",
    "level": 22,
    "tier": "SILVER"
  }
]
```

---

### Get Weekly Leaderboard
```http
GET /users/leaderboard/weekly?limit=10
```

**Description:** Returns users ranked by XP earned during the current week (Saturday-Sunday). Only includes users who have earned XP this week.

**Response:**
```json
{
  "week": 6,
  "year": 2026,
  "data": [
    {
      "rank": 1,
      "id": "...",
      "name": "Weekly Champion",
      "level": 15,
      "tier": "BRONZE",
      "weeklyXp": 350,
      "submissionCount": 3
    },
    {
      "rank": 2,
      "id": "...",
      "name": "Runner Up",
      "level": 12,
      "tier": "BRONZE",
      "weeklyXp": 250,
      "submissionCount": 2
    }
  ]
}
```

**Response Fields:**
- `week`: Current ISO week number
- `year`: Current year
- `data[].weeklyXp`: Total XP earned this week (from submissions + review bonuses)
- `data[].submissionCount`: Number of submissions made this week

---

## Admin Endpoints

### Trigger AI Analysis (Admin Only)
```http
POST /submissions/:id/analyze
```

**Response:**
```json
{
  "message": "Submission analyzed successfully",
  "submission": {
    "id": "...",
    "status": "COMPLETED",
    "aiScore": 85,
    "aiFeedback": "Good solution...",
    "aiAnalysis": { ... },
    "aiSuggestions": [ ... ],
    "xpEarned": 100,
    "coinsEarned": 10,
    "evaluatedAt": "2026-02-07T11:00:00.000Z"
  }
}
```

---

### Review Submission (Admin Only)
```http
POST /submissions/:id/review
```

**Request Body:**
```json
{
  "explanationScore": 90,
  "bonusXp": 50,
  "bonusCoins": 10,
  "feedback": "Great explanation! Keep it up!"
}
```

**Validation:**
- `explanationScore`: required, 0-100
- `bonusXp`: optional, 0-500
- `bonusCoins`: optional, 0-100
- `feedback`: optional, max 1000 chars

**Response:**
```json
{
  "message": "Submission reviewed successfully",
  "submission": {
    "id": "...",
    "isReviewed": true,
    "explanationScore": 90,
    "reviewerFeedback": "Great explanation! Keep it up!",
    "bonusXpFromReview": 50,
    "bonusCoinsFromReview": 10,
    "reviewedAt": "2026-02-07T12:00:00.000Z"
  }
}
```

---

### Get Pending Analysis (Admin Only)
```http
GET /submissions/pending-analysis?page=1&limit=20
```

---

### Get Pending Reviews (Admin Only)
```http
GET /submissions/pending-reviews?page=1&limit=20
```

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "Bad Request"
}
```

**Common Status Codes:**
- `400` - Bad Request (validation error, duplicate submission)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (weekend-only access, wrong role)
- `404` - Not Found
- `500` - Internal Server Error

---

## Frontend Implementation Notes

### LeetCode-Style Challenge UI

For the split-screen layout:

**Left Panel:**
- Challenge title
- Difficulty indicator (1-5 stars)
- Problem description/statement
- Test case examples (first 2 only)
- XP/Coins reward info

**Right Panel:**
- Code editor (Monaco Editor recommended)
- Language selector (Python only for now)
- Explanation textarea (min 50 chars)
- Language dropdown (Bicol, Tagalog, etc.)
- Submit button

### Submission Flow

1. Check if user has existing submission for challenge:
   ```http
   GET /submissions?page=1&limit=100
   ```
   Filter by `challengeId` to check if already submitted

2. If no existing submission, show editor
3. On submit, POST to `/submissions`
4. Show submission status page with real-time status polling
5. Once `COMPLETED` or `FAILED`, show results

### Weekend Check

Before showing challenges:
1. Get week info: `GET /challenges/week-info`
2. Try to fetch active challenge: `GET /challenges/active`
3. If 403, show "Come back on weekend" message
4. If 404 (no challenges), show "No challenges this week"
