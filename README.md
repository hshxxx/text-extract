# AI Prompt Structurer

固定 Schema 的 Prompt 生成器 MVP，基于 Next.js App Router、Supabase Auth/Postgres 和 OpenAI 兼容接口。

## Local Setup

1. 复制 `.env.example` 为 `.env.local`，填入 Supabase 项目配置和本地加密密钥。
2. 在 Supabase SQL Editor 执行 [database/migrations/0001_init.sql](/Users/hsh/Desktop/codex/challenge-coin-2/database/migrations/0001_init.sql)。
3. 在 Supabase Auth 中补充 Redirect URL：
   - `http://localhost:3000/api/auth/callback`
   - 生产域名对应的 `/api/auth/callback`
4. 安装依赖并运行：

```bash
npm install
npm run dev
```

## OpenAI-Compatible Proxy

- 首版 Provider 内部仍命名为 `openai`，但实际支持任意 OpenAI 兼容中转站。
- 模型配置页的 `Base URL` 应填写到 API 版本层级，例如 `https://your-proxy.example.com/v1`。
- 如果你手里拿到的是完整接口地址，例如 `https://your-proxy.example.com/v1/chat/completions`，当前项目也会自动兼容并归一化。
- 请求路径固定为 `POST {base_url}/chat/completions`，因此不要把 `Base URL` 填成完整接口路径。

## Deployment

上线前请先看 [VERCEL_DEPLOY.md](/Users/hsh/Desktop/codex/challenge-coin-2/VERCEL_DEPLOY.md)。

当前项目线上必需环境变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY`

可选但建议保留的本地辅助变量：

- `OPENAI_COMPAT_BASE_URL`
- `OPENAI_COMPAT_API_KEY`
- `NEXT_PUBLIC_APP_URL`
