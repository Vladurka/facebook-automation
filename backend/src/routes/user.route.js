import express from "express";
import {
  getAllUsers,
  addUser,
  deleteUser,
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/", getAllUsers);
router.post("/", addUser);
router.delete("/:nickname", deleteUser);

export default router;
