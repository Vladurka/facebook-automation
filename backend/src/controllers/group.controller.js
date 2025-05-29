import { Group } from "../models/group.model.js";

export const getAllGroups = async (req, res) => {
  const groups = await Group.find();
  res.status(200).json(groups.map((group) => group.id));
};

export const addGroup = async (req, res) => {
  const { id } = req.body;
  const group = await Group.create({ id });
  res.status(201).json(group);
};

export const deleteGroup = async (req, res) => {
  const { id } = req.params;
  const group = await Group.deleteOne({ id });
  res.status(200).json(group);
};
