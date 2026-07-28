#!/usr/bin/env bash
# Install Docker Engine and the Compose plugin on Ubuntu 24.04.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_linux

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  log "Docker and Docker Compose are already installed"
  docker --version
  docker compose version
  exit 0
fi

[[ "${EUID:-$(id -u)}" -eq 0 ]] || die "Run as root: sudo ./deploy/install-docker.sh"

log "Installing Docker on Ubuntu..."

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y ca-certificates curl gnupg lsb-release

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -qq
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker

log "Docker installation complete"
docker --version
docker compose version

if [[ -n "${SUDO_USER:-}" ]]; then
  usermod -aG docker "${SUDO_USER}"
  log "Added ${SUDO_USER} to the docker group (log out and back in to use docker without sudo)"
fi
