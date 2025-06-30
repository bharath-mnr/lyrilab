import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Waves } from 'lucide-react';
import SEOHead from './SEOHead';

// Define the tool object for SEO structured data
const reverbExplorerTool = {
    id: 'reverb-explorer',
    name: 'Reverb Explorer',
    description: 'Interactive spatial audio training tool to explore different reverb types and settings.',
    path: '/reverb-explorer',
    categories: [
        'Reverb Effects',
        'Spatial Audio',
        'Sound Design',
        'Audio Processing',
        'Mixing'
    ]
};

// Define the path to your C3 piano sample
const SAMPLE_C3_MP3_PATH = '/piano_samples/C3.mp3'; // Ensure this file exists in your public/piano_samples folder

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


// --- useReverbSynth Hook ---
const useReverbSynth = () => {
    // This hook now relies on AudioContext being provided by a parent component.
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const playerRef = useRef(null); // This will now hold the Tone.Player for C3.mp3
    const reverbRef = useRef(null);
    const hasInitializedRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false); // Tracks if the C3 note is currently sounding
    const [decay, setDecay] = useState(3.0); // Reverb decay time in seconds (Increased default)
    const [preDelay, setPreDelay] = useState(0.01); // Time before reverb kicks in
    const [wet, setWet] = useState(0.5); // Wet/dry mix (0-1, 0 is dry, 1 is wet)

    const [isAudioReady, setIsAudioReady] = useState(false);

    // Function to create and connect Tone.js nodes for Reverb Explorer
    const initAudioNodes = useCallback(async () => {
        if (hasInitializedRef.current) {
            console.log('useReverbSynth: initAudioNodes: already initialized, skipping init.');
            return;
        }

        console.log(`useReverbSynth: initAudioNodes called. isAudioGloballyReady: ${isAudioGloballyReady}`);

        if (isAudioGloballyReady && !playerRef.current) {
            console.log('useReverbSynth: Proceeding with initialization of audio nodes and loading MP3...');
            try {
                // Create Tone.Player for the C3 sample
                const player = new Tone.Player({
                    url: SAMPLE_C3_MP3_PATH,
                    loop: true, // Loop the sample for continuous reverb effect
                    autostart: false,
                });
                await player.load(SAMPLE_C3_MP3_PATH);
                console.log('useReverbSynth: C3 sample loaded successfully.');

                // Create Tone.Reverb with initial values
                const reverb = new Tone.Reverb({
                    decay: decay,
                    preDelay: preDelay,
                    wet: wet,
                }).toDestination(); // Connect reverb directly to destination

                // Connect player to reverb
                player.connect(reverb);

                // Store references
                playerRef.current = player;
                reverbRef.current = reverb;

                setIsAudioReady(true);
                hasInitializedRef.current = true;
                console.log('useReverbSynth: Audio nodes initialized and connected.');

            } catch (error) {
                console.error("useReverbSynth: Error initializing audio nodes or loading MP3:", error);
                setIsAudioReady(false);
                hasInitializedRef.current = false;
            }
        } else {
            console.log("useReverbSynth: initAudioNodes skipped. Not globally ready or player already exists.");
        }
    }, [isAudioGloballyReady]); // IMPORTANT: Removed decay, preDelay, wet from dependencies.
                                // These are now handled by the separate useEffect below for real-time updates.

    // Function to dispose Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log(`useReverbSynth: disposeAudioNodes called. playerRef.current: ${playerRef.current}`);
        if (playerRef.current) {
            console.log('useReverbSynth: Disposing audio nodes...');
            playerRef.current.stop(); // Stop playback
            playerRef.current.dispose(); // Dispose the player
            if (reverbRef.current) reverbRef.current.dispose(); // Dispose the reverb

            playerRef.current = null;
            reverbRef.current = null;

            setIsPlaying(false);
            setIsAudioReady(false);
            hasInitializedRef.current = false;
            console.log('useReverbSynth: Audio nodes disposed.');
        }
    }, []);

    // Effect to manage creation/disposal of nodes based on global audio readiness
    useEffect(() => {
        console.log(`useReverbSynth Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
        if (isAudioGloballyReady) {
            initAudioNodes();
        } else {
            disposeAudioNodes();
        }

        return () => {
            console.log('useReverbSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes]);

    // Effect to update reverb parameters when their state changes (without re-initializing nodes)
    useEffect(() => {
        if (reverbRef.current && isAudioReady) {
            console.log(`useReverbSynth: Updating reverb parameters - Decay: ${decay}, PreDelay: ${preDelay}, Wet: ${wet}`);
            reverbRef.current.decay = decay;
            reverbRef.current.preDelay = preDelay;
            reverbRef.current.wet.value = wet; // 'wet' is an AudioParam, needs .value for smooth changes.
        }
    }, [decay, preDelay, wet, isAudioReady]); // These dependencies are correct for updating parameters

    // Toggles playback of the C3 note
    const togglePlay = useCallback(async () => {
        console.log('togglePlay called. isPlaying:', isPlaying, 'isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady);

        // Ensure global audio context is running
        if (!isAudioGloballyReady) {
            console.log('togglePlay: AudioContext not globally ready, attempting to start global audio...');
            await startGlobalAudio(); // Await global audio context to start
        }

        // Initialize local audio nodes if not already done and global context is ready
        // Re-check isAudioGloballyReady after startGlobalAudio might have run
        if (Tone.context.state === 'running' && !hasInitializedRef.current) { // Use Tone.context.state for robust check
            console.log('togglePlay: Global audio ready but local nodes not initialized. Attempting to initialize them now...');
            await initAudioNodes(); // Await local node initialization
        }

        // Now, proceed with playback toggle if everything is ready
        // Added hasInitializedRef.current to ensure playerRef.current is reliably set
        if (playerRef.current && hasInitializedRef.current && isAudioReady) {
            if (isPlaying) {
                playerRef.current.stop();
                setIsPlaying(false);
                console.log('togglePlay: C3 note stopped.');
            } else {
                playerRef.current.start();
                setIsPlaying(true);
                console.log('togglePlay: C3 note started.');
            }
        } else {
            console.warn('togglePlay: Cannot toggle playback. Audio system not fully ready.');
        }
    }, [isPlaying, isAudioGloballyReady, isAudioReady, startGlobalAudio, initAudioNodes]);

    return {
        isPlaying,
        togglePlay,
        decay,
        setDecay,
        preDelay,
        setPreDelay,
        wet,
        setWet,
        isAudioReady,
    };
};
// --- End useReverbSynth Hook ---


// --- ReverbExplorer Component (Main Component) ---
const ReverbExplorerContent = () => { // Renamed to ReverbExplorerContent
    const {
        isPlaying, togglePlay,
        decay, setDecay,
        preDelay, setPreDelay,
        wet, setWet,
        isAudioReady,
    } = useReverbSynth();

    const getExplanation = (param) => {
        switch (param) {
            case 'decay':
                return "The time (in seconds) it takes for the reverb to decay to -60 dB (RT60). Longer values create larger, more spacious rooms.";
            case 'preDelay':
                return "The time (in seconds) before the wet signal starts after the dry signal. Simulates the time it takes for sound to reach the first reflection in a room.";
            case 'wet':
                return "The wet/dry mix of the reverb effect. 0 is fully dry (no reverb), 1 is fully wet (only reverb). 0.5 is a typical balance.";
            default:
                return "Adjust parameters to hear the different characteristics of reverb!";
        }
    };

    return (
        <>
            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
                pageId="reverb-explorer" 
                tool={reverbExplorerTool}
                customData={{}}
            />

            <div
                className="min-h-screen flex flex-col items-center p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #e0f2fe 0%, #bfd8f5 50%, #a4c4e0 100%)', // Light blue gradient
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                {/* Floating Icons Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='25' cy='25' r='3' fill='%2364748b'/%3E%3Ccircle cx='75' cy='25' r='3' fill='%2364748b'/%3E%3Ccircle cx='50' cy='50' r='3' fill='%2364748b'/%3E%3Ccircle cx='25' cy='75' r='3' fill='%2364748b'/%3E%3Ccircle cx='75' cy='75' r='3' fill='%2364748b'/%3E%3C/svg%3E\")",
                        backgroundSize: '200px 200px'
                    }}
                ></div>

                <div className="text-center mb-10 z-10">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <Waves size={48} className="text-blue-700" />
                        <h1 className="text-5xl font-extrabold text-blue-900 drop-shadow-lg">Reverb Explorer</h1>
                    </div>
                    {!isAudioReady && (
                        <p className="text-blue-700 text-sm mt-4 animate-pulse">
                            Click "Play C3 Note" to activate audio and begin.
                        </p>
                    )}
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
                        {isPlaying ? "Stop C3 Note" : "Play C3 Note"} {/* Updated button text */}
                    </button>

                    {/* Reverb Parameter Sliders */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8">
                        {/* Decay Slider */}
                        <div className="flex flex-col items-center">
                            <label className="text-blue-800 font-medium mb-2">Decay: {decay.toFixed(2)} s</label>
                            <input
                                type="range"
                                min="0.1"
                                max="20"
                                step="0.1"
                                value={decay}
                                onChange={(e) => setDecay(parseFloat(e.target.value))}
                                className="w-full accent-blue-600 h-2 rounded-lg appearance-none cursor-pointer bg-blue-100"
                                disabled={!isAudioReady}
                            />
                            <p className="text-blue-700 text-sm mt-1 italic">{getExplanation('decay')}</p>
                        </div>

                        {/* Pre-Delay Slider */}
                        <div className="flex flex-col items-center">
                            <label className="text-blue-800 font-medium mb-2">Pre-Delay: {preDelay.toFixed(3)} s</label>
                            <input
                                type="range"
                                min="0"
                                max="0.2"
                                step="0.001"
                                value={preDelay}
                                onChange={(e) => setPreDelay(parseFloat(e.target.value))}
                                className="w-full accent-blue-600 h-2 rounded-lg appearance-none cursor-pointer bg-blue-100"
                                disabled={!isAudioReady}
                            />
                            <p className="text-blue-700 text-sm mt-1 italic">{getExplanation('preDelay')}</p>
                        </div>

                        {/* Wet/Dry Slider */}
                        <div className="flex flex-col items-center">
                            <label className="text-blue-800 font-medium mb-2">Wet/Dry: {wet.toFixed(2)}</label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={wet}
                                onChange={(e) => setWet(parseFloat(e.target.value))}
                                className="w-full accent-blue-600 h-2 rounded-lg appearance-none cursor-pointer bg-blue-100"
                                disabled={!isAudioReady}
                            />
                            <p className="text-blue-700 text-sm mt-1 italic">{getExplanation('wet')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// This is the default export, it no longer wraps with AudioContextProvider
const ReverbExplorer = () => {
    return (
        <AudioContextProvider> {/* Re-added AudioContextProvider here */}
            <ReverbExplorerContent />
        </AudioContextProvider>
    );
}

export default ReverbExplorer;
