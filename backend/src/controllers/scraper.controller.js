import { chromium } from "playwright";

export const scrapeGroup = async (req, res) => {
  console.clear();
  const { groupIds, userNames, date, cookies } = req.body;

  if (
    !Array.isArray(groupIds) ||
    groupIds.some((id) => typeof id !== "string")
  ) {
    return res.status(400).json({ error: "Invalid or missing 'groupIds'" });
  }
  if (
    !Array.isArray(userNames) ||
    userNames.some((n) => typeof n !== "string")
  ) {
    return res.status(400).json({ error: "Invalid or missing 'userNames'" });
  }
  if (date && isNaN(new Date(date).getTime())) {
    return res
      .status(400)
      .json({ error: "Invalid date format. Use YYYY-MM-DD" });
  }
  if (!cookies?.c_user || !cookies?.xs) {
    return res
      .status(400)
      .json({ error: "Missing required Facebook cookies: 'c_user' and 'xs'" });
  }

  const result = {};
  const userList = userNames.map((u) => u.trim());
  const filterDate = date ? new Date(date) : null;

  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      slowMo: 100,
    });
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: "c_user",
        value: cookies.c_user,
        domain: ".facebook.com",
        path: "/",
        httpOnly: true,
        secure: true,
      },
      {
        name: "xs",
        value: cookies.xs,
        domain: ".facebook.com",
        path: "/",
        httpOnly: true,
        secure: true,
      },
    ]);

    const page = await context.newPage();

    for (const groupId of groupIds) {
      await page.goto(`https://www.facebook.com/groups/${groupId}`, {
        waitUntil: "domcontentloaded",
      });

      await page.evaluate(() => {
        document.body.style.zoom = "0.75";
      });

      const seenPosts = new Set();
      const counts = new Map();

      let prevHeight = 0;
      let repeats = 0;
      let reachedLimit = false;

      while (!reachedLimit && repeats < 5) {
        const posts = await page.$$eval('div[role="article"]', (nodes) => {
          const parseRelativeTime = (text) => {
            const now = new Date();
            const match = text.match(/(\d+)\s?(хв|год|дн|тиж)/i);
            if (!match) return null;

            const value = Number(match[1]);
            const unit = match[2].toLowerCase();

            switch (unit) {
              case "хв":
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
            return now.getTime();
          };

          return nodes.map((node) => {
            const rawText = node.innerText ?? "";
            const authorMatch = rawText.match(/^([^\n]+?)\n/);
            const timeMatch = rawText.match(/([0-9]+\s?(хв|дн|год|тиж))/i);

            return {
              content: rawText.trim(),
              author: authorMatch?.[1]?.trim() ?? null,
              ts: timeMatch ? parseRelativeTime(timeMatch[0]) : null,
            };
          });
        });

        for (const post of posts) {
          const { content, author, ts } = post;
          const postDate = ts ? new Date(ts) : null;

          if (filterDate && postDate && postDate < filterDate) {
            reachedLimit = true;
            break;
          }

          if (!content || content.length < 30) continue;
          if (!author || !userList.includes(author)) continue;

          if (!seenPosts.has(content)) {
            seenPosts.add(content);
            if (!counts.has(author)) counts.set(author, {});
            counts.get(author)[groupId] =
              (counts.get(author)[groupId] || 0) + 1;
          }
        }

        if (reachedLimit) break;

        await page.mouse.wheel(0, 2000);
        await page.waitForTimeout(1200);

        const currentHeight = await page.evaluate(
          () => document.body.scrollHeight
        );
        if (currentHeight === prevHeight) {
          repeats += 1;
        } else {
          prevHeight = currentHeight;
          repeats = 0;
        }
      }

      for (const user of userList) {
        if (!result[user]) result[user] = {};
        result[user][groupId] = counts.get(user)?.[groupId] || 0;
      }
    }

    await browser.close();

    return res.status(200).json({
      date: filterDate ? filterDate.toISOString().split("T")[0] : null,
      result,
    });
  } catch (error) {
    if (browser) await browser.close();
    console.error("❌ Scraping error:", error);
    return res.status(500).json({
      error: "Internal server error during scraping",
      details: error.message,
    });
  }
};

export const postToGroups = async (req, res) => {
  const { groupIds, message, cookies } = req.body;

  // Валідація вхідних даних
  if (
    !Array.isArray(groupIds) ||
    groupIds.some((id) => typeof id !== "string")
  ) {
    return res.status(400).json({ error: "Invalid or missing 'groupIds'" });
  }
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Missing or invalid 'message'" });
  }
  if (!cookies?.c_user || !cookies?.xs) {
    return res.status(400).json({ error: "Missing required Facebook cookies" });
  }

  let browser;
  const posted = [];

  try {
    browser = await chromium.launch({ headless: false, slowMo: 100 });
    const context = await browser.newContext();

    // Додаємо Facebook cookies
    await context.addCookies([
      {
        name: "c_user",
        value: cookies.c_user,
        domain: ".facebook.com",
        path: "/",
        httpOnly: true,
        secure: true,
      },
      {
        name: "xs",
        value: cookies.xs,
        domain: ".facebook.com",
        path: "/",
        httpOnly: true,
        secure: true,
      },
    ]);

    const page = await context.newPage();

    for (const groupId of groupIds) {
      try {
        await page.goto(`https://www.facebook.com/groups/${groupId}`, {
          waitUntil: "domcontentloaded",
        });

        await page.waitForTimeout(3000);
        await page.mouse.wheel(0, 800);
        await page.waitForTimeout(2000);

        const postBoxTrigger = await page
          .locator('div[role="button"]:has(div:has-text("Напишіть щось"))')
          .first();

        if (!(await postBoxTrigger.isVisible())) {
          throw new Error("Active field 'Write something' not found");
        }

        await postBoxTrigger.click();

        await page.waitForTimeout(1000);

        await page.keyboard.type(message, { delay: 20 });

        await page.waitForTimeout(1000);

        const publishBtn = await page
          .locator('div[aria-label="Опублікувати"]')
          .first();
        if (!(await publishBtn.isVisible())) {
          throw new Error("Button 'Publish' не знайдено");
        }

        await publishBtn.click();
        await page.waitForTimeout(3000);

        posted.push({ groupId, status: "success" });
      } catch (err) {
        posted.push({ groupId, status: "failed", error: err.message });
      }
    }

    await browser.close();
    return res.status(200).json({ success: true });
  } catch (err) {
    if (browser) await browser.close();
    return res.status(500).json({
      error: "Failed to post to groups",
      details: err.message,
    });
  }
};
