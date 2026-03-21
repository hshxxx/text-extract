# Vercel Deployment

## Vercel Env Vars

在 Vercel Project Settings > Environment Variables 中设置：

```env
NEXT_PUBLIC_SUPABASE_URL=https://babjgbeaxttsckgwvqax.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
ENCRYPTION_KEY=<a-long-random-secret>
```

可选本地辅助变量，不建议依赖到线上运行：

```env
OPENAI_COMPAT_BASE_URL=https://api.tu-zi.com/v1
OPENAI_COMPAT_API_KEY=<your-proxy-key>
NEXT_PUBLIC_APP_URL=https://<your-project>.vercel.app
```

## Recommended Production Domain Callback

Supabase Auth > URL Configuration 中至少补齐：

- `https://<your-project>.vercel.app/api/auth/callback`
- `https://<your-custom-domain>/api/auth/callback`

如果暂时没有自定义域名，先保留第一条。

## Deploy Checklist

1. 在 Vercel 导入当前仓库。
2. 填入上面的 4 个必需环境变量。
3. 首次部署成功后，拿到实际线上域名。
4. 把实际线上域名的 `/api/auth/callback` 加入 Supabase Redirect URLs。
5. 如果绑定了自定义域名，再补一条自定义域名回调。
6. 线上登录一次，确认 Magic Link 能正确跳回 `/extract`。
7. 登录后在模型配置页新增正式的中转站模型配置。

## Current Live Data Baseline

当前 Supabase 中已保留：

- 1 个正式用户
- 1 条默认模板 `纪念币默认模板`
- 1 条默认模型配置 `兔子中转站 GPT-5.4`

已清理：

- `codex-e2e-*` 测试用户
- 旧的 `gpt-5-minimal` 模型配置
- 联调历史记录
