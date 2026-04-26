// Tab Switching
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

// Wavesurfer Initialization
let wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#94a3b8',
    progressColor: '#7c3aed',
    cursorColor: '#ec4899',
    barWidth: 2,
    barRadius: 3,
    responsive: true,
    height: 120,
});

const audioInput = document.getElementById('audio-input');
const audioDropZone = document.getElementById('audio-drop-zone');
const waveformContainer = document.getElementById('waveform-container');
const playBtn = document.getElementById('play-btn');
const analyzeBtn = document.getElementById('analyze-btn');

audioDropZone.addEventListener('click', () => audioInput.click());
audioInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) loadAudio(file);
});

audioDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    audioDropZone.classList.add('drag-over');
});

audioDropZone.addEventListener('dragleave', () => audioDropZone.classList.remove('drag-over'));

audioDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    audioDropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
        loadAudio(file);
    }
});

playBtn.addEventListener('click', () => {
    wavesurfer.playPause();
    const isPlaying = wavesurfer.isPlaying();
    playBtn.innerHTML = isPlaying ? '<i data-lucide="pause"></i> Pause' : '<i data-lucide="play"></i> Play';
    lucide.createIcons();
});

const linkedCueInput = document.getElementById('linked-cue-input');
const linkedCueZone = document.getElementById('linked-cue-zone');
let linkedCueData = null;

linkedCueZone.addEventListener('click', () => linkedCueInput.click());
linkedCueInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) handleLinkedCue(file);
});

linkedCueZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    linkedCueZone.classList.add('drag-over');
});

linkedCueZone.addEventListener('dragleave', () => {
    linkedCueZone.classList.remove('drag-over');
});

linkedCueZone.addEventListener('drop', (e) => {
    e.preventDefault();
    linkedCueZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.cue')) {
        handleLinkedCue(file);
    }
});

async function handleLinkedCue(file) {
    const text = await file.text();
    linkedCueData = parseCueToObjects(text);
    linkedCueZone.innerHTML = `
        <div style="color: #10b981; display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
            <i data-lucide="check-circle"></i>
            <span>${file.name} synced</span>
        </div>
    `;
    lucide.createIcons();
}

let mixFileName = 'dj-mix';

const decodingSpinner = document.getElementById('decoding-spinner');

function loadAudio(file) {
    const url = URL.createObjectURL(file);
    mixFileName = file.name.split('.')[0];
    
    decodingSpinner.style.display = 'flex';
    analyzeBtn.style.display = 'none'; // Hide until ready
    
    wavesurfer.load(url);
    audioDropZone.style.display = 'none';
    waveformContainer.style.display = 'block';
    linkedCueZone.style.display = 'block'; 
}

wavesurfer.on('ready', () => {
    decodingSpinner.style.display = 'none';
    analyzeBtn.style.display = 'flex';
});

const waveformSpinner = document.getElementById('waveform-spinner');
const waveformDiv = document.getElementById('waveform');

analyzeBtn.addEventListener('click', async () => {
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i data-lucide="loader"></i> Analyzing...';
    waveformSpinner.style.display = 'flex';
    waveformDiv.style.opacity = '0.3';
    lucide.createIcons();

    try {
        const audioBuffer = wavesurfer.getDecodedData();
        const detectedTimes = await detectTransitions(audioBuffer);
        
        let finalChapters = [];

        if (linkedCueData) {
            const uniqueTracks = deduplicateTracks(linkedCueData);
            finalChapters = alignMetadataToTransitions(uniqueTracks, detectedTimes);
        } else {
            finalChapters = detectedTimes.map((time, index) => {
                return `${formatTimePrecision(time)} Track ${index + 1}`;
            });
        }

        outputBox.textContent = finalChapters.join('\n');
        resultsContainer.style.display = 'block';
        
        // VISUAL SYNC CALCULATION
        generateVisualSync(audioBuffer, detectedTimes);

        // MIDI EXTRACTION (Non-blocking to ensure chapters still generate)
        extractMidiRhythm(audioBuffer).catch(err => {
            console.error("MIDI Extraction failed:", err);
            document.getElementById('midi-status').textContent = "MIDI extraction skipped (file too large or memory limit reached).";
        });

    } catch (err) {
        console.error("Analysis Error:", err);
        waveformSpinner.style.display = 'none';
        waveformDiv.style.opacity = '1';
        
        const errorMsg = document.createElement('div');
        errorMsg.style.color = '#ef4444';
        errorMsg.style.marginTop = '1rem';
        errorMsg.style.textAlign = 'center';
        errorMsg.innerHTML = `<i data-lucide="alert-circle"></i> Error: ${err.message || 'Analysis failed. The file might be too large for your browser\'s memory.'}`;
        resultsContainer.innerHTML = '';
        resultsContainer.appendChild(errorMsg);
        resultsContainer.style.display = 'block';
        lucide.createIcons();
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i data-lucide="sparkles"></i> Detect Transitions';
        waveformSpinner.style.display = 'none';
        waveformDiv.style.opacity = '1';
        lucide.createIcons();
    }
});

