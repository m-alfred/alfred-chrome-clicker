// inject.js 调试工具集，针对 test_debugger.html 的每个防调试手段反制
(function () {
  // 调试提示
  console.log('[inject.js] 调试工具已注入并执行');

  // 还原右键和调试快捷键
  function unblockContextMenuAndKeys() {
    // 移除所有 contextmenu 监听
    // 在捕获阶段就把事件拦截住并阻止后续传播，所以页面的 preventDefault 根本没机会执行
    window.addEventListener('contextmenu', e => e.stopImmediatePropagation(), true);
    // 阻止 keydown 事件冒泡，防止页面拦截
    window.addEventListener('keydown', e => e.stopImmediatePropagation(), true);
  }

  // 绕过DevTools检测（伪造窗口尺寸）
  function bypassDevToolsDetection() {
    // 伪造 outerWidth/outerHeight
    try {
      Object.defineProperty(window, 'outerWidth', { get() { return window.innerWidth; }, configurable: true });
      Object.defineProperty(window, 'outerHeight', { get() { return window.innerHeight; }, configurable: true });
    } catch (e) { }
  }

  // 绕过iframe检测
  function bypassIframeBlock() {
    try {
      Object.defineProperty(window, 'top', { get: () => window });
      Object.defineProperty(window, 'self', { get: () => window });
    } catch (e) { }
  }

  // 依次调用所有反调试工具，自家看情况开启
  // unblockContextMenuAndKeys();
  // bypassDevToolsDetection();
  // bypassIframeBlock();

  function overrideConsole() {

    const ARRAY_LIMIT = 20;
    // 要重写的console方法列表
    const methods = [
      // 仅保留error
      'log', 'info', 'warn',
      // 'error',
      'debug', 'table', 'dir', 'trace', 'group', 'groupCollapsed', 'groupEnd', 'assert', 'count', 'countReset', 'time', 'timeEnd', 'timeLog', 'profile', 'profileEnd', 'dirxml'
    ];
    // 保留原始方法
    const rawConsole = {};
    methods.forEach(fn => {
      rawConsole[fn] = console[fn] ? console[fn].bind(console) : undefined;
    });
    // 重写方法
    methods.forEach(fn => {
      if (!rawConsole[fn]) return;
      console[fn] = function (...args) {
        // 对于一些循环执行console的场景，直接关闭输出
        // if (args.some(a => Array.isArray(a) && a.length > ARRAY_LIMIT)) {
        //   rawConsole.log(`[console.${fn}] 大数组输出已被屏蔽:`, ...args.map(a => Array.isArray(a) && a.length > ARRAY_LIMIT ? `[Array(${a.length})]` : a));
        //   return;
        // }
        // return rawConsole[fn](...args);
      };
    });
    // 特殊处理console.clear
    Object.defineProperty(console, 'clear', {
      value: function () {
        // 对于一些循环执行console的场景，直接关闭输出
        rawConsole.log('inject.js 页面清空控制台');
      },
      configurable: true
    });
  }

  overrideConsole();

})();
