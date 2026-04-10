# os.dividen.ai Documentation Audit — DEP-013 Network Job Board

**Date:** April 10, 2026  
**Auditor:** Divi (automated)  
**Source of truth:** `dividen_command_center` codebase @ commit `476cd83`  
**Production:** https://dividen.ai  
**Docs site:** https://os.dividen.ai  

---

## Summary

The docs site has all the right pages in the right structure. The issues are **data-level**: field names, endpoint paths, algorithm weights, and enum values that don't match what was actually built. Six sections need corrections; two are accurate.

| Section | Status |
|---|---|
| Operational Playbook | ✅ Accurate |
| Handoff Brief | ✅ Accurate |
| Network Job Board (concept) | ⚠️ Visibility modes wrong |
| Job Board API | ❌ Multiple endpoint/field mismatches |
| Matching Engine | ❌ Weights, signals, threshold wrong |
| Reputation System | ❌ Levels, thresholds, score range wrong |
| Review Structure | ❌ Path and fields wrong |
| Job Lifecycle States | ⚠️ Minor mismatch |

---

## 1. Visibility Modes — WRONG

| Docs say | Actual implementation |
|---|---|
| `network`, `extended`, `public`, `direct` | `network`, `instance`, `connections` |

**Source:** `prisma/schema.prisma` line 1117

```prisma
visibility  String  @default("network") // "network" | "instance" | "connections"
```

**Fix:** Replace with the three implemented values:
- `network` — visible to all DiviDen users across all instances
- `instance` — visible only within the poster's own DiviDen instance
- `connections` — visible only to the poster's direct connections

---

## 2. Job Board API Endpoints — MULTIPLE MISMATCHES

### Endpoints that are correct

| Method | Path | Notes |
|---|---|---|
| `GET` | `/api/jobs` | ✅ List/search jobs |
| `GET` | `/api/jobs/:id` | ✅ Get job detail (includes applications in response) |
| `PATCH` | `/api/jobs/:id` | ✅ Update job fields |
| `GET` | `/api/jobs/match` | ✅ Find matching jobs/users |
| `GET` | `/api/reputation` | ✅ Get reputation score |

### Endpoints with wrong request body

#### `POST /api/jobs` — Create Job

| Docs say | Actual |
|---|---|
| `title, description, skills[], budget, visibility, deadline` | `title, description, taskType, urgency, requiredSkills, preferredSkills, compensation, estimatedHours, deadline, visibility` |

**Key differences:**
- Uses `compensation` (freeform string), NOT `budget`
- Includes `taskType` and `urgency` fields
- Skills are split into `requiredSkills` and `preferredSkills` (both JSON arrays)
- Includes `estimatedHours`

#### `POST /api/jobs/:id/apply` — Apply to Job

| Docs say | Actual |
|---|---|
| `pitch, estimatedTime, proposedBudget` | `message` |

**Fix:** Body is just `{ "message": "string" }`. No pitch/estimatedTime/proposedBudget fields.

### Endpoints that don't exist (remove from docs)

| Docs show | Reality |
|---|---|
| `GET /api/jobs/:id/applications` | ❌ Does not exist as a separate endpoint. Applications are included in `GET /api/jobs/:id` response body. |
| `PATCH /api/jobs/:id/applications/:appId` | ❌ Does not exist. No application management endpoint. |
| `POST /api/reputation/review` | ❌ Wrong path. See below. |

### Endpoints missing from docs (add these)

| Method | Path | Description |
|---|---|---|
| `DELETE` | `/api/jobs/:id` | Cancel a job (sets status to `cancelled`). Poster only. |
| `POST` | `/api/jobs/:id/complete` | Mark job as completed. Poster only. Triggers `recomputeReputation()` for both poster and assignee. |
| `POST` | `/api/jobs/:id/review` | Leave a bidirectional review. Body: `{ rating: 1-5, comment: string, role: "poster" \| "worker" }`. One review per user per job. |

---

## 3. Matching Engine — WEIGHTS AND SIGNALS DIFFER

