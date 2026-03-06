const { GoogleGenerativeAI } = require('@google/generative-ai');
const { AGENT_PERSONA } = require('./systemPrompt');

// Initialize Gemini with API Key from environment variables
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define the tools available to Gemini
const tools = [
    {
        functionDeclarations: [
            {
                name: "sendEmail",
                description: "Sends an email to a specific person.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        to: { type: "STRING", description: "The complete email address of the recipient" },
                        subject: { type: "STRING", description: "The subject line of the email" },
                        message: { type: "STRING", description: "The body text content of the email" },
                    },
                    required: ["to", "subject", "message"],
                },
            },
            {
                name: "listEmails",
                description: "Searches and lists recent emails in Gmail inbox.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "Search query (e.g. 'is:unread', 'from:person@example.com', or just a keyword)" },
                        maxResults: { type: "INTEGER", description: "Max number of emails to return (default 5, max 10)" }
                    }
                }
            },
            {
                name: "readEmail",
                description: "Reads the content/body of a specific email using its ID.",
                parameters: {
                    type: "OBJECT",
                    properties: { messageId: { type: "STRING", description: "The ID of the email to read" } },
                    required: ["messageId"]
                }
            },
            {
                name: "deleteEmail",
                description: "Deletes an email from Gmail using its ID.",
                parameters: {
                    type: "OBJECT",
                    properties: { messageId: { type: "STRING", description: "The ID of the email to delete" } },
                    required: ["messageId"]
                }
            },
            {
                name: "listEvents",
                description: "Lists upcoming Google Calendar events.",
            },
            {
                name: "createEvent",
                description: "Creates a Google Calendar event. Example DateTime Format: 2026-03-05T09:00:00-07:00",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        summary: { type: "STRING", description: "Event title" },
                        description: { type: "STRING", description: "Event description" },
                        location: { type: "STRING", description: "Event location" },
                        startTime: { type: "STRING", description: "Start time (ISO string)" },
                        endTime: { type: "STRING", description: "End time (ISO string)" },
                    },
                    required: ["summary", "startTime", "endTime"],
                },
            },
            {
                name: "updateEvent",
                description: "Updates an existing Google Calendar event. Only pass fields that need to change.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        eventId: { type: "STRING", description: "The ID of the event to update" },
                        summary: { type: "STRING", description: "New title" },
                        description: { type: "STRING", description: "New description" },
                        location: { type: "STRING", description: "New location" },
                        startTime: { type: "STRING", description: "New start time (ISO string)" },
                        endTime: { type: "STRING", description: "New end time (ISO string)" },
                    },
                    required: ["eventId"],
                },
            },
            {
                name: "deleteEvent",
                description: "Deletes a Google Calendar event.",
                parameters: {
                    type: "OBJECT",
                    properties: { eventId: { type: "STRING", description: "The ID of the event to delete" } },
                    required: ["eventId"],
                },
            },
            {
                name: "searchFiles",
                description: "Searches Google Drive for files. e.g. \"name contains 'meeting'\"",
                parameters: {
                    type: "OBJECT",
                    properties: { query: { type: "STRING", description: "The search query" } },
                    required: ["query"],
                },
            },
            {
                name: "createDriveFile",
                description: "Creates a new file in Google Drive of any format.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "Name of the file including extension (e.g. data.csv, info.txt)" },
                        content: { type: "STRING", description: "The content of the file" },
                        mimeType: { type: "STRING", description: "The MIME type of the file (e.g. text/plain, text/csv, application/vnd.ms-excel)" }
                    },
                    required: ["name", "content"],
                },
            },
            {
                name: "readFile",
                description: "Reads the content of a file in Google Drive by its fileId.",
                parameters: {
                    type: "OBJECT",
                    properties: { fileId: { type: "STRING", description: "Google Drive File ID" } },
                    required: ["fileId"],
                },
            },
            {
                name: "updateDriveFile",
                description: "Updates/overwrites the content of a file in Google Drive.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        fileId: { type: "STRING", description: "Google Drive File ID" },
                        content: { type: "STRING", description: "New content" },
                        mimeType: { type: "STRING", description: "The MIME type of the file" }
                    },
                    required: ["fileId", "content"],
                },
            },
            {
                name: "renameFile",
                description: "Renames a file in Google Drive.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        fileId: { type: "STRING", description: "Google Drive File ID" },
                        newName: { type: "STRING", description: "The new filename" },
                    },
                    required: ["fileId", "newName"],
                },
            },
            {
                name: "deleteFile",
                description: "Deletes a file from Google Drive.",
                parameters: {
                    type: "OBJECT",
                    properties: { fileId: { type: "STRING", description: "Google Drive File ID" } },
                    required: ["fileId"],
                },
            },
            {
                name: "exportDriveFile",
                description: "Exports a Google Workspace document (e.g. Google Docs, Google Sheets) into a readable format. Do NOT use this for normal files (like .txt or .pdf), only use for Google Workspaces formats.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        fileId: { type: "STRING", description: "Google Drive File ID" },
                        mimeType: { type: "STRING", description: "The target MIME type to export as (e.g. 'text/plain' or 'text/csv')" }
                    },
                    required: ["fileId", "mimeType"],
                },
            }
        ],
    },
];

