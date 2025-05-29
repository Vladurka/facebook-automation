import express from "express";
import { getAllActivity } from "../controllers/activity.controller.js";

const router = express.Router();

router.post("/", getAllActivity);

export default router;
