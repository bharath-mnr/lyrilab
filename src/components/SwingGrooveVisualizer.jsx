import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Music, Volume2, Shuffle, Zap } from 'lucide-react'; // Icons for play/pause, music, volume, shuffle, and Zap

// Define the path to a simple click sound. This is a placeholder.
// You'll need to provide an actual short audio file (e.g., a click or percussive sound)
// at this path for sound playback.
const CLICK_SOUND_MP3_PATH = '/click_samples/click.wav';

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


// --- useSwingGrooveSynth Hook ---
const useSwingGrooveSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const clickPlayerRef = useRef(null); // Player for the click sound
    const metronomeLoopRef = useRef(null); // Tone.Loop instance for the metronome
    const hasInitializedRef = useRef(false); // Tracks if Tone.js nodes have been created

    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false); // True when context is running AND samples loaded
    const [isAudioLoading, setIsAudioLoading] = useState(false); // Tracks if audio samples are currently loading

    // Default values
    const DEFAULT_BPM = 120;
    const DEFAULT_SWING_AMOUNT = 0.0; // 0.0 for straight, 1.0 for maximum swing
    const DEFAULT_SWING_SUBDIVISION = '8n'; // '8n' for 8th note swing, '16n' for 16th note swing
    const DEFAULT_PATTERN_STEPS = 8; // Number of steps in our visual grid (e.g., 8 for a measure of 8th notes)

    // Swing/Groove Parameters (States that trigger UI updates)
    const [bpm, setBpm] = useState(DEFAULT_BPM);
    const [swingAmount, setSwingAmount] = useState(DEFAULT_SWING_AMOUNT);
    const [swingSubdivision, setSwingSubdivision] = useState(DEFAULT_SWING_SUBDIVISION);
    const [patternSteps, setPatternSteps] = useState(DEFAULT_PATTERN_STEPS); // For visual grid length

    const [activeStep, setActiveStep] = useState(-1); // For visual feedback

    // Function to initialize Tone.js nodes (Player, Loop)
    // This should only be called once when the global audio context becomes ready.
    const initAudioNodes = useCallback(async () => {
        if (hasInitializedRef.current) {
            console.log('useSwingGrooveSynth: initAudioNodes: already initialized, skipping init.');
            return;
        }

        if (!isAudioGloballyReady) {
            console.log('useSwingGrooveSynth: AudioContext not globally ready, cannot initialize nodes.');
            return;
        }

        setIsAudioLoading(true); // Set loading state
        console.log('useSwingGrooveSynth: Proceeding with initialization of audio nodes and loading click sound...');

        try {
            // Dispose existing nodes to prevent multiple instances on re-initialization
            if (clickPlayerRef.current) clickPlayerRef.current.dispose();
            if (metronomeLoopRef.current) metronomeLoopRef.current.dispose();
            Tone.Transport.stop(); // Stop transport to ensure clean re-initialization
            Tone.Transport.cancel(); // Clear all scheduled events

            // Create Tone.Player for the click sound
            const player = new Tone.Player({
                url: CLICK_SOUND_MP3_PATH,
                autostart: false,
                volume: -10 // Adjust volume for the click
            }).toDestination(); // Direct to output

            await player.loaded; // Await the 'loaded' promise for the player
            console.log('useSwingGrooveSynth: Click sound loaded successfully.');

            // Store player reference
            clickPlayerRef.current = player;

            // Initialize Tone.Loop for the metronome clicks
            // Initial interval is set, but will be updated by the useEffect for parameters.
            const loop = new Tone.Loop((time) => {
                if (clickPlayerRef.current && clickPlayerRef.current.loaded) {
                    clickPlayerRef.current.start(time);
                }
                // Update active step for visualizer. Use Tone.Draw to schedule UI updates.
                Tone.Draw.schedule(() => {
                    // loop.iterator gives the current iteration count (0, 1, 2, ...)
                    setActiveStep(loop.iterator % patternSteps); // Ensure activeStep loops within patternSteps
                }, time);
            }, swingSubdivision); // Initial subdivision, will be updated by useEffect

            loop.start(0); // Start the loop at the beginning of the transport (won't play until Transport starts)
            metronomeLoopRef.current = loop;

            // Initialize Tone.Transport properties.
            // These will be further updated by the parameter useEffect below.
            Tone.Transport.loop = true;
            Tone.Transport.bpm.value = bpm;
            Tone.Transport.swing = swingAmount;
            Tone.Transport.swingSubdivision = swingSubdivision;
            // Set loopEnd initially to a safe string value. Dynamic update in separate useEffect.
            Tone.Transport.loopEnd = '1m';


            setIsAudioReady(true); // Set ready only after all async operations
            hasInitializedRef.current = true; // Mark as initialized
            setIsAudioLoading(false); // Reset loading state
            console.log('useSwingGrooveSynth: Audio nodes initialized and connected.');

        } catch (error) {
            console.error("useSwingGrooveSynth: Error initializing audio nodes or loading MP3:", error);
            setIsAudioReady(false);
            hasInitializedRef.current = false;
            setIsAudioLoading(false); // Reset loading state on error
            // Ensure any partially created nodes are disposed on error
            if (clickPlayerRef.current) { clickPlayerRef.current.dispose(); clickPlayerRef.current = null; }
            if (metronomeLoopRef.current) { metronomeLoopRef.current.dispose(); metronomeLoopRef.current = null; }
        }
    }, [isAudioGloballyReady, DEFAULT_BPM, DEFAULT_SWING_AMOUNT, DEFAULT_SWING_SUBDIVISION, DEFAULT_PATTERN_STEPS]);


    // Function to dispose all Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log('useSwingGrooveSynth: disposeAudioNodes called.');
        Tone.Transport.stop(); // Stop the transport first
        Tone.Transport.cancel(); // Clear all scheduled events on transport

        if (clickPlayerRef.current) {
            clickPlayerRef.current.stop();
            clickPlayerRef.current.dispose();
            clickPlayerRef.current = null;
        }
        if (metronomeLoopRef.current) {
            metronomeLoopRef.current.dispose();
            metronomeLoopRef.current = null;
        }

        setIsPlaying(false);
        setIsAudioReady(false);
        hasInitializedRef.current = false;
        setIsAudioLoading(false);
        setActiveStep(-1); // Reset active step
        console.log('useSwingGrooveSynth: Audio nodes disposed.');
    }, []);

    // Effect for global audio context readiness and initialization/disposal
    useEffect(() => {
        console.log(`useSwingGrooveSynth Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
        if (isAudioGloballyReady) {
            // Attempt initialization only if not already initialized and not currently loading
            if (!hasInitializedRef.current && !isAudioLoading) {
                initAudioNodes();
            }
        } else {
            // Dispose nodes if audio context is suspended/closed
            disposeAudioNodes();
        }

        return () => {
            console.log('useSwingGrooveSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes, isAudioLoading]);


    // Effect to update Tone.Transport and Tone.Loop properties when their state changes
    useEffect(() => {
        if (isAudioReady) {
            // These properties can be updated directly without re-initializing the whole graph
            Tone.Transport.bpm.rampTo(bpm, 0.1); // Smooth transition for BPM
            Tone.Transport.swing = swingAmount;
            Tone.Transport.swingSubdivision = swingSubdivision; // Update Transport's swing subdivision

            if (metronomeLoopRef.current) {
                // Update loop interval. This should ideally re-schedule internal events correctly.
                metronomeLoopRef.current.interval = swingSubdivision;
            }

            // Dynamically update loopEnd of the Transport here based on current values
            // Tone.Transport.loopEnd can take a Tone.Time value directly, no need for .toSeconds()
            try {
                Tone.Transport.loopEnd = Tone.Time(patternSteps, swingSubdivision);
                console.log(`Updated Tone.Transport.loopEnd to: ${Tone.Transport.loopEnd}`);
            } catch (error) {
                console.error("Error updating Tone.Transport.loopEnd dynamically:", error);
                // Fallback to a safe default if dynamic calculation fails
                Tone.Transport.loopEnd = '1m';
            }
        }
    }, [bpm, swingAmount, swingSubdivision, patternSteps, isAudioReady]);


    // Toggles global playback (Tone.Transport)
    const togglePlay = useCallback(async () => {
        console.log('togglePlay called. isPlaying:', isPlaying, 'isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady, 'isAudioLoading:', isAudioLoading);

        if (!isAudioGloballyReady) {
            console.log('togglePlay: AudioContext not globally ready, attempting to start global audio...');
            await startGlobalAudio();
            // Give a small delay to allow global context state to propagate
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Re-check global audio readiness and initialization status after potential async operations
        // Ensure local audio nodes are initialized before trying to play
        if (Tone.context.state === 'running' && !hasInitializedRef.current && !isAudioLoading) {
            console.log('togglePlay: Global audio ready but local nodes not initialized. Attempting to initialize them now...');
            await initAudioNodes();
            // Give a small delay to allow local node state to propagate
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Only proceed if audio is fully ready (both global context and local nodes)
        if (isAudioReady) {
            try {
                if (isPlaying) {
                    Tone.Transport.pause(); // Pause transport
                    setIsPlaying(false);
                    setActiveStep(-1); // Reset active step visualization
                    console.log('togglePlay: Transport paused.');
                } else {
                    Tone.Transport.start(); // Start transport
                    setIsPlaying(true);
                    console.log('togglePlay: Transport started.');
                }
            } catch (e) {
                console.error("Error during audio playback toggle:", e);
                setIsPlaying(false);
            }
        } else {
            console.warn('togglePlay: Cannot toggle playback. Audio system not fully ready or still loading.');
            // This might happen if initAudioNodes failed or is still loading.
            // No explicit fallback to init here, as it's handled by the useEffect above.
        }
    }, [isPlaying, isAudioGloballyReady, isAudioReady, isAudioLoading, startGlobalAudio, initAudioNodes]);

    // Function to reset all parameters to their default values and re-initialize audio
    const resetParameters = useCallback(async () => {
        // 1. Stop playback if active
        if (isPlaying) {
            Tone.Transport.pause();
            setIsPlaying(false);
        }

        // 2. Dispose current audio nodes for a clean slate
        disposeAudioNodes(); // This will also set hasInitializedRef.current = false and isAudioReady = false

        // 3. Reset states to default values
        setBpm(DEFAULT_BPM);
        setSwingAmount(DEFAULT_SWING_AMOUNT);
        setSwingSubdivision(DEFAULT_SWING_SUBDIVISION);
        setPatternSteps(DEFAULT_PATTERN_STEPS);
        setActiveStep(-1);

        // 4. Re-initialize audio nodes with these default parameters
        // The useEffect that watches isAudioGloballyReady will call initAudioNodes when hasInitializedRef.current is false.
        // We'll give it a moment to propagate, then ensure init if needed.
        if (isAudioGloballyReady) {
            // Await a small delay to ensure state updates propagate before re-initializing
            await new Promise(resolve => setTimeout(resolve, 50));
            await initAudioNodes(); // Explicitly re-initialize after setting defaults
        }

        console.log('useSwingGrooveSynth: All parameters reset to default.');
    }, [
        isPlaying, disposeAudioNodes, initAudioNodes, isAudioGloballyReady,
        DEFAULT_BPM, DEFAULT_SWING_AMOUNT, DEFAULT_SWING_SUBDIVISION, DEFAULT_PATTERN_STEPS,
        setBpm, setSwingAmount, setSwingSubdivision, setPatternSteps // Include setters in dependency array
    ]);


    // Return all necessary states and setters
    return {
        isPlaying, togglePlay,
        isAudioReady, isAudioLoading, // Expose loading status
        bpm, setBpm,
        swingAmount, setSwingAmount,
        swingSubdivision, setSwingSubdivision,
        patternSteps, setPatternSteps,
        activeStep, // Just expose for reading
        resetParameters, // Expose the reset function
    };
};
// --- End useSwingGrooveSynth Hook ---


// --- ParameterSlider Component ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '', isAudioReady }) => (
    <div className="flex flex-col items-center w-full">
        <label className="text-gray-800 font-medium mb-2">{label}: {typeof value === 'number' ? value.toFixed(value < 1 && value !== 0 ? 3 : 1) : value}{unit}</label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setter(parseFloat(e.target.value))}
            className="w-full accent-green-600 h-2 rounded-lg appearance-none cursor-pointer bg-green-100"
            disabled={!isAudioReady}
        />
        <p className="text-gray-700 text-sm mt-1 italic text-center">{explanation}</p>
    </div>
);
// --- End ParameterSlider Component ---


// --- SwingGrooveVisualizerContent (Main UI Logic) ---
const SwingGrooveVisualizerContent = () => {
    const {
        isPlaying, togglePlay,
        isAudioReady, isAudioLoading,
        bpm, setBpm,
        swingAmount, setSwingAmount,
        swingSubdivision, setSwingSubdivision,
        patternSteps, setPatternSteps,
        activeStep,
        resetParameters,
    } = useSwingGrooveSynth();

    const getExplanation = (param) => {
        switch (param) {
            case 'bpm': return "Controls the overall tempo.";
            case 'swingAmount': return "Swing intensity (0 = straight, 1 = max swing).";
            case 'swingSubdivision': return "Note subdivision to apply swing.";
            case 'patternSteps': return "Number of visual steps in one loop.";
            default: return "Explore how swing changes the rhythm feel!";
        }
    };

    const subdivisionOptions = [
        { value: '4n', label: 'Quarter (4n)' },
        { value: '8n', label: 'Eighth (8n)' },
        { value: '16n', label: 'Sixteenth (16n)' },
        { value: '32n', label: '32nd (32n)' },
    ];

    return (
        <div
            className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #e0ffe0 0%, #ccffcc 50%, #b3ffb3 100%)',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Floating Icons Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%234caf50' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            <div className="text-center mb-6 md:mb-10 z-10 w-full px-2">
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                    <Shuffle size={36} className="text-green-700 md:mb-0 mb-2" />
                    <h1 className="text-3xl md:text-5xl font-extrabold text-green-900 drop-shadow-lg">
                        Swing Visualizer
                    </h1>
                </div>
                {!isAudioReady && !isAudioLoading && (
                    <p className="text-green-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                        Click "Play" to begin.
                    </p>
                )}
                {isAudioLoading && (
                    <p className="text-green-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                        Loading sound...
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col items-center space-y-4 md:space-y-8 z-10 border border-green-200 mx-2">

                {/* Play/Pause and Reset Buttons */}
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mb-4 md:mb-6 w-full">
                    <button
                        type="button"
                        onClick={togglePlay}
                        className={`px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 w-full
                                    ${isPlaying
                                    ? 'bg-green-700 hover:bg-green-800 text-white'
                                    : 'bg-green-500 hover:bg-green-600 text-white'}
                                    ${(!isAudioReady && !isPlaying) || isAudioLoading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        disabled={isAudioLoading}
                    >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                        {isPlaying ? "Stop" : "Play"}
                    </button>

                    <button
                        type="button"
                        onClick={resetParameters}
                        className={`px-4 py-3 md:px-6 md:py-4 rounded-full font-bold text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 w-full md:w-auto
                                bg-gray-500 hover:bg-gray-600 text-white
                                ${isAudioLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        disabled={isAudioLoading}
                    >
                        <Zap size={18} /> Reset
                    </button>
                </div>

                {/* Parameter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full mt-4 md:mt-8">
                    {/* BPM Slider */}
                    <ParameterSlider
                        label="BPM" value={bpm} setter={setBpm}
                        min="60" max="240" step="1" unit=" BPM"
                        explanation={getExplanation('bpm')}
                        isAudioReady={isAudioReady}
                    />

                    {/* Swing Amount Slider */}
                    <ParameterSlider
                        label="Swing" value={swingAmount} setter={setSwingAmount}
                        min="0.0" max="1.0" step="0.01"
                        explanation={getExplanation('swingAmount')}
                        isAudioReady={isAudioReady}
                    />

                    {/* Swing Subdivision Select */}
                    <div className="flex flex-col items-center">
                        <label className="text-gray-800 font-medium mb-1 md:mb-2 text-sm md:text-base">
                            Subdivision: {subdivisionOptions.find(opt => opt.value === swingSubdivision)?.label}
                        </label>
                        <select
                            value={swingSubdivision}
                            onChange={(e) => setSwingSubdivision(e.target.value)}
                            className="w-full p-2 text-sm md:text-base rounded-md bg-green-100 text-gray-800 border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                            disabled={!isAudioReady}
                        >
                            {subdivisionOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <p className="text-gray-700 text-xs md:text-sm mt-1 italic text-center">{getExplanation('swingSubdivision')}</p>
                    </div>

                    {/* Pattern Steps Slider */}
                    <ParameterSlider
                        label="Steps" value={patternSteps} setter={setPatternSteps}
                        min="2" max="16" step="1" unit=""
                        explanation={getExplanation('patternSteps')}
                        isAudioReady={isAudioReady}
                    />
                </div>

                {/* Visual Metronome Grid */}
                <div className="w-full flex justify-center mt-6 md:mt-8 px-2">
                    <div className="grid gap-1 md:gap-2 p-2 md:p-4 bg-gray-100 rounded-lg shadow-inner overflow-x-auto"
                        style={{
                            gridTemplateColumns: `repeat(${Math.min(patternSteps, 16)}, minmax(0, 1fr))`,
                            width: '100%',
                            maxWidth: '100%',
                            justifyItems: 'center'
                        }}>
                        {Array.from({ length: patternSteps }).map((_, index) => (
                            <div
                                key={index}
                                className={`w-6 h-6 md:w-8 md:h-8 rounded-full transition-all duration-100 flex items-center justify-center text-xs md:text-sm font-bold
                                    ${activeStep === index
                                        ? 'bg-green-600 text-white transform scale-110 shadow-md'
                                        : 'bg-gray-300 text-gray-800'}
                                    ${!isAudioReady ? 'opacity-50' : ''}
                                `}
                            >
                                {index + 1}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

// Error Boundary for robust application
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error in SwingGrooveVisualizer:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Swing / Groove Visualizer. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export wrapping the main content with AudioContextProvider and ErrorBoundary
const SwingGrooveVisualizer = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <SwingGrooveVisualizerContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default SwingGrooveVisualizer;
