# 🔍 调试指南

## 问题：拦截上传文件不成功

如果插件无法拦截文件上传，请按照以下步骤调试。

## 🛠️ 调试步骤

### 1. 刷新插件

修改代码后必须刷新插件：

1. 访问 `chrome://extensions/`
2. 找到"扫码上传图片助手"
3. 点击刷新按钮 🔄
4. **刷新测试网页**（重要！）

### 2. 打开开发者工具

在测试网页上：
1. 按 `F12` 打开开发者工具
2. 切换到 **Console** 标签
3. 查看插件的调试日志

### 3. 检查插件日志

插件会输出详细的调试信息，查找以下日志：

```javascript
// 当检测到文件输入框时
"QR Upload: 检测到新添加的文件输入框"
"QR Upload: 检测到子元素中的文件输入框"

// 当点击 input 时
"QR Upload: input 直接点击事件"

// 当获得焦点时
"QR Upload: 文件输入框获得焦点"

// 当触发 change 事件时
"QR Upload: 检测到文件输入框 change 事件"
```

### 4. 手动检查 Input 元素

在 Console 中运行：

```javascript
// 查找所有文件输入框
document.querySelectorAll('input[type="file"]')

// 检查特定元素的属性
const input = document.querySelector('input[type="file"]');
console.log('Accept:', input.accept);
console.log('Class:', input.className);
console.log('Data attrs:', input.dataset);
console.log('Display:', window.getComputedStyle(input).display);
console.log('Visibility:', window.getComputedStyle(input).visibility);
```

### 5. 测试拦截功能

在 Console 中手动测试：

```javascript
// 模拟点击
const input = document.querySelector('input[type="file"]');
input.click();

// 检查是否被拦截
console.log('Modal open:', document.getElementById('qr-upload-modal'));
```

## 🎯 常见问题和解决方案

### 问题 1: Input 元素被隐藏

**症状**: 找到了 input 但点击没反应

**原因**: 
- Vue/React 组件通常会隐藏原始 input
- 使用自定义按钮触发 input.click()

**解决方案**:
插件已经实现了以下机制：
1. 监听全局点击事件（捕获阶段）
2. 检查点击元素及其父元素中的 file input
3. 为每个 file input 直接添加点击监听器
4. 使用 MutationObserver 监听动态添加的元素

### 问题 2: Accept 属性不匹配

**症状**: input 存在但被跳过

**原因**: accept 属性格式检查失败

**你的 input**:
```html
<input accept=".jpeg,.jpg,,.png,,.gif" type="file">
```

**已修复**: 插件现在支持：
- ✅ `.jpg`, `.jpeg`, `.png`, `.gif` 等扩展名
- ✅ `image/*` MIME 类型
- ✅ 空 accept 或 `*/*`

### 问题 3: 事件被其他脚本拦截

**症状**: 插件日志显示检测到 input，但点击没触发

**原因**: 
- 网站自己的 JavaScript 先处理了事件
- 使用了 `stopPropagation()`

**解决方案**:
```javascript
// 插件已使用捕获阶段（优先级更高）
document.addEventListener('click', handler, true);
//                                           ^^^^ 捕获阶段

// 并且直接在 input 元素上添加监听器
input.addEventListener('click', handler, true);
```

### 问题 4: Vue/React 动态渲染

**症状**: 页面加载时没有 input，后来才出现

**解决方案**:
插件使用 MutationObserver 监听 DOM 变化：

```javascript
// 自动检测新添加的 input
const observer = new MutationObserver(mutations => {
  // 检查新增节点中的 file input
});
observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

### 问题 5: Input 在 Shadow DOM 中

**症状**: 无法在普通 DOM 中找到 input

**解决方案**:
需要手动适配。在 Console 测试：

```javascript
// 查找 Shadow DOM
const shadowHosts = document.querySelectorAll('[data-shadow-root], [shadowroot]');
shadowHosts.forEach(host => {
  if (host.shadowRoot) {
    const inputs = host.shadowRoot.querySelectorAll('input[type="file"]');
    console.log('Shadow DOM inputs:', inputs);
  }
});
```

## 🧪 测试方法

### 方法 1: 使用 demo.html

```bash
# 打开测试页面
chrome-extension/demo.html
```

这个页面使用标准 input，应该能正常工作。

### 方法 2: 模拟你的 Vue 组件

创建测试文件 `test-vue.html`：

```html
<!DOCTYPE html>
<html>
<head>
  <title>Vue Input Test</title>
