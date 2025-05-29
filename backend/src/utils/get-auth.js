import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://www.facebook.com/login");

  process.stdin.resume();
  process.stdin.on("data", async () => {
    await context.storageState({ path: "auth.json" });
    console.log("✅ Session saved");
    await browser.close();
    process.exit(0);
  });
})();
