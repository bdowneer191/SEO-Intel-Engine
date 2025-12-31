import { SeoRequest, SeoResult, KeywordIdea } from '../types';

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
      const errorData = await response.json();
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
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch keywords: ${response.status}`);
    }

    const data = await response.json();
    return data.ideas || [];

  } catch (error: any) {
    console.error("Keyword Research Error:", error);
    throw error;
  }
};
