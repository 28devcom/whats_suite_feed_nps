# WhatsSuite Feed NPS

---

## English

### 1. System Overview
WhatsSuite is an enterprise messaging and customer service platform focused on WhatsApp. It enables support and sales teams to manage conversations, assign them to agents, execute campaigns, and administer queues and users with traceability and access controls. It is designed for organizations that require reproducible deployments, auditing, and compliance.

### 2. Key Features
- JWT authentication with revocable sessions in Redis and role-based access control (ADMIN, SUPERVISOR, AGENT).
- Conversation and assignment management (scheduled auto-assignment, queues, re-routing).
- Dashboard, broadcast/campaign, quick replies, users, queues, and settings modules.
- WhatsApp integration prepared via Baileys.
- Hardening middleware: forced HTTPS, rate limiting, input sanitization, backpressure, and helmet.
- Dockerized architecture with Nginx as TLS reverse proxy and healthchecks on all services.

### 3. General Architecture
- **Frontend**: React + Vite + Material UI, packaged and served by its own Nginx with `/health` endpoint.
- **Backend**: Node.js (Express ESM). REST API on `/api/v1`, Socket.IO on `/socket.io`, internal workers (auto-assignment, broadcast, dashboard aggregator). Audit and security middleware.
- **Database**: PostgreSQL 16; initial SQL migrations are loaded on container startup.
- **Cache/Sessions**: Redis 7 for JWT sessions and view/queue caching.
- **Reverse proxy**: Main Nginx terminates TLS (certificates in `certs/`), publishes ports 80/443, serves frontend, and routes traffic to backend.
- **Logical flow**: User → Nginx (TLS) → static frontend. REST and WebSocket requests are routed to backend. Backend consumes PostgreSQL and Redis; workers execute assignments and broadcast. The WhatsApp module will manage sessions when connection logic is enabled.

### 4. Tech Stack
- **Backend**: Node.js 18+ (ESM), Express, Socket.IO, Pino, PostgreSQL driver `pg`, Redis v4, Baileys (7.0.0-rc.9).
- **Frontend**: React 18, Vite, Material UI, Socket.IO client, Day.js.
- **Database**: PostgreSQL 16 with versioned SQL migrations.
- **Infrastructure**: Docker, Docker Compose, Nginx (reverse proxy and static server), volumes for data and media.

### 5. Project Structure
- `docker-compose.yml`: Orchestrates PostgreSQL, Redis, backend, frontend (build) and Nginx reverse proxy with `postgres-data`, `redis-data`, `media-data` volumes.
- `nginx.conf`: TLS reverse proxy configuration (443), 80→443 redirection, `/api/v1` and `/socket.io` routes, security headers and JSON logs.
- `certs/`: Local certificate and key (`localhost.crt`, `localhost.key`).
- `storage/`: Media and sound storage; `storage/media` is mounted in backend.
- `backend/`:
  - `Dockerfile`: Node 20-alpine image, installs production dependencies and HTTP healthcheck.
  - `migrations/`: SQL for roles/users, audit, conversations, messages, campaigns, multitenancy, retention, quick replies, chat control and WhatsApp.
  - `scripts/seedAdmin.js`: Seed to create initial ADMIN user.
  - `src/`: Express app (`app.js`), startup (`server.js`), configuration (`config/env.js`), middlewares, services, infrastructure (`infra`), business modules and `whatsapp/` (bootstrap without active connection).
- `frontend/`:
  - `Dockerfile`: Vite build with `VITE_API_BASE_URL`; serves static files with Nginx.
  - `nginx.conf`: Static file server with gzip and `/health`.
  - `src/`: React application with protected routes, API client, event sockets, feature flags and pages (Login, Chat, Dashboard, Broadcast, WhatsApp, Queues, Users, Settings, Quick Replies).
- `.dockerignore`: Excludes `node_modules`, `.env`, `.git` in builds.
- `.env.example`: Template for backend, frontend and service variables.

### 6. General Requirements
- **Recommended OS**: Linux x86_64 or macOS with Docker Desktop; Linux servers (e.g., Ubuntu 22.04+) for production.
- **Docker**: ≥ 24.
- **Docker Compose**: v2.
- **Node.js**: ≥ 18.18 (only needed outside containers).
- **Ports used**:
  - 80/443 (Nginx; 80 redirects to 443).
  - 3000 (backend).
  - 5173 (Vite in development).
  - 5432 (PostgreSQL).
  - 6379 (Redis).
  - WebSocket via `/socket.io` on 443 to backend.

### 7. Quick Start
- Detailed installation and operation: see `INSTALL.md`.
- Security controls, credential management, and ISO 27001 practices: see `SECURITY.md`.

---

## Português

### 1. Visão Geral do Sistema
WhatsSuite é uma plataforma empresarial de mensagens e atendimento ao cliente focada em WhatsApp. Permite que equipes de suporte e vendas operem conversas, atribuam a agentes, executem campanhas e administrem filas e usuários com rastreabilidade e controles de acesso. É voltada para organizações que requerem implantações reproduzíveis, auditoria e conformidade.

