#!/usr/bin/env bash
set -euo pipefail

REPO_SLUG="Lillizz/merry-christmas-tree-web"
APP_BUNDLE_NAME="MerryChristmasTree.app"

usage() {
  cat >&2 <<'EOF'
사용법: install-mac.sh <company|friends> [tag_or_version]

예시:
  curl -fsSL https://lillizz.github.io/merry-christmas-tree-web/install-mac.sh | bash -s -- friends
  curl -fsSL https://lillizz.github.io/merry-christmas-tree-web/install-mac.sh | bash -s -- company
  curl -fsSL https://lillizz.github.io/merry-christmas-tree-web/install-mac.sh | bash -s -- company v2.2.0
EOF
}

strip_tag_prefix() {
  local raw="$1"
  raw="${raw#company-}"
  raw="${raw#friends-}"
  raw="${raw#v}"
  raw="${raw#V}"
  printf '%s' "$raw"
}

if [ "$(uname -s)" != "Darwin" ]; then
  echo "오류: 이 설치 스크립트는 macOS(Darwin)에서만 실행할 수 있습니다." >&2
  exit 1
fi

RAW_EDITION="${1:-}"
EDITION="$(printf '%s' "$RAW_EDITION" | tr '[:upper:]' '[:lower:]')"
if [ "$EDITION" != "company" ] && [ "$EDITION" != "friends" ]; then
  echo "오류: 첫 번째 인자로 에디션(company 또는 friends)을 지정해야 합니다." >&2
  usage
  exit 1
fi

MACHINE_ARCH="$(uname -m)"
if [ "$MACHINE_ARCH" = "arm64" ]; then
  ARCH="arm64"
elif [ "$MACHINE_ARCH" = "x86_64" ]; then
  if [ "$(sysctl -in sysctl.proc_translated 2>/dev/null || echo 0)" = "1" ]; then
    ARCH="arm64"
  else
    ARCH="x64"
  fi
else
  echo "오류: 지원하지 않는 CPU 아키텍처입니다: ${MACHINE_ARCH}" >&2
  exit 1
fi

TAG_INPUT="${2:-}"
RELEASE_TAG=""
VERSION=""
DMG_NAME=""
DOWNLOAD_URL=""

if [ -n "$TAG_INPUT" ]; then
  VERSION="$(strip_tag_prefix "$TAG_INPUT")"
  if [ -z "$VERSION" ]; then
    echo "오류: 올바르지 않은 버전/태그 지정입니다: ${TAG_INPUT}" >&2
    exit 1
  fi
  RELEASE_TAG="${EDITION}-v${VERSION}"
  DMG_NAME="MerryChristmasTree-${EDITION}-${VERSION}-${ARCH}.dmg"
  DOWNLOAD_URL="https://github.com/${REPO_SLUG}/releases/download/${RELEASE_TAG}/${DMG_NAME}"
else
  LATEST_URL="$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/${REPO_SLUG}/releases/latest" || true)"
  case "$LATEST_URL" in
    *"/releases/tag/"*)
      LATEST_TAG="${LATEST_URL##*/releases/tag/}"
      LATEST_TAG="${LATEST_TAG%%[?#]*}"
      CANDIDATE_VER="$(strip_tag_prefix "$LATEST_TAG")"
      if [ -n "$CANDIDATE_VER" ]; then
        CANDIDATE_TAG="${EDITION}-v${CANDIDATE_VER}"
        CANDIDATE_DMG="MerryChristmasTree-${EDITION}-${CANDIDATE_VER}-${ARCH}.dmg"
        CANDIDATE_URL="https://github.com/${REPO_SLUG}/releases/download/${CANDIDATE_TAG}/${CANDIDATE_DMG}"
        if curl -fsSLI -o /dev/null "$CANDIDATE_URL" 2>/dev/null; then
          RELEASE_TAG="$CANDIDATE_TAG"
          VERSION="$CANDIDATE_VER"
          DMG_NAME="$CANDIDATE_DMG"
          DOWNLOAD_URL="$CANDIDATE_URL"
        fi
      fi
      ;;
  esac

  if [ -z "$RELEASE_TAG" ]; then
    RELEASES_JSON="$(curl -fsSL "https://api.github.com/repos/${REPO_SLUG}/releases?per_page=20" 2>/dev/null || true)"
    FALLBACK_TAG="$(printf '%s' "$RELEASES_JSON" | grep -Eo '"tag_name":[[:space:]]*"[^"]+"' | sed -E 's/.*"([^"]+)"$/\1/' | grep -E "^${EDITION}-v" | head -n 1 || true)"
    if [ -n "$FALLBACK_TAG" ]; then
      RELEASE_TAG="$FALLBACK_TAG"
      VERSION="$(strip_tag_prefix "$RELEASE_TAG")"
      DMG_NAME="MerryChristmasTree-${EDITION}-${VERSION}-${ARCH}.dmg"
      DOWNLOAD_URL="https://github.com/${REPO_SLUG}/releases/download/${RELEASE_TAG}/${DMG_NAME}"
    fi
  fi

  if [ -z "$RELEASE_TAG" ] || [ -z "$DOWNLOAD_URL" ]; then
    echo "오류: ${REPO_SLUG}에서 ${EDITION} 에디션의 최신 릴리즈를 찾지 못했습니다." >&2
    echo "      릴리즈가 아직 게시되지 않았거나 저장소가 비공개(Private)일 수 있습니다." >&2
    exit 1
  fi
fi

TMP_DIR="$(mktemp -d)"
MOUNT_DIR="${TMP_DIR}/mnt"
MOUNTED=0

cleanup() {
  if [ "$MOUNTED" = "1" ]; then
    hdiutil detach "$MOUNT_DIR" -quiet 2>/dev/null || hdiutil detach "$MOUNT_DIR" -force -quiet 2>/dev/null || true
  fi
  if [ -n "${TMP_DIR:-}" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT

echo "[설치] 에디션=${EDITION}, 릴리즈=${RELEASE_TAG}, 아키텍처=${ARCH}"
echo "[다운로드] ${DOWNLOAD_URL}"
curl -fL --progress-bar "$DOWNLOAD_URL" -o "${TMP_DIR}/${DMG_NAME}"

mkdir -p "$MOUNT_DIR"
echo "[마운트] 디스크 이미지를 여는 중..."
hdiutil attach "${TMP_DIR}/${DMG_NAME}" -nobrowse -readonly -mountpoint "$MOUNT_DIR" -quiet
MOUNTED=1

SRC_APP="${MOUNT_DIR}/${APP_BUNDLE_NAME}"
if [ ! -d "$SRC_APP" ]; then
  echo "오류: 마운트된 이미지에서 ${APP_BUNDLE_NAME}을 찾을 수 없습니다." >&2
  exit 1
fi

osascript -e 'tell application "MerryChristmasTree" to quit' 2>/dev/null || true
sleep 1

if [ -w "/Applications" ]; then
  DEST_DIR="/Applications"
else
  DEST_DIR="${HOME}/Applications"
  mkdir -p "$DEST_DIR"
fi
DEST_APP="${DEST_DIR}/${APP_BUNDLE_NAME}"

echo "[복사] ${DEST_APP} 에 설치하는 중..."
rm -rf "$DEST_APP"
ditto "$SRC_APP" "$DEST_APP"
xattr -dr com.apple.quarantine "$DEST_APP" 2>/dev/null || true

hdiutil detach "$MOUNT_DIR" -quiet 2>/dev/null || true
MOUNTED=0

echo "[완료] 설치가 완료되었습니다: ${DEST_APP}"
open "$DEST_APP"
