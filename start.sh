#!/bin/bash
sudo ufw allow 9443/tcp
sudo ufw reload

npm i
npm run build

pm2 start dist/index.js --name mtproto-util
pm2 save
pm2 startup