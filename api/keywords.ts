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
  // 1. CORS Handling (Essential for frontend access)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

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

    // 2. Updated Model ID for 2026 Availability
    // Switched to 'gemini-2.5-flash-lite' to avoid 404s on retired models
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite', 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: keywordIdeasSchema,
        temperature: 0.7,
      }
    });

    // 3. Robust Text Extraction (Handles potential getter vs property differences)
    const text = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
        throw new Error("Empty response from AI");
    }

    return new Response(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Keywords API Error:", error);
    
    // 4. Detailed Error Handling
    const errorMessage = error.message || "Internal Server Error";
    const status = errorMessage.includes("429") ? 429 : (errorMessage.includes("404") ? 404 : 500);

    return new Response(JSON.stringify({ 
        error: errorMessage,
        details: status === 404 ? "Model deprecated/not found.
