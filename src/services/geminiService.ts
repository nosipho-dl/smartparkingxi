import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || '' 
});

export interface ParkingSuggestion {
  bayId: string;
  reason: string;
  estimatedWalkingTime: string;
  convenienceScore: number;
}

export const getParkingSuggestion = async (
  zoneName: string,
  availableBays: { id: string; type: string; price: number; distance: string }[],
  userPreferences: string = "closest and cheapest"
): Promise<ParkingSuggestion | null> => {
  try {
    const prompt = `
      You are an advanced AI Parking Assistant for ScratchXI.
      Current Zone: ${zoneName}
      Available Bays: ${JSON.stringify(availableBays)}
      User Preferences: ${userPreferences}

      Analyze the available bays and recommend the absolute best one based on the user's preferences.
      Consider factors like:
      1. Proximity to the zone center.
      2. Price efficiency.
      3. Bay type suitability (e.g., standard vs premium).
      
      Return the recommendation in JSON format.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bayId: { type: Type.STRING, description: "The ID of the recommended bay (e.g., A-1)" },
            reason: { type: Type.STRING, description: "Professional, concise reason why this bay was chosen." },
            estimatedWalkingTime: { type: Type.STRING, description: "Estimated walk time from the bay (e.g., 2 mins)" },
            convenienceScore: { type: Type.NUMBER, description: "Score out of 100 representing how perfect this spot is." }
          },
          required: ["bayId", "reason", "estimatedWalkingTime", "convenienceScore"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    
    return JSON.parse(text) as ParkingSuggestion;
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return null;
  }
};
