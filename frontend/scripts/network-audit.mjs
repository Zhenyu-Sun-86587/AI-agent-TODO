import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
const failures = [];

page.on("response", (response) => {
  if (response.status() >= 400) {
    failures.push({ status: response.status(), url: response.url() });
  }
});

page.on("requestfailed", (request) => {
  failures.push({ error: request.failure()?.errorText || "request failed", url: request.url() });
});

await page.goto("http://127.0.0.1:5174/");
await page.evaluate(() => {
  localStorage.removeItem("ai-agent-todo.session");
  localStorage.removeItem("ai-agent-todo.tasks");
  localStorage.removeItem("ai-agent-todo.theme");
});

await page.goto("http://127.0.0.1:5174/");
await page.getByRole("button", { name: "使用演示账号（本地）" }).click();

for (const path of ["/today", "/tasks", "/ai", "/board", "/calendar", "/stats", "/tags", "/settings", "/not-a-real-route"]) {
  await page.goto(`http://127.0.0.1:5174${path}`);
  await page.waitForLoadState("domcontentloaded");
}

console.log(JSON.stringify(failures, null, 2));
await browser.close();
