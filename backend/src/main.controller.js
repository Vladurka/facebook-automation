import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const getActivity = async (req, res) => {
  const token = process.env.APIFY_TOKEN;
  const { groupId, userNames, date } = req.body;

  if (!groupId || typeof groupId !== "string") {
    return res.status(400).json({ error: "'groupId' must be a valid string" });
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

  try {
    const runResponse = await axios.post(
      `https://api.apify.com/v2/acts/apify~facebook-groups-scraper/runs?token=${token}`,
      {
        resultsLimit: 1000,
        startUrls: [
          {
            url: `https://www.facebook.com/groups/${groupId}`,
          },
        ],
        viewOption: "CHRONOLOGICAL",
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const runId = runResponse.data.data.id;

    let status = "RUNNING";
    let datasetId = null;
    let retries = 0;

    while (["RUNNING", "READY"].includes(status)) {
      const statusResponse = await axios.get(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
      );
      status = statusResponse.data.data.status;
      datasetId = statusResponse.data.data.defaultDatasetId;

      if (status === "SUCCEEDED") break;
      if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
        return res.status(500).json({ error: `Actor failed: ${status}` });
      }

      if (++retries > 60) {
        return res.status(500).json({ error: "Actor run timed out" });
      }

      await new Promise((r) => setTimeout(r, 5000));
    }

    const datasetRes = await axios.get(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`
    );

    const posts = datasetRes.data;
    const isoDate = parsedDate ? parsedDate.toISOString().slice(0, 10) : null;

    const result = {};

    for (const name of userNames) {
      const userPosts = posts.filter((post) => {
        const postDate = new Date(post.time).toISOString().slice(0, 10);
        const author = post.user?.name;
        return author === name && (!isoDate || postDate === isoDate);
      });

      result[name] = {
        date: isoDate || null,
        count: userPosts.length,
      };
    }

    return res.status(200).json(result);
  } catch (e) {
    return res
      .status(500)
      .json({ error: "Unexpected error", details: e.message });
  }
};
