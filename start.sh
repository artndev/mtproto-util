#!/bin/bash
docker stop mtproto-proxy
docker rm mtproto-proxy
docker rmi nineseconds/mtg:2

pm2 flush mtproto-util
pm2 delete mtproto-util

sudo ufw allow 9443/tcp
sudo ufw reload

npm i
npm run build

pm2 start dist/index.js --name mtproto-util
pm2 save
pm2 startup