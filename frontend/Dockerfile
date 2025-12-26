FROM node:20-alpine AS builder
WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install
COPY frontend ./
ARG VITE_API_BASE_URL=http://localhost
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build:prod

FROM nginx:1.25-alpine
# Servidor de estáticos simple; el reverse proxy TLS está en el servicio nginx principal.
RUN apk add --no-cache tzdata
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
ENV TZ=UTC
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
