import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, User, Zap } from 'lucide-react'; // Icons for play/pause, user (humanizer), and reset

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


// --- useHumanizerSynth Hook ---
const useHumanizerSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const clickPlayerRef = useRef(null); // Player for the click sound
    const metronomeEventIdRef = useRef(null); // Stores the ID of the scheduled Tone.Transport event
    const hasInitializedRef = useRef(false); // Tracks if Tone.js nodes have been created

    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false); // True when context is running AND samples loaded
    const [isAudioLoading, setIsAudioLoading] = useState(false); // Tracks if audio samples are currently loading

    // Default values
    const DEFAULT_BPM = 120;
    const DEFAULT_TIMING_AMOUNT = 0.0; // Max random timing deviation in milliseconds (e.g., 50ms)
    const DEFAULT_VELOCITY_AMOUNT = 0.0; // Max random velocity deviation (0.0 to 1.0, where 1.0 is full range)
    const DEFAULT_SUBDIVISION = '8n'; // '8n' for 8th note clicks

    // Humanizer Parameters
    const [bpm, setBpm] = useState(DEFAULT_BPM);
    const [timingAmount, setTimingAmount] = useState(DEFAULT_TIMING_AMOUNT);
    const [velocityAmount, setVelocityAmount] = useState(DEFAULT_VELOCITY_AMOUNT);
    const [subdivision, setSubdivision] = useState(DEFAULT_SUBDIVISION);

    const [activeBeatIndex, setActiveBeatIndex] = useState(-1); // For visual feedback

    // Function to initialize Tone.js nodes (Player and scheduling)
    const initAudioNodes = useCallback(async () => {
        if (hasInitializedRef.current) {
            console.log('useHumanizerSynth: initAudioNodes: already initialized, skipping init.');
            return;
        }

        if (!isAudioGloballyReady) {
            console.log('useHumanizerSynth: AudioContext not globally ready, cannot initialize nodes.');
            return;
        }

        setIsAudioLoading(true); // Set loading state
        console.log('useHumanizerSynth: Proceeding with initialization of audio nodes and loading click sound...');

        try {
            // Dispose existing player if any
            if (clickPlayerRef.current) clickPlayerRef.current.dispose();
            Tone.Transport.stop(); // Stop transport to ensure clean re-initialization
            Tone.Transport.cancel(); // Clear all scheduled events

            // Create Tone.Player for the click sound
            const player = new Tone.Player({
                url: CLICK_SOUND_MP3_PATH,
                autostart: false,
                volume: -10 // Adjust volume for the click
            }).toDestination(); // Direct to output

            await player.loaded; // Await the 'loaded' promise for the player
            console.log('useHumanizerSynth: Click sound loaded successfully.');

            // Store player reference
            clickPlayerRef.current = player;

            // Initialize Tone.Transport properties
            Tone.Transport.bpm.value = bpm;
            Tone.Transport.loop = true;
            Tone.Transport.loopEnd = '1m'; // Loop over 1 measure by default for visual consistency

            // Schedule the repeating metronome event
            // The callback function now includes the humanization logic
            const eventId = Tone.Transport.scheduleRepeat((time) => {
                if (player.loaded) {
                    // Calculate random timing offset
                    // timingAmount is in milliseconds, convert to seconds for Tone.js
                    const randomTimingOffset = (Math.random() * 2 - 1) * (timingAmount / 1000); // -timingAmount to +timingAmount
                    const scheduledTime = time + randomTimingOffset;

                    // Calculate random velocity
                    const baseVelocity = 1; // Full velocity for clicks
                    const randomVelocity = baseVelocity - (Math.random() * velocityAmount); // 1.0 down to (1.0 - velocityAmount)
                    const clampedVelocity = Math.max(0.1, Math.min(1.0, randomVelocity)); // Ensure minimum velocity

                    player.start(scheduledTime, 0, undefined, clampedVelocity);

                    // Update active beat index for visualization
                    // We can use Tone.Transport.getBarsBeatsSixteenths() for current position
                    // but for a loop, `iterator` in a Tone.Loop or simple counter from Transport.scheduleRepeat
                    // is simpler for activeBeatIndex.
                    // Let's use a simple counter for activeBeatIndex if we are playing fixed subdivisions
                    const currentBeat = Math.floor(Tone.Time(Tone.Transport.position).toSeconds() / Tone.Time(subdivision).toSeconds());
                    Tone.Draw.schedule(() => {
                        // This logic needs to align with the actual `subdivision` and `loopEnd` for the visualizer.
                        // For a simple single pulse visualizer, we just need to trigger it.
                        // If we want a sequence of visual steps (like 1 to 8), we need to track it based on subdivision.
                        // Let's make it simpler for now and just set a generic 'active' state for the visual element.
                        // Or, use a counter based on the subdivision, wrapped for `patternSteps`.
                        const subInLoopEnd = Tone.Time(Tone.Transport.loopEnd).toTicks() / Tone.Time(subdivision).toTicks();
                        setActiveBeatIndex(prev => (prev + 1) % subInLoopEnd);

                    }, scheduledTime); // Schedule visual update at the actual playback time
                }
            }, subdivision); // Repeat interval based on selected subdivision

            metronomeEventIdRef.current = eventId; // Store the event ID to cancel it later

            setIsAudioReady(true); // Set ready only after all async operations
            hasInitializedRef.current = true; // Mark as initialized
            setIsAudioLoading(false); // Reset loading state
            console.log('useHumanizerSynth: Audio nodes initialized and connected.');

        } catch (error) {
            console.error("useHumanizerSynth: Error initializing audio nodes or loading MP3:", error);
            setIsAudioReady(false);
            hasInitializedRef.current = false;
            setIsAudioLoading(false); // Reset loading state on error
            // Ensure any partially created nodes are disposed on error
            if (clickPlayerRef.current) { clickPlayerRef.current.dispose(); clickPlayerRef.current = null; }
            Tone.Transport.cancel(metronomeEventIdRef.current);
            metronomeEventIdRef.current = null;
        }
    }, [isAudioGloballyReady, bpm, timingAmount, velocityAmount, subdivision]); // Dependencies for initial setup using defaults


    // Function to dispose all Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log('useHumanizerSynth: disposeAudioNodes called.');
        Tone.Transport.stop(); // Stop the transport first
        Tone.Transport.cancel(metronomeEventIdRef.current); // Clear specific scheduled event
        metronomeEventIdRef.current = null; // Clear ref

        if (clickPlayerRef.current) {
            clickPlayerRef.current.stop();
            clickPlayerRef.current.dispose();
            clickPlayerRef.current = null;
        }

        setIsPlaying(false);
        setIsAudioReady(false);
        hasInitializedRef.current = false;
        setIsAudioLoading(false);
        setActiveBeatIndex(-1); // Reset active step
        console.log('useHumanizerSynth: Audio nodes disposed.');
    }, []);

    // Effect for global audio context readiness and initialization/disposal
    useEffect(() => {
        console.log(`useHumanizerSynth Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
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
            console.log('useHumanizerSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes, isAudioLoading]);


    // Effect to update Tone.Transport properties when their state changes
    useEffect(() => {
        if (isAudioReady) {
            Tone.Transport.bpm.rampTo(bpm, 0.1); // Smooth transition for BPM

            // If subdivision changes, we need to re-schedule the loop
            if (metronomeEventIdRef.current) {
                Tone.Transport.cancel(metronomeEventIdRef.current); // Cancel old event
                const newEventId = Tone.Transport.scheduleRepeat((time) => {
                    if (clickPlayerRef.current && clickPlayerRef.current.loaded) {
                        const randomTimingOffset = (Math.random() * 2 - 1) * (timingAmount / 1000);
                        const scheduledTime = time + randomTimingOffset;

                        const baseVelocity = 1;
                        const randomVelocity = baseVelocity - (Math.random() * velocityAmount);
                        const clampedVelocity = Math.max(0.1, Math.min(1.0, randomVelocity));

                        clickPlayerRef.current.start(scheduledTime, 0, undefined, clampedVelocity);

                        const subInLoopEnd = Tone.Time(Tone.Transport.loopEnd).toTicks() / Tone.Time(subdivision).toTicks();
                        Tone.Draw.schedule(() => {
                            setActiveBeatIndex(prev => (prev + 1) % subInLoopEnd);
                        }, scheduledTime);
                    }
                }, subdivision);
                metronomeEventIdRef.current = newEventId; // Store new event ID
            }
        }
    }, [bpm, timingAmount, velocityAmount, subdivision, isAudioReady]);


    // Toggles global playback (Tone.Transport)
    const togglePlay = useCallback(async () => {
        console.log('togglePlay called. isPlaying:', isPlaying, 'isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady, 'isAudioLoading:', isAudioLoading);

        if (!isAudioGloballyReady) {
            console.log('togglePlay: AudioContext not globally ready, attempting to start global audio...');
            await startGlobalAudio();
            await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for state propagation
        }

        // Re-check global audio readiness and initialization status after potential async operations
        // Ensure local audio nodes are initialized before trying to play
        if (Tone.context.state === 'running' && !hasInitializedRef.current && !isAudioLoading) {
            console.log('togglePlay: Global audio ready but local nodes not initialized. Attempting to initialize them now...');
            await initAudioNodes();
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Only proceed if audio is fully ready (both global context and local nodes)
        if (isAudioReady) {
            try {
                if (isPlaying) {
                    Tone.Transport.pause(); // Pause transport
                    setIsPlaying(false);
                    setActiveBeatIndex(-1); // Reset active step visualization
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
        setTimingAmount(DEFAULT_TIMING_AMOUNT);
        setVelocityAmount(DEFAULT_VELOCITY_AMOUNT);
        setSubdivision(DEFAULT_SUBDIVISION);
        setActiveBeatIndex(-1);

        // 4. Re-initialize audio nodes with these default parameters
        if (isAudioGloballyReady) {
            await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for state updates
            await initAudioNodes(); // Explicitly re-initialize after setting defaults
        }

        console.log('useHumanizerSynth: All parameters reset to default.');
    }, [
        isPlaying, disposeAudioNodes, initAudioNodes, isAudioGloballyReady,
        DEFAULT_BPM, DEFAULT_TIMING_AMOUNT, DEFAULT_VELOCITY_AMOUNT, DEFAULT_SUBDIVISION,
        setBpm, setTimingAmount, setVelocityAmount, setSubdivision
    ]);


    // Return all necessary states and setters
    return {
        isPlaying, togglePlay,
        isAudioReady, isAudioLoading, // Expose loading status
        bpm, setBpm,
        timingAmount, setTimingAmount,
        velocityAmount, setVelocityAmount,
        subdivision, setSubdivision,
        activeBeatIndex, // Just expose for reading
        resetParameters, // Expose the reset function
    };
};
// --- End useHumanizerSynth Hook ---


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
            className="w-full accent-purple-600 h-2 rounded-lg appearance-none cursor-pointer bg-purple-100"
            disabled={!isAudioReady}
        />
        <p className="text-gray-700 text-sm mt-1 italic text-center">{explanation}</p>
    </div>
);
// --- End ParameterSlider Component ---


// --- HumanizerPanelContent (Main UI Logic) ---
const HumanizerPanelContent = () => {
    const {
        isPlaying, togglePlay,
        isAudioReady, isAudioLoading,
        bpm, setBpm,
        timingAmount, setTimingAmount,
        velocityAmount, setVelocityAmount,
        subdivision, setSubdivision,
        activeBeatIndex,
        resetParameters,
    } = useHumanizerSynth();

    const getExplanation = (param) => {
        switch (param) {
            case 'bpm': return "Controls the overall tempo of the metronome.";
            case 'timingAmount': return "Max random timing deviation (ms). Higher = more 'loose' timing.";
            case 'velocityAmount': return "Volume randomness (0 = none, 1 = full range).";
            case 'subdivision': return "Rhythmic interval for clicks.";
            default: return "Add human-like imperfections to your metronome!";
        }
    };

    const subdivisionOptions = [
        { value: '4n', label: 'Quarter (4n)' },
        { value: '8n', label: 'Eighth (8n)' },
        { value: '16n', label: 'Sixteenth (16n)' },
    ];

    const visualSteps = 8; // Number of visual indicators

    return (
        <div
            className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #f0e0ff 0%, #e6d3ff 50%, #dbcbff 100%)',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Floating Icons Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%238a2be2' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            <div className="text-center mb-6 md:mb-10 z-10 w-full px-2">
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                    <User size={36} className="text-purple-700 md:mb-0 mb-2" />
                    <h1 className="text-3xl md:text-5xl font-extrabold text-purple-900 drop-shadow-lg">
                        Humanizer Panel
                    </h1>
                </div>
                {!isAudioReady && !isAudioLoading && (
                    <p className="text-purple-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                        Click "Play Metronome" to begin.
                    </p>
                )}
                {isAudioLoading && (
                    <p className="text-purple-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                        Loading click sound...
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col items-center space-y-4 md:space-y-8 z-10 border border-purple-200 mx-2">

                {/* Play/Pause and Reset Buttons */}
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mb-4 md:mb-6 w-full">
                    <button
                        type="button"
                        onClick={togglePlay}
                        className={`px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 w-full
                                    ${isPlaying
                                    ? 'bg-purple-700 hover:bg-purple-800 text-white'
                                    : 'bg-purple-500 hover:bg-purple-600 text-white'}
                                    ${(!isAudioReady && !isPlaying) || isAudioLoading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        disabled={isAudioLoading}
                    >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                        {isPlaying ? "Stop" : "Play Metronome"}
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
                        <Zap size={18} /> Reset All
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

                    {/* Timing Amount Slider */}
                    <ParameterSlider
                        label="Timing Random" value={timingAmount} setter={setTimingAmount}
                        min="0" max="100" step="1" unit=" ms"
                        explanation={getExplanation('timingAmount')}
                        isAudioReady={isAudioReady}
                    />

                    {/* Velocity Amount Slider */}
                    <ParameterSlider
                        label="Vol Random" value={velocityAmount} setter={setVelocityAmount}
                        min="0.0" max="1.0" step="0.01"
                        explanation={getExplanation('velocityAmount')}
                        isAudioReady={isAudioReady}
                    />

                    {/* Subdivision Select */}
                    <div className="flex flex-col items-center">
                        <label className="text-gray-800 font-medium mb-1 md:mb-2 text-sm md:text-base">
                            Subdivision: {subdivisionOptions.find(opt => opt.value === subdivision)?.label}
                        </label>
                        <select
                            value={subdivision}
                            onChange={(e) => setSubdivision(e.target.value)}
                            className="w-full p-2 text-sm md:text-base rounded-md bg-purple-100 text-gray-800 border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={!isAudioReady}
                        >
                            {subdivisionOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <p className="text-gray-700 text-xs md:text-sm mt-1 italic text-center">{getExplanation('subdivision')}</p>
                    </div>
                </div>

                {/* Visual Beat Indicator */}
                <div className="w-full flex justify-center mt-6 md:mt-8 px-2">
                    <div className="grid gap-1 md:gap-2 p-2 md:p-4 bg-gray-100 rounded-lg shadow-inner overflow-x-auto"
                        style={{
                            gridTemplateColumns: `repeat(${visualSteps}, minmax(0, 1fr))`,
                            width: '100%',
                            maxWidth: '100%',
                            justifyItems: 'center'
                        }}>
                        {Array.from({ length: visualSteps }).map((_, index) => (
                            <div
                                key={index}
                                className={`w-6 h-6 md:w-8 md:h-8 rounded-full transition-all duration-100 flex items-center justify-center text-xs md:text-sm font-bold
                                    ${activeBeatIndex === index
                                        ? 'bg-purple-600 text-white transform scale-110 shadow-md'
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
        console.error("Uncaught error in HumanizerPanel:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Humanizer Panel. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export wrapping the main content with AudioContextProvider and ErrorBoundary
const HumanizerPanel = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <HumanizerPanelContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default HumanizerPanel;
