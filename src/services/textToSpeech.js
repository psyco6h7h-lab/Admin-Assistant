const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

/**
 * Generates speech from text using Piper TTS
 * @param {string} text - The text to convert to speech
 * @returns {Promise<string>} - Path to the generated .wav file
 */
async function generateSpeech(text) {
    const tempDir = path.join(__dirname, '..', 'audio', 'temp');
    const inputTxtPath = path.join(tempDir, `input_${Date.now()}.txt`);
    const outputWavPath = path.join(__dirname, '..', 'audio', 'output', `reply_${Date.now()}.wav`);

    try {
        // Ensure directories exist
        fs.ensureDirSync(path.dirname(outputWavPath));
        fs.ensureDirSync(tempDir);

        // Write text to a temp file to avoid "echo" character/pipe limits
        await fs.writeFile(inputTxtPath, text, 'utf8');

        // Paths to Piper
        const piperPath = 'C:\\piper\\piper\\piper.exe';
        const modelPath = 'C:\\piper\\en_US-amy-medium.onnx';

        // Command: type input.txt | piper -m model.onnx -f output.wav
        // Piper reads from stdin on Windows, so we 'type' the file and pipe it.
        const command = `type "${inputTxtPath}" | "${piperPath}" --model "${modelPath}" --output_file "${outputWavPath}"`;

        console.log(`Generating speech with Piper...`);

        return new Promise((resolve, reject) => {
            exec(command, async (error, stdout, stderr) => {
                // Cleanup input file immediately
                try { await fs.remove(inputTxtPath); } catch (e) {}

                if (error) {
                    console.error(`Piper Exec Error: ${error.message}`);
                    return reject(error);
                }
                
                if (fs.existsSync(outputWavPath)) {
                    resolve(outputWavPath);
                } else {
                    reject(new Error('Piper failed to generate output file.'));
                }
            });
        });
    } catch (err) {
        console.error("TTS Preparation Error:", err.message);
        throw err;
    }
}

module.exports = {
    generateSpeech
};