async function extractMidiRhythm(audioBuffer) {
    const midiDownloadBtn = document.getElementById('midi-download-btn');
    const midiStatus = document.getElementById('midi-status');
    
    midiStatus.innerHTML = '<i data-lucide="loader"></i> Extracting MIDI rhythm...';
    lucide.createIcons();

    try {
        if (typeof MidiWriter === 'undefined') {
            throw new Error("MIDI library not loaded. Please check your internet connection.");
        }

        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;
        
        // We'll analyze in 3 passes using OfflineAudioContext
        const bassOnsets = await analyzeBand(audioBuffer, 'lowpass', 150, 0.2);
        const midOnsets = await analyzeBand(audioBuffer, 'bandpass', 1000, 0.2);
        const trebleOnsets = await analyzeBand(audioBuffer, 'highpass', 4000, 0.1);

        const bassTrack = new MidiWriter.Track();
        const midTrack = new MidiWriter.Track();
        const trebleTrack = new MidiWriter.Track();

        const addOnsetsToTrack = (onsets, note, channel, track) => {
            onsets.forEach(onset => {
                const tick = Math.floor((onset.time / 60) * 120 * 128);
                // Map energy (0.02 - 0.5) to MIDI velocity (40 - 127)
                const velocity = Math.min(127, Math.max(40, Math.floor(onset.energy * 250)));
                
                track.addEvent(new MidiWriter.NoteEvent({
                    pitch: [note], 
                    duration: 'T8', 
                    startTick: tick,
                    velocity: velocity,
                    channel: channel
                }));
            });
            
            // Add a silent dummy note at the very end to ensure the track is registered
            const endTick = Math.floor((duration / 60) * 120 * 128);
            track.addEvent(new MidiWriter.NoteEvent({
                pitch: ['C0'], 
                duration: '1', 
                startTick: endTick,
                velocity: 1, 
                channel: channel
            }));
        };

        addOnsetsToTrack(bassOnsets, 'C1', 1, bassTrack);
        addOnsetsToTrack(midOnsets, 'D1', 2, midTrack);
        addOnsetsToTrack(trebleOnsets, 'F#1', 3, trebleTrack);

        const write = new MidiWriter.Writer([bassTrack, midTrack, trebleTrack]);
        const base64 = write.base64();
        
        const debugLog = document.getElementById('midi-debug-log');
        debugLog.style.display = 'block';
        debugLog.innerHTML = `
            > Bass onsets: ${bassOnsets.length}<br>
            > Mid onsets: ${midOnsets.length}<br>
            > Treble onsets: ${trebleOnsets.length}<br>
            > Generating MIDI file...<br>
            > Base64 length: ${base64.length} chars<br>
            > Filename: ${(mixFileName || 'mix_rhythm').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mid
        `;

        midiDownloadBtn.style.display = 'flex';
        midiDownloadBtn.onclick = async () => {
            try {
                const binaryStr = atob(base64);
                const bytes = new Uint8Array(binaryStr.length);
                for (let i = 0; i < binaryStr.length; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                
                const cleanName = (mixFileName || 'mix_rhythm').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const fileName = `${cleanName}.mid`;

                if ('showSaveFilePicker' in window) {
                    try {
                        const handle = await window.showSaveFilePicker({
                            suggestedName: fileName,
                            types: [{
                                description: 'MIDI File',
                                accept: {'audio/midi': ['.mid']},
                            }],
                        });
                        const writable = await handle.createWritable();
                        await writable.write(bytes);
                        await writable.close();
                        debugLog.innerHTML += `<br>> File saved to your computer.`;
                        return;
                    } catch (err) {
                        console.log("Picker cancelled, using fallback.");
                    }
                }

                const blob = new Blob([bytes], {type: 'audio/midi'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            } catch (err) {
                console.error("Download error:", err);
                debugLog.innerHTML += `<br>> Error: ${err.message}`;
            }
        };

        midiStatus.innerHTML = `
            <div style="color: #10b981;">
                <i data-lucide="check-circle"></i>
                Rhythm extracted: ${bassOnsets.length + midOnsets.length + trebleOnsets.length} notes found.
            </div>
        `;
        lucide.createIcons();

    } catch (err) {
        console.error("MIDI Extraction Error:", err);
        midiStatus.innerHTML = `<span style="color: #ef4444;"><i data-lucide="alert-triangle"></i> Error: ${err.message}</span>`;
        lucide.createIcons();
    }
}

async function analyzeBand(audioBuffer, filterType, freq, threshold) {
    const targetSampleRate = 8000;
    const offlineCtx = new OfflineAudioContext(1, Math.floor(audioBuffer.duration * targetSampleRate), targetSampleRate);
    
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    const filter = offlineCtx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    if (filterType === 'bandpass') filter.Q.value = 1.0;

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
        
        // Use a more aggressive threshold and longer cooldown (250ms) to prevent stack overflow
        if (energy > lastEnergy * (1 + threshold) && energy > 0.03 && cooldown <= 0) {
            onsets.push({ time: i / sampleRate, energy: energy });
            cooldown = Math.floor(sampleRate * 0.25 / windowSize); 
        }
        
        lastEnergy = energy;
        if (cooldown > 0) cooldown--;
        
        // Hard limit per band to prevent library crash
        if (onsets.length > 5000) break;
    }
    
    return onsets;
}

function generateVisualSync(audioBuffer, transitions) {
    const visualOutput = document.getElementById('visual-output');
    const downloadBtn = document.getElementById('vs2-download-btn');
    const data = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const scenes = [];

    // First pass: calculate energy for all scenes
    const sceneEnergies = [];
    for (let i = 0; i < transitions.length; i++) {
        const start = transitions[i];
        const end = (i < transitions.length - 1) ? transitions[i + 1] : audioBuffer.duration;
        const startIdx = Math.floor(start * sampleRate);
        const endIdx = Math.min(data.length, Math.floor(end * sampleRate));
        if (startIdx >= endIdx) continue;

        let sum = 0;
        let count = 0;
        const segmentLength = endIdx - startIdx;
        const step = Math.max(1, Math.floor(segmentLength / 500));
        for (let j = startIdx; j < endIdx; j += step) {
            const val = data[j];
            if (val !== undefined) {
                sum += Math.abs(val);
                count++;
            }
        }
        sceneEnergies.push({ id: i + 1, start, duration: end - start, energy: sum / count });
    }

    // Second pass: Determine thresholds based on percentiles and split long scenes
    const sortedEnergies = [...sceneEnergies].map(s => s.energy).sort((a, b) => a - b);
    const chillThreshold = sortedEnergies[Math.floor(sortedEnergies.length * 0.33)] || 0.1;
    const happyThreshold = sortedEnergies[Math.floor(sortedEnergies.length * 0.66)] || 0.2;

    const finalScenes = [];
    sceneEnergies.forEach(s => {
        let intensity = 'Chill';
        if (s.energy > happyThreshold) {
            intensity = 'Aggressive';
        } else if (s.energy > chillThreshold) {
            intensity = 'Happy';
        }

        // Split long scenes (max 180 seconds)
        const maxDuration = 180;
        if (s.duration > maxDuration) {
            const numChunks = Math.ceil(s.duration / maxDuration);
            const chunkDuration = s.duration / numChunks;
            for (let i = 0; i < numChunks; i++) {
                finalScenes.push({
                    id: `${s.id}.${i + 1}`,
                    start: s.start + (i * chunkDuration),
                    duration: chunkDuration,
                    intensity: intensity
                });
            }
        } else {
            finalScenes.push({ ...s, intensity });
        }
    });

    // Show download button
    downloadBtn.style.display = 'flex';
    downloadBtn.onclick = () => downloadVS2Playlist(audioBuffer.duration, finalScenes);

    visualOutput.innerHTML = `
        <div class="scene-list">
            ${finalScenes.map(s => `
                <div class="scene-item">
                    <div class="scene-info">
                        <span class="scene-title">Scene ${s.id}</span>
                        <span class="scene-meta">Start: ${formatTimePrecision(s.start)} | Duration: ${formatDuration(s.duration)}</span>
                    </div>
                    <span class="intensity-badge intensity-${s.intensity.toLowerCase()}">${s.intensity}</span>
                </div>
            `).join('')}
        </div>
    `;
    lucide.createIcons();
}

function downloadVS2Playlist(totalDuration, scenes) {
    const presetPools = {
        'Chill': [
            { id: 0, patch_name: 'CW1 Chill' },
            { id: 1, patch_name: 'CW Chill 2' }
        ],
        'Happy': [
            { id: 2, patch_name: 'CW Happy 1' },
            { id: 3, patch_name: 'CW Happy 2' }
        ],
        'Aggressive': [
            { id: 4, patch_name: 'CW 3 Intense' },
            { id: 5, patch_name: 'CW Intense 2' }
        ]
    };

    const entries = scenes.map(scene => {
        const pool = presetPools[scene.intensity] || presetPools['Chill'];
        const preset = pool[Math.floor(Math.random() * pool.length)];
        
        return {
            bank_name: "Local",
            duration: Math.round(scene.duration),
            id: preset.id,
            patch_name: preset.patch_name
        };
    });

    const playlist = {
        duration: Math.round(totalDuration),
        entries: entries,
        fade_in_time: 1000,
        fade_out_time: 1000
    };

    const blob = new Blob([JSON.stringify(playlist, null, 4)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mixFileName}_playlist.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
}

function deduplicateTracks(tracks) {
    if (!tracks || tracks.length === 0) return [];
    const unique = [tracks[0]];
    for (let i = 1; i < tracks.length; i++) {
        const current = tracks[i];
        const prev = unique[unique.length - 1];
        // If it's the same track within 60 seconds, it's likely a duplicate load/scroll
        const isDuplicate = current.title === prev.title && current.performer === prev.performer;
        if (!isDuplicate) {
            unique.push(current);
        }
    }
    return unique;
}

function alignMetadataToTransitions(tracks, transitions) {
    const chapters = tracks.map(track => {
        const cueSeconds = cueTimeToSeconds(track.rawTime);
        // Find nearest audio transition within 120 seconds
        let bestTime = cueSeconds;
        let minDiff = 120; 

        transitions.forEach(t => {
            const diff = Math.abs(t - cueSeconds);
            if (diff < minDiff) {
                minDiff = diff;
                bestTime = t;
            }
        });

        return {
            time: bestTime,
            formattedTime: formatTimePrecision(bestTime),
            metadata: `${track.performer} - ${track.title}`
        };
    });

    // Remove duplicates where two tracks snapped to the same timestamp
    const uniqueChapters = [];
    const seenTimes = new Set();
    
    // We iterate backwards or forwards? Usually the last track at a timestamp is the "winner"
    // but in DJ sets, the first one might be the mix start.
    // Let's keep the first one but filter out ones that are identical.
    for (const chapter of chapters) {
        if (!seenTimes.has(chapter.formattedTime)) {
            uniqueChapters.push(`${chapter.formattedTime} ${chapter.metadata}`);
            seenTimes.add(chapter.formattedTime);
        }
    }

    return uniqueChapters;
}

function cueTimeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
        // We need to guess if it's HH:MM:SS or MM:SS:FF
        // Standard CUE is MM:SS:FF (where MM can be > 60)
        // Many modern DJ exports are HH:MM:SS
        
        const p1 = parts[0];
        const p2 = parts[1];
        const p3 = parts[2];

        // If p1 > 60, it's definitely MM:SS:FF (p1 = minutes)
        if (p1 >= 60) {
            return p1 * 60 + p2;
        }
        
        // If it's a DJ set, tracks are usually > 1 minute apart.
        // If we treat it as HH:MM:SS and the gaps are reasonable, that's likely it.
        // However, the safest bet is to check if it's a recorded set (large MM).
        // For this app, we'll assume HH:MM:SS if p1 < 24 and MM:SS:FF otherwise, 
        // OR we just treat it as HH:MM:SS which is more common in user-facing formats.
        
        // REFINED LOGIC: If the user got 00:00:55 instead of 00:55:00, 
        // it means parts[0]=0, parts[1]=55. 
        // In MM:SS:FF, that is 55 seconds.
        // In HH:MM:SS, that is 55 minutes.
        // A DJ set track at 55 seconds is rare (unless it's the first track).
        // So if p1 is 0 and p2 is large, it's almost certainly HH:MM:SS.
        
        return p1 * 3600 + p2 * 60 + p3 / 75; // 75 frames per second in CUE
    }
    return 0;
}

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
            currentTrack = { title: "Unknown Title", performer: globalPerformer, rawTime: "" };
            tracks.push(currentTrack);
        }

        if (currentTrack) {
            const tMatch = line.trim().match(/^TITLE\s+"(.+)"/i);
            const pMatch = line.trim().match(/^PERFORMER\s+"(.+)"/i);
            const iMatch = line.trim().match(/^INDEX\s+01\s+(\d{1,3}):(\d{2}):(\d{2})/i);

            if (tMatch) currentTrack.title = tMatch[1];
            if (pMatch) currentTrack.performer = pMatch[1];
            if (iMatch) currentTrack.rawTime = `${iMatch[1]}:${iMatch[2]}:${iMatch[3]}`;
        }
    }
    return tracks;
}

