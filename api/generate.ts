import { GoogleGenAI, Schema, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";

export const config = {
  runtime: 'edge', 
};

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
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        tools: [{ googleSearch: {} }],
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
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

    // FIXED: .text is a getter, not a function()
    const text = response.text; 
    
    if (!text) throw new Error("Empty response from AI");

    const parsedData = JSON.parse(text);

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
