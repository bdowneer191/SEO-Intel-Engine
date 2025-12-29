
import { GoogleGenAI, Schema, Type, GenerateContentResponse } from "@google/genai";
import { SeoRequest, SeoResult, KeywordIdea, GroundingSource } from '../types';
import { SYSTEM_INSTRUCTION, AVAILABLE_CATEGORIES } from '../constants';

// Standardized SEO Response Schema
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    primaryKeyword: { type: Type.STRING },
    keywordDifficulty: { type: Type.NUMBER },
    intent: { type: Type.STRING },
    seoTitle: { type: Type.STRING },
    secondaryKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    metaDescription: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    category: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["primaryKeyword", "keywordDifficulty", "intent", "seoTitle", "secondaryKeywords", "metaDescription", "tags", "category"],
};

/**
 * GENERATE SEO DATA
 * Optimized for gemini-3-flash-preview with Search Grounding
 */
export const generateSeoData = async (request: SeoRequest): Promise<SeoResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Backend Error: API_KEY environment variable is not configured.");

  const ai = new GoogleGenAI({ apiKey });
  const categoriesString = AVAILABLE_CATEGORIES.join(', ');

  const prompt = `
    **TASK:** Elite SEO Analysis and Content Intelligence.
    **TOPIC:** "${request.topic}"
    **SOURCE CONTEXT:** "${request.context || 'N/A'}"
    **GEO:** "${request.geo || 'Global'}"
    **ALLOWED CATEGORIES:** [${categoriesString}]

    **INSTRUCTIONS:**
    1. Perform search grounding to find top current ranking titles.
    2. Create a UNIQUE SEO Title (don't copy context).
    3. Analyze Search Intent (Informational, Transactional, etc).
    4. Output metadata optimized for both Google and AI search engines.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        tools: [{ googleSearch: {} }],
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
        ],
      },
    });

    if (!response.candidates?.[0]) throw new Error("AI Engine returned no candidates. Try a less restrictive topic.");
    
    const candidate = response.candidates[0];
    if (candidate.finishReason !== 'STOP') throw new Error(`AI Blocked: ${candidate.finishReason}`);

    const text = response.text;
    if (!text) throw new Error("AI returned empty result. Potential safety filter trigger.");

    const parsed = JSON.parse(text);

    // Extraction logic for Grounding Sources
    const groundingChunks = candidate.groundingMetadata?.groundingChunks;
    const groundingSources: GroundingSource[] = groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Search Result',
      uri: chunk.web?.uri || ''
    })).filter((s: GroundingSource) => s.uri !== '') || [];
    
    return {
      ...parsed,
      groundingSources: groundingSources.length > 0 ? groundingSources : undefined,
    };
  } catch (error: any) {
    console.error("Gemini Critical Error:", error);
    throw new Error(error.message || "SEO Generation failed.");
  }
};

/**
 * KEYWORD RESEARCH SUGGESTIONS
 */
export const generateKeywordIdeas = async (topic: string): Promise<KeywordIdea[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY missing.");

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Research 6-8 "Easy Win" high-potential keyword variations for: "${topic}". Include Intent, Difficulty (0-100), and Volume (High/Niche). Output JSON.`;

  const researchSchema: Schema = {
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: researchSchema,
        temperature: 0.7,
      }
    });

    const parsed = JSON.parse(response.text);
    return parsed.ideas || [];
  } catch (error) {
    console.error("Research Engine Failed:", error);
    return [];
  }
};
