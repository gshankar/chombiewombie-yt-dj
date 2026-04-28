# ChombieWombie Tracklist Studio v0.1 🎧🎬

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

## 📖 Comprehensive Workflow Guide

1. **Boot the Studio**
   The studio will automatically remember your previous session. If you want to start fresh, open the **Export Suite** dropdown and click **Reset Studio**.

2. **Load Assets**
   - **Load Mix Audio**: Use the button in the top right to load your `.wav`, `.mp3`, or `.flac` mix recording. A waveform will immediately generate.
   - **Load CUE Sheet**: Use the button to load your `.cue` file exported from Rekordbox. The parser translates your mix markers into exact `HH:MM:SS` timestamps and builds your tracklist table.

3. **Refine & Tag Tracks**
   - **Reorder**: Grab the handle (6 dots) on the left side of any row to drag and drop tracks into the correct order.
   - **Tag Time**: Need to fix a marker? Click anywhere on the waveform to move the playhead, then click the **Tag Track (Map Pin)** icon on a track row. That track's timestamp will instantly snap to the playhead's current position!
   - **Set the Vibe**: Use the dropdown on each track row to assign its intensity/mood.

4. **Configure Vibes & VS2 Automations**
   - Click the **⚙️ Vibes Config** button in the header to open the settings modal.
   - You aren't forced into hardcoded moods. You can create your own custom Vibe Names (e.g., *Intro*, *Chill*, *Peak*, *Outro*). 
   - Next to each Vibe Name, type in a comma-separated list of your favorite **VS2 visual patches**. When the mix transitions into that vibe, the VS2 Playlist generator will randomly pick a patch from that specific list!

5. **Preview Your Exports**
   Scroll to the bottom of the page to find the **Preview Section**. You can click the tabs to see exactly what the YouTube Chapters text block or the raw VS2 JSON will look like before you export them.

6. **The Export Suite**
   Open the dropdown in the top-right corner to finalize your post-production:
    - **Copy YT Chapters**: Instantly copies the perfectly formatted text box into your clipboard so you can paste it directly into your YouTube description.
    - **Download VS2 Playlist**: Downloads the `_playlist.json` file to be loaded directly into your visualizer.
    - **Extract MIDI Rhythm**: The engine will analyze the actual audio file you loaded, scanning the Bass, Mids, and Treble frequencies. After a few seconds, it will automatically download a `.mid` file to your computer. You can drop this into your DAW or visualizer to drive reactive elements based on the exact energy spikes of your mix! You'll see a green toast notification pop up when it succeeds.

## 🔒 Privacy
All processing is done **locally in your browser**. Your music files, metadata, and CUE sheets are never uploaded to a server. Everything remains private on your machine.

---
*Made with love by the ChombieWombie Team*
