import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Repeat, Zap } from 'lucide-react'; // Icons for play/pause, repeat, and glitch

// Define the path to a drum loop sample. This is a placeholder.
// You'll need to provide an actual drum loop MP3 file at this path for sound.
const DRUM_LOOP_MP3_PATH = '/drum_samples/drum-loop.mp3';

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


// --- useBeatRepeatSynth Hook ---
const useBeatRepeatSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const playerRef = useRef(null); // The main audio player for the loop
    const pitchShiftRef = useRef(null); // For pitch shift effect
    const filterRef = useRef(null); // For filter effect
    const loopRef = useRef(null); // The Tone.Loop instance
    const hasInitializedRef = useRef(false); // Tracks if Tone.js nodes have been created
    const isAudioLoadingRef = useRef(false); // Tracks if audio samples are currently loading

    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false); // True when context is running AND samples loaded

    // Default values for parameters
    const DEFAULT_LOOP_INTERVAL = '8n';
    const DEFAULT_SLICE_DURATION = 0.2;
    const DEFAULT_START_OFFSET = 0.0;
    const DEFAULT_PITCH_SHIFT_VALUE = 0;
    const DEFAULT_FILTER_FREQ = 20000;
    const DEFAULT_FILTER_Q = 1;

    // Beat Repeat Parameters (States that trigger UI updates)
    const [loopInterval, setLoopInterval] = useState(DEFAULT_LOOP_INTERVAL);
    const [sliceDuration, setSliceDuration] = useState(DEFAULT_SLICE_DURATION);
    const [startOffset, setStartOffset] = useState(DEFAULT_START_OFFSET);
    const [pitchShiftValue, setPitchShiftValue] = useState(DEFAULT_PITCH_SHIFT_VALUE);
    const [filterFreq, setFilterFreq] = useState(DEFAULT_FILTER_FREQ);
    const [filterQ, setFilterQ] = useState(DEFAULT_FILTER_Q);

    // Refs for parameters directly used in Tone.Loop callback to avoid recreating the loop
    // These refs are updated by the useEffect below
    const sliceDurationRef = useRef(sliceDuration);
    const startOffsetRef = useRef(startOffset);

    // Update refs whenever corresponding states change
    useEffect(() => { sliceDurationRef.current = sliceDuration; }, [sliceDuration]);
    useEffect(() => { startOffsetRef.current = startOffset; }, [startOffset]);


    // Function to initialize Tone.js nodes (Player, Effects, Loop)
    const initAudioNodes = useCallback(async () => {
        if (hasInitializedRef.current || isAudioLoadingRef.current) {
            console.log('useBeatRepeatSynth: initAudioNodes: already initialized or loading, skipping init.');
            return;
        }

        if (!isAudioGloballyReady) {
            console.log('useBeatRepeatSynth: AudioContext not globally ready, cannot initialize nodes.');
            return;
        }

        isAudioLoadingRef.current = true; // Set loading state
        console.log('useBeatRepeatSynth: Proceeding with initialization of audio nodes and loading MP3...');

        try {
            // Dispose existing nodes to prevent multiple instances
            if (playerRef.current) playerRef.current.dispose();
            if (pitchShiftRef.current) pitchShiftRef.current.dispose();
            if (filterRef.current) filterRef.current.dispose();
            if (loopRef.current) loopRef.current.dispose();
            Tone.Transport.stop(); // Stop transport to ensure clean re-initialization
            Tone.Transport.cancel(); // Clear all scheduled events

            // Create Tone.Player for the drum loop
            const player = new Tone.Player({
                url: DRUM_LOOP_MP3_PATH,
                loop: true, // The player itself loops, but we'll control individual slices with Tone.Loop
                autostart: false,
                volume: -10 // Adjust volume
            });
            // Await the 'loaded' promise after creating the player
            await player.loaded;
            console.log('useBeatRepeatSynth: Drum loop loaded successfully.');

            // Create effects with proper constructor arguments (using objects for clarity and correctness)
            const pitchShift = new Tone.PitchShift({ pitch: pitchShiftValue });
            const filter = new Tone.Filter({
                frequency: filterFreq,
                type: "lowpass",
                Q: filterQ, // Q is a property within the options object for Tone.Filter constructor
            });

            // Chain: Player -> PitchShift -> Filter -> Destination
            player.chain(pitchShift, filter, Tone.Destination);

            // Store references
            playerRef.current = player;
            pitchShiftRef.current = pitchShift;
            filterRef.current = filter;

            // Initialize Tone.Loop for triggering beat repeats
            const loop = new Tone.Loop((time) => {
                // Ensure player is loaded before attempting to start a segment
                if (playerRef.current && playerRef.current.loaded) {
                    const bufferDuration = playerRef.current.buffer.duration;
                    const currentOffset = startOffsetRef.current * bufferDuration; // Calculate actual offset in seconds
                    const currentSliceDuration = sliceDurationRef.current; // Get current slice duration

                    // Trigger a segment of the player
                    playerRef.current.start(time, currentOffset, currentSliceDuration);
                }
            }, loopInterval); // Initial loop interval, this will be updated by useEffect

            loop.start(0); // Start the loop at the beginning of the transport (won't play until Transport starts)
            loopRef.current = loop;

            // Initialize Tone.Transport (if not already done implicitly by Tone.js)
            Tone.Transport.loop = true;
            Tone.Transport.loopEnd = '1m'; // Loop the transport to keep things running for the loop
            // Tone.Transport.bpm is not explicitly used here as loop interval controls speed,
            // but keep for consistency with other explorers or future expansion.
            Tone.Transport.bpm.value = 120;


            setIsAudioReady(true); // Set ready only after all async operations
            hasInitializedRef.current = true;
            isAudioLoadingRef.current = false; // Reset loading state
            console.log('useBeatRepeatSynth: Audio nodes initialized and connected.');

        } catch (error) {
            console.error("useBeatRepeatSynth: Error initializing audio nodes or loading MP3:", error);
            setIsAudioReady(false);
            hasInitializedRef.current = false;
            isAudioLoadingRef.current = false; // Reset loading state on error
            // Ensure any partially created nodes are disposed on error
            if (playerRef.current) { playerRef.current.dispose(); playerRef.current = null; }
            if (pitchShiftRef.current) { pitchShiftRef.current.dispose(); pitchShiftRef.current = null; }
            if (filterRef.current) { filterRef.current.dispose(); filterRef.current = null; }
            if (loopRef.current) { loopRef.current.dispose(); loopRef.current = null; }
        }
    }, [isAudioGloballyReady, DEFAULT_LOOP_INTERVAL, DEFAULT_PITCH_SHIFT_VALUE, DEFAULT_FILTER_FREQ, DEFAULT_FILTER_Q]); // Dependencies for initial setup using defaults


    // Function to dispose all Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log('useBeatRepeatSynth: disposeAudioNodes called.');
        Tone.Transport.stop(); // Stop the transport first
        Tone.Transport.cancel(); // Clear all scheduled events on transport

        if (playerRef.current) {
            playerRef.current.stop();
            playerRef.current.dispose();
            playerRef.current = null;
        }
        if (pitchShiftRef.current) {
            pitchShiftRef.current.dispose();
            pitchShiftRef.current = null;
        }
        if (filterRef.current) {
            filterRef.current.dispose();
            filterRef.current = null;
        }
        if (loopRef.current) {
            loopRef.current.dispose();
            loopRef.current = null;
        }

        setIsPlaying(false);
        setIsAudioReady(false);
        hasInitializedRef.current = false;
        isAudioLoadingRef.current = false;
        console.log('useBeatRepeatSynth: Audio nodes disposed.');
    }, []);

    // Effect for global audio context readiness and initialization/disposal
    useEffect(() => {
        console.log(`useBeatRepeatSynth Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
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
            console.log('useBeatRepeatSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes]);


    // Effect to update effects parameters with smooth transitions where applicable
    // This useEffect now explicitly updates Tone.Loop's interval.
    useEffect(() => {
        if (pitchShiftRef.current && isAudioReady) {
            pitchShiftRef.current.pitch = pitchShiftValue; // PitchShift's pitch is a direct property
        }
        if (filterRef.current && isAudioReady) {
            filterRef.current.frequency.rampTo(filterFreq, 0.1); // Smooth transition
            filterRef.current.Q.rampTo(filterQ, 0.1); // Smooth transition
        }
        if (loopRef.current && isAudioReady) {
            loopRef.current.interval = loopInterval; // Update loop interval here
        }
    }, [loopInterval, pitchShiftValue, filterFreq, filterQ, isAudioReady]);


    // Toggles global playback (Tone.Transport)
    const togglePlay = useCallback(async () => {
        console.log('togglePlay called. isPlaying:', isPlaying, 'isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady, 'isAudioLoadingRef:', isAudioLoadingRef.current);

        if (!isAudioGloballyReady) {
            console.log('togglePlay: AudioContext not globally ready, attempting to start global audio...');
            await startGlobalAudio();
            await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for state propagation
        }

        // Re-check global audio readiness and initialization status after potential async operations
        if (Tone.context.state === 'running' && !hasInitializedRef.current && !isAudioLoadingRef.current) {
            console.log('togglePlay: Global audio ready but local nodes not initialized. Attempting to initialize them now...');
            await initAudioNodes();
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Only proceed if audio is fully ready
        if (isAudioReady) {
            try {
                if (isPlaying) {
                    Tone.Transport.pause(); // Pause transport
                    setIsPlaying(false);
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
        setLoopInterval(DEFAULT_LOOP_INTERVAL);
        setSliceDuration(DEFAULT_SLICE_DURATION);
        setStartOffset(DEFAULT_START_OFFSET);
        setPitchShiftValue(DEFAULT_PITCH_SHIFT_VALUE);
        setFilterFreq(DEFAULT_FILTER_FREQ);
        setFilterQ(DEFAULT_FILTER_Q);

        // 4. Re-initialize audio nodes with these default parameters
        // The useEffect that watches isAudioGloballyReady will call initAudioNodes when hasInitializedRef.current is false.
        // We'll give it a moment to propagate, then ensure init if needed.
        if (isAudioGloballyReady) {
            await initAudioNodes(); // Explicitly re-initialize after setting defaults
        }

        console.log('useBeatRepeatSynth: All parameters reset to default.');
    }, [
        isPlaying, disposeAudioNodes,
        setLoopInterval, setSliceDuration, setStartOffset,
        setPitchShiftValue, setFilterFreq, setFilterQ,
        isAudioGloballyReady, initAudioNodes, // Added initAudioNodes to dependencies
        DEFAULT_LOOP_INTERVAL, DEFAULT_SLICE_DURATION, DEFAULT_START_OFFSET,
        DEFAULT_PITCH_SHIFT_VALUE, DEFAULT_FILTER_FREQ, DEFAULT_FILTER_Q
    ]);


    // Return all necessary states and setters
    return {
        isPlaying, togglePlay,
        isAudioReady, isAudioLoading: isAudioLoadingRef.current, // Expose loading status
        loopInterval, setLoopInterval,
        sliceDuration, setSliceDuration,
        startOffset, setStartOffset,
        pitchShiftValue, setPitchShiftValue,
        filterFreq, setFilterFreq,
        filterQ, setFilterQ,
        resetParameters, // Expose the reset function
    };
};
// --- End useBeatRepeatSynth Hook ---


// --- ParameterSlider Component ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '', isAudioReady }) => (
    <div className="flex flex-col items-center w-full">
        <label className="text-gray-800 font-medium mb-2">{label}: {typeof value === 'number' ? value.toFixed(value < 1 ? 3 : 1) : value}{unit}</label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setter(parseFloat(e.target.value))}
            className="w-full accent-blue-600 h-2 rounded-lg appearance-none cursor-pointer bg-blue-100"
            disabled={!isAudioReady}
        />
        <p className="text-gray-700 text-sm mt-1 italic text-center">{explanation}</p>
    </div>
);
// --- End ParameterSlider Component ---


// --- BeatRepeatLooperContent (Main UI Logic) ---
const BeatRepeatLooperContent = () => {
    const {
        isPlaying, togglePlay,
        isAudioReady, isAudioLoading,
        loopInterval, setLoopInterval,
        sliceDuration, setSliceDuration,
        startOffset, setStartOffset,
        pitchShiftValue, setPitchShiftValue,
        filterFreq, setFilterFreq,
        filterQ, setFilterQ,
        resetParameters,
    } = useBeatRepeatSynth();

    const getExplanation = (param) => {
        switch (param) {
            case 'loopInterval': return "How often each sliced segment is triggered. Faster intervals create more intense stuttering.";
            case 'sliceDuration': return "Length of the audio segment (slice) to be repeated from the original loop.";
            case 'startOffset': return "Starting point within the audio loop (0 = beginning, 1 = end).";
            case 'pitchShift': return "Shifts pitch of repeated segments in semitones (+ higher, - lower).";
            case 'filterFreq': return "Cutoff frequency for the filter applied to repeated segments.";
            case 'filterQ': return "Resonance of the filter. Higher values create more pronounced peaks.";
            default: return "Manipulate the loop to create rhythmic glitches and unique textures!";
        }
    };

    const intervalOptions = [
        { value: '1n', label: '1 Whole' },
        { value: '2n', label: '1/2 Note' },
        { value: '4n', label: '1/4 Note' },
        { value: '8n', label: '1/8 Note' },
        { value: '16n', label: '1/16 Note' },
        { value: '32n', label: '1/32 Note' },
    ];

    return (
        <div
            className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #f0f8ff 0%, #e6f2ff 50%, #d9e6ff 100%)',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Floating Icons Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%239ca3af' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            <div className="text-center mb-6 md:mb-10 z-10 w-full px-2">
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                    <Repeat size={36} className="text-blue-700 md:mb-0 mb-2" />
                    <h1 className="text-3xl md:text-5xl font-extrabold text-blue-900 drop-shadow-lg">
                        Beat Repeat / Glitch Looper
                    </h1>
                </div>
                {!isAudioReady && !isAudioLoading && (
                    <p className="text-blue-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                        Click "Play Drum Loop" to activate audio.
                    </p>
                )}
                {isAudioLoading && (
                    <p className="text-blue-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                        Loading drum loop... Please wait.
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col items-center space-y-4 md:space-y-8 z-10 border border-blue-200 mx-2">

                {/* Play/Pause and Reset Buttons */}
                <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 mb-4 md:mb-6 w-full">
                    <button
                        type="button"
                        onClick={togglePlay}
                        className={`px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 w-full
                                    ${isPlaying
                                    ? 'bg-blue-700 hover:bg-blue-800 text-white'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'}
                                    ${(!isAudioReady && !isPlaying) || isAudioLoading ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        disabled={isAudioLoading}
                    >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                        {isPlaying ? "Stop Loop" : "Play Loop"}
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

                {/* Beat Repeat Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full mt-4 md:mt-8">
                    {/* Loop Interval */}
                    <div className="flex flex-col items-center">
                        <label className="text-gray-800 font-medium mb-1 md:mb-2 text-sm md:text-base">
                            Repeat Interval: {intervalOptions.find(opt => opt.value === loopInterval)?.label}
                        </label>
                        <select
                            value={loopInterval}
                            onChange={(e) => setLoopInterval(e.target.value)}
                            className="w-full p-2 text-sm md:text-base rounded-md bg-blue-100 text-gray-800 border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!isAudioReady}
                        >
                            {intervalOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <p className="text-gray-700 text-xs md:text-sm mt-1 italic text-center">{getExplanation('loopInterval')}</p>
                    </div>

                    {/* Slice Duration */}
                    <ParameterSlider
                        label="Slice Duration" value={sliceDuration} setter={setSliceDuration}
                        min="0.01" max="1.0" step="0.01" unit=" s"
                        explanation={getExplanation('sliceDuration')}
                        isAudioReady={isAudioReady}
                    />

                    {/* Start Offset */}
                    <ParameterSlider
                        label="Start Offset" value={startOffset} setter={setStartOffset}
                        min="0.0" max="1.0" step="0.01"
                        explanation={getExplanation('startOffset')}
                        isAudioReady={isAudioReady}
                    />

                    {/* Pitch Shift */}
                    <ParameterSlider
                        label="Pitch Shift" value={pitchShiftValue} setter={setPitchShiftValue}
                        min="-24" max="24" step="1" unit=" st"
                        explanation={getExplanation('pitchShift')}
                        isAudioReady={isAudioReady}
                    />

                    {/* Filter Frequency */}
                    <ParameterSlider
                        label="Filter Cutoff" value={filterFreq} setter={setFilterFreq}
                        min="20" max="20000" step="10" unit=" Hz"
                        explanation={getExplanation('filterFreq')}
                        isAudioReady={isAudioReady}
                    />

                    {/* Filter Q */}
                    <ParameterSlider
                        label="Filter Q" value={filterQ} setter={setFilterQ}
                        min="0.1" max="20" step="0.1"
                        explanation={getExplanation('filterQ')}
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
        console.error("Uncaught error in BeatRepeatLooper:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Beat Repeat Looper. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export wrapping the main content with AudioContextProvider and ErrorBoundary
const BeatRepeatLooper = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <BeatRepeatLooperContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default BeatRepeatLooper;
