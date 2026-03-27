# Vercel Deployment

## Vercel Env Vars

在 Vercel Project Settings > Environment Variables 中设置。当前项目至少维护两套环境：

- `Production`
- `Preview`

其中密钥类变量可以从本地 `.env.local` 复用，URL 类变量必须按线上域名单独填写，不能直接照搬 `localhost`。

### Shared Secret / Key Vars

以下变量应同时存在于 `Production` 和 `Preview`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://babjgbeaxttsckgwvqax.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
ENCRYPTION_KEY=<a-long-random-secret>
OPENAI_COMPAT_BASE_URL=https://api.tu-zi.com/v1
OPENAI_COMPAT_API_KEY=<your-proxy-key>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
```

### URL Vars

以下变量不要直接从本地 `.env.local` 同步，因为本地常常仍指向 `localhost`：

```env
NEXT_PUBLIC_APP_URL=https://<your-runtime-domain>
GOOGLE_OAUTH_REDIRECT_URI=https://<your-runtime-domain>/api/google/auth/callback
```

建议按环境分别填写：

- `Production`
  - `NEXT_PUBLIC_APP_URL=https://ai-prompt-structurer.vercel.app`
  - `GOOGLE_OAUTH_REDIRECT_URI=https://ai-prompt-structurer.vercel.app/api/google/auth/callback`
- `Preview`
  - `NEXT_PUBLIC_APP_URL=https://ai-prompt-structurer-hshxxx-hshxxxs-projects.vercel.app`
  - `GOOGLE_OAUTH_REDIRECT_URI=https://ai-prompt-structurer-hshxxx-hshxxxs-projects.vercel.app/api/google/auth/callback`

优先使用稳定 Preview alias，而不是一次性部署 URL，例如 `https://ai-prompt-structurer-<hash>-hshxxxs-projects.vercel.app`。否则每次重新部署后，都要同步修改 OAuth 回调域名。

## Callback URLs

### Supabase Auth

Supabase Auth > URL Configuration 中至少补齐：

- `http://localhost:3000/api/auth/callback`
- `https://ai-prompt-structurer-hshxxx-hshxxxs-projects.vercel.app/api/auth/callback`
- `https://ai-prompt-structurer.vercel.app/api/auth/callback`
- `https://<your-project>.vercel.app/api/auth/callback`
- `https://<your-custom-domain>/api/auth/callback`

如果暂时没有自定义域名，先保留第一条。

### Google OAuth

Google Cloud Console 的 OAuth redirect URI 至少补齐：

- `https://ai-prompt-structurer-hshxxx-hshxxxs-projects.vercel.app/api/google/auth/callback`
- `https://ai-prompt-structurer.vercel.app/api/google/auth/callback`

## Deploy Checklist

1. 在 Vercel 导入当前仓库。
2. 为 `Production` 和 `Preview` 同时填入共享密钥类变量。
3. 为两个环境分别填写 `NEXT_PUBLIC_APP_URL` 与 `GOOGLE_OAUTH_REDIRECT_URI`。
4. 首次部署成功后，确认 Production 域名与稳定 Preview alias。
5. 把两个环境的 `/api/auth/callback` 加入 Supabase Redirect URLs。
6. 把两个环境的 `/api/google/auth/callback` 加入 Google OAuth redirect URIs。
7. 如果绑定了自定义域名，再补一条自定义域名回调。
8. 线上登录一次，确认 Magic Link 能正确跳回 `/extract`。
9. 如需验证受保护的 Preview，使用 `vercel curl` 或 protection bypass，不要把 Vercel Authentication 页面误判成应用错误。
10. 登录后在模型配置页新增正式的中转站模型配置。

## Current Live Data Baseline

当前 Supabase 中已保留：

- 1 个正式用户
- 1 条默认模板 `纪念币默认模板`
- 1 条默认模型配置 `兔子中转站 GPT-5.4`

已清理：

- `codex-e2e-*` 测试用户
- 旧的 `gpt-5-minimal` 模型配置
- 联调历史记录
