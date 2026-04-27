import { google } from 'googleapis';
import fs from 'fs';

const creds = JSON.parse(fs.readFileSync('./wuri-login-6345477f5523.json'));

const auth = new google.auth.JWT(
  creds.client_email,
  null,
  creds.private_key,
  ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.readonly']
);

async function check() {
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const res = await sheets.spreadsheets.get({
      spreadsheetId: '19YL29dqb_WpXRMPTMacUm7hOHvFbHh7h8TUPWMOQpbE'
    });
    console.log('Document Access OK');
    console.log('Sheets found:', res.data.sheets.map(s => s.properties.title));
  } catch (e) {
    console.log('Access Failed:', e.message);
    if (e.response && e.response.data) {
      console.log('Error Details:', JSON.stringify(e.response.data, null, 2));
    }
  }
}

check();
