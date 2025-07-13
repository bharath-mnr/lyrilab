import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Upload, Download, RotateCcw, ChevronDown, Waves, Clock, AlertCircle } from 'lucide-react';

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

// Slowed Reverb presets optimized for the slowed reverb aesthetic
const SLOWED_REVERB_PRESETS = {
    'Dreamy': { decay: 6.0, wet: 0.85, slowRate: 0.75, preDelay: 0.08 },
    'Ethereal': { decay: 8.5, wet: 0.90, slowRate: 0.70, preDelay: 0.12 },
    'Nostalgic': { decay: 5.0, wet: 0.75, slowRate: 0.80, preDelay: 0.06 },
    'Ambient': { decay: 10.0, wet: 0.95, slowRate: 0.65, preDelay: 0.15 },
    'Lofi': { decay: 3.5, wet: 0.70, slowRate: 0.85, preDelay: 0.04 },
    'Deep': { decay: 12.0, wet: 0.90, slowRate: 0.60, preDelay: 0.20 },
    'Vintage': { decay: 4.0, wet: 0.80, slowRate: 0.78, preDelay: 0.05 },
    'Spacey': { decay: 15.0, wet: 0.95, slowRate: 0.55, preDelay: 0.25 },
    'Custom': { decay: 6.0, wet: 0.85, slowRate: 0.75, preDelay: 0.08 }
};

// File size limit (50MB for client-side processing)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Helper function to convert AudioBuffer to WAV Blob
const audioBufferToWav = (buffer) => {
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length * numChannels * 2 + 44;
    const view = new DataView(new ArrayBuffer(length));

    // Helper functions
    let pos = 0;
    const writeString = (str) => {
        for (let i = 0; i < str.length; i++) view.setUint8(pos++, str.charCodeAt(i));
    };
    const setUint16 = (val) => { view.setUint16(pos, val, true); pos += 2; };
    const setUint32 = (val) => { view.setUint32(pos, val, true); pos += 4; };

    writeString("RIFF");
    setUint32(length - 8);
    writeString("WAVE");
    writeString("fmt ");
    setUint32(16);
    setUint16(1); // PCM format
    setUint16(numChannels);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * numChannels * 2); // Byte rate
    setUint16(numChannels * 2); // Block align
    setUint16(16); // Bits per sample
    writeString("data");
    setUint32(buffer.length * numChannels * 2);

    // Write each channel's data
    for (let i = 0; i < buffer.length; i++) {
        for (let ch = 0; ch < numChannels; ch++) {
            const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
            view.setInt16(pos, sample < 0 ? sample * 32768 : sample * 32767, true);
            pos += 2;
        }
    }

    return new Blob([view], { type: "audio/wav" });
};

