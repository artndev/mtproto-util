#!/bin/bash

echo "🧹 Cleaning up existing containers..."
docker rm -f mtproto-util mtproto-proxy >/dev/null 2>&1 || true
docker rmi -f mtproto-bot >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true

echo "🛡️ Resetting Firewall rules..."
sudo ufw delete allow 9443/tcp
sudo ufw reload

echo "✨ All is done! Checking your status..."
sleep 2
docker ps