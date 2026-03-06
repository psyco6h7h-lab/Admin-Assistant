const { google } = require('googleapis');
require('dotenv').config();

// Initialize the Google OAuth2 client with our secure credentials
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
);

// Give the client the refresh token we just generated
oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// Initialize the Gmail API
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

/**
 * Sends an email using the Gmail API
 * @param {string} to - The recipient's email address
 * @param {string} subject - The subject of the email
 * @param {string} messageText - The body of the email
 */
async function sendEmailTool(to, subject, messageText) {
    try {
        console.log(`Attempting to send an email to ${to}...`);

        // Create the raw email format required by Gmail
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
            `To: ${to}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${utf8Subject}`,
            '',
            messageText,
        ];
        const message = messageParts.join('\n');

        // Encode the email in base64url format
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Physically send the email using Google Cloud
        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });

        console.log(`Email successfully sent! ID: ${res.data.id}`);
        return `Success: Email sent to ${to}.`;
    } catch (error) {
        console.error('Error sending email:', error);
        return `Failed to send email: ${error.message}`;
    }
}

async function listEmails(query = '', maxResults = 5) {
    try {
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: query,
            maxResults: maxResults
        });
        const messages = res.data.messages;
        if (!messages || messages.length === 0) return 'No emails found.';

        // Fetch brief details for each message
        let result = 'Found emails:\n';
        for (const msg of messages) {
            const fullMsg = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['Subject', 'From'] });
            const headers = fullMsg.data.payload.headers;
            const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
            const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
            result += `- ID: ${msg.id} | From: ${from} | Subject: ${subject}\n`;
        }
        return result;
    } catch (error) {
        return `Error listing emails: ${error.message}`;
    }
}

async function readEmail(messageId) {
    try {
        const res = await gmail.users.messages.get({ userId: 'me', id: messageId });
        const payload = res.data.payload;
        const headers = payload.headers;

        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
        const date = headers.find(h => h.name === 'Date')?.value || 'Unknown Date';

        let body = '';
        if (payload.parts) {
            // Try to find plain text part
            const part = payload.parts.find(p => p.mimeType === 'text/plain');
            if (part && part.body && part.body.data) {
                body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
        } else if (payload.body && payload.body.data) {
            body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }

        return `From: ${from}\nDate: ${date}\nSubject: ${subject}\n\nBody:\n${body || 'Could not parse body.'}`;
    } catch (error) {
        return `Error reading email: ${error.message}`;
    }
}

async function deleteEmail(messageId) {
    try {
        await gmail.users.messages.delete({ userId: 'me', id: messageId });
        return `Email ${messageId} deleted successfully.`;
    } catch (error) {
        return `Error deleting email: ${error.message}`;
    }
}

module.exports = { sendEmailTool, listEmails, readEmail, deleteEmail };
