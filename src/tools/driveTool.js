const { google } = require('googleapis');
const { Readable } = require('stream');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

async function createDriveFile(name, content, mimeType = 'text/plain') {
    try {
        const res = await drive.files.create({
            requestBody: { name, mimeType },
            media: {
                mimeType: mimeType,
                body: content
            }
        });
        return `File '${name}' created! ID: ${res.data.id} (Type: ${mimeType})`;
    } catch (err) {
        return `Error creating file: ${err.message}`;
    }
}

async function readFile(fileId) {
    try {
        const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
        return new Promise((resolve, reject) => {
            let data = '';
            res.data.on('data', chunk => data += chunk);
            res.data.on('end', () => resolve(`Content:\n${data}`));
            res.data.on('error', err => reject(`Read error: ${err.message}`));
        });
    } catch (err) {
        return `Error reading file: ${err.message}`;
    }
}

async function updateDriveFile(fileId, content, mimeType = 'text/plain') {
    try {
        const res = await drive.files.update({
            fileId,
            media: {
                mimeType: mimeType,
                body: content
            }
        });
        return `File updated successfully! ID: ${res.data.id} (Type: ${mimeType})`;
    } catch (err) {
        return `Error updating file: ${err.message}`;
    }
}

async function renameFile(fileId, newName) {
    try {
        const res = await drive.files.update({
            fileId,
            requestBody: { name: newName }
        });
        return `File renamed to '${newName}'!`;
    } catch (err) {
        return `Error renaming file: ${err.message}`;
    }
}

async function deleteFile(fileId) {
    try {
        await drive.files.delete({ fileId });
        return `File deleted successfully!`;
    } catch (err) {
        return `Error deleting file: ${err.message}`;
    }
}

async function searchFiles(query) {
    try {
        // query example: "name contains 'meeting'"
        const res = await drive.files.list({
            q: query,
            fields: 'files(id, name, mimeType, webViewLink)',
            spaces: 'drive'
        });
        const files = res.data.files;
        if (files.length === 0) return 'No files found.';
        return 'Found files:\n' + files.map(f => `- ${f.name}\n  ID: ${f.id}\n  Link: ${f.webViewLink}`).join('\n');
    } catch (err) {
        return `Error searching files: ${err.message}`;
    }
}

async function exportDriveFile(fileId, mimeType) {
    try {
        const res = await drive.files.export({ fileId, mimeType }, { responseType: 'stream' });
        return new Promise((resolve, reject) => {
            let data = '';
            res.data.on('data', chunk => data += chunk);
            res.data.on('end', () => resolve(`Export Content:\n${data}`));
            res.data.on('error', err => reject(`Export error: ${err.message}`));
        });
    } catch (err) {
        return `Error exporting file: ${err.message}`;
    }
}

async function shareDriveFile(fileId, emailAddress, role) {
    try {
        // Map human-friendly names to Google API roles
        const roleMap = {
            'editor': 'writer',
            'writer': 'writer',
            'viewer': 'reader',
            'reader': 'reader',
            'commenter': 'commenter'
        };

        const targetRole = roleMap[role.toLowerCase()] || 'reader';

        const requestBody = {
            role: targetRole,
        };

        // If it's a phone number or empty, share with "anyone"
        const isPublicLink = !emailAddress || !emailAddress.includes('@');

        if (!isPublicLink) {
            requestBody.type = 'user';
            requestBody.emailAddress = emailAddress;
        } else {
            requestBody.type = 'anyone';
        }

        // 🛡️ PREVENT ROLE OVERLAP: Delete old 'anyone' permissions so the new role is forced
        try {
            const listRes = await drive.permissions.list({ fileId: fileId });
            const existingPermissions = listRes.data.permissions || [];
            
            for (const perm of existingPermissions) {
                if (perm.type === 'anyone') {
                    console.log(`[DRIVE] Removing old public permission: ${perm.id} (${perm.role})`);
                    await drive.permissions.delete({ fileId: fileId, permissionId: perm.id });
                }
            }
        } catch (listErr) {
            console.warn(`[DRIVE] Warning: Could not clean old permissions: ${listErr.message}`);
        }

        const res = await drive.permissions.create({
            fileId: fileId,
            requestBody: requestBody,
            fields: 'id',
        });

        const shareType = isPublicLink ? 'anyone with the link' : emailAddress;
        return `Success! Permission updated. Now ${shareType} has '${targetRole}' access. Previous public roles were cleared.`;
    } catch (err) {
        return `Error sharing file: ${err.message}`;
    }
}

module.exports = { createDriveFile, readFile, updateDriveFile, renameFile, deleteFile, searchFiles, exportDriveFile, shareDriveFile };
