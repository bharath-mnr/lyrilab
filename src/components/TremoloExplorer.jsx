import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Waves, Volume2 } from 'lucide-react';

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

// --- useTremoloSynth Hook ---
const useTremoloSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const playerRef = useRef(null);
    const tremoloRef = useRef(null);
    const waveformAnalyserRef = useRef(null);
    const hasInitializedRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false);

    // Tremolo parameters
    const [tremoloFreq, setTremoloFreq] = useState(5); // Hz
    const [tremoloDepth, setTremoloDepth] = useState(0.75); // 0-1
    const [tremoloWet, setTremoloWet] = useState(1.0); // 0-1 (usually 1.0 for tremolo)

    // Function to create and connect Tone.js nodes for effects processing
    // FIXED: Removed tremolo parameters from dependency array
    const initAudioNodes = useCallback(async () => {
        if (hasInitializedRef.current) {
            console.log('useTremoloSynth: initAudioNodes: already initialized, skipping init.');
            return;
        }

        console.log(`useTremoloSynth: initAudioNodes called. isAudioGloballyReady: ${isAudioGloballyReady}`);

        if (isAudioGloballyReady && !playerRef.current) {
            console.log('useTremoloSynth: Proceeding with initialization of audio nodes and loading MP3...');
            try {
                const player = new Tone.Player({
                    url: C4_PIANO_MP3_PATH,
                    loop: true,
                    autostart: false,
                    volume: -10 // Adjust volume for piano sample
                });
                await player.load(C4_PIANO_MP3_PATH);
                console.log('useTremoloSynth: Piano sample loaded successfully.');

                // Initialize Tremolo effect with current parameter values
                const tremolo = new Tone.Tremolo({
                    frequency: tremoloFreq,
                    depth: tremoloDepth,
                    type: "sine",
                    spread: 180,
                    wet: tremoloWet,
                });
                // Start tremolo LFO
                tremolo.start();

                // Create Analyser for waveform visualization
                const waveformAnalyser = new Tone.Analyser("waveform", 1024);

                // Tremolo is always enabled for this explorer
                tremolo.bypass = false;

                // Chain the effects and connect to destination
                // Player -> Tremolo -> WaveformAnalyser -> Destination
                player.chain(tremolo, waveformAnalyser, Tone.Destination);

                // Store references
                playerRef.current = player;
                tremoloRef.current = tremolo;
                waveformAnalyserRef.current = waveformAnalyser;

                setIsAudioReady(true);
                hasInitializedRef.current = true;
                console.log('useTremoloSynth: Audio nodes initialized and connected.');

            } catch (error) {
                console.error("useTremoloSynth: Error initializing audio nodes or loading MP3:", error);
                setIsAudioReady(false);
                hasInitializedRef.current = false;
            }
        } else {
            console.log("useTremoloSynth: initAudioNodes skipped. Not globally ready or player already exists.");
        }
    }, [isAudioGloballyReady]); // FIXED: Only depends on isAudioGloballyReady

    // Function to dispose Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log(`useTremoloSynth: disposeAudioNodes called. playerRef.current: ${playerRef.current}`);
        if (playerRef.current) {
            console.log('useTremoloSynth: Disposing audio nodes...');
            if (playerRef.current.state === 'started') {
                playerRef.current.stop();
            }
            playerRef.current.dispose();
            if (tremoloRef.current) tremoloRef.current.dispose();
            if (waveformAnalyserRef.current) waveformAnalyserRef.current.dispose();

            playerRef.current = null;
            tremoloRef.current = null;
            waveformAnalyserRef.current = null;

            setIsPlaying(false);
            setIsAudioReady(false);
            hasInitializedRef.current = false;
            console.log('useTremoloSynth: Audio nodes disposed.');
        }
    }, []);

    // Effect to manage creation/disposal of nodes based on global audio readiness
    useEffect(() => {
        console.log(`useTremoloSynth Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
        if (isAudioGloballyReady) {
            initAudioNodes();
        } else {
            disposeAudioNodes();
        }

        return () => {
            console.log('useTremoloSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes]);

    // FIXED: Separate effect for updating parameters with smooth transitions
    useEffect(() => {
        if (tremoloRef.current && isAudioReady) {
            // Use rampTo for smooth parameter transitions
            const rampTime = 0.1; // 100ms ramp time for smooth transitions
            
            tremoloRef.current.frequency.rampTo(tremoloFreq, rampTime);
            tremoloRef.current.depth.rampTo(tremoloDepth, rampTime);
            tremoloRef.current.wet.rampTo(tremoloWet, rampTime);
            
            console.log(`Updated tremolo parameters: freq=${tremoloFreq}, depth=${tremoloDepth}, wet=${tremoloWet}`);
        }
    }, [tremoloFreq, tremoloDepth, tremoloWet, isAudioReady]);

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
        tremoloFreq, setTremoloFreq,
        tremoloDepth, setTremoloDepth,
        tremoloWet, setTremoloWet,
        getWaveformData,
    };
};

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
        ctx.lineJoin = 'round';

        ctx.beginPath();
        const sliceWidth = width * 1.0 / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] * scale;
            const y = (v + 1) * height / 2;

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

// --- EffectSection Component ---
const EffectSection = ({ title, icon, isAudioReady, children }) => (
    <div className="bg-white/70 rounded-xl p-6 shadow-md flex flex-col items-center space-y-4 border border-indigo-200">
        <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-2xl font-bold text-indigo-800">{title}</h2>
        </div>
        <div className={`grid grid-cols-1 gap-4 w-full opacity-100 ${!isAudioReady ? 'opacity-40 pointer-events-none' : ''}`}>
            {children}
        </div>
    </div>
);

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

// --- TremoloExplorerContent Component ---
const TremoloExplorerContent = () => {
    const {
        isPlaying, togglePlay,
        isAudioReady,
        tremoloFreq, setTremoloFreq,
        tremoloDepth, setTremoloDepth,
        tremoloWet, setTremoloWet,
        getWaveformData,
    } = useTremoloSynth();

    const visualizerWidth = 700;
    const visualizerHeight = 150;

    const getExplanation = (param) => {
        switch (param) {
            case 'frequency': return "The rate at which the tremolo effect modulates the amplitude, in Hz.";
            case 'depth': return "The amount of amplitude modulation applied. Higher values create a more pronounced 'volume wobble'.";
            case 'wet': return "The mix between the original (dry) and processed (wet) signal. 0 is dry, 1 is wet.";
            default: return "Adjust parameters to explore the tremolo effect!";
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #e6f7e0 0%, #c9f0c9 50%, #b3e4b3 100%)',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Floating Icons Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%234b5563' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            <div className="text-center mb-10 z-10">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <Volume2 size={48} className="text-green-700" />
                    <h1 className="text-5xl font-extrabold text-green-900 drop-shadow-lg">Tremolo Explorer</h1>
                </div>
                {!isAudioReady && (
                    <p className="text-green-700 text-sm mt-4 animate-pulse">
                        Click "Play Piano Loop" to activate audio and begin.
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg w-full max-w-3xl flex flex-col items-center space-y-8 z-10 border border-green-200">

                {/* Play/Pause Button */}
                <button
                    type="button"
                    onClick={togglePlay}
                    className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all duration-300
                                ${isPlaying
                                ? 'bg-green-700 hover:bg-green-800 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'}
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
                            width={visualizerWidth}
                            height={visualizerHeight}
                            scale={1.5}
                        />
                    ) : (
                        <div className="w-full bg-white/60 rounded-lg shadow-inner border border-green-200 flex items-center justify-center"
                            style={{ width: visualizerWidth, height: visualizerHeight }}>
                            <p className="text-green-500">Waveform Visualizer will appear after audio starts.</p>
                        </div>
                    )}
                </div>

                {/* Tremolo Controls */}
                <EffectSection
                    title="Tremolo"
                    icon={<Volume2 size={28} className="text-green-600" />}
                    isAudioReady={isAudioReady}
                >
                    <ParameterSlider
                        label="Frequency" value={tremoloFreq} setter={setTremoloFreq}
                        min="0.1" max="20" step="0.1" unit=" Hz"
                        explanation={getExplanation('frequency')}
                        isAudioReady={isAudioReady}
                    />
                    <ParameterSlider
                        label="Depth" value={tremoloDepth} setter={setTremoloDepth}
                        min="0" max="1" step="0.01"
                        explanation={getExplanation('depth')}
                        isAudioReady={isAudioReady}
                    />
                    <ParameterSlider
                        label="Wet/Dry" value={tremoloWet} setter={setTremoloWet}
                        min="0" max="1" step="0.01"
                        explanation={getExplanation('wet')}
                        isAudioReady={isAudioReady}
                    />
                </EffectSection>
            </div>
        </div>
    );
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error in TremoloExplorer:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Tremolo Explorer. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

const TremoloExplorer = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <TremoloExplorerContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default TremoloExplorer;