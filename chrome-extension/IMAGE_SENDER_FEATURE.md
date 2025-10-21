# 📱 图片发送到手机功能

## 功能概述

v1.2.0 新增了图片识别和发送功能，可以将网页上的任何图片快速发送到手机。

## ✨ 特性

### 1. 自动识别图片
- ✅ 识别页面上所有图片（`<img>` 标签）
- ✅ 监听动态加载的图片
- ✅ 自动过滤小图标（宽高 < 50px）
- ✅ 避免重复处理（WeakSet）

### 2. 悬停显示按钮
- 📱 鼠标悬停图片时显示"发送到手机"按钮
- 🎨 半透明黑色背景，现代化设计
- ✨ 平滑的动画效果
- 🎯 智能定位（跟随图片位置）

### 3. 扫码获取图片
- 📸 点击按钮生成二维码
- 🔍 使用手机扫码
- 📥 自动下载到手机
- 🖼️ 原图质量，不压缩

### 4. 跨域支持
- ✅ 同源图片：Canvas 提取
- ✅ 跨域图片：Fetch 获取
- ✅ Data URL：直接使用
- ✅ 多重降级方案

## 🎯 使用方法

### 步骤 1: 浏览网页
在任何网页上浏览图片。

### 步骤 2: 悬停图片
将鼠标移动到想要下载的图片上。

### 步骤 3: 点击按钮
点击出现的"📱 发送到手机"按钮。

### 步骤 4: 扫描二维码
使用手机扫描弹出的二维码。

### 步骤 5: 获取图片
手机打开下载页面，图片自动下载。

## 📊 使用场景

### 1. 社交媒体
- Instagram、Pinterest、微博等图片网站
- 快速保存喜欢的图片到手机

### 2. 电商购物
- 淘宝、京东商品图片
- 保存商品图到手机分享

### 3. 新闻网站
- 新闻配图、信息图表
- 快速收藏到手机相册

### 4. 设计网站
- Dribbble、Behance 作品
- 收集灵感素材

## 🎨 界面展示

### 悬停按钮
```
┌────────────────┐
│                │
│     [图片]     │
│   ┌─────────┐  │
│   │📱发送到 │  │
│   │  手机   │  │
│   └─────────┘  │
└────────────────┘
```

### 二维码弹窗
```
┌──────────────────────┐
│  📱 扫码获取图片      │
│  使用手机扫描下方二维码│
│                      │
│  ┌──────────┐        │
│  │ [预览图] │        │
│  └──────────┘        │
│                      │
│  ┌──────────┐        │
│  │          │        │
│  │ [QR CODE]│        │
│  │          │        │
│  └──────────┘        │
│                      │
│  ✓ 扫码即可获取图片   │
│  扫码后图片会自动下载  │
└──────────────────────┘
```

### 手机下载页面
```
┌────────────────┐
│  📥 下载图片    │
│                │
│  [大图预览]     │
│                │
│ [下载图片按钮]  │
│                │
│  ✓ 已开始下载   │
└────────────────┘
```

## 🔧 技术实现

### 图片识别

```javascript
// 使用 MutationObserver 监听动态图片
const observer = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    mutation.addedNodes.forEach(node => {
      if (node.tagName === 'IMG') {
        addImageHover(node);
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

### 图片获取（不压缩）

```javascript
async function getImageData(img) {
  // 方法 1: Data URL
  if (img.src.startsWith('data:')) {
    return img.src;
  }
  
  // 方法 2: Canvas（同源）
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img, 0, 0);
  
  // PNG 格式，质量 1.0（不压缩）
  canvas.toBlob(blob => {
    // 转换为 Data URL
  }, 'image/png', 1.0);
  
  // 方法 3: Fetch（跨域）
  const response = await fetch(img.src);
  const blob = await response.blob();
  // 转换为 Data URL
}
```

### 二维码生成

```javascript
// 创建下载页面
const downloadPage = createDownloadPage(imageData);
const htmlBlob = new Blob([downloadPage], { type: 'text/html' });
const blobUrl = URL.createObjectURL(htmlBlob);

// 生成二维码
new QRCode(container, {
  text: blobUrl,
  width: 200,
  height: 200,
  correctLevel: QRCode.CorrectLevel.H
});
```

### 下载页面

```html
<!DOCTYPE html>
<html>
<head>
  <title>下载图片</title>
  <style>
    /* 美观的样式 */
  </style>
</head>
<body>
  <div class="container">
    <h1>📥 下载图片</h1>
    <img src="[IMAGE_DATA]" alt="图片">
    <a href="[IMAGE_DATA]" download="image.png" class="download-btn">
      下载图片
    </a>
  </div>
  <script>
    // 自动触发下载
    setTimeout(() => {
      document.querySelector('a').click();
    }, 500);
  </script>
</body>
</html>
```

## 🎨 样式特点

### 悬停按钮样式

```css
.qr-image-sender-btn {
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);  /* 毛玻璃效果 */
}

