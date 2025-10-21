# QR 图片上传器

一个简单的扫码上传图片服务，支持 PC 显示二维码，手机扫码上传图片。

## 功能

1. PC 端打开网页生成唯一二维码
2. 手机扫描二维码打开上传页面
3. 手机上传图片
4. PC 端实时显示上传的图片

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

然后访问 `http://localhost:3000`

## 部署到 Vercel

1. 安装 Vercel CLI: `npm i -g vercel`
2. 登录: `vercel login`
3. 部署: `vercel --prod`

或者直接在 Vercel 网站上导入 GitHub 仓库。

## 技术栈

- Express.js - 服务端框架
- Socket.IO - 实时通信
- QRCode.js - 二维码生成
- 原生 HTML/CSS/JavaScript - 前端

