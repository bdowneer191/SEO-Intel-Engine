import { SeoRequest, SeoResult, KeywordIdea } from '../types';

/**
 * GENERATE SEO DATA
 * Calls the Vercel Edge Function at /api/generate
 * This secures your API key by keeping it on the server side.
 */
export const generateSeoData = async (request: SeoRequest): Promise<SeoResult> => {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      // Try to parse error message from JSON, fallback to status text
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server Error: ${response.status}`);
    }

    const data = await response.json();
    return data as SeoResult;

  } catch (error: any) {
    console.error("SEO Generation Error:", error);
    throw new Error(error.message || "Failed to generate SEO data.");
  }
};

/**
 * KEYWORD RESEARCH SUGGESTIONS
 * Calls the Vercel Edge Function at /api/keywords
 */
export const generateKeywordIdeas = async (topic: string): Promise<KeywordIdea[]> => {
  try {
    const response = await fetch('/api/keywords', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic }),
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch keywords: ${response.status}`);
    }

    const data = await response.json();
    return data.ideas || [];

  } catch (error) {
    console.error("Research Error:", error);
    // Return empty array on error so the UI doesn't crash
    return [];
  }
};
