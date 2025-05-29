import axios from "axios";
import dotenv from "dotenv";
import pLimit from "p-limit";
import { Group } from "../models/group.model.js";
import { Actor } from "../models/actor.model.js";

dotenv.config();

const token = process.env.APIFY_TOKEN;
const limit = pLimit(5);
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const FIFTEEN_MINUTES = 15 * 60 * 1000;

const _waitForRunCompletion = async (runId) => {
  let retries = 0;
  while (retries < 60) {
    const { data } = await axios.get(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${token}`
    );

    const { status, defaultDatasetId } = data.data;

    if (status === "SUCCEEDED") return defaultDatasetId;
    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
      throw new Error(`Run failed with status: ${status}`);
    }

    await delay(5000);
    retries++;
  }

  throw new Error("Run timeout");
};

const _getOrCreateActorRun = async (groupId) => {
  const existing = await Actor.findOne({ groupId });

  if (existing) {
    const age = Date.now() - new Date(existing.createdAt).getTime();
    if (age < FIFTEEN_MINUTES) {
      return existing.id;
    }

    await Actor.deleteOne({ _id: existing._id });
  }

  const input = {
    resultsLimit: 100,
    startUrls: [{ url: `https://www.facebook.com/groups/${groupId}` }],
    viewOption: "CHRONOLOGICAL",
  };

  const runRes = await axios.post(
    `https://api.apify.com/v2/acts/apify~facebook-groups-scraper/runs?token=${token}`,
    input,
    { headers: { "Content-Type": "application/json" } }
  );

  const runId = runRes.data.data.id;

  await Actor.create({ id: runId, groupId });
  return runId;
};

const countUserPosts = (posts, userName, isoDate) =>
  posts.filter((post) => {
    if (!post.time) return false;
    const postTime = new Date(post.time);
    if (isNaN(postTime)) return false;
    const postDate = postTime.toISOString().slice(0, 10);
    return post.user?.name === userName && (!isoDate || postDate === isoDate);
  }).length;

export const getAllActivity = async (req, res) => {
  const { userNames, date, groupIds: incomingGroupIds } = req.body;

  let groupIds = incomingGroupIds;

  if (!Array.isArray(groupIds) || groupIds.length === 0) {
    const groupDocs = await Group.find().select("id -_id");
    groupIds = groupDocs.map((g) => g.id);
  }

  if (
    !Array.isArray(groupIds) ||
    groupIds.length === 0 ||
    !groupIds.every((id) => typeof id === "string")
  ) {
    return res
      .status(400)
      .json({ error: "'groupIds' must be a non-empty array of strings" });
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

  const isoDate = parsedDate ? parsedDate.toISOString().slice(0, 10) : null;
  const result = Object.fromEntries(userNames.map((u) => [u, {}]));

  try {
    const runResults = await Promise.all(
      groupIds.map((groupId) =>
        limit(async () => {
          const runId = await _getOrCreateActorRun(groupId);
          const datasetId = await _waitForRunCompletion(runId);
          return { groupId, datasetId };
        })
      )
    );

    await Promise.all(
      runResults.map(({ groupId, datasetId }) =>
        limit(async () => {
          const datasetRes = await axios.get(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`
          );

          const posts = datasetRes.data;
          const groupTitle = posts[0]?.groupTitle || groupId;

          userNames.forEach((user) => {
            const count = countUserPosts(posts, user, isoDate);
            result[user][groupTitle] = {
              date: isoDate || null,
              count,
            };
          });
        })
      )
    );

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({
      error: "Unexpected error",
      details: e.message,
    });
  }
};
