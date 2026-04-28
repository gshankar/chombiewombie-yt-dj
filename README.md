# ChombieWombie Tracklist Studio 🎧🎬

A premium web-based tool for DJs to transform their recorded mixes into professional YouTube content. This application provides a seamless, persistent workspace to manually refine tracklists, tag audio, and generate metadata and automation patches for video post-production.

## 🚀 Key Features

### 1. Minimalist Studio Interface
- **Session Persistence**: Never lose your work. Your tracklist, timestamps, audio metadata, and custom configurations are automatically saved to your browser's local memory and instantly restored on reload.
- **Drag & Drop Reordering**: Rearrange your tracks intuitively by grabbing the handle on any track row.
- **Interactive Waveform**: Full interactive waveform preview powered by Wavesurfer.js. Use the "Tag Track" map-pin button to snap a track's start time exactly to your playhead.

### 2. Smart CUE Parsing
- **Load CUE**: Import Rekordbox `.cue` files to automatically generate your tracklist.
- **Flexible Timecodes**: Robust parsing engine converts CUE timestamps into standard HH:MM:SS format, ready for YouTube.

### 3. Custom VS2 Vibe Automations
- **Human-Friendly Config**: Ditch the JSON. Use the sleek "Vibes Config" UI to define your own custom Vibe Names (e.g., *Chill*, *Drop*, *Ambient*).
- **Patch Mapping**: Assign comma-separated VS2 Patch Names to your custom Vibes. 
- **VS2 Playlist Export**: Generates a JSON playlist compatible with the VS2 visualizer. The engine automatically rotates randomly between your assigned patches within a given Vibe, and splits segments to ensure visuals refresh every 3 minutes.

### 4. MIDI Rhythm Extraction
- **Multi-Band Analysis**: Extracts rhythmic data from the actual audio of your mix using three independent frequency bands:
    - **Channel 1**: Bass / Kick (Low-pass 150Hz)
    - **Channel 2**: Mids / Snare (Band-pass 1kHz)
    - **Channel 3**: Treble / Hats (High-pass 4kHz)
- **Dynamic Velocity**: Note velocity is mapped to the actual energy of the hit, providing "soul" and reactivity for your visualizer.
- **Export to DAW/VS2**: Outputs a standard MIDI file for driving reactive visuals.

## 🛠 Technology Stack
- **Core**: Vanilla JavaScript / HTML5 / CSS3
- **Audio Engine**: Web Audio API (OfflineAudioContext)
- **Visualization**: [Wavesurfer.js](https://wavesurfer-js.org/)
- **MIDI Engine**: [MidiWriter.js](https://github.com/grimmdude/MidiWriterJS)
- **Icons**: [Lucide](https://lucide.dev/)

## 📖 How to Use
1. **Load Files**: Use the "Load Audio" and "Load CUE" buttons in the top right header.
2. **Refine**: Edit track names, reorder them, or use the playhead to accurately tag their timestamps on the waveform.
3. **Configure Vibes**: Click "Vibes Config" to assign your VS2 presets to the intensity levels in your dropdowns.
4. **Export**: Open the "Export Suite" dropdown in the header to:
    - Copy YouTube Chapters directly to your clipboard.
    - Download the VS2 automation playlist.
    - Extract and download the 3-channel MIDI rhythm track.

## 🔒 Privacy
All processing is done **locally in your browser**. Your music files, metadata, and CUE sheets are never uploaded to a server.

---
*Created by Antigravity for ChombieWombie.*
