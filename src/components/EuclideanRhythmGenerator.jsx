import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Drum, Shuffle } from 'lucide-react'; // Drum icon for rhythm, Shuffle for Euclidean

// Define dummy sample paths. In a real application, you'd replace these with actual MP3 files.
// For example: /samples/kick.mp3, /samples/snare.mp3
const KICK_MP3_PATH = '/drum_samples/kick.mp3'; // Placeholder drum sample
const SNARE_MP3_PATH = '/drum_samples/snare.mp3'; // Placeholder drum sample

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


// --- generateEuclideanPattern (Bjorklund's Algorithm) ---
// This function generates a Euclidean rhythm pattern (boolean array)
const generateEuclideanPattern = (beats, steps) => {
    if (beats > steps || beats <= 0 || steps <= 0) {
        return Array(steps).fill(false); // Return all rests if invalid input
    }

    // Bjorklund's Algorithm for distributing k beats into n steps as evenly as possible
    let groups = [];
    for (let i = 0; i < beats; i++) {
        groups.push([true]); // Represents a beat (true)
    }
    for (let i = 0; i < steps - beats; i++) {
        groups.push([false]); // Represents a rest (false)
    }

    while (true) {
        let firstGroupIndex = 0;
        // Find the first non-empty group
        while (firstGroupIndex < groups.length && groups[firstGroupIndex].length === 0) {
            firstGroupIndex++;
        }
        // If all groups are processed or empty, break
        if (firstGroupIndex >= groups.length) break; 

        let lastGroupIndex = groups.length - 1;
        // Find the last non-empty group
        while (lastGroupIndex >= 0 && groups[lastGroupIndex].length === 0) {
            lastGroupIndex--;
        }
        // If there's only one distinct group type (or effectively one group), we are done
        if (lastGroupIndex <= firstGroupIndex || groups[firstGroupIndex].length === groups[lastGroupIndex].length) break;

        // Combine the last shortest group with the first longest group
        // This is the core 'euclidean' distribution step
        const longestGroup = groups[firstGroupIndex];
        const shortestGroup = groups[lastGroupIndex];

        // Ensure we don't combine with an empty group or a group of the same length
        if (shortestGroup.length === 0 || longestGroup.length === shortestGroup.length) break;

        const combinedGroup = longestGroup.concat(shortestGroup);
        groups[firstGroupIndex] = combinedGroup;
        groups[lastGroupIndex] = []; // Mark the shortest group as consumed/empty

        // This explicit sorting step is simplified for clarity, a more optimized
        // Bjorklund implementation would manipulate pointers or use specific data structures.
        groups.sort((a, b) => b.length - a.length); // Keep longest groups at the front
    }
    
    // Flatten the array of arrays into a single boolean array representing the pattern
    return groups.flat();
};
// --- END generateEuclideanPattern ---


