# syntax=docker/dockerfile:1

FROM node:22-alpine AS web-build
WORKDIR /web
COPY apps/web/package.json apps/web/package-lock.json* ./
RUN npm install
COPY apps/web/ ./
# Same-origin API when Docker serves the SPA from FastAPI /static
ENV VITE_BASE=/
ENV VITE_API_BASE=
RUN npm run build

FROM python:3.12-slim AS api
WORKDIR /app
COPY apps/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY apps/api/app ./app
COPY --from=web-build /web/dist ./static

# Render (and most PaaS) inject PORT
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
