import express from "express";
import activityRoutes from "./routes/activity.route.js";
import scraperRoutes from "./routes/scraper.route.js";
import groupRoutes from "./routes/group.route.js";
import userRoutes from "./routes/user.route.js";
import accountRoutes from "./routes/account.route.js";
import { connectDB } from "./utils/db.js";

const app = express();
const port = 5000;

app.use(express.json());

app.use("/api/activity", activityRoutes);
app.use("/api/scraper", scraperRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/users", userRoutes);
app.use("/api/accounts", accountRoutes);

app.listen(port, () => {
  console.log("Server is running on port " + port);
  connectDB();
});