.qr-image-sender-btn:hover {
  background: rgba(0, 0, 0, 0.95);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}
```

### 模态框样式

```css
.qr-image-sender-modal-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 450px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: qr-sender-slide-up 0.3s ease-out;
}
```

## 📱 移动端优化

### 自动下载

```javascript
// 页面加载完成后自动触发下载
image.onload = function() {
  setTimeout(() => {
    downloadBtn.click();
  }, 500);
};
```

### 长按保存提示

```javascript
// 移动端长按图片可以保存
image.addEventListener('touchstart', function() {
  // 显示提示："长按图片可以保存到相册"
});
```

### 响应式设计

```css
@media (max-width: 600px) {
  .qr-image-sender-modal-content {
    padding: 24px;
    width: 95%;
  }
}
```

## ⚡ 性能优化

### 1. 避免重复处理

```javascript
const processedImages = new WeakSet();

function addImageHover(img) {
  if (processedImages.has(img)) return;
  processedImages.add(img);
  // 处理图片...
}
```

**优点**：
- WeakSet 不影响垃圾回收
- 图片移除后自动清理
- 零内存泄漏

### 2. 过滤小图标

```javascript
// 跳过太小的图片（可能是图标）
if (img.width < 50 || img.height < 50) return;
```

**优点**：
- 减少处理数量
- 避免无意义的按钮
- 提升用户体验

### 3. 延迟加载

```javascript
// 动态加载 QRCode 库
if (!window.QRCode) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
  script.async = true;
  document.head.appendChild(script);
}
```

**优点**：
- 按需加载
- 不影响页面性能
- 异步加载

## 🐛 已知限制

### 1. 跨域限制

某些图片可能因为 CORS 策略无法获取：
- **解决方案**: 尝试多种获取方法
- **降级方案**: 提供原图 URL

### 2. 二维码大小限制

Data URL 过大时二维码可能无法扫描：
- **解决方案**: 使用 Blob URL
- **限制**: Blob URL 仅在当前会话有效

### 3. 动画 GIF

Canvas 提取 GIF 只能获取第一帧：
- **解决方案**: 使用 Fetch 获取原始文件
- **保持**: 原始 GIF 动画

## 🔍 调试

### Console 日志

```javascript
// 初始化
"Image Sender: 初始化"
"Image Sender: 找到 X 个图片"

// 处理图片
"Image Sender: 处理图片" [img.src]

// 点击按钮
"Image Sender: 点击发送按钮" [img.src]

// 生成二维码
"Image Sender: 生成二维码失败" [error]
```

### 检查元素

```javascript
// 查看已处理的图片
document.querySelectorAll('img').forEach(img => {
  console.log('Image:', img.src);
  console.log('Size:', img.width, 'x', img.height);
});
```

## 💡 使用技巧

### 1. 批量下载

连续悬停多个图片，依次点击"发送到手机"：
```
图片1 → 扫码 → 图片2 → 扫码 → 图片3 → 扫码
```

### 2. 高质量图片

功能始终使用原图，不压缩：
```javascript
canvas.toBlob(blob => {
  // ...
}, 'image/png', 1.0);  // 质量 1.0 = 无损
```

### 3. 快速分享

生成二维码后可以：
- 直接扫码下载
- 截图二维码分享
- 多人同时扫码

## 📊 与文件上传功能对比

| 特性 | 文件上传 | 图片发送 |
|------|---------|---------|
| 方向 | 手机 → PC | PC → 手机 |
| 用途 | 上传文件到网站 | 下载图片到手机 |
| 触发 | 点击上传按钮 | 悬停图片 |
| 压缩 | 移动端压缩 | 不压缩 |
| 依赖 | 需要服务器 | 纯前端实现 |

## 🚀 未来计划

### v1.3.0
- [ ] 支持批量选择图片
- [ ] 添加图片收藏夹
- [ ] 支持图片编辑
- [ ] 云端同步功能

### v1.4.0
- [ ] 支持视频发送
- [ ] 支持文件发送
- [ ] 添加传输历史
- [ ] 二维码美化

## 🔧 故障排除

### 问题 1: 按钮不显示

**检查**：
```javascript
// 图片是否太小？
console.log(img.width, img.height);

// 是否已处理？
// 刷新页面重试
```

### 问题 2: 二维码无法扫描

**原因**: Blob URL 只在当前会话有效

**解决**: 
- 确保手机和电脑在扫码时保持连接
- 二维码生成后立即扫描

### 问题 3: 图片无法获取

**检查**：
```javascript
// 控制台是否有错误？
"Image Sender: 获取图片失败" [error]

// 是否跨域限制？
// 尝试右键 → 在新标签页打开图片
```

## 📝 更新日志

详见: [CHANGELOG.md](CHANGELOG.md#120---2025-10-21)

---

**功能版本**: 1.2.0  
**发布日期**: 2025-10-21  
**状态**: ✅ 可用

