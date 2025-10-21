# 📱 扫码上传图片助手 - Chrome 插件

这是一个 Chrome 浏览器插件，可以在网页文件上传时，提供从移动端扫码上传图片的功能。

## ✨ 功能特性

- 🎯 **智能拦截**: 自动识别网页中的文件上传操作
- 📱 **扫码上传**: 使用手机扫描二维码快速上传图片
- 💻 **无缝切换**: 可以随时选择本地上传或扫码上传
- ⚙️ **灵活配置**: 支持自定义服务器地址
- 🔒 **安全可靠**: 通过 WebSocket 实时传输，不存储任何数据

## 📦 安装方法

### 方式一: 开发者模式安装（推荐）

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `chrome-extension` 文件夹
5. 插件安装完成！

### 方式二: 打包后安装

1. 在 `chrome://extensions/` 页面点击"打包扩展程序"
2. 选择 `chrome-extension` 文件夹
3. 生成 `.crx` 文件后，拖拽到浏览器安装

## 🚀 使用方法

### 1. 配置服务器地址

首次安装后，插件会使用默认地址: `https://qr-image-uploader.onrender.com/`

如果需要修改:
- 点击浏览器工具栏中的插件图标
- 点击"打开设置"按钮
- 输入自定义的服务器 URL
- 点击"保存设置"

### 2. 上传图片

1. 在任何网页中点击文件上传按钮
2. 弹出对话框，选择"📱 扫码上传"
3. 使用手机扫描显示的二维码
4. 在手机上选择并上传图片
5. 图片会自动填充到网页的文件输入框中

或者选择"💻 本地上传"使用传统方式上传。

## 🛠️ 技术实现

### 文件结构

```
chrome-extension/
├── manifest.json          # 插件配置文件
├── background.js          # 后台服务脚本
├── content.js             # 内容脚本（拦截文件上传）
├── content.css            # 样式文件
├── popup.html             # 弹窗页面
├── popup.js               # 弹窗脚本
├── options.html           # 设置页面
├── options.js             # 设置脚本
├── icons/                 # 图标资源
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # 说明文档
```

### 核心功能

#### 1. 文件上传拦截

使用 Content Script 监听页面中所有 `input[type="file"]` 的点击事件：

```javascript
document.addEventListener('click', function(e) {
  const target = e.target;
  if (target.tagName === 'INPUT' && target.type === 'file') {
    handleFileInput(e, target);
  }
}, true);
```

#### 2. 扫码上传流程

1. 用户点击"扫码上传"
2. 在 iframe 中加载配置的 PC 页面
3. 手机扫码连接到同一房间
4. 手机上传图片后，PC 页面收到图片数据
5. PC 页面通过 `postMessage` 发送给插件
6. 插件将图片转换为 File 对象并填充到原始的 input

#### 3. 跨窗口通信

PC 页面检测是否在 iframe 中，如果是则发送消息：

```javascript
if (window.parent !== window) {
  window.parent.postMessage({
    type: 'qr-upload-image',
    imageData: imageData
  }, '*');
}
```

插件接收消息并处理：

```javascript
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'qr-upload-image') {
    const imageData = event.data.imageData;
    // 转换为 File 对象并填充到 input
  }
});
```

## ⚙️ 配置选项

### 服务器 URL

- **默认值**: `https://qr-image-uploader.onrender.com/`
- **格式要求**: 
  - 必须以 `http://` 或 `https://` 开头
  - 建议以 `/` 结尾
  - 示例: `http://localhost:3000/` (本地开发)

### 存储位置

配置保存在 Chrome 的同步存储中(`chrome.storage.sync`)，会在登录同一账号的不同设备间同步。

## 🔧 开发指南

### 修改代码后重新加载

1. 访问 `chrome://extensions/`
2. 找到"扫码上传图片助手"
3. 点击刷新按钮（🔄）

### 调试

- **Content Script**: 在网页中按 F12，在 Console 中查看日志
- **Background**: 在插件管理页面点击"检查视图：Service Worker"
- **Popup/Options**: 在弹窗或设置页面右键 -> 检查

### 本地测试

1. 启动本地服务器:
   ```bash
   cd ..
   npm install
   npm start
   ```

2. 在插件设置中配置 URL 为 `http://localhost:3000/`

3. 测试上传功能

## 📝 注意事项

1. **HTTPS 要求**: 部分网站可能要求 HTTPS，建议服务器配置 SSL 证书
2. **CORS 设置**: 确保服务器允许跨域请求
3. **网络连接**: 手机和电脑需要能访问同一个服务器
4. **浏览器兼容性**: 仅支持 Chrome 及基于 Chromium 的浏览器（Edge, Brave 等）

## 🐛 常见问题

### 1. 点击上传按钮没有反应？

- 检查插件是否已启用
- 刷新页面后重试
- 查看 Console 是否有错误信息

### 2. 扫码后无法上传？

- 检查服务器 URL 是否正确
- 确保服务器正在运行
- 检查网络连接是否正常

### 3. 图片上传后没有填充到表单？

- 某些网站可能使用了自定义上传组件
- 检查是否触发了 `change` 和 `input` 事件
- 可能需要针对特定网站进行适配

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，请通过 GitHub Issues 联系。

