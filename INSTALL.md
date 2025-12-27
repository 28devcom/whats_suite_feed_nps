# Instalación y Puesta en Marcha de WhatsSuite

## 1. Introducción
Este manual explica cómo instalar y poner en marcha WhatsSuite (plataforma PERN con backend Node.js, frontend React, PostgreSQL, Redis y Nginx) en un servidor Linux vacío usando Docker y Docker Compose. Incluye creación de usuario de despliegue, instalación del sistema base, configuración de variables y verificación final. Tiempo estimado: 45–60 minutos para alguien sin experiencia avanzada. Dirigido a usuarios técnicos y no técnicos que tengan acceso administrativo al servidor.

## 2. Requisitos iniciales
- **Servidor Linux**: equipo remoto al que se accede por terminal.
- **Sistema operativo recomendado**: Ubuntu 20.04 LTS o 22.04 LTS.
- **Acceso**: conexión SSH disponible y un usuario con permisos `sudo`.
- **Hardware mínimo**: 2 CPU, 4 GB de RAM libres y 10 GB de disco (aumentar según volumen de datos y medios).

## 3. Acceso inicial al servidor
Conéctese por SSH desde su estación de trabajo:
```bash
ssh usuario@IP_DEL_SERVIDOR
```
Si el acceso falla, verifique credenciales, IP y que el puerto SSH (22 por defecto) esté abierto. En entornos corporativos puede requerirse VPN.

## 4. Creación del usuario de despliegue (PASO A PASO)
No se recomienda usar `root` para operar aplicaciones; un usuario dedicado reduce riesgos.
```bash
sudo adduser whatssuite
sudo usermod -aG sudo whatssuite
```
- El primer comando crea el usuario y solicita contraseña.
- El segundo lo agrega al grupo `sudo` para ejecutar tareas administrativas.
Verifique los permisos e inicie sesión con ese usuario:
```bash
su - whatssuite
sudo whoami
```
El último comando debe responder `root`, indicando que el usuario puede usar `sudo`.

## 5. Actualización del sistema operativo
`apt` es el gestor de paquetes de Ubuntu. Actualizar garantiza parches recientes.
```bash
sudo apt update
sudo apt upgrade -y
```
Es normal ver mensajes de descarga e instalación. Si se pide confirmación, responda `Y`.

## 6. Instalación de dependencias básicas del sistema
Instale herramientas de soporte necesarias para agregar repositorios y clonar el código.
```bash
sudo apt install -y curl git ca-certificates gnupg lsb-release
```
- `curl`: descarga datos desde URLs.
- `git`: clona el repositorio del proyecto.
- `ca-certificates`: certificados raíz para conexiones seguras.
- `gnupg`: manejo de claves GPG (firma de repositorios).
- `lsb-release`: identifica la versión de distribución (útil para repositorios).

## 7. Instalación COMPLETA de Docker
Docker permite empaquetar y ejecutar el sistema en contenedores aislados, evitando instalaciones manuales de cada componente.

Pasos en Ubuntu (oficiales):
```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```
- Se agrega el repositorio oficial y su clave GPG.
- Se instalan Docker Engine, CLI, containerd y el plugin de Compose.
- Se habilita el servicio para que inicie con el sistema.
- Se suma el usuario actual al grupo `docker` para ejecutar sin `sudo` (cierre sesión y vuelva a entrar para aplicar).

Verifique la instalación:
```bash
docker --version
docker run --rm hello-world
```
Debe ver la versión y un mensaje “Hello from Docker!”; esto confirma que puede descargar y ejecutar contenedores.

## 8. Instalación de Docker Compose
Docker Compose orquesta múltiples contenedores con un solo archivo (`docker-compose.yml`). El plugin ya se instaló en el paso anterior.
```bash
docker compose version
```
- El comando debe mostrar la versión. Si no está disponible, reinstale el paquete `docker-compose-plugin`.
- `docker compose` (con espacio) es la sintaxis moderna; `docker-compose` (con guion) es la versión antigua.

## 9. Preparación del entorno de trabajo
Elija una ruta para alojar el código (ejemplo en el home del usuario de despliegue):
```bash
mkdir -p ~/apps
cd ~/apps
```
Use rutas simples y con permisos del usuario actual para evitar problemas al crear volúmenes o archivos.

## 10. Clonación del repositorio
`git` permite traer el código del proyecto:
```bash
git clone https://github.com/ismaelbojorquez/WhatsSuite.git WhatsSuite
cd WhatsSuite
```
Verifique que existan archivos clave:
```bash
ls
```
Debe ver `backend/`, `frontend/`, `docker-compose.yml`, `nginx.conf`, `certs/`, `storage/`.

## 11. Configuración de variables de entorno (.env)
Las variables de entorno configuran credenciales, puertos y límites. Son sensibles y no deben compartirse.

