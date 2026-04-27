/**
 * ChombieWombie Tracklist Studio
 * A manual post-production suite for DJs
 */

// --- Global State ---
let tracklist = [];
let audioBuffer = null;
let mixFileName = 'my_mix';
let isProcessing = false;
let currentPreviewTab = 'yt';
const TEST_MODE = true; // Set to false to disable auto-loading test files

let vibeConfig = {
    'Chill': ['CW1 Chill', 'CW Chill 2'],
    'Happy': ['CW Happy 1', 'CW Happy 2'],
    'Aggressive': ['CW 3 Intense', 'CW Intense 2']
};


// --- DOM Elements ---
const tracklistBody = document.getElementById('tracklist-body');
const waveformSection = document.getElementById('waveform-section');
const setupView = document.getElementById('setup-view');
const studioView = document.getElementById('studio-view');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

const playBtn = document.getElementById('play-btn');
const stopBtn = document.getElementById('stop-btn');
const tagBtn = document.getElementById('tag-btn');
const currentTimeDisplay = document.getElementById('current-time');


// --- Helpers ---
function showLoading(text = "Processing...") {
    loadingText.textContent = text;
    loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    loadingOverlay.style.display = 'none';
}

function checkViewState() {
    // Show studio if either audio or tracklist exists
    if (audioBuffer || tracklist.length > 0) {
        setupView.style.display = 'none';
        studioView.style.display = 'flex';
    } else {
        setupView.style.display = 'flex';
        studioView.style.display = 'none';
    }
}

// --- Wavesurfer Setup ---
const wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#4a4a4a',
    progressColor: '#d9ff00',
    cursorColor: '#ffffff',
    barWidth: 2,
    barGap: 1,
    height: 120,
    responsive: true,
    normalize: true,
    plugins: [
        WaveSurfer.Spectrogram.create({
            container: '#spectrogram',
            labels: true,
            height: 100,
            splitChannels: false
        })
    ]
});

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadSession();
    lucide.createIcons();
    renderTracklist();
    checkViewState();

    if (TEST_MODE && tracklist.length === 0) {
        runTestMode();
    }
});

// --- Session Persistence ---
function saveSession() {
    const session = {
        tracklist: tracklist,
        vibeConfig: vibeConfig,
        mixFileName: mixFileName
    };
    localStorage.setItem('cw_session', JSON.stringify(session));
}

function loadSession() {
    try {
        const data = localStorage.getItem('cw_session');
        if (data) {
            const session = JSON.parse(data);
            if (session.tracklist) tracklist = session.tracklist;
            if (session.mixFileName) mixFileName = session.mixFileName;
            
            if (session.vibeConfig) {
                // Backward compatibility: Convert old object arrays to string arrays
                for (let key in session.vibeConfig) {
                    let pool = session.vibeConfig[key];
                    if (pool.length > 0 && typeof pool[0] === 'object') {
                        session.vibeConfig[key] = pool.map(p => p.patch_name || '[Unknown]');
                    }
                }
                vibeConfig = session.vibeConfig;
            }
        }
    } catch(e) {
        console.error("Error loading session", e);
    }
}


function createSilentWavBlob(durationSecs) {
    const sampleRate = 8000; 
    const numChannels = 1;
    const bitsPerSample = 8;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const dataSize = durationSecs * byteRate;
    const chunkSize = 36 + dataSize;
    
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, chunkSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); 
    view.setUint16(20, 1, true); 
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    new Uint8Array(buffer, 44).fill(128); // 128 is silence in 8-bit PCM
    return new Blob([buffer], { type: 'audio/wav' });
}

async function runTestMode() {
    console.log("TEST MODE ACTIVE: Loading mock CUE data...");
    
    const mockCue = `PERFORMER "Test DJ"
TITLE "ChombieWombie Test Mix"
FILE "test.mp3" MP3
  TRACK 01 AUDIO
    TITLE "Track 1"
    PERFORMER "Artist A"
    INDEX 01 00:00:00
  TRACK 02 AUDIO
    TITLE "Track 2"
    PERFORMER "Artist B"
    INDEX 01 05:30:00
  TRACK 03 AUDIO
    TITLE "Track 3"
    PERFORMER "Artist C"
    INDEX 01 15:45:00
  TRACK 04 AUDIO
    TITLE "Track 4"
    PERFORMER "Artist D"
    INDEX 01 45:15:00`;

    // Generate a synthetic waveform (noise + sine wave) for visual testing
    const peaks = new Float32Array(1000);
    for (let i = 0; i < peaks.length; i++) {
        peaks[i] = (Math.abs(Math.sin(i * 0.05)) * 0.5) + (Math.random() * 0.5);
    }
    
    // Generate a 1-hour silent audio blob so playback and seeking work
    const duration = 3600;
    const blob = createSilentWavBlob(duration);
    const url = URL.createObjectURL(blob);
    
    // Load fake peaks and the silent audio
    await wavesurfer.load(url, [peaks], duration);

    const tracks = parseCueToObjects(mockCue);
    if (tracks.length > 0) {
        tracklist = tracks;
        renderTracklist();
        checkViewState();
        saveSession();
    }
}

