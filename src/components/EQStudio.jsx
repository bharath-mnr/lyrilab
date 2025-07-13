import React, { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo } from 'react';
import * as Tone from 'tone';
import { Play, Pause, SlidersHorizontal, Upload, Download, Music, ChevronDown, RotateCcw, Waves } from 'lucide-react';
import SEOHead from './SEOHead';



// Define the tool object for SEO structured data
const eqStudioTool = {
    id: 'eq-studio',
    name: 'EQ Studio',
    description: 'Professional audio equalizer with real-time visualization and vertical frequency controls.',
    path: '/eq-studio',
    categories: [
        'Audio',
        'Equalizer',
        'Sound Design',
        'Mixing',
        'Frequency Control'
    ]
};



// Audio Context Provider
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);

    const startGlobalAudio = useCallback(async () => {
        if (Tone.context.state !== 'running') {
            try {
                console.log('Starting Tone.js context...');
                await Tone.start();
                setIsAudioGloballyReady(true);
                console.log('Tone.js context started successfully.');
            } catch (error) {
                console.error("Error starting Tone.js context:", error);
                setIsAudioGloballyReady(false);
            }
        } else {
            setIsAudioGloballyReady(true);
        }
    }, []);

    useEffect(() => {
        const handleToneContextChange = () => {
            setIsAudioGloballyReady(Tone.context.state === 'running');
        };

        if (Tone.context.on) {
            Tone.context.on('statechange', handleToneContextChange);
        }
        handleToneContextChange();

        return () => {
            if (Tone.context.off) {
                Tone.context.off('statechange', handleToneContextChange);
            }
        };
    }, []);

    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, startGlobalAudio }}>
            {children}
        </AudioContext.Provider>
    );
};

// EQ band frequencies (10 bands)
const EQ_BAND_FREQUENCIES = [
    32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000
];

// Define famous EQ presets
const EQ_PRESETS = {
    'Flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    'Rock': [4, 2, -2, 0, 0, 0, 2, 4, 4, 2],
    'Pop': [3, 1, -1, -1, 0, 1, 2, 3, 3, 2],
    'Vocal': [-3, -2, 0, 2, 4, 3, 1, 0, -1, -2],
    'Bass Boost': [6, 5, 4, 2, 0, -2, -3, -4, -5, -6],
    'Treble Boost': [-6, -5, -4, -2, 0, 2, 4, 5, 6, 6],
    'Sub Bass': [8, 6, 4, 2, 0, -2, -4, -6, -8, -10], // Strong boost in lower frequencies
    'Lofi': [0, 0, 0, 0, -4, -6, -8, -10, -12, -15], // Cuts highs significantly
    'Dance': [5, 4, 2, 0, -1, 0, 2, 4, 5, 5], // Scooped mids, boosted bass and treble
    'Speech': [-5, -4, -2, 1, 3, 4, 3, 1, -2, -4], // Boosts mid-range for clarity, cuts extreme lows/highs
    'Custom': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] // For when user adjusts manually
};


// Helper function to convert AudioBuffer to WAV Blob
const audioBufferToWav = (buffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    
    // Helper functions to write data to view
    let pos = 0; // Initialize pos here
    const setUint16 = (data) => {
        view.setUint16(pos, data, true);
        pos += 2;
    };
    
    const setUint32 = (data) => {
        view.setUint32(pos, data, true);
        pos += 4;
    };
    
    // Write WAV header
    const writeString = (str) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(pos++, str.charCodeAt(i));
        }
    };
    
    writeString('RIFF');             // ChunkID
    setUint32(length - 8);           // ChunkSize
    writeString('WAVE');             // Format
    writeString('fmt ');             // Subchunk1ID
    setUint32(16);                   // Subchunk1Size
    setUint16(1);                    // AudioFormat (PCM)
    setUint16(numOfChan);            // NumChannels
    setUint32(buffer.sampleRate);    // SampleRate
    setUint32(buffer.sampleRate * 2 * numOfChan); // ByteRate
    setUint16(numOfChan * 2);        // BlockAlign
    setUint16(16);                   // BitsPerSample
    writeString('data');             // Subchunk2ID
    setUint32(buffer.length * numOfChan * 2); // Subchunk2Size
    
    // Write interleaved audio data
    for (let i = 0; i < buffer.length; i++) {
        for (let chan = 0; chan < numOfChan; chan++) {
            const sample = Math.max(-1, Math.min(1, buffer.getChannelData(chan)[i]));
            const int16 = sample < 0 ? sample * 32768 : sample * 32767;
            view.setInt16(pos, int16, true);
            pos += 2;
        }
    }
    
    return new Blob([view], { type: 'audio/wav' });
};

