WhatsApp Voice Agent Integration Plan

Project: Compu-foundation 360° WhatsApp Automation

Goal:
Enable the WhatsApp bot to receive voice messages, understand them, and respond with voice messages.

The system will use Speech-to-Text (STT) and Text-to-Speech (TTS) so users can interact with the bot using voice.

The solution must be:

Free

Accurate

Self-hosted

Compatible with Node.js

Deployable on a VPS

1. System Overview

The WhatsApp automation agent is built using:

whatsapp-web.js
| Feature          | Tool           |
| ---------------- | -------------- |
| Voice → Text     | OpenAI Whisper |
| Text → Voice     | Piper          |
| Audio Conversion | FFmpeg         |

hese tools are open-source and free.

The entire system will run locally on the VPS server without external APIs.

2. System Architecture

Voice message processing pipeline:
User sends WhatsApp voice note
        ↓
whatsapp-web.js receives message
        ↓
Download voice media
        ↓
Convert audio format (.ogg → .wav)
        ↓
Speech-to-Text (Whisper)
        ↓
Agent processes user message
        ↓
Generate response text
        ↓
Text-to-Speech (Piper)
        ↓
Convert audio to WhatsApp compatible format
        ↓
Send voice message reply

3. Voice Processing Flow
Step 1 — Detect Voice Message

The bot listens for incoming messages.

If the message contains media:
msg.hasMedia
Then download the media.

const media = await msg.downloadMedia()

4. Audio Format Handling

WhatsApp voice messages are received in:

OGG format
codec: OPUS

However Whisper works best with:

WAV format

Therefore we must convert the audio.

Tool used:

FFmpeg

Example conversion:

ffmpeg -i voice.ogg voice.wav

5. Speech-to-Text (Voice → Text)

We will use:

OpenAI Whisper

Why Whisper:

very accurate

supports many languages

works offline

open source

no API cost

The process:
voice.wav
   ↓
Whisper
   ↓
transcribed text
Example output:

User voice:
"what is today's homework"

Converted text:
"what is today's homework"
6. AI Agent Processing

After speech is converted to text, the text is sent to the bot logic.

Example:
User voice → text
"What is today's homework?"

Agent processes request

Bot reply text:
"Today's homework is mathematics exercise 5"
7. Text-to-Speech (Bot Reply)

To send a voice reply we convert the text response into audio.

Tool used:

Piper

Why Piper:

fully offline

fast

realistic voices

lightweight

open source

Example command:
echo "Today's homework is mathematics exercise five" | \
piper --model en_US-lessac-medium.onnx \
--output_file response.wav
8. Convert Audio for WhatsApp

WhatsApp prefers OPUS codec for voice notes.

We convert the generated WAV file.

Using FFmpeg:ffmpeg -i response.wav -c:a libopus response.ogg
9. Send Voice Message

After conversion, the bot sends the voice message.

Example:
client.sendMessage(chatId, MessageMedia.fromFilePath("response.ogg"))

10. Required Software Stack

The server must have the following installed.

Node.js packages:
whatsapp-web.js
fluent-ffmpeg
ffmpeg-static
fs-extra
whisper-node
Install command:

npm install whatsapp-web.js fluent-ffmpeg ffmpeg-static fs-extra whisper-node
11. System Dependencies

The VPS server must install:

ffmpeg
python
whisper
piper

Install FFmpeg:

sudo apt update
sudo apt install ffmpeg
12. Folder Structure

Recommended folder structure:
bot/

audio/
   input/
   output/

stt/
   whisper.js

tts/
   piper.js

services/
   audioConverter.js

bot.js

13. Audio Processing Pipeline

Detailed flow:

Incoming message
       ↓
Check if voice message
       ↓
Download media
       ↓
Save audio
       ↓
Convert to WAV
       ↓
Run Whisper STT
       ↓
Get user text
       ↓
Send to agent logic
       ↓
Generate reply text
       ↓
Run Piper TTS
       ↓
Generate voice
       ↓
Convert to OPUS
       ↓
Send voice reply
14. Minimum Server Requirements

For stable processing:
| Resource | Requirement |
| -------- | ----------- |
| RAM      | 4 GB        |
| CPU      | 2 cores     |
| Disk     | 10 GB       |

Works on most VPS servers.

GPU is not required.

15. Advantages of This Architecture

Benefits:

No API cost

Fully offline processing

Good accuracy

Fast response

Privacy friendly

Scalable

16. Future Improvements

Possible future upgrades:

Real-time streaming voice assistant

Multiple language support

Voice personalization

Voice emotion detection

Faster inference using GPU

17. Final Technology Stack

The WhatsApp voice agent will use:
| Component           | Technology      |
| ------------------- | --------------- |
| WhatsApp Automation | whatsapp-web.js |
| Speech Recognition  | OpenAI Whisper  |
| Text-to-Speech      | Piper           |
| Audio Processing    | FFmpeg          |
| Runtime             | Node.js         |

✅ This architecture allows the WhatsApp bot to operate as a complete voice assistant.


