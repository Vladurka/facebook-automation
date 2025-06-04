import axios from "axios";
import FormData from "form-data";
import dotenv from "dotenv";

dotenv.config();

export const sendFileToTelegram = async (fileContent, filename) => {
  try {
    const form = new FormData();
    form.append("chat_id", process.env.TELEGRAM_CHAT_ID);
    form.append("document", fileContent, {
      filename,
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const res = await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendDocument`,
      form,
      { headers: form.getHeaders() }
    );
  } catch (error) {
    console.error("❌ Failed to send file:");
  }
};

export const sendMessageToTelegram = async (message) => {
  try {
    await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage?chat_id=${process.env.TELEGRAM_CHAT_ID}&text=${message}`
    );
  } catch (error) {
    console.error("❌ Failed to send message:" + message);
  }
};
