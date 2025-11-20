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

## Deployment

We have a specific guide for deploying to Railway. It covers setting up the worker/server split and getting pgvector running.

## Contributing

If you want to add a feature or fix a bug, feel free to open a PR. We use `yarn` workspaces, so make sure you run commands in the root or specify the workspace.

## License

MIT
