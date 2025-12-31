// api/generate.ts
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
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
      
      Return ONLY raw JSON with the following structure:
      {
        "primaryKeyword": "string",
        "keywordDifficulty": number (0-100),
        "intent": "string (Informational/Transactional/Navigational/Commercial)",
        "seoTitle": "string (55-65 chars)",
        "secondaryKeywords": ["string"],
        "metaDescription": "string (150-155 chars)",
        "tags": ["string"],
        "category": ["string"]
      }
    `;

    // Define Schema
    const responseSchema = {
      type: "OBJECT",
      properties: {
        primaryKeyword: { type: "STRING" },
        keywordDifficulty: { type: "NUMBER" },
        intent: { type: "STRING" },
        seoTitle: { type: "STRING" },
        secondaryKeywords: { type: "ARRAY", items: { type: "STRING" } },
        metaDescription: { type: "STRING" },
        tags: { type: "ARRAY", items: { type: "STRING" } },
        category: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["primaryKeyword", "seoTitle", "metaDescription"]
    };

    // Correct API call using the models property with full model version
    const result = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    // Access the response text
    const responseText = result.text;

    if (!responseText) {
      throw new Error("Empty response from AI");
    }

    return new Response(responseText, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("API Error:", error);
    
    const errorMessage = error.message || "Internal Server Error";
    const status = errorMessage.includes("429") ? 429 : 500;

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
