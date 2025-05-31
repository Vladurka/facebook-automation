import { chromium } from "playwright";

export const scrapeGroup = async (req, res) => {
  const { groupId, cookies } = req.body;

  if (typeof groupId !== "string" || !cookies?.c_user || !cookies?.xs) {
    return res.status(400).json({ error: "Invalid input" });
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
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
    await page.goto(`https://www.facebook.com/groups/${groupId}`, {
      waitUntil: "domcontentloaded",
    });

    await page.evaluate(() => {
      document.body.style.zoom = "0.75";
    });

    const postMap = new Map();
    let prevHeight = 0;
    let repeats = 0;

    while (repeats < 5) {
      const posts = await page.$$eval('div[role="article"]', (nodes) =>
        nodes.map((node) => {
          const content = node.innerText?.trim() ?? "";
          const author =
            node.querySelector("strong a, h2 a")?.innerText?.trim() ??
            content.match(/^([^\n]+)\n/)?.[1]?.trim() ??
            null;
          return { content, author };
        })
      );

      for (const { content, author } of posts) {
        if (content && content.length > 30 && author && !postMap.has(content)) {
          postMap.set(content, author);
        }
      }

      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(1200);

      const currentHeight = await page.evaluate(
        () => document.body.scrollHeight
      );
      if (currentHeight === prevHeight) {
        repeats++;
      } else {
        prevHeight = currentHeight;
        repeats = 0;
      }
    }

    await browser.close();

    const result = Array.from(postMap.entries()).map(([content, author]) => ({
      author,
      content,
    }));

    return res.status(200).json({ posts: result });
  } catch (error) {
    if (browser) await browser.close();
    return res.status(500).json({ error: error.message });
  }
};