// Custom hook for Slowed Reverb functionality
const useSlowedReverbProcessor = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const playerRef = useRef(null);
    const reverbRef = useRef(null);
    const delayRef = useRef(null);
    const currentAudioBufferRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [isLoadingAudio, setIsLoadingAudio] = useState(false);
    const [audioLoadError, setAudioLoadError] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [audioFileName, setAudioFileName] = useState('');
    const [hasAudioFile, setHasAudioFile] = useState(false);
    const [selectedPreset, setSelectedPreset] = useState('Dreamy');
    const [fileSizeWarning, setFileSizeWarning] = useState('');

    // Slowed Reverb parameters
    const [reverbDecay, setReverbDecay] = useState(6.0);
    const [wetLevel, setWetLevel] = useState(0.85);
    const [slowRate, setSlowRate] = useState(0.75);
    const [preDelay, setPreDelay] = useState(0.08);
    const [isEffectActive, setIsEffectActive] = useState(true);

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

        console.log('Initializing slowed reverb processor...');

        // Set playback rate conditionally based on effect state
        const playbackRate = isEffectActive ? slowRate : 1.0;

        // Create new player with conditional playback rate
        const player = new Tone.Player({
            url: audioBuffer,
            loop: true,
            autostart: false,
            playbackRate: playbackRate,
            onload: () => {
                console.log('Audio loaded successfully');
                setIsAudioReady(true);
                setIsLoadingAudio(false);
            }
        });

        // Create reverb with slowed reverb settings
        const reverb = new Tone.Reverb({
            decay: reverbDecay,
            wet: isEffectActive ? wetLevel : 0,
        });

        // Create pre-delay
        const delay = new Tone.Delay(preDelay);

        // Connect audio chain: Player -> Delay -> Reverb -> Destination
        player.connect(delay);
        delay.connect(reverb);
        reverb.connect(Tone.Destination);

        playerRef.current = player;
        reverbRef.current = reverb;
        delayRef.current = delay;

        console.log('Slowed reverb processor initialized successfully.');

    } catch (error) {
        console.error("Error initializing slowed reverb processor:", error);
        setAudioLoadError(`Failed to load audio: ${error.message || error}`);
        setIsAudioReady(false);
        setIsLoadingAudio(false);
    }
}, [reverbDecay, wetLevel, slowRate, preDelay, isEffectActive]);

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
        setIsPlaying(false);
        setIsAudioReady(false);
        setIsLoadingAudio(false);
        setAudioLoadError(null);
        currentAudioBufferRef.current = null;
        setSelectedPreset('Dreamy');
        setIsEffectActive(true);
        console.log('Slowed reverb processor disposed.');
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
                wet: isEffectActive ? wetLevel : 0,
            });
        }
    }, [reverbDecay, wetLevel, isEffectActive]);

    useEffect(() => {
        if (delayRef.current) {
            delayRef.current.delayTime.value = preDelay;
        }
    }, [preDelay]);

    useEffect(() => {
        if (playerRef.current) {
            // Update playback rate directly when slowRate or isEffectActive changes
            playerRef.current.playbackRate = isEffectActive ? slowRate : 1.0;
        }
    }, [slowRate, isEffectActive]);


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

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            setFileSizeWarning(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
            return;
        }

        console.log('File selected:', file.name);
        setAudioFileName(file.name);
        setIsPlaying(false);
        setAudioLoadError(null);
        setHasAudioFile(false);
        setFileSizeWarning('');

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
        const preset = SLOWED_REVERB_PRESETS[presetName];
        if (preset) {
            setReverbDecay(preset.decay);
            setWetLevel(preset.wet);
            setSlowRate(preset.slowRate);
            setPreDelay(preset.preDelay);
            setSelectedPreset(presetName);
            console.log(`Preset "${presetName}" applied.`);
        }
    }, []);

    const resetSettings = useCallback(() => {
        applyPreset('Dreamy');
        setIsEffectActive(true);
        console.log('Settings reset to Dreamy preset.');
    }, [applyPreset]);

    const downloadProcessedAudio = useCallback(async () => {
    if (!playerRef.current || !isAudioReady || isDownloading) return;

    setIsDownloading(true);
    setDownloadProgress(0);
    setAudioLoadError(null);

    try {
        console.log("Starting offline render...");

        // Calculate duration (accounting for slow rate + reverb decay)
        const duration = playerRef.current.buffer.duration / slowRate + reverbDecay;

        // Create a promise to track progress
        const progressPromise = new Promise((resolve) => {
            const interval = setInterval(() => {
                setDownloadProgress(prev => {
                    const newProgress = Math.min(prev + 5, 90);
                    if (newProgress >= 90) {
                        clearInterval(interval);
                        resolve();
                    }
                    return newProgress;
                });
            }, 200);
        });

        // Render using Tone.Offline
        const renderedBuffer = await Tone.Offline(async ({ transport }) => {
            // Create new instances of all effects for the offline context
            const offlinePlayer = new Tone.Player({
                buffer: playerRef.current.buffer,
                playbackRate: isEffectActive ? slowRate : 1.0
            });

            const offlineReverb = new Tone.Reverb({
                decay: reverbDecay,
                wet: isEffectActive ? wetLevel : 0
            }).toDestination();

            const offlineDelay = new Tone.Delay(preDelay).toDestination();

            // Connect the chain
            offlinePlayer.chain(offlineDelay, offlineReverb, Tone.Destination);

            // Start playback
            offlinePlayer.start(0);
            transport.start(0);

            // Wait for progress to reach 90%
            await progressPromise;

            // Wait for the audio to finish playing
            await new Promise(resolve => 
                setTimeout(resolve, duration * 1000)
            );

            // Clean up
            offlinePlayer.dispose();
            offlineReverb.dispose();
            offlineDelay.dispose();
        }, duration);

        // Complete progress
        setDownloadProgress(100);

        // Convert to WAV
        const wavBlob = audioBufferToWav(renderedBuffer);
        const url = URL.createObjectURL(wavBlob);

        // Trigger download
        const a = document.createElement("a");
        a.href = url;
        a.download = `${audioFileName.replace(/\.[^/.]+$/, "")}-slowed-reverb.wav`;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
            setIsDownloading(false);
        }, 100);

    } catch (error) {
        console.error("Offline render failed:", error);
        setAudioLoadError("Download failed. Please try again.");
        setIsDownloading(false);
        setDownloadProgress(0);
    }
    }, [isAudioReady, slowRate, reverbDecay, audioFileName, isDownloading, wetLevel, preDelay, isEffectActive]);

    return {
        isPlaying, togglePlay,
        isAudioReady, isLoadingAudio, audioLoadError,
        isDownloading, downloadProgress, downloadProcessedAudio,
        handleFileUpload, audioFileName, hasAudioFile, fileSizeWarning,
        reverbDecay, setReverbDecay,
        wetLevel, setWetLevel,
        slowRate, setSlowRate,
        preDelay, setPreDelay,
        isEffectActive, setIsEffectActive,
        selectedPreset, applyPreset, resetSettings
    };
};

