// Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('扫码上传图片助手已安装');
  
  // 设置默认配置
  chrome.storage.sync.get(['uploadUrl'], (result) => {
    if (!result.uploadUrl) {
      chrome.storage.sync.set({
        uploadUrl: 'https://qr-image-uploader.onrender.com/'
      });
    }
  });
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getUploadUrl') {
    chrome.storage.sync.get(['uploadUrl'], (result) => {
      sendResponse({ uploadUrl: result.uploadUrl || 'https://qr-image-uploader.onrender.com/' });
    });
    return true; // 保持消息通道开启
  }
});

// 点击插件图标
chrome.action.onClicked.addListener((tab) => {
  // 检查当前页面是否有文件输入框
  chrome.tabs.sendMessage(tab.id, { action: 'checkFileInput' }, (response) => {
    if (response && response.hasFileInput) {
      // 有文件输入框，显示提示
      chrome.action.setBadgeText({ text: '✓', tabId: tab.id });
      setTimeout(() => {
        chrome.action.setBadgeText({ text: '', tabId: tab.id });
      }, 2000);
    }
  });
});

