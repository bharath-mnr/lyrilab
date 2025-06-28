import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Clock } from 'lucide-react'; // Using Clock icon for Delay

// Define the path to your C4 piano sample.
const C4_PIANO_MP3_PATH = '/piano_samples/C4.mp3';

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


// --- useDelaySynth Hook ---
const useDelaySynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const playerRef = useRef(null);
    const delayRef = useRef(null); // Reference to Tone.FeedbackDelay
    const hasInitializedRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [delayTime, setDelayTime] = useState(0.25); // in seconds, default quarter note at 120bpm
    const [feedback, setFeedback] = useState(0.5); // 0 to 1
    const [wet, setWet] = useState(0.5); // 0 to 1 (wet/dry mix)

    const [isAudioReady, setIsAudioReady] = useState(false);

    // Function to create and connect Tone.js nodes for Delay processing
    const initAudioNodes = useCallback(async () => {
        // Prevent re-initialization if already done
        if (hasInitializedRef.current) {
            console.log('useDelaySynth: initAudioNodes: already initialized, skipping init.');
            return;
        }

        console.log(`useDelaySynth: initAudioNodes called. isAudioGloballyReady: ${isAudioGloballyReady}`);

        // Only proceed if global audio context is ready and player hasn't been created yet
        if (isAudioGloballyReady && !playerRef.current) {
            console.log('useDelaySynth: Proceeding with initialization of audio nodes and loading MP3...');
            try {
                // Create Tone.Player for the audio source (now C4 piano)
                const player = new Tone.Player({
                    url: C4_PIANO_MP3_PATH, // Changed to C4 piano sample
                    loop: true, // Loop the sample for continuous delay effect
                    autostart: false,
                    volume: -5 // Increased volume for piano sample from -15 to -5 dB
                });
                await player.load(C4_PIANO_MP3_PATH); // Ensure the new path is used for loading
                console.log('useDelaySynth: C4 piano sample loaded successfully.');

                // Create Tone.FeedbackDelay
                const delay = new Tone.FeedbackDelay({
                    delayTime: delayTime,
                    feedback: feedback,
                    wet: wet,
                }).toDestination(); // Connect directly to output

                // Connect the player to the delay effect
                player.connect(delay);

                // Store references
                playerRef.current = player;
                delayRef.current = delay;

                setIsAudioReady(true);
                hasInitializedRef.current = true; // Mark as initialized after successful setup
                console.log('useDelaySynth: Audio nodes initialized and connected.');

            } catch (error) {
                console.error("useDelaySynth: Error initializing audio nodes or loading MP3:", error);
                setIsAudioReady(false);
                hasInitializedRef.current = false;
            }
        } else {
            console.log("useDelaySynth: initAudioNodes skipped. Not globally ready or player already exists.");
        }
    }, [isAudioGloballyReady]); // Only global readiness as dependency for initial setup

    // Function to dispose Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log(`useDelaySynth: disposeAudioNodes called. playerRef.current: ${playerRef.current}`);
        if (playerRef.current) {
            console.log('useDelaySynth: Disposing audio nodes...');
            // Only stop the player if it's currently started to avoid errors
            if (playerRef.current.state === 'started') {
                playerRef.current.stop();
            }
            playerRef.current.dispose(); // Dispose the player
            if (delayRef.current) delayRef.current.dispose(); // Dispose the delay node

            // Nullify references
            playerRef.current = null;
            delayRef.current = null;

            setIsPlaying(false);
            setIsAudioReady(false);
            hasInitializedRef.current = false; // Reset initialization flag
            console.log('useDelaySynth: Audio nodes disposed.');
        }
    }, []);

    // Effect to manage creation/disposal of nodes based on global audio readiness
    // This effect ensures audio nodes are created when context is ready and disposed when not.
    useEffect(() => {
        console.log(`useDelaySynth Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
        if (isAudioGloballyReady) {
            initAudioNodes(); // Attempt to initialize if global audio is ready
        } else {
            disposeAudioNodes(); // Dispose if global audio is not ready (e.g., component unmounts or context stops)
        }

        // Cleanup function for when the component unmounts
        return () => {
            console.log('useDelaySynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes]);

    // Effect to update Delay parameters when their state changes
    // This runs whenever delayTime, feedback, or wet state variables change,
    // ensuring the Tone.js delay node's parameters are updated in real-time.
    useEffect(() => {
        // Add a more robust guard clause: ensure delayRef.current exists AND that its AudioParam properties are also defined.
        // This explicitly prevents "Cannot read properties of null (reading 'value')" if the node is in an unexpected state or disposed.
        if (delayRef.current && isAudioReady &&
            delayRef.current.delayTime &&
            delayRef.current.feedback &&
            delayRef.current.wet) {
            console.log(`useDelaySynth: Updating delay parameters - Time: ${delayTime}, Feedback: ${feedback}, Wet: ${wet}`);
            delayRef.current.delayTime.value = delayTime; // delayTime is an AudioParam
            delayRef.current.feedback.value = feedback;   // feedback is an AudioParam
            delayRef.current.wet.value = wet;             // wet is an AudioParam
        } else {
            console.warn('useDelaySynth: Skipping delay parameter update as delay node or its AudioParams are not fully ready.');
        }
    }, [delayTime, feedback, wet, isAudioReady]);

    // Toggles playback of the audio source
    const togglePlay = useCallback(async () => {
        console.log('togglePlay called. isPlaying:', isPlaying, 'isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady);

        // Step 1: Ensure global audio context is running. If not, try to start it.
        if (!isAudioGloballyReady) {
            console.log('togglePlay: AudioContext not globally ready, attempting to start global audio...');
            await startGlobalAudio(); // Await for Tone.start() to complete
        }

        // Step 2: Initialize local audio nodes if they haven't been and global context is now running.
        // This is a crucial check if the user clicks "Play" before the `useEffect` has fully run.
        if (Tone.context.state === 'running' && !hasInitializedRef.current) {
            console.log('togglePlay: Global audio ready but local nodes not initialized. Attempting to initialize them now...');
            await initAudioNodes(); // Await for local node initialization to complete
        }

        // Step 3: Now, with confidence that the audio system is ready, toggle playback.
        if (playerRef.current && hasInitializedRef.current && isAudioReady) {
            try { // Added try-catch for robustness during playback start/stop
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
                // Optionally, add a user-facing message here
            }
        } else {
            // Log a warning if playback cannot be toggled (e.g., if initialization failed)
            console.warn('togglePlay: Cannot toggle playback. Audio system not fully ready.');
        }
    }, [isPlaying, isAudioGloballyReady, isAudioReady, startGlobalAudio, initAudioNodes]);

    return {
        isPlaying,
        togglePlay,
        delayTime,
        setDelayTime,
        feedback,
        setFeedback,
        wet,
        setWet,
        isAudioReady,
    };
};
// --- End useDelaySynth Hook ---


// --- DelayExplorer Component (Main App Component) ---
const DelayExplorerContent = () => {
    const {
        isPlaying, togglePlay,
        delayTime, setDelayTime,
        feedback, setFeedback,
        wet, setWet,
        isAudioReady,
    } = useDelaySynth();

    const getExplanation = (param) => {
        switch (param) {
            case 'delayTime':
                // Adjusted explanation to reflect the new range constraint if applicable
                return "The time (in seconds, max 1 second) between the original sound and its repetitions. Shorter times create a slap-back or doubling effect; longer times create distinct echoes.";
            case 'feedback':
                return "Controls how much of the delayed signal is fed back into the delay line, determining the number and decay of repetitions. Values near 1 (but not 1) can create long, trailing echoes.";
            case 'wet':
                return "The wet/dry mix of the delay effect. 0 is fully dry (no delay audible), 1 is fully wet (only delayed signal audible). A value around 0.5 is a balanced mix.";
            default:
                return "Adjust parameters to hear the different characteristics of delay!";
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #f7e0d4 0%, #e0d4b9 50%, #c9c99c 100%)', // Warm, earthy gradient
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Floating Icons Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='25' cy='25' r='3' fill='%238a6a4a'/%3E%3Ccircle cx='75' cy='25' r='3' fill='%238a6a4a'/%3E%3Ccircle cx='50' cy='50' r='3' fill='%238a6a4a'/%3E%3Ccircle cx='25' cy='75' r='3' fill='%238a6a4a'/%3E%3Ccircle cx='75' cy='75' r='3' fill='%238a6a4a'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            <div className="text-center mb-10 z-10">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <Clock size={48} className="text-orange-700" />
                    <h1 className="text-5xl font-extrabold text-orange-900 drop-shadow-lg">Delay Explorer</h1>
                </div>
                {!isAudioReady && (
                    <p className="text-orange-700 text-sm mt-4 animate-pulse">
                        Click "Play Audio Loop" to activate audio and begin.
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col items-center space-y-8 z-10 border border-orange-200">

                {/* Play/Pause Button */}
                <button
                    type="button"
                    onClick={togglePlay}
                    className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all duration-300
                                ${isPlaying
                                ? 'bg-orange-700 hover:bg-orange-800 text-white'
                                : 'bg-orange-500 hover:bg-orange-600 text-white'}
                                ${!isAudioReady && !isPlaying ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    {isPlaying ? "Stop Audio Loop" : "Play Audio Loop"}
                </button>

                {/* Delay Parameter Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8">
                    {/* Delay Time Slider */}
                    <div className="flex flex-col items-center">
                        <label className="text-orange-800 font-medium mb-2">Delay Time: {delayTime.toFixed(2)} s</label>
                        <input
                            type="range"
                            min="0.01"
                            max="1" // Changed max to 1 to adhere to the [0, 1] range error
                            step="0.01"
                            value={delayTime}
                            onChange={(e) => setDelayTime(parseFloat(e.target.value))}
                            className="w-full accent-orange-600 h-2 rounded-lg appearance-none cursor-pointer bg-orange-100"
                            disabled={!isAudioReady}
                        />
                        <p className="text-orange-700 text-sm mt-1 italic">{getExplanation('delayTime')}</p>
                    </div>

                    {/* Feedback Slider */}
                    <div className="flex flex-col items-center">
                        <label className="text-orange-800 font-medium mb-2">Feedback: {feedback.toFixed(2)}</label>
                        <input
                            type="range"
                            min="0"
                            max="0.95" // Keep max slightly below 1 to prevent infinite feedback
                            step="0.01"
                            value={feedback}
                            onChange={(e) => setFeedback(parseFloat(e.target.value))}
                            className="w-full accent-orange-600 h-2 rounded-lg appearance-none cursor-pointer bg-orange-100"
                            disabled={!isAudioReady}
                        />
                        <p className="text-orange-700 text-sm mt-1 italic">{getExplanation('feedback')}</p>
                    </div>

                    {/* Wet/Dry Slider */}
                    <div className="flex flex-col items-center">
                        <label className="text-orange-800 font-medium mb-2">Wet/Dry: {wet.toFixed(2)}</label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={wet}
                            onChange={(e) => setWet(parseFloat(e.target.value))}
                            className="w-full accent-orange-600 h-2 rounded-lg appearance-none cursor-pointer bg-orange-100"
                            disabled={!isAudioReady}
                        />
                        <p className="text-orange-700 text-sm mt-1 italic">{getExplanation('wet')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// This is the default export for the standalone Delay Explorer
// Adding a simple ErrorBoundary to catch potential React errors and display a fallback UI
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error in DelayExplorer:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Delay Explorer. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

const DelayExplorer = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <DelayExplorerContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default DelayExplorer;