const { executeTool } = require('../tools/toolRouter');

// In-Memory map to store conversations! (Temporary Phase 1 fix until MongoDB)
const activeChats = {};

// Get all possible API keys from .env
const apiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4
].filter(key => key); // Exclude undefined/empty keys

let currentKeyIndex = 0;

function getActiveModel() {
    const activeKey = apiKeys[currentKeyIndex];
    if (!activeKey) throw new Error("No Gemini API keys found!");

    const genAI = new GoogleGenerativeAI(activeKey);
    return genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: AGENT_PERSONA,
        tools: tools
    });
}

// We accept a userId (phone number) and an updateCallback so we can reply 
// "Executing XYZ..." multiple times during the loop without waiting till the end
async function askGemini(userId, prompt, mediaPart, updateCallback) {
    let retries = 0;

    // Handle optional mediaPart backwards compatibility
    if (typeof mediaPart === 'function') {
        updateCallback = mediaPart;
        mediaPart = null;
    }

    while (retries < apiKeys.length) {
        try {
            // 1. Create a Chat session for this specific User OR grab their existing one
            if (!activeChats[userId]) {
                const model = getActiveModel();
                activeChats[userId] = model.startChat({});
            }

            const chat = activeChats[userId];

            // 2. Send the user's message (Text only, or Text + Multimodal Media)
            let messageContent = prompt;
            if (mediaPart) {
                messageContent = [prompt, mediaPart];
            }
            let result = await chat.sendMessage(messageContent);
            let response = await result.response;

            // 3. The Agentic Loop (ReAct Loop)
            // Keep looping as long as the AI wants to run a tool
            while (response.functionCalls() && response.functionCalls().length > 0) {
                const calls = response.functionCalls();
                const functionResponses = [];

                // Execute all requested tools in parallel (or one by one)
                for (const call of calls) {
                    const toolName = call.name;
                    const args = call.args;

                    // Let the user know we're doing something
                    if (updateCallback) {
                        updateCallback(`[Agent] Executing tool: ${toolName}...`);
                    }

                    // Actually run the tool!
                    const toolResult = await executeTool(toolName, args, null);

                    // Package the tool result into the exact format Gemini expects
                    functionResponses.push({
                        functionResponse: {
                            name: toolName,
                            response: { result: toolResult }
                        }
                    });
                }

                // 4. Send the tool results BACK to Gemini so it can read them!
                result = await chat.sendMessage(functionResponses);
                response = await result.response;
            }

            // 5. The loop finished! Return the final output text to the user
            return response.text();

        } catch (error) {
            // Check if it's a Rate Limit error (429) AND we have backup keys
            if (error.status === 429 && apiKeys.length > 1) {
                console.warn(`[WARNING] Gemini Key ${currentKeyIndex + 1} hit rate limit (429). Switching to next key...`);

                // Move to the next key
                currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                retries++;

                // Grab the old history before we delete the session
                let oldHistory = [];
                if (activeChats[userId]) {
                    oldHistory = await activeChats[userId].getHistory();
                }

                // Create a new session with the NEW key, but inject the old conversation history!
                const newModel = getActiveModel();
                activeChats[userId] = newModel.startChat({ history: oldHistory });

                // The loop will now 'continue' and retry the exact same prompt with the new key
                continue;
            }

            console.error("Gemini Error: ", error);
            return "Oops, I encountered an error communicating with the AI!";
        }
    }

    return "All Gemini APi Keys are currently rate limited! Please wait a minute.";
}

module.exports = { askGemini };
