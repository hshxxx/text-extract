# Codex Development Guide v2

You are a senior full-stack engineer.

Build a web app called:

AI Prompt Structurer

Stack:

Frontend:
Next.js App Router
React
TypeScript

Backend:
Next.js API Routes

Database:
Supabase PostgreSQL

Deployment:
Vercel

---

# Features

1 Model configuration
2 Template management
3 Text extraction
4 JSON repair
5 Schema validation
6 Template rendering
7 History storage

---

# Security

API keys must be encrypted.

Use AES-256-GCM.

Never expose API keys to frontend.

---

# JSON Handling

LLM output may not be valid JSON.

Use jsonrepair to fix it.

---

# Schema Validation

Use Zod.

Missing fields → fill empty string.

---

# LLM Timeout

30 seconds.

Retry up to 3 times.

Exponential backoff.

---

# Project Structure

/app
  /extract
  /history
  /settings/models
  /settings/templates

/app/api
  /models
  /templates
  /extract

/services/llm
  adapter.ts
  openai.ts
  anthropic.ts
  gemini.ts

/utils
  encryption.ts
  jsonRepair.ts
  schema.ts
  templateRenderer.ts

/database
  supabase.ts

---

# Development Order

1 Setup Next.js
2 Setup Supabase
3 Create database schema
4 Build model config API
5 Implement OpenAI adapter
6 Build extraction API
7 Build template CRUD
8 Build extract page
9 Build history page
10 Build template management page