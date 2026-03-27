const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const { AGENT_PERSONA } = require('./systemPrompt');
const TokenUsage = require('../database/models/TokenUsage');

// Initialize Gemini
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
                description: "Creates a Google Calendar event.",
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
                description: "Exports a Google Workspace document into a readable format.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        fileId: { type: "STRING", description: "Google Drive File ID" },
                        mimeType: { type: "STRING", description: "The target MIME type to export as" }
                    },
                    required: ["fileId", "mimeType"],
                },
            },
            {
                name: "shareDriveFile",
                description: "Shares a Google Drive file. Supports roles like 'editor', 'viewer'. If no email is provided, it makes the link Public.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        fileId: { type: "STRING", description: "Google Drive File ID" },
                        emailAddress: { type: "STRING", description: "Email address (optional)" },
                        role: { type: "STRING", description: "The permission role (editor, viewer, etc)" }
                    },
                    required: ["fileId", "role"],
                },
            },
            {
                name: "getStudentInfo",
                description: "Searches the campus database for a student.",
                parameters: {
                    type: "OBJECT",
                    properties: { searchName: { type: "STRING", description: "The student name to search" } },
                    required: ["searchName"],
                },
            },
            {
                name: "reportFault",
                description: "Reports a broken equipment or facility issue.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        description: { type: "STRING", description: "What is broken" },
                        location: { type: "STRING", description: "Where is it" },
                        reportedBy: { type: "STRING", description: "Reporter name" }
                    },
                    required: ["description", "location"],
                },
            },
            {
                name: "listOpenFaults",
                description: "Lists all currently open maintenance fault reports.",
            },
            {
                name: "listAllStudents",
                description: "Retrieves a generic list of all students.",
            },
            {
                name: "getAttendanceSummary",
                description: "Retrieves aggregate present/absent counts.",
            },
            {
                name: "executeReadOnlyQuery",
                description: "Executes a custom PostgreSQL SELECT query.",
                parameters: {
                    type: "OBJECT",
                    properties: { sql: { type: "STRING", description: "The SELECT query" } },
                    required: ["sql"],
                },
            },
            {
                name: "webSearch",
                description: "Searches the live internet.",
                parameters: {
                    type: "OBJECT",
                    properties: { query: { type: "STRING", description: "The search query" } },
                    required: ["query"],
                },
            },
            {
                name: "broadcastMessage",
                description: "Sends a direct WhatsApp message.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        numbers: { type: "ARRAY", items: { type: "STRING" }, description: "Array of phone numbers" },
                        message: { type: "STRING", description: "Message content" }
                    },
                    required: ["numbers", "message"],
                },
            },
            {
                name: "browserAction",
                description: "Executes a browser action via Chrome DevTools MCP. Actions include: navigate, screenshot, click, fill, evaluate.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        action: { type: "STRING", description: "The action to perform (navigate, screenshot, click, fill, evaluate)" },
                        url: { type: "STRING", description: "URL to navigate to, if action is navigate" },
                        selector: { type: "STRING", description: "CSS selector, if action is click or fill" },
                        text: { type: "STRING", description: "Text to type, if action is fill" },
                        script: { type: "STRING", description: "JavaScript to execute, if action is evaluate" }
                    },
                    required: ["action"],
                },
            }
        ],
    },
];

const { executeTool } = require('../tools/toolRouter');

// Gemini Keys
const apiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8
].filter(key => key);

// Groq Keys
const groqKeys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4
].filter(key => key);

let currentKeyIndex = 0;
let currentGroqIndex = 0;

// Track status for !llm command
const apiTokenStatuses = apiKeys.map((key, index) => ({
    label: `Gemini ${index + 1}`,
    maskedKey: (key || "").substring(0, 10) + "...",
    status: index === 0 ? 'Active' : 'Standby'
}));

const groqTokenStatuses = groqKeys.map((key, index) => ({
    label: `Groq ${index + 1}`,
    maskedKey: (key || "").substring(0, 10) + "...",
    status: 'Standby'
}));

