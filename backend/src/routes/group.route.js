import express from "express";
import {
  getAllGroups,
  addGroup,
  deleteGroup,
} from "../controllers/group.controller.js";

const router = express.Router();

router.get("/", getAllGroups);
router.post("/", addGroup);
router.delete("/:id", deleteGroup);

export default router;
