// background.js
let lastPickedPoint = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'picked_point') {
    // 缓存最新坐标
    lastPickedPoint = { x: msg.x, y: msg.y };
    console.log('[background] 缓存picked_point:', lastPickedPoint);
    // 可选：也写入storage
    chrome.storage.sync.set({ clickX: msg.x, clickY: msg.y });
    sendResponse && sendResponse({ status: 'ok' });
    return true;
  }
  if (msg.action === 'get_last_point') {
    console.log('[background] 返回lastPickedPoint:', lastPickedPoint);
    sendResponse && sendResponse(lastPickedPoint || {});
    return true;
  }
});
