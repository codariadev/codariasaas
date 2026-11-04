# CodariaDev SaaS
Next.js 14 · React · TypeScript · Tailwind · Firebase. **Domínio único** (codev.vercel.app), **login único** e **um Firebase por cliente**.

## Como funciona
1. O usuário entra em `/login` com e-mail e senha → autentica no **Firebase master** (da CodariaDev).
2. O navegador envia o ID token a `/api/session`. O servidor (Admin SDK) lê `members/{uid}` no master → descobre a **empresa**, o papel e o plano, e emite um **token de sessão** para o Firebase **do cliente**, com o papel nos *claims*.
3. O navegador faz `signInWithCustomToken` no Firebase do cliente e lê/grava os dados direto no Firestore dele; as **Rules** usam `request.auth.token.role` (e `pid` para profissionais).
4. A sessão do cliente é renovada a cada 45 min. Se o usuário for desativado ou a empresa suspensa, ela encerra (tokens já emitidos podem durar até ~1 h).

### Firebase master (somente servidor — `firebase/master.firestore.rules` nega tudo ao navegador)
`members/{uid}` {tenantId, name, email, role, active, professionalId?} · `tenants/{id}` {businessName, segment, plan, status} · `tenant_configs/{id}` {theme, firebase(config web)} · `tenant_secrets/{id}` {enc} (chave de serviço do cliente **cifrada** AES-256-GCM) · `audit_logs`.
Usuários da empresa são criados/alterados pelo owner/admin via `/api/team` (cria a conta no master, devolve link de definição de senha, revoga sessões ao mudar papel/desativar). Um e-mail pertence a uma empresa.

### Segurança — leia
A chave de serviço de cada cliente permite **emitir sessões com qualquer papel** naquele projeto. Por isso: conta de serviço dedicada com **apenas** "Firebase Authentication Admin" (sem acesso a Firestore/Storage), chave cifrada no master, `TENANT_SECRETS_KEY` só no ambiente da Vercel, rotação periódica e termo com o cliente (o PDF prevê acesso técnico mínimo). Quem controlar o master + essa chave controla todos os clientes: proteja com MFA e menor privilégio.

## Teste local (Emulator Suite)
Requisitos: Node 18.18+ e Java 11+.
```
npm install
npm run local     # emula master + 3 clientes, popula dados e roda em http://localhost:3000
```
Entre com `dono|gerente|recepcao|profissional` + `@clientea.test` (ou `clienteb`, `clientec`), senha `123456`. Cada e-mail abre a empresa certa. UI do emulador: http://localhost:4000. Testes de regras: `npm run test:rules`.
Sem `NEXT_PUBLIC_MASTER_FIREBASE`, roda em **modo demonstração** (dados em memória, perfil à escolha).

## Deploy (Vercel, domínio codev.vercel.app)
1. Crie o projeto Firebase **master** (Authentication e-mail/senha + Firestore). Publique `firebase/master.firestore.rules`.
2. Variáveis na Vercel (ver `.env.example`): `NEXT_PUBLIC_MASTER_FIREBASE`, `MASTER_FIREBASE_SERVICE_ACCOUNT`, `TENANT_SECRETS_KEY`. No master, autorize o domínio em Authentication → Domínios autorizados.
3. Por cliente: ele cria o projeto Firebase (Owner dele), habilita **Authentication** (basta inicializar) e Firestore; crie a conta de serviço restrita e baixe a chave; `node scripts/deploy-rules.mjs <projectId>`; depois `node scripts/onboard-tenant.mjs ...` (ver cabeçalho) — cadastra a empresa, cifra a chave e cria o dono.
4. `npm run validate` com o ambiente alvo antes de publicar.

## Pendências
Painel administrativo (UI) · agendamento online · WhatsApp · App Check · stock_movements · visão semanal · múltiplas empresas por e-mail · testes de regras e do fluxo com emuladores ainda não executados.

## Painel administrativo (/admin)
Acesso só para quem tem `admins/{uid}` {active:true} no Firebase master. Primeiro admin: `MASTER_FIREBASE_SERVICE_ACCOUNT="$(cat master-sa.json)" npm run admin:create -- voce@email.com "Seu Nome"`.
Funções: listar empresas; **cadastrar** (cola a config web, envia a chave; o painel **verifica** projeto x chave, permissão de emitir sessões e se as regras do Firestore estão protegidas **antes** de gravar); link de senha do dono; trocar chave; trocar plano; suspender/reativar (encerra as sessões); testar conexão; copiar regras para o cliente. Local: `admin@codaria.test` / `123456` (cadastre empresas fictícias com projectId `demo-...`; a chave é opcional nos emuladores).
