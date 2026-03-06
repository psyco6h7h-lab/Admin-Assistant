const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
);

// Define scopes - Gmail access (read/write/send/modify), Calendar access, and Drive access
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/drive'
];

async function authenticate() {
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });

    console.log('----------------------------------------------------');
    console.log('Authorize this app by visiting this url:');
    console.log(authUrl);
    console.log('----------------------------------------------------');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('Paste the authorization code here: ', async (code) => {
        rl.close();
        try {
            const { tokens } = await oauth2Client.getToken(code);
            console.log('Successfully acquired tokens!');
            console.log('Please add the following to your .env file:');
            console.log(`GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`);

            // Save it into the .env automatically for the user
            fs.appendFileSync('.env', `\nGOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`);
            console.log('Saved to .env successfully!');
        } catch (err) {
            console.error('Error retrieving access token', err);
        }
    });
}

authenticate();
