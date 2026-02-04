# System Diagrams

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        string studentId UK
        string name
        string email UK
        string passwordHash
        enum role "STUDENT | ADMIN"
        int xp
        int level
        int coins
        datetime lastLoginAt
        datetime createdAt
        datetime updatedAt
    }

    CHALLENGE {
        ObjectId _id PK
        string title
        string description
        string problemStatement
        string starterCode
        json testCases
        string evaluationPrompt
        int difficulty "1-5"
        int baseXpReward
        int bonusCoins
        int weekNumber
        int year
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    SUBMISSION {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId challengeId FK
        string code
        enum status "PENDING | EVALUATING | PASSED | FAILED | ERROR"
        int aiScore "0-100"
        string aiFeedback
        json aiAnalysis
        array aiSuggestions
        int xpEarned
        int coinsEarned
        datetime evaluatedAt
        datetime createdAt
    }

    SHOP_ITEM {
        ObjectId _id PK
        string name
        string description
        string imageUrl
        int coinPrice
        int stock "nullable"
        int minLevel
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    PURCHASE {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId itemId FK
        int quantity
        int totalCost
        string redemptionCode UK
        boolean isRedeemed
        datetime redeemedAt
        datetime createdAt
    }

    ANNOUNCEMENT {
        ObjectId _id PK
        ObjectId authorId FK
        string title
        string content
        boolean isPinned
        boolean isPublished
        datetime publishedAt
        datetime createdAt
        datetime updatedAt
    }

    TRANSACTION {
        ObjectId _id PK
        ObjectId userId FK
        enum type "LEVEL_UP_REWARD | CHALLENGE_BONUS | SHOP_PURCHASE | ADMIN_GRANT"
        int amount
        int balance
        string description
        string referenceId
        string referenceType
        datetime createdAt
    }

    USER ||--o{ SUBMISSION : "submits"
    USER ||--o{ PURCHASE : "makes"
    USER ||--o{ TRANSACTION : "has"
    USER ||--o{ ANNOUNCEMENT : "creates"
    CHALLENGE ||--o{ SUBMISSION : "receives"
    SHOP_ITEM ||--o{ PURCHASE : "is purchased"
```

---

## System Architecture Flow

```mermaid
flowchart TB
    subgraph Client
        FE[Frontend App]
    end

    subgraph API["NestJS API Server"]
        AUTH[Auth Module]
        USERS[Users Module]
        CHALLENGES[Challenges Module]
        SUBMISSIONS[Submissions Module]
        SHOP[Shop Module]
        ANNOUNCE[Announcements Module]
        TX[Transactions Module]
    end

    subgraph Guards
        JWT[JWT Auth Guard]
        ROLES[Roles Guard]
        WEEKEND[Weekend Only Guard]
    end

    subgraph Services
        AI[AI Service]
        LEVEL[Leveling Service]
    end

    subgraph External
        OPENAI[OpenAI API]
        MONGO[(MongoDB)]
    end

    FE --> AUTH
    FE --> USERS
    FE --> CHALLENGES
    FE --> SUBMISSIONS
    FE --> SHOP
    FE --> ANNOUNCE
    FE --> TX

    AUTH --> JWT
    USERS --> JWT
    USERS --> ROLES
    CHALLENGES --> JWT
    CHALLENGES --> ROLES
    CHALLENGES --> WEEKEND
    SUBMISSIONS --> JWT
    SUBMISSIONS --> WEEKEND
    SHOP --> JWT
    SHOP --> ROLES
    ANNOUNCE --> JWT
    ANNOUNCE --> ROLES
    TX --> JWT

    SUBMISSIONS --> AI
    SUBMISSIONS --> LEVEL
    AI --> OPENAI

    AUTH --> MONGO
    USERS --> MONGO
    CHALLENGES --> MONGO
    SUBMISSIONS --> MONGO
    SHOP --> MONGO
    ANNOUNCE --> MONGO
    TX --> MONGO
```

---

## User Registration & Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant A as Auth Controller
    participant U as Users Service
    participant DB as MongoDB
    participant JWT as JWT Service

    Note over C,JWT: Registration Flow
    C->>A: POST /auth/register
    A->>U: create(registerDto)
    U->>DB: Check existing user
    DB-->>U: Not found
    U->>U: Hash password (bcrypt)
    U->>DB: Save new user
    DB-->>U: User created
    U-->>A: User document
    A->>JWT: Sign token
    JWT-->>A: Access token
    A-->>C: { accessToken, user }

    Note over C,JWT: Login Flow
    C->>A: POST /auth/login
    A->>U: validateUser(studentId, password)
    U->>DB: Find by studentId
    DB-->>U: User document
    U->>U: Compare password (bcrypt)
    U-->>A: Valid user
    A->>JWT: Sign token
    JWT-->>A: Access token
    A-->>C: { accessToken, user }
```

---

## Challenge Submission & AI Evaluation Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Submissions Controller
    participant WG as Weekend Guard
    participant SS as Submissions Service
    participant CS as Challenges Service
    participant AI as AI Service
    participant US as Users Service
    participant OAI as OpenAI API
    participant DB as MongoDB

    C->>S: POST /submissions
    S->>WG: Check weekend

    alt Weekday
        WG-->>C: 403 Forbidden
    else Weekend
        WG-->>S: Allowed
        S->>SS: create(dto, user)
        SS->>CS: findById(challengeId)
        CS->>DB: Get challenge
        DB-->>CS: Challenge
        CS-->>SS: Challenge data

        SS->>DB: Check rate limit (5/hour)
        DB-->>SS: Count < 5

        SS->>DB: Save submission (PENDING)
        DB-->>SS: Submission created
        SS-->>C: { id, status: PENDING }

        Note over SS,OAI: Async Evaluation
        SS->>DB: Update status (EVALUATING)
        SS->>AI: evaluateCode(request)
        AI->>AI: Validate & sanitize code
        AI->>OAI: Chat completion request
        OAI-->>AI: Evaluation result
        AI-->>SS: { score, feedback, analysis }

        alt Score >= 70 (PASSED)
            SS->>US: addXp(userId, xp)
            US->>DB: Update user XP/level
            US-->>SS: { levelsGained }
            SS->>US: addCoins(userId, coins)
            US->>DB: Update user coins
        end

        SS->>DB: Update submission (PASSED/FAILED)
    end
```

---

## Shop Purchase Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant SC as Shop Controller
    participant SS as Shop Service
    participant US as Users Service
    participant TS as Transactions Service
    participant DB as MongoDB

    C->>SC: POST /shop/purchase/:itemId
    SC->>SS: purchase(itemId, user, qty)

    SS->>DB: Find shop item
    DB-->>SS: Item data

    SS->>SS: Validate item active
    SS->>SS: Check user level >= minLevel
    SS->>SS: Calculate total cost

    alt Insufficient Coins
        SS-->>C: 400 Bad Request
    else Insufficient Stock
        SS-->>C: 400 Bad Request
    else Valid Purchase
        SS->>US: deductCoins(userId, cost)
        US->>DB: Update user coins
        US-->>SS: Updated user

        SS->>DB: Update item stock

        SS->>DB: Create purchase record
        DB-->>SS: Purchase with redemptionCode

        SS->>TS: create(transaction)
        TS->>DB: Save transaction

        SS-->>C: { purchase, redemptionCode }
    end
```

---

## Leveling System Flow

```mermaid
flowchart TD
    START([Submit Code]) --> EVAL{AI Score >= 70?}

    EVAL -->|No| FAILED[Status: FAILED]
    EVAL -->|Yes| CALC[Calculate XP Reward]

    CALC --> ADD[Add XP to User]
    ADD --> CHECK{XP >= Required?}

    CHECK -->|No| DONE[Update User]
    CHECK -->|Yes| LEVELUP[Level Up!]

    LEVELUP --> COINS[Award Level Coins]
    COINS --> MILESTONE{Level % 10 == 0?}

    MILESTONE -->|Yes| BONUS[+100 Bonus Coins]
    MILESTONE -->|No| REMAIN[Remaining XP]

    BONUS --> REMAIN
    REMAIN --> MAXCHECK{Level == 60?}

    MAXCHECK -->|Yes| DONE
    MAXCHECK -->|No| CHECK

    DONE --> END([Complete])
    FAILED --> END
```

---

## Tier Progression Visualization

```mermaid
flowchart LR
    subgraph NEWBIE["Newbie (0-10)"]
        L1[Level 1]
        L10[Level 10]
    end

    subgraph BEGINNER["Beginner (11-20)"]
        L11[Level 11]
        L20[Level 20]
    end

    subgraph INTERMEDIATE["Intermediate (21-30)"]
        L21[Level 21]
        L30[Level 30]
    end

    subgraph ADVANCED["Advanced (31-40)"]
        L31[Level 31]
        L40[Level 40]
    end

    subgraph EXPERT["Expert (41-50)"]
        L41[Level 41]
        L50[Level 50]
    end

    subgraph MASTER["Master (51-60)"]
        L51[Level 51]
        L60[Level 60]
    end

    L1 --> L10
    L10 --> L11
    L11 --> L20
    L20 --> L21
    L21 --> L30
    L30 --> L31
    L31 --> L40
    L40 --> L41
    L41 --> L50
    L50 --> L51
    L51 --> L60

    style NEWBIE fill:#808080
    style BEGINNER fill:#32CD32
    style INTERMEDIATE fill:#1E90FF
    style ADVANCED fill:#9932CC
    style EXPERT fill:#FFD700
    style MASTER fill:#FF4500
```

---

## Module Dependency Graph

```mermaid
flowchart TD
    APP[AppModule]

    APP --> CONFIG[ConfigModule]
    APP --> MONGO[MongooseModule]
    APP --> AUTH[AuthModule]
    APP --> USERS[UsersModule]
    APP --> CHALLENGES[ChallengesModule]
    APP --> SUBMISSIONS[SubmissionsModule]
    APP --> AI[AiModule]
    APP --> SHOP[ShopModule]
    APP --> ANNOUNCE[AnnouncementsModule]
    APP --> TX[TransactionsModule]

    AUTH --> USERS
    AUTH --> JWT[JwtModule]
    AUTH --> PASSPORT[PassportModule]

    SUBMISSIONS --> CHALLENGES
    SUBMISSIONS --> USERS
    SUBMISSIONS --> AI

    SHOP --> USERS
    SHOP --> TX

    style APP fill:#e1f5fe
    style AUTH fill:#fff3e0
    style USERS fill:#e8f5e9
    style SUBMISSIONS fill:#fce4ec
    style SHOP fill:#f3e5f5
```

---

## Weekend Access Control

```mermaid
flowchart TD
    REQ([API Request]) --> GUARD{Weekend Guard}

    GUARD --> CHECK[Get Current Day]
    CHECK --> DAY{Day of Week?}

    DAY -->|Saturday| ALLOW[Allow Access]
    DAY -->|Sunday| ALLOW
    DAY -->|Monday-Friday| BYPASS{BYPASS_WEEKEND_CHECK?}

    BYPASS -->|true| ALLOW
    BYPASS -->|false| DENY[403 Forbidden]

    ALLOW --> CONTINUE[Continue to Controller]
    DENY --> ERROR[Return Error Response]

    style ALLOW fill:#4caf50,color:#fff
    style DENY fill:#f44336,color:#fff
```

---

## Data Flow Overview

```mermaid
flowchart LR
    subgraph Input
        REG[Register]
        LOGIN[Login]
        SUBMIT[Submit Code]
        BUY[Purchase Item]
    end

    subgraph Processing
        AUTH_P[Authentication]
        EVAL_P[AI Evaluation]
        LEVEL_P[Leveling]
        SHOP_P[Shop Transaction]
    end

    subgraph Storage
        USER_DB[(Users)]
        CHALLENGE_DB[(Challenges)]
        SUBMISSION_DB[(Submissions)]
        SHOP_DB[(Shop Items)]
        PURCHASE_DB[(Purchases)]
        TX_DB[(Transactions)]
    end

    subgraph Output
        TOKEN[JWT Token]
        PROFILE[User Profile]
        RESULT[Submission Result]
        RECEIPT[Purchase Receipt]
    end

    REG --> AUTH_P --> USER_DB --> TOKEN
    LOGIN --> AUTH_P --> TOKEN
    SUBMIT --> EVAL_P --> SUBMISSION_DB --> RESULT
    EVAL_P --> LEVEL_P --> USER_DB --> PROFILE
    BUY --> SHOP_P --> PURCHASE_DB --> RECEIPT
    SHOP_P --> TX_DB
    SHOP_P --> USER_DB
```

---

## How to View These Diagrams

These diagrams are written in [Mermaid](https://mermaid.js.org/) syntax. You can view them:

1. **GitHub** - Renders Mermaid diagrams automatically in markdown files
2. **VS Code** - Install "Markdown Preview Mermaid Support" extension
3. **Online** - Paste code at [mermaid.live](https://mermaid.live/)
4. **Documentation tools** - Docusaurus, GitBook, Notion all support Mermaid