wavesurfer.on('ready', () => {
    renderTimelineRuler();
});

window.addEventListener('resize', () => {
    if (wavesurfer.getDuration() > 0) {
        renderTimelineRuler();
    }
});

// --- Event Listeners ---
document.getElementById('audio-drop-card').onclick = () => document.getElementById('audio-input').click();
document.getElementById('cue-drop-card').onclick = () => document.getElementById('cue-input').click();
document.getElementById('load-audio-btn').onclick = () => document.getElementById('audio-input').click();
document.getElementById('load-cue-btn').onclick = () => document.getElementById('cue-input').click();

document.getElementById('audio-input').onchange = (e) => {
    if (e.target.files[0]) loadAudio(e.target.files[0]);
};

document.getElementById('cue-input').onchange = (e) => {
    if (e.target.files[0]) loadCue(e.target.files[0]);
};

playBtn.onclick = () => {
    wavesurfer.playPause();
    updatePlayBtn();
};

stopBtn.onclick = () => {
    wavesurfer.pause();
    wavesurfer.setTime(0);
    updatePlayBtn();
};

tagBtn.onclick = () => addTrackAtCurrentTime();

document.getElementById('sort-btn').onclick = () => {
    tracklist.sort((a, b) => a.startTime - b.startTime);
    renderTracklist();
};

document.getElementById('reset-btn').onclick = () => {
    if (confirm("Clear entire tracklist and wipe session?")) {
        tracklist = [];
        localStorage.removeItem('cw_session');
        renderTracklist();
        checkViewState();
    }
};

// --- Settings Modal ---
const settingsModal = document.getElementById('settings-modal');

function renderVibeSettings() {
    const container = document.getElementById('vibe-ui-container');
    container.innerHTML = '';
    
    for (let vibeName in vibeConfig) {
        addVibeRow(vibeName, vibeConfig[vibeName].join(', '));
    }
    lucide.createIcons();
}

function addVibeRow(name = '', patches = '') {
    const container = document.getElementById('vibe-ui-container');
    const row = document.createElement('div');
    row.className = 'vibe-setting-row';
    row.style.display = 'flex';
    row.style.gap = '1rem';
    row.style.marginBottom = '0.5rem';
    
    row.innerHTML = `
        <input type="text" class="cell-input vibe-name-input" value="${name}" placeholder="e.g. Happy" style="flex: 1; border: 1px solid var(--border); padding: 0.5rem;">
        <input type="text" class="cell-input vibe-patches-input" value="${patches}" placeholder="e.g. Patch1, Patch2" style="flex: 2; border: 1px solid var(--border); padding: 0.5rem;">
        <button class="btn btn-danger remove-vibe-btn" style="padding: 0.5rem;" title="Remove Vibe"><i data-lucide="trash-2"></i></button>
    `;
    
    row.querySelector('.remove-vibe-btn').onclick = () => row.remove();
    container.appendChild(row);
    lucide.createIcons();
}

document.getElementById('add-vibe-btn').onclick = () => addVibeRow();

document.getElementById('settings-btn').onclick = () => {
    renderVibeSettings();
    settingsModal.style.display = 'flex';
};

document.getElementById('close-settings-btn').onclick = () => {
    settingsModal.style.display = 'none';
};

document.getElementById('save-settings-btn').onclick = () => {
    const rows = document.querySelectorAll('.vibe-setting-row');
    const newConfig = {};
    rows.forEach(row => {
        const name = row.querySelector('.vibe-name-input').value.trim();
        const patches = row.querySelector('.vibe-patches-input').value.split(',').map(s => s.trim()).filter(s => s);
        if (name && patches.length > 0) {
            newConfig[name] = patches;
        }
    });
    
    if (Object.keys(newConfig).length === 0) {
        alert("You must have at least one valid Vibe with patches.");
        return;
    }
    
    vibeConfig = newConfig;
    saveSession();
    renderTracklist();
    updatePreview();
    settingsModal.style.display = 'none';
};

