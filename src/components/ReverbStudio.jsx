import React, { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Upload, Download, Waves, RotateCcw, ChevronDown, Volume2 } from 'lucide-react';

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

// Reverb presets with different characteristics
const REVERB_PRESETS = {
    'Hall': { decay: 3.5, wet: 0.7, roomSize: 0.8, preDelay: 0.05 },
    'Chamber': { decay: 2.2, wet: 0.5, roomSize: 0.6, preDelay: 0.03 },
    'Plate': { decay: 1.8, wet: 0.6, roomSize: 0.4, preDelay: 0.02 },
    'Room': { decay: 1.2, wet: 0.4, roomSize: 0.3, preDelay: 0.01 },
    'Cathedral': { decay: 8.0, wet: 0.8, roomSize: 0.9, preDelay: 0.08 },
    'Spring': { decay: 0.8, wet: 0.5, roomSize: 0.2, preDelay: 0.005 },
    'Ambient': { decay: 6.0, wet: 0.9, roomSize: 0.7, preDelay: 0.1 },
    'Vocal': { decay: 2.5, wet: 0.3, roomSize: 0.5, preDelay: 0.02 },
    'Drum': { decay: 1.5, wet: 0.4, roomSize: 0.4, preDelay: 0.01 },
    'Custom': { decay: 2.0, wet: 0.5, roomSize: 0.5, preDelay: 0.03 }
};

// Helper function to convert AudioBuffer to WAV Blob
const audioBufferToWav = (buffer) => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    
    let pos = 0;
    const setUint16 = (data) => {
        view.setUint16(pos, data, true);
        pos += 2;
    };
    
    const setUint32 = (data) => {
        view.setUint32(pos, data, true);
        pos += 4;
    };
    
    const writeString = (str) => {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(pos++, str.charCodeAt(i));
        }
    };
    
    writeString('RIFF');
    setUint32(length - 8);
    writeString('WAVE');
    writeString('fmt ');
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    writeString('data');
    setUint32(buffer.length * numOfChan * 2);
    
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