function getApiTokenStatus() {
    return [...apiTokenStatuses, ...groqTokenStatuses];
}

function getActiveModel() {
    const activeKey = apiKeys[currentKeyIndex];
    if (!activeKey) throw new Error("No Gemini API keys found!");
    const genAI = new GoogleGenerativeAI(activeKey);
    // Use the latest 2.0 Flash model as requested
    return genAI.getGenerativeModel({
        model: "gemini-2.0-flash", 
        systemInstruction: AGENT_PERSONA,
        tools: tools
    });
}

function getGroqClient() {
    const activeKey = groqKeys[currentGroqIndex];
    if (!activeKey) throw new Error("No Groq API keys found!");
    return new Groq({ apiKey: activeKey });
}

// Conversation histories
const activeChats = {}; // For Gemini
const groqHistories = {}; // For Groq (Messages Array)

async function askGemini(userId, prompt, mediaPart, updateCallback, originalMsg) {
    let geminiRetries = 0;
    // Updated model list based on discovered availability
    const modelNames = [
        "gemini-2.5-flash", 
        "gemini-3.1-pro-preview", 
        "gemini-2.0-flash", 
        "gemini-pro"
    ];
    let currentModelIndex = 0;

    // --- PHASE 1: TRY GEMINI KEYS ---
    while (geminiRetries < apiKeys.length * modelNames.length) {
        try {
            const activeKey = apiKeys[currentKeyIndex];
            const activeModelName = modelNames[currentModelIndex];
            
            const genAI = new GoogleGenerativeAI(activeKey);
            const model = genAI.getGenerativeModel({
                model: activeModelName, 
                systemInstruction: AGENT_PERSONA,
                tools: tools
            });

            if (!activeChats[userId] || currentModelIndex > 0) {
                activeChats[userId] = model.startChat({});
            }
            const chat = activeChats[userId];
            let messageContent = mediaPart ? [prompt, mediaPart] : prompt;

            let result = await chat.sendMessage(messageContent);
            let response = await result.response;

            while (response.functionCalls() && response.functionCalls().length > 0) {
                const calls = response.functionCalls();
                const functionResponses = [];

                for (const call of calls) {
                    if (updateCallback) updateCallback(`[Agent] Executing tool: ${call.name}...`);
                    const toolResult = await executeTool(call.name, call.args, originalMsg);
                    functionResponses.push({
                        functionResponse: { name: call.name, response: { result: toolResult } }
                    });
                }
                result = await chat.sendMessage(functionResponses);
                response = await result.response;
            }

            const finalText = response.text();
            logUsage(prompt, finalText);
            return finalText;

        } catch (error) {
            console.error(`[GEMINI ERROR] Model: ${modelNames[currentModelIndex]} | Key: ${currentKeyIndex + 1}`, error.message || error);
            
            const status = error.status || (error.response ? error.response.status : undefined);
            const isRetriable = status === 429 || status === 404 || status === 403 || status === 401 || (error.message && (error.message.includes("429") || error.message.includes("404") || error.message.includes("403") || error.message.includes("401")));
            
            if (isRetriable && geminiRetries < (apiKeys.length * modelNames.length) - 1) {
                geminiRetries++;
                
                // Cycle Model first
                currentModelIndex = (currentModelIndex + 1) % modelNames.length;
                
                // If we've circled all models, cycle the Key
                if (currentModelIndex === 0) {
                    apiTokenStatuses[currentKeyIndex].status = 'RATE LIMITED/ERRORED';
                    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
                    apiTokenStatuses[currentKeyIndex].status = 'Active';
                }
                
                continue;
            } else {
                break; // Proceed to Groq failover
            }
        }
    }

    // --- PHASE 2: FAILOVER TO GROQ ---
    if (groqKeys.length > 0) {
        console.warn("[FAILOVER] All Gemini keys exhausted. Switching to Groq...");
        
        try {
            const groq = getGroqClient();
            if (!groqHistories[userId]) {
                const groqPersona = `${AGENT_PERSONA}\n\nIMPORTANT: You are a premium AI assistant. Your responses should be helpful, conversational, and stay in character. Avoid being robotic. Use emojis occasionally where appropriate, and keep your tone natural like a modern AI assistant.`;
                groqHistories[userId] = [{ role: 'system', content: groqPersona }];
            }
            
            // Sync Gemini history to Groq if first switch
            if (groqHistories[userId].length === 1 && activeChats[userId]) {
                try {
                    const history = await activeChats[userId].getHistory();
                    history.forEach(h => {
                        const role = h.role === 'model' ? 'assistant' : 'user';
                        const content = (h.parts || []).map(p => p.text || "").join("").trim();
                        if (content) {
                            groqHistories[userId].push({ role, content });
                        }
                    });
                } catch (e) {
                    console.log("[Groq Sync] Could not sync history:", e.message);
                }
            }

            groqHistories[userId].push({ role: 'user', content: prompt });

            // Tool definitions for Groq (OpenAI format)
            const mapJsonSchema = (obj) => {
                if (!obj || typeof obj !== 'object') return obj;
                if (Array.isArray(obj)) return obj.map(mapJsonSchema);
                const result = {};
                for (const key in obj) {
                    if (key === 'type' && typeof obj[key] === 'string') {
                        result[key] = obj[key].toLowerCase();
                    } else if (key === 'properties' || key === 'items' || typeof obj[key] === 'object') {
                        result[key] = mapJsonSchema(obj[key]);
                    } else {
                        result[key] = obj[key];
                    }
                }
                return result;
            };

            const groqTools = tools[0].functionDeclarations.map(fd => ({
                type: 'function',
                function: {
                    name: fd.name,
                    description: fd.description,
                    parameters: fd.parameters ? mapJsonSchema(fd.parameters) : undefined
                }
            }));

            // Debug log to catch schema errors in terminal
            console.log(`[Groq Failover] Tools mapped. First tool params: ${JSON.stringify(groqTools[0].function.parameters?.type)}`);

            let completion = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: groqHistories[userId],
                tools: groqTools,
            });

            let responseMessage = completion.choices[0].message;

            while (responseMessage.tool_calls) {
                groqHistories[userId].push(responseMessage);
                
                for (const toolCall of responseMessage.tool_calls) {
                    const toolName = toolCall.function.name;
                    const toolArgs = JSON.parse(toolCall.function.arguments);
                    
                    if (updateCallback) updateCallback(`[Groq Backup] Executing: ${toolName}...`);
                    const toolResult = await executeTool(toolName, toolArgs, originalMsg);

                    groqHistories[userId].push({
                        tool_call_id: toolCall.id,
                        role: 'tool',
                        name: toolName,
                        content: String(toolResult),
                    });
                }

                completion = await groq.chat.completions.create({
                    model: "llama-3.3-70b-versatile",
                    messages: groqHistories[userId],
                });
                responseMessage = completion.choices[0].message;
            }

            const finalText = responseMessage.content;
            groqHistories[userId].push({ role: 'assistant', content: finalText });
            
            logUsage(prompt, finalText);
            return finalText + "\n\n_(Response from Groq-Backup system)_";

        } catch (groqError) {
            console.error("Groq Error: ", groqError);
            // Cycle Groq keys if this one failed
            currentGroqIndex = (currentGroqIndex + 1) % groqKeys.length;
            return "Oops, all AI systems are currently overloaded!";
        }
    }

    return "All API systems are currently offline. Please wait.";
}

function logUsage(prompt, reply) {
    try {
        const words = (prompt.split(' ').length) + (reply.split(' ').length);
        const today = new Date().toISOString().split('T')[0];
        TokenUsage.findOneAndUpdate(
            { dateString: today },
            { $inc: { totalWordsSent: words }, $set: { lastUpdated: new Date() } },
            { upsert: true }
        ).catch(err => console.error("Quota Logging Error:", err.message));
    } catch (e) {}
}

module.exports = { askGemini, getApiTokenStatus };