// --- Preview Tab Handlers ---
document.querySelectorAll('.preview-tab').forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll('.preview-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentPreviewTab = tab.getAttribute('data-preview');
        updatePreview();
    };
});

// --- Keyboard Shortcuts ---
window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') {
        e.preventDefault();
        wavesurfer.playPause();
        updatePlayBtn();
    }
    if (e.code === 'KeyT') {
        addTrackAtCurrentTime();
    }
});

// --- Audio Loading ---
async function loadAudio(file) {
    showLoading("Decoding Audio...");
    try {
        mixFileName = file.name.replace(/\.[^/.]+$/, "");
        const url = URL.createObjectURL(file);
        
        // Await the wavesurfer load promise so we don't hide the overlay prematurely
        await wavesurfer.load(url);
        console.log("Wavesurfer loaded.");
        
        // Attempt to reuse Wavesurfer's decoded buffer to save massive amounts of RAM
        if (typeof wavesurfer.getDecodedData === 'function') {
            audioBuffer = wavesurfer.getDecodedData();
        }

        // Fallback: decode manually if the API isn't available
        if (!audioBuffer) {
            console.log("Decoding manually for MIDI analysis...");
            const arrayBuffer = await file.arrayBuffer();
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        }
        
        console.log("Audio ready for playback and analysis.");
        checkViewState();
    } catch (err) {
        alert("Error loading audio: " + err.message);
    } finally {
        hideLoading();
    }
}

// --- CUE Loading ---
async function loadCue(file) {
    showLoading("Parsing CUE...");
    try {
        const text = await file.text();
        const tracks = parseCueToObjects(text);
        
        if (tracks.length > 0) {
            tracklist = tracks;
            renderTracklist();
            checkViewState();
        }
    } finally {
        hideLoading();
    }
}

// --- Track Management ---
function addTrackAtCurrentTime() {
    const time = wavesurfer.getCurrentTime();
    const newTrack = {
        id: crypto.randomUUID(),
        startTime: time,
        artist: "New Artist",
        title: "New Track",
        intensity: "Happy"
    };
    tracklist.push(newTrack);
    tracklist.sort((a, b) => a.startTime - b.startTime);
    renderTracklist();
}

function updateTrack(id, field, value) {
    const track = tracklist.find(t => t.id === id);
    if (track) {
        if (field === 'startTime') {
            track[field] = parseFloat(value) || 0;
        } else {
            track[field] = value;
        }
        saveSession();
        updatePreview();
    }
}

function deleteTrack(id) {
    tracklist = tracklist.filter(t => t.id !== id);
    saveSession();
    renderTracklist();
}

function addTrackAtCurrentTime() {
    const time = wavesurfer.getCurrentTime();
    tracklist.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        title: "New Track",
        artist: "Unknown",
        startTime: time,
        intensity: Object.keys(vibeConfig)[0] || "Happy"
    });
    tracklist.sort((a, b) => a.startTime - b.startTime);
    saveSession();
    renderTracklist();
}

function updateTrackTime(id, timeStr) {
    const track = tracklist.find(t => t.id === id);
    if (track) {
        let seconds = 0;
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) {
            seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            seconds = parts[0] * 60 + parts[1];
        } else if (parts.length === 1) {
            seconds = parts[0];
        }
        if (!isNaN(seconds)) {
            track.startTime = seconds;
            tracklist.sort((a, b) => a.startTime - b.startTime);
            saveSession();
            renderTracklist();
        }
    }
}

function tagTrackTime(id) {
    const time = wavesurfer.getCurrentTime();
    const track = tracklist.find(t => t.id === id);
    if (track) {
        track.startTime = time;
        tracklist.sort((a, b) => a.startTime - b.startTime);
        saveSession();
        renderTracklist();
    }
}

// --- Drag & Drop Reordering Variables ---
let draggedTrackIndex = null;

