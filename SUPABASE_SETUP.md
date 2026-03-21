# Supabase Setup

## 1. Create or Open Project

- 使用一个已有或新建的 Supabase 项目。
- 记录以下值：
  - `Project URL`
  - `anon public key`
  - `service_role key`

## 2. Apply SQL Migration

在 Supabase 的 SQL Editor 执行 [database/migrations/0001_init.sql](/Users/hsh/Desktop/codex/challenge-coin-2/database/migrations/0001_init.sql)。

该迁移会创建：

- `model_configs`
- `templates`
- `extraction_jobs`
- `updated_at` trigger
- RLS policies

## 3. Configure Auth

Auth > URL Configuration 中至少加入以下 Redirect URL：

- `http://localhost:3000/api/auth/callback`
- `https://<your-project>.vercel.app/api/auth/callback`
- `https://<your-custom-domain>/api/auth/callback`

首版登录方式为 Email Magic Link，确保 Email provider 已启用。

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
```

## 5. Notes

- 当前应用主要依赖 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 完成登录和业务访问。
- `SUPABASE_SERVICE_ROLE_KEY` 已预留给后续后台任务或管理动作，现阶段不会下发到浏览器。
- 本地环境已可填写 Supabase 凭据，但数据库迁移仍需要在 Supabase SQL Editor 或用具备数据库权限的连接方式执行。
- 如果你使用 Vercel 默认域名和自定义域名，请把两个正式回调地址都加进 Supabase Auth 的 Redirect URLs。
