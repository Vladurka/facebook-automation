import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

axios.defaults.timeout = 10000;

export const getUserActivity = async (req, res) => {
  const { groupIds = [], userIds = [], date } = req.body;
  const accessToken = process.env.FB_ACCESS_TOKEN;

  if (!accessToken || groupIds.length === 0 || userIds.length === 0 || !date) {
    return res.status(400).json({
      success: false,
      error: "Missing groupIds, userIds, date, or FB_ACCESS_TOKEN in .env",
    });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return res.status(400).json({
      success: false,
      error: "Invalid date format. Use YYYY-MM-DD.",
    });
  }

  const startOfDay = new Date(`${date}T00:00:00Z`);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const sinceTimestamp = Math.floor(startOfDay.getTime() / 1000);

  const fetchGroupPosts = async (groupId) => {
    let allPosts = [];
    let url = `https://graph.facebook.com/v20.0/${groupId}/feed`;

    while (url) {
      try {
        const response = await axios.get(url, {
          params: {
            access_token: accessToken,
            fields: "id,from,message,created_time",
            since: sinceTimestamp,
            limit: 100,
          },
        });
        allPosts = allPosts.concat(response.data.data || []);
        url = response.data.paging?.next;
      } catch (error) {
        console.error(
          `Error fetching posts for group ${groupId}:`,
          error.response?.data?.error || error.message
        );
        break;
      }
    }
    return allPosts;
  };

  const activityReport = {};
  const errors = [];

  for (const userId of userIds) {
    activityReport[userId] = { totalPosts: 0, postsByGroup: {} };
    for (const groupId of groupIds) {
      activityReport[userId].postsByGroup[groupId] = 0;
    }
  }

  const groupPostsPromises = groupIds.map(async (groupId) => {
    const posts = await fetchGroupPosts(groupId);
    return { groupId, posts };
  });

  const groupPostsResults = await Promise.all(groupPostsPromises);

  for (const { groupId, posts } of groupPostsResults) {
    for (const post of posts) {
      const postDate = new Date(post.created_time);
      if (postDate >= startOfDay && postDate < endOfDay) {
        const userId = post.from?.id;
        if (userId && userIds.includes(userId)) {
          activityReport[userId].postsByGroup[groupId]++;
          activityReport[userId].totalPosts++;
        }
      }
    }
  }

  return res.status(200).json({
    success: true,
    date,
    report: activityReport,
    errors: errors.length > 0 ? errors : undefined,
  });
};

export const getUserId = async (req, res) => {
  const accessToken = process.env.FB_ACCESS_TOKEN;

  if (!accessToken) {
    return res
      .status(400)
      .json({ success: false, error: "FB_ACCESS_TOKEN is missing in .env" });
  }

  try {
    const response = await axios.get(
      `https://graph.facebook.com/v20.0/me?fields=id,name`,
      {
        params: { access_token: accessToken },
      }
    );

    return res.status(200).json({
      success: true,
      id: response.data.id,
      name: response.data.name,
    });
  } catch (error) {
    console.error(
      "Error fetching user ID:",
      error.response?.data?.error || error.message
    );
    return res.status(500).json({
      success: false,
      error:
        error.response?.data?.error?.message || "Failed to fetch user data",
    });
  }
};
