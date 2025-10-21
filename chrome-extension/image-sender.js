// Image Sender - 图片发送到手机功能
(function() {
  'use strict';

  let observerRunning = false;
  let processedImages = new WeakSet(); // 记录已处理的图片

  // 初始化
  function init() {
    console.log('Image Sender: 初始化');
    
    // 处理已存在的图片
    processExistingImages();
    
    // 监听动态添加的图片
    startObserver();
    
    // 监听来自 popup 的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleImageSender') {
        if (request.enabled) {
          startObserver();
        } else {
          stopObserver();
        }
        sendResponse({ success: true });
      }
    });
  }

  // 处理已存在的图片
  function processExistingImages() {
    const images = document.querySelectorAll('img');
    console.log(`Image Sender: 找到 ${images.length} 个图片`);
    images.forEach(img => addImageHover(img));
  }

  // 使用 MutationObserver 监听动态添加的图片
  function startObserver() {
    if (observerRunning) return;
    
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            // 检查节点本身是否是图片
            if (node.tagName === 'IMG') {
              addImageHover(node);
            }
            // 检查子节点中的图片
            const images = node.querySelectorAll('img');
            images.forEach(img => addImageHover(img));
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    observerRunning = true;
    console.log('Image Sender: Observer 已启动');
  }

  function stopObserver() {
    observerRunning = false;
    console.log('Image Sender: Observer 已停止');
  }

  // 为图片添加悬停功能
  function addImageHover(img) {
    // 避免重复处理
    if (processedImages.has(img)) return;
    
    // 跳过太小的图片（可能是图标）
    if (img.width < 50 || img.height < 50) return;
    
    // 标记为已处理
    processedImages.add(img);
    
    console.log('Image Sender: 处理图片', img.src);
    
    // 创建发送按钮
    let sendBtn = null;
    
    // 鼠标进入
    img.addEventListener('mouseenter', function(e) {
      // 如果按钮已存在，不重复创建
      if (sendBtn && sendBtn.parentElement) return;
      
      sendBtn = createSendButton(img);
      
      // 定位按钮
      const rect = img.getBoundingClientRect();
      sendBtn.style.position = 'fixed';
      sendBtn.style.left = rect.left + 10 + 'px';
      sendBtn.style.top = rect.top + 10 + 'px';
      sendBtn.style.zIndex = 999999;
      
      document.body.appendChild(sendBtn);
    });
    
    // 鼠标离开（延迟移除，避免移动到按钮时消失）
    img.addEventListener('mouseleave', function(e) {
      setTimeout(() => {
        if (sendBtn && sendBtn.parentElement && !sendBtn.matches(':hover')) {
          sendBtn.remove();
        }
      }, 200);
    });
  }

  // 创建发送按钮
  function createSendButton(img) {
    const btn = document.createElement('button');
    btn.className = 'qr-image-sender-btn';
    btn.innerHTML = '📱 发送到手机';
    
    // 样式
    btn.style.cssText = `
      padding: 8px 16px;
      background: rgba(0, 0, 0, 0.85);
      border: 1px solid #fff;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      transition: all 0.2s;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      white-space: nowrap;
      backdrop-filter: blur(10px);
    `;
    
    // hover 效果
    btn.addEventListener('mouseenter', function() {
      btn.style.background = 'rgba(0, 0, 0, 0.95)';
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
    });
    
    btn.addEventListener('mouseleave', function() {
      btn.style.background = 'rgba(0, 0, 0, 0.85)';
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    });
    
    // 点击事件
    btn.addEventListener('click', async function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('Image Sender: 点击发送按钮', img.src);
      
      // 获取图片数据（不压缩）
      try {
        const imageData = await getImageData(img);
        showQRModal(imageData, img.src);
      } catch (error) {
        console.error('Image Sender: 获取图片失败', error);
        alert('获取图片失败: ' + error.message);
      }
      
      // 移除按钮
      btn.remove();
    });
    
    // 鼠标离开按钮时移除
    btn.addEventListener('mouseleave', function() {
      setTimeout(() => {
        if (!btn.matches(':hover')) {
          btn.remove();
        }
      }, 200);
    });
    
    return btn;
  }

  // 获取图片数据（不压缩）
  async function getImageData(img) {
    return new Promise((resolve, reject) => {
      // 方法 1: 如果是 data URL，直接返回
      if (img.src.startsWith('data:')) {
        console.log('Image Sender: 使用 data URL');
        resolve(img.src);
        return;
      }
      
      // 方法 2: 尝试使用 fetch 获取（支持跨域）
      console.log('Image Sender: 尝试 fetch 获取图片');
      fetch(img.src, {
        mode: 'cors',
        credentials: 'omit'
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Fetch failed: ' + response.status);
          }
          return response.blob();
        })
        .then(blob => {
          console.log('Image Sender: Fetch 成功，转换为 data URL');
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
        .catch(fetchError => {
          console.log('Image Sender: Fetch 失败，尝试 Canvas', fetchError);
          
          // 方法 3: 尝试 Canvas（仅同源）
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            
            // 尝试导出 - 如果是跨域图片会失败
            canvas.toBlob(blob => {
              if (blob) {
                console.log('Image Sender: Canvas 成功');
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              } else {
                // Canvas 污染，直接使用 URL
                console.log('Image Sender: Canvas 污染，使用原始 URL');
                resolve(img.src);
              }
            }, 'image/png', 1.0);
          } catch (canvasError) {
            // 方法 4: Canvas 也失败，直接返回 URL
            console.log('Image Sender: Canvas 失败，使用原始 URL', canvasError);
            resolve(img.src);
          }
        });
    });
  }

  // 显示二维码模态框
  function showQRModal(imageData, imageSrc) {
    // 检查是否已存在模态框
    if (document.getElementById('qr-image-sender-modal')) {
      return;
    }
    
    // 创建模态框
    const modal = document.createElement('div');
    modal.id = 'qr-image-sender-modal';
    modal.innerHTML = `
      <div class="qr-image-sender-overlay">
        <div class="qr-image-sender-modal-content">
          <button class="qr-image-sender-close" title="关闭">✕</button>
          <h2 class="qr-image-sender-title">📱 扫码获取图片</h2>
          <p class="qr-image-sender-subtitle">使用手机扫描下方二维码</p>
          
          <div class="qr-image-sender-preview">
            <img src="${imageSrc}" alt="预览" onerror="this.style.display='none'">
          </div>
          
          <div class="qr-image-sender-qr-wrapper">
            <div id="qr-image-sender-qrcode"></div>
          </div>
          
          <div class="qr-image-sender-status waiting">
            <span class="qr-image-sender-loading"></span>
            <span>正在生成二维码...</span>
          </div>
          
          <div class="qr-image-sender-hint">
            扫码后图片会自动下载到手机
          </div>
        </div>
      </div>
    `;
    
    // 添加样式
    addModalStyles();
    
    document.body.appendChild(modal);
    
    // 绑定关闭事件
    const closeBtn = modal.querySelector('.qr-image-sender-close');
    const overlay = modal.querySelector('.qr-image-sender-overlay');
    
    closeBtn.onclick = () => modal.remove();
    overlay.onclick = (e) => {
      if (e.target === overlay) modal.remove();
    };
    
    // ESC 键关闭
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
    
    // 生成二维码
    generateQRForImage(imageData);
  }

  // 生成二维码
  async function generateQRForImage(imageData) {
    try {
      // 创建下载页面的 HTML
      const downloadPage = createDownloadPage(imageData);
      const htmlBlob = new Blob([downloadPage], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(htmlBlob);
      
      // 等待 QRCode 库加载
      await ensureQRCodeLoaded();
      
      // 生成二维码（使用 blob URL）
      const qrcodeContainer = document.getElementById('qr-image-sender-qrcode');
      if (qrcodeContainer && window.QRCode) {
        new QRCode(qrcodeContainer, {
          text: blobUrl,
          width: 200,
          height: 200,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H
        });
        
        // 更新状态
        const statusEl = document.querySelector('.qr-image-sender-status');
        if (statusEl) {
          statusEl.className = 'qr-image-sender-status success';
          statusEl.innerHTML = '<span>✓</span><span>扫码即可获取图片</span>';
        }
        
        // 添加提示信息
        const modal = document.getElementById('qr-image-sender-modal');
        if (modal) {
          const hint = modal.querySelector('.qr-image-sender-hint');
          if (hint) {
            hint.innerHTML = '扫码后图片会自动下载到手机<br><small style="color: #ccc; font-size: 11px;">二维码有效期：本次会话</small>';
          }
        }
      } else {
        // 备用方案：提供下载链接
        console.error('QRCode 库未加载');
        const statusEl = document.querySelector('.qr-image-sender-status');
        if (statusEl) {
          statusEl.className = 'qr-image-sender-status success';
          statusEl.innerHTML = `<a href="${blobUrl}" target="_blank" style="color: #2196f3; text-decoration: none;">点击打开下载页面</a>`;
        }
      }
    } catch (error) {
      console.error('Image Sender: 生成二维码失败', error);
      const statusEl = document.querySelector('.qr-image-sender-status');
      if (statusEl) {
        statusEl.className = 'qr-image-sender-status error';
        statusEl.innerHTML = '<span>✗</span><span>生成失败，请重试</span>';
      }
    }
  }
  
  // 确保 QRCode 库已加载
  function ensureQRCodeLoaded() {
    return new Promise((resolve, reject) => {
      if (window.QRCode) {
        resolve();
        return;
      }
      
      // 检查是否已经有加载中的脚本
      const existingScript = document.querySelector('script[src*="qrcode"]');
      if (existingScript) {
        // 等待现有脚本加载
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('QRCode 库加载失败')));
        return;
      }
      
      // 加载 QRCode 库
      console.log('Image Sender: 加载 QRCode 库');
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
      script.onload = () => {
        console.log('Image Sender: QRCode 库加载成功');
        resolve();
      };
      script.onerror = () => {
        console.error('Image Sender: QRCode 库加载失败');
        reject(new Error('QRCode 库加载失败'));
      };
      document.head.appendChild(script);
      
      // 设置超时
      setTimeout(() => {
        if (!window.QRCode) {
          reject(new Error('QRCode 库加载超时'));
        }
      }, 10000);
    });
  }
  
  // 创建下载页面
  function createDownloadPage(imageData) {
    const filename = 'image-' + Date.now() + '.png';
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>下载图片</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 30px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 90%;
      text-align: center;
    }
    h1 {
      font-size: 24px;
      color: #000;
      margin-bottom: 20px;
    }
    img {
      max-width: 100%;
      max-height: 60vh;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      margin-bottom: 20px;
      display: block;
      margin-left: auto;
      margin-right: auto;
    }
    .download-btn {
      display: inline-block;
      padding: 14px 32px;
      background: #000;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .download-btn:hover {
      background: #333;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0,0,0,0.3);
    }
    .download-btn:active {
      transform: translateY(0);
    }
    .status {
      margin-top: 15px;
      padding: 10px;
      background: #e8f5e9;
      color: #2e7d32;
      border-radius: 6px;
      font-size: 14px;
      display: none;
    }
    .status.show {
      display: block;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📥 下载图片</h1>
    <img src="${imageData}" alt="图片" id="image">
    <a href="${imageData}" download="${filename}" class="download-btn" id="downloadBtn">
      下载图片
    </a>
    <div class="status" id="status"></div>
  </div>
  
  <script>
    // 自动触发下载
    const downloadBtn = document.getElementById('downloadBtn');
    const status = document.getElementById('status');
    const image = document.getElementById('image');
    
    // 等待图片加载完成
    image.onload = function() {
      // 自动点击下载（延迟以确保页面加载完成）
      setTimeout(() => {
        downloadBtn.click();
        status.textContent = '✓ 已开始下载';
        status.classList.add('show');
      }, 500);
    };
    
    // 手动点击
    downloadBtn.addEventListener('click', function() {
      status.textContent = '✓ 已开始下载';
      status.classList.add('show');
    });
    
    // 长按保存提示
    let pressTimer;
    image.addEventListener('touchstart', function() {
      pressTimer = setTimeout(() => {
        status.textContent = 'ℹ️ 长按图片可以保存到相册';
        status.classList.add('show');
        status.style.background = '#e3f2fd';
        status.style.color = '#1565c0';
      }, 500);
    });
    
    image.addEventListener('touchend', function() {
      clearTimeout(pressTimer);
    });
  </script>
</body>
</html>`;
  }

  // 生成唯一 ID
  function generateImageId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  // 添加模态框样式
  function addModalStyles() {
    if (document.getElementById('qr-image-sender-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'qr-image-sender-styles';
    style.textContent = `
      #qr-image-sender-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
      }
      
      .qr-image-sender-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.75);
        display: flex;
        justify-content: center;
        align-items: center;
        animation: qr-sender-fade-in 0.2s ease-out;
      }
      
      @keyframes qr-sender-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .qr-image-sender-modal-content {
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 450px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: qr-sender-slide-up 0.3s ease-out;
      }
      
      @keyframes qr-sender-slide-up {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .qr-image-sender-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: transparent;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s;
      }
      
      .qr-image-sender-close:hover {
        background: #f0f0f0;
        color: #000;
      }
      
      .qr-image-sender-title {
        color: #000;
        font-size: 22px;
        font-weight: 600;
        margin: 0 0 8px 0;
        text-align: center;
      }
      
      .qr-image-sender-subtitle {
        color: #666;
        font-size: 14px;
        margin: 0 0 20px 0;
        text-align: center;
      }
      
      .qr-image-sender-preview {
        margin-bottom: 20px;
        text-align: center;
      }
      
      .qr-image-sender-preview img {
        max-width: 100%;
        max-height: 200px;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
      }
      
      .qr-image-sender-qr-wrapper {
        background: white;
        padding: 20px;
        border-radius: 12px;
        border: 1px solid #e0e0e0;
        margin-bottom: 16px;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 240px;
      }
      
      #qr-image-sender-qrcode {
        display: inline-block;
      }
      
      #qr-image-sender-qrcode img {
        display: block;
        border-radius: 4px;
      }
      
      .qr-image-sender-status {
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        margin-bottom: 12px;
        text-align: center;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      
      .qr-image-sender-status.waiting {
        background: #fff9e6;
        color: #856404;
        border: 1px solid #ffc107;
      }
      
      .qr-image-sender-status.success {
        background: #e8f5e9;
        color: #155724;
        border: 1px solid #28a745;
      }
      
      .qr-image-sender-status.error {
        background: #ffebee;
        color: #c62828;
        border: 1px solid #f44336;
      }
      
      .qr-image-sender-loading {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #ffc107;
        border-radius: 50%;
        animation: qr-sender-spin 1s linear infinite;
      }
      
      @keyframes qr-sender-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .qr-image-sender-hint {
        text-align: center;
        color: #999;
        font-size: 12px;
      }
      
      @media (max-width: 600px) {
        .qr-image-sender-modal-content {
          padding: 24px;
          width: 95%;
        }
        
        .qr-image-sender-title {
          font-size: 20px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

