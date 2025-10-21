# 🔌 Chrome 插件说明

## 概述

`chrome-extension` 文件夹包含了一个 Chrome 浏览器插件，可以在网页文件上传时，提供从移动端扫码上传图片的功能。

## 🎯 功能

该插件实现了以下功能：

### 1. 智能拦截文件上传
- 自动检测网页中的 `input[type="file"]` 元素
- 在用户点击文件上传按钮时拦截
- 显示选择对话框：扫码上传 or 本地上传

### 2. 扫码上传流程
- 在弹窗中以 iframe 形式加载 PC 端页面
- 显示二维码供手机扫描
- 接收从手机上传的图片
- 自动将图片填充到网页的文件输入框

### 3. 灵活配置
- 支持自定义服务器地址
- 默认使用部署的线上服务
- 本地开发时可切换到 localhost

## 📁 文件结构

```
chrome-extension/
├── manifest.json          # Chrome 插件配置文件
├── background.js          # 后台服务 Worker
├── content.js             # 内容脚本（注入到网页）
├── content.css            # 模态框样式
├── popup.html             # 插件弹窗页面
├── popup.js               # 弹窗脚本
├── options.html           # 设置页面
├── options.js             # 设置脚本
├── icons/                 # 图标资源
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── README.md              # 详细说明文档
├── INSTALLATION.md        # 安装指南
└── QUICKSTART.md          # 快速开始指南
```

## 🚀 快速开始

### 安装插件

1. 打开 Chrome: `chrome://extensions/`
2. 开启 **"开发者模式"**
3. 点击 **"加载已解压的扩展程序"**
4. 选择 `chrome-extension` 文件夹

### 配置服务器（可选）

- 默认: `https://qr-image-uploader.onrender.com/`
- 本地开发: `http://localhost:3000/`

### 使用

1. 在任意网页点击文件上传按钮
2. 选择 "📱 扫码上传"
3. 用手机扫码并上传图片

详细说明请查看: [chrome-extension/QUICKSTART.md](chrome-extension/QUICKSTART.md)

## 🔧 技术实现

### Content Script 拦截

```javascript
// 监听所有文件输入框的点击
document.addEventListener('click', function(e) {
  if (e.target.type === 'file') {
    e.preventDefault();
    showQRModal(); // 显示选择对话框
  }
}, true);
```

### iframe 通信

PC 页面检测到在 iframe 中时，通过 `postMessage` 发送图片数据：

```javascript
// pc.html
socket.on('image-received', (imageData) => {
  if (window.parent !== window) {
    window.parent.postMessage({
      type: 'qr-upload-image',
      imageData: imageData
    }, '*');
  }
});
```

插件接收并处理：

```javascript
// content.js
window.addEventListener('message', (event) => {
  if (event.data.type === 'qr-upload-image') {
    const imageData = event.data.imageData;
    convertToFileAndFillInput(imageData);
  }
});
```

### 文件转换

将 base64 图片数据转换为 File 对象：

```javascript
fetch(imageData)
  .then(res => res.blob())
  .then(blob => {
    const file = new File([blob], 'uploaded.jpg', { type: 'image/jpeg' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    
    // 触发事件
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
  });
```

## 🎨 用户界面

### 选择对话框

当用户点击文件上传时显示：

