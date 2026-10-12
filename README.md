# OmniCommonTools

面向开发者的常用 Web 工具箱。首期工具包括：

- JSON 美化
- 文本 / JSON Diff
- 时间戳转换

所有格式化、对比和时间转换均在浏览器本地完成，不会上传输入内容。浏览器只持久化主题、收藏、最近使用及各工具设置；JSON、Diff 和时间转换输入不会写入本地存储。

## 本地开发

```bash
npm install
npm run dev
```

## 验证

```bash
npm test -- --run
npm run build
npm run e2e
```

首次运行 Playwright 时需要安装 Chromium：

```bash
npx playwright install chromium
```

也可以复用本机 Chrome：

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run e2e
```

E2E 覆盖桌面与移动响应式布局、核心工具流程、键盘操作、无障碍扫描、偏好持久化及敏感输入不持久化。

## 路由

- `/`：全部工具
- `/favorites`：收藏
- `/tools/json-formatter`：JSON 美化
- `/tools/text-json-diff`：文本 / JSON Diff
- `/tools/timestamp-converter`：时间戳转换
- `/about`：关于
