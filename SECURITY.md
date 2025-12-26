# Seguridad y Cumplimiento en WhatsSuite

Este documento resume el enfoque de seguridad, controles y buenas prácticas de WhatsSuite, alineado con principios de defensa en profundidad y referentes ISO/IEC 27001.

## 1. Enfoque de seguridad del sistema
- Defensa en profundidad: hardening de HTTP (helmet, CORS, HTTPS forzado), rate limiting, backpressure y saneamiento de entrada en el backend.
- Separación de responsabilidades: frontend estático, backend sin estado, Redis para sesiones, PostgreSQL para datos transaccionales, Nginx como reverse proxy TLS.
- Observabilidad: healthchecks (`/api/v1/health/live` y `/ready`) y logs estructurados para trazabilidad.

## 2. Gestión de credenciales
- Variables sensibles en `.env`: secretos JWT, credenciales de DB/Redis, claves de cifrado de medios, certificados TLS.
- Almacenamiento recomendado: gestor de secretos (vault), no copiar en repositorios ni sistemas de tickets.
- Rotación: establecer rotación periódica de `JWT_SECRET`, contraseñas de DB/Redis y `MEDIA_ENCRYPTION_KEY`. Cambiar credenciales de seed tras el primer uso.
- Separación por entorno: valores distintos para desarrollo, QA y producción; evitar reutilizar secretos.

## 3. Autenticación y sesiones
- Autenticación con JWT firmado (`JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`) y expiración configurable (`JWT_EXPIRES_IN`).
- Revocación de sesión: `jti` almacenado en Redis; logout/force logout elimina el token activo.
- Bcrypt en contraseñas de usuarios (`BCRYPT_SALT_ROUNDS`).
- Recomendaciones: exigir HTTPS, reducir tiempo de expiración en producción, limitar reuso de tokens y monitorear intentos fallidos (tabla `auth_events`).

## 4. Control de accesos
- Roles soportados: ADMIN, SUPERVISOR, AGENTE. Middleware `authorize` protege rutas sensibles (usuarios, colas, dashboard, broadcast).
- Principio de mínimo privilegio: asignar el rol más bajo necesario; revisar permisos de forma periódica.
- Auditoría: acciones API registradas en `audit_logs`; eventos de autenticación en `auth_events`.

## 5. Seguridad en infraestructura
- Contenedores: imágenes basadas en Alpine; healthchecks activos en backend y frontend.
- Puertos expuestos: 443/80 (Nginx), 3000 (backend), 5432 (PostgreSQL), 6379 (Redis). Restringir exposición pública solo a 443/80 mediante firewall o WAF.
- Red: preferir redes internas de Docker para backend/DB/Redis; no publicar DB/Redis a internet.
- Volúmenes: `postgres-data`, `redis-data`, `media-data` deben residir en almacenamiento seguro y respaldado.
- TLS: certificados en `certs/`; reemplazar los de prueba en producción.

## 6. Logs y auditoría
- Backend: Pino a stdout con `service`, `instance` y `requestId`; sanitiza headers sensibles.
- Nginx (reverse proxy): logs JSON en `/var/log/nginx` dentro del contenedor.
- Frontend (estáticos): logs de acceso/error de Nginx y endpoint `/health`.
- DB/Redis: logs estándar de contenedor.
- Uso: centralizar en SIEM y habilitar alertas por errores de autenticación, fallos de healthcheck y anomalías de tráfico.

## 7. Recomendaciones ISO/IEC 27001
- **Gestión de accesos**: cuentas nominativas, revisiones periódicas de roles y revocación inmediata ante bajas.
- **Separación de ambientes**: aislar dev/QA/prod con secretos distintos y redes independientes.
- **Gestión de incidentes**: definir canal de reporte (ver sección 9), playbooks para caídas de DB/Redis y revocación masiva de tokens.
- **Backups**: programar y probar restauraciones de `postgres-data` y `media-data`; cifrar respaldos en tránsito y reposo.
- **Actualizaciones**: mantener imágenes base y dependencias al día; reconstruir imágenes tras actualizaciones de seguridad.
- **Retención**: aplicar políticas de retención/archivo definidas en migraciones (p.ej. cold archive) según regulación.

## 8. Buenas prácticas operativas
- Rotar credenciales y claves de cifrado con periodicidad establecida.
- Limitar `ALLOWED_ORIGINS` a dominios legítimos; evitar `*` en producción.
- Ajustar `RATE_LIMIT_*`, `HTTP_MAX_CONCURRENT`, `HTTP_BACKPRESSURE_QUEUE` de acuerdo con la capacidad del entorno.
- Proteger `MEDIA_STORAGE_DIR` y considerar activar `MEDIA_ENCRYPTION_ENABLED` cuando se almacenen datos sensibles.
- Usar certificados válidos y habilitar HSTS en el dominio público (ya configurado en Nginx).
- Monitorear Socket.IO: desconexiones suelen indicar tokens expirados o no enviados.
