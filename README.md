# alfred-chrome-cliker
Chrome扩展，用于自动点击屏幕指定坐标。

## 插件功能
- 支持自动点击屏幕指定坐标，可自定义点击位置和频率。
- 兼容多层嵌套 iframe、复杂 CSS transform（如 scale、translate）场景，坐标换算精准。
- 可用于模拟用户点击、自动化测试、辅助操作等多种场景。

## TODO
- ~~[ ] 修复执行自动点击的时候滚动屏幕，点击位置不准确的问题。~~
- [x] 持久化x、y坐标，count，interval。
- [ ] 支持iframe旋转变换后的模拟点击。
  
## 使用教程

1. 克隆或下载本项目到本地。
2. 打开 Chrome 浏览器，进入 `扩展程序` 页面（chrome://extensions/）。
3. 开启右上角的“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择本项目文件夹。
5. 安装完成后，即可在浏览器工具栏看到扩展图标。
6. 点击扩展图标，弹出窗口即可使用相关功能。

---

### 演示视频

> alfred-chrome-clicker.mp4

如果你的 markdown 渲染器支持视频，可以直接播放：

```markdown
<video src="./alfred-chrome-clicker.mp4" controls width="320"></video>
```

如果不支持，也可以在本地用播放器打开该文件。

## 调试步骤

1. 打开 Chrome 浏览器，进入 `扩展程序` 页面（chrome://extensions/）。
2. 找到已加载的 alfred-chrome-cliker 插件，确保“开发者模式”已开启。
3. 在插件卡片下方，点击“背景页”或“Service Worker”旁边的“检查视图（Inspect views）”按钮，可以调试 background、content、popup 等脚本。
4. 也可以点击浏览器右上角插件图标，在弹窗页面按下 `F12` 或 `Ctrl+Shift+I` 打开开发者工具，调试 `popup/popup.html` 和 `popup/popup.js`。
5. 若要调试 `content.js`，请在目标网页按下 `F12` 打开开发者工具，切换到“控制台（Console）”或“源代码（Sources）”，找到 `content.js` 相关脚本进行断点调试。
6. 修改代码后，需在 `扩展程序` 页面点击“刷新”按钮，重新加载插件，再进行调试。

建议在调试时多用 `console.log()` 输出调试信息，便于定位问题。

## 项目结构

```
alfred-chrome-cliker/
├── manifest.json           # Chrome扩展配置文件
├── background.js           # 后台Service Worker脚本
├── content.js              # 注入网页的内容脚本，主自动化逻辑
├── inject.js               # 以<Script>方式注入页面，绕过沙箱限制
├── README.md               # 项目说明文档
├── icons/                  # 扩展图标资源
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   └── favicon-192x192.png
├── popup/                  # 扩展弹窗相关代码
│   ├── popup.html          # 弹窗页面
│   └── popup.js            # 弹窗逻辑脚本
├── test/                   # 测试与演示页面
│   ├── index.html          # 主测试页面
│   └── test_iframe.html    # iframe嵌套测试页
│   └── test_debugger.html  # 防调试测试页（自家测试用的）
```

- `content.js`：自动点击等核心逻辑，注入所有页面和iframe。
- `inject.js`：以原生script注入，支持劫持页面js方法。
- `background.js`：后台事件、消息监听。
- `popup/`：扩展弹窗UI及交互逻辑。
- `test/`：本地测试主页面和iframe页面，便于调试跨frame点击。
- `icons/`：扩展图标。

如需进一步定制功能，请根据实际需求修改 `content.js`、`popup/popup.js`、`test/index.html` 等。

如需进一步定制功能，请根据实际需求修改 `content.js` 或 `popup/popup.js`。

## 点击事件触发
通过el.dispatchEvent()触发点击事件。dispatchEvent派发PointerEvent和MouseEvent实例。

## 脚本注入
谨慎开启！！！默认关闭。通过注入inject.js修改页面js方法。适合开发者，可以自行修改inject.js中的内容，通过开发者模式加载插件。


## 开发中遇到的问题
### GET chrome-extension://invalid/ net::ERR_FAILED
在manifest.json中添加
```
"web_accessible_resources": [{
  "resources": ["inject.js"],
  "matches": ["<all_urls>"]
}]
```

### chrome.scripting.executeScript 无法劫持网页js方法
chrome.scripting.executeScript 注入的脚本，虽然可以指定在页面上下文执行，但实际上默认是在**“isolated world”（隔离环境）**下运行（即 content script 环境），它拿到的是一个“沙箱”window，无法影响页面自己的 window.console，只能影响自己。
在content-script中通过DOM注入inject.js
```
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
```
以下两个问题也是由于CSP策略导致，需要通过注入`inject.js`绕过沙箱限制
1. Uncaught EvalError: Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script in the following Content Security Policy directive: "script-src 'self' 'wasm-unsafe-eval' 'inline-speculation-rules' 

