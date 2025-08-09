FROM node:24-slim

# Instalar Chromium y dependencias mínimas para puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    fonts-liberation \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdrm2 libgbm1 \
    libgtk-3-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 \
    xdg-utils libu2f-udev libxshmfence1 libglu1-mesa \
    curl \
  && rm -rf /var/lib/apt/lists/*

# Crear usuario no root
RUN groupadd -r app && useradd -r -g app -d /usr/src/app -s /usr/sbin/nologin app

WORKDIR /usr/src/app

# Evitar descarga de Chromium de puppeteer y fijar ruta del sistema
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copiar package.json y package-lock.json* e instalar dependencias
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# Copiar el resto del código fuente
COPY . .

# Definir entorno y ajustar permisos
ENV NODE_ENV=production
RUN chown -R app:app /usr/src/app

# Copiar y dar permisos al entrypoint
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER app

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node","index.js"]

EXPOSE 3000
