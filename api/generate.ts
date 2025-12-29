import { GoogleGenAI, Schema, Type } from "@google/genai";

export const config = {
  runtime: 'edge', // Uses Edge Runtime to avoid 10s Serverless timeout
};

// Define Schema (Duplicated here to keep API self-contained)
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    primaryKeyword: { type: Type.STRING },
    keywordDifficulty: { type: Type.NUMBER },
    seoTitle: { type: Type.STRING },
    secondaryKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    metaDescription: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    category: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["primaryKeyword", "keywordDifficulty", "seoTitle", "secondaryKeywords", "metaDescription", "tags", "category"],
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { topic, context, geo, contentType } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Server Config Error: API Key missing' }), { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Dynamic prompt construction
    const prompt = `
      **TASK:** Elite SEO Analysis for content type: "${contentType || 'Blog'}".
      **TOPIC:** "${topic}"
      **CONTEXT:** "${context || 'N/A'}"
      **GEO:** "${geo || 'Global'}"
      
      **INSTRUCTIONS:**
      1. Simulate a Google Search to find competitors.
      2. Generate a UNIQUE, high-CTR SEO Title (never copy the context).
      3. Analyze Search Intent and optimize metadata accordingly.
      4. Return pure JSON matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', // Upgraded to 2.0 Flash for speed/cost or keep 'gemini-1.5-flash'
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        tools: [{ googleSearch: {} }], // Search Grounding enabled
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      },
    });

    const candidate = response.candidates?.[0];
    
    // Extract Grounding Metadata
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
    const groundingSources = groundingChunks.map((chunk: any) => ({
      title: chunk.web?.title || 'Search Result',
      uri: chunk.web?.uri || ''
    })).filter((s: any) => s.uri);

    const text = response.text();
    if (!text) throw new Error("Empty response from AI");

    const parsedData = JSON.parse(text);

    // Return combined data
    return new Response(JSON.stringify({
      ...parsedData,
      groundingSources
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: error.message || 'Generation failed' }), { status: 500 });
  }
}
