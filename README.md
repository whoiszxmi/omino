# Omino

Aplicação Next.js (App Router) com Supabase Auth.

## Ambiente

Defina as variáveis abaixo (Vercel e `.env` local):

```bash
NEXT_PUBLIC_SITE_URL=https://SEU_DOMINIO.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

- `NEXT_PUBLIC_SITE_URL` é usada para montar redirects de autenticação sem depender de `localhost`.

## Rotas públicas e protegidas

- Pública: `/app/login` (renderiza sempre, sem guard bloqueando cliques)
- Protegidas: `/app/*` no grupo `(protected)` com verificação de sessão + allowlist.

Fluxo: `/app/login` -> autentica com email+senha -> `router.replace("/app/feed")`.

## Supabase: URL Configuration (obrigatório)

No Supabase Dashboard: **Authentication > URL Configuration**

- **Site URL**
  - `https://SEU_DOMINIO.vercel.app`

- **Redirect URLs** (allowlist)
  - `https://SEU_DOMINIO.vercel.app/app/login`
  - `https://SEU_DOMINIO.vercel.app/app/*`
  - `https://SEU_DOMINIO.vercel.app/auth/callback`

> Se `redirect_to` não estiver nessa allowlist, o Supabase pode retornar
> **"requested path is invalid"**.

## Vercel Deployment Protection

Se o link abrir a página de login da Vercel em vez do app:

- Verifique em **Vercel Project > Settings > Deployment Protection**
- Desative proteção para produção (ou ajuste regras de acesso), conforme sua política.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