// Custom hook for EQ functionality
const useEQSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const playerRef = useRef(null);
    const filtersRef = useRef([]);
    const analyserRef = useRef(null);
    const reverbRef = useRef(null); // New ref for Reverb
    const currentAudioBufferRef = useRef(null);
    const originalFileRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [audioLoadError, setAudioLoadError] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [audioFileName, setAudioFileName] = useState('');
    const [hasAudioFile, setHasAudioFile] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState('Flat');
    const [isReverbActive, setIsReverbActive] = useState(false); // State for reverb
    const [reverbDecay, setReverbDecay] = useState(1.5); // State for reverb decay

    const [bands, setBands] = useState(
        EQ_BAND_FREQUENCIES.map(freq => ({
            frequency: freq,
            gain: 0
        }))
    );

    const initAudioNodes = useCallback(async (audioBuffer) => {
        try {
            setIsLoadingAudio(true);
            setAudioLoadError(null);
            setIsPlaying(false);

            // Dispose existing nodes
            if (playerRef.current) {
                playerRef.current.stop();
                playerRef.current.dispose();
                playerRef.current = null;
            }
            if (filtersRef.current.length > 0) {
                filtersRef.current.forEach(filter => filter.dispose());
                filtersRef.current = [];
            }
            if (analyserRef.current) {
                analyserRef.current.dispose();
                analyserRef.current = null;
            }
            if (reverbRef.current) { // Dispose reverb
                reverbRef.current.dispose();
                reverbRef.current = null;
            }

            console.log('Initializing audio nodes...');

            // Create new player
            const player = new Tone.Player({
                url: audioBuffer,
                loop: true,
                autostart: false,
                onload: () => {
                    console.log('Audio loaded successfully');
                    setIsAudioReady(true);
                    setIsLoadingAudio(false);
                }
            });

            // Create EQ filters
            const newFilters = EQ_BAND_FREQUENCIES.map(freq => {
                const filter = new Tone.Filter(freq, 'peaking');
                filter.Q.value = 1;
                filter.gain.value = 0;
                return filter;
            });
            filtersRef.current = newFilters;

            // Create Reverb node
            reverbRef.current = new Tone.Reverb({
                decay: reverbDecay,
                wet: isReverbActive ? 1 : 0 // Set initial wet based on state
            }).toDestination();

            // Apply initial 'Flat' preset
            applyPreset('Flat', newFilters);


            // Create analyser
            const analyser = new Tone.Analyser("fft", 512);

            // Connect audio chain: Player -> EQ Filters -> (Reverb if active) -> Analyser -> Destination
            player.connect(filtersRef.current[0]);
            for (let i = 0; i < filtersRef.current.length - 1; i++) {
                filtersRef.current[i].connect(filtersRef.current[i + 1]);
            }

            // Connect last filter to reverb, and reverb to analyser, then analyser to destination
            // The analyser will always see the final output including reverb
            filtersRef.current[filtersRef.current.length - 1].connect(reverbRef.current);
            reverbRef.current.connect(analyser);
            analyser.connect(Tone.Destination);

            playerRef.current = player;
            analyserRef.current = analyser;

            console.log('Audio nodes initialized successfully.');

        } catch (error) {
            console.error("Error initializing audio nodes:", error);
            setAudioLoadError(`Failed to load audio: ${error.message || error}`);
            setIsAudioReady(false);
            setIsLoadingAudio(false);
        }
    }, [reverbDecay, isReverbActive]); // Depend on reverb states for re-initialization

    const disposeAudioNodes = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.stop();
            playerRef.current.dispose();
            playerRef.current = null;
        }
        if (filtersRef.current.length > 0) {
            filtersRef.current.forEach(filter => filter.dispose());
            filtersRef.current = [];
        }
        if (analyserRef.current) {
            analyserRef.current.dispose();
            analyserRef.current = null;
        }
        if (reverbRef.current) {
            reverbRef.current.dispose();
            reverbRef.current = null;
        }
        setIsPlaying(false);
        setIsAudioReady(false);
        setIsLoadingAudio(false);
        setAudioLoadError(null);
        currentAudioBufferRef.current = null;
        originalFileRef.current = null;
        setSelectedPreset('Flat'); // Reset preset on dispose
        setIsReverbActive(false); // Reset reverb state
        setReverbDecay(1.5); // Reset reverb decay
        console.log('Audio nodes disposed.');
    }, []);

    useEffect(() => {
        return () => {
            disposeAudioNodes();
        };
    }, [disposeAudioNodes]);

    const setBandGain = useCallback((index, newGain) => {
        setBands(prevBands => {
            const updatedBands = [...prevBands];
            updatedBands[index] = { ...updatedBands[index], gain: newGain };

            // Apply EQ settings to the specific filter node
            if (filtersRef.current[index]) {
                filtersRef.current[index].gain.value = newGain; // Update the gain of the Tone.Filter
            }
            setSelectedPreset('Custom'); // Mark as custom when manual adjustment
            return updatedBands;
        });
    }, []);

    // Function to apply a selected preset
    const applyPreset = useCallback((presetName, targetFilters = filtersRef.current) => {
        const presetGains = EQ_PRESETS[presetName];
        if (presetGains) {
            setBands(EQ_BAND_FREQUENCIES.map((freq, index) => {
                const gain = presetGains[index];
                if (targetFilters[index]) {
                    targetFilters[index].gain.value = gain;
                }
                return { frequency: freq, gain: gain };
            }));
            setSelectedPreset(presetName);
            console.log(`Preset "${presetName}" applied.`);
        }
    }, []);

    // Resets all EQ bands to 0dB (which is the 'Flat' preset)
    const resetEQ = useCallback(() => {
        applyPreset('Flat');
        console.log('EQ bands reset to default (Flat).');
    }, [applyPreset]);

    const togglePlay = useCallback(async () => {
        if (!isAudioGloballyReady) {
            await startGlobalAudio(); // Ensure Tone.js context is running
            return;
        }

        if (playerRef.current && isAudioReady && !isLoadingAudio) {
            if (isPlaying) {
                playerRef.current.stop();
                setIsPlaying(false);
            } else {
                playerRef.current.start();
                setIsPlaying(true);
            }
        }
    }, [isPlaying, isAudioGloballyReady, isAudioReady, isLoadingAudio, startGlobalAudio]);

    // Handles file upload and initializes audio nodes
    const handleFileUpload = useCallback(async (file) => {
        if (!file) return;

        console.log('File selected:', file.name);
        setAudioFileName(file.name);
        setIsPlaying(false);
        setAudioLoadError(null);
        setHasAudioFile(false);

        try {
            if (!isAudioGloballyReady) {
                await startGlobalAudio(); // Ensure audio context is ready before loading file
            }
            
            // Read file as ArrayBuffer to store it for offline rendering
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await Tone.context.decodeAudioData(arrayBuffer);
            currentAudioBufferRef.current = audioBuffer; // Store the decoded audio buffer

            const audioBlobUrl = URL.createObjectURL(file); // Create a URL for the audio file
            await initAudioNodes(audioBlobUrl); // Initialize Tone.js with the new audio
            setHasAudioFile(true);
            
            // Clean up the blob URL after a short delay to allow Tone.js to process it
            // This timeout is a heuristic; Tone.js might still be using the blob.
            // A more robust solution would involve Tone.js providing a callback
            // when it's done with the URL, but for now, this helps.
            setTimeout(() => {
                URL.revokeObjectURL(audioBlobUrl);
            }, 1000);

        } catch (error) {
            console.error('Error handling file upload:', error);
            setAudioLoadError(`Failed to process file: ${error.message || error}`);
            setIsAudioReady(false);
            setIsLoadingAudio(false);
            setAudioFileName('');
        }
    }, [isAudioGloballyReady, startGlobalAudio, initAudioNodes]);

    // Toggle reverb on/off
    const toggleReverb = useCallback(() => {
        if (reverbRef.current) {
            const newReverbState = !isReverbActive;
            setIsReverbActive(newReverbState);
            reverbRef.current.set({ wet: newReverbState ? 1 : 0 });
            console.log(`Reverb ${newReverbState ? 'activated' : 'deactivated'}.`);
        }
    }, [isReverbActive]);

    // Set reverb decay time
    const setReverbDecayValue = useCallback((newDecay) => {
        setReverbDecay(newDecay);
        if (reverbRef.current) {
            reverbRef.current.set({ decay: newDecay });
        }
    }, []);

    // Downloads the manipulated audio (offline rendering)
    const downloadManipulatedAudio = useCallback(async () => {
    if (!currentAudioBufferRef.current || isDownloading) return;

    setIsDownloading(true);
    setAudioLoadError(null);

    try {
        console.log('Starting offline rendering...');
        
        // Create a temporary offline context
        const offlineContext = new OfflineAudioContext(
            currentAudioBufferRef.current.numberOfChannels,
            currentAudioBufferRef.current.length, // Use exact length of original audio
            currentAudioBufferRef.current.sampleRate
        );

        // Create source node
        const source = offlineContext.createBufferSource();
        source.buffer = currentAudioBufferRef.current;

        // Create all EQ filters using Web Audio API
        const filters = EQ_BAND_FREQUENCIES.map((freq, index) => {
            const filter = offlineContext.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1;
            filter.gain.value = bands[index].gain;
            return filter;
        });

        // Create reverb node if active
        let reverb = null;
        if (isReverbActive) {
            reverb = offlineContext.createConvolver();
            // Create a simple impulse response for reverb
            const decay = reverbDecay;
            const sampleRate = offlineContext.sampleRate;
            const length = sampleRate * decay;
            const impulse = offlineContext.createBuffer(2, length, sampleRate);
            const left = impulse.getChannelData(0);
            const right = impulse.getChannelData(1);
            
            for (let i = 0; i < length; i++) {
                const n = length - i;
                left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
                right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
            }
            
            reverb.buffer = impulse;
        }

        // Connect the audio chain
        let lastNode = source;
        for (const filter of filters) {
            lastNode.connect(filter);
            lastNode = filter;
        }

        if (isReverbActive && reverb) {
            lastNode.connect(reverb);
            reverb.connect(offlineContext.destination);
        } else {
            lastNode.connect(offlineContext.destination);
        }

        // Start playback
        source.start(0);

        // Render the audio
        const renderedBuffer = await offlineContext.startRendering();
        console.log('Offline rendering complete');

        // Convert to WAV and download
        const wavBlob = audioBufferToWav(renderedBuffer);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        // Get the base name of the uploaded file without its extension
        const baseFileName = audioFileName.split('.').slice(0, -1).join('.') || 'audio';
        a.download = `${baseFileName}-processed.wav`;
        
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 100);

    } catch (error) {
        console.error('Error during download:', error);
        setAudioLoadError(`Failed to download processed audio: ${error.message || error}`);
    } finally {
        setIsDownloading(false);
    }
}, [currentAudioBufferRef, bands, audioFileName, isDownloading, isReverbActive, reverbDecay]);


    // Gets frequency data from the analyser for visualization
    const getFrequencyData = useCallback(() => {
        if (analyserRef.current) {
            return analyserRef.current.getValue(); // Get the FFT data (frequency spectrum)
        }
        return new Float32Array(256).fill(-100); // Return empty data if analyser not ready
    }, []);

    // Calculates the filter curve based on current band gains for visualization (with smoothing)
    const getFilterCurve = useCallback(() => {
        const curve = new Float32Array(256); // Array to hold gain values for the curve
        const minFreq = EQ_BAND_FREQUENCIES[0];
        const maxFreq = EQ_BAND_FREQUENCIES[EQ_BAND_FREQUENCIES.length - 1];

        for (let i = 0; i < curve.length; i++) {
            // Map the x-axis (0 to 255) to a logarithmic frequency scale
            const normalizedX = i / curve.length;
            const logFreq = Math.log10(minFreq) + normalizedX * (Math.log10(maxFreq) - Math.log10(minFreq));
            const freq = Math.pow(10, logFreq);

            // Find the two closest EQ bands for interpolation
            let lowerBandIndex = -1;
            let upperBandIndex = -1;

            for (let j = 0; j < EQ_BAND_FREQUENCIES.length; j++) {
                if (EQ_BAND_FREQUENCIES[j] <= freq) {
                    lowerBandIndex = j;
                }
                if (EQ_BAND_FREQUENCIES[j] >= freq) {
                    upperBandIndex = j;
                    break;
                }
            }

            let interpolatedGain;
            if (lowerBandIndex === -1) { // Below the first band
                interpolatedGain = bands[0].gain;
            } else if (upperBandIndex === -1 || lowerBandIndex === upperBandIndex) { // Above the last band or exactly on a band
                interpolatedGain = bands[lowerBandIndex].gain;
            } else { // Interpolate between two bands
                const lowerFreq = EQ_BAND_FREQUENCIES[lowerBandIndex];
                const upperFreq = EQ_BAND_FREQUENCIES[upperBandIndex];
                const lowerGain = bands[lowerBandIndex].gain;
                const upperGain = bands[upperBandIndex].gain;

                // Linear interpolation based on logarithmic frequency
                const alpha = (Math.log10(freq) - Math.log10(lowerFreq)) / (Math.log10(upperFreq) - Math.log10(lowerFreq));
                interpolatedGain = lowerGain + (upperGain - lowerGain) * alpha;
            }
            curve[i] = interpolatedGain;
        }
        return curve;
    }, [bands]); // Recalculate when bands state changes

    return {
        isPlaying, togglePlay,
        bands, setBandGain, resetEQ, applyPreset, selectedPreset,
        isAudioReady, isLoadingAudio, audioLoadError,
        isDownloading, downloadManipulatedAudio,
        handleFileUpload, audioFileName, hasAudioFile,
        getFrequencyData, getFilterCurve,
        isReverbActive, toggleReverb, reverbDecay, setReverbDecayValue // Added reverb states and controls
    };
};

