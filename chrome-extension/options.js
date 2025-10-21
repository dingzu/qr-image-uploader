// Options page script
document.addEventListener('DOMContentLoaded', () => {
  const uploadUrlInput = document.getElementById('uploadUrl');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const testBtn = document.getElementById('testBtn');
  const successAlert = document.getElementById('successAlert');
  const errorAlert = document.getElementById('errorAlert');

  // 加载保存的设置
  chrome.storage.sync.get(['uploadUrl'], (result) => {
    uploadUrlInput.value = result.uploadUrl || 'https://qr-image-uploader.onrender.com/';
  });

  // 保存设置
  saveBtn.addEventListener('click', () => {
    const url = uploadUrlInput.value.trim();

    // 验证 URL 格式
    if (!url.match(/^https?:\/\/.+/)) {
      showAlert(errorAlert, 'URL 格式不正确，请确保以 http:// 或 https:// 开头');
      return;
    }

    // 确保 URL 以 / 结尾
    const finalUrl = url.endsWith('/') ? url : url + '/';

    chrome.storage.sync.set({ uploadUrl: finalUrl }, () => {
      uploadUrlInput.value = finalUrl;
      showAlert(successAlert, '设置保存成功！');
    });
  });

  // 恢复默认设置
  resetBtn.addEventListener('click', () => {
    if (confirm('确定要恢复默认设置吗？')) {
      const defaultUrl = 'https://qr-image-uploader.onrender.com/';
      chrome.storage.sync.set({ uploadUrl: defaultUrl }, () => {
        uploadUrlInput.value = defaultUrl;
        showAlert(successAlert, '已恢复默认设置');
      });
    }
  });

  // 测试连接
  testBtn.addEventListener('click', async () => {
    const url = uploadUrlInput.value.trim();
    
    if (!url) {
      showAlert(errorAlert, '请先输入 URL');
      return;
    }

    const originalText = testBtn.textContent;
    testBtn.textContent = '测试中...';
    testBtn.disabled = true;

    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'no-cors' // 避免 CORS 问题
      });
      
      // no-cors 模式下无法获取响应状态，但能知道请求是否发送成功
      showAlert(successAlert, '连接测试完成！如果页面可以正常访问，说明配置正确。');
    } catch (error) {
      showAlert(errorAlert, '连接失败: ' + error.message);
    }

    testBtn.textContent = originalText;
    testBtn.disabled = false;
  });

  // 点击示例地址
  document.querySelectorAll('.example-list li').forEach(li => {
    li.addEventListener('click', () => {
      const url = li.getAttribute('data-url');
      uploadUrlInput.value = url;
      uploadUrlInput.focus();
    });
  });

  // 显示提示
  function showAlert(alertEl, message) {
    // 隐藏所有提示
    successAlert.classList.remove('show');
    errorAlert.classList.remove('show');

    // 更新消息
    if (message) {
      alertEl.textContent = message;
    }

    // 显示提示
    alertEl.classList.add('show');

    // 3秒后自动隐藏
    setTimeout(() => {
      alertEl.classList.remove('show');
    }, 3000);
  }

  // Enter 键保存
  uploadUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });
});

