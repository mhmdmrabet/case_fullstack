# case_fullstack

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

Web app over a [PydanticAI](https://ai.pydantic.dev/) data-analysis agent: ask a question in French, watch the model think, see the SQL it writes, and get a Plotly chart back — all streamed in real time over Server-Sent Events.

> Built on top of the original CLI agent. The agent code itself is largely intact — this project wraps it in a FastAPI streaming API and a React UI.

---

## Setup

```bash
# 1. Configure your LLM provider
cp .env.example .env
# Edit .env: set MODEL + the matching API key (see "LLM providers" below)

# 2. Boot the full stack
docker compose up --build
```

Open <http://localhost:5173>. Pick one of the suggested prompts in the empty state and watch the agent work.

### LLM providers

Any provider supported by PydanticAI works. Pick one in `.env`:

```env
# Google Gemini (free tier, no credit card)
MODEL=google-gla:gemini-2.5-flash
GOOGLE_API_KEY=AIza...

# Anthropic Claude
# MODEL=anthropic:claude-haiku-4-5-20251001
# ANTHROPIC_API_KEY=sk-ant-...

# OpenAI GPT
# MODEL=openai:gpt-5.4-mini-2026-03-17
# OPENAI_API_KEY=sk-proj-...
```

---

## Architecture

```
┌──────────────────────────────────┐         ┌────────────────────────────────────┐
│ Browser (Vite + React 19)        │         │ FastAPI (Python 3.12)              │
│                                  │         │                                    │
│  ChatInput ──► useChatStream ────┼──POST──►│ POST /chat/stream                  │
│                                  │  SSE    │   │                                │
│  MessageList ◄─── chatReducer ◄──┼─────────│   ▼                                │
│   ├─ ThinkingBlock               │         │ AgentRunner                        │
│   ├─ ToolCallCard                │         │   ├─ agent.iter() ──► PydanticAI   │
│   │    ├─ TableRenderer          │         │   ├─ ThinkingStreamParser          │
│   │    └─ PlotlyRenderer (lazy)  │         │   └─ asyncio.Task (cancelable)     │
│   └─ TextStream (markdown)       │         │                                    │
│                                  │         │ AgentContext.payload_sink ──► tools│
│  DatasetSidebar (shadcn Sidebar) │         │   ├─ query_data → DuckDB           │
│   └─ Popover preview (lazy)      │         │   └─ visualize  → Plotly JSON      │
└──────────────────────────────────┘         └────────────────────────────────────┘
                                                            │
                                                            ▼
                                                  in-memory sessions
                                                  deque(maxlen=50) per id
```

The chat endpoint emits 9 typed SSE events (`run.start`, `thinking.delta`, `text.delta`, `tool.call.start`, `tool.call.args.delta`, `tool.call.args.done`, `tool.result`, `run.done`, `error`). Pydantic models on the backend, mirrored as a TypeScript discriminated union on the frontend.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI 0.135+ · PydanticAI 1.84 · DuckDB · Plotly · uv |
| Frontend | Vite 8 · React 19 · TypeScript 6 · Tailwind 4 · shadcn/ui |
| Streaming | Server-Sent Events via native `fastapi.sse.EventSourceResponse` |
| Tests | pytest (38 tests) · Playwright (3 e2e specs) |
| Container | Multi-stage Docker, nginx prod serve, healthcheck on `/health` |

---

## Key technical decisions

- **SSE over WebSocket** — one-way streaming fits the use case; native FastAPI 0.135+ support means no extra dependency, automatic 15 s keepalive, automatic disconnect detection.
- **`agent.iter()` over `agent.run_stream()`** — only `iter()` exposes both text deltas *and* tool-call events (start, args delta, result), which is what the UI actually streams.
- **`AgentContext.payload_sink` callback** — tools push structured `{kind: "table", ...}` / `{kind: "figure", ...}` payloads through a callable on the context; the runner injects its own sink. Tools stay decoupled from SSE — could be swapped for WebSocket without touching them.
- **Server-side `<thinking>` parser** — the LLM emits `<thinking>...</thinking>` inline in its text. A streaming state machine with lookahead splits chunks into typed `thinking.delta` / `text.delta` events, so the frontend never sees raw tags. Handles tags split across chunk boundaries (regression-tested char by char).
- **`useReducer` + discriminated union** — single-screen chat doesn't need Zustand. Each SSE event maps to one typed action; the reducer is pure and easy to test.
- **In-memory sessions with `asyncio.Lock`** — `dict[session_id, SessionState(deque(maxlen=50), Lock)]`. No Redis, no SQLite — 15 lines of code that prove the multi-turn `message_history` pattern works.
- **DuckDB connection per tool call** — `duckdb.connect(":memory:")` is reopened on every `query_data` call. In-memory connections aren't thread-safe when shared, and creating one is cheap.
- **Plotly cartesian-dist-min, lazy-loaded** — the full Plotly bundle is 4.8 MB; the cartesian-only build is 1.4 MB and covers bar/line/scatter/pie. Loaded via `React.lazy()` so it never touches the initial bundle.
- **shadcn/ui everywhere** — `Sidebar` for the dataset panel, `Popover` for previews, `Collapsible` for the thinking block, `Sonner` for error toasts. No custom components when shadcn has one.

---

## Local development

Two flavours.

**Full stack in Docker** — what `docker compose up` does. Production-like (nginx + multi-stage backend, healthchecks). Slow rebuild on backend changes.

**Hybrid (faster iteration)** — backend in Docker, frontend with Vite HMR:

```bash
docker compose up api          # backend on :8000
cd frontend && npm install && npm run dev   # Vite on :5173 with HMR + proxy /api
```

### Tests

```bash
# Backend (38 unit tests: parser, tools, events, agent_runner)
cd backend && uv sync --extra dev && uv run pytest

# Frontend lint + type-check
cd frontend && npm run lint && npm run type-check

# E2E happy path (needs the stack running with a valid API key)
cd frontend && npm run test:e2e
```

---

## Trade-offs and next steps

Things deliberately left out for scope, with the migration path:

| Skipped | Why | Where to fix |
|---|---|---|
| **Auth** | Single-user technical test | Add session middleware + JWT in `backend/src/main.py` |
| **Persistent sessions** | In-memory dict survives one restart | Swap `SessionManager` for Redis (`redis.asyncio`) |
| **Rate limiting** | No abuse risk in eval context | `slowapi` middleware on `/chat/stream` |
| **Native `<thinking>` parts** | Provider-agnostic prompt-based parser, portable | Use `ThinkingPartDelta` from PydanticAI when targeting Gemini/Claude only |
| **Dark mode** | Cosmetic, +1 h to validate contrasts | Tailwind 4 already supports it via `.dark` class — flip the `<html>` data attribute |
| **Playwright in CI** | Needs docker-in-docker + secret API key | Add a `services` block + `secrets.OPENAI_API_KEY` in `ci.yml` |
| **Logfire / tracing** | Decorum for a 3-day test | `logfire.configure()` + `logfire.instrument_pydantic_ai()` in `lifespan` |

### Known caveats

- **`react-plotly.js` is loosely maintained** (last release 2022-09) but works fine with React 19. No drop-in replacement exists in 2026.
- **Gemini does not stream tool-call args** char-by-char (it sends them as one dict); OpenAI and Claude do. The UI handles both — `argsRaw` shows the live SQL for streaming providers, `argsDone` for batched ones.
- **First Plotly render** triggers a 1.4 MB chunk download. Subsequent renders are instant.

---

## Project structure

```
case_fullstack/
├── backend/                       FastAPI service
│   ├── src/
│   │   ├── main.py                FastAPI entrypoint + lifespan + CORS
│   │   ├── config.py              pydantic-settings (model, API keys, data dir)
│   │   ├── api/
│   │   │   ├── deps.py            DI singletons (registry, runner, sessions)
│   │   │   └── routes/            health · datasets · chat
│   │   ├── agent/                 The original PydanticAI agent, light refactor
│   │   │   ├── agent.py · context.py · prompt.py · datasets.py
│   │   │   └── tools/             query_data · visualize (with payload_sink)
│   │   ├── services/              agent_runner · sessions · thinking_parser
│   │   └── schemas/events.py      9 SSE events (Pydantic)
│   ├── tests/                     38 unit/integration tests
│   ├── pyproject.toml + uv.lock
│   └── Dockerfile                 Multi-stage uv build, non-root, healthcheck
│
├── frontend/                      Vite + React + TS + shadcn
│   ├── src/
│   │   ├── App.tsx + main.tsx
│   │   ├── components/
│   │   │   ├── chat/              ChatView · ChatInput · MessageList · MessageItem · EmptyState
│   │   │   ├── stream/            ThinkingBlock · ToolCallCard · TableRenderer · PlotlyRenderer · TextStream · TypingDots
│   │   │   ├── datasets/          DatasetSidebar · DatasetItem · DatasetPreviewPopover
│   │   │   └── ui/                shadcn primitives (do not edit)
│   │   ├── hooks/                 useChatStream · useDatasets
│   │   ├── lib/sse.ts             eventsource-parser wrapper
│   │   ├── state/chat-reducer.ts  Discriminated-union reducer + toAction()
│   │   └── types/                 events · datasets (TS mirrors of backend schemas)
│   ├── e2e/                       3 Playwright specs
│   ├── package.json + vite.config.ts
│   ├── Dockerfile                 Multi-stage node→nginx
│   └── nginx.conf                 Proxy /api/* with `proxy_buffering off` (SSE)
│
├── data/                          CSVs (mounted read-only into the API container)
├── docker-compose.yml             api + web services, healthcheck-gated
├── .env.example
└── .github/workflows/ci.yml       ruff · pytest · eslint · tsc
```
