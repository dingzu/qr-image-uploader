// Popup script
document.addEventListener('DOMContentLoaded', () => {
  const currentUrlEl = document.getElementById('currentUrl');
  const openOptionsBtn = document.getElementById('openOptions');
  const testConnectionBtn = document.getElementById('testConnection');

  // 加载当前配置的 URL
  chrome.storage.sync.get(['uploadUrl'], (result) => {
    const url = result.uploadUrl || 'https://qr-image-uploader.onrender.com/';
    currentUrlEl.textContent = url;
  });

  // 打开设置页面
  openOptionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 测试连接
  testConnectionBtn.addEventListener('click', async () => {
    const originalText = testConnectionBtn.textContent;
    testConnectionBtn.textContent = '测试中...';
    testConnectionBtn.disabled = true;

    try {
      const result = await chrome.storage.sync.get(['uploadUrl']);
      const url = result.uploadUrl || 'https://qr-image-uploader.onrender.com/';
      
      const response = await fetch(url, { method: 'HEAD' });
      
      if (response.ok) {
        testConnectionBtn.textContent = '✓ 连接成功';
        testConnectionBtn.style.background = '#4caf50';
        testConnectionBtn.style.borderColor = '#4caf50';
      } else {
        testConnectionBtn.textContent = '✗ 连接失败';
        testConnectionBtn.style.background = '#f44336';
        testConnectionBtn.style.borderColor = '#f44336';
      }
    } catch (error) {
      testConnectionBtn.textContent = '✗ 连接失败';
      testConnectionBtn.style.background = '#f44336';
      testConnectionBtn.style.borderColor = '#f44336';
    }

    setTimeout(() => {
      testConnectionBtn.textContent = originalText;
      testConnectionBtn.disabled = false;
      testConnectionBtn.style.background = '';
      testConnectionBtn.style.borderColor = '';
    }, 2000);
  });
});

