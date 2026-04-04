#!/bin/bash
docker stop mtproto-util mtproto-proxy
docker rm mtproto-util mtproto-proxy

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