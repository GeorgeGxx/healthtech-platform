#!/usr/bin/env bash
set -euo pipefail

YQ_VERSION="${1:-v4.44.3}"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

if command -v yq >/dev/null 2>&1; then
  CURRENT_VER="$(yq --version 2>/dev/null || true)"
  if [[ "$CURRENT_VER" == *"${YQ_VERSION}"* ]]; then
    echo "yq ${YQ_VERSION} already installed."
    exit 0
  fi
fi

URL="https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_${OS}_${ARCH}"
echo "Installing yq ${YQ_VERSION} from ${URL}..."
curl -fsSL "$URL" -o /tmp/yq
sudo install -m 0755 /tmp/yq /usr/local/bin/yq
rm -f /tmp/yq
yq --version