Copie la plantilla y edite:
```bash
cp .env.example .env
nano .env
```
Principales variables (use valores propios):
- **Servicio y HTTP**: `SERVICE_NAME`, `SERVICE_INSTANCE_ID`, `PORT` (3000), `REQUEST_TIMEOUT_MS`, `LOG_LEVEL`, `ALLOWED_ORIGINS` (dominios permitidos), `TZ`, `HTTP_MAX_CONCURRENT`, `HTTP_BACKPRESSURE_QUEUE`, `HTTP_REQUIRE_HTTPS`, `RATE_LIMIT_*`.
- **PostgreSQL**: `POSTGRES_HOST`, `POSTGRES_PORT` (5432), `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_POOL_*`, `POSTGRES_SSL`.
- **Redis**: `REDIS_URL` (ej. `redis://redis:6379`), `REDIS_TLS`, `REDIS_SESSION_PREFIX`.
- **Frontend/API**: `VITE_API_BASE_URL` (URL pública sin `/api`), `APP_BASE_URL`.
- **Autenticación y seed**: `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_ISSUER`, `JWT_AUDIENCE`, `BCRYPT_SALT_ROUNDS`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME`.
- **WhatsApp y medios**: `WHATSAPP_SESSION_SECRET`, `MEDIA_MAX_BYTES`, `MEDIA_STORAGE_DIR`, `MEDIA_ENCRYPTION_ENABLED`, `MEDIA_ENCRYPTION_KEY`, `MEDIA_SIGNING_SECRET`.
- **Flags y cache**: `FEATURE_CAMPAIGNS`, `FEATURE_WHATSAPP_CONNECTIONS`, `FEATURE_AUDIT_EXPORTS`, `FEATURE_COLD_ARCHIVE`, `CACHE_*`, `WORKER_REALTIME_*`.

Buenas prácticas:
- Use secretos fuertes y distintos por entorno.
- No suba `.env` a repositorios ni lo comparta por correo.
- Errores comunes: dejar `JWT_SECRET` o credenciales de DB/Redis vacíos; el backend no arrancará.

## 12. Construcción del sistema con Docker
```bash
docker compose build
```
El comando descarga bases de imágenes y construye backend y frontend. Puede tardar varios minutos la primera vez. Si falla, revise conexión a internet o permisos sobre archivos del proyecto.

## 13. Levantar el sistema
```bash
docker compose up
```
- **Modo foreground**: muestra logs en pantalla (útil para diagnóstico).
- **Modo background**: `docker compose up -d` deja los contenedores ejecutándose.
Espere a que PostgreSQL y Redis estén “healthy” antes de usar el backend.

## 14. Verificación completa del sistema
- Contenedores activos:
  ```bash
  docker compose ps
  ```
- Logs del backend:
  ```bash
  docker compose logs --tail=50 backend
  ```
- Salud de la API (certificado local; usar `-k`):
  ```bash
  curl -k https://localhost/api/v1/health/live
  curl -k https://localhost/api/v1/health/ready
  ```
- Frontend (servido por Nginx): verificar que el contenedor `whatssuite-frontend` esté `running` y luego acceder por navegador.

## 15. Acceso a la aplicación
- URL por defecto: `https://localhost` (usa certificados de prueba en `certs/`; el navegador pedirá excepción).
- Primer acceso: si no hay usuario ADMIN, créelo:
  ```bash
  docker compose exec backend npm run seed:admin
  ```
Use las credenciales definidas en `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
Si no carga, revise que el contenedor `nginx` esté activo y que los puertos 80/443 no estén ocupados.

## 16. Comandos básicos de operación
- Iniciar: `docker compose up -d`
- Detener: `docker compose down`
- Reiniciar servicios de app: `docker compose restart backend frontend nginx`
- Estado: `docker compose ps`
- Logs: `docker compose logs -f backend` (cambiar `backend` por el servicio deseado)

## 17. Apagado seguro del sistema
Para detener todos los contenedores limpiamente:
```bash
docker compose down
```
Use `--volumes` solo si desea borrar datos de PostgreSQL/Redis/medios (no recomendado en producción).

## 18. Errores comunes y soluciones
- **Docker no inicia**: ejecutar `sudo systemctl status docker`; si está detenido, `sudo systemctl start docker`.
- **Permiso denegado al usar docker**: asegúrese de haber ejecutado `sudo usermod -aG docker $USER` y vuelva a iniciar sesión.
- **Puertos ocupados (80/443/3000/5432/6379)**: libere los puertos o edite `docker-compose.yml` para usar otros.
- **Variables faltantes**: si el backend cae, revise `.env` y vuelva a crear los contenedores (`docker compose up -d --build` si cambian variables de build).
- **Sin acceso al frontend**: validar que `nginx` y `frontend` estén `running` y que el navegador permita el certificado local.

## 19. Consideraciones para producción
- **Backups**: respalde volúmenes `postgres-data`, `redis-data` y `media-data`; pruebe restauraciones.
- **HTTPS**: sustituya los certificados de `certs/` por certificados válidos emitidos por una CA.
- **Firewall**: exponer solo 443/80; mantener PostgreSQL y Redis en red interna.
- **Actualizaciones**: aplicar parches del sistema, actualizar imágenes y reconstruir (`docker compose pull` o `build`) periódicamente.
- **Buenas prácticas**: rotar secretos, limitar `ALLOWED_ORIGINS`, ajustar `RATE_LIMIT_*` y `HTTP_MAX_CONCURRENT` según capacidad.
