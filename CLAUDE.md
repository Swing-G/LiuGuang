# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

### Backend (Maven multi-module, Java 17, Spring Boot 3.5.7)

```bash
# Compile all modules
mvn clean compile

# Run all tests
mvn test

# Run a single test class
mvn test -pl bootstrap -Dtest=ClassName

# Build the main application JAR (bootstrap module)
mvn clean package -pl bootstrap

# Dependency tree for a module
mvn dependency:tree -pl framework
```

### Frontend (React 18 + TypeScript + Vite)

```bash
cd frontend
npm install
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run lint       # ESLint (zero warnings expected)
npm run format     # Prettier
```

### Code Formatting (Backend)

Spotless runs automatically during `compile` phase. It applies the license header from `resources/format/copyright.txt` to all Java files.

## Module Architecture

The project is a **multi-module Maven project** with four JVM modules and one frontend:

| Module | Purpose |
|--------|---------|
| `framework` | Infrastructure foundation: distributed ID (Snowflake), idempotency (AOP), Sa-Token auth, Redis/Redisson cache, RocketMQ, TTL context propagation, unified error codes, SSE helpers. No business logic. |
| `infra-ai` | AI provider abstraction: chat (streaming), embedding, rerank, token counting. Multi-provider routing with health-aware model selection and circuit breaker. Current providers: Ollama, SiliconFlow, BaiLian. |
| `bootstrap` | Main Spring Boot application. All business logic lives here: `rag/` (RAG orchestration), `ingestion/` (document pipeline), `knowledge/` (KB management), `agent/` (multi-agent framework), `user/` (auth), `admin/` (dashboard). Depends on both `framework` and `infra-ai`. |
| `mcp-server` | Standalone MCP server on port 9099. Registers 3 mock tool executors (sales, ticket, weather) for demo purposes. |
| `frontend` | React 18 + Vite + Tailwind CSS + shadcn/ui. Chat interface and admin dashboard. Uses Zustand for state, React Router 6, Axios for API calls. |

## Key Architecture Patterns

### RAG Core Chain (`bootstrap/.../rag/core/`)

A user query flows through: **Intent Detection** → **Query Rewrite** (expand + split + context completion) → **Multi-Channel Retrieval** (parallel channels via thread pool) → **Post-Processor Pipeline** (chain of responsibility: dedup, rerank, filter) → **Prompt Assembly** → **LLM Streaming** → **Response**.

### Retrieval Channels and Post-Processors

- **Channels** implement `SearchChannel` interface. Each runs independently in parallel via a dedicated thread pool. Results are merged after all channels complete.
- **Post-processors** implement `SearchResultPostProcessor` interface and are chained sequentially.
- Both are auto-discovered as Spring Beans — no manual registration needed.

### Model Routing (`infra-ai/.../model/`)

Three-state circuit breaker per model (CLOSED → OPEN → HALF_OPEN). `ModelRoutingExecutor` selects the first healthy model from a priority-ordered candidate list. `ProbeStreamBridge` buffers events during failover so users never see partial data from a failed model.

### Ingestion Pipeline (`bootstrap/.../ingestion/`)

DAG-based document processing: **Fetch** (local/S3/HTTP/Feishu) → **Parse** (Tika/Markdown) → **Chunk** (fixed-size or structure-aware) → **Enrich** → **Enhance** → **Index**. Each node extends `IngestionNode` (template method). Pipeline and node configs are stored in the database; each run produces per-node execution logs.

### Agent Framework (`bootstrap/.../agent/`)

Multi-agent orchestration with: `action/` (execution with conditions), `evaluator/` (quality assessment), `harness/` (execution engine), `memory/` (conversation memory with sliding window + summarization), `reflection/` (self-correction), `workflow/` (workflow-based agent strategies like ReAct and Plan-and-Execute).

### 8 Thread Pools + TTL

Dedicated thread pools for different workloads (MCP calls, RAG context assembly, retrieval, intent classification, memory summarization, model streaming, conversation entry). All wrapped with `TtlExecutors` to propagate user/trace context across async boundaries.

### Extension Points

New components are added by implementing the corresponding interface as a Spring Bean — no config file changes needed:
- `SearchChannel` — new retrieval channel
- `SearchResultPostProcessor` — new result post-processor
- `MCPToolExecutor` — new MCP tool (auto-registered by `DefaultMCPToolRegistry`)
- `IngestionNode` — new pipeline node type
- `ChatClient` — new model provider (add to candidate list in config)

## Key Technologies

- **Database**: PostgreSQL with pgvector extension (vector search)
- **Vector DB**: Milvus SDK 2.6.6 (external Milvus instance)
- **ORM**: MyBatis-Plus (MyBatis mapper packages: `rag.dao.mapper`, `ingestion.dao.mapper`, `knowledge.dao.mapper`, `user.dao.mapper`, `agent.workflow.dao.mapper`)
- **Auth**: Sa-Token with Redis-backed session storage
- **Distributed**: Redisson (locks, semaphores), RocketMQ (events), Redis (queue-based rate limiting with ZSET + Pub/Sub + Lua scripts)
- **Document Parsing**: Apache Tika (PDF, Word, PPT, etc.) + custom Markdown parser
- **MCP**: `io.modelcontextprotocol.sdk` for MCP tool integration
- **Frontend**: shadcn/ui component library, Tailwind CSS, Zustand stores, react-markdown + react-syntax-highlighter for streaming display

## Configuration Files

All `*.yml` and `*.yaml` files are gitignored (they contain credentials). Reference templates may exist in documentation. The frontend uses `.env` for environment variables (also gitignored via `.env.local`).
