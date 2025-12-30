import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet'; // You might need to install this or use raw fetch. 
// Actually, let's use raw fetch with google-auth-library to keep it lightweight and reliable without extra dependencies like google-spreadsheet if you prefer, 
// BUT using the official library is cleaner. Let's stick to raw fetch for maximum compatibility with your existing logic, just authenticated differently.

export const config = {
  runtime: 'nodejs', // Service Accounts work best in standard Node, not Edge
};

export default async function handler(req: any, res: any) {
  try {
    const { method, spreadsheetId, tabName, row, data } = req.body;
    
    // 1. Authenticate "The Robot"
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'); // Fix newline issues

    if (!clientEmail || !privateKey) {
      return res.status(500).json({ error: "Server missing Google Credentials" });
    }

    const auth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const token = await auth.getAccessToken();
    const accessToken = token.token;

    // 2. Handle Actions
    const cleanId = spreadsheetId.replace(/\/d\/|^\/|\/$/g, ''); // Basic clean

    // --- ACTION: FETCH TABS ---
    if (method === 'FETCH_TABS') {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=sheets.properties`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const json = await response.json();
      if (json.error) throw new Error(json.error.message);
      return res.status(200).json(json.sheets.map((s: any) => ({ title: s.properties.title, sheetId: s.properties.sheetId })));
    }

    // --- ACTION: FETCH ROW ---
    if (method === 'FETCH_ROW') {
      // (Your existing logic, adapted for backend)
      const range = row ? `${tabName}!${row}:${row}` : `${tabName}!A2:ZZ`;
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const json = await response.json();
      // ... (We return raw values, frontend processes mapping to keep backend simple)
      return res.status(200).json(json);
    }

    // --- ACTION: WRITE DATA ---
    if (method === 'WRITE') {
       // Logic to write data (simplified for brevity, assumes you pass the exact range/values)
       // In a full implementation, you'd move your "writeSeoToSheet" logic here.
       // For now, let's keep the mapping logic in frontend and just proxy the write.
       const { range, values } = req.body;
       const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values })
       });
       const json = await response.json();
       if (json.error) throw new Error(json.error.message);
       return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Unknown Method" });

  } catch (error: any) {
    console.error("Sheet API Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
