import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Maximize } from 'lucide-react'; // Using Maximize icon for Stereo Imager
import SEOHead from './SEOHead';


// Define the tool object for SEO structured data
const stereoImagerExplorerTool = {
    id: 'stereo-imager-explorer',
    name: 'Stereo Imager',
    description: 'Adjust stereo width and imaging with precision controls for professional mixes.',
    path: '/stereo-imager-explorer',
    categories: [
        'Stereo Imaging',
        'Audio Mixing',
        'Width Control',
        'Music Production',
        'Mastering'
    ]
};



// Define the path to your C4 piano sample.
// IMPORTANT NOTE: For best results with Stereo Imager, a true stereo audio source
// (like a music track, or a stereo synth patch) is highly recommended.
// A single piano note like C4_PIANO_MP3_PATH is often recorded in mono,
// which will limit the noticeable effect of stereo widening.
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


// --- useStereoImagerSynth Hook ---
const useStereoImagerSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const playerRef = useRef(null);
    const stereoWidenerRef = useRef(null); // Reference to Tone.StereoWidener
    const hasInitializedRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [width, setWidth] = useState(0.5); // 0 (mono) to 1 (max stereo width)

    const [isAudioReady, setIsAudioReady] = useState(false);

    // Function to create and connect Tone.js nodes for Stereo Imager processing
    const initAudioNodes = useCallback(async () => {
        // Prevent re-initialization if already done
        if (hasInitializedRef.current) {
            console.log('useStereoImagerSynth: initAudioNodes: already initialized, skipping init.');
            return;
        }

        console.log(`useStereoImagerSynth: initAudioNodes called. isAudioGloballyReady: ${isAudioGloballyReady}`);

        // Only proceed if global audio context is ready and player hasn't been created yet
        if (isAudioGloballyReady && !playerRef.current) {
            console.log('useStereoImagerSynth: Proceeding with initialization of audio nodes and loading MP3...');
            try {
                // Create Tone.Player for the audio source (C4 piano)
                const player = new Tone.Player({
                    url: C4_PIANO_MP3_PATH, // Piano sample for stereo imaging
                    loop: true, // Loop the sample for continuous effect
                    autostart: false,
                    volume: -8 // Slightly reduced volume
                });
                await player.load(C4_PIANO_MP3_PATH); // Ensure the new path is used for loading
                console.log('useStereoImagerSynth: C4 piano sample loaded successfully.');

                // Create Tone.StereoWidener effect
                const stereoWidener = new Tone.StereoWidener({
                    width: width,
                    // The 'wet' parameter is inherited from Effect, default is 1
                }).toDestination(); // Connect directly to output

                // Connect the player to the stereo widener effect
                player.connect(stereoWidener);

                // Store references
                playerRef.current = player;
                stereoWidenerRef.current = stereoWidener;

                setIsAudioReady(true);
                hasInitializedRef.current = true; // Mark as initialized after successful setup
                console.log('useStereoImagerSynth: Audio nodes initialized and connected.');

            } catch (error) {
                console.error("useStereoImagerSynth: Error initializing audio nodes or loading MP3:", error);
                setIsAudioReady(false);
                hasInitializedRef.current = false;
            }
        } else {
            console.log("useStereoImagerSynth: initAudioNodes skipped. Not globally ready or player already exists.");
        }
    }, [isAudioGloballyReady]); // Only global readiness as dependency for initial setup

    // Function to dispose Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log(`useStereoImagerSynth: disposeAudioNodes called. playerRef.current: ${playerRef.current}`);
        if (playerRef.current) {
            console.log('useStereoImagerSynth: Disposing audio nodes...');
            // Only stop the player if it's currently started to avoid errors
            if (playerRef.current.state === 'started') {
                playerRef.current.stop();
            }
            playerRef.current.dispose(); // Dispose the player
            if (stereoWidenerRef.current) stereoWidenerRef.current.dispose(); // Dispose the stereo widener node

            // Nullify references
            playerRef.current = null;
            stereoWidenerRef.current = null;

            setIsPlaying(false);
            setIsAudioReady(false);
            hasInitializedRef.current = false; // Reset initialization flag
            console.log('useStereoImagerSynth: Audio nodes disposed.');
        }
    }, []);

    // Effect to manage creation/disposal of nodes based on global audio readiness
    useEffect(() => {
        console.log(`useStereoImagerSynth Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
        if (isAudioGloballyReady) {
            initAudioNodes(); // Attempt to initialize if global audio is ready
        } else {
            disposeAudioNodes(); // Dispose if global audio is not ready (e.g., component unmounts or context stops)
        }

        // Cleanup function for when the component unmounts
        return () => {
            console.log('useStereoImagerSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes]);

    // Effect to update StereoWidener parameters when their state changes
    useEffect(() => {
        // Robust guard clause: ensure stereoWidenerRef.current exists AND its 'width' property is defined.
        if (stereoWidenerRef.current && isAudioReady &&
            stereoWidenerRef.current.width !== undefined) {
            console.log(`useStereoImagerSynth: Updating stereo widener parameter - Width: ${width}`);
            stereoWidenerRef.current.width.value = width; // 'width' is an AudioParam
        } else {
            console.warn('useStereoImagerSynth: Skipping stereo widener parameter update as node or its properties are not fully ready.');
        }
    }, [width, isAudioReady]);

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
        width,
        setWidth,
        isAudioReady,
    };
};
// --- End useStereoImagerSynth Hook ---


// --- StereoImagerExplorerContent Component (Main App Component) ---
const StereoImagerExplorerContent = () => {
    const {
        isPlaying, togglePlay,
        width, setWidth,
        isAudioReady,
    } = useStereoImagerSynth();

    const getExplanation = (param) => {
        switch (param) {
            case 'width':
                return "Controls the perceived stereo width of the audio. A value of 0 results in mono (center), and 1 results in maximum stereo separation (widest). Intermediate values offer varying degrees of stereo enhancement.";
            default:
                return "Adjust parameters to explore stereo imaging!";
        }
    };

    return (
        <>
            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
                pageId="stereo-imager-explorer" 
                tool={stereoImagerExplorerTool}
                customData={{}}
            />

            <div
                className="min-h-screen flex flex-col items-center p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #d4e7f7 0%, #b9d8e0 50%, #9cc9c9 100%)', // Light blue/cyan gradient
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                {/* Floating Icons Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%2364748b' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                        backgroundSize: '200px 200px'
                    }}
                ></div>

                <div className="text-center mb-10 z-10">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <Maximize size={48} className="text-blue-700" />
                        <h1 className="text-5xl font-extrabold text-blue-900 drop-shadow-lg">Stereo Imager Explorer</h1>
                    </div>
                    {!isAudioReady && (
                        <p className="text-blue-700 text-sm mt-4 animate-pulse">
                            Click "Play Audio Loop" to activate audio and begin.
                        </p>
                    )}
                    <p className="text-blue-800 text-sm mt-2">
                        Note: For the most noticeable effect, use a *true stereo* audio source. This example uses a mono piano sample.
                    </p>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col items-center space-y-8 z-10 border border-blue-200">

                    {/* Play/Pause Button */}
                    <button
                        type="button"
                        onClick={togglePlay}
                        className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all duration-300
                                    ${isPlaying
                                    ? 'bg-blue-700 hover:bg-blue-800 text-white'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'}
                                    ${!isAudioReady && !isPlaying ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        {isPlaying ? "Stop Audio Loop" : "Play Audio Loop"}
                    </button>

                    {/* Width Slider */}
                    <div className="grid grid-cols-1 gap-6 w-full mt-8">
                        <div className="flex flex-col items-center">
                            <label className="text-blue-800 font-medium mb-2">Width: {width.toFixed(2)}</label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={width}
                                onChange={(e) => setWidth(parseFloat(e.target.value))}
                                className="w-full accent-blue-600 h-2 rounded-lg appearance-none cursor-pointer bg-blue-100"
                                disabled={!isAudioReady}
                            />
                            <p className="text-blue-700 text-sm mt-1 italic">{getExplanation('width')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// This is the default export for the standalone Stereo Imager Explorer
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
        console.error("Uncaught error in StereoImagerExplorer:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Stereo Imager Explorer. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

const StereoImagerExplorer = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <StereoImagerExplorerContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default StereoImagerExplorer;
