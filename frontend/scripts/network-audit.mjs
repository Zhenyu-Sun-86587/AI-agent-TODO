import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
const failures = [];

page.on("response", (response) => {
  // 网络巡检收集所有 4xx/5xx 响应，最后统一输出便于 CI 或人工比对。
  if (response.status() >= 400) {
    failures.push({ status: response.status(), url: response.url() });
  }
});

page.on("requestfailed", (request) => {
  failures.push({ error: request.failure()?.errorText || "request failed", url: request.url() });
});

await page.goto("http://127.0.0.1:5174/");
await page.evaluate(() => {
  // 清理本地态后重新走演示登录，避免上一轮会话影响路由覆盖结果。
  localStorage.removeItem("ai-agent-todo.session");
  localStorage.removeItem("ai-agent-todo.tasks");
  localStorage.removeItem("ai-agent-todo.theme");
});

await page.goto("http://127.0.0.1:5174/");
await page.getByRole("button", { name: "使用演示账号（本地）" }).click();

for (const path of ["/today", "/tasks", "/ai", "/board", "/calendar", "/stats", "/tags", "/settings", "/not-a-real-route"]) {
  // 包含旧路由和未知路由，用来发现前端重定向或兼容路径的网络异常。
  await page.goto(`http://127.0.0.1:5174${path}`);
  await page.waitForLoadState("domcontentloaded");
}

console.log(JSON.stringify(failures, null, 2));
await browser.close();
