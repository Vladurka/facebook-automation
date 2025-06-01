import { Account } from "../models/account.model.js";

export const getAllAccounts = async (req, res) => {
  try {
    const accounts = await Account.find();
    res.status(200).json(accounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addAccount = async (req, res) => {
  try {
    const { nickname, c_user, xs } = req.body;
    const account = await Account.create({ nickname, c_user, xs });
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { nickname } = req.params;
    const account = await Account.deleteOne({ nickname });
    res.status(200).json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateAccount = async (req, res) => {
  try {
    const { nickname, c_user, xs } = req.body;
    const account = await Account.findOneAndUpdate(
      { nickname },
      { c_user, xs },
      { new: true }
    );
    res.status(200).json(account);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
