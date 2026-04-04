#!/bin/bash
docker rm -f mtproto-util mtproto-proxy >/dev/null 2>&1 || true

sudo ufw allow 9443/tcp
sudo ufw reload

docker build -t mtproto-bot .
docker run -d \
  --name mtproto-util \
  --restart always \
  --privileged \
  --network host \
  -v /var/run/docker.sock:/var/run/docker.sock \
  mtproto-bot