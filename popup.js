document.addEventListener('DOMContentLoaded', () => {
  const xInput = document.getElementById('x');
  const yInput = document.getElementById('y');
  const status = document.getElementById('status');
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
  document.getElementById('save').addEventListener('click', () => {
    const x = parseInt(xInput.value, 10) || 0;
    const y = parseInt(yInput.value, 10) || 0;
    console.log('[popup] 点击保存按钮，保存坐标:', x, y);
    chrome.storage.sync.set({ clickX: x, clickY: y }, () => {
      status.textContent = '已保存！';
      setTimeout(() => status.textContent = '', 1200);
    });
  });

  // 屏幕选点按钮
  const pickBtn = document.getElementById('pick');
  if (pickBtn) {
    pickBtn.addEventListener('click', () => {
      console.log('[popup] 点击屏幕选点按钮');
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        console.log('[popup] 发送pick_point消息到tab:', tabs[0].id);
        chrome.tabs.sendMessage(tabs[0].id, {action: 'pick_point'});
      });
    });
  }

  // 监听content.js返回的坐标
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('[popup] 收到消息:', msg);
    if(msg.action === 'picked_point') {
      console.log('[popup] 收到picked_point坐标:', msg.x, msg.y);
      xInput.value = msg.x;
      yInput.value = msg.y;
      chrome.storage.sync.set({ clickX: msg.x, clickY: msg.y }, () => {
        status.textContent = '已通过选点保存！';
        setTimeout(() => status.textContent = '', 1200);
      });
    }
  });
});
