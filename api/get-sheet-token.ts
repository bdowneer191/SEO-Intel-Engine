import { JWT } from 'google-auth-library';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  try {
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      return res.status(500).json({ error: "Server configuration missing (Email/Key)" });
    }

    const auth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const token = await auth.getAccessToken();
    return res.status(200).json({ accessToken: token.token });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
