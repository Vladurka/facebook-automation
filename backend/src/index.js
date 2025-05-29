import express from "express";
import activityRoutes from "./routes/activity.route.js";
import groupRoutes from "./routes/group.route.js";
import { connectDB } from "./utils/db.js";
import { scrapeGroup } from "./utils/scraper.js";

const app = express();
const port = 5000;

app.use(express.json());

app.use("/api/activity", activityRoutes);
app.use("/api/groups", groupRoutes);

app.get("/api/scrape/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const posts = await scrapeGroup(id);
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.listen(port, () => {
  console.log("Server is running on port " + port);
  connectDB();
});
