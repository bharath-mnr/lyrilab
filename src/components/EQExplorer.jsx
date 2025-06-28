import React, { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo } from 'react';
import * as Tone from 'tone';
import { Play, Pause, SlidersHorizontal } from 'lucide-react'; // Using SlidersHorizontal as a general EQ icon

// Define the path to your white noise MP3 file for EQ testing
const WHITE_NOISE_MP3_PATH = '/white-noise/white-noise.mp3';

// --- INLINED AUDIO CONTEXT ---
// This context will manage the global Tone.js audio state.
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


// --- useEQSynth Hook ---
const EQ_FILTER_TYPES = [
    'lowpass', 'highpass', 'bandpass', 'notch', 'peaking', 'lowshelf', 'highshelf'
];

const useEQSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const playerRef = useRef(null);
    const filterRef = useRef(null);
    const analyserRef = useRef(null);
    const hasInitializedRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [filterType, setFilterType] = useState('lowpass');
    const [frequency, setFrequency] = useState(5000);
    const [Q, setQ] = useState(1);
    const [gain, setGain] = useState(0);

    const [isAudioReady, setIsAudioReady] = useState(false);

    const initAudioNodes = useCallback(async () => {
        if (hasInitializedRef.current) {
            console.log('useEQSynth: initAudioNodes: already initialized, skipping init.');
            return;
        }

        console.log(`useEQSynth: initAudioNodes called. playerRef.current: ${playerRef.current}, isAudioGloballyReady: ${isAudioGloballyReady}`);

        if (isAudioGloballyReady && !playerRef.current) {
            console.log('useEQSynth: Proceeding with initialization of audio nodes and loading MP3...');
            try {
                const player = new Tone.Player({
                    url: WHITE_NOISE_MP3_PATH,
                    loop: true,
                    autostart: false
                });
                player.volume.value = -15; // Reduce initial volume of white noise

                await player.load(WHITE_NOISE_MP3_PATH);
                console.log('useEQSynth: MP3 loaded successfully.');

                // Initialize filter with current parameters
                const filter = new Tone.Filter(frequency, filterType);
                filter.Q.value = Q;
                filter.rolloff = -24; // Common rolloff value
                filter.gain.value = gain;

                // Analyser for FFT data
                const analyser = new Tone.Analyser("fft", 2048); // Increased FFT size for better resolution

                // Connect the audio chain
                player.connect(filter);
                filter.connect(analyser);
                filter.toDestination();

                // Store refs
                playerRef.current = player;
                filterRef.current = filter;
                analyserRef.current = analyser;

                setIsAudioReady(true);
                hasInitializedRef.current = true; // Mark as initialized
                console.log('useEQSynth: Audio nodes initialized and connected. isAudioReady set to true.');

            } catch (error) {
                console.error("useEQSynth: Error initializing EQ audio nodes or loading MP3:", error);
                setIsAudioReady(false);
                hasInitializedRef.current = false; // Reset if initialization fails
            }
        } else {
            console.log("useEQSynth: initAudioNodes skipped. Not globally ready or player already exists (or already initialized).");
        }
    }, [isAudioGloballyReady]); // Dependencies for initial setup are intentionally limited

    const disposeAudioNodes = useCallback(() => {
        console.log(`useEQSynth: disposeAudioNodes called. playerRef.current: ${playerRef.current}`);
        if (playerRef.current) {
            console.log('useEQSynth: Disposing audio nodes...');
            playerRef.current.stop();
            playerRef.current.dispose();
            if (filterRef.current) filterRef.current.dispose();
            if (analyserRef.current) analyserRef.current.dispose();

            playerRef.current = null;
            filterRef.current = null;
            analyserRef.current = null;
            setIsPlaying(false);
            setIsAudioReady(false);
            hasInitializedRef.current = false; // Reset initialization flag
            console.log('useEQSynth: Audio nodes disposed. isAudioReady set to false.');
        }
    }, []);

    // Effect to manage creation/disposal of nodes based on global audio readiness
    useEffect(() => {
        console.log(`useEQSynth Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}, hasInitializedRef.current = ${hasInitializedRef.current}`);
        if (isAudioGloballyReady) {
            initAudioNodes();
        } else {
            disposeAudioNodes();
        }

        return () => {
            console.log('useEQSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes]);

    // Effect to update filter parameters when their state changes (without re-creating nodes)
    useEffect(() => {
        if (filterRef.current && isAudioReady) {
            console.log(`useEQSynth: Updating filter parameters - Type: ${filterType}, Freq: ${frequency}, Q: ${Q}, Gain: ${gain}`);
            filterRef.current.type = filterType;
            filterRef.current.frequency.value = frequency;
            filterRef.current.Q.value = Q;
            filterRef.current.gain.value = gain;
        }
    }, [filterType, frequency, Q, gain, isAudioReady]);

    // Toggles playback of white noise
    const togglePlay = useCallback(async () => {
        console.log('togglePlay called. isPlaying:', isPlaying, 'isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady, 'playerRef.current:', playerRef.current);

        // Step 1: Ensure global AudioContext is running
        if (!isAudioGloballyReady) {
            console.log('togglePlay: AudioContext not globally ready, attempting to start global audio...');
            await startGlobalAudio();
        }

        // Give a very brief moment for state updates to propagate
        await new Promise(resolve => setTimeout(resolve, 10));

        // Step 2: If global audio is ready but local nodes aren't yet initialized, do it now.
        if (Tone.context.state === 'running' && !hasInitializedRef.current) {
            console.log('togglePlay: Global audio ready but local nodes not initialized. Attempting to initialize them now...');
            await initAudioNodes();
        }

        // Give another brief moment for state updates to propagate
        await new Promise(resolve => setTimeout(resolve, 10));

        // Step 3: Now, after ensuring global and local audio systems are ready, toggle playback.
        if (playerRef.current && isAudioReady) {
            if (isPlaying) {
                playerRef.current.stop();
                setIsPlaying(false);
                console.log('togglePlay: White noise stopped.');
            } else {
                playerRef.current.start();
                setIsPlaying(true);
                console.log('togglePlay: White noise started.');
            }
        } else {
            console.warn('togglePlay: Cannot toggle playback. Audio system not fully ready. Player ref:', playerRef.current, 'AudioReady state:', isAudioReady, 'Global Audio Ready:', isAudioGloballyReady);
            // Fallback for edge cases where init might be delayed
            if (isAudioGloballyReady && !hasInitializedRef.current) {
                console.log('togglePlay: Fallback initAudioNodes call.');
                await initAudioNodes();
                await new Promise(resolve => setTimeout(resolve, 10));
                if (playerRef.current && isAudioReady) {
                    playerRef.current.start();
                    setIsPlaying(true);
                    console.log('togglePlay: White noise started after fallback init.');
                }
            }
        }
    }, [isPlaying, isAudioGloballyReady, isAudioReady, startGlobalAudio, initAudioNodes, playerRef, hasInitializedRef]);

    // Function to get frequency data for visualization
    const getFrequencyData = useCallback(() => {
        if (analyserRef.current) {
            return analyserRef.current.getValue(); // returns Float32Array
        }
        return null;
    }, []);

    // Function to get filter curve data
    const getFilterCurve = useCallback(() => {
        if (filterRef.current) {
            const FREQ_COUNT = 1024; // Number of points to sample the frequency response
            const frequencies = new Float32Array(FREQ_COUNT);
            const minFreq = 20; // Human hearing lower limit
            const maxFreq = 20000; // Human hearing upper limit

            // Populate frequencies array on a logarithmic scale
            for (let i = 0; i < FREQ_COUNT; i++) {
                const percent = i / (FREQ_COUNT - 1);
                frequencies[i] = minFreq * Math.pow(maxFreq / minFreq, percent);
            }

            const mag = new Float32Array(FREQ_COUNT); // Magnitude response (gain at each frequency)
            const phase = new Float32Array(FREQ_COUNT); // Phase response (ignored for this visualizer)

            // Get the frequency response from the Tone.Filter node
            filterRef.current.getFrequencyResponse(frequencies, mag, phase);

            // Convert magnitude to decibels for visualization
            const dbCurve = new Float32Array(FREQ_COUNT);
            for (let i = 0; i < FREQ_COUNT; i++) {
                dbCurve[i] = 20 * Math.log10(mag[i]);
            }
            return dbCurve;
        }
        return null;
    }, [filterRef]); // Dependency on filterRef ensures the ref is available

    return {
        isPlaying,
        togglePlay,
        filterType,
        setFilterType,
        frequency,
        setFrequency,
        Q,
        setQ,
        gain,
        setGain,
        isAudioReady,
        getFrequencyData,
        getFilterCurve,
        EQ_FILTER_TYPES,
    };
};
// --- End useEQSynth Hook ---


// --- FrequencyVisualizer Component ---
const FrequencyVisualizer = ({ analyser, filterCurve, width = 800, height = 300 }) => {
    const canvasRef = useRef(null);
    const animationFrameId = useRef(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        // Check if analyser is a function and if filterCurve exists
        if (!canvas || typeof analyser !== 'function' || !filterCurve) {
            // If not ready, request next frame to keep checking
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

        // --- EQ Curve (Gradient Blue-Purple) ---
        const eqGradient = ctx.createLinearGradient(0, 0, width, 0);
        eqGradient.addColorStop(0, '#60a5fa'); // blue-400
        eqGradient.addColorStop(1, '#c084fc'); // purple-400
        ctx.strokeStyle = eqGradient;
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < filterCurve.length; i++) {
            // Re-calculate frequency for accurate X-axis plotting (logarithmic)
            const freq = minFreq * Math.pow(maxFreq / minFreq, i / (filterCurve.length - 1));
            const x = width * ((Math.log10(freq) - logMin) / (logMax - logMin));
            // Clamp dB value to prevent drawing outside canvas bounds
            const dB = Math.max(dB_MIN, Math.min(dB_MAX, filterCurve[i]));
            const y = height - ((dB - dB_MIN) / (dB_MAX - dB_MIN)) * height;
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();

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
    }, [analyser, filterCurve, width, height]); // Dependencies ensure draw function is stable when props are stable

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


// --- EQExplorer Component (Main Component) ---
const EQExplorerContent = () => {
    const {
        isPlaying, togglePlay,
        filterType, setFilterType,
        frequency, setFrequency,
        Q, setQ,
        gain, setGain,
        isAudioReady,
        getFrequencyData,
        getFilterCurve,
        EQ_FILTER_TYPES,
    } = useEQSynth();

    const visualizerWidth = 700;
    const visualizerHeight = 250;

    // Memoize analyser and filter curve data for performance
    const analyserNode = useMemo(() => isAudioReady ? getFrequencyData : null, [isAudioReady, getFrequencyData]);
    const filterCurveData = useMemo(() => {
        if (!isAudioReady) return null;
        return getFilterCurve();
    }, [isAudioReady, getFilterCurve, filterType, frequency, Q, gain]); // Dependencies for filter curve recalculation

    // Determine which sliders to show based on filter type
    const showQ = useMemo(() => ['lowpass', 'highpass', 'bandpass', 'notch', 'peaking'].includes(filterType), [filterType]);
    const showGain = useMemo(() => ['peaking', 'lowshelf', 'highshelf'].includes(filterType), [filterType]);

    const getExplanation = (type) => {
        switch (type) {
            case 'lowpass':
                return "Allows frequencies below the cutoff to pass through, while attenuating frequencies above it.";
            case 'highpass':
                return "Allows frequencies above the cutoff to pass through, while attenuating frequencies below it.";
            case 'bandpass':
                return "Allows a specific range of frequencies to pass, attenuating frequencies above and below this band.";
            case 'notch':
                return "Attenuates a very narrow band of frequencies, creating a 'notch' or dip.";
            case 'peaking':
                return "Boosts or cuts a specific frequency range around the center frequency, with Q controlling the width.";
            case 'lowshelf':
                return "Boosts or cuts all frequencies below the cutoff frequency uniformly.";
            case 'highshelf':
                return "Boosts or cuts all frequencies above the cutoff frequency uniformly.";
            default:
                return "Select an EQ type to learn more.";
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #e5d4ff 0%, #d6bfff 50%, #c8aaff 100%)', // Purple gradient
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Floating Icons Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='25' cy='25' r='3' fill='%237d5fff'/%3E%3Ccircle cx='75' cy='25' r='3' fill='%237d5fff'/%3E%3Ccircle cx='50' cy='50' r='3' fill='%237d5fff'/%3E%3Ccircle cx='25' cy='75' r='3' fill='%237d5fff'/%3E%3Ccircle cx='75' cy='75' r='3' fill='%237d5fff'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            <div className="text-center mb-10 z-10">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <SlidersHorizontal size={48} className="text-indigo-600" /> {/* Using SlidersHorizontal icon */}
                    <h1 className="text-5xl font-extrabold text-indigo-800 drop-shadow-lg">EQ Explorer</h1>
                </div>
                {!isAudioReady && (
                    <p className="text-purple-700 text-sm mt-4 animate-pulse">
                        Click "Play White Noise" to activate audio and begin.
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col items-center space-y-8 z-10 border border-indigo-200">

                {/* Play/Pause Button */}
                <button
                    type="button"
                    onClick={togglePlay}
                    className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all duration-300
                                ${isPlaying
                                ? 'bg-indigo-700 hover:bg-indigo-800 text-white'
                                : 'bg-indigo-500 hover:bg-indigo-600 text-white'}
                                ${!isAudioReady && !isPlaying ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    {isPlaying ? "Stop White Noise" : "Play White Noise"}
                </button>

                {/* EQ Type Selector */}
                <div className="w-full">
                    <label htmlFor="filter-type" className="block text-indigo-800 text-lg font-medium mb-2">
                        EQ Type:
                    </label>
                    <select
                        id="filter-type"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full p-3 rounded-lg bg-white text-indigo-900 border border-indigo-300 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        disabled={!isAudioReady}
                    >
                        {EQ_FILTER_TYPES.map(type => (
                            <option key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)} {/* Capitalize first letter */}
                            </option>
                        ))}
                    </select>
                    <p className="text-indigo-700 text-sm mt-2 italic">{getExplanation(filterType)}</p>
                </div>

                {/* Frequency Visualizer */}
                <div className="w-full flex justify-center">
                    {isAudioReady && analyserNode && filterCurveData ? (
                        <FrequencyVisualizer
                            analyser={analyserNode}
                            filterCurve={filterCurveData}
                            width={visualizerWidth}
                            height={visualizerHeight}
                        />
                    ) : (
                        <div className="w-full bg-white/60 rounded-lg shadow-inner border border-indigo-200 flex items-center justify-center"
                            style={{ width: visualizerWidth, height: visualizerHeight }}>
                            <p className="text-indigo-500">Visualizer will appear after audio starts.</p>
                        </div>
                    )}
                </div>

                {/* EQ Parameter Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8">
                    {/* Frequency Slider */}
                    <div className="flex flex-col items-center">
                        <label className="text-indigo-800 font-medium mb-2">Frequency: {Math.round(frequency)} Hz</label>
                        <input
                            type="range"
                            min="20"
                            max="20000"
                            step="any" // Allows fine-grained control
                            value={frequency}
                            onChange={(e) => setFrequency(parseFloat(e.target.value))}
                            className="w-full accent-indigo-600 h-2 rounded-lg appearance-none cursor-pointer bg-indigo-100"
                            disabled={!isAudioReady}
                            // Optional: Inline style for progress bar effect for better UX
                            style={{
                                backgroundSize: `${(frequency - 20) / (20000 - 20) * 100}% 100%`
                            }}
                        />
                    </div>

                    {/* Q Factor Slider (conditionally rendered) */}
                    {showQ && (
                        <div className="flex flex-col items-center">
                            <label className="text-indigo-800 font-medium mb-2">Q Factor: {Q.toFixed(1)}</label>
                            <input
                                type="range"
                                min="0.1"
                                max="10"
                                step="0.1"
                                value={Q}
                                onChange={(e) => setQ(parseFloat(e.target.value))}
                                className="w-full accent-indigo-600 h-2 rounded-lg appearance-none cursor-pointer bg-indigo-100"
                                disabled={!isAudioReady}
                            />
                        </div>
                    )}

                    {/* Gain Slider (conditionally rendered) */}
                    {showGain && (
                        <div className="flex flex-col items-center">
                            <label className="text-indigo-800 font-medium mb-2">Gain: {gain.toFixed(1)} dB</label>
                            <input
                                type="range"
                                min="-20"
                                max="20"
                                step="0.5"
                                value={gain}
                                onChange={(e) => setGain(parseFloat(e.target.value))}
                                className="w-full accent-indigo-600 h-2 rounded-lg appearance-none cursor-pointer bg-indigo-100"
                                disabled={!isAudioReady}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// This is the default export for the standalone EQ Explorer
const EQExplorer = () => {
    return (
        <AudioContextProvider>
            <EQExplorerContent />
        </AudioContextProvider>
    );
}

export default EQExplorer;
