import axios from "axios";
import dotenv from "dotenv";
import pLimit from "p-limit";
import { Group } from "../models/group.model.js";
import { Actor } from "../models/actor.model.js";
import { User } from "../models/user.model.js";

dotenv.config();

const token = process.env.APIFY_TOKEN;
const treadLimit = pLimit(5);
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const THIRTY_MINUTES = 30 * 60 * 1000;

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

const _getOrCreateActorRun = async (groupId, limit) => {
  const existing = await Actor.findOne({ groupId });

  if (existing?.createdAt) {
    const age = Date.now() - new Date(existing.createdAt).getTime();
    if (age < THIRTY_MINUTES) return existing.id;
    await Actor.deleteOne({ groupId });
  }

  const input = {
    resultsLimit: limit,
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
    if (!post.time || post.user?.name !== userName) return false;

    const postTime = new Date(post.time);
    if (isNaN(postTime)) return false;

    const postDate = postTime.toISOString().slice(0, 10);
    return !isoDate || postDate === isoDate;
  }).length;

export const getAllActivity = async (req, res) => {
  const {
    userNames: inputUserNames,
    date,
    groupIds: incomingGroupIds,
    limit = 20,
  } = req.body;

  try {
    const groupIds =
      Array.isArray(incomingGroupIds) && incomingGroupIds.length > 0
        ? incomingGroupIds
        : (await Group.find().select("id -_id")).map((u) => u.id);

    const userNames =
      Array.isArray(inputUserNames) && inputUserNames.length > 0
        ? inputUserNames
        : (await User.find().select("nickname -_id")).map((u) => u.nickname);

    let isoDate = null;
    if (date) {
      const normalized = date.includes(".")
        ? date.split(".").reverse().join("-")
        : date;
      const parsed = new Date(normalized);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: "Invalid 'date' format" });
      }
      isoDate = parsed.toISOString().slice(0, 10);
    }

    const result = Object.fromEntries(userNames.map((u) => [u, {}]));

    const runResults = await Promise.all(
      groupIds.map((groupId) =>
        treadLimit(async () => {
          const runId = await _getOrCreateActorRun(groupId, limit);
          const datasetId = await _waitForRunCompletion(runId);
          return { groupId, datasetId };
        })
      )
    );

    await Promise.all(
      runResults.map(({ groupId, datasetId }) =>
        treadLimit(async () => {
          const { data: posts } = await axios.get(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&clean=true`
          );

          if (!Array.isArray(posts)) throw new Error("Invalid dataset format");

          const groupTitle = posts[0]?.groupTitle || groupId;

          for (const user of userNames) {
            result[user][groupTitle] = countUserPosts(posts, user, isoDate);
          }
        })
      )
    );

    return res.status(200).json({ date: isoDate, result });
  } catch (e) {
    console.error("Activity fetch error:", e);
    return res.status(500).json({
      error: "Unexpected error",
      details: e.message,
    });
  }
};
