
import { GoogleGenAI, Type } from "@google/genai";
import { Quest } from '../types';

const apiKey = process.env.API_KEY || '';

// Initialize only if key exists to avoid runtime crash, though app logic handles it.
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateQuest = async (playerLevel: number, currentBiome: string): Promise<Quest> => {
  if (!ai) {
    return {
      title: "연결 오류",
      description: "정령들의 목소리가 들리지 않습니다. (API 키 누락)",
      isActive: true,
      rewardExp: 0,
      isCompleted: false
    };
  }

  try {
    const model = 'gemini-2.5-flash';
    // Prompt asking for Korean output
    const prompt = `Create a short, funny RPG quest for a level ${playerLevel} player in the ${currentBiome} area. 
    The language MUST be Korean (Hangul).
    The quest should sound like it comes from a wise but slightly crazy old wizard.
    Keep the description under 30 words.`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            rewardExp: { type: Type.INTEGER }
          },
          required: ["title", "description", "rewardExp"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text returned");

    const data = JSON.parse(text);
    
    return {
      title: data.title,
      description: data.description,
      rewardExp: Math.min(data.rewardExp, playerLevel * 100), // Cap exp to reasonable amount
      isActive: true,
      isCompleted: false
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      title: "공허의 침묵",
      description: "지금은 퀘스트가 생각나지 않는구나. 나중에 다시 오게나!",
      isActive: true,
      rewardExp: 10,
      isCompleted: false
    };
  }
};