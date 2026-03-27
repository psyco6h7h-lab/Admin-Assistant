const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

let mcpClient = null;

async function getMcpClient() {
    if (mcpClient) return mcpClient;
    
    // Configure standard MCP stdio transport to spawn the puppeteer server
    const transport = new StdioClientTransport({
        command: process.platform === "win32" ? "npx.cmd" : "npx",
        args: ["@modelcontextprotocol/server-puppeteer"]
    });
    
    mcpClient = new Client({ name: "whatsapp-agent-client", version: "1.0.0" }, { capabilities: {} });
    await mcpClient.connect(transport);
    return mcpClient;
}

/**
 * Executes a browser action via the MCP standard Puppeteer/Chrome DevTools server.
 * @param {string} action - navigate, screenshot, click, fill, or evaluate
 * @param {string} [url] - used for navigate
 * @param {string} [selector] - used for click or fill
 * @param {string} [text] - used for fill
 * @param {string} [script] - used for evaluate
 */
async function performBrowserAction(action, url, selector, text, script) {
    try {
        const client = await getMcpClient();
        let result;
        
        switch (action) {
            case 'navigate':
                result = await client.callTool({ name: "puppeteer_navigate", arguments: { url } });
                break;
            case 'screenshot':
                result = await client.callTool({ name: "puppeteer_screenshot", arguments: { name: "screenshot" } });
                break;
            case 'click':
                result = await client.callTool({ name: "puppeteer_click", arguments: { selector } });
                break;
            case 'fill':
                result = await client.callTool({ name: "puppeteer_fill", arguments: { selector, value: text } });
                break;
            case 'evaluate':
                result = await client.callTool({ name: "puppeteer_evaluate", arguments: { script } });
                break;
            default:
                return `Unknown browser action: ${action}`;
        }
        
        // After any action (except screenshot), let's grab the current page text so the AI isn't blind!
        let pageContext = "";
        try {
            if (action !== 'screenshot') {
                const domFetch = await client.callTool({ 
                    name: "puppeteer_evaluate", 
                    arguments: { script: "document.body.innerText.replace(/\\s+/g, ' ').substring(0, 3000)" } 
                });
                if (domFetch && domFetch.content && domFetch.content[0]) {
                    pageContext = `\nCurrent Page Text:\n${domFetch.content[0].text}`;
                }
            }
        } catch (ignored) {}

        if (result && result.content) {
            if (action === 'screenshot') {
                return "Screenshot captured successfully format.";
            }
            return JSON.stringify(result.content) + pageContext;
        }
        return "Browser action completed successfully." + pageContext;

    } catch (error) {
        return `Browser Tool Error: ${error.message}`;
    }
}

module.exports = { performBrowserAction, getMcpClient };
