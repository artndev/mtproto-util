#!/bin/bash
docker stop mtproto-util mtproto-proxy
docker rm mtproto-util mtproto-proxy

sudo ufw delete allow 9443/tcp
sudo ufw reload