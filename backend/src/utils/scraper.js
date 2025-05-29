import { chromium } from "playwright";

export const scrapeGroup = async (id) => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: "auth.json" });
  const page = await context.newPage();

  await page.goto(`https://www.facebook.com/groups/${id}`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(1000);

  const authorData = await page.$$eval('div[role="article"]', (nodes) => {
    const parseRelativeTime = (text) => {
      const now = new Date();
      const match = text.match(/(\d+)\s?(хв|хвилин|год|дн|тиж)/i);
      if (!match) return null;

      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();

      switch (unit) {
        case "хв":
        case "хвилин":
          now.setMinutes(now.getMinutes() - value);
          break;
        case "год":
          now.setHours(now.getHours() - value);
          break;
        case "дн":
          now.setDate(now.getDate() - value);
          break;
        case "тиж":
          now.setDate(now.getDate() - value * 7);
          break;
        default:
          return null;
      }

      const pad = (n) => n.toString().padStart(2, "0");
      return `${pad(now.getDate())}-${pad(
        now.getMonth() + 1
      )}-${now.getFullYear()}`;
    };

    const result = {};

    nodes.forEach((node) => {
      const rawText = node.innerText;

      const authorMatch = rawText.match(/^([^\n]+?)\n/);
      const timeMatch = rawText.match(/([0-9]+\s?(хв|дн|год|тиж|хвилин))/i);

      const author = authorMatch?.[1]?.trim();
      const rawTime = timeMatch?.[0]?.trim();
      const date = rawTime ? parseRelativeTime(rawTime) : null;

      if (author && date) {
        if (!result[author]) {
          result[author] = { date, postCount: 1 };
        } else {
          result[author].postCount += 1;
        }
      }
    });

    return result;
  });

  await browser.close();
  return authorData;
};
