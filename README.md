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

## Quick Start

You'll need Node.js, a PostgreSQL instance with `pgvector` extension, Redis, and an OpenAI API key.

### 1. Setup

```bash
# Install dependencies
yarn install

# Setup environment
cp .env.example .env
# ... fill in your OPENAI_API_KEY, DATABASE_URL, and REDIS connection details
```

### 2. Database & Workers

```bash
# Enable vector extension & run migrations
yarn db:setup
yarn db:migrate

# Start the server and the background workers (keep this terminal open!)
yarn start:all
```

### 3. Run it

```bash
# Start the backend and frontend
yarn dev
```

Open `http://localhost:5173` to see the UI.

## Usage

**Generate Knowledge Base**
POST to `/knowledge-base` with `{ "url": "https://docs.example.com" }` to start crawling.

**Search**
GET `/api/search?query=auth&url=...` to find what you need.

**RAG / Agent Context**
Use the search endpoint as a tool for your own AI agents. For example, you can expose it as an MCP (Model Context Protocol) server to give your IDE or chat agent direct access to this knowledge.

### Example Use Case

This can be used as a RAG database to provide an in-memory context to an LLM, or the APIs can be exposed as a tool in an MCP Server.

This example shows how you can use [Postman's Agent Mode](https://www.postman.com/product/agent-mode/) to generate an MCP server from these APIs and use that MCP server to provide additional context to Agent Mode.

**Step 1:** Fork the collection <br />

[<img src="https://run.pstmn.io/button.svg" alt="Run In Postman" style="width: 128px; height: 32px;">](https://god.gw.postman.com/run-collection/21505573-fb56bc16-9711-47c8-8cfc-f13de56ba0d2?action=collection%2Ffork&source=rip_markdown&collection-url=entityId%3D21505573-fb56bc16-9711-47c8-8cfc-f13de56ba0d2%26entityType%3Dcollection%26workspaceId%3D1ee78290-27f9-489e-8c05-6ba1885fa187)

**Step 2:** Generate an MCP Server using [Postman's MCP Server Generator](https://www.postman.com/explore/mcp-generator).

**Step 3:** Connect Agent Mode to the generated MCP Server

<img width="901" height="785" alt="Screenshot 2025-10-30 at 18 51 30" src="https://github.com/user-attachments/assets/28b342ff-7aca-4a6d-8c17-c04446ccef22" />

**Step 4:** Prompt Agent mode and watch it use its tools to query its knowledge base
<img width="901" height="818" alt="Screenshot 2025-10-30 at 18 58 37" src="https://github.com/user-attachments/assets/e80a6953-461e-49e2-83b4-e6f74ffaaeda" />

[Watch a Demo Here](https://www.linkedin.com/posts/gbahdeyboh_i-built-an-ai-agent-that-takes-the-url-of-activity-7390749532193587200-NuR4/)

## Contributing

If you want to add a feature or fix a bug, feel free to open a PR. We use `yarn` workspaces, so make sure you run commands in the root or specify the workspace.

## License

MIT
