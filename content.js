// 自动点击器 content.js
// 脚本注入方法参考：https://stackoverflow.com/questions/9515704/access-variables-and-functions-defined-in-page-context-from-an-extension/9517879#9517879
(function () {
  console.log('content.js 已加载');

  console.log('当前页面url:', location.href);
  console.log('是否顶层:', window.top === window.self ? '是' : '否');

  /**
   * 简单的逆推导，处理scale和translate，支持祖先多层级scale，不支持rotate
   * 将全局坐标 (x, y) 逆向变换为 target 元素的本地坐标
   * 1. 视口坐标（Viewport Coordinates）
    也叫全局坐标，即 clientX、clientY。
    参考点是浏览器窗口的左上角（不含滚动条偏移）。
    鼠标事件（如 click、mousemove）默认返回的就是视口坐标。
    2. 元素视觉坐标（Visual/Rendered Coordinates）
    指事件点在目标元素的视觉区域内的位置，即“你看到的”元素左上角为 (0,0) 时，鼠标点在元素内部的坐标。
    计算方式通常是：clientX - rect.left, clientY - rect.top，其中 rect 是 getBoundingClientRect() 得到的变换后矩形。
    这个坐标已经包含了所有 CSS transform（scale、rotate、translate 等）带来的视觉影响。
    你在页面上“看到”的点，就是视觉坐标的点。
    3. 元素本地坐标（Local/Untransformed Coordinates）
    指在元素自身未经过任何 transform 变换前的本地坐标。
    比如一个 100x100 的 div，transform: scale(2) 后视觉上变成 200x200，但本地坐标还是 (0100, 0100)。
    某些 API（如 canvas、SVG、iframe 内部事件）需要的就是这种坐标。
    需要通过逆 transform 矩阵，把视觉坐标还原为本地坐标。
    你的代码里各类坐标的关系
    事件触发时，拿到的是全局坐标（clientX, clientY）。
    用 clientX - rect.left, clientY - rect.top 得到的是视觉坐标（你“看到”的点在元素内的位置）。
    通过逆 transform，把视觉坐标还原为本地坐标，用于真正的业务逻辑或跨 window/iframe 通信。
  * @param {number} x - 全局 clientX
  * @param {number} y - 全局 clientY
  * @param {HTMLElement} target - 目标元素（如 iframe）
  * @returns {{x: number, y: number}}
  */
  function globalPointToLocal(clientX, clientY, target) {
    const rect = target.getBoundingClientRect();
    // 计算点击点在元素视觉坐标系下的位置
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // rect得到的位置已经是translate位置偏移后的坐标，所以不需要对translate做处理
    // 2. 递归收集所有祖先 scale 并累乘
    let el = target;
    let sxTotal = 1, syTotal = 1;
    while (el && el !== document.body && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      const transform = style.transform;
      let sx = 1, sy = 1;
      console.log('transform:', transform);
      // 通过getComputedStyle获取的transform会转换成matrix形式，所以需要处理matrix，偏移量会转换成px，且是scale后的结果，比如scale(0.5) translateX(200px)会输出100px
      // transformOrigin也会转换成px单位
      if (transform && transform.startsWith('matrix')) {
        // matrix(a, b, c, d, e, f)
        const match = transform.match(/matrix\(([^)]+)\)/);
        if (match) {
          const parts = match[1].split(',').map(Number);
          // 这里不考虑旋转，只考虑scale，取a、d
          sx = parts[0];
          sy = parts[3];
        }
      }
      sxTotal *= sx;
      syTotal *= sy;
      el = el.parentElement;
    }
    console.log('sxTotal:', sxTotal, 'syTotal:', syTotal);
    // 逆推导：视觉坐标除以缩放因子
    return {
      x: x / sxTotal,
      y: y / syTotal
    };
  }

  /**
   * content.js 通过 DOM 注入 <script> 标签，代码会在**页面的主环境（window）**下执行，和页面自己的 JS 处于同一个作用域，能直接影响/覆盖页面的全局对象（如 window.console）。
   * @param {*} src 
   */
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
  chrome.storage.sync.get(['autoInject'], function (result) {
    console.log('autoInject:', result.autoInject);

    if (result.autoInject) {
      // 动态插入 inject.js
      injectJs('inject.js');
    }
  });

  // 支持popup手动注入请求
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'inject_injectjs') {
      try {
        injectJs('inject.js');
        sendResponse({ success: true, msg: 'inject.js 已DOM注入' });
      } catch (e) {
        sendResponse({ success: false, msg: e.message });
      }
    }
  });

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
          // 如果iframe祖先元素有scale或者rotate，需要考虑
          const { x: innerX, y: innerY } = globalPointToLocal(x, y, iframe);
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
    // 点击手势动画
    (function showRippleGestures() {
      const rippleCount = 1;
      const rippleInterval = 120; // ms
      const baseSize = 36;
      const rippleDurationMs = 700; // 动画时长(ms)
      for (let i = 0; i < rippleCount; i++) {
        setTimeout(() => {
          const ripple = document.createElement('div');
          ripple.style.position = 'fixed';
          ripple.style.left = x + 'px';
          ripple.style.top = y + 'px';
          ripple.style.width = baseSize + 'px';
          ripple.style.height = baseSize + 'px';
          ripple.style.marginLeft = -(baseSize / 2) + 'px';
          ripple.style.marginTop = -(baseSize / 2) + 'px';
          ripple.style.borderRadius = '50%';
          // ripple.style.border = '48px solid #d85040';
          ripple.style.background = '#d85040';
          ripple.style.zIndex = 9999999;
          ripple.style.pointerEvents = 'none';
          ripple.style.boxSizing = 'border-box';
          // ripple.style.opacity = '0.65';
          ripple.style.transform = 'scale(0.7)';
          ripple.style.transition = `transform ${rippleDurationMs}ms cubic-bezier(0.38,0.01,0,1), opacity ${rippleDurationMs}ms`;
          document.body.appendChild(ripple);
          setTimeout(() => {
            ripple.style.transform = 'scale(2)';
            ripple.style.opacity = '0';
          }, 10);
          setTimeout(() => ripple.remove(), rippleDurationMs + 100);
        }, i * rippleInterval);
      }
    })();
    const el = document.elementFromPoint(x, y);
    if (!el) {
      console.log('[simulateViewportClick] 没找到目标元素');
      return;
    }
    if (el.tagName.toLowerCase() === 'canvas') {
      // 计算canvas缩放，换算canvas内部坐标
      // 对于transform过的canvas，需要考虑scale和rotate
      const rect = el.getBoundingClientRect();
      const scaleX = el.width / rect.width;
      const scaleY = el.height / rect.height;
      const canvasX = (x - rect.left) * scaleX;
      const canvasY = (y - rect.top) * scaleY;
      /**
       * 模拟真实用户点击时，建议像浏览器原生事件那样，把 clientX、pageX、screenX 都按实际坐标补全，确保最大兼容性和还原度。
       * 对大部分简单页面，仅有 clientX/clientY 也能正常触发点击
       * 事件派发和页面上事件处理都是基于CSS 像素坐标，所以即使2倍密度的canvas，也能对应上
       */
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
  console.log('[content] simulateViewportClick 已暴露到window');


  // 选点模式
  // 选点都是基于CSS坐标相对视口的位置
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
    function cleanup() {
      mask.remove();
      window.removeEventListener('click', onClick, true);
      window.removeEventListener('keydown', onKeydown, true);
    }
    function onClick(e) {
      e.preventDefault();
      e.stopPropagation();
      const x = e.clientX;
      const y = e.clientY;
      console.log('[content] 选点点击，坐标:', x, y);
      chrome.runtime.sendMessage({ action: 'picked_point', x, y }, (res) => {
        console.log('[content] picked_point已发送至background，返回：', res);
      });
      cleanup();
    }
    function onKeydown(e) {
      if (e.key === 'Escape') {
        console.log('[content] 选点模式已取消(Esc)');
        cleanup();
      }
    }
    window.addEventListener('click', onClick, true);
    window.addEventListener('keydown', onKeydown, true);
  }
  // 监听popup发来的选点请求
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'show_current_coord') {
      if (window.self !== window.top) {
        console.log('[content] 非顶层frame，忽略show_current_coord请求');
        return;
      }
      // 使用popup传递的x/y坐标
      let lastX = typeof msg.x === 'number' ? msg.x : 0;
      let lastY = typeof msg.y === 'number' ? msg.y : 0;
      // 创建浮动提示和高亮点
      const marker = document.createElement('div');
      marker.style.position = 'fixed';
      marker.style.left = lastX + 'px';
      marker.style.top = lastY + 'px';
      marker.style.width = '16px';
      marker.style.height = '16px';
      marker.style.marginLeft = '-8px';
      marker.style.marginTop = '-8px';
      marker.style.background = '#266eee';
      marker.style.border = '2px solid #fff';
      marker.style.borderRadius = '50%';
      marker.style.boxShadow = '0 0 8px #09f';
      marker.style.zIndex = 9999999;
      marker.style.pointerEvents = 'none';
      marker.style.transition = 'opacity 0.3s';
      document.body.appendChild(marker);
      // 坐标文本提示
      const coordTip = document.createElement('div');
      coordTip.textContent = `X: ${lastX}, Y: ${lastY}`;
      coordTip.style.position = 'fixed';
      coordTip.style.left = (lastX + 20) + 'px';
      coordTip.style.top = (lastY - 10) + 'px';
      coordTip.style.background = 'rgba(0,0,0,0.8)';
      coordTip.style.color = '#fff';
      coordTip.style.padding = '5px 12px';
      coordTip.style.borderRadius = '5px';
      coordTip.style.fontSize = '14px';
      coordTip.style.zIndex = 9999999;
      coordTip.style.pointerEvents = 'none';
      document.body.appendChild(coordTip);
      setTimeout(() => {
        marker.style.opacity = '0';
        coordTip.style.opacity = '0';
        setTimeout(() => {
          marker.remove();
          coordTip.remove();
        }, 350);
      }, 3000);
    }

    console.log('[content] 收到消息:', msg);
    if (msg.action === 'pick_point') {
      console.log('[content] 激活选点模式');
      enablePickPointMode();
      sendResponse({ ok: true });
    }
    if (msg.action === 'timer_click') {
      console.log('[content] 收到timer_click:', msg);
      startTimerClick(msg.x, msg.y, msg.interval, msg.count);
    }
  });

  // 定时多次点击
  // 防止重复定时点击
  let timerClickTimerId = null;
  // x, y 对应clientX/clientY
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
        // 发送消息给popup修改按钮状态
        chrome.runtime.sendMessage({ action: 'timer_click_done' });
        return;
      }
      console.log(`[content] timer_click 第${i + 1}次: (${x},${y})`);
      simulateViewportClick(x, y);
      i++;
      // 每次点击后同步剩余次数到popup
      chrome.runtime.sendMessage({ action: 'timer_click_remain', remain: count - i });
      timerClickTimerId = setTimeout(doClick, interval);
    }
    doClick();
  }
  // 监听popup发来的停止自动点击指令
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.action === 'stop_timer_click') {
      if (timerClickTimerId) {
        clearTimeout(timerClickTimerId);
        timerClickTimerId = null;
        console.log('[content] 收到停止自动点击指令，已终止');
      }
    }
  });
})();