// Upload Section Component
const UploadSection = ({ onFileUpload, isLoading }) => {
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onFileUpload(e.dataTransfer.files[0]);
        }
    }, [onFileUpload]);

    const handleFileSelect = useCallback((e) => {
        if (e.target.files && e.target.files[0]) {
            onFileUpload(e.target.files[0]);
        }
    }, [onFileUpload]);

    const handleBrowseClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 font-inter">
            <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-4 mb-6">
                    {/* <SlidersHorizontal size={56} className="text-red-600" /> */}
                    <h1 className="text-6xl font-bold text-gray-900">EQ Studio</h1>
                </div>
                <p className="text-gray-600 text-xl max-w-2xl mx-auto">
                    Professional audio equalizer with real-time visualization. 
                    Upload your audio file to start shaping your sound.
                </p>
            </div>

            <div className="w-full max-w-2xl">
                <div 
                    className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 ${
                        dragActive 
                            ? 'border-red-400 bg-red-50 scale-105' 
                            : 'border-gray-300 hover:border-red-400 hover:bg-gray-50'
                    } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => {
                        if (fileInputRef.current) {
                            fileInputRef.current.value = ''; // Clear the input value
                            fileInputRef.current.click();
                        }
                    }}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center space-y-4">
                        <div className="bg-red-600 p-4 rounded-full"> 
                            {isLoading ? (
                                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Upload className="w-12 h-12 text-white" />
                            )}
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                {isLoading ? 'Processing Audio...' : 'Select Audio File'}
                            </h3>
                            <p className="text-gray-600 mb-4">
                                {isLoading ? 'Please wait while we load your audio file' : 'or drop file here'}
                            </p>
                            <div className="bg-gray-100 rounded-lg px-4 py-2 inline-block">
                                <span className="text-sm text-gray-700">Only audio files allowed</span>
                            </div>
                        </div>
                    </div>
                    
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isLoading}
                    />
                </div>
            </div>
        </div>
    );
};

