# ChombieWombie YT DJ 🎧🎬

A premium web-based tool for DJs to transform their recorded mixes into professional YouTube content. This application automates the tedious parts of post-production, including chapter generation, visual scene mapping, and rhythmic MIDI extraction.

## 🚀 Key Features

### 1. Rekordbox CUE to YouTube Chapters
- **Drag & Drop**: Simply drop your `.cue` file to generate YouTube-ready timestamps.
- **Smart Formatting**: Automatically converts various CUE time formats (MM:SS:FF) into YouTube's required HH:MM:SS format.
- **Deduplication**: Filters out duplicate track loads and noise from the CUE metadata.

### 2. Mix Lab (Audio Analysis)
- **Visual Waveform**: Full interactive waveform preview powered by Wavesurfer.js.
- **Precision Detection**: Uses RMS energy analysis and a novelty curve algorithm to detect breakdowns, drops, and track transitions.
- **Auto-Snap**: Metadata from your CUE file automatically "snaps" to the nearest detected audio transition for frame-perfect timestamps.

### 3. Visual Sync (VS2 Visualizer Integration)
- **Vibe Analysis**: Categorizes the mix into **Chill**, **Happy**, and **Aggressive** segments based on dynamic energy percentiles.
- **Percentile-Based Mapping**: Guarantees an even distribution of visual intensities regardless of the mix's overall volume.
- **VS2 Playlist Export**: Generates a JSON playlist compatible with the VS2 visualizer, featuring:
    - **Random Rotation**: Automatically cycles between patches in the same intensity pool.
    - **3-Minute Limit**: Automatically splits long scenes to ensure a visual refresh at least every 180 seconds.
    - **Local Bank Support**: Optimized for the "Local" patch bank.

### 4. MIDI Rhythm Extraction
- **Multi-Band Analysis**: Extracts rhythmic data from three independent frequency bands:
    - **Channel 1**: Bass / Kick (Low-pass 150Hz)
    - **Channel 2**: Mids / Snare (Band-pass 1kHz)
    - **Channel 3**: Treble / Hats (High-pass 4kHz)
- **Dynamic Velocity**: Note velocity is mapped to the actual energy of the hit, providing "soul" and reactivity for your visualizer.
- **Multi-Track Export**: Outputs a standard MIDI file with 3 distinct tracks for independent mapping in VS2 or any DAW.

## 🛠 Technology Stack
- **Core**: Vanilla JavaScript / HTML5 / CSS3
- **Audio Engine**: Web Audio API (OfflineAudioContext for fast analysis)
- **Visualization**: [Wavesurfer.js](https://wavesurfer-js.org/)
- **MIDI Engine**: [MidiWriter.js](https://github.com/grimmdude/MidiWriterJS)
- **Icons**: [Lucide](https://lucide.dev/)

## 📖 How to Use
1. **Load CUE**: Drop your Rekordbox `.cue` file into the "CUE Converter" tab.
2. **Load Audio**: Upload your mix (MP3, WAV, FLAC) in the "Mix Lab".
3. **Analyze**: Click "Analyze & Sync" to process the audio.
4. **Visual Sync**: Preview the intensity map and download the VS2 playlist JSON.
5. **MIDI Sync**: Download the rhythm-matched MIDI file to drive your reactive visuals.

## 🔒 Privacy
All processing is done **locally in your browser**. Your music files are never uploaded to a server.

---
*Created by Antigravity for ChombieWombie.*