```
┌─────────────────────────────────┐
│   📱 选择上传方式                │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 📱 扫码上传               │  │
│  │ 使用手机扫码上传图片       │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 💻 本地上传               │  │
│  │ 从电脑选择文件             │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 扫码界面

选择扫码上传后，在 iframe 中加载完整的 PC 页面，包括：
- 二维码显示
- 房间号
- 连接状态
- 图片历史记录

### 设置页面

提供友好的配置界面：
- 服务器 URL 输入
- 示例地址快速选择
- 连接测试功能
- 功能特性说明

## 🔒 权限说明

插件需要以下权限：

| 权限 | 用途 |
|------|------|
| `storage` | 保存服务器 URL 配置 |
| `activeTab` | 与当前标签页交互 |
| `<all_urls>` | 在所有网页中注入内容脚本 |

## 🌐 兼容性

### 支持的浏览器

- ✅ Google Chrome (推荐)
- ✅ Microsoft Edge
- ✅ Brave Browser
- ✅ Opera
- ✅ Vivaldi
- ✅ 其他基于 Chromium 的浏览器

### 网站兼容性

插件设计为通用解决方案，理论上支持所有使用标准 `<input type="file">` 的网站。

**已测试网站**:
- Gmail (邮件附件)
- 微信网页版 (发送图片)
- 各类社交媒体平台
- 在线文档编辑器

**可能不兼容的情况**:
- 使用自定义上传组件的网站
- 使用 Flash 或其他特殊技术的旧网站
- 有特殊安全限制的网站

## 📝 开发说明

### 本地开发

1. 启动服务器:
   ```bash
   npm start
   ```

2. 在插件设置中配置 URL 为 `http://localhost:3000/`

3. 修改代码后:
   - 访问 `chrome://extensions/`
   - 点击插件的刷新按钮
   - 刷新测试网页

### 调试

- **Content Script**: 网页 Console (F12)
- **Background**: 扩展程序页面 > "检查视图"
- **Popup**: 弹窗上右键 > "检查"
- **Options**: 设置页面右键 > "检查"

### 修改配置

编辑 `manifest.json`:
- 修改权限
- 添加内容脚本匹配规则
- 更改插件信息

## 🔄 与主项目的集成

### 修改的文件

为了支持插件，主项目的 `public/pc.html` 做了以下修改：

```javascript
// 在接收图片时，检测是否在 iframe 中
socket.on('image-received', (imageData) => {
  // 原有逻辑...
  
  // 新增：如果在 iframe 中，发送消息给父窗口
  if (window.parent !== window) {
    window.parent.postMessage({
      type: 'qr-upload-image',
      imageData: imageData
    }, '*');
  }
});
```

这个修改：
- ✅ 不影响原有功能
- ✅ 向后兼容
- ✅ 仅在 iframe 环境中生效

## 📦 打包发布

### 创建 CRX 文件

1. 访问 `chrome://extensions/`
2. 点击 **"打包扩展程序"**
3. 选择 `chrome-extension` 目录
4. 生成 `.crx` 文件和私钥

### 发布到 Chrome Web Store

1. 创建开发者账号
2. 支付一次性注册费（$5）
3. 上传 ZIP 包
4. 填写商店信息
5. 提交审核

详细步骤: [Chrome Web Store 开发者文档](https://developer.chrome.com/docs/webstore/publish/)

## 🐛 已知问题

1. **某些网站拦截无效**
   - 原因：使用了自定义上传组件
   - 解决：需要针对性适配

2. **iframe 加载失败**
   - 原因：CSP 或 X-Frame-Options 限制
   - 解决：确保服务器配置允许 iframe 嵌入

3. **大图片传输慢**
   - 原因：移动端已做压缩，但大图仍需时间
   - 解决：前端显示上传进度（待开发）

## 🚧 待开发功能

- [ ] 支持多文件上传
- [ ] 添加上传进度显示
- [ ] 支持拖拽上传
- [ ] 添加快捷键
- [ ] 支持视频文件
- [ ] 添加上传历史记录
- [ ] 支持其他浏览器（Firefox）

## 📞 支持

如有问题或建议:

1. 查看 [完整文档](chrome-extension/README.md)
2. 查看 [安装指南](chrome-extension/INSTALLATION.md)
3. 提交 GitHub Issue
4. 查看 Console 日志排查问题

## 📄 许可证

MIT License - 与主项目保持一致

---

更多详细信息请查看 `chrome-extension` 文件夹中的文档。