// --- UI Rendering ---
function renderTracklist() {
    tracklistBody.innerHTML = '';
    const markerContainer = document.getElementById('waveform-markers');
    markerContainer.innerHTML = '';
    const totalDuration = wavesurfer.getDuration() || 1;

    const vibeOptions = Object.keys(vibeConfig).map(v => `<option value="${v}">${v}</option>`).join('');

    tracklist.forEach((track, index) => {
        // Render Row
        const row = document.createElement('tr');
        row.className = 'track-row';
        row.draggable = true;
        
        // Drag Events
        row.ondragstart = (e) => {
            draggedTrackIndex = index;
            e.dataTransfer.effectAllowed = 'move';
            row.style.opacity = '0.5';
        };
        row.ondragover = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            row.style.borderTop = '2px solid var(--accent)';
        };
        row.ondragleave = () => {
            row.style.borderTop = '';
        };
        row.ondrop = (e) => {
            e.preventDefault();
            row.style.borderTop = '';
            if (draggedTrackIndex !== null && draggedTrackIndex !== index) {
                const draggedItem = tracklist.splice(draggedTrackIndex, 1)[0];
                tracklist.splice(index, 0, draggedItem);
                saveSession();
                renderTracklist();
            }
            draggedTrackIndex = null;
        };
        row.ondragend = () => {
            row.style.opacity = '1';
            draggedTrackIndex = null;
        };

        row.innerHTML = `
            <td style="color: var(--text-dim); cursor: grab;"><i data-lucide="grip-vertical" style="width:16px;height:16px;"></i> ${index + 1}</td>
            <td><input class="cell-input" value="${track.artist}" onchange="updateTrack('${track.id}', 'artist', this.value)"></td>
            <td><input class="cell-input" value="${track.title}" onchange="updateTrack('${track.id}', 'title', this.value)"></td>
            <td>
                <div style="display: flex; gap: 0.25rem; align-items: center;">
                    <button class="btn btn-accent" onclick="tagTrackTime('${track.id}')" style="padding: 0.1rem 0.3rem;" title="Set to current playhead"><i data-lucide="map-pin"></i></button>
                    <input class="cell-input time-input" value="${formatTimePrecision(track.startTime)}" onchange="updateTrackTime('${track.id}', this.value)" style="font-family: var(--font-data); width: 80px; color: var(--accent);">
                    <button class="btn" onclick="jumpToTrack(${track.startTime})" style="padding: 0.1rem 0.3rem;" title="Jump to time"><i data-lucide="crosshair"></i></button>
                </div>
            </td>
            <td>
                <select class="vibe-select" onchange="updateTrack('${track.id}', 'intensity', this.value)">
                    ${Object.keys(vibeConfig).map(v => `<option value="${v}" ${track.intensity === v ? 'selected' : ''}>${v}</option>`).join('')}
                </select>
            </td>
            <td><button class="btn btn-danger" onclick="deleteTrack('${track.id}')" style="padding: 0.1rem 0.3rem;"><i data-lucide="x"></i></button></td>
        `;

        tracklistBody.appendChild(row);

        // Render Waveform Marker
        const markerPos = (track.startTime / totalDuration) * 100;
        const marker = document.createElement('div');
        marker.className = 'waveform-marker';
        marker.style.left = `${markerPos}%`;
        
        // Stagger labels to prevent overlapping
        const verticalOffset = (index % 4) * 16; 
        marker.innerHTML = `<span class="marker-label" style="top: ${verticalOffset}px;">${index + 1}</span>`;
        markerContainer.appendChild(marker);
    });
    lucide.createIcons();
    updatePreview();
}

function renderTimelineRuler() {
    const ruler = document.getElementById('timeline-ruler');
    ruler.innerHTML = '';
    const duration = wavesurfer.getDuration();
    if (!duration) return;

    const containerWidth = ruler.clientWidth || 800;
    const minTickSpacing = 70; // pixels
    const maxTicks = Math.max(1, Math.floor(containerWidth / minTickSpacing));
    
    // Find a nice interval (in seconds)
    const rawInterval = duration / maxTicks;
    const niceIntervals = [10, 30, 60, 120, 300, 600, 900, 1800, 3600];
    let interval = niceIntervals[niceIntervals.length - 1];
    for (let nice of niceIntervals) {
        if (rawInterval <= nice) {
            interval = nice;
            break;
        }
    }

    const numTicks = Math.floor(duration / interval);
    
    for (let i = 1; i <= numTicks; i++) {
        const time = i * interval;
        const pos = (time / duration) * 100;
        
        const tick = document.createElement('div');
        tick.className = 'ruler-tick';
        tick.style.left = `${pos}%`;

        const label = document.createElement('div');
        label.className = 'ruler-label';
        label.style.left = `${pos}%`;
        label.textContent = formatTimePrecision(time);

        ruler.appendChild(tick);
        ruler.appendChild(label);
    }
}

