# 🐛 Bug 修复：本地上传按钮

## 问题描述

在 v1.1.0 版本中，点击"本地上传"按钮无法正常打开文件选择器。

### 重现步骤
1. 在网页中点击文件上传按钮
2. 插件弹出选择对话框
3. 点击"💻 本地上传"
4. ❌ 文件选择器没有打开

### 预期行为
点击"本地上传"后，应该关闭插件对话框并打开系统的文件选择器。

## 问题原因

### 循环拦截问题

插件使用了多重拦截机制来捕获文件上传操作：

```javascript
// 1. 全局点击监听（捕获阶段）
document.addEventListener('click', function(e) {
  if (target.type === 'file') {
    e.preventDefault(); // 阻止默认行为
    showQRModal();      // 显示选择对话框
  }
}, true);

// 2. 直接在 input 上添加监听
input.addEventListener('click', function(e) {
  e.preventDefault();
  showQRModal();
}, true);
```

当用户点击"本地上传"时：

```javascript
localBtn.onclick = function() {
  closeModal();
  currentFileInput.click(); // 触发 input 点击
};
```

**问题**：这个 `click()` 调用又会触发我们的拦截器，导致：
1. 拦截器再次调用 `preventDefault()`
2. 文件选择器无法打开
3. 又弹出选择对话框（如果 `modalOpen` 没有正确重置）

### 示意图

```
用户点击 [本地上传]
    ↓
关闭对话框
    ↓
调用 input.click()
    ↓
触发我们的拦截器 ❌
    ↓
preventDefault() 阻止了文件选择器
    ↓
文件选择器没有打开 ❌
```

## 解决方案

### 添加跳过标记

引入一个 `allowNativeClick` 标记，在需要原生文件选择时临时禁用拦截：

```javascript
let allowNativeClick = false; // 标记是否允许原生文件选择
```

### 修改拦截逻辑

在所有拦截点添加检查：

```javascript
// 1. 全局点击监听
document.addEventListener('click', function(e) {
  // 如果允许原生点击，不拦截
  if (allowNativeClick) {
    return;
  }
  
  // 原有拦截逻辑...
}, true);

// 2. 直接监听
input.addEventListener('click', function(e) {
  // 如果允许原生点击，不拦截
  if (allowNativeClick) {
    return;
  }
  
  handleFileInput(e, input);
}, true);

// 3. 处理函数
function handleFileInput(e, input) {
  // 如果允许原生点击，不拦截
  if (allowNativeClick) {
    return;
  }
  
  // 原有处理逻辑...
}
```

### 本地上传逻辑

修改"本地上传"按钮的处理：

```javascript
localBtn.onclick = function() {
  closeModal();
  
  // 延迟触发，确保模态框完全关闭
  setTimeout(() => {
    if (currentFileInput) {
      console.log('QR Upload: 触发本地文件选择');
      
      // 设置标记，允许原生点击
      allowNativeClick = true;
      
      // 触发原始文件选择
      currentFileInput.click();
      
      // 重置标记（延迟重置，确保点击事件完成）
      setTimeout(() => {
        allowNativeClick = false;
        console.log('QR Upload: 已重置拦截标记');
      }, 100);
    }
  }, 100);
};
```

### 时序图

```
用户点击 [本地上传]
    ↓
关闭对话框
    ↓
延迟 100ms
    ↓
设置 allowNativeClick = true ✓
    ↓
调用 input.click()
    ↓
触发拦截器，但检查到 allowNativeClick = true
    ↓
拦截器跳过，返回 ✓
    ↓
文件选择器正常打开 ✓
    ↓
延迟 100ms 后重置标记
    ↓
allowNativeClick = false
```

## 技术细节

### 为什么需要延迟？

#### 第一个延迟 (100ms)
```javascript
setTimeout(() => {
  // 触发 click
}, 100);
```

**原因**：
- 确保模态框的 DOM 完全移除
- 避免模态框的关闭动画干扰
- 给浏览器时间清理事件队列

#### 第二个延迟 (100ms)
```javascript
setTimeout(() => {
  allowNativeClick = false;
}, 100);
```

**原因**：
- 确保 `input.click()` 事件完全处理完毕
- 避免在事件处理过程中重置标记
- 给捕获和冒泡阶段足够的时间

### 为什么在多个地方检查？

插件有 3 个拦截点：

1. **全局点击监听（捕获阶段）**
   - 最先触发
   - 需要检查标记

2. **input 直接监听（捕获阶段）**
   - 针对特定 input
   - 需要检查标记

3. **handleFileInput 函数**
   - 处理逻辑入口
   - 需要检查标记

如果只在一个地方检查，其他地方可能还会拦截。

## 测试方法

### 手动测试

1. 刷新插件
2. 打开测试页面（如 demo.html）
3. 点击上传按钮
4. 选择"本地上传"
5. ✓ 文件选择器应该正常打开

### Console 日志

打开 Console (F12)，应该看到：

```
QR Upload: 触发本地文件选择
QR Upload: 允许原生文件选择，跳过拦截
QR Upload: 已重置拦截标记
```

### 验证步骤

1. **测试本地上传**
   ```
   点击上传 → 选择"本地上传" → 文件选择器打开 ✓
   ```

2. **测试扫码上传**
   ```
   点击上传 → 选择"扫码上传" → 显示二维码 ✓
   ```

3. **测试连续操作**
   ```
   本地上传 → 取消 → 再次上传 → 扫码上传 ✓
   扫码上传 → 返回 → 本地上传 ✓
   ```

4. **测试标记重置**
   ```
   本地上传 → 等待 > 100ms → 再次上传 → 应该弹出选择框 ✓
   ```

## 影响范围

### 修改的文件
- `content.js` - 核心拦截逻辑

### 受影响的功能
- ✅ 本地上传功能恢复正常
- ✅ 扫码上传不受影响
- ✅ 拦截机制仍然有效

### 不受影响的功能
- ✅ 二维码显示
- ✅ 图片接收
- ✅ 设置页面
- ✅ 弹窗页面

## 代码变更

### 新增变量
```javascript
let allowNativeClick = false; // 标记是否允许原生文件选择
```

### 修改函数
```javascript
// 1. 全局监听器
document.addEventListener('click', function(e) {
  if (allowNativeClick) return; // 新增
  // ...
});

// 2. input 监听器
input.addEventListener('click', function(e) {
  if (allowNativeClick) return; // 新增
  // ...
});

// 3. 处理函数
function handleFileInput(e, input) {
  if (allowNativeClick) return; // 新增
  // ...
}

// 4. 本地上传按钮
localBtn.onclick = function() {
  // 完全重写，添加延迟和标记控制
};
```

## 预防措施

### 未来开发建议

1. **添加单元测试**
   - 测试拦截机制
   - 测试标记状态切换
   - 测试延迟时序

2. **添加更多日志**
   - 记录事件流
   - 记录标记状态
   - 便于调试

3. **考虑更好的方案**
   - 使用事件命名空间
   - 使用自定义事件
   - 改进状态管理

## 版本历史

- **v1.1.0** - 引入问题（新增极简页面时未注意）
- **v1.1.1** - 修复问题（添加标记机制）

## 相关文档

- [更新日志](CHANGELOG.md)
- [调试指南](DEBUG.md)
- [快速开始](QUICKSTART.md)

---

**修复时间**: 2025-10-21  
**版本**: 1.1.1  
**状态**: ✅ 已修复

