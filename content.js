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

  // 只在目标 frame 响应点击
  function simulateViewportClick(x, y) {
    if (window.self === window.top) {
      // 顶层页面，判断目标点是否在某个iframe内
      const iframes = Array.from(document.getElementsByTagName('iframe'));
      for (const iframe of iframes) {
        const rect = iframe.getBoundingClientRect();
        if (
          x >= rect.left && x <= rect.right &&
          y >= rect.top && y <= rect.bottom
        ) {
          // 点在iframe内，只通知iframe
          const innerX = x - rect.left;
          const innerY = y - rect.top;
          iframe.contentWindow.postMessage({
            action: 'simulateViewportClick',
            x: innerX,
            y: innerY
          }, '*');
          return;
        }
      }
      // 不在任何iframe内，直接在top页面执行
      _simulateViewportClickOnThisWindow(x, y);
    }
    // 非顶层页面不主动响应
  }

  function _simulateViewportClickOnThisWindow(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) {
      console.log('[simulateViewportClick] 没找到目标元素');
      return;
    }
    if (el.tagName.toLowerCase() === 'canvas') {
      // 计算canvas缩放，换算canvas内部坐标
      const rect = el.getBoundingClientRect();
      const scaleX = el.width / rect.width;
      const scaleY = el.height / rect.height;
      const canvasX = (x - rect.left) * scaleX;
      const canvasY = (y - rect.top) * scaleY;
      const eventOpts = {
        bubbles: true,
        cancelable: true,
        composed: true,
        clientX: x,
        clientY: y,
        screenX: window.screenX + x,
        screenY: window.screenY + y,
        pageX: window.scrollX + x,
        pageY: window.scrollY + y,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0
      };
      ['pointerdown', 'mousedown', 'mouseup', 'pointerup', 'click'].forEach(type => {
        let evt;
        try {
          evt = new PointerEvent(type, eventOpts);
        } catch {
          evt = new MouseEvent(type, eventOpts);
        }
        // 派发到canvas
        el.dispatchEvent(evt);
      });
    } else {
      // 普通元素直接派发事件
      const eventOpts = {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        screenX: window.screenX + x,
        screenY: window.screenY + y,
        pageX: window.scrollX + x,
        pageY: window.scrollY + y,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0
      };
      ['pointerdown', 'mousedown', 'mouseup', 'pointerup', 'click'].forEach(type => {
        let evt;
        try {
          evt = new PointerEvent(type, eventOpts);
        } catch {
          evt = new MouseEvent(type, eventOpts);
        }
        el.dispatchEvent(evt);
      });
    }
  }

  // iframe内监听postMessage，只在自身frame处理点击
  window.addEventListener('message', function (e) {
    if (e.data && e.data.action === 'simulateViewportClick') {
      _simulateViewportClickOnThisWindow(e.data.x, e.data.y);
    }
  });

  // 暴露统一接口
  window.simulateViewportClick = simulateViewportClick;
  console.log('[content] simulateViewportClick 已暴露到window (只目标frame响应)');


  // 选点模式
  function enablePickPointMode() {
    if (window.self !== window.top) {
      // 只允许顶层页面进入选点模式
      console.log('[content] 非顶层frame，忽略选点请求');
      return;
    }
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
      simulateViewportClick(x, y);
      i++;
      timerClickTimerId = setTimeout(doClick, interval);
    }
    doClick();
  }
})();
