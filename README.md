# API Documentation to RAG Knowledge Base

This is an AI agent that browses API documentation for you. Give it a URL, and it will crawl the site, extract the useful bits, and store them in a knowledge base (pgvector) that you can query later.

Think of it as a "read this for me" button for API docs. It uses OpenAI's computer use model to navigate and standard embedding models to make the content searchable. Perfect for feeding context into LLMs or building smarter developer tools.

## How it works

1.  **Browser Agent**: A headless browser (Playwright) controlled by AI navigates the documentation.
2.  **Extraction**: It scrapes pages and converts them into structured data.
3.  **Embeddings**: Text is turned into vectors and stored in PostgreSQL.
4.  **Search**: You get an API to find relevant docs by meaning, not just keywords.

```
┌─────────────────┐
│  Browser Agent  │ (CUA + Playwright)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Extractions    │ (Structured curls and documentation extraction)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Embeddings     │ (Text-embedding-ada-002)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  PostgreSQL +   │ (Vector storage with pgvector)
│    pgvector     │
└─────────────────┘
```

## Prerequisites

- Node.js 18+
- PostgreSQL with the `pgvector` extension
- [Temporal CLI](https://docs.temporal.io/cli#installation) (`brew install temporal` on macOS)
- OpenAI API key

## Setup

**1. Install dependencies**

```bash
yarn install
npx playwright install chromium
```

**2. Configure environment**

```bash
cp .env.example .env
```

Fill in `.env`:

```env
OPENAI_API_KEY=sk-...
DATABASE_URL=postgres://user:password@localhost:5432/dbname
DISPLAY_WIDTH=1024
DISPLAY_HEIGHT=768
```

**3. Set up the database**

```bash
yarn db:setup    # enables pgvector extension
yarn db:migrate  # runs migrations
```

**4. Run**

Open three terminals:

```bash
# Terminal 1 — Temporal dev server
temporal server start-dev

# Terminal 2 — app server
yarn dev

# Terminal 3 — start the UI
yarn client:dev
```

Open `http://localhost:5173` for the UI, or `http://localhost:8233` for the Temporal workflow dashboard.

## API

| Method | Endpoint                                    | Description                                 |
| ------ | ------------------------------------------- | ------------------------------------------- |
| `GET`  | `/knowledge-base/stream?url=<url>`          | Crawl a doc site (SSE — real-time progress) |
| `POST` | `/knowledge-base`                           | Crawl a doc site (wait for result)          |
| `GET`  | `/documentation/search?query=<q>&url=<url>` | Semantic search across stored docs          |
| `POST` | `/documentation/chat`                       | Chat with docs using RAG                    |
| `GET`  | `/documentation/postman?url=<url>`          | Generate a Postman collection               |

**Chat body:**

```json
{ "url": "https://docs.example.com", "message": "How do I authenticate?", "responseId": null }
```

Pass the `responseId` from each response back as the next request's `responseId` to maintain conversation context.

## Example Use Case

Use the search endpoint as a tool for your own AI agents, or expose it as an MCP server so your IDE or chat agent can query the knowledge base directly.

**With Postman Agent Mode:**

**Step 1:** Fork the collection

[<img src="https://run.pstmn.io/button.svg" alt="Run In Postman" style="width: 128px; height: 32px;">](https://god.gw.postman.com/run-collection/21505573-fb56bc16-9711-47c8-8cfc-f13de56ba0d2?action=collection%2Ffork&source=rip_markdown&collection-url=entityId%3D21505573-fb56bc16-9711-47c8-8cfc-f13de56ba0d2%26entityType%3Dcollection%26workspaceId%3D1ee78290-27f9-489e-8c05-6ba1885fa187)

**Step 2:** Generate an MCP Server using [Postman's MCP Server Generator](https://www.postman.com/explore/mcp-generator).

**Step 3:** Connect Agent Mode to the generated MCP Server.

<img width="901" height="785" alt="Screenshot 2025-10-30 at 18 51 30" src="https://github.com/user-attachments/assets/28b342ff-7aca-4a6d-8c17-c04446ccef22" />

**Step 4:** Prompt Agent Mode and watch it query the knowledge base.

<img width="901" height="818" alt="Screenshot 2025-10-30 at 18 58 37" src="https://github.com/user-attachments/assets/e80a6953-461e-49e2-83b4-e6f74ffaaeda" />

[Watch a demo](https://www.linkedin.com/posts/gbahdeyboh_i-built-an-ai-agent-that-takes-the-url-of-activity-7390749532193587200-NuR4/)

## Contributing

PRs welcome. This project uses Yarn workspaces — run commands from the root or target a workspace with `yarn workspace server <command>`.

## License

MIT
