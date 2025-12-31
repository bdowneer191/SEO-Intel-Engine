import { GoogleGenAI, Type } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // 1. CORS Handling
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

  // 2. Method Validation
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
      
      Return ONLY raw JSON.
    `;

    // 3. Define Schema using strict SDK Types
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        primaryKeyword: { type: Type.STRING },
        keywordDifficulty: { type: Type.NUMBER },
        intent: { type: Type.STRING },
        seoTitle: { type: Type.STRING },
        secondaryKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
        metaDescription: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        category: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["primaryKeyword", "seoTitle", "metaDescription"]
    };

    // 4. API Call with Correct Model ID
    // UPDATED: Using 'gemini-2.5-flash-lite' to fix 404/Deprecation error
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite', 
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.7,
      },
    });

    // 5. Robust Text Extraction
    // Attempts to get .text property first, falls back to candidate structure
    const responseText = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("Empty response from AI");
    }

    return new Response(responseText, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("API Error:", error);
    
    const errorMessage = error.message || "Internal Server Error";
    
    // Detailed error handling for quota (429) or model missing (404)
    const status = errorMessage.includes("429") ? 429 : (errorMessage.includes("404") ? 404 : 500);

    return new Response(JSON.stringify({ 
        error: errorMessage,
        details: status === 404 ? "Model deprecated/not found. Try updating model ID." : undefined
    }), {
      status: status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