// Frequency Visualizer Component
const FrequencyVisualizer = ({ analyser, filterCurve, width = 700, height = 250 }) => {
    const canvasRef = useRef(null);
    const animationFrameId = useRef(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            animationFrameId.current = requestAnimationFrame(draw);
            return;
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        // Draw background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#1e293b');
        gradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        const minLogFreq = Math.log10(EQ_BAND_FREQUENCIES[0]);
        const maxLogFreq = Math.log10(EQ_BAND_FREQUENCIES[EQ_BAND_FREQUENCIES.length - 1]);
        
        EQ_BAND_FREQUENCIES.forEach(freq => {
            const logF = Math.log10(freq);
            const x = ((logF - minLogFreq) / (maxLogFreq - minLogFreq)) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '10px Arial';
            const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
            ctx.fillText(label, x + 5, height - 5);
        });

        // Draw gain grid lines
        const gainLines = [-15, -10, -5, 0, 5, 10, 15];
        gainLines.forEach(gainVal => {
            const normalizedGain = (gainVal - (-15)) / (15 - (-15));
            const y = height - (normalizedGain * height);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '10px Arial';
            ctx.fillText(`${gainVal}dB`, 5, y - 2);
        });

        // Draw filter curve
        if (filterCurve && filterCurve.length > 0) {
            ctx.strokeStyle = '#60a5fa';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            const firstMappedGain = filterCurve[0];
            const firstNormalizedGain = (firstMappedGain - (-15)) / (15 - (-15));
            ctx.moveTo(0, height - (firstNormalizedGain * height));

            for (let i = 1; i < filterCurve.length; i++) {
                const x = (i / (filterCurve.length - 1)) * width;
                const mappedGain = filterCurve[i];
                const normalizedGain = (mappedGain - (-15)) / (15 - (-15));
                const y = height - (normalizedGain * height);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Draw frequency spectrum
        const dataArray = typeof analyser === 'function' ? analyser() : analyser;
        if (dataArray && dataArray.length > 0) {
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            const minDb = -100;
            const maxDb = 0;

            const firstValue = Array.isArray(dataArray) ? dataArray[0] : dataArray[0] || minDb;
            const firstNormalizedValue = Math.max(0, Math.min(1, (firstValue - minDb) / (maxDb - minDb)));
            ctx.moveTo(0, height - (firstNormalizedValue * height));

            for (let i = 1; i < dataArray.length; i++) {
                const x = (i / (dataArray.length - 1)) * width;
                const value = Array.isArray(dataArray) ? dataArray[i] : dataArray[i] || minDb;
                const normalizedValue = Math.max(0, Math.min(1, (value - minDb) / (maxDb - minDb)));
                const y = height - (normalizedValue * height);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        animationFrameId.current = requestAnimationFrame(draw);
    }, [analyser, filterCurve, width, height]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = width;
            canvas.height = height;
        }
        
        animationFrameId.current = requestAnimationFrame(draw);

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [draw, width, height]);

    return (
        <div className="w-full max-w-4xl mx-auto p-4 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 shadow-2xl border border-slate-700">
            <canvas
                ref={canvasRef}
                className="w-full h-full rounded-lg"
                style={{ display: 'block' }}
            />
        </div>
    );
};

// Vertical Slider Component
const VerticalSlider = ({ value, onChange, min = -15, max = 15, step = 0.5, disabled = false, frequency }) => {
    const sliderRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = useCallback((e) => {
        if (disabled) return;
        setIsDragging(true);
        e.preventDefault();
    }, [disabled]);

    const handleMouseMove = useCallback((e) => {
        if (!isDragging || disabled) return;
        
        const rect = sliderRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const percentage = 1 - (y / rect.height);
        const range = max - min;
        let newValue = min + (percentage * range);
        
        newValue = Math.round(newValue / step) * step;
        newValue = Math.max(min, Math.min(max, newValue));
        
        onChange(newValue);
    }, [isDragging, disabled, min, max, step, onChange]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleTouchStart = useCallback((e) => {
        if (disabled) return;
        setIsDragging(true);
        e.preventDefault();
    }, [disabled]);

    const handleTouchMove = useCallback((e) => {
        if (!isDragging || disabled || !e.touches[0]) return;
        
        const rect = sliderRef.current.getBoundingClientRect();
        const y = e.touches[0].clientY - rect.top;
        const percentage = 1 - (y / rect.height);
        const range = max - min;
        let newValue = min + (percentage * range);
        
        newValue = Math.round(newValue / step) * step;
        newValue = Math.max(min, Math.min(max, newValue));
        
        onChange(newValue);
    }, [isDragging, disabled, min, max, step, onChange]);

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Effect to add/remove global event listeners for dragging
    useEffect(() => {
        const sliderElement = sliderRef.current;
        if (sliderElement) {
            // Add touch listeners directly to the slider element
            sliderElement.addEventListener('touchstart', handleTouchStart, { passive: false });
            sliderElement.addEventListener('touchmove', handleTouchMove, { passive: false });
            sliderElement.addEventListener('touchend', handleTouchEnd);
            sliderElement.addEventListener('touchcancel', handleTouchEnd); // Handle cases where touch is interrupted

            // Add mouse listeners to the document for dragging outside the slider
            if (isDragging) {
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            }

            // Cleanup function to remove all event listeners
            return () => {
                sliderElement.removeEventListener('touchstart', handleTouchStart);
                sliderElement.removeEventListener('touchmove', handleTouchMove);
                sliderElement.removeEventListener('touchend', handleTouchEnd);
                sliderElement.removeEventListener('touchcancel', handleTouchEnd);

                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp, handleTouchStart, handleTouchMove, handleTouchEnd]);

    // Calculate positions for rendering
    const normalizedValue = (value - min) / (max - min);
    const thumbPosition = (1 - normalizedValue) * 100; // Position of the thumb (0% at top, 100% at bottom)
    const zeroDbPosition = ((0 - min) / (max - min)) * 100; // Position of the 0dB line

    return (
        <div className="flex flex-col items-center p-4 bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg shadow-sm border border-slate-200 min-h-[300px] w-20 flex-shrink-0">
            <label className="text-slate-700 font-medium mb-3 text-sm">
                {frequency >= 1000 
                    ? `${frequency / 1000}kHz` 
                    : `${frequency}Hz`
                }
            </label>
            
            <div className="flex-1 flex flex-col items-center justify-center">
                <div 
                    ref={sliderRef}
                    className={`relative w-6 h-48 bg-slate-200 rounded-full cursor-pointer ${disabled ? 'opacity-50' : ''}`}
                    onMouseDown={handleMouseDown}
                >
                    <div className="absolute inset-0 bg-slate-200 rounded-full"></div>
                    
                    {/* Fill bar representing the gain */}
                    <div 
                        className={`absolute left-0 right-0 rounded-full transition-all duration-150
                            ${value >= 0 ? 'bg-gradient-to-t from-indigo-500 to-indigo-400' : 'bg-gradient-to-b from-red-500 to-red-400'}
                        `}
                        style={{
                            // Height of the fill bar, relative to the total slider height
                            height: `${Math.abs(value) / (max - min) * 100}%`, 
                            // Position of the top of the fill bar
                            top: value >= 0 ? `${thumbPosition}%` : `${zeroDbPosition}%`, 
                            // Position of the bottom of the fill bar
                            bottom: value >= 0 ? `${100 - zeroDbPosition}%` : `${100 - thumbPosition}%`,
                        }}
                    ></div>
                    
                    {/* Slider thumb */}
                    <div 
                        className="absolute w-5 h-5 bg-white border-2 border-indigo-500 rounded-full shadow-md transform -translate-x-1/2 -translate-y-1/2 left-1/2 transition-all duration-150"
                        style={{ top: `${thumbPosition}%` }}
                    ></div>
                    
                    {/* Zero dB line */}
                    <div 
                        className="absolute left-0 right-0 h-px bg-slate-400 transform -translate-y-1/2"
                        style={{ top: `${zeroDbPosition}%` }}
                    ></div>
                </div>
            </div>
            
            {/* Display current gain value */}
            <span className="text-slate-600 text-xs mt-3 font-mono bg-slate-100 px-2 py-1 rounded">
                {value >= 0 ? '+' : ''}{value.toFixed(1)}dB
            </span>
        </div>
    );
};

// Horizontal Slider Component for Reverb Decay
const HorizontalSlider = ({ value, onChange, min = 0, max = 10, step = 0.1, label, disabled = false }) => {
    const sliderRef = useRef(null);

    const handleChange = useCallback((e) => {
        onChange(parseFloat(e.target.value));
    }, [onChange]);

    return (
        <div className="flex flex-col items-center p-4 bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg shadow-sm border border-slate-200 w-48">
            <label className="text-slate-700 font-medium mb-3 text-sm">
                {label}
            </label>
            <input
                type="range"
                ref={sliderRef}
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={handleChange}
                disabled={disabled}
                className={`w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer ${disabled ? 'opacity-50' : ''}`}
                style={{
                    background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(value - min) / (max - min) * 100}%, #e2e8f0 ${(value - min) / (max - min) * 100}%, #e2e8f0 100%)`
                }}
            />
            <span className="text-slate-600 text-xs mt-3 font-mono bg-slate-100 px-2 py-1 rounded">
                {value.toFixed(1)}s
            </span>
        </div>
    );
};


// Main EQ Application Content Component
const EQContent = () => {
    const {
        isPlaying, togglePlay,
        bands, setBandGain, resetEQ, applyPreset, selectedPreset,
        isAudioReady, isLoadingAudio, audioLoadError,
        isDownloading, downloadManipulatedAudio,
        handleFileUpload, audioFileName, hasAudioFile,
        getFrequencyData, getFilterCurve,
        isReverbActive, toggleReverb, reverbDecay, setReverbDecayValue
    } = useEQSynth();

    // Memoize analyser data and filter curve data for performance
    const analyserNode = useMemo(() => 
        isAudioReady ? getFrequencyData : null, 
        [isAudioReady, getFrequencyData]
    );
    
    const filterCurveData = useMemo(() => 
        isAudioReady ? getFilterCurve() : null, 
        [isAudioReady, getFilterCurve, bands]
    );

    // If no audio file is loaded, show the upload section
    if (!hasAudioFile) {
        return <UploadSection onFileUpload={handleFileUpload} isLoading={isLoadingAudio} />;
    }

    return (

        <>
            <SEOHead 
                pageId="eq-studio" 
                tool={eqStudioTool} 
                customData={{}} 
            />

            <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 font-inter">
                <div className="text-center mb-6 md:mb-10 w-full">
                    <div className="flex items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                        <SlidersHorizontal size={32} className="text-indigo-600 md:hidden" />
                        <SlidersHorizontal size={48} className="text-indigo-600 hidden md:block" />
                        <h1 className="text-3xl md:text-5xl font-bold text-indigo-800">Audio EQ</h1>
                    </div>
                    <p className="text-indigo-600 text-sm md:text-lg">
                        Professional audio equalizer
                    </p>
                    {isLoadingAudio && (
                        <p className="text-blue-600 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                            Loading audio: {audioFileName}... Please wait.
                        </p>
                    )}
                    {audioLoadError && (
                        <p className="text-red-600 text-xs md:text-sm mt-2 md:mt-4">
                            Error: {audioLoadError}
                        </p>
                    )}
                    {isAudioReady && (
                        <p className="text-indigo-700 text-xs md:text-sm mt-1 md:mt-2 truncate max-w-full px-2">
                            Current: <span className="font-semibold">{audioFileName}</span>
                        </p>
                    )}
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-xl md:rounded-2xl shadow-lg md:shadow-xl w-full max-w-7xl">
                    {/* Control Panel */}
                    <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-4 md:mb-8">
                        <button
                            onClick={togglePlay}
                            disabled={!isAudioReady || isLoadingAudio}
                            className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-semibold flex items-center gap-1 md:gap-2 transition-all duration-200 text-sm md:text-base ${
                                isPlaying
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-green-500 hover:bg-green-600 text-white'
                            } ${(!isAudioReady || isLoadingAudio) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isPlaying ? <Pause size={16} className="md:hidden" /> : <Play size={16} className="md:hidden" />}
                            {isPlaying ? <Pause size={20} className="hidden md:block" /> : <Play size={20} className="hidden md:block" />}
                            <span className="hidden sm:inline">{isPlaying ? 'Stop' : 'Play'}</span>
                        </button>

                        <label className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-semibold bg-blue-500 hover:bg-blue-600 text-white cursor-pointer flex items-center gap-1 md:gap-2 transition-all duration-200 text-sm md:text-base ${isLoadingAudio ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <Upload size={16} className="md:hidden" />
                            <Upload size={20} className="hidden md:block" />
                            <span className="hidden sm:inline">Upload New</span>
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={(e) => handleFileUpload(e.target.files[0])}
                                className="hidden"
                                disabled={isLoadingAudio}
                            />
                        </label>

                        <button
                            onClick={downloadManipulatedAudio}
                            disabled={!isAudioReady || isLoadingAudio || isDownloading}
                            className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-semibold bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-1 md:gap-2 transition-all duration-200 text-sm md:text-base ${(!isAudioReady || isLoadingAudio || isDownloading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isDownloading ? (
                                <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Download size={16} className="md:hidden" />
                                    <Download size={20} className="hidden md:block" />
                                </>
                            )}
                            <span className="hidden sm:inline">
                                {isDownloading ? 'Processing...' : 'Download'}
                            </span>
                        </button>

                        <button
                            onClick={resetEQ}
                            disabled={!isAudioReady || isLoadingAudio || isDownloading}
                            className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-semibold bg-gray-500 hover:bg-gray-600 text-white flex items-center gap-1 md:gap-2 transition-all duration-200 text-sm md:text-base ${(!isAudioReady || isLoadingAudio || isDownloading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <RotateCcw size={16} className="md:hidden" />
                            <RotateCcw size={20} className="hidden md:block" />
                            <span className="hidden sm:inline">Reset</span>
                        </button>

                        {/* Preset Selector - Mobile version shows as a button that opens a modal */}
                        <div className="relative inline-block text-left w-full sm:w-auto">
                            <select
                                value={selectedPreset}
                                onChange={(e) => applyPreset(e.target.value)}
                                disabled={!isAudioReady || isLoadingAudio || isDownloading}
                                className={`block w-full px-4 py-2 md:px-6 md:py-3 rounded-full bg-purple-500 text-white font-semibold cursor-pointer appearance-none transition-all duration-200 hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm md:text-base ${(!isAudioReady || isLoadingAudio || isDownloading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {Object.keys(EQ_PRESETS).map((presetName) => (
                                    <option key={presetName} value={presetName}>
                                        {presetName}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 md:px-4 text-white">
                                <ChevronDown size={16} className="md:hidden" />
                                <ChevronDown size={20} className="hidden md:block" />
                            </div>
                        </div>

                        {/* Reverb Toggle */}
                        <button
                            onClick={toggleReverb}
                            disabled={!isAudioReady || isLoadingAudio || isDownloading}
                            className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-semibold flex items-center gap-1 md:gap-2 transition-all duration-200 text-sm md:text-base ${
                                isReverbActive
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                    : 'bg-gray-400 hover:bg-gray-500 text-white'
                            } ${(!isAudioReady || isLoadingAudio || isDownloading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Waves size={16} className="md:hidden" />
                            <Waves size={20} className="hidden md:block" />
                            <span className="hidden sm:inline">Reverb {isReverbActive ? 'On' : 'Off'}</span>
                        </button>
                    </div>

                    {/* Reverb Decay Slider */}
                    {isReverbActive && (
                        <div className="flex justify-center mb-4 md:mb-8">
                            <HorizontalSlider
                                label="Reverb Decay"
                                value={reverbDecay}
                                onChange={setReverbDecayValue}
                                min={0.1}
                                max={10}
                                step={0.1}
                                disabled={!isAudioReady || isLoadingAudio || isDownloading || !isReverbActive}
                            />
                        </div>
                    )}

                    {/* Frequency Visualizer */}
                    <div className="mb-4 md:mb-8 w-full overflow-hidden">
                        <FrequencyVisualizer 
                            analyser={analyserNode} 
                            filterCurve={filterCurveData} 
                            width={Math.min(window.innerWidth - 32, 700)} // Responsive width
                            height={200} // Slightly reduced height for mobile
                        />
                    </div>

                    {/* EQ Sliders - Horizontal scroll on mobile */}
                    <div className="w-full overflow-x-auto pb-4">
                        <div className="flex gap-2 md:gap-4 lg:gap-6 xl:gap-8 min-w-max">
                            {bands.map((band, index) => (
                                <VerticalSlider
                                    key={band.frequency}
                                    frequency={band.frequency}
                                    value={band.gain}
                                    onChange={(newGain) => setBandGain(index, newGain)}
                                    disabled={!isAudioReady || isLoadingAudio}
                                    compact={true} // You might want to add this prop to your VerticalSlider
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// Renamed App to EQApp to avoid potential naming conflicts
const EQStudio = () => {
    return (
        <AudioContextProvider>
            <EQContent />
        </AudioContextProvider>
    );
};

export default EQStudio;