function updatePreview() {
    const previewContainer = document.querySelector('.preview-container');
    const previewContent = document.getElementById('preview-content');
    
    // Save scroll position
    const scrollPos = previewContainer ? previewContainer.scrollTop : 0;

    if (currentPreviewTab === 'yt') {
        const chapters = tracklist.map(t => `${formatTimePrecision(t.startTime)} ${t.artist} - ${t.title}`).join('\n');
        previewContent.textContent = chapters || "No tracks added yet.";
    } else {
        const playlist = generateVS2Data();
        previewContent.textContent = JSON.stringify(playlist, null, 4);
    }
    
    // Restore scroll position so the user doesn't lose their place
    if (previewContainer) {
        previewContainer.scrollTop = scrollPos;
    }
}

function generateVS2Data() {
    const entries = [];
    const totalDuration = wavesurfer.getDuration() || 0;

    tracklist.forEach((track, i) => {
        const nextTime = (i < tracklist.length - 1) ? tracklist[i+1].startTime : totalDuration;
        const segmentDuration = nextTime - track.startTime;
        const maxDur = 180;
        const numChunks = Math.ceil(segmentDuration / maxDur);
        const chunkDur = segmentDuration / numChunks;

        let chunkIdCounter = 0;
        for (let j = 0; j < numChunks; j++) {
            const pool = vibeConfig[track.intensity] || vibeConfig[Object.keys(vibeConfig)[0]];
            const patchName = pool[Math.floor(Math.random() * pool.length)];
            entries.push({
                bank_name: "Local",
                duration: Math.round(chunkDur),
                id: chunkIdCounter++,
                patch_name: patchName
            });
        }
    });

    return {
        _version: 1,
        schema_version: 1,
        playlist: entries,
        fade_in_time: 1000,
        fade_out_time: 1000
    };
}

function jumpToTrack(time) {
    wavesurfer.setTime(time);
}

function updatePlayBtn() {
    const isPlaying = wavesurfer.isPlaying();
    playBtn.innerHTML = isPlaying ? '<i data-lucide="pause"></i> Pause' : '<i data-lucide="play"></i> Play';
    lucide.createIcons();
}

wavesurfer.on('timeupdate', (currentTime) => {
    currentTimeDisplay.textContent = formatTimePrecision(currentTime);
});

// --- Exports ---
function copyYouTubeChapters() {
    const chapters = tracklist.map(t => `${formatTimePrecision(t.startTime)} ${t.artist} - ${t.title}`).join('\n');
    navigator.clipboard.writeText(chapters).then(() => alert("Chapters copied to clipboard!"));
}

