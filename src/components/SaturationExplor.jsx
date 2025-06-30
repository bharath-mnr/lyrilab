import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, SquareDot } from 'lucide-react'; // Only SquareDot needed for Saturation icon
import SEOHead from './SEOHead';


// Define the tool object for SEO structured data
const saturationExplorerTool = {
    id: 'saturation-explorer',
    name: 'Saturation Explorer',
    description: 'Learn audio saturation techniques for harmonic enhancement and analog warmth.',
    path: '/saturation-explorer',
    categories: [
        'Saturation',
        'Harmonic Distortion',
        'Analog Emulation',
        'Music Production',
        'Sound Design'
    ]
};

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


// --- useSaturationSynth Hook ---
const useSaturationSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const playerRef = useRef(null);
    const saturationRef = useRef(null);
    const waveformAnalyserRef = useRef(null);
    const hasInitializedRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false);

    // Saturation parameters (using a Tone.Distortion instance for conceptual saturation)
    // isSaturationEnabled state removed as it will always be enabled
    const [saturationAmount, setSaturationAmount] = useState(0.1); // Lower amount for saturation effect
    const [saturationOversample, setSaturationOversample] = useState('2x'); // 'none', '2x', '4x' for smoother saturation
    const [saturationWet, setSaturationWet] = useState(1.0); // Wet/Dry mix for saturation

    // Function to create and connect Tone.js nodes for effects processing
    const initAudioNodes = useCallback(async () => {
        if (hasInitializedRef.current) {
            console.log('useSaturationSynth: initAudioNodes: already initialized, skipping init.');
            return;
        }

        console.log(`useSaturationSynth: initAudioNodes called. isAudioGloballyReady: ${isAudioGloballyReady}`);

        if (isAudioGloballyReady && !playerRef.current) {
            console.log('useSaturationSynth: Proceeding with initialization of audio nodes and loading MP3...');
            try {
                const player = new Tone.Player({
                    url: C4_PIANO_MP3_PATH,
                    loop: true,
                    autostart: false,
                    volume: -10 // Adjust volume for piano sample
                });
                await player.load(C4_PIANO_MP3_PATH);
                console.log('useSaturationSynth: Piano sample loaded successfully.');

                // Initialize Saturation effect (using Tone.Distortion)
                const saturation = new Tone.Distortion({
                    distortion: saturationAmount,
                    oversample: saturationOversample,
                    wet: saturationWet,
                });

                // Create Analyser for waveform visualization
                const waveformAnalyser = new Tone.Analyser("waveform", 1024); // 1024 samples for waveform data

                // Saturation is always enabled, so no bypass setting needed based on a state
                saturation.bypass = false;

                // Chain the effects and connect to destination
                // Player -> Saturation -> WaveformAnalyser -> Destination
                player.chain(saturation, waveformAnalyser, Tone.Destination);

                // Store references
                playerRef.current = player;
                saturationRef.current = saturation;
                waveformAnalyserRef.current = waveformAnalyser;

                setIsAudioReady(true);
                hasInitializedRef.current = true;
                console.log('useSaturationSynth: Audio nodes initialized and connected.');

            } catch (error) {
                console.error("useSaturationSynth: Error initializing audio nodes or loading MP3:", error);
                setIsAudioReady(false);
                hasInitializedRef.current = false;
            }
        } else {
            console.log("useSaturationSynth: initAudioNodes skipped. Not globally ready or player already exists.");
        }
    }, [
        isAudioGloballyReady, // Removed isSaturationEnabled from dependencies
        saturationAmount, saturationOversample, saturationWet
    ]);

    // Function to dispose Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log(`useSaturationSynth: disposeAudioNodes called. playerRef.current: ${playerRef.current}`);
        if (playerRef.current) {
            console.log('useSaturationSynth: Disposing audio nodes...');
            if (playerRef.current.state === 'started') {
                playerRef.current.stop();
            }
            playerRef.current.dispose();
            if (saturationRef.current) saturationRef.current.dispose();
            if (waveformAnalyserRef.current) waveformAnalyserRef.current.dispose();

            playerRef.current = null;
            saturationRef.current = null;
            waveformAnalyserRef.current = null;

            setIsPlaying(false);
            setIsAudioReady(false);
            hasInitializedRef.current = false;
            console.log('useSaturationSynth: Audio nodes disposed.');
        }
    }, []);

    // Effect to manage creation/disposal of nodes based on global audio readiness
    useEffect(() => {
        console.log(`useSaturationSynth Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
        if (isAudioGloballyReady) {
            initAudioNodes();
        } else {
            disposeAudioNodes();
        }

        return () => {
            console.log('useSaturationSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes]);

    // Effect to update parameters when state changes
    useEffect(() => {
        if (saturationRef.current && isAudioReady) {
            saturationRef.current.distortion = saturationAmount;
            saturationRef.current.oversample = saturationOversample;
            saturationRef.current.wet.value = saturationWet;
            // Removed bypass update based on isSaturationEnabled
        }
    }, [saturationAmount, saturationOversample, saturationWet, isAudioReady]); // Removed isSaturationEnabled from dependencies

    // Toggles playback
    const togglePlay = useCallback(async () => {
        console.log('togglePlay called. isPlaying:', isPlaying, 'isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady);

        if (!isAudioGloballyReady) {
            console.log('togglePlay: AudioContext not globally ready, attempting to start global audio...');
            await startGlobalAudio();
        }

        if (Tone.context.state === 'running' && !hasInitializedRef.current) {
            console.log('togglePlay: Global audio ready but local nodes not initialized. Attempting to initialize them now...');
            await initAudioNodes();
        }

        if (playerRef.current && isAudioReady) {
            try {
                if (isPlaying) {
                    playerRef.current.stop();
                    setIsPlaying(false);
                    console.log('togglePlay: Audio stopped.');
                } else {
                    playerRef.current.start();
                    setIsPlaying(true);
                    console.log('togglePlay: Audio started.');
                }
            } catch (e) {
                console.error("Error during audio playback toggle:", e);
            }
        } else {
            console.warn('togglePlay: Cannot toggle playback. Audio system not fully ready.');
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
        // Removed isSaturationEnabled from return
        saturationAmount, setSaturationAmount,
        saturationOversample, setSaturationOversample,
        saturationWet, setSaturationWet,
        getWaveformData, // Expose the waveform data getter
    };
};
// --- End useSaturationSynth Hook ---


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
        <div className="grid grid-cols-1 gap-4 w-full opacity-100"> {/* Always active styling */}
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


// --- SaturationExplorerContent Component (Main UI Logic) ---
const SaturationExplorerContent = () => {
    const {
        isPlaying, togglePlay,
        isAudioReady,
        // Removed isSaturationEnabled
        saturationAmount, setSaturationAmount,
        saturationOversample, setSaturationOversample,
        saturationWet, setSaturationWet,
        getWaveformData, // Get waveform data function
    } = useSaturationSynth();

    const visualizerWidth = 700;
    const visualizerHeight = 150;

    const getExplanation = (param) => {
        switch (param) {
            case 'amount': return "The 'warmth' or 'drive' of the saturation. Low levels add harmonic richness, higher levels introduce gentle clipping.";
            case 'oversample': return "Applies oversampling for smoother saturation, reducing harsh digital artifacts.";
            case 'wet': return "The mix between the original (dry) and processed (wet) signal. 0 is dry, 1 is wet.";
            default: return "Adjust parameters to explore the saturation effect!";
        }
    };

    return (
        <>
            {/* SEO Head - Add this at the very beginning */}
            <SEOHead    
                pageId="saturation-explorer" 
                tool={saturationExplorerTool}
                customData={{}}
            />

            <div
                className="min-h-screen flex flex-col items-center p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #f7e0f2 0%, #e0c9f0 50%, #dabbda 100%)', // Light pink/purple gradient
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                {/* Floating Icons Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%23a78bfa' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                        backgroundSize: '200px 200px'
                    }}
                ></div>

                <div className="text-center mb-10 z-10">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <SquareDot size={48} className="text-purple-700" />
                        <h1 className="text-5xl font-extrabold text-purple-900 drop-shadow-lg">Saturation Explorer</h1>
                    </div>
                    {!isAudioReady && (
                        <p className="text-purple-700 text-sm mt-4 animate-pulse">
                            Click "Play Piano Loop" to activate audio and begin.
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
                                    ${!isAudioReady && !isPlaying ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        {isPlaying ? "Stop Piano Loop" : "Play Piano Loop"}
                    </button>

                    {/* Waveform Visualizer */}
                    <div className="w-full flex justify-center mt-8">
                        {isAudioReady && getWaveformData ? (
                            <WaveformVisualizer
                                analyser={getWaveformData}
                                width={700}
                                height={150}
                                scale={1.5} // Adjust scale for 'zoom' effect
                            />
                        ) : (
                            <div className="w-full bg-white/60 rounded-lg shadow-inner border border-purple-200 flex items-center justify-center"
                                style={{ width: 700, height: 150 }}>
                                <p className="text-purple-500">Waveform Visualizer will appear after audio starts.</p>
                            </div>
                        )}
                    </div>

                    {/* Saturation Controls */}
                    <EffectSection
                        title="Saturation"
                        icon={<SquareDot size={28} className="text-purple-600 opacity-70" />}
                        isAudioReady={isAudioReady} // isEnabled and setIsEnabled are no longer passed
                    >
                        <ParameterSlider
                            label="Amount" value={saturationAmount} setter={setSaturationAmount}
                            min="0" max="0.5" step="0.01" // Lower max for saturation
                            explanation={getExplanation('amount')}
                            isAudioReady={isAudioReady}
                        />
                        <div className="flex flex-col items-center w-full">
                            <label className="text-purple-800 font-medium mb-2">Oversample: {saturationOversample}</label>
                            <select
                                value={saturationOversample}
                                onChange={(e) => setSaturationOversample(e.target.value)}
                                className="w-full p-2 rounded-md bg-purple-100 text-purple-800 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                disabled={!isAudioReady}
                            >
                                <option value="none">None</option>
                                <option value="2x">2x</option>
                                <option value="4x">4x</option>
                            </select>
                            <p className="text-purple-700 text-sm mt-1 italic text-center">{getExplanation('oversample')}</p>
                        </div>
                        <ParameterSlider
                            label="Wet/Dry" value={saturationWet} setter={setSaturationWet}
                            min="0" max="1" step="0.01"
                            explanation={getExplanation('wet')}
                            isAudioReady={isAudioReady}
                        />
                    </EffectSection>
                </div>
            </div>
        </>
    );
};

// This is the default export for the standalone Saturation Explorer
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error in SaturationExplorer:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Saturation Explorer. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

const SaturationExplorer = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <SaturationExplorerContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default SaturationExplorer;
