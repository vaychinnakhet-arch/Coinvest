import { GoogleGenAI } from "@google/genai";
import { AppState, TransactionType } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const analyzeFinances = async (data: AppState): Promise<string> => {
  const client = getClient();
  if (!client) return "กรุณาตั้งค่า API Key เพื่อใช้งาน AI Analysis";

  // Prepare a summary string for the prompt
  const projectSummaries = data.projects.map(p => {
    const txs = data.transactions.filter(t => t.projectId === p.id);
    const income = txs.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const expense = txs.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    const investment = txs.filter(t => t.type === TransactionType.INVESTMENT).reduce((acc, t) => acc + t.amount, 0);
    return `Project: ${p.name}, Status: ${p.status}, Income: ${income}, Expense: ${expense}, Investment: ${investment}`;
  }).join('\n');

  const totalInvestment = data.transactions
    .filter(t => t.type === TransactionType.INVESTMENT)
    .reduce((acc, t) => acc + t.amount, 0);

  const prompt = `
    Analyze the following investment portfolio data and provide a concise, insightful summary in Thai language.
    Focus on ROI, risk warnings, and suggestions for improvement.
    Keep the tone professional yet encouraging.
    
    Overall Stats:
    Total Investment: ${totalInvestment}
    
    Projects:
    ${projectSummaries}
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Speed over deep thought for simple analysis
      }
    });
    return response.text || "ไม่สามารถวิเคราะห์ข้อมูลได้ในขณะนี้";
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI";
  }
};