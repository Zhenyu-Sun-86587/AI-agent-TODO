import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto("http://127.0.0.1:5174/");
await page.evaluate(() => {
  localStorage.setItem(
    "ai-agent-todo.session",
    JSON.stringify({
      name: "Demo User",
      email: "demo@aitodo.local",
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
  await page.goto(`http://127.0.0.1:5174${path}`);
  await page.screenshot({ path: `tmp/visual-audit/${name}`, fullPage: false });
}

await page.setViewportSize({ width: 390, height: 844 });
await page.goto("http://127.0.0.1:5174/tasks");
await page.screenshot({ path: "tmp/visual-audit/tasks-mobile.png", fullPage: false });

await browser.close();
console.log("tmp/visual-audit");
