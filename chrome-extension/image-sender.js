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
    
    // 添加忽略标记，防止触发文件上传拦截
    btn.setAttribute('data-qr-upload-ignore', 'true');
    
    // 样式
    btn.style.cssText = `
      padding: 8px 16px;
      background: rgba(0, 0, 0, 0.85);
      border: 2px solid #fff;
      color: white;
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
      e.stopImmediatePropagation(); // 阻止其他监听器
      
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
    // 添加忽略标记，防止触发文件上传拦截
    modal.setAttribute('data-qr-upload-ignore', 'true');
    
    modal.innerHTML = `
      <div class="qr-image-sender-overlay" data-qr-upload-ignore="true">
        <div class="qr-image-sender-modal-content" data-qr-upload-ignore="true">
          <button class="qr-image-sender-close" data-qr-upload-ignore="true" title="关闭">✕</button>
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
          
          <div class="qr-image-sender-progress-container" style="display: none;">
            <div class="qr-image-sender-progress-bar">
              <div class="qr-image-sender-progress-fill"></div>
            </div>
            <div class="qr-image-sender-progress-text">传输中... 0%</div>
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
    const statusEl = document.querySelector('.qr-image-sender-status');
    
    try {
      console.log('Image Sender: 开始生成二维码流程');
      console.log('Image Sender: 图片数据大小:', Math.round(imageData.length / 1024), 'KB');
      
      // 更新状态：获取服务器地址
      if (statusEl) {
        statusEl.className = 'qr-image-sender-status waiting';
        statusEl.innerHTML = '<span class="qr-image-sender-loading"></span><span>获取服务器配置...</span>';
      }
      
      // 获取配置的上传 URL
      const result = await chrome.storage.sync.get(['uploadUrl']);
      let uploadUrl = result.uploadUrl || 'https://qr-image-uploader.onrender.com/';
      
      // 确保 URL 以 / 结尾
      if (!uploadUrl.endsWith('/')) {
        uploadUrl += '/';
      }
      
      console.log('Image Sender: 使用服务器地址:', uploadUrl);
      
      // 生成房间 ID
      const roomId = generateRoomId();
      console.log('Image Sender: 生成房间 ID:', roomId);
      
      // 更新状态：生成二维码
      if (statusEl) {
        statusEl.innerHTML = '<span class="qr-image-sender-loading"></span><span>生成二维码...</span>';
      }
      
      // QRCode 库已通过 manifest.json 注入，直接使用
      if (!window.QRCode) {
        throw new Error('QRCode 库未加载');
      }
      
      // 生成接收页面的 URL
      const receiveUrl = `${uploadUrl}receive/${roomId}`;
      console.log('Image Sender: 接收页面 URL:', receiveUrl);
      
      // 生成二维码
      const qrcodeContainer = document.getElementById('qr-image-sender-qrcode');
      if (qrcodeContainer && window.QRCode) {
        console.log('Image Sender: 开始生成二维码');
        
        // 清空容器
        qrcodeContainer.innerHTML = '';
        
        try {
          new QRCode(qrcodeContainer, {
            text: receiveUrl,
            width: 200,
            height: 200,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
          });
          console.log('Image Sender: 二维码生成完成');
        } catch (qrError) {
          console.error('Image Sender: QRCode 生成失败', qrError);
          throw qrError;
        }
        
        // 更新状态：等待扫码（不立即连接服务器）
        if (statusEl) {
          statusEl.className = 'qr-image-sender-status success';
          statusEl.innerHTML = '<span>✓</span><span>使用 KIM 扫码</span>';
        }
        
        // 等待手机扫码后再连接并发送图片
        console.log('Image Sender: 等待手机扫码...');
        await waitForPhoneAndSendImage(uploadUrl, roomId, imageData, statusEl);
        
        // 添加提示信息
        const modal = document.getElementById('qr-image-sender-modal');
        if (modal) {
          const hint = modal.querySelector('.qr-image-sender-hint');
          if (hint) {
            hint.innerHTML = '扫码后图片会自动发送到手机<br><small style="color: #ccc; font-size: 11px;">使用 Socket.IO 实时传输</small>';
          }
        }
        
        console.log('Image Sender: 二维码流程完成');
      } else {
        throw new Error('QRCode 库不可用');
      }
    } catch (error) {
      console.error('Image Sender: 生成二维码失败', error);
      if (statusEl) {
        statusEl.className = 'qr-image-sender-status error';
        statusEl.innerHTML = `<span>✗</span><span>生成失败: ${error.message}</span>`;
      }
    }
  }
  
  // 生成随机房间 ID
  function generateRoomId() {
    return 'IMG_' + Math.random().toString(36).substring(2, 10).toUpperCase();
  }
  
  // 等待手机扫码后连接并发送图片
  async function waitForPhoneAndSendImage(serverUrl, roomId, imageData, statusEl) {
    return new Promise((resolve, reject) => {
      console.log('Image Sender: 先连接服务器，等待手机扫码');
      
      if (!window.io) {
        reject(new Error('Socket.IO 库未加载'));
        return;
      }
      
      // 连接到服务器（仅用于监听手机扫码）
      const socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnection: false  // 禁用自动重连
      });
      
      let phoneJoined = false;
      
      socket.on('connect', () => {
        console.log('Image Sender: 已连接，Socket ID:', socket.id);
        // 加入房间，等待手机扫码通知
        socket.emit('join-sender-room', roomId);
        console.log('Image Sender: 监听房间:', roomId, '等待手机加入...');
      });
      
      // 监听手机加入房间
      socket.on('phone-joined-room', () => {
        if (phoneJoined) {
          console.log('Image Sender: 重复的 phone-joined-room 事件，忽略');
          return;
        }
        phoneJoined = true;
        
        console.log('Image Sender: ✓ 手机已扫码！Socket ID:', socket.id);
        console.log('Image Sender: 开始发送图片到房间:', roomId);
        
        // 更新状态
        if (statusEl) {
          statusEl.className = 'qr-image-sender-status waiting';
          statusEl.innerHTML = '<span class="qr-image-sender-loading"></span><span>手机已连接，正在发送...</span>';
        }
        
        // 显示进度条
        const progressContainer = document.querySelector('.qr-image-sender-progress-container');
        if (progressContainer) {
          progressContainer.style.display = 'block';
        }
        
        // 发送图片
        console.log('Image Sender: → 发送 send-image-to-phone 事件，图片大小:', Math.round(imageData.length / 1024), 'KB');
        socket.emit('send-image-to-phone', {
          roomId: roomId,
          imageData: imageData
        });
        console.log('Image Sender: send-image-to-phone 事件已发送');
      });
      
      // 监听发送成功
      socket.on('image-send-success', () => {
        console.log('Image Sender: ✓ 服务器确认图片已接收并存储');
        if (statusEl) {
          statusEl.className = 'qr-image-sender-status success';
          statusEl.innerHTML = '<span>✓</span><span>等待手机接收...</span>';
        }
      });
      
      // 监听进度更新
      socket.on('sender-progress-update', (data) => {
        console.log('Image Sender: 接收端进度:', data.progress + '%');
        
        const progressFill = document.querySelector('.qr-image-sender-progress-fill');
        const progressText = document.querySelector('.qr-image-sender-progress-text');
        
        if (progressFill && progressText) {
          progressFill.style.width = data.progress + '%';
          progressText.textContent = `传输中... ${data.progress}%`;
        }
      });
      
      // 监听传输完成
      socket.on('image-received-by-phone', () => {
        console.log('Image Sender: 手机已收到图片');
        
        if (statusEl) {
          statusEl.className = 'qr-image-sender-status success';
          statusEl.innerHTML = '<span>✓</span><span>图片已发送到手机！</span>';
        }
        
        const progressFill = document.querySelector('.qr-image-sender-progress-fill');
        const progressText = document.querySelector('.qr-image-sender-progress-text');
        
        if (progressFill && progressText) {
          progressFill.style.width = '100%';
          progressText.textContent = '传输完成！';
        }
        
        setTimeout(() => {
          socket.disconnect();
          resolve();
        }, 2000);
      });
      
      socket.on('disconnect', (reason) => {
        console.warn('Image Sender: 连接断开，原因:', reason);
      });
      
      socket.on('connect_error', (error) => {
        console.error('Image Sender: 连接错误', error);
        reject(error);
      });
    });
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
      
      .qr-image-sender-progress-container {
        margin-bottom: 12px;
      }
      
      .qr-image-sender-progress-bar {
        width: 100%;
        height: 8px;
        background: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 8px;
      }
      
      .qr-image-sender-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4CAF50, #45a049);
        border-radius: 4px;
        width: 0%;
        transition: width 0.3s ease;
      }
      
      .qr-image-sender-progress-text {
        text-align: center;
        color: #666;
        font-size: 13px;
        font-weight: 500;
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

