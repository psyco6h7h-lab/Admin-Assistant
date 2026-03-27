# WhatsApp Voice Agent Integration Plan

This document outlines the plan to integrate a voice-powered assistant into the `my-whatsapp-agent` project. The proposed architecture is self-hosted, ensuring privacy and zero API costs.

### System Architecture & Workflow

The following diagram illustrates the pipeline for processing voice messages from the user and generating a voice response.

```ascii
[ User on WhatsApp ]
       |
       | 1. Sends Voice Message (audio.ogg)
       V
+--------------------------+
|   my-whatsapp-agent      |
|  (whatsapp-web.js)       |----(downloads media)---> [ ./audio/input/voice.ogg ]
+--------------------------+
       |
       | 2. Convert Format (OGG -> WAV)
       V
+--------------------------+
|    FFmpeg Converter      |
|  (fluent-ffmpeg)         |-------------------------> [ ./audio/input/voice.wav ]
+--------------------------+
       |
       | 3. Speech-to-Text (STT)
       V
+--------------------------+
|  OpenAI Whisper (local)  |
|     (whisper-node)       |------> "User's transcribed text"
+--------------------------+
       |
       | 4. Process Request
       V
+--------------------------+
|   Existing Agent Brain   |
|      (e.g., gemini.js)   |------> "Bot's text response"
+--------------------------+
       |
       | 5. Text-to-Speech (TTS)
       V
+--------------------------+
|   Piper TTS (local)      |
|                          |------> [ ./audio/output/response.wav ]
+--------------------------+
       |
       | 6. Convert Format (WAV -> OGG)
       V
+--------------------------+
|    FFmpeg Converter      |
|  (fluent-ffmpeg)         |------> [ ./audio/output/response.ogg ]
+--------------------------+
       |
       | 7. Send Voice Reply
       V
+--------------------------+
|   my-whatsapp-agent      |
|  (whatsapp-web.js)       |------> [ User on WhatsApp ]
+--------------------------+
```

### Step-by-Step Integration Guide

Here are the steps to implement this voice feature in your existing `my-whatsapp-agent` project.

#### Step 1: Install System-Wide Dependencies

Since you are on **Windows**, you will need to install the following core software manually.

1.  **Install FFmpeg:**
    *   Go to the official FFmpeg website and download the latest build for Windows.
    *   Extract the downloaded `.zip` file to a permanent location, for example: `C:\ffmpeg`.
    *   Add the `bin` folder inside the extracted folder (e.g., `C:\ffmpeg\bin`) to your system's **PATH environment variable**. This is crucial for other programs to find it.

2.  **Install Python:**
    *   Download the latest Python installer from the official Python website (`python.org`).
    *   Run the installer.
    *   **Important:** On the first screen of the installer, make sure to check the box that says **"Add Python to PATH"**.

3.  **Install OpenAI Whisper:**
    *   Open a new Command Prompt (`cmd`) or PowerShell window.
    *   Run the following command. This uses `pip`, the Python package manager, which was installed with Python.
    ```bash
    pip install -U openai-whisper
    ```