// --- useEuclideanSequencer Hook ---
const useEuclideanSequencer = () => {
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
    const [beats1, setBeats1] = useState(5); // k
    const [steps1, setSteps1] = useState(8); // n
    const [rhythm1Subdivision, setRhythm1Subdivision] = useState('8n'); // Tone.js subdivision
    const [rhythm1Pattern, setRhythm1Pattern] = useState(() => generateEuclideanPattern(5, 8)); // Generated pattern
    const [activeStep1, setActiveStep1] = useState(-1); // For visual feedback

    // Rhythm 2 State (Snare)
    const [beats2, setBeats2] = useState(3); // k
    const [steps2, setSteps2] = useState(7); // n
    const [rhythm2Subdivision, setRhythm2Subdivision] = useState('8n'); // Tone.js subdivision
    const [rhythm2Pattern, setRhythm2Pattern] = useState(() => generateEuclideanPattern(3, 7)); // Generated pattern
    const [activeStep2, setActiveStep2] = useState(-1); // For visual feedback


    // Effect to generate rhythm patterns when beats/steps change
    useEffect(() => {
        setRhythm1Pattern(generateEuclideanPattern(beats1, steps1));
    }, [beats1, steps1]);

    useEffect(() => {
        setRhythm2Pattern(generateEuclideanPattern(beats2, steps2));
    }, [beats2, steps2]);


    // Function to initialize Tone.js nodes (Samplers and Sequences)
    // This function runs when global audio context is ready, or when core rhythm params change
    const initAudioNodes = useCallback(async () => {
        // If already initialized or currently loading, skip to prevent re-creation issues
        if (hasInitializedRef.current || isAudioLoadingRef.current) {
            console.log('useEuclideanSequencer: initAudioNodes: already initialized or loading, skipping init.');
            return;
        }

        if (!isAudioGloballyReady) {
            console.log('useEuclideanSequencer: AudioContext not globally ready, cannot initialize nodes.');
            return;
        }

        isAudioLoadingRef.current = true; // Set loading state
        console.log('useEuclideanSequencer: Proceeding with initialization of audio nodes and loading samples...');

        try {
            // Dispose existing nodes to prevent multiple instances on re-runs (e.g., if dependencies change)
            if (kickSamplerRef.current) kickSamplerRef.current.dispose();
            if (snareSamplerRef.current) snareSamplerRef.current.dispose();
            if (sequence1Ref.current) sequence1Ref.current.dispose();
            if (sequence2Ref.current) sequence2Ref.current.dispose();
            
            // Stop and clear Tone.Transport to ensure a clean slate for new sequences
            Tone.Transport.stop(); 
            Tone.Transport.cancel(); 

            // Create Samplers for drum sounds
            const kickSampler = new Tone.Sampler({
                urls: { C3: KICK_MP3_PATH },
                onload: () => console.log('Kick sample loaded.'),
                onerror: (e) => console.error('Error loading kick sample:', e),
            }).toDestination();

            const snareSampler = new Tone.Sampler({
                urls: { C3: SNARE_MP3_PATH },
                onload: () => console.log('Snare sample loaded.'),
                onerror: (e) => console.error('Error loading snare sample:', e),
            }).toDestination();

            // Wait for both samplers to be loaded
            await Promise.all([kickSampler.loaded, snareSampler.loaded]);
            console.log('useEuclideanSequencer: All samples loaded successfully.');

            kickSamplerRef.current = kickSampler;
            snareSamplerRef.current = snareSampler;

            // Initialize Tone.Transport
            Tone.Transport.bpm.value = bpm;
            Tone.Transport.loop = true;
            // Set loopEnd to the least common multiple of the steps, or a sufficiently large measure
            // For simplicity in this demo, let's just make it loop a few measures long,
            // or dynamically calculate based on the current steps and subdivision.
            // For '8n' subdivision, a loopEnd of '2m' (2 measures) is 16 eighth notes, enough for patterns up to 16 steps.
            Tone.Transport.loopEnd = '2m';

            // Create and start Sequences
            const sequence1 = new Tone.Sequence((time, stepIndex) => {
                // Trigger kick if the current step in the pattern is active
                if (rhythm1Pattern[stepIndex]) {
                    kickSamplerRef.current.triggerAttackRelease("C3", rhythm1Subdivision, time);
                }
                // Update active step for visualizer. Use Tone.Draw to schedule UI updates.
                Tone.Draw.schedule(() => {
                    setActiveStep1(stepIndex);
                }, time);
            }, Array.from({ length: steps1 }, (_, i) => i), rhythm1Subdivision); // Events are just indices 0 to steps-1

            const sequence2 = new Tone.Sequence((time, stepIndex) => {
                // Trigger snare if the current step in the pattern is active
                if (rhythm2Pattern[stepIndex]) {
                    snareSamplerRef.current.triggerAttackRelease("C3", rhythm2Subdivision, time);
                }
                // Update active step for visualizer
                Tone.Draw.schedule(() => {
                    setActiveStep2(stepIndex);
                }, time);
            }, Array.from({ length: steps2 }, (_, i) => i), rhythm2Subdivision);

            // Start sequences at the very beginning of the transport (they only play when Transport starts)
            sequence1.start(0);
            sequence2.start(0);

            sequence1Ref.current = sequence1;
            sequence2Ref.current = sequence2;

            setIsAudioReady(true); // Set ready only after all async operations
            hasInitializedRef.current = true;
            isAudioLoadingRef.current = false; // Reset loading state
            console.log('useEuclideanSequencer: Audio nodes initialized and connected.');

        } catch (error) {
            console.error("useEuclideanSequencer: Error initializing audio nodes or loading samples:", error);
            setIsAudioReady(false);
            hasInitializedRef.current = false;
            isAudioLoadingRef.current = false; // Reset loading state on error
            // Ensure any partially created nodes are disposed on error
            if (kickSamplerRef.current) { kickSamplerRef.current.dispose(); kickSamplerRef.current = null; }
            if (snareSamplerRef.current) { snareSamplerRef.current.dispose(); snareSamplerRef.current = null; }
            if (sequence1Ref.current) { sequence1Ref.current.dispose(); sequence1Ref.current = null; }
            if (sequence2Ref.current) { sequence2Ref.current.dispose(); sequence2Ref.current = null; }
        }
    }, [
        isAudioGloballyReady, bpm, // BPM is part of transport init
        rhythm1Pattern, rhythm1Subdivision, steps1, // Dependencies for sequence 1 setup
        rhythm2Pattern, rhythm2Subdivision, steps2  // Dependencies for sequence 2 setup
    ]);


    // Function to dispose all Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log('useEuclideanSequencer: disposeAudioNodes called.');
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
        console.log('useEuclideanSequencer: Audio nodes disposed.');
    }, []);


    // Effect for global audio context readiness and initialization/disposal
    useEffect(() => {
        console.log(`useEuclideanSequencer Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
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
            console.log('useEuclideanSequencer Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes]);


    // Effect for BPM changes (smoothly ramp to new BPM)
    useEffect(() => {
        if (Tone.Transport && Tone.Transport.bpm && isAudioReady) {
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
        }
    }, [isPlaying, isAudioGloballyReady, isAudioReady, startGlobalAudio, initAudioNodes]);


    // Return all necessary states and setters
    return {
        isPlaying, togglePlay,
        isAudioReady, isAudioLoading: isAudioLoadingRef.current, // Expose loading status
        bpm, setBpm,
        beats1, setBeats1, steps1, setSteps1, rhythm1Subdivision, setRhythm1Subdivision, rhythm1Pattern, activeStep1,
        beats2, setBeats2, steps2, setSteps2, rhythm2Subdivision, setRhythm2Subdivision, rhythm2Pattern, activeStep2,
    };
};
// --- End useEuclideanSequencer Hook ---


// --- RhythmControls Component ---
const RhythmControls = ({
    label,
    beats, setBeats,
    steps, setSteps,
    pattern,
    activeStep,
    colorClass,
    isAudioReady
}) => {
    // Handlers for changing beats and steps
    const handleBeatsChange = useCallback((e) => {
        if (!isAudioReady) return;
        setBeats(parseInt(e.target.value, 10));
    }, [setBeats, isAudioReady]);

    const handleStepsChange = useCallback((e) => {
        if (!isAudioReady) return;
        const newSteps = parseInt(e.target.value, 10);
        // Ensure steps is at least 1 and within a reasonable range (e.g., 2-16)
        // Also ensure beats does not exceed newSteps
        if (!isNaN(newSteps) && newSteps >= 1 && newSteps <= 16) {
            setSteps(newSteps);
            if (beats > newSteps) {
                setBeats(newSteps); // Adjust beats if it exceeds new steps
            }
        }
    }, [beats, setBeats, setSteps, isAudioReady]);

    return (
        <div className="flex flex-col items-center p-6 bg-white rounded-xl shadow-lg border border-gray-100 w-full">
            <h3 className={`text-2xl font-bold mb-4 ${colorClass}`}>{label}</h3>

            {/* Steps and Beats Controls */}
            <div className="flex flex-col gap-4 w-full">
                <div className="flex flex-col items-center">
                    <label htmlFor={`${label}-steps`} className="text-gray-800 font-medium mb-1">Total Steps: {steps}</label>
                    <input
                        id={`${label}-steps`}
                        type="range"
                        min="2"
                        max="16"
                        step="1"
                        value={steps}
                        onChange={handleStepsChange}
                        className="w-full accent-blue-500 h-2 rounded-lg appearance-none cursor-pointer bg-blue-100"
                        disabled={!isAudioReady}
                    />
                </div>

                <div className="flex flex-col items-center">
                    <label htmlFor={`${label}-beats`} className="text-gray-800 font-medium mb-1">Beats: {beats}</label>
                    <input
                        id={`${label}-beats`}
                        type="range"
                        min="1"
                        max={steps} // Max beats can't exceed steps
                        step="1"
                        value={beats}
                        onChange={handleBeatsChange}
                        className="w-full accent-green-500 h-2 rounded-lg appearance-none cursor-pointer bg-green-100"
                        disabled={!isAudioReady}
                    />
                </div>
            </div>

            {/* Visual Grid of the Pattern */}
            <div className="grid gap-1 mt-6 w-full" style={{ gridTemplateColumns: `repeat(${steps}, minmax(0, 1fr))` }}>
                {pattern.map((isBeat, index) => (
                    <div
                        key={index}
                        className={`w-8 h-8 rounded-full transition-all duration-100 flex items-center justify-center text-sm font-bold
                            ${isBeat ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-800'}
                            ${activeStep === index ? 'border-2 border-yellow-400 transform scale-110 shadow-lg' : 'border-0'}
                            ${!isAudioReady ? 'opacity-50' : ''}
                        `}
                        // For a pure display, no onClick needed, but can add if user can tap to toggle beats
                        title={isBeat ? `Beat ${index + 1}` : `Rest ${index + 1}`}
                    >
                        {index + 1}
                    </div>
                ))}
            </div>
        </div>
    );
};
// --- End RhythmControls Component ---


// --- EuclideanRhythmGeneratorContent (Main UI Logic) ---
const EuclideanRhythmGeneratorContent = () => {
    const {
        isPlaying, togglePlay,
        isAudioReady, isAudioLoading,
        bpm, setBpm,
        beats1, setBeats1, steps1, setSteps1, rhythm1Pattern, activeStep1,
        beats2, setBeats2, steps2, setSteps2, rhythm2Pattern, activeStep2,
    } = useEuclideanSequencer();

    return (
        <div
            className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
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

            <div className="text-center mb-6 md:mb-10 z-10 w-full px-2">
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                    <Shuffle size={36} className="text-green-700 md:mb-0 mb-2" />
                    <h1 className="text-3xl md:text-5xl font-extrabold text-green-900 drop-shadow-lg">
                        Euclidean Rhythm Generator
                    </h1>
                </div>
                {!isAudioReady && !isAudioLoading && (
                    <p className="text-green-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                        Click "Play Rhythms" to activate audio and begin.
                    </p>
                )}
                {isAudioLoading && (
                    <p className="text-green-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                        Loading drum samples... Please wait.
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-xl shadow-lg w-full max-w-5xl flex flex-col items-center space-y-4 md:space-y-8 z-10 border border-green-200 mx-2">

                {/* Global Controls: Play/Pause, BPM */}
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mb-4 md:mb-6 w-full">
                    <button
                        type="button"
                        onClick={togglePlay}
                        className={`px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 w-full md:w-auto
                                ${isPlaying
                                ? 'bg-green-700 hover:bg-green-800 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'}
                                ${(!isAudioReady && !isPlaying) || isAudioLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        disabled={isAudioLoading}
                    >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                        {isPlaying ? "Stop" : "Play Rhythms"}
                    </button>

                    <div className="flex flex-col items-center w-full md:w-auto">
                        <label className="text-green-800 font-medium mb-1 md:mb-2 text-sm md:text-base">
                            BPM: {bpm.toFixed(0)}
                        </label>
                        <input
                            type="range"
                            min="60"
                            max="240"
                            step="1"
                            value={bpm}
                            onChange={(e) => setBpm(parseFloat(e.target.value))}
                            className="w-full md:w-48 accent-green-600 h-2 rounded-lg appearance-none cursor-pointer bg-green-100"
                            disabled={!isAudioReady}
                        />
                    </div>
                </div>

                {/* Euclidean Rhythm Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 w-full mt-4 md:mt-8">
                    {/* Rhythm 1 Controls */}
                    <RhythmControls
                        label="Rhythm 1 (Kick)"
                        beats={beats1} setBeats={setBeats1}
                        steps={steps1} setSteps={setSteps1}
                        pattern={rhythm1Pattern}
                        activeStep={activeStep1}
                        colorClass="text-purple-700"
                        isAudioReady={isAudioReady}
                    />

                    {/* Rhythm 2 Controls */}
                    <RhythmControls
                        label="Rhythm 2 (Snare)"
                        beats={beats2} setBeats={setBeats2}
                        steps={steps2} setSteps={setSteps2}
                        pattern={rhythm2Pattern}
                        activeStep={activeStep2}
                        colorClass="text-indigo-700"
                        isAudioReady={isAudioReady}
                    />
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
        console.error("Uncaught error in EuclideanRhythmGenerator:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Euclidean Rhythm Generator. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export wrapping the main content with AudioContextProvider and ErrorBoundary
const EuclideanRhythmGenerator = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <EuclideanRhythmGeneratorContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default EuclideanRhythmGenerator;
