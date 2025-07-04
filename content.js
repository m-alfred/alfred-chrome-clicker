// 自动点击器 content.js
(function () {
  function simulateClick(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const clientX = rect.left + Math.min(x - rect.left, rect.width - 1);
    const clientY = rect.top + Math.min(y - rect.top, rect.height - 1);
    const evtOpts = { bubbles: true, cancelable: true, view: window, clientX, clientY };
    el.dispatchEvent(new MouseEvent('mousedown', evtOpts));
    el.dispatchEvent(new MouseEvent('mouseup', evtOpts));
    el.dispatchEvent(new MouseEvent('click', evtOpts));
  }
  // 自动点击
  chrome.storage.sync.get(['clickX', 'clickY'], ({ clickX, clickY }) => {
    console.log('[content] 读取到已保存坐标:', clickX, clickY);
    if (typeof clickX === 'number' && typeof clickY === 'number') {
      setTimeout(() => {
        console.log('[content] 延迟触发自动点击:', clickX, clickY);
        simulateClick(clickX, clickY);
      }, 800); // 页面加载后延迟点击
    }
  });

  // 选点模式
  function enablePickPointMode() {
    console.log('[content] 进入enablePickPointMode');
    // 创建遮罩
    const mask = document.createElement('div');
    mask.style.position = 'fixed';
    mask.style.left = 0;
    mask.style.top = 0;
    mask.style.width = '100vw';
    mask.style.height = '100vh';
    mask.style.background = 'rgba(0,0,0,0.12)';
    mask.style.zIndex = 999999;
    mask.style.cursor = 'crosshair';
    mask.style.userSelect = 'none';
    document.body.appendChild(mask);
    function onClick(e) {
      e.preventDefault();
      e.stopPropagation();
      const x = e.clientX;
      const y = e.clientY;
      console.log('[content] 选点点击，坐标:', x, y);
      chrome.runtime.sendMessage({ action: 'picked_point', x, y }, (res) => {
        console.log('[content] picked_point已发送至background，返回：', res);
      });
      mask.remove();
      window.removeEventListener('click', onClick, true);
    }
    window.addEventListener('click', onClick, true);
  }
  // 监听popup发来的选点请求
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('[content] 收到消息:', msg);
    if (msg.action === 'pick_point') {
      console.log('[content] 激活选点模式');
      enablePickPointMode();
    }
    if (msg.action === 'timer_click') {
      console.log('[content] 收到timer_click:', msg);
      startTimerClick(msg.x, msg.y, msg.interval, msg.count);
    }
  });

  // 定时多次点击
  function startTimerClick(x, y, interval, count) {
    let i = 0;
    function doClick() {
      if (i >= count) {
        console.log('[content] 定时点击完成');
        return;
      }
      console.log(`[content] timer_click 第${i+1}次: (${x},${y})`);
      simulateClick(x, y);
      i++;
      setTimeout(doClick, interval);
    }
    doClick();
  }
})();
