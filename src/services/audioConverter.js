const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const path = require('path');
const fs = require('fs-extra');

// Set ffmpeg path to the static binary installed via npm
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Converts OGG (WhatsApp format) to WAV (Whisper format)
 * @param {string} inputPath - Path to the input .ogg file
 * @returns {Promise<string>} - Path to the generated .wav file
 */
async function convertOggToWav(inputPath) {
    const outputPath = inputPath.replace('.ogg', '.wav');
    
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .toFormat('wav')
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
}

/**
 * Converts WAV to OGG with Opus codec (WhatsApp compatible format)
 * @param {string} inputPath - Path to the input .wav file
 * @returns {Promise<string>} - Path to the generated .ogg file
 */
async function convertWavToOgg(inputPath) {
    // We'll save it to the output folder
    const fileName = path.basename(inputPath).replace('.wav', '.ogg');
    const outputPath = path.join(path.dirname(inputPath), '..', 'output', fileName);
    
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioCodec('libopus')
            .toFormat('ogg')
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
}

module.exports = {
    convertOggToWav,
    convertWavToOgg
};