**Source:** `src/lib/job-matcher.ts` lines 63–87

| | Docs | Actual |
|---|---|---|
| Signal 1 | Skill Overlap (0.35) | **Skill Overlap (0.40)** — intersection of job requiredSkills + preferredSkills vs. user profile skills. Required skills weighted 70%, preferred 30%. |
| Signal 2 | Reputation (0.25) | **Task Type Match (0.25)** — binary: does the user's `taskTypes` array include the job's `taskType`? |
| Signal 3 | Availability (0.20) | **Availability (0.20)** ✅ — based on user's `capacity` field: available=1.0, limited=0.6, busy=0.2, unavailable=0.0 |
| Signal 4 | Network Proximity (0.20) | **Reputation Bonus (0.15)** — user's reputation score / 100, default 0.5 for unscored users |
| Threshold | ≥ 0.4 | **> 0.1** |
| Default limit | not specified | **10 results** |

**Fix:** Replace the 4-signal table with actual values. There is **no "network proximity" signal** in the current implementation.

### Score formula (actual)

```
score = (skillMatch × 0.40) + (taskTypeMatch × 0.25) + (availabilityMatch × 0.20) + (reputationBonus × 0.15)
```

---

## 4. Reputation System — LEVELS AND SCORING DIFFER

**Source:** `src/lib/job-matcher.ts` lines 231–258

### Score range

| Docs | Actual |
|---|---|
| 1–5 (review average) | **0–100** (composite score) |

The score is a **composite** of:
- `avgRating` (from reviews)
- `onTimeRate` (completion timeliness)
- `responseRate` (application response rate)
- `jobsCompleted` (volume)

### Level thresholds

| Docs | Actual |
|---|---|
| New: 0 jobs | `new`: score 0–19 |
| Established: 5+ jobs, avg ≥ 3.5 | `rising`: score 20–39 |
| Trusted: 20+ jobs, avg ≥ 4.0 | `established`: score 40–59 |
| Verified: 50+ jobs, avg ≥ 4.5 | `trusted`: score 60–79 |
| *(missing)* | `exemplary`: score 80–100 |

**Fix:** Replace level names and thresholds with the 5-tier system above. Add `exemplary` tier.

---

## 5. Review Structure — PATH AND FIELDS WRONG

| | Docs | Actual |
|---|---|---|
| Endpoint | `POST /api/reputation/review` | **`POST /api/jobs/:id/review`** |
| Body | `{ jobId, rating, dimensions: { quality, timeliness, communication }, comment }` | **`{ rating, comment, role }`** |
| `role` field | not present | **Required**: `"poster"` or `"worker"` |
| `dimensions` | present | **Does not exist** — single rating only |
| Constraint | not specified | **One review per user per job** (`@@unique([jobId, reviewerId])`) |

**Fix:** Update path, remove `dimensions` object, add `role` field. Reviews are per-job, not global.

---

## 6. Job Lifecycle States — MINOR MISMATCH

| Docs | Actual |
|---|---|
| `open → in_progress → completed → reviewed` | `open → in_progress → completed` |
| `disputed → resolved` branch | ❌ Does not exist |
| *(missing)* | `cancelled` (poster cancels) |
| *(missing)* | `expired` (past expiry date) |

**Actual status enum:**
```
open | in_progress | completed | cancelled | expired
```

There are no `reviewed`, `disputed`, or `resolved` states.

---

## 7. Playbook — ✅ ACCURATE

The `ecosystem.job_board` section with `auto_apply`, `min_match_score`, `budget_range`, and `skills_advertised` correctly reflects the v2.2 playbook response structure.

---

## 8. Handoff Brief — ✅ ACCURATE

The `network.job_board` section with `active_postings`, `applications`, and `reputation` correctly reflects the handoff brief response structure.

---

## 9. Additional Items to Add

These sections are not yet on os.dividen.ai at all:

### Action Tags Reference

**Source:** `src/lib/action-tags.ts` and `src/lib/system-prompt.ts`