// Upload Section Component
const UploadSection = ({ onFileUpload, isLoading, fileSizeWarning }) => {
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
                    
                    <h1 className="text-6xl font-bold text-gray-900">Slowed Reverb Studio</h1>
                </div>
                <p className="text-gray-600 text-xl max-w-2xl mx-auto">
                    Create dreamy slowed + reverb versions of your favorite tracks. 
                    Perfect for creating that nostalgic, atmospheric sound.
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
                                <span className="text-sm text-gray-700">Max file size: 50MB</span>
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
                
                {fileSizeWarning && (
                    <div className="mt-4 p-4 bg-red-100 border border-red-200 rounded-lg flex items-center gap-2">
                        <AlertCircle className="text-red-600" size={20} />
                        <span className="text-red-700">{fileSizeWarning}</span>
                    </div>
                )}
            </div>
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
            bg-gradient-to-b from-purple-900/30 to-pink-900/30 backdrop-blur-sm 
            rounded-lg shadow-sm border border-purple-500/20 
            ${compact ? 'w-24 sm:w-28 md:w-32 lg:w-36' : 'w-28 sm:w-36 md:w-40 lg:w-48'}`}>
            
            <label className={`text-purple-200 font-medium mb-2 md:mb-3 text-center 
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
                className={`w-full ${compact ? 'h-1.5' : 'h-2'} bg-purple-800 rounded-lg appearance-none cursor-pointer 
                    ${disabled ? 'opacity-50' : ''}`}
                style={{
                    background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${percentage}%, #581c87 ${percentage}%, #581c87 100%)`
                }}
            />
            
            <span className={`text-purple-300 mt-2 md:mt-3 font-mono bg-purple-900/50 px-2 py-0.5 rounded 
                ${mobileCompact ? 'text-xs sm:text-sm' : 'text-sm'}`}>
                {value.toFixed(unit === 's' ? 2 : unit === '%' ? 0 : unit === 'x' ? 2 : 2)}{unit}
            </span>
        </div>
    );
};