4.  **Download and Set Up Piper TTS:**
    *   Go to the [Piper GitHub releases page](https://github.com/rhasspy/piper/releases).
    *   Download the latest release for Windows (e.g., `piper_windows_x86_64.zip`).
    *   Extract the `.zip` file to a permanent location, for example: `C:\piper`.
    *   You will also need to download a voice model (the `.onnx` and `.json` files) from the "Assets" section and place them in the same `C:\piper` folder.

#### Step 2: Install Required Node.js Packages

Add the necessary libraries to your `package.json` for handling audio and running the local models.

```bash
npm install fluent-ffmpeg ffmpeg-static fs-extra whisper-node
```

#### Step 3: Update Your Project Structure

As recommended in the plan, create a clear folder structure to keep the new logic organized.

```
my-whatsapp-agent/
├── src/
│   ├── audio/
│   │   ├── input/     # For downloaded user voice notes
│   │   └── output/    # For generated bot replies
│   │
│   ├── services/
│   │   ├── audioConverter.js # Logic for FFmpeg conversions
│   │   ├── speechToText.js   # Logic for Whisper
│   │   └── textToSpeech.js   # Logic for Piper
│   │
│   ├── core/
│   ├── database/
│   └── ... (your existing files)
│
└── index.js # Or your main entry file
```

#### Step 4: Modify the Message Handler

Update your main `client.on('message', ...)` listener to detect and process voice messages. The code below provides a template for where to call your new services.

```javascript
// At the top of your main bot file (e.g., index.js or example.js)
const { MessageMedia } = require('whatsapp-web.js');
const fs = require('fs-extra');
const path = require('path');

// You will create these service files in the next steps
// const { convertOggToWav, convertWavToOgg } = require('./src/services/audioConverter');
// const { transcribeAudio } = require('./src/services/speechToText');
// const { generateSpeech } = require('./src/services/textToSpeech');
// const { askGemini } = require('./src/core/gemini');

client.on('message', async msg => {
    // Check if the message is a voice note ('ptt' stands for Push-to-Talk)
    if (msg.hasMedia && msg.type === 'ptt') {
        console.log('Voice message received, processing...');
        try {
            // 1. Download the OGG audio file
            const media = await msg.downloadMedia();
            const inputOggPath = path.join(__dirname, 'src', 'audio', 'input', `${msg.id.id}.ogg`);
            await fs.writeFile(inputOggPath, Buffer.from(media.data, 'base64'));

            // 2. Convert OGG to WAV using your audioConverter service
            // const outputWavPath = await convertOggToWav(inputOggPath);

            // 3. Transcribe WAV to text using your speechToText service
            // const userText = await transcribeAudio(outputWavPath);
            // console.log(`[User Voice] Transcribed: "${userText}"`);

            // 4. Send transcribed text to the agent's brain (askGemini) for a response
            // const botResponseText = await askGemini(msg.from, userText);
            // console.log(`[Bot AI] Response: "${botResponseText}"`);

            // 5. Generate speech from the bot's text response using your textToSpeech service
            // const responseWavPath = await generateSpeech(botResponseText);

            // 6. Convert the response WAV back to OGG for WhatsApp
            // const responseOggPath = await convertWavToOgg(responseWavPath);

            // 7. Send the final voice reply
            // const replyMedia = MessageMedia.fromFilePath(responseOggPath);
            // await client.sendMessage(msg.from, replyMedia, { sendAudioAsVoice: true });

            // 8. (Optional) Clean up the temporary audio files
            // await fs.unlink(inputOggPath);
            // await fs.unlink(outputWavPath);
            // ... and so on

        } catch (error) {
            console.error('Error processing voice message:', error);
            await msg.reply('Sorry, I had trouble understanding your voice message. Please try again.');
        }
    }
    // ... your other message handlers (e.g., for text commands)
});
```

### Summary of Required Resources

| Category                | Resource                                                              | Purpose                               |
| ----------------------- | --------------------------------------------------------------------- | ------------------------------------- |
| **Server Software**     | `ffmpeg`                                                              | Audio format conversion.              |
|                         | `python3`, `pip`                                                      | To run Whisper.                       |
|                         | `openai-whisper`                                                      | Speech-to-Text engine.                |
|                         | `piper`                                                               | Text-to-Speech engine.                |
| **Node.js Packages**    | `whatsapp-web.js`                                                     | Core WhatsApp automation library.     |
|                         | `fluent-ffmpeg`, `ffmpeg-static`                                      | Programmatic interface for FFmpeg.    |
|                         | `fs-extra`                                                            | File system operations (saving audio). |
|                         | `whisper-node`                                                        | Node.js wrapper for Whisper.          |
| **Server Hardware**     | **2+ CPU Cores**, **4+ GB RAM**                                       | To handle the processing load.        |
