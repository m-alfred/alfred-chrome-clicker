// 自动点击器 content.js
(function () {
  // 通用console劫持方法，可被内容脚本和注入脚本共用
  function injectConsoleHijack() {
    console.log('console.clear 已被覆盖');

    document.body.style.backgroundColor = 'red';

    window.changeColor = function () {
      document.body.style.backgroundColor = 'blue';
    };
    try {
      Object.defineProperty(console, 'clear', {
        value: function () {
          console.log('页面清空控制台');
        },
        configurable: true
      });
      Object.defineProperty(console, 'warn', {
        value: function () {
          console.log('页面警告');
        },
        configurable: true
      });
      console.log('console.clear/console.warn 已自动被劫持');
    } catch (e) {
      console.log('console 劫持失败', e);
    }
  }

  // 页面加载自动注入
  injectConsoleHijack();

  function simulateClick(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) {
      console.log('[simulateClick] 没找到元素');
      return;
    }
    const rect = el.getBoundingClientRect();
    const clientX = rect.left + Math.min(x - rect.left, rect.width - 1);
    const clientY = rect.top + Math.min(y - rect.top, rect.height - 1);
    const evtOpts = { bubbles: true, cancelable: true, view: window, clientX, clientY };

    // 调试日志
    console.log('[simulateClick] 目标元素:', el);
    console.log('[simulateClick] 输入坐标:', x, y);
    console.log('[simulateClick] rect:', rect);
    console.log('[simulateClick] 事件clientX,clientY:', clientX, clientY);

    // Mouse事件
    el.dispatchEvent(new MouseEvent('mousedown', evtOpts));
    el.dispatchEvent(new MouseEvent('mouseup', evtOpts));
    el.dispatchEvent(new MouseEvent('click', evtOpts));

    // Pointer事件
    try {
      el.dispatchEvent(new PointerEvent('pointerdown', evtOpts));
      el.dispatchEvent(new PointerEvent('pointerup', evtOpts));
      el.dispatchEvent(new PointerEvent('pointermove', evtOpts));
      el.dispatchEvent(new PointerEvent('click', evtOpts));
    } catch (e) { }

    // Touch事件（如环境支持）
    try {
      if (window.Touch && window.TouchEvent) {
        const touchObj = new Touch({
          identifier: Date.now(),
          target: el,
          clientX, clientY, pageX: clientX, pageY: clientY, screenX: clientX, screenY: clientY
        });
        const touchEventInit = {
          bubbles: true,
          cancelable: true,
          touches: [touchObj],
          targetTouches: [],
          changedTouches: [touchObj]
        };
        el.dispatchEvent(new TouchEvent('touchstart', touchEventInit));
        el.dispatchEvent(new TouchEvent('touchend', touchEventInit));
      }
    } catch (e) { }
  }

  // 自动为所有canvas元素绑定调试事件监听
  function bindCanvasDebugListeners() {
    const events = [
      'mousedown', 'mouseup', 'click',
      'pointerdown', 'pointerup', 'pointermove',
      'touchstart', 'touchend'
    ];
    document.querySelectorAll('canvas').forEach(canvas => {
      events.forEach(evt => {
        canvas.addEventListener(evt, function (e) {
          console.log(`[canvas调试] 事件:${evt}, clientX:${e.clientX}, clientY:${e.clientY}, offsetX:${e.offsetX}, offsetY:${e.offsetY}, isTrusted:${e.isTrusted}`);
        });
      });
    });
  }
  // 页面加载时自动绑定canvas调试监听
  bindCanvasDebugListeners();

  // 自动点击
  // chrome.storage.sync.get(['clickX', 'clickY'], ({ clickX, clickY }) => {
  //   console.log('[content] 读取到已保存坐标:', clickX, clickY);
  //   if (typeof clickX === 'number' && typeof clickY === 'number') {
  //     setTimeout(() => {
  //       console.log('[content] 延迟触发自动点击:', clickX, clickY);
  //       simulateClick(clickX, clickY);
  //     }, 800); // 页面加载后延迟点击
  //   }
  // });

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
      simulateClick(x, y);
      i++;
      timerClickTimerId = setTimeout(doClick, interval);
    }
    doClick();
  }
})();
