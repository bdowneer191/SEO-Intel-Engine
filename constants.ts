
export const DEFAULT_SPREADSHEET_ID = "1zazLdp9CwH36SwwK__mAwYyU5idWgVuRWiIwFFbnidA";

export const CONTENT_TYPES = [
  { id: 'blog', label: 'Blog / Article', tone: 'Informative & Engaging' },
  { id: 'news', label: 'News / Journalism', tone: 'Urgent, Factual & Punchy' },
  { id: 'product', label: 'Product Page (E-comm)', tone: 'Transactional & Persuasive' },
  { id: 'service', label: 'Service / Landing Page', tone: 'Professional & Solution-Oriented' },
  { id: 'review', label: 'Review / Comparison', tone: 'Critical, Balanced & Authoritative' },
];

export const AVAILABLE_CATEGORIES = [
  "Breaking News", "Conspiracy Theory", "Crimes & Criminals", "Crime Stories", 
  "Rapper & Celebrity Crime Reports", "Culture & Lifestyle", "Celebrity Fashion Choices", 
  "Fashion", "Hip-Hop Fashion", "Sneakers & Style", "Entertainment", "Awards", 
  "Celebrity News", "Did You Know?", "Geek Culture", "Gossip", "Influencer News", 
  "Movies & Series", "Films", "Pop Culture", "Pop Trend", "Streaming Culture", 
  "Video Games", "Viral Today", "Featured", "Global News", "Africa", "Americas", 
  "Asia", "Australia", "East America", "Europe", "North America", "Politics", 
  "South America", "West America", "World", "Hypefresh Originals", "Documentaries", 
  "Editorials", "Hypefresh Trend", "Interviews", "Magazines", "Podcasts", 
  "Mental Health", "Diet", "Fitness", "Medicine", "Music", "Concerts & Events", 
  "Hip Hop GOAT", "News", "Hip-Hop Trend", "Music Videos", "The Culture", 
  "Independent & Emerging Artists", "New Music", "R&B News", "Black News", 
  "Featured News", "Top Stories", "Trending News", "Philadelphia Culture & News", 
  "Philadelphia News", "Philly Talents", "Sports", "Athletics", "MMA", "Football", 
  "Global Sports", "MLB Highlights", "NBA", "NBA Highlights", "NFL Highlights", 
  "NHL Highlights", "Off the Court", "Politics", "Philly Sports", "Professional Boxing", 
  "Sports Record", "US Sports", "WNBA Highlights", "World Sport", "Tech & Innovation", 
  "AI & Digital Culture", "Tech Updates"
];

export const SYSTEM_INSTRUCTION = `
You are an Elite SEO Strategist and Content Intelligence Engine.
Your goal is to generate unique, strategically SEO-friendly metadata that is easy to rank on both Google and LLM-based search engines.

**CORE RULES:**
1.  **Search Simulation:** Simulate a Google search for the top pages on the topic to ensure uniqueness.
2.  **Uniqueness:** NEVER reply with the same title as the source provided in the context.
3.  **Language:** Avoid derogatory nicknames or slang in titles. Keep it meaningful and relevant.
4.  **Format:** STRICTLY follow the JSON schema provided.
5.  **Limits:**
    *   Title: Keyword targeted, meaningful.
    *   Meta Description: Max 155 characters.
`;