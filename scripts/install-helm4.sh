#!/usr/bin/env bash
set -euo pipefail

HELM_VERSION="${1:-v4.3.1}"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

if command -v helm >/dev/null 2>&1; then
  CURRENT_VER="$(helm version --short 2>/dev/null || true)"
  if [[ "$CURRENT_VER" == "${HELM_VERSION}"* ]]; then
    echo "Helm ${HELM_VERSION} already installed."
    exit 0
  fi
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

TARBALL="helm-${HELM_VERSION}-${OS}-${ARCH}.tar.gz"
URL="https://get.helm.sh/${TARBALL}"
echo "Installing Helm ${HELM_VERSION} from ${URL}..."
curl -fsSL "$URL" -o "${TMP_DIR}/${TARBALL}"
tar -xzf "${TMP_DIR}/${TARBALL}" -C "${TMP_DIR}"
sudo install -m 0755 "${TMP_DIR}/${OS}-${ARCH}/helm" /usr/local/bin/helm
helm version --short
