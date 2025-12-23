import { SheetTab, SeoResult } from '../types';
import { DEFAULT_SPREADSHEET_ID } from '../constants';

// Helper to validate token format (basic check)
export const isValidToken = (token: string) => token && token.length > 20;

// Helper to clean token (remove whitespace/quotes/Bearer prefix)
const cleanToken = (token: string) => {
    if (!token) return '';
    
    // 1. Handle JSON paste (e.g. user pasted {"access_token": "..."})
    if (token.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(token);
            if (parsed.access_token) return parsed.access_token;
        } catch (e) {
            // Not valid JSON, continue with standard cleaning
        }
    }

    // 2. Robust cleanup sequence:
    return token
        .replace(/["']/g, '')
        .replace(/^Authorization:\s*/i, '')
        .replace(/^Bearer\s*/i, '')
        .replace(/\s/g, '') 
        .trim();
};

// Helper to extract Spreadsheet ID from URL or raw ID
export const extractSpreadsheetId = (input: string): string => {
    if (!input) return '';
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input.trim();
};

// Helper to convert 0-based index to column letter
const getColumnLetter = (index: number): string => {
  let temp, letter = '';
  while (index >= 0) {
    temp = index % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
};

// Helper for handling Google API errors
const handleGoogleApiError = async (response: Response, context: string, spreadsheetId?: string) => {
    let message = response.statusText;
    try {
        const data = await response.json();
        if (data.error && data.error.message) {
            message = data.error.message;
        }
    } catch (e) {
        if (!message) message = `HTTP ${response.status}`;
    }

    if (response.status === 401) {
        throw new Error(`${context}: Access Token expired or invalid. Please generate a new one.`);
    }
    
    if (response.status === 403) {
         if (spreadsheetId === DEFAULT_SPREADSHEET_ID) {
             throw new Error(`${context}: Permission denied (403). You are trying to access the Read-Only Template. Please make a copy of the sheet and use YOUR Spreadsheet ID.`);
         }
         throw new Error(`${context}: Permission denied (403). The Google Account used to generate the token does NOT have access to this Sheet. Please check your Spreadsheet Share permissions.`);
    }
    
    if (response.status === 404) {
         throw new Error(`${context}: Spreadsheet not found. Check the ID.`);
    }

    throw new Error(`${context}: ${message}`);
};

export const fetchSheetTabs = async (spreadsheetId: string, accessToken: string): Promise<SheetTab[]> => {
  if (!accessToken) throw new Error("Access Token is required to fetch sheets.");

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const token = cleanToken(accessToken);

  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });

    if (!response.ok) {
        await handleGoogleApiError(response, "Sheets API Error", cleanId);
    }

    const data = await response.json();
    return data.sheets.map((s: any) => ({
      title: s.properties.title,
      sheetId: s.properties.sheetId,
    }));
  } catch (error: any) {
    console.error("Failed to fetch sheets:", error);
    throw error;
  }
};

export const fetchTopicAndUrl = async (
  spreadsheetId: string,
  sheetName: string,
  accessToken: string,
  row?: number
): Promise<{ topic: string; url: string; row: number }> => {
  if (!accessToken) throw new Error("Access Token is required.");

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const token = cleanToken(accessToken);
  
  try {
    // 1. Fetch Header Row (Row 1)
    const encodedHeaderRange = encodeURIComponent(`${sheetName}!1:1`);
    const headerResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}/values/${encodedHeaderRange}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );

    if (!headerResponse.ok) await handleGoogleApiError(headerResponse, "Read Headers Error", cleanId);
    
    const headerData = await headerResponse.json();
    const headers: string[] = headerData.values?.[0] || [];

    // Improved Matchers
    const topicIndex = headers.findIndex(h => /^(topic|target\s?topic|keyword|primary\s?keyword|search\s?query|query|content\s?subject|main\s?keyword)$/i.test(h.trim()));
    const urlIndex = headers.findIndex(h => /^(sources\/external\s?url|external\s?url|url|link|website|page\s?url|source\s?url|source|current\s?url)$/i.test(h.trim()));
    const titleIndex = headers.findIndex(h => /^(title|seo\s?title|page\s?title|meta\s?title|headline|generated\s?title|metadata)$/i.test(h.trim()));

    if (topicIndex === -1) {
         const foundHeaders = headers.length > 0 ? headers.join(", ") : "None found";
         throw new Error(`Could not find a 'Topic' column. Found columns: [${foundHeaders}]. Please ensure your sheet has a header named 'Topic' or 'Keyword'.`);
    }

    // Manual Mode
    if (row) {
        const encodedRowRange = encodeURIComponent(`${sheetName}!${row}:${row}`);
        const rowResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}/values/${encodedRowRange}`,
            { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
          );
      
        if (!rowResponse.ok) await handleGoogleApiError(rowResponse, "Read Row Error", cleanId);

        const rowData = await rowResponse.json();
        const values = rowData.values?.[0] || [];

        const topicValue = values[topicIndex];
        const urlValue = urlIndex !== -1 ? values[urlIndex] : '';

        if (!topicValue || !topicValue.trim()) throw new Error(`Row ${row}: Topic is empty in column ${getColumnLetter(topicIndex)}.`);
        
        return { topic: topicValue, url: urlValue || '', row };
    } 
    
    // Auto-find Mode
    else {
        if (titleIndex === -1) {
            throw new Error("Could not find a 'SEO Title' column. Auto-find requires this column to skip completed rows.");
        }

        const encodedDataRange = encodeURIComponent(`${sheetName}!A2:ZZ`);
        const dataResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}/values/${encodedDataRange}`,
            { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
        );

        if (!dataResponse.ok) await handleGoogleApiError(dataResponse, "Read Data Error", cleanId);
        
        const dataResult = await dataResponse.json();
        const rowsData = dataResult.values || [];

        for (let i = 0; i < rowsData.length; i++) {
            const currentRow = rowsData[i];
            if (!currentRow) continue;

            const topic = currentRow[topicIndex];
            const title = currentRow[titleIndex];

            // A row is "pending" if Topic is NOT empty AND Title IS empty
            const hasTopic = topic && topic.trim().length > 0;
            const isTitleEmpty = !title || title.toString().trim().length === 0;

            if (hasTopic && isTitleEmpty) {
                const url = urlIndex !== -1 ? currentRow[urlIndex] : '';
                return {
                    topic: topic,
                    url: url || '',
                    row: i + 2
                };
            }
        }

        throw new Error(`No pending rows found in '${sheetName}'. A row is pending if it has a '${headers[topicIndex]}' but no '${headers[titleIndex]}'. Check if all rows are already finished.`);
    }

  } catch (error: any) {
    console.error("Sheet Service Error:", error);
    throw error;
  }
};

