import express from "express";
import { getUserActivity, getUserId } from "./main.controller.js";

const app = express();
const port = 5000;

app.use(express.json());

app.post("/api/activity", getUserActivity);
app.get("/api/myId", getUserId);

app.listen(port, () => {
  console.log("Server is running on port " + port);
});
