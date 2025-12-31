import { SeoRequest, SeoResult } from '../types';

export const generateSeoData = async (request: SeoRequest): Promise<SeoResult> => {
  try {
    // Call your own Vercel API route
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // Handle Rate Limits specifically
      if (response.status === 429) {
        throw new Error("Google AI Quota Exceeded. Please wait 1 minute and try again.");
      }
      throw new Error(errorData.error || `Server Error: ${response.status}`);
    }

    const data = await response.json();
    return data as SeoResult;

  } catch (error: any) {
    console.error("Generation Service Error:", error);
    throw error;
  }
};

// Keep generateKeywordIdeas as is, or migrate it similarly to /api/keywords
export const generateKeywordIdeas = async (topic: string) => {
    // ... logic remains similar, ideally move to /api/keywords
    throw new Error("Migration to API required for Keywords"); 
};
