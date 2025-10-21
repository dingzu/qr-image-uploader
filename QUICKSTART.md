# 快速开始指南

## 📦 安装依赖

```bash
npm install
```

## 🚀 本地运行

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动

## 📱 使用方法

### 步骤 1: PC 端打开
在浏览器中访问 `http://localhost:3000`，页面会显示一个二维码

### 步骤 2: 手机扫码
使用手机扫描 PC 端显示的二维码

### 步骤 3: 上传图片
在手机上选择或拖拽图片进行上传

### 步骤 4: PC 端查看
PC 端会实时显示上传的图片

## 🌐 部署到 Vercel

### 快速部署
```bash
npm install -g vercel
vercel login
vercel --prod
```

### 注意事项
由于 Vercel 对 WebSocket 的支持有限制，建议生产环境使用以下平台：
- Railway (推荐)
- Render
- Fly.io

详细部署说明请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

## 📂 项目结构

```
qr-image-uploader/
├── public/
│   ├── pc.html          # PC 端页面
│   └── mobile.html      # 移动端页面
├── server.js            # Node.js 服务器
├── package.json         # 项目配置
├── vercel.json          # Vercel 部署配置
└── README.md            # 项目文档
```

## 🛠 技术栈

- **后端**: Node.js + Express + Socket.IO
- **前端**: 原生 HTML/CSS/JavaScript
- **二维码生成**: QRCode.js
- **实时通信**: Socket.IO

## 💡 功能特性

✅ 实时双向通信  
✅ 二维码自动生成  
✅ 支持拖拽上传  
✅ 图片预览功能  
✅ 移动端优化  
✅ 美观的 UI 设计  

## 🔧 配置

### 端口配置
默认端口是 3000，可以通过环境变量修改：

```bash
PORT=8080 npm start
```

### 图片大小限制
当前限制为 10MB，可以在 `server.js` 中修改：

```javascript
app.use(express.json({ limit: '10mb' }));
```

## ❓ 常见问题

### Q: 二维码显示不出来？
A: 检查浏览器控制台是否有错误，确保 QRCode.js CDN 可以访问

### Q: 手机扫码后无法连接？
A: 确保手机和 PC 在同一网络下，或使用公网可访问的地址

### Q: 图片上传失败？
A: 检查图片大小是否超过限制，确保网络连接正常

## 📄 许可证

MIT License

