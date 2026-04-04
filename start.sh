#!/bin/bash

echo "🧹 Cleaning up old containers..."
docker rm -f mtproto-util mtproto-proxy >/dev/null 2>&1 || true

echo "🛡️ Configuring Firewall rules..."
sudo ufw allow 9443/tcp >/dev/null 2>&1
sudo ufw reload >/dev/null 2>&1

echo "🏗️ Building Docker image: mtproto-bot..."
docker build --no-cache -t mtproto-bot .

# 4. Run
echo "🏃 Starting mtproto-util..."
docker run -d \
  --name mtproto-util \
  --restart always \
  --privileged \
  --network host \
  -v /var/run/docker.sock:/var/run/docker.sock \
  mtproto-bot

echo "✨ All is done! Checking your status..."
docker ps