### 2. Características Principais
- Autenticação JWT com sessões revogáveis no Redis e controle de acesso baseado em funções (ADMIN, SUPERVISOR, AGENTE).
- Gerenciamento de conversas e atribuições (auto-atribuição agendada, filas, redirecionamento).
- Módulos de dashboard, broadcast/campanhas, respostas rápidas, usuários, filas, configurações, feedback pós-atendimento, análise de pós-venda, agendamentos, follow-up inteligente e retenção.
- Integração preparada para WhatsApp via Baileys.
- Middleware de hardening: HTTPS forçado, rate limiting, sanitização de entrada, backpressure e helmet.
- Arquitetura dockerizada com Nginx como proxy reverso TLS e healthchecks em todos os serviços.

### 3. Arquitetura Geral
- **Frontend**: React + Vite + Material UI, empacotado e servido por seu próprio Nginx com endpoint `/health`.
- **Backend**: Node.js (Express ESM). API REST em `/api/v1`, Socket.IO em `/socket.io`, workers internos (auto-atribuição, broadcast, agregador de dashboard). Auditoria e middlewares de segurança.
- **Banco de dados**: PostgreSQL 16; migrações SQL iniciais são carregadas ao iniciar o contêiner.
- **Cache/Sessões**: Redis 7 para sessões JWT e cache de visualizações/filas.
- **Proxy reverso**: Nginx principal termina TLS (certificados em `certs/`), publica portas 80/443, serve frontend e roteia tráfego para o backend.
- **Fluxo lógico**: Usuário → Nginx (TLS) → frontend estático. As requisições REST e WebSocket são roteadas para o backend. Backend consome PostgreSQL e Redis; workers executam atribuições e broadcast. O módulo WhatsApp gerenciará sessões quando a lógica de conexão for habilitada.

### 4. Stack Tecnológico
- **Backend**: Node.js 18+ (ESM), Express, Socket.IO, Pino, driver PostgreSQL `pg`, Redis v4, Baileys (7.0.0-rc.9).
- **Frontend**: React 18, Vite, Material UI, cliente Socket.IO, Day.js.
- **Banco de dados**: PostgreSQL 16 com migrações SQL versionadas.
- **Infraestrutura**: Docker, Docker Compose, Nginx (proxy reverso e servidor de estáticos), volumes para dados e mídia.

### 5. Estrutura do Projeto
- `docker-compose.yml`: Orquestra PostgreSQL, Redis, backend, frontend (build) e Nginx proxy reverso com volumes `postgres-data`, `redis-data`, `media-data`.
- `nginx.conf`: Configuração do proxy reverso TLS (443), redirecionamento 80→443, rotas `/api/v1`, `/socket.io`, headers de segurança e logs JSON.
- `certs/`: Certificado e chave locais (`localhost.crt`, `localhost.key`).
- `storage/`: Armazenamento de mídia e sons; `storage/media` é montado no backend.
- `backend/`:
  - `Dockerfile`: Imagem Node 20-alpine, instala dependências de produção e healthcheck HTTP.
  - `migrations/`: SQL para papéis/usuários, auditoria, conversas, mensagens, campanhas, multitenancy, retenção, quick replies, controle de chats, WhatsApp, feedback, agendamentos e follow-up.
  - `scripts/seedAdmin.js`: Seed para criar usuário ADMIN inicial.
  - `src/`: App Express (`app.js`), inicialização (`server.js`), configuração (`config/env.js`), middlewares, serviços, infraestrutura (`infra`), módulos de negócio e `whatsapp/` (bootstrap sem conexão ativa).
- `frontend/`:
  - `Dockerfile`: Build Vite com `VITE_API_BASE_URL`; serve estáticos com Nginx.
  - `nginx.conf`: Servidor de arquivos estáticos com gzip e `/health`.
  - `src/`: Aplicação React com rotas protegidas, cliente API, sockets de eventos, feature flags e páginas (Login, Chat, Dashboard, Broadcast, WhatsApp, Filas, Usuários, Configurações, Quick Replies, Feedback, Análise Pós-Venda, Agendamentos, Follow-up, Retenção).
- `.dockerignore`: Exclui `node_modules`, `.env`, `.git` nos builds.
- `.env.example`: Template de variáveis para backend, frontend e serviços.

### 6. Requisitos Gerais
- **SO recomendado**: Linux x86_64 ou macOS com Docker Desktop; servidores Linux (ex: Ubuntu 22.04+) para produção.
- **Docker**: ≥ 24.
- **Docker Compose**: v2.
- **Node.js**: ≥ 18.18 (necessário apenas fora de contêineres).
- **Portas utilizadas**:
  - 80/443 (Nginx; 80 redireciona para 443).
  - 3000 (backend).
  - 5173 (Vite em desenvolvimento).
  - 5432 (PostgreSQL).
  - 6379 (Redis).
  - WebSocket via `/socket.io` na porta 443 para backend.

### 7. Início Rápido
- Instalação e operação detalhadas: ver `INSTALL.md`.
- Controles de segurança, gerenciamento de credenciais e práticas ISO 27001: ver `SECURITY.md`.