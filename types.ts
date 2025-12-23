export interface SeoRequest {
  topic: string;
  geo?: string;
  industry?: string;
  context?: string;
  contentType?: string; // e.g., 'News', 'Product', 'Blog'
}

export interface SeoResult {
  primaryKeyword: string;
  keywordDifficulty: number;
  seoTitle: string;
  secondaryKeywords: string[];
  metaDescription: string;
  tags: string[];
  category: string[]; // Added category support
}

export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
  rowNumber: number;
  accessToken: string;
}

export interface SheetState {
  spreadsheetId: string;
  accessToken: string;
  selectedTab: string;
  rowNumber: string;
  tabs: SheetTab[];
}

export interface SheetTab {
  title: string;
  sheetId: number;
}

export interface KeywordIdea {
  keyword: string;
  intent: string; // e.g., Informational, Transactional
  difficulty: string; // Low, Medium, High
  volume: string; // e.g., High, Medium, Niche
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  WRITING_SHEET = 'WRITING_SHEET',
  FETCHING_SHEET = 'FETCHING_SHEET',
}