import { GoogleGenAI, Schema, Type } from "@google/genai";
import { SeoRequest, SeoResult, KeywordIdea } from '../types';
import { SYSTEM_INSTRUCTION, AVAILABLE_CATEGORIES } from '../constants';

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    primaryKeyword: {
      type: Type.STRING,
      description: "One single targeted keyword.",
    },
    keywordDifficulty: {
      type: Type.NUMBER,
      description: "Estimated difficulty (0-100).",
    },
    seoTitle: {
      type: Type.STRING,
      description: "One keyword targeted relevant title. Unique. No slang.",
    },
    secondaryKeywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "5-6 comma separated secondary keywords.",
    },
    metaDescription: {
      type: Type.STRING,
      description: "One keyword targeted 155 character meta description.",
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "4-5 comma separated tags.",
    },
    category: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "1 or 2 relevant categories from the provided list.",
    }
  },
  required: ["primaryKeyword", "keywordDifficulty", "seoTitle", "secondaryKeywords", "metaDescription", "tags", "category"],
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

export const generateSeoData = async (request: SeoRequest): Promise<SeoResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set it in the environment.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const categoriesString = AVAILABLE_CATEGORIES.join(', ');

  // The User's Specific Prompt
  const prompt = `
    **TASK:** Analyze the following topic and generate strategic, unique, and SEO-friendly metadata. 
    Simulate a search for top ranking pages to ensure the new title is competitive and unique.
    
    **INPUTS:**
    *   **Topic:** "${request.topic}"
    *   **Context/Source Title:** "${request.context || 'N/A'}"
    *   **Geo:** "${request.geo || 'Global'}"

    **REQUIREMENTS:**
    1.  **Primary Keyword:** One main target keyword.
    2.  **SEO Title:** One keyword-targeted, relevant, and catchy title. 
        *   Avoid derogatory nicknames or slang.
        *   Make it meaningful.
        *   **NEVER** use the exact same title as the source/context provided.
    3.  **Secondary Keywords:** 5-6 comma-separated secondary keywords (LSI).
    4.  **Meta Description:** Compelling, click-worthy description (max 155 chars).
    5.  **Tags:** 4-5 comma-separated tags.
    6.  **Category:** Choose 1 or 2 relevant categories strictly from this list:
        [${categoriesString}]

    **OUTPUT FORMAT:**
    Return ONLY valid JSON matching the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
        ],
      },
    });

    // Enhanced Error Handling
    if (!response.candidates || response.candidates.length === 0) {
       throw new Error("Gemini returned no candidates. This can happen due to high traffic or regional restrictions. Please try again in a few seconds.");
    }

    const candidate = response.candidates[0];

    // Check for non-STOP finish reasons (Safety, Recitation, etc.)
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`Gemini blocked the response. Reason: ${candidate.finishReason}. This topic might be triggering sensitive filters.`);
    }

    const text = response.text;
    if (!text) {
         throw new Error("Gemini returned an empty text response. Please try adjusting your topic or context.");
    }

    const parsed = JSON.parse(text);
    
    return {
      primaryKeyword: parsed.primaryKeyword || "",
      keywordDifficulty: typeof parsed.keywordDifficulty === 'number' ? parsed.keywordDifficulty : 50,
      seoTitle: parsed.seoTitle || "",
      secondaryKeywords: Array.isArray(parsed.secondaryKeywords) ? parsed.secondaryKeywords : [],
      metaDescription: parsed.metaDescription || "",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      category: Array.isArray(parsed.category) ? parsed.category : [],
    };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error instanceof SyntaxError) {
        throw new Error("Gemini returned invalid JSON. Please try again.");
    }
    throw error;
  }
};

export const generateKeywordIdeas = async (topic: string): Promise<KeywordIdea[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Generate 6-8 high-potential "Easy Win" SEO keyword variations for: "${topic}". 
  Focus on terms with clear intent (Transactional or Commercial) that are likely to convert. Avoid generic terms with impossible difficulty.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: keywordIdeasSchema,
        temperature: 0.7,
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
        ],
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const parsed = JSON.parse(text);
    return parsed.ideas || [];
  } catch (error) {
    console.error("Keyword Research Error:", error);
    throw error;
  }
};