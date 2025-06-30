import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Gauge } from 'lucide-react'; // Using Gauge icon for Limiter
import SEOHead from './SEOHead';


// Define the tool object for SEO structured data
const limiterExplorerTool = {
    id: 'limiter-explorer',
    name: 'Limiter Explorer',
    description: 'Master audio limiting with interactive controls for peak control and loudness.',
    path: '/limiter-explorer',
    categories: [
        'Audio Limiting',
        'Mastering',
        'Dynamic Range',
        'Music Production',
        'Peak Control'
    ]
};

// Define the path to your white noise MP3 file.
const WHITE_NOISE_MP3_PATH = '/white-noise/white-noise.mp3';

// --- INLINED AUDIO CONTEXT ---
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
// --- END INLINED AUDIO CONTEXT ---


// --- useLimiterSynth Hook ---
const useLimiterSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const playerRef = useRef(null);
    const limiterRef = useRef(null); // Reference to Tone.Limiter
    const analyserRef = useRef(null); // Added analyserRef for FFT data
    const hasInitializedRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [threshold, setThreshold] = useState(-6); // in dB, common starting point for limiting
    const [release, setRelease] = useState(0.05); // in seconds, fast release for limiting
    // Removed gainReduction state as it's no longer needed for the meter

    const [isAudioReady, setIsAudioReady] = useState(false);

    // Function to create and connect Tone.js nodes for Limiter processing
    const initAudioNodes = useCallback(async () => {
        // Prevent re-initialization if already done
        if (hasInitializedRef.current) {
            console.log('useLimiterSynth: initAudioNodes: already initialized, skipping init.');
            return;
        }

        console.log(`useLimiterSynth: initAudioNodes called. isAudioGloballyReady: ${isAudioGloballyReady}`);

        // Only proceed if global audio context is ready and player hasn't been created yet
        if (isAudioGloballyReady && !playerRef.current) {
            console.log('useLimiterSynth: Proceeding with initialization of audio nodes and loading MP3...');
            try {
                // Create Tone.Player for the white noise
                const player = new Tone.Player({
                    url: WHITE_NOISE_MP3_PATH, // Corrected path variable
                    loop: true, // Loop for continuous effect
                    autostart: false,
                    volume: -5 // Relatively loud to hit the limiter threshold easily
                });
                await player.load(WHITE_NOISE_MP3_PATH); // Corrected path variable
                console.log('useLimiterSynth: White noise loaded successfully.');

                // Create Tone.Limiter effect
                const limiter = new Tone.Limiter({
                    threshold: threshold,
                    release: release, // Limiter also has a release property
                });

                // Create Tone.Analyser for FFT data (spectrum visualization)
                const analyser = new Tone.Analyser("fft", 2048); // "fft" type for frequency-domain data, 2048 bins for good resolution

                // Connect the player to the limiter, and the limiter to the analyser and destination
                player.connect(limiter);
                limiter.connect(analyser); // Connect limiter output to analyser
                limiter.toDestination(); // Send the limited audio to the output

                // Store references
                playerRef.current = player;
                limiterRef.current = limiter;
                analyserRef.current = analyser; // Store analyser reference

                setIsAudioReady(true);
                hasInitializedRef.current = true; // Mark as initialized after successful setup
                console.log('useLimiterSynth: Audio nodes initialized and connected.');

            } catch (error) {
                console.error("useLimiterSynth: Error initializing audio nodes or loading MP3:", error);
                setIsAudioReady(false);
                hasInitializedRef.current = false;
            }
        } else {
            console.log("useLimiterSynth: initAudioNodes skipped. Not globally ready or player already exists.");
        }
    }, [isAudioGloballyReady]); // Only global readiness as dependency for initial setup

    // Function to dispose Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log(`useLimiterSynth: disposeAudioNodes called. playerRef.current: ${playerRef.current}`);
        if (playerRef.current) {
            console.log('useLimiterSynth: Disposing audio nodes...');
            // Only stop the player if it's currently started to avoid errors
            if (playerRef.current.state === 'started') {
                playerRef.current.stop();
            }
            playerRef.current.dispose(); // Dispose the player
            if (limiterRef.current) limiterRef.current.dispose(); // Dispose the limiter node
            if (analyserRef.current) analyserRef.current.dispose(); // Dispose the analyser node

            // Nullify references
            playerRef.current = null;
            limiterRef.current = null;
            analyserRef.current = null; // Nullify analyser reference

            setIsPlaying(false);
            setIsAudioReady(false);
            hasInitializedRef.current = false; // Reset initialization flag
            console.log('useLimiterSynth: Audio nodes disposed.');
        }
    }, []);

    // Effect to manage creation/disposal of nodes based on global audio readiness
    useEffect(() => {
        console.log(`useLimiterSynth Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
        if (isAudioGloballyReady) {
            initAudioNodes(); // Attempt to initialize if global audio is ready
        } else {
            disposeAudioNodes(); // Dispose if global audio is not ready (e.g., component unmounts or context stops)
        }

        // Cleanup function for when the component unmounts
        return () => {
            console.log('useLimiterSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes]);

    // Effect to update Limiter parameters when their state changes
    useEffect(() => {
        // Robust guard clause: ensure limiterRef.current exists AND its properties are defined.
        if (limiterRef.current && isAudioReady &&
            limiterRef.current.threshold !== undefined && // Threshold is an AudioParam
            limiterRef.current.release !== undefined) {   // Release is an AudioParam
            console.log(`useLimiterSynth: Updating limiter parameters - Threshold: ${threshold}, Release: ${release}`);
            limiterRef.current.threshold.value = threshold;
            limiterRef.current.release.value = release;
        } else {
            console.warn('useLimiterSynth: Skipping limiter parameter update as node or its properties are not fully ready.');
        }
    }, [threshold, release, isAudioReady]);

    // Removed Effect to continuously read gain reduction as the meter is removed

    // Toggles playback of the audio source
    const togglePlay = useCallback(async () => {
        console.log('togglePlay called. isPlaying:', isPlaying, 'isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady);

        // Step 1: Ensure global audio context is running. If not, try to start it.
        if (!isAudioGloballyReady) {
            console.log('togglePlay: AudioContext not globally ready, attempting to start global audio...');
            await startGlobalAudio(); // Await for Tone.start() to complete
        }

        // Step 2: Initialize local audio nodes if they haven't been and global context is now running.
        if (Tone.context.state === 'running' && !hasInitializedRef.current) {
            console.log('togglePlay: Global audio ready but local nodes not initialized. Attempting to initialize them now...');
            await initAudioNodes(); // Await for local node initialization to complete
        }

        // Step 3: Now, with confidence that the audio system is ready, toggle playback.
        if (playerRef.current && hasInitializedRef.current && isAudioReady) {
            try {
                if (isPlaying) {
                    playerRef.current.stop(); // Stop playback
                    setIsPlaying(false);
                    console.log('togglePlay: Audio stopped.');
                } else {
                    playerRef.current.start(); // Start playback
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

    // Function to get real-time frequency data
    const getFrequencyData = useCallback(() => {
        if (analyserRef.current) {
            return analyserRef.current.getValue(); // Returns Float32Array for frequency data
        }
        return null;
    }, []);

    return {
        isPlaying,
        togglePlay,
        threshold,
        setThreshold,
        release,
        setRelease,
        isAudioReady,
        getFrequencyData, // Expose frequency data getter
        // Removed gainReduction from return
    };
};
// --- End useLimiterSynth Hook ---


// --- FrequencyVisualizer Component (Copied from EQ Explorer and adjusted for Limiter context) ---
const FrequencyVisualizer = ({ analyser, width = 800, height = 200 }) => { // Adjusted default height
    const canvasRef = useRef(null);
    const animationFrameId = useRef(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        // Check if analyser is a function
        if (!canvas || typeof analyser !== 'function') {
            animationFrameId.current = requestAnimationFrame(draw);
            return;
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        const minFreq = 10; // Lowest frequency to display
        const maxFreq = 20000; // Highest frequency to display
        const logMin = Math.log10(minFreq);
        const logMax = Math.log10(maxFreq);
        const dB_MIN = -100; // Minimum dB for the Y-axis
        const dB_MAX = 0; // Maximum dB for the Y-axis (unity gain)

        // --- Background Gradient Fill ---
        const backgroundGradient = ctx.createLinearGradient(0, 0, 0, height);
        backgroundGradient.addColorStop(0, '#0f172a'); // slate-900
        backgroundGradient.addColorStop(1, '#1e293b'); // slate-800
        ctx.fillStyle = backgroundGradient;
        ctx.fillRect(0, 0, width, height);

        // --- Vertical Grid (Frequency Lines) ---
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)'; // Light grey, semi-transparent
        ctx.lineWidth = 1;
        // Labels for specific frequencies
        const freqLabels = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
        freqLabels.forEach(freq => {
            // Calculate X position on a logarithmic scale
            const x = width * ((Math.log10(freq) - logMin) / (logMax - logMin));
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // Lighter grey for text
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(freq >= 1000 ? `${freq / 1000}kHz` : `${freq}Hz`, x, height - 5);
        });

        // --- Horizontal Grid (dB Lines) ---
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'; // Slightly darker transparent grey
        const dbLabels = [dB_MIN, -60, -40, -20, dB_MAX]; // Specific dB levels to label
        dbLabels.forEach(db => {
            // Calculate Y position
            const y = height - ((db - dB_MIN) / (dB_MAX - dB_MIN)) * height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`${db}dB`, 4, y - 3);
        });

        // --- FFT Curve (Neon Green to Cyan Glow) ---
        const fftGradient = ctx.createLinearGradient(0, 0, width, 0);
        fftGradient.addColorStop(0, '#4ade80'); // green-400
        fftGradient.addColorStop(1, '#22d3ee'); // cyan-400
        ctx.strokeStyle = fftGradient;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#22d3ee'; // Add a glow effect
        ctx.shadowBlur = 12; // Blur radius for the glow
        ctx.beginPath();

        const dataArray = analyser(); // Get real-time frequency data
        // If dataArray is null/empty (e.g., audio not playing yet), skip drawing FFT
        if (!dataArray || dataArray.length === 0) {
            animationFrameId.current = requestAnimationFrame(draw);
            return;
        }

        const nyquist = Tone.context.sampleRate / 2; // Nyquist frequency is half the sample rate
        const binWidth = nyquist / dataArray.length; // Frequency range per FFT bin

        let started = false;
        for (let i = 0; i < dataArray.length; i++) {
            const freq = i * binWidth;
            if (freq < minFreq) continue; // Only draw frequencies within the visible range
            const x = width * ((Math.log10(freq) - logMin) / (logMax - logMin));
            const dB = Math.max(dB_MIN, Math.min(dB_MAX, dataArray[i])); // Clamp dB
            const y = height - ((dB - dB_MIN) / (dB_MAX - dB_MIN)) * height;
            started ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
            started = true;
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow for next draw cycle to avoid accumulation

        animationFrameId.current = requestAnimationFrame(draw);
    }, [analyser, width, height]); // Dependencies ensure draw function is stable when props are stable

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = width;
            canvas.height = height;
        }
        // Start the animation loop when the component mounts or `draw` changes
        animationFrameId.current = requestAnimationFrame(draw);

        // Cleanup function: cancel the animation frame when the component unmounts
        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [draw]); // Rerun effect only if 'draw' function itself changes (which happens when its dependencies change)

    return (
        <div className="w-full max-w-5xl mx-auto p-4 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 shadow-2xl border border-slate-700">
            <canvas
                ref={canvasRef}
                className="w-full h-full rounded-lg"
                style={{ display: 'block', borderRadius: '0.75rem' }}
            />
        </div>
    );
};
// --- End FrequencyVisualizer Component ---

// Removed LimiterGainReductionMeter Component entirely as it's no longer needed


// --- LimiterExplorerContent Component (Main App Component) ---
const LimiterExplorerContent = () => {
    const {
        isPlaying, togglePlay,
        threshold, setThreshold,
        release, setRelease,
        isAudioReady,
        getFrequencyData,
        // Removed gainReduction from destructuring
    } = useLimiterSynth();

    const visualizerWidth = 700;
    const visualizerHeight = 200; // Adjusted height for visualizer
    // Removed meterWidth and meterHeight

    const getExplanation = (param) => {
        switch (param) {
            case 'threshold':
                return "The maximum output level (in dB) that the audio signal will reach. This also acts as the 'ceiling' of the limiter, ensuring peaks do not exceed this level.";
            case 'release':
                return "The time (in seconds) it takes for the limiter to stop reducing gain after the signal drops below the ceiling. A very short release can cause distortion; a longer one can sound more natural.";
            default:
                return "Adjust parameters to explore how a limiter shapes the audio dynamics!";
        }
    };

    return (
        <>
            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
                pageId="limiter-explorer" 
                tool={limiterExplorerTool}
                customData={{}}
            />

            <div
                className="min-h-screen flex flex-col items-center p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #f7d4e5 0%, #e0b9d4 50%, #c99bc9 100%)', // Soft pink/purple gradient
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                {/* Floating Icons Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='25' cy='25' r='3' fill='%239e5b8d'/%3E%3Ccircle cx='75' cy='25' r='3' fill='%239e5b8d'/%3E%3Ccircle cx='50' cy='50' r='3' fill='%239e5b8d'/%3E%3Ccircle cx='25' cy='75' r='3' fill='%239e5b8d'/%3E%3Ccircle cx='75' cy='75' r='3' fill='%239e5b8d'/%3E%3C/svg%3E\")",
                        backgroundSize: '200px 200px'
                    }}
                ></div>

                <div className="text-center mb-10 z-10">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <Gauge size={48} className="text-purple-700" />
                        <h1 className="text-5xl font-extrabold text-purple-900 drop-shadow-lg">Limiter Explorer</h1>
                    </div>
                    {!isAudioReady && (
                        <p className="text-purple-700 text-sm mt-4 animate-pulse">
                            Click "Play White Noise" to activate audio and begin.
                        </p>
                    )}
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col items-center space-y-8 z-10 border border-purple-200">

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
                        {isPlaying ? "Stop White Noise" : "Play White Noise"}
                    </button>

                    {/* Visualizers Container */}
                    {/* Adjusted layout to only contain the Frequency Visualizer */}
                    <div className="flex justify-center w-full mt-8">
                        {isAudioReady && getFrequencyData ? (
                            <FrequencyVisualizer
                                analyser={getFrequencyData}
                                width={visualizerWidth}
                                height={visualizerHeight}
                            />
                        ) : (
                            <div className="w-full bg-white/60 rounded-lg shadow-inner border border-purple-200 flex items-center justify-center"
                                style={{ width: visualizerWidth, height: visualizerHeight }}>
                                <p className="text-purple-500">Spectrum Visualizer will appear after audio starts.</p>
                            </div>
                        )}
                    </div>


                    {/* Limiter Parameter Sliders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-8">
                        {/* Ceiling / Threshold Slider */}
                        <div className="flex flex-col items-center">
                            <label className="text-purple-800 font-medium mb-2">Ceiling / Threshold: {threshold.toFixed(1)} dB</label>
                            <input
                                type="range"
                                min="-40" // Limiter thresholds are typically higher than compressor thresholds
                                max="0"
                                step="1"
                                value={threshold}
                                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                className="w-full accent-purple-600 h-2 rounded-lg appearance-none cursor-pointer bg-purple-100"
                                disabled={!isAudioReady}
                            />
                            <p className="text-purple-700 text-sm mt-1 italic">{getExplanation('threshold')}</p>
                        </div>

                        {/* Release Slider */}
                        <div className="flex flex-col items-center">
                            <label className="text-purple-800 font-medium mb-2">Release: {release.toFixed(3)} s</label>
                            <input
                                type="range"
                                min="0.001" // Very fast release possible
                                max="0.5"   // Up to half a second
                                step="0.001"
                                value={release}
                                onChange={(e) => setRelease(parseFloat(e.target.value))}
                                className="w-full accent-purple-600 h-2 rounded-lg appearance-none cursor-pointer bg-purple-100"
                                disabled={!isAudioReady}
                            />
                            <p className="text-purple-700 text-sm mt-1 italic">{getExplanation('release')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// This is the default export for the standalone Limiter Explorer
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error in LimiterExplorer:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Limiter Explorer. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

const LimiterExplorer = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <LimiterExplorerContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default LimiterExplorer;
