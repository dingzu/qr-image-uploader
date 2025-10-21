// Content script - 拦截文件选择操作
(function() {
  'use strict';

  let modalOpen = false;
  let currentFileInput = null;
  let allowNativeClick = false; // 标记是否允许原生文件选择

  // 监听所有 input[type=file] 的点击
  document.addEventListener('click', function(e) {
    const target = e.target;
    
    // 如果允许原生点击，不拦截
    if (allowNativeClick) {
      return;
    }
    
    // 如果元素有忽略标记,不处理
    if (target.closest('[data-qr-upload-ignore]')) {
      return;
    }
    
    // 检查是否是文件输入框
    if (target.tagName === 'INPUT' && target.type === 'file') {
      handleFileInput(e, target);
      return;
    }
    
    // 检查点击的元素是否包含隐藏的 file input（常见于 Vue/React 组件）
    const nearbyFileInput = target.querySelector('input[type="file"]') || 
                            target.parentElement?.querySelector('input[type="file"]');
    
    if (nearbyFileInput) {
      // 如果找到了文件输入框，拦截并处理
      handleFileInput(e, nearbyFileInput);
    }
  }, true); // 使用捕获阶段
  
  // 额外监听：直接在 input 元素上的事件
  document.addEventListener('change', function(e) {
    const target = e.target;
    if (target.tagName === 'INPUT' && target.type === 'file' && target.files.length === 0) {
      // 如果 change 事件触发但没有文件，可能是被拦截了
      // 这是一个后备检查
      console.log('QR Upload: 检测到文件输入框 change 事件');
    }
  }, true);

  // 拦截 focus 事件（某些框架可能通过 focus 触发文件选择）
  document.addEventListener('focus', function(e) {
    const target = e.target;
    if (target.tagName === 'INPUT' && target.type === 'file') {
      console.log('QR Upload: 文件输入框获得焦点', target);
    }
  }, true);

  // 使用 MutationObserver 监听动态添加的 file input
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType === 1) { // 元素节点
          // 检查新添加的节点是否是 file input
          if (node.tagName === 'INPUT' && node.type === 'file') {
            console.log('QR Upload: 检测到新添加的文件输入框', node);
            attachInputListener(node);
          }
          // 检查新添加节点的子元素
          const fileInputs = node.querySelectorAll('input[type="file"]');
          fileInputs.forEach(input => {
            console.log('QR Upload: 检测到子元素中的文件输入框', input);
            attachInputListener(input);
          });
        }
      });
    });
  });

  // 为已存在的 file input 添加监听
  function attachInputListener(input) {
    // 避免重复添加
    if (input.dataset.qrUploadAttached) return;
    input.dataset.qrUploadAttached = 'true';
    
    input.addEventListener('click', function(e) {
      console.log('QR Upload: input 直接点击事件', input);
      // 如果允许原生点击，不拦截
      if (allowNativeClick) {
        console.log('QR Upload: 允许原生文件选择');
        return;
      }
      handleFileInput(e, input);
    }, true);
  }

  // 为页面上已存在的所有 file input 添加监听
  document.querySelectorAll('input[type="file"]').forEach(attachInputListener);

  // 开始观察 DOM 变化
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 页面加载完成后再次检查
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('input[type="file"]').forEach(attachInputListener);
    });
  }

  function handleFileInput(e, input) {
    // 如果允许原生点击，不拦截
    if (allowNativeClick) {
      console.log('QR Upload: 允许原生文件选择，跳过拦截');
      return;
    }
    
    // 检查是否接受图片
    const accept = input.accept || '';
    
    // 如果没有 accept 限制，或者是通配符，都处理
    if (accept === '' || accept === '*/*') {
      e.preventDefault();
      e.stopPropagation();
      currentFileInput = input;
      showQRModal();
      return;
    }
    
    // 检查是否包含图片类型
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico'];
    const imageMimeTypes = ['image/'];
    
    const acceptLower = accept.toLowerCase();
    const isImageUpload = imageExtensions.some(ext => acceptLower.includes(ext)) ||
                          imageMimeTypes.some(mime => acceptLower.includes(mime));
    
    if (isImageUpload) {
      e.preventDefault();
      e.stopPropagation();
      currentFileInput = input;
      showQRModal();
    }
    // 如果不是图片上传，不处理，让原生行为继续
  }

  function showQRModal() {
    if (modalOpen) return;
    modalOpen = true;

    // 创建模态框
    const modal = document.createElement('div');
    modal.id = 'qr-upload-modal';
    modal.innerHTML = `
      <div class="qr-upload-overlay">
        <div class="qr-upload-modal-content">
          <button class="qr-upload-close" title="关闭">✕</button>
          <h2 class="qr-upload-title">📱 选择上传方式</h2>
          
          <div class="qr-upload-options">
            <div class="qr-upload-option" id="qr-upload-scan">
              <div class="qr-upload-icon">📱</div>
              <div class="qr-upload-text">
                <h3>扫码上传</h3>
                <p>使用手机扫码上传图片</p>
              </div>
            </div>
            
            <div class="qr-upload-option" id="qr-upload-local">
              <div class="qr-upload-icon">💻</div>
              <div class="qr-upload-text">
                <h3>本地上传</h3>
                <p>从电脑选择文件</p>
              </div>
            </div>
          </div>

          <div class="qr-upload-qr-section" id="qr-upload-qr-section" style="display: none;">
            <div class="qr-upload-back" id="qr-upload-back">← 返回</div>
            <iframe id="qr-upload-iframe" style="width: 100%; height: 500px; border: none; background: white;"></iframe>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 绑定事件
    const closeBtn = modal.querySelector('.qr-upload-close');
    const overlay = modal.querySelector('.qr-upload-overlay');
    const scanBtn = modal.querySelector('#qr-upload-scan');
    const localBtn = modal.querySelector('#qr-upload-local');
    const qrSection = modal.querySelector('#qr-upload-qr-section');
    const optionsSection = modal.querySelector('.qr-upload-options');
    const backBtn = modal.querySelector('#qr-upload-back');
    const iframe = modal.querySelector('#qr-upload-iframe');

    closeBtn.onclick = closeModal;
    overlay.onclick = function(e) {
      if (e.target === overlay) closeModal();
    };

    // 扫码上传
    scanBtn.onclick = async function() {
      optionsSection.style.display = 'none';
      qrSection.style.display = 'block';
      
      // 获取配置的 URL
      const result = await chrome.storage.sync.get(['uploadUrl']);
      let uploadUrl = result.uploadUrl || 'https://qr-image-uploader.onrender.com/';
      
      // 确保 URL 以 / 结尾
      if (!uploadUrl.endsWith('/')) {
        uploadUrl += '/';
      }
      
      // 使用专门的插件页面（更简洁）
      iframe.src = uploadUrl + 'plugin.html';

      // 监听来自 iframe 的消息
      window.addEventListener('message', handleIframeMessage);
    };

    // 本地上传
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

    // 返回按钮
    backBtn.onclick = function() {
      qrSection.style.display = 'none';
      optionsSection.style.display = 'flex';
      window.removeEventListener('message', handleIframeMessage);
    };

    function handleIframeMessage(event) {
      // 检查消息来源
      if (event.data && event.data.type === 'qr-upload-image') {
        const imageData = event.data.imageData;
        
        // 将 base64 转换为 File 对象
        fetch(imageData)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'uploaded-image.jpg', { type: 'image/jpeg' });
            
            // 创建 DataTransfer 对象来设置文件
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            if (currentFileInput) {
              currentFileInput.files = dataTransfer.files;
              
              // 触发 change 事件
              const changeEvent = new Event('change', { bubbles: true });
              currentFileInput.dispatchEvent(changeEvent);
              
              // 触发 input 事件
              const inputEvent = new Event('input', { bubbles: true });
              currentFileInput.dispatchEvent(inputEvent);
            }
            
            closeModal();
          })
          .catch(err => {
            console.error('处理图片失败:', err);
          });
      }
    }

    function closeModal() {
      modalOpen = false;
      currentFileInput = null;
      window.removeEventListener('message', handleIframeMessage);
      modal.remove();
    }

    // ESC 键关闭
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape' && modalOpen) {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    });
  }

  // 监听来自背景脚本的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkFileInput') {
      sendResponse({ hasFileInput: document.querySelectorAll('input[type=file]').length > 0 });
    }
  });

})();

