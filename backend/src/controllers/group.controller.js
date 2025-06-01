import { Group } from "../models/group.model.js";

export const getAllGroups = async (req, res) => {
  try {
    const groups = await Group.find();
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addGroup = async (req, res) => {
  try {
    const { id, name } = req.body;
    const group = await Group.create({ id, name });
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group.deleteOne({ id });
    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
