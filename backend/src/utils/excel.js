import ExcelJS from "exceljs";
import { sendFileToTelegram } from "./telegram.js";

export const saveResultToExcel = async (result, date = null) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Group Activity");

  const users = Object.keys(result);
  const groupSet = new Set();

  users.forEach((user) => {
    Object.keys(result[user]).forEach((group) => groupSet.add(group));
  });

  const groups = Array.from(groupSet);
  worksheet.addRow(["User", ...groups]);

  for (const user of users) {
    const row = [user];
    for (const group of groups) {
      row.push(result[user][group] || 0);
    }
    worksheet.addRow(row);
  }

  const fileName = `${date || Date.now()}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  await sendFileToTelegram(buffer, fileName);
};
