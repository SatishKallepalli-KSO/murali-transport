# syntax=docker/dockerfile:1

FROM node:22-alpine AS web-build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
RUN npm ci --workspace=@murali-transport/web
COPY apps/web apps/web
ENV VITE_BASE=/
ENV VITE_API_BASE=
RUN npm run build --workspace=@murali-transport/web

FROM python:3.12-slim AS api
WORKDIR /app

RUN useradd --create-home --uid 10001 appuser

COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/api/app ./app
COPY apps/api/alembic ./alembic
COPY apps/api/alembic.ini ./alembic.ini
COPY --from=web-build /repo/apps/web/dist ./static

RUN chown -R appuser:appuser /app
USER appuser

ENV PORT=8000
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/healthz' % (__import__('os').environ.get('PORT','8000')))"

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