function addMarker(time) {
    // Note: Wavesurfer 7 uses a different marker system or basic CSS/Canvas markers
    // For simplicity, we'll just log it or use a basic marker if plugin available.
    // Here we'll just focus on the timestamp generation.
}

async function detectTransitions(audioBuffer) {
    const data = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = Math.floor(sampleRate * 0.5); // 0.5 second precision
    const energy = [];
    
    for (let i = 0; i < data.length; i += windowSize) {
        let sum = 0;
        let count = 0;
        for (let j = 0; j < windowSize && (i + j) < data.length; j++) {
            sum += data[i + j] * data[i + j];
            count++;
        }
        energy.push(Math.sqrt(sum / count));
    }
    
    const transitions = [0]; 
    const minGap = 60; // Min 60s between tracks
    let lastT = 0;

    for (let i = 2; i < energy.length - 2; i++) {
        const t = i * (windowSize / sampleRate);
        if (t - lastT < minGap) continue;

        const prev = (energy[i-1] + energy[i-2]) / 2;
        const curr = energy[i];
        const next = (energy[i+1] + energy[i+2]) / 2;

        // Detection: Sudden drop (breakdown) or sudden rise (drop-in)
        if ((curr < prev * 0.5 && next > curr * 1.5) || (curr > prev * 2.0 && prev > 0.01)) {
            transitions.push(t);
            lastT = t;
        }
    }
    
    return transitions;
}

