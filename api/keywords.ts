import { GoogleGenAI, Schema, Type } from "@google/genai";

export const config = {
  runtime: 'edge',
};

const keywordIdeasSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    ideas: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          keyword: { type: Type.STRING },
          intent: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          volume: { type: Type.STRING }
        },
        required: ["keyword", "intent", "difficulty", "volume"]
      }
    }
  }
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { topic } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("Missing API Key");
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Generate 6-8 high-potential "Easy Win" SEO keyword variations for: "${topic}".
    
    Provide a mix of:
    - Long-tail variations
    - Question-based keywords
    - "How to" variations
    - Related topics
    
    Return ONLY valid JSON matching this structure:
    {
      "ideas": [
        {
          "keyword": "example keyword phrase",
          "intent": "Informational",
          "difficulty": "Low",
          "volume": "Medium"
        }
      ]
    }`;

    // Use the correct API structure with full model version
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-latest',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: keywordIdeasSchema,
        temperature: 0.7,
      }
    });

    // Access text property directly
    const text = response.text;
    
    return new Response(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Keywords API Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
