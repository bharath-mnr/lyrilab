import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, ArrowUpDown } from 'lucide-react'; // Using ArrowUpDown icon for Pitch Shift

// Define the path to your C4 piano sample.
// This is a good source to hear pitch changes clearly.
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


// --- usePitchShiftSynth Hook ---
const usePitchShiftSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const playerRef = useRef(null);
    const pitchShiftRef = useRef(null); // Reference to Tone.PitchShift
    const hasInitializedRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [pitch, setPitch] = useState(0); // in semitones, 0 means no shift
    const [windowSize, setWindowSize] = useState(0.1); // in seconds, controls quality/latency tradeoff

    const [isAudioReady, setIsAudioReady] = useState(false);

    // Function to create and connect Tone.js nodes for Pitch Shift processing
    const initAudioNodes = useCallback(async () => {
        // Prevent re-initialization if already done
        if (hasInitializedRef.current) {
            console.log('usePitchShiftSynth: initAudioNodes: already initialized, skipping init.');
            return;
        }

        console.log(`usePitchShiftSynth: initAudioNodes called. isAudioGloballyReady: ${isAudioGloballyReady}`);

        // Only proceed if global audio context is ready and player hasn't been created yet
        if (isAudioGloballyReady && !playerRef.current) {
            console.log('usePitchShiftSynth: Proceeding with initialization of audio nodes and loading MP3...');
            try {
                // Create Tone.Player for the audio source (C4 piano)
                const player = new Tone.Player({
                    url: C4_PIANO_MP3_PATH, // Piano sample for pitch shift
                    loop: true, // Loop the sample for continuous effect
                    autostart: false,
                    volume: -8 // Slightly reduced volume
                });
                await player.load(C4_PIANO_MP3_PATH); // Ensure the new path is used for loading
                console.log('usePitchShiftSynth: C4 piano sample loaded successfully.');

                // Create Tone.PitchShift effect
                const pitchShift = new Tone.PitchShift({
                    pitch: pitch,
                    windowSize: windowSize,
                    feedback: 0, // PitchShift can also have feedback, but keeping it off by default for simplicity
                    wet: 1, // Start fully wet to hear the effect immediately
                }).toDestination(); // Connect directly to output

                // Connect the player to the pitch shift effect
                player.connect(pitchShift);

                // Store references
                playerRef.current = player;
                pitchShiftRef.current = pitchShift;

                setIsAudioReady(true);
                hasInitializedRef.current = true; // Mark as initialized after successful setup
                console.log('usePitchShiftSynth: Audio nodes initialized and connected.');

            } catch (error) {
                console.error("usePitchShiftSynth: Error initializing audio nodes or loading MP3:", error);
                setIsAudioReady(false);
                hasInitializedRef.current = false;
            }
        } else {
            console.log("usePitchShiftSynth: initAudioNodes skipped. Not globally ready or player already exists.");
        }
    }, [isAudioGloballyReady]); // Only global readiness as dependency for initial setup

    // Function to dispose Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log(`usePitchShiftSynth: disposeAudioNodes called. playerRef.current: ${playerRef.current}`);
        if (playerRef.current) {
            console.log('usePitchShiftSynth: Disposing audio nodes...');
            // Only stop the player if it's currently started to avoid errors
            if (playerRef.current.state === 'started') {
                playerRef.current.stop();
            }
            playerRef.current.dispose(); // Dispose the player
            if (pitchShiftRef.current) pitchShiftRef.current.dispose(); // Dispose the pitch shift node

            // Nullify references
            playerRef.current = null;
            pitchShiftRef.current = null;

            setIsPlaying(false);
            setIsAudioReady(false);
            hasInitializedRef.current = false; // Reset initialization flag
            console.log('usePitchShiftSynth: Audio nodes disposed.');
        }
    }, []);

    // Effect to manage creation/disposal of nodes based on global audio readiness
    useEffect(() => {
        console.log(`usePitchShiftSynth Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
        if (isAudioGloballyReady) {
            initAudioNodes(); // Attempt to initialize if global audio is ready
        } else {
            disposeAudioNodes(); // Dispose if global audio is not ready (e.g., component unmounts or context stops)
        }

        // Cleanup function for when the component unmounts
        return () => {
            console.log('usePitchShiftSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes]);

    // Effect to update PitchShift parameters when their state changes
    useEffect(() => {
        // Robust guard clause: ensure pitchShiftRef.current exists AND its properties are defined.
        if (pitchShiftRef.current && isAudioReady &&
            pitchShiftRef.current.pitch !== undefined && // Pitch is a direct property, not an AudioParam
            pitchShiftRef.current.windowSize !== undefined) { // WindowSize is a direct property
            console.log(`usePitchShiftSynth: Updating pitch shift parameters - Pitch: ${pitch}, Window Size: ${windowSize}`);
            pitchShiftRef.current.pitch = pitch;
            pitchShiftRef.current.windowSize = windowSize;
        } else {
            console.warn('usePitchShiftSynth: Skipping pitch shift parameter update as node or its properties are not fully ready.');
        }
    }, [pitch, windowSize, isAudioReady]);

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

    return {
        isPlaying,
        togglePlay,
        pitch,
        setPitch,
        windowSize,
        setWindowSize,
        isAudioReady,
    };
};
// --- End usePitchShiftSynth Hook ---


// --- PitchShiftExplorerContent Component (Main App Component) ---
const PitchShiftExplorerContent = () => {
    const {
        isPlaying, togglePlay,
        pitch, setPitch,
        windowSize, setWindowSize,
        isAudioReady,
    } = usePitchShiftSynth();

    const getExplanation = (param) => {
        switch (param) {
            case 'pitch':
                return "The amount of pitch shift in semitones. Positive values increase pitch, negative values decrease it. 12 semitones = 1 octave.";
            case 'windowSize':
                return "The size of the window (in seconds) used for pitch detection. Larger values generally produce higher quality pitch shifting but introduce more latency. Smaller values reduce latency but can sound more 'grainy' or metallic.";
            default:
                return "Adjust parameters to hear the different characteristics of pitch shifting!";
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #d4f7e5 0%, #b9e0d4 50%, #9bc9c9 100%)', // Greenish gradient
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Floating Icons Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='25' cy='25' r='3' fill='%236b7280'/%3E%3Ccircle cx='75' cy='25' r='3' fill='%236b7280'/%3E%3Ccircle cx='50' cy='50' r='3' fill='%236b7280'/%3E%3Ccircle cx='25' cy='75' r='3' fill='%236b7280'/%3E%3Ccircle cx='75' cy='75' r='3' fill='%236b7280'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            <div className="text-center mb-10 z-10">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <ArrowUpDown size={48} className="text-teal-700" />
                    <h1 className="text-5xl font-extrabold text-teal-900 drop-shadow-lg">Pitch Shift Explorer</h1>
                </div>
                {!isAudioReady && (
                    <p className="text-teal-700 text-sm mt-4 animate-pulse">
                        Click "Play Audio Loop" to activate audio and begin.
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col items-center space-y-8 z-10 border border-teal-200">

                {/* Play/Pause Button */}
                <button
                    type="button"
                    onClick={togglePlay}
                    className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all duration-300
                                ${isPlaying
                                ? 'bg-teal-700 hover:bg-teal-800 text-white'
                                : 'bg-teal-500 hover:bg-teal-600 text-white'}
                                ${!isAudioReady && !isPlaying ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    {isPlaying ? "Stop Audio Loop" : "Play Audio Loop"}
                </button>

                {/* Pitch Shift Parameter Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-8">
                    {/* Pitch Slider */}
                    <div className="flex flex-col items-center">
                        <label className="text-teal-800 font-medium mb-2">Pitch: {pitch.toFixed(1)} semitones</label>
                        <input
                            type="range"
                            min="-12"
                            max="12"
                            step="0.1"
                            value={pitch}
                            onChange={(e) => setPitch(parseFloat(e.target.value))}
                            className="w-full accent-teal-600 h-2 rounded-lg appearance-none cursor-pointer bg-teal-100"
                            disabled={!isAudioReady}
                        />
                        <p className="text-teal-700 text-sm mt-1 italic">{getExplanation('pitch')}</p>
                    </div>

                    {/* Window Size Slider */}
                    <div className="flex flex-col items-center">
                        <label className="text-teal-800 font-medium mb-2">Window Size: {windowSize.toFixed(2)} s</label>
                        <input
                            type="range"
                            min="0.01"
                            max="0.5" // Max window size of 0.5 seconds for reasonable latency
                            step="0.01"
                            value={windowSize}
                            onChange={(e) => setWindowSize(parseFloat(e.target.value))}
                            className="w-full accent-teal-600 h-2 rounded-lg appearance-none cursor-pointer bg-teal-100"
                            disabled={!isAudioReady}
                        />
                        <p className="text-teal-700 text-sm mt-1 italic">{getExplanation('windowSize')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// This is the default export for the standalone Pitch Shift Explorer
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
        console.error("Uncaught error in PitchShiftExplorer:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Pitch Shift Explorer. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

const PitchShiftExplorer = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <PitchShiftExplorerContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default PitchShiftExplorer;
