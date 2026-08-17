#!/usr/bin/env bash
# Canlı sunucu güncellemesi — public/uploads içeriğine DOKUNMAZ.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

UPLOADS_DIR="$ROOT/public/uploads"
PM2_NAME="${PM2_NAME:-ihsanakyildiz}"
BRANCH="${DEPLOY_BRANCH:-main}"

if [[ ! -d "$UPLOADS_DIR" ]]; then
  mkdir -p "$UPLOADS_DIR"
  echo "Uyarı: $UPLOADS_DIR yoktu, boş klasör oluşturuldu."
fi

# Güvenlik: uploads içindeki dosya sayısını not et (silinmediğini doğrulamak için)
before_count="$(find "$UPLOADS_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')"

echo "==> Git durumu"
git status --short

# uploads untracked kalır; pull'u engelleyen tipik şeyler: package-lock.json, public favicon vb.
blocking="$(git status --porcelain | grep -v '^?? public/uploads/' | grep -v '^?? uploads/' || true)"
if [[ -n "$blocking" ]]; then
  echo "Uyarı: pull'u engelleyebilecek yerel değişiklikler var:"
  echo "$blocking"
  echo "Favicon vb. için: git stash push -m \"pre-deploy\" -- public/ \"package-lock.json\""
  echo "uploads stash'e girmez ve yerinde kalır."
fi

echo "==> git pull origin ${BRANCH}"
git pull origin "$BRANCH"

echo "==> npm ci"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

if [[ -f prisma/schema.prisma ]]; then
  echo "==> prisma generate"
  npx prisma generate
fi

echo "==> npm run build"
npm run build

echo "==> pm2 restart ${PM2_NAME}"
pm2 restart "$PM2_NAME"

after_count="$(find "$UPLOADS_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')"
echo "==> public/uploads dosya sayısı: önce=${before_count} sonra=${after_count}"
if [[ "$after_count" -lt "$before_count" ]]; then
  echo "HATA: uploads dosya sayısı azaldı! Deploy uploads'a dokunmamalı."
  exit 1
fi

echo "Tamam. uploads korundu."
