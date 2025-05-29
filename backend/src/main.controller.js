import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const getActivity = async (req, res) => {
  const token = process.env.APIFY_TOKEN;
  const { groupIds, userNames, date, facebookCookie } = req.body;

  if (
    !Array.isArray(groupIds) ||
    groupIds.length === 0 ||
    !groupIds.every((id) => typeof id === "string")
  ) {
    return res
      .status(400)
      .json({ error: "'groupIds' must be an array of strings" });
  }

  if (
    !Array.isArray(userNames) ||
    userNames.length === 0 ||
    !userNames.every((name) => typeof name === "string")
  ) {
    return res
      .status(400)
      .json({ error: "'userNames' must be a non-empty array of strings" });
  }

  if (facebookCookie && (!facebookCookie.c_user || !facebookCookie.xs)) {
    return res
      .status(400)
      .json({ error: "'facebookCookie' must include both 'c_user' and 'xs'" });
  }

  let parsedDate = null;
  if (date) {
    const normalized = date.includes(".")
      ? date.split(".").reverse().join("-")
      : date;
    parsedDate = new Date(normalized);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid 'date' format" });
    }
  }

  const isoDate = parsedDate ? parsedDate.toISOString().slice(0, 10) : null;
  const result = Object.fromEntries(userNames.map((u) => [u, {}]));

  try {
    for (const groupId of groupIds) {
      const input = {
        resultsLimit: 100,
        startUrls: [{ url: `https://www.facebook.com/groups/${groupId}` }],
        viewOption: "CHRONOLOGICAL",
      };

      if (facebookCookie) {
        input.facebookCookie = {
          c_user: facebookCookie.c_user,
          xs: facebookCookie.xs,
        };
      }

      const runRes = await axios.post(
        `https://api.apify.com/v2/acts/apify~facebook-groups-scraper/runs?token=${token}`,
        input,
        { headers: { "Content-Type": "application/json" } }
      );

      const runId = runRes.data.data.id;

      let status = "RUNNING";
      let datasetId = null;
      let retries = 0;

      while (["RUNNING", "READY"].includes(status)) {
        const statusRes = await axios.get(
          `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
        );
        status = statusRes.data.data.status;
        datasetId = statusRes.data.data.defaultDatasetId;

        if (status === "SUCCEEDED") break;
        if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
          return res.status(500).json({
            error: `Actor failed for group ${groupId}`,
            status,
          });
        }

        if (++retries > 60) {
          return res.status(500).json({
            error: `Actor timeout for group ${groupId}`,
          });
        }

        await new Promise((r) => setTimeout(r, 5000));
      }

      const datasetRes = await axios.get(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`
      );

      const posts = datasetRes.data;

      userNames.forEach((user) => {
        const count = posts.filter((post) => {
          if (!post.time) return false;
          const time = new Date(post.time);
          if (isNaN(time.getTime())) return false;

          const postDate = time.toISOString().slice(0, 10);
          return post.user?.name === user && (!isoDate || postDate === isoDate);
        }).length;

        const groupTitle = posts[0]?.groupTitle || groupId;

        result[user][groupTitle] = {
          date: isoDate || null,
          count,
        };
      });
    }

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({
      error: "Unexpected error",
      details: e.message,
    });
  }
};