// Keep existing CUE logic...
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const resultsContainer = document.getElementById('results');
const outputBox = document.getElementById('output');
const copyBtn = document.getElementById('copy-btn');
const resetBtn = document.getElementById('reset-btn');

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.cue')) {
        processFile(file);
    } else {
        alert('Please drop a valid .cue file');
    }
});

dropZone.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
});

resetBtn.addEventListener('click', () => {
    resultsContainer.style.display = 'none';
    outputBox.textContent = '';
    if (fileInput) fileInput.value = '';
    if (audioInput) audioInput.value = '';
    waveformContainer.style.display = 'none';
    audioDropZone.style.display = 'block';
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(outputBox.textContent).then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i data-lucide="check"></i> Copied!';
        lucide.createIcons();
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            lucide.createIcons();
        }, 2000);
    });
});

async function processFile(file) {
    const text = await file.text();
    const chapters = parseCue(text);
    
    if (chapters.length === 0) {
        alert('No tracks found in the CUE file.');
        return;
    }

    outputBox.textContent = chapters.join('\n');
    resultsContainer.style.display = 'block';
    
    // Smooth scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function parseCue(text) {
    const lines = text.split(/\r?\n/);
    const tracks = [];
    let currentTrack = null;
    let globalPerformer = "";

    // First pass to find global performer if needed
    for (let line of lines) {
        const performerMatch = line.trim().match(/^PERFORMER\s+"(.+)"/i);
        if (performerMatch && !currentTrack) {
            globalPerformer = performerMatch[1];
        }
        
        const trackMatch = line.trim().match(/^TRACK\s+(\d+)\s+AUDIO/i);
        if (trackMatch) {
            currentTrack = {
                number: trackMatch[1],
                title: "",
                performer: globalPerformer,
                time: ""
            };
            tracks.push(currentTrack);
        }

        if (currentTrack) {
            const titleMatch = line.trim().match(/^TITLE\s+"(.+)"/i);
            const pMatch = line.trim().match(/^PERFORMER\s+"(.+)"/i);
            const indexMatch = line.trim().match(/^INDEX\s+01\s+(\d{2,3}):(\d{2}):(\d{2})/i);

            if (titleMatch) currentTrack.title = titleMatch[1];
            if (pMatch) currentTrack.performer = pMatch[1];
            if (indexMatch) {
                currentTrack.time = formatTime(indexMatch[1], indexMatch[2]);
            }
        }
    }

    return tracks.map(t => `${t.time} ${t.performer} - ${t.title}`);
}

function formatTime(mm, ss) {
    let minutes = parseInt(mm, 10);
    let seconds = parseInt(ss, 10);

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    const pad = (num) => String(num).padStart(2, '0');

    if (hours > 0) {
        return `${pad(hours)}:${pad(remainingMinutes)}:${pad(seconds)}`;
    } else {
        return `${pad(remainingMinutes)}:${pad(seconds)}`;
    }
}
