

import { GoogleGenAI } from "@google/genai";
import { Customer, DailyLog } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getDairyInsights(customers: Customer[], logs: DailyLog[]) {
  // Use gemini-3-pro-preview for complex Reasoning and business analysis tasks
  const model = 'gemini-3-pro-preview';
  
  const dataSummary = {
    totalCustomers: customers.length,
    activeCustomers: customers.filter(c => c.status === 'active').length,
    logsCount: logs.length,
    // Fix: Access the correct 'liters' property as defined in the DailyLog interface on line 15
    totalMilkThisMonth: logs.reduce((sum, log) => sum + log.liters, 0)
  };

  const prompt = `
    Act as a professional dairy farm consultant. 
    Based on the following data summary: ${JSON.stringify(dataSummary)}, 
    and detailed logs for the past few entries, provide:
    1. A brief business health check.
    2. Recommendations for increasing efficiency.
    3. Any anomalies detected in milk consumption.
    Keep the tone professional, encouraging, and concise. Format with bullet points.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    // Property access is correct according to guidelines
    return response.text;
  } catch (error) {
    console.error("AI Insights Error:", error);
    return "Unable to generate insights at this time. Please check your data or try again later.";
  }
}