// Custom hook for Reverb functionality
const useReverbProcessor = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const playerRef = useRef(null);
    const reverbRef = useRef(null);
    const delayRef = useRef(null);
    const analyserRef = useRef(null);
    const currentAudioBufferRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [audioLoadError, setAudioLoadError] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [audioFileName, setAudioFileName] = useState('');
    const [hasAudioFile, setHasAudioFile] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState('Hall');

    // Reverb parameters
    const [reverbDecay, setReverbDecay] = useState(3.5);
    const [wetLevel, setWetLevel] = useState(0.7);
    const [roomSize, setRoomSize] = useState(0.8);
    const [preDelay, setPreDelay] = useState(0.05);
    const [damping, setDamping] = useState(0.5); // Damping is not directly exposed by Tone.Reverb, but can be simulated or ignored for simplicity
    const [isReverbActive, setIsReverbActive] = useState(true);

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
            if (reverbRef.current) {
                reverbRef.current.dispose();
                reverbRef.current = null;
            }
            if (delayRef.current) {
                delayRef.current.dispose();
                delayRef.current = null;
            }
            if (analyserRef.current) {
                analyserRef.current.dispose();
                analyserRef.current = null;
            }

            console.log('Initializing reverb processor...');

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

            // Create reverb with initial settings
            const reverb = new Tone.Reverb({
                decay: reverbDecay,
                wet: isReverbActive ? wetLevel : 0,
                // Tone.Reverb does not have a direct 'roomSize' parameter.
                // It's typically controlled by 'decay' and internal algorithms.
                // For demonstration, we'll map roomSize to decay or simply omit it.
                // For now, we'll just use decay and wet.
            });

            // Create pre-delay
            const delay = new Tone.Delay(preDelay);

            // Create analyser for visualization
            const analyser = new Tone.Analyser("fft", 512);

            // Connect audio chain: Player -> Delay -> Reverb -> Analyser -> Destination
            player.connect(delay);
            delay.connect(reverb);
            reverb.connect(analyser);
            analyser.connect(Tone.Destination);

            playerRef.current = player;
            reverbRef.current = reverb;
            delayRef.current = delay;
            analyserRef.current = analyser;

            console.log('Reverb processor initialized successfully.');

        } catch (error) {
            console.error("Error initializing reverb processor:", error);
            setAudioLoadError(`Failed to load audio: ${error.message || error}`);
            setIsAudioReady(false);
            setIsLoadingAudio(false);
        }
    }, [reverbDecay, wetLevel, preDelay, isReverbActive]); // Removed roomSize from dependencies as Tone.Reverb doesn't directly use it

    const disposeAudioNodes = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.stop();
            playerRef.current.dispose();
            playerRef.current = null;
        }
        if (reverbRef.current) {
            reverbRef.current.dispose();
            reverbRef.current = null;
        }
        if (delayRef.current) {
            delayRef.current.dispose();
            delayRef.current = null;
        }
        if (analyserRef.current) {
            analyserRef.current.dispose();
            analyserRef.current = null;
        }
        setIsPlaying(false);
        setIsAudioReady(false);
        setIsLoadingAudio(false);
        setAudioLoadError(null);
        currentAudioBufferRef.current = null;
        setSelectedPreset('Hall');
        setIsReverbActive(true);
        console.log('Reverb processor disposed.');
    }, []);

    useEffect(() => {
        return () => {
            disposeAudioNodes();
        };
    }, [disposeAudioNodes]);

    // Update reverb parameters in real-time
    useEffect(() => {
        if (reverbRef.current) {
            reverbRef.current.set({
                decay: reverbDecay,
                wet: isReverbActive ? wetLevel : 0,
            });
        }
    }, [reverbDecay, wetLevel, isReverbActive]);

    useEffect(() => {
        if (delayRef.current) {
            delayRef.current.delayTime.value = preDelay;
        }
    }, [preDelay]);

    const togglePlay = useCallback(async () => {
        if (!isAudioGloballyReady) {
            await startGlobalAudio();
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

    const handleFileUpload = useCallback(async (file) => {
        if (!file) return;

        console.log('File selected:', file.name);
        setAudioFileName(file.name);
        setIsPlaying(false);
        setAudioLoadError(null);
        setHasAudioFile(false);

        try {
            if (!isAudioGloballyReady) {
                await startGlobalAudio();
            }
            
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await Tone.context.decodeAudioData(arrayBuffer);
            currentAudioBufferRef.current = audioBuffer;

            const audioBlobUrl = URL.createObjectURL(file);
            await initAudioNodes(audioBlobUrl);
            setHasAudioFile(true);
            
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

    const applyPreset = useCallback((presetName) => {
        const preset = REVERB_PRESETS[presetName];
        if (preset) {
            setReverbDecay(preset.decay);
            setWetLevel(preset.wet);
            setRoomSize(preset.roomSize); // Keep for UI, even if not directly used by Tone.Reverb
            setPreDelay(preset.preDelay);
            setSelectedPreset(presetName);
            console.log(`Preset "${presetName}" applied.`);
        }
    }, []);

    const resetReverb = useCallback(() => {
        applyPreset('Hall');
        setIsReverbActive(true);
        setDamping(0.5); // Reset damping for UI consistency
        console.log('Reverb settings reset to Hall preset.');
    }, [applyPreset]);

    const downloadProcessedAudio = useCallback(async () => {
        if (!currentAudioBufferRef.current || isDownloading) return;

        setIsDownloading(true);
        setAudioLoadError(null);

        try {
            console.log('Starting offline reverb processing...');
            
            // Create offline context with the same parameters as the original audio
            const offlineContext = new OfflineAudioContext(
                currentAudioBufferRef.current.numberOfChannels,
                currentAudioBufferRef.current.length, // Use exact length
                currentAudioBufferRef.current.sampleRate
            );

            // Create source node
            const source = offlineContext.createBufferSource();
            source.buffer = currentAudioBufferRef.current;

            // Create delay node
            const delay = offlineContext.createDelay(1.0); // Max delay of 1 second
            delay.delayTime.value = preDelay;

            // Create reverb node
            const reverb = offlineContext.createConvolver();
            
            // Generate impulse response for reverb
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

            // Create gain node for wet/dry mix
            const wetGain = offlineContext.createGain();
            const dryGain = offlineContext.createGain();
            
            wetGain.gain.value = isReverbActive ? wetLevel : 0;
            dryGain.gain.value = 1 - wetGain.gain.value;

            // Connect the audio chain
            source.connect(delay);
            delay.connect(dryGain);
            delay.connect(reverb);
            reverb.connect(wetGain);
            
            // Merge wet and dry signals
            const merger = offlineContext.createChannelMerger(2);
            dryGain.connect(merger, 0, 0);
            wetGain.connect(merger, 0, 1);
            
            merger.connect(offlineContext.destination);

            // Start playback
            source.start(0);

            // Render the audio
            const renderedBuffer = await offlineContext.startRendering();
            console.log('Offline reverb processing complete');

            // Convert to WAV and download
            const wavBlob = audioBufferToWav(renderedBuffer);
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;

            // Get the base name of the uploaded file without its extension
            const baseFileName = audioFileName.split('.').slice(0, -1).join('.') || 'audio';
            a.download = `${baseFileName}-reverb.wav`;

            document.body.appendChild(a);
            a.click();
            
            // Clean up
            setTimeout(() => {
                URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 100);

        } catch (error) {
            console.error('Error during reverb processing:', error);
            setAudioLoadError(`Failed to process reverb: ${error.message || error}`);
        } finally {
            setIsDownloading(false);
        }
    }, [currentAudioBufferRef, reverbDecay, wetLevel, preDelay, isReverbActive, audioFileName, isDownloading]);

    const getFrequencyData = useCallback(() => {
        if (analyserRef.current) {
            return analyserRef.current.getValue();
        }
        return new Float32Array(256).fill(-100);
    }, []);

    return {
        isPlaying, togglePlay,
        isAudioReady, isLoadingAudio, audioLoadError,
        isDownloading, downloadProcessedAudio,
        handleFileUpload, audioFileName, hasAudioFile,
        getFrequencyData,
        reverbDecay, setReverbDecay,
        wetLevel, setWetLevel,
        roomSize, setRoomSize, // Exposed for UI
        preDelay, setPreDelay,
        damping, setDamping, // Exposed for UI
        isReverbActive, setIsReverbActive,
        selectedPreset, applyPreset, resetReverb
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

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 font-inter">
            <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-4 mb-6">
                    <h1 className="text-6xl font-bold text-gray-900">Reverb Studio</h1>
                </div>
                <p className="text-gray-600 text-xl max-w-2xl mx-auto">
                    Professional reverb processor with multiple acoustic spaces. 
                    Upload your audio file to add stunning reverb effects.
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
                            fileInputRef.current.value = '';
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

// Reverb Visualizer Component
const ReverbVisualizer = ({ analyser, width = 700, height = 250 }) => {
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
        gradient.addColorStop(0, '#1e1b4b');
        gradient.addColorStop(0.5, '#312e81');
        gradient.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw grid lines
        ctx.strokeStyle = 'rgba(167, 243, 208, 0.1)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 10; i++) {
            const x = (i / 10) * width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        for (let i = 0; i <= 5; i++) {
            const y = (i / 5) * height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw frequency spectrum with reverb effect visualization
        const dataArray = typeof analyser === 'function' ? analyser() : analyser;
        if (dataArray && dataArray.length > 0) {
            // Main spectrum
            ctx.strokeStyle = '#06b6d4';
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

            // Reverb tail visualization (softer, delayed spectrum)
            ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            const tailFirstValue = Array.isArray(dataArray) ? dataArray[0] : dataArray[0] || minDb;
            const tailFirstNormalizedValue = Math.max(0, Math.min(1, (tailFirstValue - minDb) / (maxDb - minDb))) * 0.7;
            ctx.moveTo(0, height - (tailFirstNormalizedValue * height));

            for (let i = 1; i < dataArray.length; i++) {
                const x = (i / (dataArray.length - 1)) * width;
                const value = Array.isArray(dataArray) ? dataArray[i] : dataArray[i] || minDb;
                const normalizedValue = Math.max(0, Math.min(1, (value - minDb) / (maxDb - minDb))) * 0.7;
                const y = height - (normalizedValue * height) + 20;
                ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Add glow effect
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#06b6d4';
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, height - (firstNormalizedValue * height));
            for (let i = 1; i < dataArray.length; i++) {
                const x = (i / (dataArray.length - 1)) * width;
                const value = Array.isArray(dataArray) ? dataArray[i] : dataArray[i] || minDb;
                const normalizedValue = Math.max(0, Math.min(1, (value - minDb) / (maxDb - minDb)));
                const y = height - (normalizedValue * height);
                ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        animationFrameId.current = requestAnimationFrame(draw);
    }, [analyser, width, height]);

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
        <div className="w-full max-w-4xl mx-auto p-4 rounded-2xl bg-gradient-to-b from-indigo-900/50 to-purple-900/50 backdrop-blur-sm shadow-2xl border border-cyan-500/20">
            <canvas
                ref={canvasRef}
                className="w-full h-full rounded-lg"
                style={{ display: 'block' }}
            />
        </div>
    );
};

// Parameter Slider Component
const ParameterSlider = ({ 
    label, 
    value, 
    onChange, 
    min = 0, 
    max = 1, 
    step = 0.01, 
    unit = '', 
    disabled = false,
    compact = false,
    mobileCompact = false 
}) => {
    const percentage = ((value - min) / (max - min)) * 100;
    
    return (
        <div className={`flex flex-col items-center ${compact ? 'p-2 md:p-3' : 'p-3 md:p-4'} 
            bg-gradient-to-b from-indigo-900/30 to-purple-900/30 backdrop-blur-sm 
            rounded-lg shadow-sm border border-cyan-500/20 
            ${compact ? 'w-24 sm:w-28 md:w-32 lg:w-36' : 'w-28 sm:w-36 md:w-40 lg:w-48'}`}>
            
            <label className={`text-cyan-200 font-medium mb-2 md:mb-3 text-center 
                ${mobileCompact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
                {label}
            </label>
            
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                disabled={disabled}
                className={`w-full ${compact ? 'h-1.5' : 'h-2'} bg-indigo-800 rounded-lg appearance-none cursor-pointer 
                    ${disabled ? 'opacity-50' : ''}`}
                style={{
                    background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${percentage}%, #312e81 ${percentage}%, #312e81 100%)`
                }}
            />
            
            <span className={`text-cyan-300 mt-2 md:mt-3 font-mono bg-indigo-900/50 px-2 py-0.5 rounded 
                ${mobileCompact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
                {value.toFixed(unit === 's' ? 2 : unit === '%' ? 0 : 2)}{unit}
            </span>
        </div>
    );
};

// Main Reverb Content Component
const ReverbContent = () => {
    const {
        isPlaying, togglePlay,
        isAudioReady, isLoadingAudio, audioLoadError,
        isDownloading, downloadProcessedAudio,
        handleFileUpload, audioFileName, hasAudioFile,
        getFrequencyData,
        reverbDecay, setReverbDecay,
        wetLevel, setWetLevel,
        roomSize, setRoomSize,
        preDelay, setPreDelay,
        isReverbActive, setIsReverbActive,
        selectedPreset, applyPreset, resetReverb
    } = useReverbProcessor();

    const analyserNode = useMemo(() => 
        isAudioReady ? getFrequencyData : null, 
        [isAudioReady, getFrequencyData]
    );

    const toggleReverbActive = useCallback(() => {
        setIsReverbActive(prev => !prev);
        if (isReverbActive) {
            applyPreset('No Reverb');
        } else {
            if (selectedPreset === 'No Reverb') {
                applyPreset('Hall');
            } else {
                applyPreset(selectedPreset);
            }
        }
    }, [isReverbActive, selectedPreset, applyPreset]);

    if (!hasAudioFile) {
        return <UploadSection onFileUpload={handleFileUpload} isLoading={isLoadingAudio} />;
    }

    return (
        <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 font-inter">
            {/* Header Section */}
            <div className="text-center mb-4 sm:mb-6 md:mb-8 lg:mb-10 w-full px-2">
                <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-1 sm:mb-2 md:mb-3 lg:mb-4">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                        Reverb Studio
                    </h1>
                </div>
                
                <p className="text-cyan-200 text-xs sm:text-sm md:text-base lg:text-lg">
                    Professional reverb processor
                </p>
                
                {isLoadingAudio && (
                    <p className="text-cyan-300 text-[0.65rem] xs:text-xs sm:text-sm mt-1 sm:mt-2 md:mt-3 lg:mt-4 animate-pulse">
                        Loading audio: {audioFileName}...
                    </p>
                )}
                
                {audioLoadError && (
                    <p className="text-red-400 text-[0.65rem] xs:text-xs sm:text-sm mt-1 sm:mt-2 md:mt-3 lg:mt-4">
                        Error: {audioLoadError}
                    </p>
                )}
                
                {isAudioReady && (
                    <p className="text-cyan-300 text-[0.65rem] xs:text-xs sm:text-sm mt-1 sm:mt-2 truncate max-w-full">
                        Current: <span className="font-semibold">{audioFileName}</span>
                    </p>
                )}
            </div>

            {/* Main Content */}
            <div className="bg-black/20 backdrop-blur-sm p-4 md:p-8 rounded-xl md:rounded-2xl shadow-lg md:shadow-2xl w-full max-w-7xl border border-cyan-500/20">
                {/* Control Buttons */}
                <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-4 md:mb-8">
                    <button
                        onClick={togglePlay}
                        disabled={!isAudioReady || isLoadingAudio}
                        className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-semibold flex items-center gap-1 md:gap-2 transition-all duration-200 text-sm md:text-base ${
                            isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' 
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        } ${(!isAudioReady || isLoadingAudio) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                        <span className="hidden sm:inline ml-1">{isPlaying ? 'Stop' : 'Play'}</span>
                    </button>

                    <label className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-semibold bg-blue-500 hover:bg-blue-600 text-white cursor-pointer flex items-center gap-1 md:gap-2 transition-all duration-200 text-sm md:text-base ${isLoadingAudio ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <Upload size={16} />
                        <span className="hidden sm:inline ml-1">Upload</span>
                        <input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e.target.files[0])} className="hidden" disabled={isLoadingAudio} />
                    </label>

                    <button
                        onClick={downloadProcessedAudio}
                        disabled={!isAudioReady || isLoadingAudio || isDownloading}
                        className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-semibold bg-indigo-500 hover:bg-indigo-600 text-white flex items-center gap-1 md:gap-2 transition-all duration-200 text-sm md:text-base ${(!isAudioReady || isLoadingAudio || isDownloading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isDownloading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Download size={16} />
                        )}
                        <span className="hidden sm:inline ml-1">Download</span>
                    </button>

                    <button
                        onClick={resetReverb}
                        disabled={!isAudioReady || isLoadingAudio || isDownloading}
                        className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-semibold bg-gray-500 hover:bg-gray-600 text-white flex items-center gap-1 md:gap-2 transition-all duration-200 text-sm md:text-base ${(!isAudioReady || isLoadingAudio || isDownloading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <RotateCcw size={16} />
                        <span className="hidden sm:inline ml-1">Reset</span>
                    </button>

                    {/* Reverb Toggle */}
                    <button
                        onClick={toggleReverbActive}
                        disabled={!isAudioReady || isLoadingAudio || isDownloading}
                        className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-semibold flex items-center gap-1 md:gap-2 transition-all duration-200 text-sm md:text-base ${
                            isReverbActive ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'bg-gray-400 hover:bg-gray-500 text-white'
                        } ${(!isAudioReady || isLoadingAudio || isDownloading) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Waves size={16} />
                        <span className="hidden sm:inline ml-1">Reverb {isReverbActive ? 'On' : 'Off'}</span>
                    </button>

                    {/* Preset Selector */}
                    <div className="relative w-full sm:w-auto">
                        <select
                            value={selectedPreset}
                            onChange={(e) => applyPreset(e.target.value)}
                            disabled={!isAudioReady || isLoadingAudio || isDownloading || !isReverbActive}
                            className={`block w-full px-4 py-2 md:px-6 md:py-3 rounded-full bg-purple-500 text-white font-semibold cursor-pointer appearance-none transition-all duration-200 hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent text-sm md:text-base ${(!isAudioReady || isLoadingAudio || isDownloading || !isReverbActive) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {Object.keys(REVERB_PRESETS).map((presetName) => (
                                <option key={presetName} value={presetName}>
                                    {presetName}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 md:px-4 text-white">
                            <ChevronDown size={16} />
                        </div>
                    </div>
                </div>

                {/* Compact Parameter Sliders */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
                    <ParameterSlider
                        label="Decay"
                        value={reverbDecay}
                        onChange={setReverbDecay}
                        min={0.1}
                        max={10}
                        step={0.1}
                        unit="s"
                        disabled={!isAudioReady || isLoadingAudio || !isReverbActive}
                        compact={true}
                        mobileCompact={true}
                    />
                    <ParameterSlider
                        label="Wet"
                        value={wetLevel}
                        onChange={setWetLevel}
                        min={0}
                        max={1}
                        step={0.01}
                        unit="%"
                        disabled={!isAudioReady || isLoadingAudio || !isReverbActive}
                        compact={true}
                        mobileCompact={true}
                    />
                    <ParameterSlider
                        label="Room"
                        value={roomSize}
                        onChange={setRoomSize}
                        min={0}
                        max={1}
                        step={0.01}
                        disabled={!isAudioReady || isLoadingAudio || !isReverbActive}
                        compact={true}
                        mobileCompact={true}
                    />
                    <ParameterSlider
                        label="Pre-Dly"
                        value={preDelay}
                        onChange={setPreDelay}
                        min={0}
                        max={0.5}
                        step={0.001}
                        unit="s"
                        disabled={!isAudioReady || isLoadingAudio || !isReverbActive}
                        compact={true}
                        mobileCompact={true}
                    />
                </div>

                {/* Visualizer */}
                <div className="mb-4 md:mb-8 w-full overflow-hidden">
                    <ReverbVisualizer 
                        analyser={analyserNode} 
                        width={Math.min(window.innerWidth - 32, 700)}
                        height={200}
                    />
                </div>
            </div>
        </div>
    );
};
// Main App component for the Reverb Studio
const ReverbStudio = () => {
    return (
        <AudioContextProvider>
            <ReverbContent />
        </AudioContextProvider>
    );
};

export default ReverbStudio;