export const writeSeoToSheet = async (
  spreadsheetId: string,
  sheetName: string,
  row: number,
  data: SeoResult,
  accessToken: string
): Promise<void> => {
  if (!accessToken) throw new Error("Access Token is required.");

  const cleanId = extractSpreadsheetId(spreadsheetId);
  const token = cleanToken(accessToken);

  try {
    const encodedHeaderRange = encodeURIComponent(`${sheetName}!1:1`);
    const headerResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}/values/${encodedHeaderRange}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );

    let columnMapping: { [key: string]: string } = {};
    let useDefaultMapping = true;

    if (headerResponse.ok) {
      const headerData = await headerResponse.json();
      const headers = headerData.values?.[0] || [];
      
      const keyMap: { [key: string]: string } = {
        "Primary Keyword": "primaryKeyword",
        "Target KeyWord": "primaryKeyword",
        "Keyword": "primaryKeyword",
        "Topic": "primaryKeyword", 
        "Search Query": "primaryKeyword",
        "Main Keyword": "primaryKeyword",
        "SEO Title": "seoTitle",
        "Title": "seoTitle", 
        "Page Title": "seoTitle",
        "Meta Title": "seoTitle",
        "Headline": "seoTitle",
        "Meta Description": "metaDescription",
        "Description": "metaDescription",
        "Meta": "metaDescription",
        "Secondary Keywords": "secondaryKeywords",
        "Keywords": "secondaryKeywords",
        "LSI": "secondaryKeywords",
        "LSI Keywords": "secondaryKeywords",
        "Tags": "tags",
        "Content Tags": "tags",
        "Category": "category",
        "Categories": "category",
        "Niche": "category"
      };

      headers.forEach((header: string, index: number) => {
        if (!header) return;
        const cleanHeader = header.trim().toLowerCase();
        const matchedKey = Object.keys(keyMap).find(k => k.toLowerCase() === cleanHeader);
        if (matchedKey) columnMapping[keyMap[matchedKey]] = getColumnLetter(index);
      });
      
      if (Object.keys(columnMapping).length > 0) useDefaultMapping = false;
    }

    let valueInputOption = "USER_ENTERED";

    if (!useDefaultMapping) {
      const dataMap: any = {
        primaryKeyword: data.primaryKeyword,
        seoTitle: data.seoTitle,
        metaDescription: data.metaDescription,
        secondaryKeywords: data.secondaryKeywords.join(", "),
        tags: data.tags.join(", "),
        category: data.category ? data.category.join(", ") : ""
      };

      const dataToUpdate = Object.keys(columnMapping).map(key => ({
        range: `${sheetName}!${columnMapping[key]}${row}`,
        values: [[dataMap[key]]]
      }));

      const batchResponse = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}/values:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ valueInputOption, data: dataToUpdate }),
        }
      );
      
      if (!batchResponse.ok) await handleGoogleApiError(batchResponse, "Batch update failed", cleanId);

    } else {
      const range = `${sheetName}!B${row}:F${row}`;
      const encodedRange = encodeURIComponent(range);
      const values = [[
        data.primaryKeyword,
        data.seoTitle,
        data.secondaryKeywords.join(", "),
        data.metaDescription,
        data.tags.join(", ")
      ]];
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(cleanId)}/values/${encodedRange}?valueInputOption=${valueInputOption}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values }),
        }
      );
      
      if (!response.ok) await handleGoogleApiError(response, "Fallback update failed", cleanId);
    }

  } catch (error) {
    console.error("Write to Sheet Error:", error);
    throw error;
  }
};