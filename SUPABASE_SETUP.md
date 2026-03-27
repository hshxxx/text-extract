# Supabase Setup

## 1. Create or Open Project

- 使用一个已有或新建的 Supabase 项目。
- 记录以下值：
  - `Project URL`
  - `anon public key`
  - `service_role key`

## 2. Apply SQL Migration

在 Supabase 的 SQL Editor 依次执行：

- [database/migrations/0001_init.sql](/Users/hsh/Desktop/codex/challenge-coin-2/database/migrations/0001_init.sql)
- [database/migrations/0002_image_generation.sql](/Users/hsh/Desktop/codex/challenge-coin-2/database/migrations/0002_image_generation.sql)

该迁移会创建：

- `model_configs`
- `templates`
- `extraction_jobs`
- `image_model_configs`
- `image_generation_tasks`
- `image_generation_results`
- `generated-images` Storage bucket
- `updated_at` trigger
- RLS policies

## 3. Configure Auth

Auth > URL Configuration 中至少加入以下 Redirect URL：

- `http://localhost:3000/api/auth/callback`
- `https://ai-prompt-structurer-hshxxx-hshxxxs-projects.vercel.app/api/auth/callback`
- `https://ai-prompt-structurer.vercel.app/api/auth/callback`
- `https://<your-project>.vercel.app/api/auth/callback`
- `https://<your-custom-domain>/api/auth/callback`

首版登录方式为 Email Magic Link，确保 Email provider 已启用。

如果你启用了 Google OAuth，还需要在 Google Cloud Console 的 OAuth redirect URI 中补齐：

- `https://ai-prompt-structurer-hshxxx-hshxxxs-projects.vercel.app/api/google/auth/callback`
- `https://ai-prompt-structurer.vercel.app/api/google/auth/callback`

## 4. Fill Local Env

把以下值写入 [.env.local](/Users/hsh/Desktop/codex/challenge-coin-2/.env.local)：

```env
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 anon public key
SUPABASE_SERVICE_ROLE_KEY=你的 service_role key
ENCRYPTION_KEY=一个足够长的随机字符串
OPENAI_COMPAT_BASE_URL=可选，本地调试用
OPENAI_COMPAT_API_KEY=可选，本地调试用
NEXT_PUBLIC_APP_URL=可选，建议填你的正式站点 URL
GOOGLE_CLIENT_ID=可选，启用 Google OAuth 时必填
GOOGLE_CLIENT_SECRET=可选，启用 Google OAuth 时必填
GOOGLE_OAUTH_REDIRECT_URI=可选，本地可留空，线上按部署域名单独填写
```

## 5. Notes

- 当前应用主要依赖 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 完成登录和业务访问。
- `SUPABASE_SERVICE_ROLE_KEY` 已预留给后续后台任务或管理动作，现阶段不会下发到浏览器。
- 本地环境已可填写 Supabase 凭据，但数据库迁移仍需要在 Supabase SQL Editor 或用具备数据库权限的连接方式执行。
- 如果你使用 Vercel 默认域名、自定义域名和稳定 Preview alias，请把这些正式回调地址都加进 Supabase Auth 的 Redirect URLs。
- Preview 环境里的 `NEXT_PUBLIC_APP_URL` 与 `GOOGLE_OAUTH_REDIRECT_URI` 不应继续指向 `localhost`。
- 如果 Preview 开启了 Vercel Authentication，机器验证时需要用 `vercel curl` 或 protection bypass 才能访问真实页面。
