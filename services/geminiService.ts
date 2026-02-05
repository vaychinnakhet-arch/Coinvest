import { AppState } from "../types";

// AI features are temporarily disabled to prevent loading issues.
export const analyzeFinances = async (data: AppState): Promise<string> => {
  console.warn("AI Analysis is currently disabled.");
  return "ระบบ AI ถูกปิดใช้งานชั่วคราว";
};