async function downloadVS2Playlist() {
    const playlist = generateVS2Data();
    const blob = new Blob([JSON.stringify(playlist, null, 4)], { type: 'application/json' });
    if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({
            suggestedName: `${mixFileName}_playlist.json`,
            types: [{ description: 'JSON Playlist', accept: { 'application/json': ['.json'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
    } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${mixFileName}_playlist.json`;
        a.click();
    }
}

// --- MIDI Extraction Logic (Kept and Optimized) ---
async function extractMidiRhythm() {
    if (!audioBuffer) {
        alert("Load audio first!");
        return;
    }
    showLoading("Extracting Rhythm...");
    const midiStatus = document.getElementById('midi-debug-log');
    const downloadBtn = document.getElementById('download-midi-btn');
    midiStatus.style.display = 'block';
    midiStatus.innerHTML = "> Analyzing mix rhythm...";
    
    try {
        const duration = audioBuffer.duration;
        const bassOnsets = await analyzeBand(audioBuffer, 'lowpass', 150, 0.2);
        const midOnsets = await analyzeBand(audioBuffer, 'bandpass', 1000, 0.2);
        const trebleOnsets = await analyzeBand(audioBuffer, 'highpass', 4000, 0.1);

        const bassTrack = new MidiWriter.Track();
        const midTrack = new MidiWriter.Track();
        const trebleTrack = new MidiWriter.Track();

        const addOnsetsToTrack = (onsets, note, channel, track) => {
            onsets.forEach(onset => {
                const tick = Math.floor((onset.time / 60) * 120 * 128);
                const velocity = Math.min(127, Math.max(40, Math.floor(onset.energy * 250)));
                track.addEvent(new MidiWriter.NoteEvent({
                    pitch: [note], duration: 'T8', startTick: tick, velocity: velocity, channel: channel
                }));
            });
            // Marker at end
            track.addEvent(new MidiWriter.NoteEvent({
                pitch: ['C0'], duration: '1', startTick: Math.floor((duration / 60) * 120 * 128), velocity: 1, channel: channel
            }));
        };

        addOnsetsToTrack(bassOnsets, 'C1', 1, bassTrack);
        addOnsetsToTrack(midOnsets, 'D1', 2, midTrack);
        addOnsetsToTrack(trebleOnsets, 'F#1', 3, trebleTrack);

        const write = new MidiWriter.Writer([bassTrack, midTrack, trebleTrack]);
        const base64 = write.base64();

        midiStatus.innerHTML += `<br>> Extraction complete. ${bassOnsets.length + midOnsets.length + trebleOnsets.length} notes found.`;
        downloadBtn.style.display = 'block';
        hideLoading();
        downloadBtn.onclick = async () => {
            const binaryStr = atob(base64);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
            const blob = new Blob([bytes], {type: 'audio/midi'});
            
            if ('showSaveFilePicker' in window) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: `${mixFileName}.mid`,
                    types: [{ description: 'MIDI File', accept: { 'audio/midi': ['.mid'] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
            }
        };
    } catch (err) {
        midiStatus.innerHTML += `<br>> Error: ${err.message}`;
    }
}

// --- Utilities ---
function formatTimePrecision(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function parseCueToObjects(text) {
    const lines = text.split(/\r?\n/);
    const tracks = [];
    let currentTrack = null;
    let globalPerformer = "Unknown Artist";

    for (let line of lines) {
        const performerMatch = line.trim().match(/^PERFORMER\s+"(.+)"/i);
        if (performerMatch && !currentTrack) globalPerformer = performerMatch[1];
        
        const trackMatch = line.trim().match(/^TRACK\s+(\d+)\s+AUDIO/i);
        if (trackMatch) {
            currentTrack = { id: crypto.randomUUID(), title: "Unknown Title", artist: globalPerformer, startTime: 0, intensity: "Happy" };
            tracks.push(currentTrack);
        }

        if (currentTrack) {
            const tMatch = line.trim().match(/^TITLE\s+"(.+)"/i);
            const pMatch = line.trim().match(/^PERFORMER\s+"(.+)"/i);
            const iMatch = line.trim().match(/^INDEX\s+01\s+(\d{1,3}):(\d{2}):(\d{2})/i);

            if (tMatch) currentTrack.title = tMatch[1];
            if (pMatch) currentTrack.artist = pMatch[1];
            if (iMatch) {
                const mm = parseInt(iMatch[1]);
                const ss = parseInt(iMatch[2]);
                currentTrack.startTime = mm * 60 + ss;
            }
        }
    }
    return tracks;
}

async function analyzeBand(audioBuffer, filterType, freq, threshold) {
    const targetSampleRate = 8000;
    const offlineCtx = new OfflineAudioContext(1, Math.floor(audioBuffer.duration * targetSampleRate), targetSampleRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    const filter = offlineCtx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    source.connect(filter);
    filter.connect(offlineCtx.destination);
    source.start();

    const renderedBuffer = await offlineCtx.startRendering();
    const data = renderedBuffer.getChannelData(0);
    const sampleRate = renderedBuffer.sampleRate;
    const onsets = [];
    const windowSize = Math.floor(sampleRate * 0.1); 
    let lastEnergy = 0;
    let cooldown = 0;

    for (let i = 0; i < data.length; i += windowSize) {
        let sum = 0;
        let count = 0;
        for (let j = 0; j < windowSize && (i + j) < data.length; j++) {
            sum += data[i + j] * data[i + j];
            count++;
        }
        const energy = Math.sqrt(sum / count);
        if (energy > lastEnergy * (1 + threshold) && energy > 0.03 && cooldown <= 0) {
            onsets.push({ time: i / sampleRate, energy: energy });
            cooldown = Math.floor(sampleRate * 0.25 / windowSize); 
        }
        lastEnergy = energy;
        if (cooldown > 0) cooldown--;
        if (onsets.length > 5000) break;
    }
    return onsets;
}

