import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://127.0.0.1:5174/");
await page.evaluate(() => {
  // 视觉巡检只需要进入登录后壳层，用本地会话绕过真实鉴权依赖。
  localStorage.setItem(
    "ai-agent-todo.session",
    JSON.stringify({
      name: "Demo User",
      email: "demo@taskpilot.dev",
      token: "visual-audit",
      isApiSession: false,
    }),
  );
});

const shots = [
  ["/", "dashboard-desktop.png"],
  ["/ai", "ai-desktop.png"],
  ["/calendar", "calendar-desktop.png"],
];

for (const [path, name] of shots) {
  // 截图固定在 5174，便于和临时手动启动的前端服务隔离。
  await page.goto(`http://127.0.0.1:5174${path}`);
  await page.screenshot({ path: `tmp/visual-audit/${name}`, fullPage: false });
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:5174/tasks");
await page.screenshot({ path: "tmp/visual-audit/tasks-mobile.png", fullPage: false });

await browser.close();
console.log("tmp/visual-audit");