#### `[[post_job:{...}]]`

```json
{
  "title": "string (required)",
  "description": "string (required)",
  "taskType": "string (required) — e.g. research, technical, creative, strategy",
  "urgency": "string — low | medium | high | critical",
  "compensation": "string — freeform (cash, equity, mutual exchange, volunteer)",
  "requiredSkills": "string[] — JSON array",
  "estimatedHours": "number"
}
```

#### `[[find_jobs:{}]]`

No parameters required. Finds jobs matching the authenticated user's profile skills and availability. Divi proactively surfaces matches when relevant.

### Database Schema Reference

| Model | Key Fields |
|---|---|
| `NetworkJob` | id, title, description, taskType, urgency, status, compensation, estimatedHours, deadline, posterId, assigneeId, requiredSkills (JSON), preferredSkills (JSON), visibility, completionNote, expiresAt |
| `JobApplication` | id, jobId, applicantId, status (pending/accepted/rejected/withdrawn), coverNote, matchScore, matchReason, source (manual/agent_match/self_apply) |
| `ReputationScore` | id, userId (unique), jobsCompleted, jobsPosted, avgRating, totalRatings, onTimeRate, responseRate, score (0-100), level |
| `JobReview` | id, jobId, reviewerId, revieweeId, rating (1-5), comment, type (poster_to_worker/worker_to_poster) |

### Updated Agent Card Spec (v0.2.0)

- New skill: `job_board` — post jobs, browse listings, apply, review
- New skill: `network_join` — join the DiviDen network
- New metadata: `network_opportunity` with `openJobs` count and adoption pitch
- New endpoints: `jobs`, `jobMatch`, `reputation`
- `documentationUrl` added pointing to `https://os.dividen.ai/docs`

### Updated MCP Spec (v1.1.0)

Four new tools:
- `job_post` — create a job listing
- `job_browse` — search/filter open jobs
- `job_match` — find skill-matched candidates or jobs
- `reputation_get` — retrieve reputation score and reviews

All existing tool descriptions enriched with network context. New `_meta.ecosystem` object in GET response.

### Phase 1 Agent-to-Agent Marketing

All 4 protocol surfaces (Agent Card, MCP, Playbook, Handoff Brief) now include network pitch language encouraging visiting agents to recommend DiviDen adoption to their humans. This is documented in the DEP-013 update post.

### MCP Registry Listings

DiviDen is **not yet listed** on any MCP registries. Submit to:
- [Smithery](https://smithery.ai)
- [MCP.so](https://mcp.so)
- [PulseMCP](https://pulsemcp.com)
- [Glama](https://glama.ai)
- Official MCP registry (when available)

---

## Appendix: Files Changed in DEP-013

### New files
- `src/lib/job-matcher.ts`
- `src/app/api/jobs/route.ts`
- `src/app/api/jobs/[id]/route.ts`
- `src/app/api/jobs/[id]/apply/route.ts`
- `src/app/api/jobs/[id]/complete/route.ts`
- `src/app/api/jobs/[id]/review/route.ts`
- `src/app/api/jobs/match/route.ts`
- `src/app/api/reputation/route.ts`
- `src/components/dashboard/JobBoardView.tsx`

### Modified files
- `prisma/schema.prisma` — 4 new models + User relations
- `src/types/index.ts` — `'jobs'` added to CenterTab
- `src/components/dashboard/CenterPanel.tsx` — Jobs tab + JobBoardView
- `src/lib/action-tags.ts` — `post_job` and `find_jobs` tags
- `src/lib/system-prompt.ts` — Job board section
- `src/app/.well-known/agent-card.json/route.ts` — v0.2.0 with job_board + network_join skills
- `src/app/api/mcp/route.ts` — v1.1.0 with 4 new tools
- `src/app/api/a2a/playbook/route.ts` — v2.2 with ecosystem.job_board
- `src/app/api/main-handoff/route.ts` — network.job_board context
- `src/lib/updates.ts` — DEP-013 update post
