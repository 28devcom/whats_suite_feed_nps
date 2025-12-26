# WhatsSuite

## 1. Descripción general del sistema
WhatsSuite es una plataforma empresarial de mensajería y atención al cliente centrada en WhatsApp. Permite a equipos de soporte y ventas operar conversaciones, asignarlas a agentes, ejecutar campañas y administrar colas y usuarios con trazabilidad y controles de acceso. Está orientado a organizaciones que requieren despliegues reproducibles, auditoría y cumplimiento.

## 2. Características principales
- Autenticación JWT con sesiones revocables en Redis y control de roles (ADMIN, SUPERVISOR, AGENTE).
- Gestión de conversaciones y asignaciones (auto-asignación programada, colas, re-enrutamiento).
- Módulos de dashboard, broadcast/campañas, respuestas rápidas, usuarios, colas y ajustes.
- Integración preparada para WhatsApp vía Baileys.
- Middleware de hardening: HTTPS forzado, rate limiting, saneamiento de entrada, backpressure y helmet.
- Arquitectura dockerizada con Nginx como reverse proxy TLS y healthchecks en todos los servicios.

## 3. Arquitectura general
- **Frontend**: React + Vite + Material UI, empaquetado y servido por Nginx propio con endpoint `/health`.
- **Backend**: Node.js (Express ESM). API REST en `/api/v1`, Socket.IO en `/socket.io`, workers internos (auto-asignación, broadcast, agregador de dashboard). Auditoría y middlewares de seguridad.
- **Base de datos**: PostgreSQL 16; migraciones SQL iniciales se cargan al arrancar el contenedor.
- **Cache/Sesiones**: Redis 7 para sesiones JWT y cache de vistas/colas.
- **Reverse proxy**: Nginx principal termina TLS (certificados en `certs/`), publica 80/443, sirve frontend y enruta tráfico a backend.
- **Flujo lógico (texto)**: Usuario → Nginx (TLS) → frontend estático. Las peticiones REST y WebSocket se enrutan a backend. Backend consume PostgreSQL y Redis; workers ejecutan asignaciones y broadcast. El módulo WhatsApp gestionará sesiones cuando se habilite la lógica de conexión.

## 4. Stack tecnológico
- **Backend**: Node.js 18+ (ESM), Express, Socket.IO, Pino, PostgreSQL driver `pg`, Redis v4, Baileys (7.0.0-rc.9).
- **Frontend**: React 18, Vite, Material UI, Socket.IO client, Day.js.
- **Base de datos**: PostgreSQL 16 con migraciones SQL versionadas.
- **Infraestructura**: Docker, Docker Compose, Nginx (reverse proxy y servidor de estáticos), volúmenes para datos y medios.

## 5. Estructura del proyecto
- `docker-compose.yml`: Orquesta PostgreSQL, Redis, backend, frontend (build) y Nginx reverse proxy con volúmenes `postgres-data`, `redis-data`, `media-data`.
- `nginx.conf`: Configuración del reverse proxy TLS (443), redirección 80→443, rutas `/api/v1`, `/socket.io`, headers de seguridad y logs JSON.
- `certs/`: Certificado y llave locales (`localhost.crt`, `localhost.key`).
- `storage/`: Almacenamiento de medios y sonidos; `storage/media` se monta en backend.
- `backend/`:
  - `Dockerfile`: Imagen Node 20-alpine, instala dependencias de producción y healthcheck HTTP.
  - `migrations/`: SQL para roles/usuarios, auditoría, conversaciones, mensajes, campañas, multitenancy, retención, quick replies, control de chats y WhatsApp.
  - `scripts/seedAdmin.js`: Semilla para crear usuario ADMIN inicial.
  - `src/`: App Express (`app.js`), arranque (`server.js`), configuración (`config/env.js`), middlewares, servicios, infraestructura (`infra`), módulos de negocio y `whatsapp/` (bootstrap sin conexión activa).
- `frontend/`:
  - `Dockerfile`: Build Vite con `VITE_API_BASE_URL`; entrega estáticos con Nginx.
  - `nginx.conf`: Servidor de archivos estáticos con gzip y `/health`.
  - `src/`: Aplicación React con rutas protegidas, API client, sockets de eventos, feature flags y páginas (Login, Chat, Dashboard, Broadcast, WhatsApp, Colas, Usuarios, Ajustes, Quick Replies).
- `.dockerignore`: Excluye `node_modules`, `.env`, `.git` en builds.
- `.env.example`: Plantilla de variables para backend, frontend y servicios.

## 6. Requisitos generales
- **SO recomendado**: Linux x86_64 o macOS con Docker Desktop; servidores Linux (ej. Ubuntu 22.04+) para producción.
- **Docker**: ≥ 24.
- **Docker Compose**: v2.
- **Node.js**: ≥ 18.18 (solo necesario fuera de contenedores).
- **Puertos utilizados**:
  - 80/443 (Nginx; 80 redirige a 443).
  - 3000 (backend).
  - 5173 (Vite en desarrollo).
  - 5432 (PostgreSQL).
  - 6379 (Redis).
  - WebSocket vía `/socket.io` sobre 443 hacia backend.

## 7. Guía rápida
- Instalación y operación detallada: ver `INSTALL.md`.
- Controles de seguridad, gestión de credenciales y prácticas ISO 27001: ver `SECURITY.md`.
