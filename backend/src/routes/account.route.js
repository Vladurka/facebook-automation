import express from "express";
import {
  getAllAccounts,
  addAccount,
  deleteAccount,
  updateAccount,
} from "../controllers/account.controller.js";

const router = express.Router();

router.get("/", getAllAccounts);
router.post("/", addAccount);
router.delete("/:nickname", deleteAccount);
router.put("/", updateAccount);

export default router;
