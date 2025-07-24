document.addEventListener('DOMContentLoaded', () => {
  function reloadTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.reload(tabs[0].id);
    });
  }

  // 脚本注入面板折叠/展开
  const injectToggle = document.getElementById('inject-toggle');
  const injectPanel = document.getElementById('inject-panel');
  const injectArrow = document.getElementById('inject-arrow');
  if (injectToggle && injectPanel && injectArrow) {
    injectToggle.addEventListener('click', function () {
      const expanded = injectPanel.classList.contains('inject-panel-expanded');
      injectPanel.classList.toggle('inject-panel-collapsed', expanded);
      injectPanel.classList.toggle('inject-panel-expanded', !expanded);
      injectArrow.classList.toggle('inject-arrow-collapsed', expanded);
      injectArrow.classList.toggle('inject-arrow-expanded', !expanded);
    });
    // 默认收起
    injectPanel.classList.add('inject-panel-collapsed');
    injectPanel.classList.remove('inject-panel-expanded');
    injectArrow.classList.add('inject-arrow-collapsed');
    injectArrow.classList.remove('inject-arrow-expanded');
  }

  // 自动注入配置
  chrome.storage.sync.get(['autoInject'], function (result) {
    const autoInjectCkb = document.getElementById('auto-inject-checkbox');
    // 同步勾选状态到UI
    autoInjectCkb.checked = !!result.autoInject;
  });

  const xInput = document.getElementById('x');
  const yInput = document.getElementById('y');
  const countInput = document.getElementById('count');
  const intervalInput = document.getElementById('interval');
  const remainCountDiv = document.getElementById('remain-count');
  let remainCount = 0;

  // 初始化时读取 storage 并填充输入框
  chrome.storage.sync.get(['clickX', 'clickY', 'count', 'interval'], (data) => {
    console.log('[popup] 读取已保存的坐标:', data);
    if (typeof data.clickX === 'number') xInput.value = data.clickX;
    if (typeof data.clickY === 'number') yInput.value = data.clickY;
    if (typeof data.count === 'number') countInput.value = data.count;
    if (typeof data.interval === 'number') intervalInput.value = data.interval;
  });

  // 输入时自动存储到 storage
  xInput.addEventListener('input', () => {
    chrome.storage.sync.set({ clickX: parseInt(xInput.value, 10) || 0 });
  });
  yInput.addEventListener('input', () => {
    chrome.storage.sync.set({ clickY: parseInt(yInput.value, 10) || 0 });
  });
  countInput.addEventListener('input', () => {
    chrome.storage.sync.set({ count: parseInt(countInput.value, 10) || 1 });
  });
  intervalInput.addEventListener('input', () => {
    chrome.storage.sync.set({ interval: parseInt(intervalInput.value, 10) || 1000 });
  });

  // Toast 显示函数
  let toastTimer = null;
  function showToast(message, duration = 1500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    // 清理旧定时器和动画
    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }
    toast.classList.remove('hide');
    toast.textContent = message;
    toast.classList.add('show');
    // 保持显示 duration 毫秒
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hide');
      // 等待动画结束后再清空内容
      toastTimer = setTimeout(() => {
        toast.textContent = '';
        toast.classList.remove('hide');
        toastTimer = null;
      }, 350); // 350ms 与CSS动画一致
    }, duration);
  }
  const timerToggleBtn = document.getElementById('timer-toggle-btn');
  let timerRunning = false;
  // 读取已保存的坐标
  // 向background请求最新选点坐标
  chrome.runtime.sendMessage({ action: 'get_last_point' }, (res) => {
    console.log('[popup] background返回lastPickedPoint:', res);
    if (res && typeof res.x === 'number' && typeof res.y === 'number') {
      xInput.value = res.x;
      yInput.value = res.y;
    } else {
      // fallback: 读取storage
      chrome.storage.sync.get(['clickX', 'clickY'], (data) => {
        console.log('[popup] 读取已保存的坐标:', data);
        if (data.clickX !== undefined) xInput.value = data.clickX;
        if (data.clickY !== undefined) yInput.value = data.clickY;
      });
    }
  });

  // 屏幕选点按钮
  const pickBtn = document.getElementById('pick');
  const showCoordBtn = document.getElementById('show-coord-btn');
  if (showCoordBtn) {
    showCoordBtn.addEventListener('click', () => {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const x = parseInt(xInput.value, 10) || 0;
        const y = parseInt(yInput.value, 10) || 0;
        chrome.tabs.sendMessage(tabs[0].id, { action: 'show_current_coord', x, y });
      });
    });
  }

  if (pickBtn) {
    pickBtn.addEventListener('click', () => {
      console.log('[popup] 点击屏幕选点按钮');
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        console.log('[popup] 发送pick_point消息到tab:', tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, { action: 'pick_point' }, function () {
          console.log('[popup] 关闭popup窗口');
          // 等消息真正发出后再关闭 popup
          // 自动关闭popup窗口，提升用户体验
          window.close();
        });
      });
    });
  }

  if (timerToggleBtn) {
    timerToggleBtn.addEventListener('click', () => {
      if (!timerRunning) {
        // 开始自动点击
        const x = parseInt(xInput.value, 10) || 0;
        const y = parseInt(yInput.value, 10) || 0;
        const interval = parseInt(intervalInput.value, 10) || 1000;
        const count = parseInt(countInput.value, 10) || 10;
        console.log('[popup] 开始定时点击:', { x, y, interval, count });
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'timer_click',
            x, y, interval, count
          });
          // 开始自动点击时初始化剩余点击次数
          remainCount = count;
          if (remainCountDiv) remainCountDiv.textContent = `剩余点击次数：${remainCount}`;
          // 之后的剩余次数展示完全由 content.js 消息同步
        });
        timerToggleBtn.textContent = '停止自动点击';
        timerToggleBtn.classList.add('btn-gray');
        timerRunning = true;
      } else {
        // 停止自动点击
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'stop_timer_click' });
        });
        timerToggleBtn.textContent = '自动点击';
        timerToggleBtn.classList.remove('btn-gray');
        timerRunning = false;
        // 自动点击结束时重置剩余点击次数
        remainCountDiv.textContent = '剩余点击次数：-';
      }
    });
  }

  // 监听content.js返回的坐标
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('[popup] 收到消息:', msg);
    if (msg.action === 'picked_point') {
      console.log('[popup] 收到picked_point坐标:', msg.x, msg.y);
      xInput.value = msg.x;
      yInput.value = msg.y;
      chrome.storage.sync.set({ clickX: msg.x, clickY: msg.y }, () => {
        showToast('已通过选点保存！');
      });
    }

    if (msg.action === 'timer_click_remain') {
      if (remainCountDiv) remainCountDiv.textContent = `剩余点击次数：${msg.remain}`;
    }

    if (msg.action === 'timer_click_done') {
      console.log('[popup] 收到timer_click_done消息');
      // 停止后重置剩余点击次数
      if (remainCountDiv) remainCountDiv.textContent = '剩余点击次数：-';
      // 按钮状态重置
      if (typeof timerRunning !== 'undefined') {
        timerRunning = false;
        if (timerToggleBtn) {
          timerToggleBtn.textContent = '自动点击';
          timerToggleBtn.classList.remove('btn-gray');
        }
      }
    }
  });

  document.getElementById('auto-inject-checkbox').addEventListener('change', function (e) {
    chrome.storage.sync.set({ autoInject: e.target.checked });
    // 自动刷新页面
    reloadTab();
  });

  document.getElementById('inject-script').addEventListener('click', injectScript);

  // document.getElementById('refresh-tab').addEventListener('click', function () {
  //   reloadTab();
  // });


  // ====== 统一脚本注入函数 ======
  function injectScript() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      // 通过消息通知content.js执行DOM注入inject.js，确保能劫持页面window.console
      chrome.tabs.sendMessage(tabs[0].id, { action: 'inject_injectjs' }, function (response) {
        if (chrome.runtime.lastError) {
          console.error('注入消息发送失败:', chrome.runtime.lastError.message);
        } else {
          console.log('注入消息已发送，content.js返回：', response);
        }
      });

      // /**
      //  * 以指定在页面上下文执行，但实际上默认是在**“isolated world”（隔离环境）**下运行（即 content script 环境），它拿到的是一个“沙箱”window，无法影响页面自己的 window.console，只能影响自己
      //  */
      // chrome.scripting.executeScript({
      //   target: { tabId: tabs[0].id },
      //   files: ['inject.js']
      // }).then((results) => {
      //   console.log('脚本注入并执行成功:', results);
      // }).catch((err) => {
      //   console.error('脚本注入失败:', err);
      // });
    });
  }
})