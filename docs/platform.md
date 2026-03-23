# Rivo Platform — Context Document for AI Coding Agent
> **Source:** Confluence @ rivogaming.atlassian.net  
> **Last synced:** 2026-03-23  
> **Purpose:** Full platform context for Backoffice frontend development

---

## Table of Contents
1. [Platform Overview](#1-platform-overview)
2. [Architecture Principles](#2-architecture-principles)
3. [Backend Tech Stack & Standards](#3-backend-tech-stack--standards)
4. [Frontend Tech Stack](#4-frontend-tech-stack)
5. [Backoffice Application](#5-backoffice-application)
6. [Authentication & RBAC](#6-authentication--rbac)
7. [API Reference — All Operator Endpoints](#7-api-reference--all-operator-endpoints)
8. [Data Architecture & Database Design](#8-data-architecture--database-design)
9. [Platform Modules Summary](#9-platform-modules-summary)
10. [Multi-Tenancy](#10-multi-tenancy)
11. [Business Logic & Rules](#11-business-logic--rules)
12. [Non-Functional Requirements](#12-non-functional-requirements)

---

## 1. Platform Overview

**Rivo** is an MVP-first iGaming operator platform for the **African market** — a Sportsbook + Casino operator SaaS. It integrates with external Casino Aggregators, Sportsbook Providers, and Payment Service Providers (PSPs). No games or betting content are built in-house.

**Key characteristics:**
- Multi-tenant (one platform instance, multiple Partners/brands)
- Africa-first: mobile money (M-Pesa, eMola, mKesh), low-bandwidth support
- Single currency in MVP; multi-currency post-MVP
- Keycloak for auth (two isolated realms: `player-realm` + `operator-realm`)
- All internal service-to-service communication via **mTLS** (AWS App Mesh / Envoy)
- Wallet / Ledger is the **single source of truth** for all real-money balances

**Platform = two distinct interfaces:**
- **Frontoffice** — player-facing (Next.js SSR, bespoke design)
- **Backoffice** — operator/admin tooling (React SPA, data-heavy)

---

## 2. Architecture Principles

| Principle | Detail |
|-----------|--------|
| Single source of truth | Wallet/Ledger owns all real-money balances. External providers never write to it directly. |
| Idempotency everywhere | All PSP, Casino, and Sportsbook callbacks are processed idempotently. |
| Event-driven async | Gaming callbacks, bonus triggers, tournament scoring via Kafka. Core wallet ops are synchronous. |
| Resilience by design | Circuit breakers (Casino, Bonus), cash-only fallback, reconciliation workers for missed callbacks. |
| mTLS internal | All service-to-service traffic encrypted + mutually authenticated. |
| Hybrid DB | Wallet has its own dedicated PostgreSQL instance. All other services share one instance with schema-per-service isolation. |
| Security by design | Least-privilege, per-schema DB users, dual-realm Keycloak, operator 2FA, append-only audit logs, four-eyes approval for large adjustments. |

**Architecture layers:**

```
Client (Web / Mobile)
  → API Gateway (rate limiting, DDoS, JWT pre-validation, routing)
  → Keycloak HA Cluster (player-realm + operator-realm)
  → Core Platform Services (Auth, Wallet, Payments, Casino, Sportsbook, GameLauncher, BackOffice, BonusEngine, Tournaments)
  → External Partners (Casino Aggregator, Sportsbook Provider iframe, PSP Router)
  → Infrastructure (Kafka/AWS MSK, SignalR, Scheduler)
  → Storage (PG Wallet dedicated, PG Shared schemas, Redis, PG Keycloak)
```

---

## 3. Backend Tech Stack & Standards

**Language / Framework:** .NET (C#) — services follow Clean Architecture:
```
Rivo.[ServiceName]/
├── Rivo.[ServiceName].Api/             ← HTTP controllers, middleware
├── Rivo.[ServiceName].Application/     ← Use cases, commands, queries (MediatR)
├── Rivo.[ServiceName].Domain/          ← Entities, domain logic, interfaces
├── Rivo.[ServiceName].Infrastructure/  ← DB, Kafka, external HTTP clients
└── Rivo.[ServiceName].Tests/
```

**Shared NuGet packages:**
| Package | Purpose |
|---------|---------|
| `Rivo.Platform.TenantContext` | ITenantContext, TenantRepository base, RLS middleware |
| `Rivo.Platform.Messaging` | KafkaEventPublisher, standard event envelope |
| `Rivo.Platform.IdempotencyStore` | Redis-backed idempotency check/store |
| `Rivo.Platform.Http` | Internal HttpClient factory with mTLS + header propagation |

**Critical backend rules (non-negotiable):**
- Every table has `tenant_id` column as second column
- Every DB transaction sets `SET LOCAL app.tenant_id = '...'` (activates PostgreSQL RLS)
- All monetary values use `DECIMAL(18,4)` — never `float`/`double`
- All PKs are UUID — never auto-increment
- All timestamps are UTC (`DateTime.UtcNow`)
- Append-only tables: `ledger_entries`, `audit_log`, all `*_callbacks` tables — never UPDATE or DELETE
- Every Kafka event must include `tenant_id` as top-level field
- Every money-moving endpoint must check idempotency before processing
- Optimistic locking on `player_wallet` (version column) — max 3 retries at 50ms intervals

**HTTP error standards:**
| Situation | Status |
|-----------|--------|
| Missing/invalid tenant_id | 400 |
| Invalid/expired JWT | 401 |
| Player blocked / tenant mismatch | 403 |
| Not found | 404 |
| Optimistic lock conflict (after retries) | 409 |
| Duplicate (idempotency) | 200 — return cached result |
| Insufficient funds | 422 |
| Internal error | 500 — never expose stack trace |

---

## 4. Frontend Tech Stack

### Tech Stack
| Technology | Choice | Reason |
|------------|--------|--------|
| Framework | React (Vite for Backoffice) | SPAs don't need SSR; simpler static hosting |
| Styling | Tailwind CSS + Shadcn/ui | Zero-CSS utility-first; single shared component library |
| State management | Zustand | Lightweight, handles real-time data flows |
| Linting/formatting | Biome | Replaces ESLint + Prettier; ~10-20x faster |
| Monorepo tool | Turborepo | Multi-app monorepo with shared packages |

### Backoffice Monorepo Structure
```
backoffice/
├── apps/
│   ├── admin/          # Platform Tools SPA (player mgmt, bonuses, payments, KYC, risk, analytics)
│   └── cms/            # CMS SPA (banners, navigation, static pages, branding)
├── packages/
│   ├── ui/             # Backoffice Design System (Shadcn)
│   ├── icons/          # Icons Library
│   └── sdk/            # API SDK (shared core + app-level modules)
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

### SDK Structure
```
packages/
└── sdk-core/
    ├── auth/       ← login, logout, token refresh, session
    ├── config/     ← tenant config fetching
    ├── meta/       ← languages, currencies, feature flags
    ├── http/       ← base HTTP client, interceptors, error normalisation
    └── types/      ← shared response types, pagination, error models

apps/admin/src/sdk/
    ├── players/
    ├── payments/
    ├── bonuses/
    └── kyc/

apps/cms/src/sdk/
    ├── banners/
    ├── navigation/
    ├── pages/
    └── branding/
```

### Authentication (Frontend)
- **Access Token:** 15-minute lifetime, stored in **memory only** (never localStorage/cookies)
- **Refresh Token:** 30-day lifetime, stored in **HTTP-only cookie**
- Token rotation on every refresh
- Separate token spaces for player and operator
- On 401: auto-refresh using refresh token from cookie

---

## 5. Backoffice Application

### Overview
The Backoffice is a **Turborepo monorepo** with two independent React SPAs sharing a Design System, Icons Library, and SDK.

**Platform Tools (`apps/admin`)** — Main operational hub:
- Player management (search, view, block, self-exclude)
- Bonus engine (campaigns, wagering, abuse controls)
- Payments (monitoring, overrides, reconciliation exceptions)
- KYC review (post-MVP)
- Risk / fraud queue
- Analytics and KPIs
- Wallet adjustments (with four-eyes approval above €500)
- Audit log viewer

**CMS (`apps/cms`)** — Content management:
- Homepage banners (image, title, CTA, order, visibility)
- Navigation menus (header, footer, mobile)
- Static pages (Terms, Privacy, Promotions)
- Branding (logo, favicon, colors, fonts)
- Draft/published versioning — changes only go live after explicit publish action

### CMS Data Structure
```
TenantConfig
├── tenantId
├── status: draft | published
├── branding { logo, favicon, colors { primary, secondary, background, text }, fonts { heading, body } }
├── banners[] { id, slug, image, title, subtitle, cta { label, url }, order, visible }
├── navigation { header[], footer[], mobile[] } — each item: { label, url, order, visible }
└── pages[] { id, slug, title, content (rich text), visible }
```

### Backoffice Design System
- Built on **Shadcn Studio** (single `/packages/ui` folder)
- All two sub-apps import from this package — guaranteed visual consistency
- Mobile-first + PWA wrapper with Service Workers for Web Push Notifications

---

## 6. Authentication & RBAC

### Keycloak Operator Realm
- Operators authenticate via `operator-realm` (completely separate from `player-realm`)
- Login endpoint: `POST /auth/operator`
- JWT TTL: **8 hours** (one working shift)
- JWT claims: `sub` (operator UUID), `realm: operator-realm`, `roles[]`, `tenant_id`, `exp`
- Player JWTs are **cryptographically invalid** in operator-realm

### 2FA
- Enforced for `senior-operator` and `admin` roles
- TOTP only (Google Authenticator, Authy)
- Must be enrolled during account setup
- Re-prompted on every new session login

### Session Management
| Rule | Value |
|------|-------|
| Idle timeout | 30 minutes |
| Max session lifetime | 8 hours |
| Concurrent sessions | **Max 1 per operator** — 2nd login invalidates 1st |
| 2FA re-prompt | On every new session |

### RBAC — Three Roles

| Permission | `operator` | `senior-operator` | `admin` |
|-----------|:---:|:---:|:---:|
| View player profile & status | ✅ | ✅ | ✅ |
| View wallet balance & history | ✅ | ✅ | ✅ |
| View payment records & PSP status | ✅ | ✅ | ✅ |
| View casino & sportsbook bets | ✅ | ✅ | ✅ |
| View reconciliation exceptions | ✅ | ✅ | ✅ |
| View audit log | ✅ | ✅ | ✅ |
| Block / unblock player | ❌ | ✅ | ✅ |
| Apply / remove self-exclusion | ❌ | ✅ | ✅ |
| Manual wallet adjust (≤ €500) | ❌ | ✅ | ✅ |
| Manual wallet adjust (> €500) | ❌ | ✅ (needs co-approval) | ✅ (self-approve) |
| Manual payment status override | ❌ | ✅ | ✅ |
| Force-close game session | ❌ | ✅ | ✅ |
| Resolve reconciliation exceptions | ❌ | ✅ | ✅ |
| Manage operator accounts | ❌ | ❌ | ✅ |
| Configure feature flags | ❌ | ❌ | ✅ |
| View system health dashboard | ❌ | ❌ | ✅ |

### Four-Eyes Principle (Wallet Adjustments)
- **≤ €500:** `senior-operator` or `admin` can execute immediately
- **> €500:** `senior-operator` submits → second `senior-operator`/`admin` must approve
- `admin` can self-approve above threshold
- Approval request expires after **24 hours** if not actioned
- All approvals/rejections are audit logged
- Threshold is configurable by `admin` (change itself audit logged)

---

## 7. API Reference — All Operator Endpoints

All operator endpoints require **Operator JWT** (`operator-realm`). Routed via `/api/v1/operator/**`.

### Player Management
| Endpoint | Min Role | Description |
|----------|----------|-------------|
| `GET /api/v1/operator/players` | operator | Search and list players |
| `GET /api/v1/operator/players/:id` | operator | View player profile |
| `POST /api/v1/operator/players/:id/block` | senior | Block player |
| `POST /api/v1/operator/players/:id/unblock` | senior | Unblock player |
| `POST /api/v1/operator/players/:id/self-exclude` | senior | Apply self-exclusion |
| `DELETE /api/v1/operator/players/:id/self-exclude` | senior | Remove self-exclusion |
| `GET /api/v1/operator/players/:id/sessions` | operator | View active sessions |
| `DELETE /api/v1/operator/players/:id/sessions` | senior | Terminate all sessions |

### Wallet & Adjustments
| Endpoint | Min Role | Description |
|----------|----------|-------------|
| `GET /api/v1/operator/wallet/:playerId` | operator | View balance and ledger |
| `POST /api/v1/operator/wallet/:playerId/adjust` | senior | Manual wallet adjustment |
| `GET /api/v1/operator/wallet/adjustments/:id/approve` | senior | Approve pending adjustment |

### Payments
| Endpoint | Min Role | Description |
|----------|----------|-------------|
| `GET /api/v1/operator/payments` | operator | List all payments with filters |
| `GET /api/v1/operator/payments/:id` | operator | View payment detail |
| `POST /api/v1/operator/payments/:id/override` | senior | Manually override payment status |
| `GET /api/v1/operator/reconciliation/exceptions` | operator | View reconciliation exceptions queue |
| `POST /api/v1/operator/reconciliation/exceptions/:id/resolve` | senior | Resolve exception |

### Game Sessions
| Endpoint | Min Role | Description |
|----------|----------|-------------|
| `GET /api/v1/operator/sessions` | operator | View active game sessions |
| `DELETE /api/v1/operator/sessions/:id` | senior | Force-close game session |
| `GET /api/v1/operator/games/audit` | operator | Query launch audit trail |

### Tournaments
| Endpoint | Min Role | Description |
|----------|----------|-------------|
| `POST /api/v1/operator/tournaments` | senior | Create tournament |
| `PUT /api/v1/operator/tournaments/:id` | senior | Update tournament definition |
| `POST /api/v1/operator/tournaments/:id/cancel` | senior | Cancel tournament |
| `GET /api/v1/operator/tournaments/:id/rewards` | operator | View reward assignment states |
| `POST /api/v1/operator/tournaments/:id/rewards/:assignmentId/resolve` | senior | Manually resolve failed reward |
| `POST /api/v1/operator/tournaments/:id/players/:playerId/disqualify` | senior | Disqualify player |
| `POST /api/v1/operator/tournaments/:id/players/:playerId/score-adjust` | senior | Manual score correction |

### Audit & System
| Endpoint | Min Role | Description |
|----------|----------|-------------|
| `GET /api/v1/operator/audit` | operator | Query audit log |
| `GET /api/v1/operator/health` | admin | Platform health dashboard |

---

## 8. Data Architecture & Database Design

### Database Map
| Database | Owner Service | Instance | Purpose |
|----------|--------------|----------|---------|
| **Wallet DB** | Wallet Service | **Dedicated** | Player balances + immutable ledger |
| **Casino DB** | Casino Integration | **Dedicated** | Casino rounds, callbacks, reconciliation |
| **Sportsbook DB** | Sportsbook Integration | **Dedicated** | Sportsbook bets and callbacks |
| **Payments DB** | Payments Service | **Dedicated** | Deposits, withdrawals, PSP callbacks |
| **Shared Platform DB** | Auth, BackOffice, Bonus, Tournament, CMS, Translation | **Shared** (schema-per-service) | All other services |
| **Keycloak DB** | Keycloak | **Dedicated** | Identity provider |

> Casino and Sportsbook have **separate** dedicated DBs (not a shared Bets DB) — a Casino DB failure must never affect Sportsbook.

### Shared Platform DB — Schema Isolation
```
shared-platform-db
├── schema: auth          → auth_service_user only
├── schema: backoffice    → backoffice_service_user only
├── schema: bonus         → bonus_service_user only
├── schema: tournament    → tournament_service_user only
├── schema: cms           → cms_service_user only
└── schema: translation   → translation_service_user only
```

### Key Tables

**`player_wallet` (Wallet DB)**
```sql
player_id UUID PK, tenant_id UUID NOT NULL,
balance DECIMAL(18,4), reserved_balance DECIMAL(18,4),
currency CHAR(3), version INTEGER, updated_at TIMESTAMP
```

**`ledger_entries` (Wallet DB) — APPEND-ONLY**
```sql
entry_id UUID PK, tenant_id UUID NOT NULL, player_id UUID,
amount DECIMAL(18,4), direction CHAR(1),  -- 'C' credit / 'D' debit
balance_after DECIMAL(18,4), entry_type VARCHAR(30),
reference_id UUID, reference_type VARCHAR(30),
idempotency_key UUID UNIQUE NOT NULL, created_at TIMESTAMP
```
**entry_type values:** `DEPOSIT`, `WITHDRAWAL`, `WITHDRAWAL_RESERVE`, `WITHDRAWAL_RELEASE`, `CASINO_BET`, `CASINO_WIN`, `CASINO_REFUND`, `SPORTSBOOK_BET`, `SPORTSBOOK_WIN`, `SPORTSBOOK_REFUND`, `BONUS_CREDIT`, `BONUS_EXPIRY`, `MANUAL_ADJUSTMENT`

**`casino_rounds` (Casino DB)**
```sql
round_id UUID PK, tenant_id UUID NOT NULL, player_id UUID,
session_id UUID, game_id VARCHAR(100), game_name VARCHAR(200),
game_category VARCHAR(50), provider_id VARCHAR(50),
status VARCHAR(20),  -- OPEN / WON / LOST / REFUNDED / CANCELLED / STUCK
bet_amount DECIMAL(18,4), win_amount DECIMAL(18,4),
currency CHAR(3), wallet_debit_id UUID, wallet_credit_id UUID,
opened_at TIMESTAMP, closed_at TIMESTAMP
```

**`sportsbook_bets` (Sportsbook DB)**
```sql
bet_id UUID PK, tenant_id UUID NOT NULL, player_id UUID,
provider_id VARCHAR(50), sport_category VARCHAR(50), league VARCHAR(100),
match_name VARCHAR(200), bet_type VARCHAR(30),
status VARCHAR(30),  -- PLACED / WON / LOST / VOID / CASHOUT / PENDING_SETTLEMENT / STUCK
odds DECIMAL(10,4), bet_amount DECIMAL(18,4),
potential_win DECIMAL(18,4), actual_win DECIMAL(18,4),
currency CHAR(3), wallet_debit_id UUID, wallet_credit_id UUID,
placed_at TIMESTAMP, settled_at TIMESTAMP
```

**`payments` (Payments DB)**
```sql
payment_id UUID PK, tenant_id UUID NOT NULL, player_id UUID,
type VARCHAR(20),    -- DEPOSIT / WITHDRAWAL
status VARCHAR(30),  -- PENDING / PROCESSING / COMPLETED / FAILED / CANCELLED / REQUIRES_REVIEW
amount DECIMAL(18,4), currency CHAR(3),
psp_id VARCHAR(50), psp_reference VARCHAR(200),
wallet_entry_id UUID, failure_reason VARCHAR(500),
initiated_at TIMESTAMP, completed_at TIMESTAMP
```

**`backoffice.audit_log` — APPEND-ONLY, 5-year retention**
```sql
audit_id UUID PK, operator_id UUID, operator_role VARCHAR,
action_type VARCHAR,  -- PLAYER_BLOCK / PLAYER_UNBLOCK / SELF_EXCLUDE / WALLET_ADJUST /
                      -- PAYMENT_OVERRIDE / SESSION_CLOSE / RECONCILIATION_RESOLVE /
                      -- APPROVAL_GRANTED / APPROVAL_REJECTED / THRESHOLD_CHANGED / LOGIN / LOGOUT
target_entity_type VARCHAR,  -- PLAYER / PAYMENT / WALLET / SESSION / SYSTEM
target_entity_id UUID, before_value JSONB, after_value JSONB,
reason VARCHAR NOT NULL,  -- min 10 chars, mandatory for all write actions
ip_address VARCHAR, correlation_id VARCHAR, session_id VARCHAR,
created_at TIMESTAMP  -- immutable
```

**`backoffice.adjustment_approvals`**
```sql
-- status: PENDING / APPROVED / REJECTED / EXPIRED
-- expires after 24 hours
```

### Row-Level Security (RLS)
All sensitive tables have PostgreSQL RLS enforced. Every service sets `app.tenant_id` at the start of each transaction:
```sql
SET LOCAL app.tenant_id = 'uuid-partner-1';
```
If `app.tenant_id` is not set — queries return zero rows. Data never leaks across tenants.

### Player Transaction History (BFF Pattern)
There is no unified transaction history table. The history screen is assembled by a BFF service aggregating:
- `Wallet Service` → completed ledger entries
- `Payments Service` → pending/processing payments
- `Casino Service` → open casino rounds
- `Sportsbook Service` → placed/pending-settlement bets

---

## 9. Platform Modules Summary

### Module Status
| Module | Phase | Status |
|--------|-------|--------|
| API Gateway | Phase 2 | ✅ Documented |
| Auth & Player Management | Phase 1 | ✅ Documented |
| Wallet / Ledger | Phase 2 | ✅ Documented |
| Payments Service | Phase 1 | ✅ Documented |
| Casino Integration | Phase 2 | ✅ Documented |
| Sportsbook Integration | Phase 3 | ⏸️ Paused — new provider pending |
| Game Launcher | Phase 2 | ✅ Documented |
| Back Office | Phase 1 | ✅ Documented |
| Bonus Engine | Phase 1 | ✅ Documented |
| Tournament Service | Phase 3 | ✅ Documented |
| MVP Fraud Prevention | Phase 2 | ✅ Documented |
| Observability / Infrastructure | Phase 2 | ✅ Documented |

### Payments Service
- Multi-PSP via abstraction layer (IPSPAdapter interface)
- PSP Router with health checks (every 30s), failover after 3 consecutive failures
- Supported PSPs: **Astropay**, **Pay4Fun**, **M-Pesa**, **eMola**, **mKesh**
- Payment State Machine:
  ```
  PENDING → PROCESSING → COMPLETED
  PENDING → PROCESSING → FAILED
  PENDING → CANCELLED
  PROCESSING → AWAITING_PLAYER_CONFIRMATION → COMPLETED (mobile money)
  PROCESSING → AWAITING_PLAYER_CONFIRMATION → FAILED (mobile money)
  COMPLETED → ROLLED_BACK
  ```
- Reconciliation Worker: runs every 30 min, auto-resolves missed callbacks
- Stuck Payment Resolver: runs every 5 min (card stuck > 15min, mobile money > 30min)

### Wallet / Ledger
- Append-only ledger — balance = sum of all ledger entries
- **Optimistic locking** with `version` column — prevents concurrent double-spend
  - Max 1 retry; if fails → `INSUFFICIENT_FUNDS`
- **Withdrawal reservation** — `reserved_balance` field; `available = balance - reserved_balance`
- Redis balance cache is **off by default** in MVP (enabled when p95 read > 500ms)

### Back Office (relevant for frontend dev)
- Owned data: `backoffice.audit_log` + `backoffice.adjustment_approvals` only
- All other data displayed is read through owning module APIs
- Does NOT write directly to any other module's database

### Bonus Engine
- Redis pre-computed funding plan cache (invalidated on any bonus state change)
- Circuit breaker with **cash-only fallback** — bets continue if Bonus Engine is unreachable
- Fallback bets flagged with `fallback_used = true` → Reconciliation Worker processes retrospectively
- **One active bonus per player** — stacking queue (max 3 queued, FIFO)
- Bonus expiry uses compare-and-swap to prevent race conditions
- Wagering contribution rates (default):
  | Game type | Contribution |
  |-----------|-------------|
  | Slots / Crash / Sportsbook pre-match | 100% |
  | Sportsbook live | 75% |
  | Table games (Blackjack, Baccarat) | 10–20% |
  | Live casino | 0–10% |
  | Progressive jackpot slots | 0% (excluded) |

### Tournament Service
- Redis Sorted Sets for live leaderboards (low-latency ranking)
- PostgreSQL for durable scoring history (append-only, supports replay/recovery)
- Kafka event-driven scoring (decoupled from game flows)
- Redis recovery: snapshots every 15 min → replay `scoring_events` since last snapshot
- Live delivery via **SignalR** (throttled: max 1 notification per tournament per 2 seconds)
- Reward distribution via **Saga pattern** with independent `TOURNAMENT_REWARD_ASSIGNMENT` records
- Tournament lifecycle: `Draft → Scheduled → Active → Completed → Finalized → Rewarded`
- Tie-breaking strategies: `EARLIEST_SCORE`, `LOWEST_STAKE`, `FIRST_TO_REACH`, `OPERATOR_DEFINED`

### Auth & Player Management
- Player statuses: `ACTIVE` / `BLOCKED` / `SELF_EXCLUDED`
- **Status propagation SLA: ≤ 500ms** — no caching, always live check
- Max **3 concurrent sessions per player** (4th login invalidates oldest)
- Token refresh grace period: 10 seconds (handles simultaneous refresh race condition)
- KYC hook placeholder (`kycStatus` field) — not activated in MVP

### API Gateway
- Rate limits:
  | Category | Limit | Window |
  |----------|-------|--------|
  | Auth (login/register) | 10 | per min per IP |
  | Payment initiation | 5 | per min per player |
  | Game launch | 20 | per min per player |
  | General API | 120 | per min per player |
  | Operator API | 60 | per min per operator |
- Route table:
  | Path | Service | Auth |
  |------|---------|------|
  | `/api/v1/auth/**` | Auth & Player Management | None |
  | `/api/v1/player/**` | Auth & Player Management | Player JWT |
  | `/api/v1/wallet/**` | Wallet / Ledger | Player JWT |
  | `/api/v1/payments/**` | Payments Service | Player JWT |
  | `/api/v1/games/**` | Game Launcher | Player JWT |
  | `/api/v1/casino/**` | Casino Integration | Player JWT |
  | `/api/v1/sports/**` | Sportsbook Integration | Player JWT |
  | `/api/v1/bonus/**` | Bonus Engine | Player JWT |
  | `/api/v1/tournaments/**` | Tournament Service | Player JWT |
  | `/api/v1/operator/**` | Back Office | **Operator JWT** |
  | `/api/v1/tenant/config` | Tenant Service | None (public) |

---

## 10. Multi-Tenancy

**Core concept:** Each **Partner** = one Tenant. Players always belong to exactly one partner.

### Tenant Resolution (Domain-Based)
```
partner1.rivo.com  →  tenant_id: "uuid-partner-1"
casino.brand.com   →  tenant_id: "uuid-partner-3"  (custom domain)
```

1. API Gateway reads `Host` header on every request
2. Looks up tenant config → `GET /internal/tenants/resolve?domain=...`
3. Injects `X-Tenant-ID: {uuid}` header on all downstream requests
4. Cache: 60s in-memory, 5min Redis; invalidated by `partner.config.updated` Kafka event

### JWT — tenant_id in Every Token
```json
{
  "sub": "player-uuid",
  "realm": "player-realm",
  "tenant_id": "uuid-partner-1",
  "status": "ACTIVE"
}
```
API Gateway validates that `tenant_id` JWT claim matches `X-Tenant-ID` header on every request.

### Tenant Config Endpoint (Frontend)
```
GET /api/v1/tenant/config   (no auth required)
```
Response includes: `tenant_id`, `branding` (colors, logo, fonts), `locale`, `features` (casino_enabled, sportsbook_enabled, bonus_enabled, tournaments_enabled), `registration` config, `support` config.

### Partners Table (in Auth DB)
```sql
partner_id UUID PK, name, slug UNIQUE, status,
-- status: ONBOARDING / ACTIVE / SUSPENDED / TERMINATED
config JSONB, domain_primary VARCHAR UNIQUE, domains_additional TEXT[],
created_at, updated_at
```

### Data Isolation
| Resource | Isolated |
|----------|---------|
| Players, Wallets, Ledger entries | ✅ Per partner |
| Casino rounds, Sportsbook bets | ✅ Per partner |
| Payments, Bonuses, CMS content | ✅ Per partner |
| Back Office operators | ✅ Per partner |
| Casino game catalog | ✅ Shared (filtered by partner config) |
| Platform services, Kafka, Redis | ✅ Shared |

---

## 11. Business Logic & Rules

### MVP Fraud Prevention Controls

**Control 1 — Deposit Limits** (enforced by Payments Service before PSP call)
| Limit | Default |
|-------|---------|
| Max single deposit | €1,000 |
| Daily deposit | €2,000 |
| Weekly deposit | €5,000 |
| Hourly deposit count | 5 |
- Players can reduce their own limits (not increase); increases have 24h cooling period

**Control 2 — Withdrawal Manual Confirmation Queue**
| Threshold | Action |
|-----------|--------|
| ≤ €200 | Auto-approved immediately |
| €200–€1,000 | Auto-approved after 1h cooling |
| > €1,000 | Manual confirmation required |
| First ever withdrawal | Manual required (any amount) |
| Withdrawal to new payment method | Manual required |
- Unreviewed items auto-escalate to `senior-operator` after 24h

**Control 3 — Velocity Checks** (flag for review, not auto-block)
- > 3 withdrawals/day → flag
- Withdrawal < 30 min after deposit → flag + manual queue
- > 10 significant actions/hour → flag

**Control 4 — Payment Method Binding**
- First withdrawal must use same payment method as most recent deposit
- Method becomes `VERIFIED` after 3 successful cycles
- Adding new payment method requires operator approval

**Control 5 — New Account Cooling Period**
- Withdrawals blocked for first 24 hours
- First 7 days: max €200 per withdrawal

**Control 6 — Login Lockout** (Keycloak Brute Force Detection)
- 5 failed attempts in 15 min → locked 30 min
- 10 failed attempts in 1 hour → locked until email verification

**Control 7 — Suspicious Activity Queue** (Back Office)
- Sources: velocity flags, manual withdrawal confirmations, method changes, login lockouts
- SLA: withdrawal confirmations within 2h; all others within 24h

**Control 8 — Deposit/Withdrawal Balance Check**
- If `total_withdrawals > total_deposits × 0.9` AND `total_bets < total_deposits × 0.1` → flag

**Config keys (editable by `admin` in Back Office, all changes audit logged):**
```
deposit.single_max = 1000
deposit.daily_max = 2000
deposit.weekly_max = 5000
withdrawal.auto_approve_max = 200
withdrawal.cooling_period_max = 1000
withdrawal.manual_review_min = 1000
new_account.withdrawal_block_hours = 24
```

### Bonus Abuse Prevention
1. **Wagering contribution rules** — per game type (see Bonus Engine section)
2. **Max bet during active bonus** — default €5 per bet (configurable per promotion)
3. **Max bonus win cap** — configurable; excess forfeited
4. **Restricted games** — configured in `PROMOTION_RULESET.restricted_games_json`
5. **Multiple account prevention** — device fingerprint, IP, payment method matching
6. **Manual operator intervention** — `senior-operator` can cancel bonus with mandatory reason

### Wallet Adjustment Business Rules
- **All write actions require a `reason` string of minimum 10 characters**
- API returns `400 Bad Request` if reason is missing or < 10 chars
- Four-eyes threshold defaults to €500 (admin-configurable)
- Adjustment request expires after 24 hours if not approved

### Player Status Rules
- `BLOCKED` / `SELF_EXCLUDED` players receive 403 on all API requests
- Self-exclusion removal requires manual operator review — no automated reinstatement
- Status propagation to all modules within 500ms of change

---

## 12. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Platform availability | 99.9% uptime (monthly) |
| Core API response time (p95) | < 500ms |
| Wallet balance read (p95) | < 50ms (PostgreSQL direct) |
| Wallet debit/credit (p95) | < 100ms |
| Operator login (p95) | < 300ms |
| Internal player status check | < 20ms |
| Player status propagation after block | ≤ 500ms |
| Casino callback processing (p95) | < 200ms |
| Game launch (p95) | < 500ms |
| Leaderboard read (p95) | < 10ms (Redis) |
| Tenant resolution (cache hit) | < 5ms |
| Audit log write | < 50ms (synchronous with action) |
| RPO (backup) | ≤ 15 minutes |
| RTO (recovery) | ≤ 1 hour |
| Idempotency | Required for all external callbacks |
| Audit log retention | 5 years minimum |
| Wallet/Ledger consistency | Strongly consistent — no eventual consistency |

### Infrastructure
- **Cloud:** AWS, primary region Africa (Cape Town) `af-south-1`
- **Containers:** EKS (Kubernetes)
- **Service mesh:** AWS App Mesh / Envoy (mTLS)
- **Managed Kafka:** AWS MSK
- **CDN:** Cloudflare with PoPs in Johannesburg, Nairobi, Lagos
- **Secrets:** AWS Secrets Manager
- **Feature flags:** Redis boolean keys (`feature:{service}:{name} = true|false`), controlled by `admin` in Back Office, 30s local TTL cache

### Kafka Topics
| Topic | Producer | Consumer |
|-------|---------|---------|
| `payments.events` | Payments Service | Bonus Engine |
| `casino.events` | Casino Integration | Tournament Service |
| `sportsbook.events` | Sportsbook Integration | Tournament Service |
| `tournament.events` | Tournament Service | Live Delivery Layer |
| `partner.events` | Back Office | API Gateway (config invalidation) |

---

## Out of Scope — MVP

| Feature | Planned |
|---------|---------|
| KYC / AML enforcement | Post-MVP |
| Dedicated Fraud / Risk Service | Post-MVP |
| Multi-region active-active | Post-MVP |
| Multi-currency | Post-MVP |
| Social / SMS login | Post-MVP |
| Automated chargeback handling | Post-MVP |
| ML-based fraud scoring | Post-MVP |
| Distributed tracing (X-Ray / Jaeger) | Post-MVP |
| Real-time dashboards | Post-MVP |
| Per-tenant Keycloak realm | Post-MVP |