2. Refused to execute inline script because it violates the following Content Security Policy directive: "script-src 'self' 'wasm-unsafe-eval' 'inline-speculation-rules' 

### iframe中注入代码失败
设置`all_frames`为`true`，all_frames指定是否应将 JavaScript 和 CSS 文件注入与指定网址要求匹配的所有框架，还是仅注入标签页中的顶层框架
```
"content_scripts": [
  {
    "matches": ["https://*.nytimes.com/*"],
    "all_frames": true,
    "js": ["contentScript.js"]
  }
],
```

### 点击事件处理
区分top、iframe和canvas事件处理。
#### iframe事件派发
1. 事件作用域隔离
iframe 和父页面（top window）是两个不同的文档环境。你在 top 页面拿到的 clientX/clientY 坐标，是相对于整个视口（viewport）的，而不是 iframe 内部的坐标。
2. 坐标系不同
iframe 内部的事件监听（比如 click）接收到的 clientX/clientY，是相对于 iframe 自己的视口的。如果你直接用 top 级的 clientX/clientY 去派发，会导致坐标不对，事件可能落不到你想要的元素上。
3. 安全限制
你不能直接跨域操作 iframe 的内容（比如派发事件），除非父页面和 iframe 是同源的。如果不同源，只能用 postMessage 通信，不能直接派发事件。

正确做法：
1. 先判断点击点是否在某个 iframe 内。
2. 如果在，计算出相对于该 iframe 的坐标（innerX, innerY）。
3. 用 postMessage 把坐标传递给 iframe。
4. 由 iframe 自己在内部派发 click 事件。


#### iframe点击事件换算
一些iframe存在祖先原理出现scale、rotate，需要换算。
rotate比较麻烦，而且不常见。工程代码里仅考虑scale。iframe的css宽高和dom元素上的宽高不会影响内容缩放，只是影响内容展示区域大小。但是iframe的transform会影响内容缩放。所以我们只需要从当前元素到跟根元素递归计算总的scale缩放，最后将点击坐标除以scale即可。

#### css transform matrix结构
CSS 2D matrix 形式为：
matrix(a, b, c, d, e, f)
对应矩阵为
```
| a  c  e |
| b  d  f |
| 0  0  1 |
```
a: 水平方向的 scale（+ 旋转分量）
d: 垂直方向的 scale（+ 旋转分量）
e: 水平平移（translateX）
f: 垂直平移（translateY）
b, c: 旋转/倾斜分量

### Unchecked runtime.lastError: Could not establish connection. Receiving end does not exist.
- 扩展重新加载后，只有新打开或刷新过的页面才会重新注入 content script。
- 旧页面不会自动注入 content script，导致消息无法送达

### Unchecked runtime.lastError: The message port closed before a response was received.
这个报错，通常是因为 popup 向 content script 发送消息时，callback 期望有响应，但 content script 没有调用 sendResponse，或者 callback 没有处理异常。
要么去掉callback
```
chrome.tabs.sendMessage(tabId, { action: 'pick_point' });
```
要么content.js 里要加一行 sendResponse()，比如：
```
if (msg.action === 'pick_point') {
  enablePickPointMode();
  sendResponse({ ok: true });
}
```

###  permissions
#### tabs和currentTab权限
它会授予扩展程序对 tabs.Tab 实例上的四个敏感属性（url、pendingUrl、title 和 favIconUrl）调用 tabs.query() 的权限。

chrome.tabs.query({active:true}) 获取当前活动标签页的 tabId，这其实用 "activeTab" 就够了，不需要 "tabs"。

只有以下几种场景才“必须”用 "tabs"：

需要访问所有标签页的信息（比如遍历所有 tab、获取/修改任意 tab 的 url/title、批量操作标签页等）。
需要操作非当前激活标签页（比如后台批量关闭、移动、刷新等）。
需要访问 chrome.tabs.* API 的敏感属性（如 url、title、favIconUrl）且不只是当前活动页

### 页面挂到后台点击变慢
大多数情况下，Chrome标签页切到后台后，自动点击会继续执行，但可能会变慢或被限速。
这取决于浏览器的节能策略和操作系统环境

1. Chrome的后台标签页节流机制
- Chrome对非激活（background）的标签页会降低定时器精度，setTimeout/setInterval的最小间隔会被强制拉长（通常为1秒或更长）。
- 你的自动点击依赖于setTimeout(doClick, interval)，如果interval小于1000ms，切后台后会自动被拉长。
- 如果interval本来很大（比如几秒），影响不大；如果很小（比如100ms），后台时会明显变慢。
2. 不会彻底停止
- 只要标签页没被卸载/休眠，脚本会继续运行，只是变慢。
- 如果浏览器或系统资源紧张，极端情况下后台标签页可能被挂起（Suspended/Discarded），此时脚本会暂停，等用户切回页面才恢复。
3. 移动端更严格  
在手机浏览器上，后台页面很可能会被彻底挂起，自动点击会暂停