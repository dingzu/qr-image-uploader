# 图片发送功能调试指南

## 问题描述
手机可以连接到服务器，但图片没有传输过来，一直显示"已连接"。

## 调试步骤

### 1. 检查浏览器端 Console
打开浏览器开发者工具 (F12)，查看 Console 标签页，应该看到以下日志：

```
Image Sender: 开始生成二维码流程
Image Sender: 图片数据大小: XXX KB
Image Sender: 获取服务器配置...
Image Sender: 使用服务器地址: https://...
Image Sender: 生成房间 ID: IMG_XXXXXXXX
Image Sender: 连接到 Socket.IO 服务器
Image Sender: Socket.IO 库已就绪
Image Sender: 初始化 Socket 连接
Image Sender: 已连接到服务器，Socket ID: xxxxx
Image Sender: 已加入发送者房间 IMG_XXXXXXXX
Image Sender: 发送图片到服务器，房间: IMG_XXXXXXXX 图片大小: XXX KB
Image Sender: 服务器确认图片已存储，等待手机扫码...
```

### 2. 检查手机端 Console
在手机上打开浏览器的调试模式（或使用电脑浏览器模拟手机），查看 Console：

```
已连接到服务器
已发送加入房间请求: IMG_XXXXXXXX
已加入接收房间
手机端请求房间图片: IMG_XXXXXXXX
收到图片，大小: XXX KB
```

### 3. 检查服务器端日志
查看终端中的服务器日志：

```
服务器运行在端口 3000
用户连接: socket_id_1
浏览器端加入发送者房间: IMG_XXXXXXXX
发送图片到手机，房间: IMG_XXXXXXXX，图片大小: XXX KB
创建新房间 IMG_XXXXXXXX 并存储图片
房间 IMG_XXXXXXXX 当前有 1 个客户端
图片已存储并广播到房间 IMG_XXXXXXXX

用户连接: socket_id_2
移动端加入接收房间: IMG_XXXXXXXX
已通知房间 IMG_XXXXXXXX 的发送者：手机已加入
手机端请求房间图片: IMG_XXXXXXXX
发送已存在的图片到手机，大小: XXX KB

手机端确认收到图片，房间: IMG_XXXXXXXX
```

## 常见问题排查

### 问题 1: 浏览器端无法连接到服务器
**症状**: Console 显示 "Socket.IO 连接错误" 或 "连接服务器超时"

**解决方案**:
1. 检查服务器是否正在运行 (`npm start`)
2. 检查插件配置的服务器地址是否正确
3. 检查防火墙是否阻止了连接

### 问题 2: 手机端无法加入房间
**症状**: 手机 Console 显示 "房间不存在"

**解决方案**:
1. 确保先在浏览器端点击"发送到手机"
2. 确保 QR 码中的 roomId 正确
3. 检查服务器日志，确认房间已创建

### 问题 3: 图片没有传输
**症状**: 手机显示"已连接"但没有收到图片

**可能原因**:
1. **房间不存在**: 浏览器端还没发送图片到服务器
2. **图片数据为空**: 服务器存储的图片数据为 undefined
3. **Socket 事件没监听到**: 手机端没有正确监听 `image-sent-to-phone` 事件

**解决步骤**:
1. 查看服务器日志中的 "房间 XXX 当前有 X 个客户端"
   - 应该至少有 2 个客户端（浏览器 + 手机）
2. 查看 "手机端请求房间图片" 后的响应
   - 如果显示 "发送已存在的图片到手机"，说明图片存在
   - 如果显示 "房间存在，但还没有图片数据"，说明浏览器端没发送图片
   - 如果显示 "房间不存在"，说明浏览器端没创建房间
3. 检查手机端是否收到 `image-sent-to-phone` 事件

## 工作流程

```
┌─────────────┐                 ┌─────────────┐                 ┌─────────────┐
│  浏览器端   │                 │   服务器    │                 │   手机端    │
└─────────────┘                 └─────────────┘                 └─────────────┘
       │                               │                               │
       │ 1. connect()                  │                               │
       ├──────────────────────────────>│                               │
       │                               │                               │
       │ 2. join-sender-room          │                               │
       ├──────────────────────────────>│                               │
       │                               │                               │
       │ 3. send-image-to-phone       │                               │
       │    (存储图片到服务器)        │                               │
       ├──────────────────────────────>│                               │
       │                               │                               │
       │ 4. image-send-success        │                               │
       │<──────────────────────────────┤                               │
       │                               │                               │
       │   (显示: 扫码即可获取图片)   │                               │
       │                               │                               │
       │                               │  5. connect()                 │
       │                               │<──────────────────────────────┤
       │                               │                               │
       │                               │  6. join-receive-room         │
       │                               │<──────────────────────────────┤
       │                               │                               │
       │ 7. phone-joined-room         │  8. receive-room-joined       │
       │<──────────────────────────────┤──────────────────────────────>│
       │                               │                               │
       │   (显示: 手机已连接...)      │  9. request-room-image        │
       │                               │<──────────────────────────────┤
       │                               │                               │
       │                               │ 10. image-sent-to-phone       │
       │                               │    (发送存储的图片)           │
       │                               │──────────────────────────────>│
       │                               │                               │
       │                               │   (显示图片)                  │
       │                               │                               │
       │                               │ 11. phone-received-image      │
       │                               │<──────────────────────────────┤
       │                               │                               │
       │ 12. image-received-by-phone  │                               │
       │<──────────────────────────────┤                               │
       │                               │                               │
       │   (显示: 图片已发送到手机！) │                               │
```

## 测试命令

### 测试 1: 验证 Socket.IO 库已加载
在浏览器 Console 中运行:
```javascript
console.log('io available:', typeof window.io);
// 应该输出: io available: function
```

### 测试 2: 验证服务器连接
在浏览器 Console 中运行:
```javascript
const testSocket = io('https://qr-image-uploader.onrender.com/');
testSocket.on('connect', () => console.log('Connected!', testSocket.id));
```

### 测试 3: 手动触发图片请求
在手机端 Console 中运行:
```javascript
socket.emit('request-room-image', roomId);
```

## 版本信息
- Extension: 1.4.2
- Socket.IO Client: 4.6.1
- Socket.IO Server: 4.6.1