// Main Slowed Reverb Content Component
const SlowedReverbContent = () => {
    const {
        isPlaying, togglePlay,
        isAudioReady, isLoadingAudio, audioLoadError,
        isDownloading, downloadProgress, downloadProcessedAudio,
        handleFileUpload, audioFileName, hasAudioFile, fileSizeWarning,
        reverbDecay, setReverbDecay,
        wetLevel, setWetLevel,
        slowRate, setSlowRate,
        preDelay, setPreDelay,
        isEffectActive, setIsEffectActive,
        selectedPreset, applyPreset, resetSettings
    } = useSlowedReverbProcessor();

    const toggleEffectActive = useCallback(() => {
        setIsEffectActive(prev => !prev);
        // The playbackRate and wet level changes are handled by useEffects in useSlowedReverbProcessor
        // that watch `slowRate`, `wetLevel`, and `isEffectActive`.
    }, [setIsEffectActive]);
    
    if (!hasAudioFile) {
        return <UploadSection onFileUpload={handleFileUpload} isLoading={isLoadingAudio} fileSizeWarning={fileSizeWarning} />;
    }

    return (
        <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-gradient-to-br from-purple-900 via-pink-900 to-indigo-900 font-inter">
            {/* Header Section */}
            <div className="text-center mb-4 sm:mb-6 md:mb-8 lg:mb-10 w-full px-2">
                <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-1 sm:mb-2 md:mb-3 lg:mb-4">
                    
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white">
                        Slowed Reverb Studio
                    </h1>
                </div>
                
                <p className="text-purple-200 text-xs sm:text-sm md:text-base lg:text-lg">
                    Create dreamy slowed + reverb versions
                </p>
                
                {isLoadingAudio && (
                    <p className="text-purple-300 text-[0.65rem] xs:text-xs sm:text-sm mt-1 sm:mt-2 md:mt-3 lg:mt-4 animate-pulse">
                        Loading audio: {audioFileName}...
                    </p>
                )}
                
                {audioLoadError && (
                    <p className="text-red-400 text-[0.65rem] xs:text-xs sm:text-sm mt-1 sm:mt-2 md:mt-3 lg:mt-4">
                        Error: {audioLoadError}
                    </p>
                )}
                
                {isAudioReady && (
                    <p className="text-purple-300 text-[0.65rem] xs:text-xs sm:text-sm mt-1 sm:mt-2 truncate max-w-full">
                        Current: <span className="font-semibold">{audioFileName}</span>
                    </p>
                )}
            </div>

            {/* Main Content */}
            <div className="bg-black/20 backdrop-blur-sm p-4 md:p-8 rounded-xl md:rounded-2xl shadow-lg md:shadow-2xl w-full max-w-7xl border border-purple-500/20">
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

                    <label className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-semibold bg-blue-500 hover:bg-blue-600 text-white cursor-pointer flex items-center gap-1 md:gap-2 transition-all duration-200 text-sm md:text-base`}>
                        <Upload size={16} />
                        <span className="hidden sm:inline ml-1">New File</span>
                        <input
                            type="file"
                            accept="audio/*"
                            onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])}
                            className="hidden"
                        />
                    </label>

                    <button
                        onClick={downloadProcessedAudio}
                        disabled={!isAudioReady || isDownloading}
                        className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-semibold bg-purple-500 hover:bg-purple-600 text-white flex items-center gap-1 md:gap-2 transition-all duration-200 text-sm md:text-base ${
                            (!isAudioReady || isDownloading) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                    >
                        {isDownloading ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <Download size={16} />
                        )}
                        <span className="hidden sm:inline ml-1">
                            {isDownloading ? `${downloadProgress}%` : 'Download'}
                        </span>
                    </button>

                    <button
                        onClick={resetSettings}
                        className="px-4 py-2 md:px-6 md:py-3 rounded-full font-semibold bg-gray-500 hover:bg-gray-600 text-white flex items-center gap-1 md:gap-2 transition-all duration-200 text-sm md:text-base"
                    >
                        <RotateCcw size={16} />
                        <span className="hidden sm:inline ml-1">Reset</span>
                    </button>
                </div>

                {/* Preset Selection */}
                <div className="mb-4 md:mb-8">
                    <h3 className="text-white text-base md:text-lg lg:text-xl font-semibold mb-2 md:mb-4 text-center">
                        Slowed Reverb Presets
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
                        {Object.keys(SLOWED_REVERB_PRESETS).map((presetName) => (
                            <button
                                key={presetName}
                                onClick={() => applyPreset(presetName)}
                                className={`px-2 py-1 md:px-3 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${
                                    selectedPreset === presetName 
                                        ? 'bg-purple-500 text-white shadow-lg' 
                                        : 'bg-purple-900/30 text-purple-200 hover:bg-purple-800/50'
                                }`}
                            >
                                {presetName}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Effect Toggle */}
                <div className="mb-6 md:mb-10 text-center">
                    <button
                        onClick={toggleEffectActive}
                        className={`px-6 py-3 rounded-full font-semibold flex items-center justify-center mx-auto gap-2 transition-all duration-300 text-base md:text-lg ${
                            isEffectActive 
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md' 
                                : 'bg-gray-700 hover:bg-gray-800 text-gray-300 border border-gray-600'
                        }`}
                    >
                        {isEffectActive ? <Waves size={20} /> : <AlertCircle size={20} />}
                        {isEffectActive ? 'Effect Active' : 'Effect Bypassed'}
                    </button>
                </div>

                {/* Parameter Sliders */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 justify-items-center">
                    <ParameterSlider
                        label="Reverb Decay"
                        value={reverbDecay}
                        onChange={setReverbDecay}
                        min={0.5}
                        max={20.0}
                        step={0.1}
                        unit="s"
                        disabled={!isEffectActive}
                        mobileCompact={true}
                    />
                    <ParameterSlider
                        label="Wet Level"
                        value={wetLevel}
                        onChange={setWetLevel}
                        min={0.0}
                        max={1.0}
                        step={0.01}
                        unit="%"
                        disabled={!isEffectActive}
                        mobileCompact={true}
                    />
                    <ParameterSlider
                        label="Slow Rate"
                        value={slowRate}
                        onChange={setSlowRate}
                        min={0.1}
                        max={1.0}
                        step={0.01}
                        unit="x"
                        disabled={!isEffectActive}
                        mobileCompact={true}
                    />
                    <ParameterSlider
                        label="Pre-Delay"
                        value={preDelay}
                        onChange={setPreDelay}
                        min={0.0}
                        max={0.5}
                        step={0.01}
                        unit="s"
                        disabled={!isEffectActive}
                        mobileCompact={true}
                    />
                </div>
            </div>
        </div>
    );
};

// Main App Component
const SlowedReverbStudio = () => {
    return (
        <AudioContextProvider>
            <SlowedReverbContent />
        </AudioContextProvider>
    );
};

export default SlowedReverbStudio;
