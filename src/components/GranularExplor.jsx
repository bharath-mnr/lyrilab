import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Disc3 } from 'lucide-react'; // Disc3 icon for Granular effect

// Define the path to your C4 piano sample.
const C4_PIANO_MP3_PATH = '/piano_samples/C4.mp3';

// --- AUDIO CONTEXT ---
// This context manages the global Tone.js audio state.
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);

    // Function to start Tone.js audio context
    const startGlobalAudio = useCallback(async () => {
        if (Tone.context.state !== 'running') {
            try {
                console.log('AudioContext: Attempting to start global Tone.js context...');
                await Tone.start();
                setIsAudioGloballyReady(true);
                console.log('AudioContext: Tone.js context started and is running.');
            } catch (error) {
                console.error("AudioContext: Error starting Tone.js context:", error);
                setIsAudioGloballyReady(false);
            }
        } else {
            setIsAudioGloballyReady(true);
            console.log('AudioContext: Tone.js context already running.');
        }
    }, []);

    // Effect to observe Tone.js context state changes
    useEffect(() => {
        const handleToneContextChange = () => {
            if (Tone.context.state === 'running') {
                setIsAudioGloballyReady(true);
            } else {
                setIsAudioGloballyReady(false);
            }
        };

        Tone.context.on('statechange', handleToneContextChange);
        handleToneContextChange(); // Initial check on mount

        return () => {
            Tone.context.off('statechange', handleToneContextChange);
        };
    }, []);

    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, startGlobalAudio }}>
            {children}
        </AudioContext.Provider>
    );
};
// --- END AUDIO CONTEXT ---


