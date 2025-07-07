// // 劫持console.log/console.table/console.dir，屏蔽大数组输出
// (function () {
//   const ARRAY_LIMIT = 30; // 超过多少元素认为是大数组
//   console.log('inject.js 已加载');

//   // 要重写的console方法列表
//   const methods = [
//     'log', 'info', 'warn', 'error', 'debug', 'table', 'dir', 'trace', 'group', 'groupCollapsed', 'groupEnd', 'assert', 'count', 'countReset', 'time', 'timeEnd', 'timeLog', 'profile', 'profileEnd', 'dirxml'
//   ];
//   // 保留原始方法
//   const rawConsole = {};
//   methods.forEach(fn => {
//     rawConsole[fn] = console[fn] ? console[fn].bind(console) : undefined;
//   });
//   // 重写方法
//   methods.forEach(fn => {
//     if (!rawConsole[fn]) return;
//     console[fn] = function (...args) {
//       // if (args.some(a => Array.isArray(a) && a.length > ARRAY_LIMIT)) {
//       //   rawConsole.log(`[console.${fn}] 大数组输出已被屏蔽:`, ...args.map(a => Array.isArray(a) && a.length > ARRAY_LIMIT ? `[Array(${a.length})]` : a));
//       //   return;
//       // }
//       // return rawConsole[fn](...args);
//     };
//   });
//   // 特殊处理console.clear
//   Object.defineProperty(console, 'clear', {
//     value: function () {
//       // rawConsole.log('inject.js 页面清空控制台');
//     },
//     configurable: true
//   });
//   // 额外功能演示
//   window.changeColor = function () {
//     // document.body.style.backgroundColor = 'blue';
//   };
// })();

