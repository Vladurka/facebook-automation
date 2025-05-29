import express from "express";
import activityRoutes from "./routes/activity.route.js";
import groupRoutes from "./routes/group.route.js";
import { connectDB } from "./db.js";

const app = express();
const port = 5000;

app.use(express.json());

app.use("/api/activity", activityRoutes);
app.use("/api/groups", groupRoutes);

app.listen(port, () => {
  console.log("Server is running on port " + port);
  connectDB();
});
