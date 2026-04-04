#!/bin/bash
docker rm -f mtproto-util mtproto-proxy

sudo ufw delete allow 9443/tcp
sudo ufw reload