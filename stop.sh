#!/bin/bash
docker stop mtproto-proxy
docker rm mtproto-proxy
docker rmi nineseconds/mtg:2

pm2 delete mtproto-util
pm2 save

sudo ufw delete allow 9443/tcp
sudo ufw reload