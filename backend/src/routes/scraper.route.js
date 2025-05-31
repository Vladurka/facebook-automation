import express from "express";
import {
  scrapeGroup,
  postToGroups,
} from "../controllers/scraper.controller.js";

const router = express.Router();

router.post("/get", scrapeGroup);
router.post("/post", postToGroups);
export default router;
