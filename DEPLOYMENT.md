# 部署指南

## Vercel 部署步骤

### 方法 1: 通过 Vercel CLI 部署（推荐）

1. 安装 Vercel CLI：
```bash
npm install -g vercel
```

2. 登录 Vercel：
```bash
vercel login
```

3. 在项目目录下运行部署命令：
```bash
vercel --prod
```

4. 按照提示完成配置，Vercel 会自动检测项目设置

### 方法 2: 通过 Vercel 网站部署

1. 将代码推送到 GitHub 仓库

2. 访问 [Vercel](https://vercel.com)

3. 点击 "Import Project"

4. 选择你的 GitHub 仓库

5. Vercel 会自动检测配置并部署

## 注意事项

### Socket.IO 配置

Vercel 对 WebSocket 的支持有限制。为了在 Vercel 上正常使用，需要注意：

1. **使用轮询模式**: Socket.IO 会自动降级到 HTTP 长轮询
2. **无服务器函数限制**: Vercel 的无服务器函数有 10 秒超时限制

### 推荐的替代方案（生产环境）

由于 Vercel 对实时连接的限制，对于生产环境建议：

1. **使用 Railway**: 支持完整的 WebSocket
```bash
# 安装 Railway CLI
npm i -g @railway/cli

# 登录并部署
railway login
railway init
railway up
```

2. **使用 Render**: 免费支持 WebSocket
   - 访问 [Render.com](https://render.com)
   - 连接 GitHub 仓库
   - 选择 "Web Service"
   - 设置构建命令: `npm install`
   - 设置启动命令: `npm start`

3. **使用 Fly.io**: 支持完整的 WebSocket
```bash
# 安装 Fly CLI
curl -L https://fly.io/install.sh | sh

# 登录并部署
fly auth login
fly launch
fly deploy
```

## 本地测试

在部署前，建议先本地测试：

```bash
# 安装依赖
npm install

# 启动服务器
npm start

# 访问 http://localhost:3000
```

## 环境变量

如果需要配置端口或其他环境变量，可以在 Vercel 项目设置中添加：

- `PORT`: 服务器端口（Vercel 会自动设置）

## 故障排查

1. **二维码无法生成**: 检查浏览器控制台错误
2. **无法连接**: 确保 Socket.IO 客户端使用正确的服务器地址
3. **图片上传失败**: 检查图片大小限制（当前限制 10MB）

