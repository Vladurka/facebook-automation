import express from "express";
import activityRoutes from "./routes/activity.route.js";
import scraperRoutes from "./routes/scraper.route.js";
import groupRoutes from "./routes/group.route.js";
import userRoutes from "./routes/user.route.js";
import accountRoutes from "./routes/account.route.js";
import { connectDB } from "./utils/db.js";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());

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
