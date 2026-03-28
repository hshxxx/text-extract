# AI Prompt Structurer

固定 Schema 的 Prompt 生成器 MVP，基于 Next.js App Router、Supabase Auth/Postgres 和 OpenAI 兼容接口。

当前系统包含两条并列工作流：

- `/extract`：文本提取，生成固定 Schema 对应的最终 Prompt
- `/generate-image`：消费已生成 Prompt，调用图片模型生成图片并写入 Supabase Storage

## Local Setup

1. 首次把 `.env.example` 复制到 `~/.config/ai-prompt-structurer/.env.local`，填入 Supabase 项目配置和本地加密密钥。
2. 在当前 worktree 根目录运行一次：

```bash
npm run env:link
```

3. 在 Supabase SQL Editor 依次执行：
   - [database/migrations/0001_init.sql](/Users/hsh/Desktop/codex/challenge-coin-2/database/migrations/0001_init.sql)
   - [database/migrations/0002_image_generation.sql](/Users/hsh/Desktop/codex/challenge-coin-2/database/migrations/0002_image_generation.sql)
4. 在 Supabase Auth 中补充 Redirect URL：
   - `http://localhost:3000/api/auth/callback`
   - `http://localhost:3001/api/auth/callback`
   - `http://localhost:3002/api/auth/callback`
   - `http://localhost:3003/api/auth/callback`
   - 建议一次性补齐 `3000-3010` 对应的 `/api/auth/callback`
   - 生产域名对应的 `/api/auth/callback`
5. 安装依赖并运行：

```bash
npm install
npm run dev:local
```

说明：

- `.env.local` 是 worktree 私有文件系统对象，不会被 Git worktree 自动继承。
- 当前仓库约定每个 worktree 的 `.env.local` 都是指向 `~/.config/ai-prompt-structurer/.env.local` 的软链接。
- 日常开发优先使用 `npm run dev:local`；它会先执行环境链接和关键变量检查，再启动 Next.js。

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

Google OAuth 启用时还需要：

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`

可选但建议保留的辅助变量：

- `OPENAI_COMPAT_BASE_URL`
- `OPENAI_COMPAT_API_KEY`
- `NEXT_PUBLIC_APP_URL`

注意：

- `NEXT_PUBLIC_APP_URL` 与 `GOOGLE_OAUTH_REDIRECT_URI` 是 URL 型变量，线上不要直接照搬本地 `localhost` 值。
- Preview 应优先使用稳定 alias，例如 `https://ai-prompt-structurer-hshxxx-hshxxxs-projects.vercel.app`，不要依赖一次性部署域名。
- 如果 Preview 开启了 Vercel Authentication，命令行验收需要使用 `vercel curl` 或 protection bypass。
