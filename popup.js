document.addEventListener('DOMContentLoaded', () => {
  const xInput = document.getElementById('x');
  const yInput = document.getElementById('y');
  const status = document.getElementById('status');
  // 读取已保存的坐标
  chrome.storage.sync.get(['clickX', 'clickY'], (data) => {
    if (data.clickX !== undefined) xInput.value = data.clickX;
    if (data.clickY !== undefined) yInput.value = data.clickY;
  });
  document.getElementById('save').addEventListener('click', () => {
    const x = parseInt(xInput.value, 10) || 0;
    const y = parseInt(yInput.value, 10) || 0;
    chrome.storage.sync.set({ clickX: x, clickY: y }, () => {
      status.textContent = '已保存！';
      setTimeout(() => status.textContent = '', 1200);
    });
  });

  // 屏幕选点按钮
  const pickBtn = document.getElementById('pick');
  if (pickBtn) {
    pickBtn.addEventListener('click', () => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'pick_point'});
      });
    });
  }

  // 监听content.js返回的坐标
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if(msg.action === 'picked_point') {
      xInput.value = msg.x;
      yInput.value = msg.y;
      chrome.storage.sync.set({ clickX: msg.x, clickY: msg.y }, () => {
        status.textContent = '已通过选点保存！';
        setTimeout(() => status.textContent = '', 1200);
      });
    }
  });
});
