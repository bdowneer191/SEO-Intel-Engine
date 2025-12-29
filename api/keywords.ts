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
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Generate 6-8 high-potential "Easy Win" SEO keyword variations for: "${topic}".`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: keywordIdeasSchema,
        temperature: 0.7,
      }
    });

    // FIXED: .text is a getter, not a function()
    const text = response.text;
    
    return new Response(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
