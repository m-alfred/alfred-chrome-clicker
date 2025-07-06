// 自动点击器 content.js
// 脚本注入方法参考：https://stackoverflow.com/questions/9515704/access-variables-and-functions-defined-in-page-context-from-an-extension/9517879#9517879
(function () {
  console.log('content.js 已加载');

  console.log('当前页面url:', location.href);
  console.log('是否顶层:', window.top === window.self ? '是' : '否');

  function injectJs(src) {
    console.log('injectJs 执行');
    const jsPath = src || 'inject.js';
    const tempScript = document.createElement('script');
    console.log('injectJs src:', chrome.runtime.getURL(jsPath));
    tempScript.src = chrome.runtime.getURL(jsPath);
    tempScript.onload = () => {
      console.log('injectJs 加载完成, 移除');
      // tempScript.remove();
    };
    (document.head || document.documentElement).appendChild(tempScript);
  }
  // 注入js
  injectJs('inject.js');

  // 只在iframe内部页面执行自动点击canvas逻辑
  console.log('[content] window.self !== window.top:', window.self !== window.top, window.self, window.top);
  if (window.self !== window.top) {
    function simulateRealPointerClick(x, y) {
      const canvas = document.querySelector('canvas');
      console.log('[iframe simulateRealPointerClick] canvas:', canvas);
      if (!canvas) {
        console.log('[iframe simulateRealPointerClick] 没找到canvas');
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const clientX = rect.left + x;
      const clientY = rect.top + y;
      const eventOpts = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX,
        clientY,
        screenX: window.screenX + clientX,
        screenY: window.screenY + clientY,
        pageX: window.scrollX + clientX,
        pageY: window.scrollY + clientY,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0
      };
      ['pointerdown', 'mousedown', 'mouseup', 'pointerup', 'click'].forEach(type => {
        const evt = new PointerEvent(type, eventOpts);
        canvas.dispatchEvent(evt);
      });
    }

    // 也可暴露到window供popup调用
    window.simulateRealPointerClick = simulateRealPointerClick;
    console.log('[content] simulateRealPointerClick 已暴露到window');
  }

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
  // 防止重复定时点击
  let timerClickTimerId = null;
  function startTimerClick(x, y, interval, count) {
    // 如果已有任务，先取消
    if (timerClickTimerId) {
      clearTimeout(timerClickTimerId);
      timerClickTimerId = null;
      console.log('[content] 已有定时点击任务，已中断旧任务');
    }
    let i = 0;
    function doClick() {
      if (i >= count) {
        console.log('[content] 定时点击完成');
        timerClickTimerId = null;
        return;
      }
      console.log(`[content] timer_click 第${i + 1}次: (${x},${y})`);
      simulateRealPointerClick(x, y);
      i++;
      timerClickTimerId = setTimeout(doClick, interval);
    }
    doClick();
  }
})();
