# 项目说明（alfred-chrome-cliker）

## 使用教程

1. 克隆或下载本项目到本地。
2. 打开 Chrome 浏览器，进入 `扩展程序` 页面（chrome://extensions/）。
3. 开启右上角的“开发者模式”。
4. 点击“加载已解压的扩展程序”，选择本项目文件夹。
5. 安装完成后，即可在浏览器工具栏看到扩展图标。
6. 点击扩展图标，弹出窗口即可使用相关功能。

## 调试步骤

1. 打开 Chrome 浏览器，进入 `扩展程序` 页面（chrome://extensions/）。
2. 找到已加载的 alfred-chrome-cliker 插件，确保“开发者模式”已开启。
3. 在插件卡片下方，点击“背景页”或“Service Worker”旁边的“检查视图（Inspect views）”按钮，可以调试 background、content、popup 等脚本。
4. 也可以点击浏览器右上角插件图标，在弹窗页面按下 `F12` 或 `Ctrl+Shift+I` 打开开发者工具，调试 `popup.html` 和 `popup.js`。
5. 若要调试 `content.js`，请在目标网页按下 `F12` 打开开发者工具，切换到“控制台（Console）”或“源代码（Sources）”，找到 `content.js` 相关脚本进行断点调试。
6. 修改代码后，需在 `扩展程序` 页面点击“刷新”按钮，重新加载插件，再进行调试。

建议在调试时多用 `console.log()` 输出调试信息，便于定位问题。

## 项目结构

```
alfred-chrome-cliker/
├── content.js      # 注入到网页中的脚本，实现页面自动化或交互逻辑
├── manifest.json   # Chrome 扩展的配置文件，声明权限、入口等信息
├── popup.html      # 扩展弹窗的 HTML 页面
├── popup.js        # 弹窗页面的逻辑脚本
```

如需进一步定制功能，请根据实际需求修改 `content.js` 或 `popup.js`。

## 脚本注入


## 开发中遇到的问题
### GET chrome-extension://invalid/ net::ERR_FAILED
在manifest.json中添加
```
"web_accessible_resources": [{
  "resources": ["inject.js"],
  "matches": ["<all_urls>"]
}]
```

### content-script 无法劫持网页js方法
内容脚本位于隔离的环境中，因此内容脚本可以更改其 JavaScript 环境，而不会与网页或其他扩展程序的内容脚本冲突。内容脚本的执行环境与托管它们的网页彼此隔离，但它们共享对网页 DOM 的访问权限。
使用`chrome.scripting.executeScript`注入脚本
```
chrome.scripting.executeScript({
    target: { tabId: tabs[0].id },
    files: ['inject.js']
  }).then((results) => {
    console.log('脚本注入并执行成功:', results);
  }).catch((err) => {
    console.error('脚本注入失败:', err);
  });
```

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

