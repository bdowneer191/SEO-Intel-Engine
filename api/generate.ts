// api/generate.ts
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge', // Use Edge to avoid 10s timeouts
};

export default async function handler(req) {
  // 1. Handle CORS (Optional but good for debugging)
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
    const { topic, context, geo, contentType } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing API Key on Server");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // IMPORTANT: Switched to 1.5-flash for better Stability/Limits on Free Tier
    const modelId = 'gemini-1.5-flash'; 

    const systemInstruction = `
      You are an Elite SEO Strategist. Generate unique, high-CTR metadata.
      Strictly follow the JSON schema provided.
    `;

    const prompt = `
      Generate SEO metadata for:
      Topic: "${topic}"
      Context: "${context || 'N/A'}"
      Geo: "${geo || 'USA'}"
      Type: "${contentType || 'Blog'}"
      
      Return ONLY raw JSON.
    `;

    // Define Schema (simplified for brevity, ensure matches your types)
    const responseSchema = {
      type: "OBJECT",
      properties: {
        primaryKeyword: { type: "STRING" },
        keywordDifficulty: { type: "NUMBER" },
        seoTitle: { type: "STRING" },
        secondaryKeywords: { type: "ARRAY", items: { type: "STRING" } },
        metaDescription: { type: "STRING" },
        tags: { type: "ARRAY", items: { type: "STRING" } },
        category: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["primaryKeyword", "seoTitle", "metaDescription"]
    };

    const result = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const responseText = result.candidates[0]?.content?.parts[0]?.text;

    if (!responseText) {
      throw new Error("Empty response from AI");
    }

    return new Response(responseText, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("API Error:", error);
    
    // Return the actual error message to the frontend for debugging
    const errorMessage = error.message || "Internal Server Error";
    const status = errorMessage.includes("429") ? 429 : 500;

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
