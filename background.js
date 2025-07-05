// background.js
let lastPickedPoint = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'picked_point') {
    // 缓存最新坐标
    lastPickedPoint = { x: msg.x, y: msg.y };
    console.log('[background] 缓存picked_point:', lastPickedPoint);
    // 可选：也写入storage
    chrome.storage.sync.set({ clickX: msg.x, clickY: msg.y });
    // 自动打开popup
    if (chrome.action && chrome.action.openPopup) {
      chrome.action.openPopup();
    } else {
      console.warn('[background] chrome.action.openPopup 不支持');
    }
    sendResponse && sendResponse({ status: 'ok' });
    return true;
  }
  if (msg.action === 'get_last_point') {
    console.log('[background] 返回lastPickedPoint:', lastPickedPoint);
    sendResponse && sendResponse(lastPickedPoint || {});
    return true;
  }
});
