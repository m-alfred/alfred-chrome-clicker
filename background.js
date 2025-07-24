// background.js
let lastPickedPoint = null;
// 维护每个tabId的自动点击状态，仅本会话有效
const tabTimerRunning = {};

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
  // 新增：自动点击状态管理
  if (msg.action === 'get_timer_running') {
    const tabId = msg.tabId;
    sendResponse && sendResponse({ running: !!tabTimerRunning[tabId] });
    return true;
  }
  if (msg.action === 'set_timer_running') {
    const tabId = msg.tabId;
    tabTimerRunning[tabId] = !!msg.running;
    sendResponse && sendResponse({ status: 'ok' });
    return true;
  }
});

// 监听tab关闭/刷新，自动清理状态
chrome.tabs.onRemoved.addListener(function(tabId) {
  if (tabTimerRunning[tabId] !== undefined) {
    delete tabTimerRunning[tabId];
    console.log('[background] tab关闭，清除timerRunning:', tabId);
  }
});
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'loading' && tabTimerRunning[tabId] !== undefined) {
    delete tabTimerRunning[tabId];
    console.log('[background] tab刷新，清除timerRunning:', tabId);
  }
});
