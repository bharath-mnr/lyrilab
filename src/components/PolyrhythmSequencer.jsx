import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Music, Zap } from 'lucide-react'; // Music icon for sequencer, Zap for rhythm/beat

// Define dummy sample paths. In a real application, you'd replace these with actual MP3 files.
// For example: /samples/kick.mp3, /samples/snare.mp3
const KICK_MP3_PATH = '/drum_samples/kick.mp3'; // Placeholder
const SNARE_MP3_PATH = '/drum_samples/snare.mp3'; // Placeholder

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


// --- usePolyrhythmSequencer Hook ---
const usePolyrhythmSequencer = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const kickSamplerRef = useRef(null);
    const snareSamplerRef = useRef(null);
    const sequence1Ref = useRef(null);
    const sequence2Ref = useRef(null);
    const hasInitializedRef = useRef(false); // Tracks if Tone.js nodes have been created
    const isAudioLoadingRef = useRef(false); // Tracks if audio samples are currently loading

    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false); // True when context is running AND samples loaded

    // Global BPM
    const [bpm, setBpm] = useState(120);

    // Rhythm 1 State (Kick)
    const [rhythm1Pattern, setRhythm1Pattern] = useState(Array(8).fill(false).map((_, i) => i === 0 || i === 4)); // Default: kick on 1 and 5
    const [rhythm1Subdivision, setRhythm1Subdivision] = useState('8n'); // 8th notes
    const [rhythm1Steps, setRhythm1Steps] = useState(8); // Number of steps in the sequence
    const [activeStep1, setActiveStep1] = useState(-1); // For visual feedback

    // Rhythm 2 State (Snare)
    const [rhythm2Pattern, setRhythm2Pattern] = useState(Array(6).fill(false).map((_, i) => i === 0 || i === 2 || i === 4)); // Default: snare on 1, 3, 5
    const [rhythm2Subdivision, setRhythm2Subdivision] = useState('8n'); // 8th notes (creates polyrhythm against 8 steps)
    const [rhythm2Steps, setRhythm2Steps] = useState(6); // Number of steps in the sequence
    const [activeStep2, setActiveStep2] = useState(-1); // For visual feedback

    // Function to initialize Tone.js nodes (Samplers and Sequences)
    const initAudioNodes = useCallback(async () => {
        if (hasInitializedRef.current || isAudioLoadingRef.current) {
            console.log('usePolyrhythmSequencer: initAudioNodes: already initialized or loading, skipping init.');
            return;
        }

        if (!isAudioGloballyReady) {
            console.log('usePolyrhythmSequencer: AudioContext not globally ready, cannot initialize nodes.');
            return;
        }

        isAudioLoadingRef.current = true; // Set loading state
        console.log('usePolyrhythmSequencer: Proceeding with initialization of audio nodes and loading samples...');

        try {
            // Dispose existing nodes to prevent multiple instances
            if (kickSamplerRef.current) kickSamplerRef.current.dispose();
            if (snareSamplerRef.current) snareSamplerRef.current.dispose();
            if (sequence1Ref.current) sequence1Ref.current.dispose();
            if (sequence2Ref.current) sequence2Ref.current.dispose();
            Tone.Transport.stop(); // Stop transport to ensure clean re-initialization
            Tone.Transport.cancel(); // Clear all scheduled events

            // Create Samplers for drum sounds
            const kickSampler = new Tone.Sampler({
                urls: {
                    C3: KICK_MP3_PATH,
                },
                onload: () => console.log('Kick sample loading...'), // Log loading start
                onerror: (e) => console.error('Error loading kick sample:', e),
            }).toDestination();

            const snareSampler = new Tone.Sampler({
                urls: {
                    C3: SNARE_MP3_PATH,
                },
                onload: () => console.log('Snare sample loading...'), // Log loading start
                onerror: (e) => console.error('Error loading snare sample:', e),
            }).toDestination();

            // Wait for both samplers to be loaded
            await Promise.all([kickSampler.loaded, snareSampler.loaded]); // Await the 'loaded' promise for each sampler
            console.log('usePolyrhythmSequencer: All samples loaded successfully.');

            kickSamplerRef.current = kickSampler;
            snareSamplerRef.current = snareSampler;

            // Initialize Tone.Transport
            Tone.Transport.bpm.value = bpm;
            Tone.Transport.loop = true; // Loop the transport indefinitely
            // Set loopEnd to the longest common multiple or a sufficiently long measure.
            // For 8n subdivision, a '1m' (one measure) loop end will cover 8 steps.
            // If subdivisions are different, the longest sequence determines loop end to ensure full patterns play.
            // For a simple demo, '1m' is fine for both 8 and 6 steps if both are '8n' as it just controls transport restart.
            Tone.Transport.loopEnd = '1m'; // Default 4/4 measure loop

            // Create Sequences
            // The `events` array holds the indices that will trigger a note
            // The `subdivision` defines how often the callback is fired (e.g., '8n' means every 8th note)
            const sequence1 = new Tone.Sequence((time, step) => {
                // Trigger kick if the current step in the pattern is active
                if (rhythm1Pattern[step]) {
                    kickSampler.triggerAttackRelease("C3", "8n", time);
                }
                // Update active step for visualizer. Use Tone.Draw to schedule UI updates.
                Tone.Draw.schedule(() => {
                    setActiveStep1(step);
                }, time);
            }, Array.from({ length: rhythm1Steps }, (_, i) => i), rhythm1Subdivision); // Sequence over indexed steps

            const sequence2 = new Tone.Sequence((time, step) => {
                // Trigger snare if the current step in the pattern is active
                if (rhythm2Pattern[step]) {
                    snareSampler.triggerAttackRelease("C3", "8n", time);
                }
                // Update active step for visualizer
                Tone.Draw.schedule(() => {
                    setActiveStep2(step);
                }, time);
            }, Array.from({ length: rhythm2Steps }, (_, i) => i), rhythm2Subdivision);

            // Start sequences immediately (they will only play when Transport starts)
            sequence1.start(0);
            sequence2.start(0);

            sequence1Ref.current = sequence1;
            sequence2Ref.current = sequence2;

            setIsAudioReady(true); // Set ready only after all async operations
            hasInitializedRef.current = true;
            isAudioLoadingRef.current = false; // Reset loading state
            console.log('usePolyrhythmSequencer: Audio nodes initialized and connected.');

        } catch (error) {
            console.error("usePolyrhythmSequencer: Error initializing audio nodes or loading samples:", error);
            setIsAudioReady(false);
            hasInitializedRef.current = false;
            isAudioLoadingRef.current = false; // Reset loading state on error
            // Ensure any partially created nodes are disposed on error
            if (kickSamplerRef.current) { kickSamplerRef.current.dispose(); kickSamplerRef.current = null; }
            if (snareSamplerRef.current) { snareSamplerRef.current.dispose(); snareSamplerRef.current = null; }
            if (sequence1Ref.current) { sequence1Ref.current.dispose(); sequence1Ref.current = null; }
            if (sequence2Ref.current) { sequence2Ref.current.dispose(); sequence2Ref.current = null; }
        }
    }, [isAudioGloballyReady, bpm, rhythm1Pattern, rhythm1Subdivision, rhythm1Steps, rhythm2Pattern, rhythm2Subdivision, rhythm2Steps]);


    // Function to dispose all Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log('usePolyrhythmSequencer: disposeAudioNodes called.');
        Tone.Transport.stop(); // Stop the transport first
        Tone.Transport.cancel(); // Clear all scheduled events on transport

        if (kickSamplerRef.current) {
            kickSamplerRef.current.dispose();
            kickSamplerRef.current = null;
        }
        if (snareSamplerRef.current) {
            snareSamplerRef.current.dispose();
            snareSamplerRef.current = null;
        }
        if (sequence1Ref.current) {
            sequence1Ref.current.dispose();
            sequence1Ref.current = null;
        }
        if (sequence2Ref.current) {
            sequence2Ref.current.dispose();
            sequence2Ref.current = null;
        }

        setIsPlaying(false);
        setIsAudioReady(false);
        hasInitializedRef.current = false;
        isAudioLoadingRef.current = false;
        setActiveStep1(-1); // Reset active steps
        setActiveStep2(-1);
        console.log('usePolyrhythmSequencer: Audio nodes disposed.');
    }, []);

    // Effect for global audio context readiness and initialization/disposal
    useEffect(() => {
        console.log(`usePolyrhythmSequencer Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
        if (isAudioGloballyReady) {
            // Attempt initialization only if not already initialized and not currently loading
            if (!hasInitializedRef.current && !isAudioLoadingRef.current) {
                initAudioNodes();
            }
        } else {
            // Dispose nodes if audio context is suspended/closed
            disposeAudioNodes();
        }

        return () => {
            console.log('usePolyrhythmSequencer Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes]);


    // Effect for BPM changes (smoothly ramp to new BPM)
    useEffect(() => {
        if (Tone.Transport && Tone.Transport.bpm && isAudioReady) {
            // Tone.Transport.bpm is an AudioParam, so rampTo is applicable
            Tone.Transport.bpm.rampTo(bpm, 0.1); // Smooth transition over 0.1 seconds
        }
    }, [bpm, isAudioReady]);


    // Toggles global playback (Tone.Transport)
    const togglePlay = useCallback(async () => {
        console.log('togglePlay called. isPlaying:', isPlaying, 'isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady, 'isAudioLoadingRef:', isAudioLoadingRef.current);

        if (!isAudioGloballyReady) {
            console.log('togglePlay: AudioContext not globally ready, attempting to start global audio...');
            await startGlobalAudio();
            // Give a tiny moment for context state to propagate after starting
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Re-check global audio readiness and initialization status after potential async operations
        if (Tone.context.state === 'running' && !hasInitializedRef.current && !isAudioLoadingRef.current) {
            console.log('togglePlay: Global audio ready but local nodes not initialized. Attempting to initialize them now...');
            await initAudioNodes();
            // Give a tiny moment for init to complete and state to propagate
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Only proceed if audio is fully ready
        if (isAudioReady) {
            try {
                if (isPlaying) {
                    Tone.Transport.pause(); // Pause transport
                    setIsPlaying(false);
                    // Reset active steps visually when paused
                    setActiveStep1(-1);
                    setActiveStep2(-1);
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
            // Inform user if not ready, maybe trigger re-initialization logic if needed.
        }
    }, [isPlaying, isAudioGloballyReady, isAudioReady, startGlobalAudio, initAudioNodes]);


    // Return all necessary states and setters
    return {
        isPlaying, togglePlay,
        isAudioReady, isAudioLoading: isAudioLoadingRef.current, // Expose loading status
        bpm, setBpm,
        rhythm1Pattern, setRhythm1Pattern, rhythm1Subdivision, setRhythm1Subdivision, rhythm1Steps, setRhythm1Steps, activeStep1,
        rhythm2Pattern, setRhythm2Pattern, rhythm2Subdivision, setRhythm2Subdivision, rhythm2Steps, setRhythm2Steps, activeStep2,
    };
};
// --- End usePolyrhythmSequencer Hook ---


// --- RhythmGrid Component ---
const RhythmGrid = ({ pattern, setPattern, steps, setSteps, activeStep, label, colorClass, isAudioReady }) => {
    // Handler for toggling a step in the pattern
    const toggleStep = useCallback((index) => {
        if (!isAudioReady) return;
        // Create a new array to avoid direct state mutation
        const newPattern = [...pattern];
        newPattern[index] = !newPattern[index]; // Toggle true/false
        setPattern(newPattern);
    }, [pattern, setPattern, isAudioReady]);

    // Handler for changing the number of steps
    const handleStepsChange = useCallback((e) => {
        if (!isAudioReady) return;
        const newSteps = parseInt(e.target.value, 10);
        // Ensure newSteps is a valid number within bounds
        if (!isNaN(newSteps) && newSteps >= 2 && newSteps <= 16) {
            // When steps change, reset the pattern to default length (all false)
            const newPattern = Array(newSteps).fill(false);
            setPattern(newPattern);
            setSteps(newSteps); // Update the number of steps
        }
    }, [setPattern, setSteps, isAudioReady]);

    // This useEffect is redundant if handleStepsChange always resets the pattern,
    // but ensures consistency if pattern somehow gets out of sync (though that shouldn't happen with handleStepsChange)
    useEffect(() => {
        if (pattern.length !== steps) {
            console.log(`RhythmGrid: Adjusting pattern length from ${pattern.length} to ${steps}`);
            const newPattern = Array(steps).fill(false);
            setPattern(newPattern);
        }
    }, [steps]); // Only depend on steps to avoid infinite loops with pattern/setPattern


    return (
        <div className="flex flex-col items-center p-3 sm:p-4 bg-white rounded-lg shadow-md border border-gray-100">
            <h3 className={`text-lg sm:text-xl font-semibold mb-3 text-center ${colorClass}`}>{label}</h3>
            {/* Grid of step buttons - responsive for mobile */}
            <div className="grid gap-1 sm:gap-1.5 justify-center" style={{ gridTemplateColumns: `repeat(${Math.min(steps, 8)}, minmax(0, 1fr))` }}>
                {Array.from({ length: steps }).map((_, index) => (
                    <button
                        key={index} // Use index as key
                        className={`w-10 h-10 sm:w-8 sm:h-8 rounded-md transition-colors duration-100 flex items-center justify-center text-xs sm:text-sm font-bold touch-manipulation
                            ${pattern[index] ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-800'}
                            ${activeStep === index ? 'border-2 border-yellow-400 transform scale-105' : 'border-0'}
                            ${!isAudioReady ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80 active:scale-95'}
                            ${steps > 8 && index >= 8 ? 'mt-1' : ''}
                        `}
                        onClick={() => toggleStep(index)}
                        disabled={!isAudioReady}
                        style={steps > 8 && index >= 8 ? {
                            gridColumn: `${(index - 8) + 1}`,
                            gridRow: '2'
                        } : {}}
                    >
                        {index + 1}
                    </button>
                ))}
            </div>
            {/* Steps control input */}
            <div className="mt-3 sm:mt-4 w-full text-sm text-gray-600">
                <label htmlFor={`${label}-steps`} className="block mb-1 text-purple-800 font-medium text-center">Steps:</label>
                <input
                    id={`${label}-steps`}
                    type="number"
                    min="2"
                    max="16"
                    value={steps}
                    onChange={handleStepsChange}
                    className="w-full p-2 border rounded-md text-center bg-purple-100 text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                    disabled={!isAudioReady}
                />
            </div>
        </div>
    );
};
// --- End RhythmGrid Component ---


// --- PolyrhythmSequencerContent (Main UI Logic) ---
const PolyrhythmSequencerContent = () => {
    const {
        isPlaying, togglePlay,
        isAudioReady, isAudioLoading,
        bpm, setBpm,
        rhythm1Pattern, setRhythm1Pattern, rhythm1Subdivision, setRhythm1Subdivision, rhythm1Steps, setRhythm1Steps, activeStep1,
        rhythm2Pattern, setRhythm2Pattern, rhythm2Subdivision, setRhythm2Subdivision, rhythm2Steps, setRhythm2Steps, activeStep2,
    } = usePolyrhythmSequencer();


    return (
        <div
            className="min-h-screen flex flex-col items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #f0e7f7 0%, #e0d4f0 50%, #d0c1e4 100%)', // Light purplish gradient
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Floating Icons Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%238b5cf6' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            <div className="text-center mb-6 sm:mb-8 lg:mb-10 z-10">
                <div className="flex items-center justify-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                    <Music size={32} className="text-purple-700 sm:w-12 sm:h-12" />
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-purple-900 drop-shadow-lg">Polyrhythm Sequencer</h1>
                </div>
                {!isAudioReady && !isAudioLoading && (
                    <p className="text-purple-700 text-xs sm:text-sm mt-4 animate-pulse px-4">
                        Click "Play Sequences" to activate audio and begin.
                    </p>
                )}
                 {isAudioLoading && (
                    <p className="text-purple-700 text-xs sm:text-sm mt-4 animate-pulse px-4">
                        Loading drum samples... Please wait.
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col items-center space-y-6 sm:space-y-8 z-10 border border-purple-200">

                {/* Global Controls: Play/Pause, BPM */}
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-4 sm:mb-6 w-full">
                    <button
                        type="button"
                        onClick={togglePlay}
                        className={`px-6 sm:px-8 py-3 sm:py-4 rounded-full font-bold text-base sm:text-lg flex items-center gap-2 sm:gap-3 transition-all duration-300 touch-manipulation min-w-0 w-full sm:w-auto
                                ${isPlaying
                                ? 'bg-purple-700 hover:bg-purple-800 text-white'
                                : 'bg-purple-500 hover:bg-purple-600 text-white'}
                                ${(!isAudioReady && !isPlaying) || isAudioLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        disabled={isAudioLoading} // Disable button while audio is loading
                    >
                        {isPlaying ? <Pause size={20} className="sm:w-6 sm:h-6" /> : <Play size={20} className="sm:w-6 sm:h-6" />}
                        <span className="truncate">{isPlaying ? "Stop Sequences" : "Play Sequences"}</span>
                    </button>

                    <div className="flex flex-col items-center w-full sm:w-auto min-w-0">
                        <label className="text-purple-800 font-medium mb-2 text-sm sm:text-base">BPM: {bpm.toFixed(0)}</label>
                        <input
                            type="range"
                            min="60"
                            max="240"
                            step="1"
                            value={bpm}
                            onChange={(e) => setBpm(parseFloat(e.target.value))}
                            className="w-full sm:w-48 accent-purple-600 h-2 rounded-lg appearance-none cursor-pointer bg-purple-100 touch-manipulation"
                            disabled={!isAudioReady}
                        />
                    </div>
                </div>

                {/* Polyrhythm Grids */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 w-full mt-4 sm:mt-6 lg:mt-8">
                    {/* Rhythm 1 (Kick) */}
                    <RhythmGrid
                        label="Kick (8th notes)"
                        pattern={rhythm1Pattern}
                        setPattern={setRhythm1Pattern}
                        steps={rhythm1Steps}
                        setSteps={setRhythm1Steps} // Pass setter for steps
                        activeStep={activeStep1}
                        colorClass="text-purple-700"
                        isAudioReady={isAudioReady}
                    />

                    {/* Rhythm 2 (Snare) */}
                    <RhythmGrid
                        label="Snare (8th notes)"
                        pattern={rhythm2Pattern}
                        setPattern={setRhythm2Pattern}
                        steps={rhythm2Steps}
                        setSteps={setRhythm2Steps} // Pass setter for steps
                        activeStep={activeStep2}
                        colorClass="text-indigo-700"
                        isAudioReady={isAudioReady}
                    />
                </div>

                <div className="text-center text-purple-700 text-xs sm:text-sm mt-4 sm:mt-6 italic px-2">
                    Adjusting "Steps" for a rhythm will reset its pattern.
                    The interaction of different "Steps" numbers creates the polyrhythm effect.
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
        console.error("Uncaught error in PolyrhythmSequencer:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Polyrhythm Sequencer. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export wrapping the main content with AudioContextProvider and ErrorBoundary
const PolyrhythmSequencer = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <PolyrhythmSequencerContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default PolyrhythmSequencer;