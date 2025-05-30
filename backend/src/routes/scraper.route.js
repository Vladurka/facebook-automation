import express from "express";
import { scrapeGroup } from "../controllers/scraper.controller.js";

const router = express.Router();

router.post("/", scrapeGroup);

export default router;
