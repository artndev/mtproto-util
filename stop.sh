#!/bin/bash
docker rm -f mtproto-util mtproto-proxy >/dev/null 2>&1 || true

sudo ufw delete allow 9443/tcp
sudo ufw reload