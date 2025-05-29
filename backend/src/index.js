import express from "express";
import { getActivity } from "./main.controller.js";

const app = express();
const port = 5000;

app.use(express.json());

app.post("/api/activity", getActivity);

app.listen(port, () => {
  console.log("Server is running on port " + port);
});