</head>
<body>
  <!-- 模拟 Vue 组件生成的 HTML -->
  <div data-v-60c360e1="">
    <input data-v-60c360e1="" 
           accept=".jpeg,.jpg,,.png,,.gif" 
           class="file-input" 
           type="file">
  </div>

  <script>
    console.log('测试页面加载完成');
  </script>
</body>
</html>
```

打开这个文件，测试插件是否能拦截。

### 方法 3: 在真实网站上测试

1. 打开目标网站
2. 按 F12 打开开发者工具
3. 在 Elements 标签找到 input 元素
4. 右键 > Break on > attribute modifications
5. 点击上传按钮，观察断点触发

## 📝 收集调试信息

如果问题依然存在，请收集以下信息：

### 1. Input 元素信息

```javascript
const input = document.querySelector('input[type="file"]');
console.log({
  tagName: input.tagName,
  type: input.type,
  accept: input.accept,
  className: input.className,
  id: input.id,
  dataset: input.dataset,
  style: input.style.cssText,
  computed: {
    display: window.getComputedStyle(input).display,
    visibility: window.getComputedStyle(input).visibility,
    opacity: window.getComputedStyle(input).opacity,
    position: window.getComputedStyle(input).position
  }
});
```

### 2. 事件监听器

在 Elements 标签：
1. 选中 input 元素
2. 右侧面板切换到 Event Listeners
3. 展开 click 事件
4. 查看有哪些监听器

### 3. Console 日志

复制所有 "QR Upload:" 开头的日志。

### 4. Network 请求

检查是否有相关的网络请求失败。

## 🔧 临时禁用其他扩展

某些扩展可能干扰文件上传：

1. 访问 `chrome://extensions/`
2. 临时禁用其他扩展
3. 只保留"扫码上传图片助手"
4. 测试是否能正常工作

## 💡 手动触发测试

如果自动拦截失败，可以手动触发：

```javascript
// 在 Console 中运行
(function() {
  const input = document.querySelector('input[type="file"]');
  if (!input) {
    console.error('未找到 file input');
    return;
  }
  
  // 手动调用插件的处理函数
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true
  });
  
  event.preventDefault();
  event.stopPropagation();
  
  console.log('手动触发插件，input:', input);
  
  // 这里需要手动创建模态框
  // 或者尝试触发插件的事件监听器
})();
```

## 📞 获取帮助

如果以上方法都无效，请提供：

1. ✅ 网站 URL（如果是公开网站）
2. ✅ Input 元素的完整 HTML
3. ✅ Console 中的所有日志
4. ✅ Elements 标签中的事件监听器截图
5. ✅ 浏览器版本和插件版本

---

## 🎯 快速解决方案

如果你急需解决，可以尝试：

### 方案 A: 手动点击测试

```javascript
// 在页面加载完成后运行
setTimeout(() => {
  const inputs = document.querySelectorAll('input[type="file"]');
  console.log('找到的 file inputs:', inputs);
  inputs.forEach((input, i) => {
    console.log(`Input ${i}:`, {
      accept: input.accept,
      className: input.className,
      visible: input.offsetParent !== null
    });
  });
}, 2000);
```

### 方案 B: 强制拦截所有 file input

临时修改 `content.js`，移除 accept 检查：

```javascript
function handleFileInput(e, input) {
  // 暂时跳过所有检查，强制拦截
  e.preventDefault();
  e.stopPropagation();
  currentFileInput = input;
  showQRModal();
}
```

### 方案 C: 添加网站特定的适配

如果是特定网站，可以添加专门的处理逻辑。

告诉我你的测试结果，我会进一步帮助你！