// --- useGranularSynth Hook ---
const useGranularSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const grainPlayerRef = useRef(null); // Use GrainPlayer directly as the source
    const waveformAnalyserRef = useRef(null);
    const hasInitializedRef = useRef(false);
    const isAudioLoadingRef = useRef(false); // New ref to track loading state

    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false); // Indicates if player is loaded AND context is running

    // Granular parameters
    const [grainSize, setGrainSize] = useState(0.1); // seconds
    const [overlap, setOverlap] = useState(0.1);     // seconds
    const [playbackRate, setPlaybackRate] = useState(1.0); // 0.5 to 2.0 typically
    const [detune, setDetune] = useState(0); // cents, global detune for GrainPlayer

    // Function to create and connect Tone.js nodes for effects processing
    const initAudioNodes = useCallback(async () => {
        if (hasInitializedRef.current || isAudioLoadingRef.current) {
            console.log('useGranularSynth: initAudioNodes: already initialized or loading, skipping init.');
            return;
        }

        console.log(`useGranularSynth: initAudioNodes called. isAudioGloballyReady: ${isAudioGloballyReady}`);

        if (isAudioGloballyReady) {
            isAudioLoadingRef.current = true; // Set loading state
            console.log('useGranularSynth: Proceeding with initialization of audio nodes and loading MP3...');
            try {
                // Dispose existing player if it somehow exists (e.g., failed previous load)
                if (grainPlayerRef.current) {
                    grainPlayerRef.current.dispose();
                    grainPlayerRef.current = null;
                }

                // Tone.GrainPlayer takes a buffer or URL directly in its constructor
                const grainPlayer = new Tone.GrainPlayer({
                    url: C4_PIANO_MP3_PATH,
                    loop: true,
                    autostart: false,
                    grainSize: grainSize,
                    overlap: overlap,
                    playbackRate: playbackRate,
                    detune: detune,
                    volume: -10
                });

                // Await the 'loaded' promise to ensure the audio buffer is ready
                await grainPlayer.loaded;
                console.log('useGranularSynth: Piano sample loaded successfully into GrainPlayer.');

                // Create Analyser for waveform visualization
                const waveformAnalyser = new Tone.Analyser("waveform", 1024); // 1024 samples for waveform data

                // Chain the GrainPlayer to the Analyser and then to the Destination
                grainPlayer.chain(waveformAnalyser, Tone.Destination);

                // Store references
                grainPlayerRef.current = grainPlayer;
                waveformAnalyserRef.current = waveformAnalyser;

                setIsAudioReady(true); // ONLY set to true AFTER successful load
                hasInitializedRef.current = true;
                isAudioLoadingRef.current = false; // Reset loading state
                console.log('useGranularSynth: Audio nodes initialized and connected.');

            } catch (error) {
                console.error("useGranularSynth: Error initializing audio nodes or loading MP3:", error);
                setIsAudioReady(false);
                hasInitializedRef.current = false;
                isAudioLoadingRef.current = false; // Reset loading state on error
                // Explicitly dispose player if partially created/failed
                if (grainPlayerRef.current) {
                    grainPlayerRef.current.dispose();
                    grainPlayerRef.current = null;
                }
            }
        } else {
            console.log("useGranularSynth: initAudioNodes skipped. Not globally ready or player already exists.");
        }
    }, [
        isAudioGloballyReady,
        // Removed granular parameters from dependencies to prevent re-initialization
    ]);

    // Function to dispose Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log(`useGranularSynth: disposeAudioNodes called. grainPlayerRef.current: ${grainPlayerRef.current}`);
        if (grainPlayerRef.current) {
            console.log('useGranularSynth: Disposing audio nodes...');
            if (grainPlayerRef.current.state === 'started') {
                grainPlayerRef.current.stop();
            }
            grainPlayerRef.current.dispose();
            if (waveformAnalyserRef.current) waveformAnalyserRef.current.dispose();

            grainPlayerRef.current = null; // Ensure this is nulled
            waveformAnalyserRef.current = null;

            setIsPlaying(false);
            setIsAudioReady(false);
            hasInitializedRef.current = false;
            isAudioLoadingRef.current = false; // Ensure loading state is reset
            console.log('useGranularSynth: Audio nodes disposed.');
        }
    }, []);

    // Effect to manage creation/disposal of nodes based on global audio readiness
    useEffect(() => {
        console.log(`useGranularSynth Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
        if (isAudioGloballyReady) {
            initAudioNodes();
        } else {
            disposeAudioNodes();
        }

        return () => {
            console.log('useGranularSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes]);

    // Effect to update granular parameters.
    // grainSize, overlap, playbackRate, and detune are direct properties of Tone.GrainPlayer,
    // so they are assigned directly. They are not AudioParams with rampTo.
    useEffect(() => {
        if (grainPlayerRef.current && isAudioReady) {
            grainPlayerRef.current.grainSize = grainSize;
            grainPlayerRef.current.overlap = overlap;
            grainPlayerRef.current.playbackRate = playbackRate; // Direct assignment, not rampTo
            grainPlayerRef.current.detune = detune;             // Direct assignment, not rampTo
        }
    }, [grainSize, overlap, playbackRate, detune, isAudioReady]);

    // Toggles playback
    const togglePlay = useCallback(async () => {
        console.log('togglePlay called. isPlaying:', isPlaying, 'isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady, 'isAudioLoadingRef:', isAudioLoadingRef.current);

        if (!isAudioGloballyReady) {
            console.log('togglePlay: AudioContext not globally ready, attempting to start global audio...');
            await startGlobalAudio();
            // Give a tiny moment for context state to propagate
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Re-check global audio readiness and initialization status after potential async operations
        // Ensure that isAudioLoadingRef.current is also false before attempting initAudioNodes
        if (Tone.context.state === 'running' && !hasInitializedRef.current && !isAudioLoadingRef.current) {
            console.log('togglePlay: Global audio ready but local nodes not initialized. Attempting to initialize them now...');
            await initAudioNodes();
            // Give a tiny moment for init to complete and state to propagate
            await new Promise(resolve => setTimeout(resolve, 50));
        }


        if (grainPlayerRef.current && isAudioReady) {
            try {
                if (isPlaying) {
                    grainPlayerRef.current.stop();
                    setIsPlaying(false);
                    console.log('togglePlay: Audio stopped.');
                } else {
                    grainPlayerRef.current.start();
                    setIsPlaying(true);
                    console.log('togglePlay: Audio started.');
                }
            } catch (e) {
                console.error("Error during audio playback toggle:", e);
                // If playback start fails, reset playing state
                setIsPlaying(false);
            }
        } else {
            console.warn('togglePlay: Cannot toggle playback. Audio system not fully ready or still loading.');
            // This case typically means initAudioNodes needs to be called by the user again
            // or there was a loading error.
        }
    }, [isPlaying, isAudioGloballyReady, isAudioReady, startGlobalAudio, initAudioNodes]);

    // Function to get real-time waveform data for the visualizer
    const getWaveformData = useCallback(() => {
        if (waveformAnalyserRef.current) {
            return waveformAnalyserRef.current.getValue();
        }
        return null;
    }, []);

    return {
        isPlaying,
        togglePlay,
        isAudioReady,
        isAudioLoading: isAudioLoadingRef.current, // Expose loading status to UI
        grainSize, setGrainSize,
        overlap, setOverlap,
        playbackRate, setPlaybackRate,
        detune, setDetune,
        getWaveformData, // Expose the waveform data getter
    };
};
// --- End useGranularSynth Hook ---


// --- WaveformVisualizer Component ---
const WaveformVisualizer = ({ analyser, width = 800, height = 200, scale = 1.0 }) => {
    const canvasRef = useRef(null);
    const animationFrameId = useRef(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || typeof analyser !== 'function') {
            animationFrameId.current = requestAnimationFrame(draw);
            return;
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#1e293b'; // slate-800
        ctx.fillRect(0, 0, width, height);

        // Center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Waveform
        const dataArray = analyser();
        if (!dataArray || dataArray.length === 0) {
            animationFrameId.current = requestAnimationFrame(draw);
            return;
        }

        ctx.strokeStyle = '#818cf8'; // indigo-400
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round'; // Makes sharp corners less jagged

        ctx.beginPath();
        const sliceWidth = width * 1.0 / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            // Scale the data and center it vertically
            const v = dataArray[i] * scale; // Apply scaling here
            const y = (v + 1) * height / 2; // Map -1 to 1 to 0 to height

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        ctx.stroke();

        animationFrameId.current = requestAnimationFrame(draw);
    }, [analyser, width, height, scale]);

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
    }, [draw]);

    return (
        <div className="w-full max-w-5xl mx-auto p-2 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-800 shadow-2xl border border-slate-700">
            <canvas
                ref={canvasRef}
                className="w-full h-full rounded-lg"
                style={{ display: 'block', borderRadius: '0.75rem' }}
            />
        </div>
    );
};
// --- End WaveformVisualizer Component ---


// --- EffectSection Component ---
// Modified to remove the checkbox and always appear enabled
const EffectSection = ({ title, icon, isAudioReady, children }) => (
    <div className="bg-white/70 rounded-xl p-6 shadow-md flex flex-col items-center space-y-4 border border-indigo-200">
        <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-2xl font-bold text-indigo-800">{title}</h2>
        </div>
        {/* Checkbox removed - effect is always enabled */}
        <div className={`grid grid-cols-1 gap-4 w-full opacity-100 ${!isAudioReady ? 'opacity-40 pointer-events-none' : ''}`}> {/* Always active styling */}
            {children}
        </div>
    </div>
);
// --- End EffectSection Component ---


// --- ParameterSlider Component ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '', isAudioReady }) => (
    <div className="flex flex-col items-center w-full">
        <label className="text-indigo-800 font-medium mb-2">{label}: {value.toFixed(2)}{unit}</label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setter(parseFloat(e.target.value))}
            className="w-full accent-indigo-600 h-2 rounded-lg appearance-none cursor-pointer bg-indigo-100"
            disabled={!isAudioReady}
        />
        <p className="text-indigo-700 text-sm mt-1 italic text-center">{explanation}</p>
    </div>
);
// --- End ParameterSlider Component ---


// --- GranularExplorerContent Component (Main UI Logic) ---
const GranularExplorerContent = () => {
    const {
        isPlaying, togglePlay,
        isAudioReady,
        isAudioLoading, // Use the new loading state
        grainSize, setGrainSize,
        overlap, setOverlap,
        playbackRate, setPlaybackRate,
        detune, setDetune,
        getWaveformData, // Get waveform data function
    } = useGranularSynth();

    const visualizerWidth = 700;
    const visualizerHeight = 150;

    const getExplanation = (param) => {
        switch (param) {
            case 'grainSize': return "The duration of each individual audio 'grain' in seconds. Smaller values create more choppy, stuttering sounds, larger values create more stretched or smeared effects.";
            case 'overlap': return "The amount of time (in seconds) that successive grains overlap each other. Higher overlap creates smoother transitions between grains.";
            case 'playbackRate': return "The playback speed of the grains. Affects both the pitch and the perceived speed of the audio. 1.0 is original speed/pitch, 0.5 is half speed/pitch, 2.0 is double speed/pitch.";
            case 'detune': return "Applies a global detune (in cents) to the output of the granular player. 100 cents equals one semitone.";
            default: return "Adjust parameters to explore the granular effect!";
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #f0e6f7 0%, #d4c9f0 50%, #c1b3e4 100%)', // Light purple gradient
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Floating Icons Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%236b21a8' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            <div className="text-center mb-10 z-10">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <Disc3 size={48} className="text-purple-700" />
                    <h1 className="text-5xl font-extrabold text-purple-900 drop-shadow-lg">Granular Explorer</h1>
                </div>
                {!isAudioReady && !isAudioLoading && (
                    <p className="text-purple-700 text-sm mt-4 animate-pulse">
                        Click "Play Piano Loop" to activate audio and begin.
                    </p>
                )}
                 {isAudioLoading && (
                    <p className="text-purple-700 text-sm mt-4 animate-pulse">
                        Loading audio... Please wait.
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg w-full max-w-3xl flex flex-col items-center space-y-8 z-10 border border-purple-200">

                {/* Play/Pause Button */}
                <button
                    type="button"
                    onClick={togglePlay}
                    className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all duration-300
                                ${isPlaying
                                ? 'bg-purple-700 hover:bg-purple-800 text-white'
                                : 'bg-purple-500 hover:bg-purple-600 text-white'}
                                ${(!isAudioReady && !isPlaying) || isAudioLoading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    disabled={isAudioLoading} // Disable button while audio is loading
                >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    {isPlaying ? "Stop Piano Loop" : "Play Piano Loop"}
                </button>

                {/* Waveform Visualizer */}
                <div className="w-full flex justify-center mt-8">
                    {isAudioReady && getWaveformData ? (
                        <WaveformVisualizer
                            analyser={getWaveformData}
                            width={visualizerWidth}
                            height={visualizerHeight}
                            scale={1.5} // Adjust scale for 'zoom' effect
                        />
                    ) : (
                        <div className="w-full bg-white/60 rounded-lg shadow-inner border border-purple-200 flex items-center justify-center"
                            style={{ width: visualizerWidth, height: visualizerHeight }}>
                            <p className="text-purple-500">Waveform Visualizer will appear after audio starts.</p>
                        </div>
                    )}
                </div>

                {/* Granular Controls */}
                <EffectSection
                    title="Granular"
                    icon={<Disc3 size={28} className="text-purple-600" />}
                    isAudioReady={isAudioReady}
                >
                    <ParameterSlider
                        label="Grain Size" value={grainSize} setter={setGrainSize}
                        min="0.01" max="0.5" step="0.01" unit=" s"
                        explanation={getExplanation('grainSize')}
                        isAudioReady={isAudioReady}
                    />
                    <ParameterSlider
                        label="Overlap" value={overlap} setter={setOverlap}
                        min="0" max="1" step="0.01" unit=" s"
                        explanation={getExplanation('overlap')}
                        isAudioReady={isAudioReady}
                    />
                    <ParameterSlider
                        label="Playback Rate" value={playbackRate} setter={setPlaybackRate}
                        min="0.25" max="4" step="0.05"
                        explanation={getExplanation('playbackRate')}
                        isAudioReady={isAudioReady}
                    />
                    <ParameterSlider
                        label="Detune" value={detune} setter={setDetune}
                        min="-1200" max="1200" step="10" unit=" cents"
                        explanation={getExplanation('detune')}
                        isAudioReady={isAudioReady}
                    />
                </EffectSection>
            </div>
        </div>
    );
};

// This is the default export for the standalone Granular Explorer
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error in GranularExplorer:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Granular Explorer. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

const GranularExplorer = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <GranularExplorerContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default GranularExplorer;
