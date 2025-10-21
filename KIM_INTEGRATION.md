# Kim App 集成说明

## 功能概述

在移动端接收页面（`receive.html`）中，添加了"在 Kim 中打开"按钮，用户接收图片后可以直接调起 Kim App。

## URL Scheme

```
kim://thread?id=3968724776095836&type=4
```

### 参数说明
- `id`: 会话/线程 ID
- `type`: 类型参数

## 使用方法

### 1. 用户操作流程

1. 手机扫描二维码访问接收页面
2. 接收到图片后，页面显示三个按钮：
   - 📥 **下载图片** - 下载图片到本地
   - 📱 **在 Kim 中打开** - 调起 Kim App（绿色按钮）
   - **继续等待更多图片** - 保持连接，等待更多图片

3. 点击"在 Kim 中打开"按钮：
   - 如果已安装 Kim App → 自动跳转到 Kim App 并打开指定会话
   - 如果未安装 Kim App → 2.5秒后提示用户下载 App

### 2. 自定义 Kim URL

如果需要修改跳转的会话 ID 或参数，编辑 `public/receive.html` 文件：

```javascript
// 找到这一行（约在第 192 行）
const kimUrl = 'kim://thread?id=3968724776095836&type=4';

// 修改为你需要的 URL
const kimUrl = 'kim://thread?id=YOUR_THREAD_ID&type=YOUR_TYPE';
```

### 3. 动态 URL（可选功能）

如果需要根据不同情况打开不同的 Kim 会话，可以将 URL 参数化：

```javascript
// 示例：从 URL 参数获取 thread ID
function openInKim() {
  // 从 URL 查询参数获取 thread ID
  const urlParams = new URLSearchParams(window.location.search);
  const threadId = urlParams.get('thread') || '3968724776095836';
  const type = urlParams.get('type') || '4';
  
  const kimUrl = `kim://thread?id=${threadId}&type=${type}`;
  
  console.log('尝试打开 Kim App:', kimUrl);
  window.location.href = kimUrl;
  // ... 其余代码
}
```

使用方式：
```
https://your-server.com/receive/ROOM_ID?thread=123456&type=4
```

## 技术实现

### 实现方式

采用了双重保险机制：

```javascript
// 方法1: 直接跳转（主要方式）
window.location.href = kimUrl;

// 方法2: iframe 方式（备用方案，0.5秒后执行）
const iframe = document.createElement('iframe');
iframe.style.display = 'none';
iframe.src = kimUrl;
document.body.appendChild(iframe);
```

### App 检测

通过监听页面可见性变化来检测 App 是否成功打开：

```javascript
setTimeout(() => {
  if (document.hidden) {
    // 页面进入后台 → App 已打开
    clearTimeout(timeout);
  } else {
    // 页面仍在前台 → App 可能未安装
    confirm('未检测到 Kim App，是否前往下载？');
  }
}, 2500);
```

## 兼容性

### 支持的平台
- ✅ iOS Safari
- ✅ Android Chrome
- ✅ 微信内置浏览器
- ✅ 其他移动浏览器

### URL Scheme 标准
- iOS: 原生支持 Custom URL Scheme
- Android: 支持 Intent URLs 和 Custom URL Scheme

## 测试方法

### 测试步骤

1. **测试 App 已安装的情况**：
   ```
   1. 确保手机已安装 Kim App
   2. 扫码访问接收页面
   3. 接收图片
   4. 点击"在 Kim 中打开"
   5. 验证是否正确跳转到 Kim App 指定会话
   ```

2. **测试 App 未安装的情况**：
   ```
   1. 卸载 Kim App（或使用未安装的设备）
   2. 扫码访问接收页面
   3. 接收图片
   4. 点击"在 Kim 中打开"
   5. 等待 2.5 秒
   6. 验证是否显示下载提示
   ```

### 调试方法

打开移动端浏览器的开发者工具（或使用 Chrome Remote Debugging）：

```javascript
// 控制台会输出
console.log('尝试打开 Kim App:', kimUrl);
```

## 扩展功能

### 添加下载链接

如果有 Kim App 的下载页面，可以修改提示逻辑：

```javascript
const confirmOpen = confirm('未检测到 Kim App，是否前往下载？');
if (confirmOpen) {
  // 替换为实际的下载链接
  window.location.href = 'https://kim-app-download-url.com';
  // 或者根据平台判断
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    window.location.href = 'https://apps.apple.com/app/kim/...';
  } else {
    window.location.href = 'https://play.google.com/store/apps/details?id=...';
  }
}
```

### 传递图片数据

如果需要将接收的图片也传递给 Kim App，可以将图片 URL 作为参数：

```javascript
function openInKim() {
  // 将图片上传到服务器并获取 URL（需要后端支持）
  const imageUrl = encodeURIComponent(currentImageUrl);
  const kimUrl = `kim://thread?id=3968724776095836&type=4&image=${imageUrl}`;
  
  window.location.href = kimUrl;
}
```

## 常见问题

### Q: 点击按钮没有反应？
A: 检查：
1. Kim App 是否已安装
2. URL Scheme 是否正确
3. 浏览器是否支持 URL Scheme 跳转
4. 查看浏览器控制台是否有错误

### Q: 如何在不同环境使用不同的 Kim URL？
A: 可以通过环境变量或配置文件：

```javascript
// 开发环境
const kimUrl = 'kim://thread?id=TEST_ID&type=4';

// 生产环境
const kimUrl = 'kim://thread?id=3968724776095836&type=4';
```

### Q: 能否支持多个不同的 Kim 会话？
A: 可以通过 URL 参数动态指定，参考上面"动态 URL"部分。

## 更新日志

- **2025-10-21**: 初始版本，添加 Kim App 集成功能
  - 支持直接跳转到指定会话
  - 自动检测 App 是否安装
  - 提供下载提示

