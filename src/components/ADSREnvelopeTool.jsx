import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Waves, Ruler } from 'lucide-react'; // Icons for play/pause, waveform, and ruler for envelope
import SEOHead from './SEOHead';

// Define the tool object for SEO structured data
const adsrEnvelopeTool = {
    id: 'adsr-envelope-tool',
    name: 'ADSR Envelope',
    description: 'Visual ADSR envelope editor for precise sound shaping and synthesis control.',
    path: '/adsr-envelope-tool',
    categories: [
        'Sound Design',
        'Synthesis',
        'ADSR',
        'Envelope',
        'Sound Shaping'
    ]
};


// --- AUDIO CONTEXT ---
// This context manages the global Tone.js audio state.
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);

    // Function to start Tone.js audio context
    const startGlobalAudio = useCallback(async () => {
        // Only attempt to start if not already running
        if (Tone.context.state === 'running') {
            setIsAudioGloballyReady(true);
            console.log('AudioContext: Tone.js context already running.');
            return;
        }

        try {
            console.log('AudioContext: Attempting to start global Tone.js context...');
            await Tone.start();

            // Double-check state after starting
            if (Tone.context.state === 'running') {
                setIsAudioGloballyReady(true);
                console.log('AudioContext: Tone.js context started successfully');
            } else {
                console.warn('AudioContext: Tone.js context did not start properly (state is ' + Tone.context.state + ')');
                setIsAudioGloballyReady(false);
            }
        } catch (error) {
            console.error("AudioContext: Error starting Tone.js context:", error);
            setIsAudioGloballyReady(false);
        }
    }, []);

    // Effect to observe Tone.js context state changes
    useEffect(() => {
        const handleToneContextChange = () => {
            const newState = Tone.context.state === 'running';
            if (newState !== isAudioGloballyReady) {
                console.log(`AudioContext: Tone.context state changed to '${Tone.context.state}'. isAudioGloballyReady set to ${newState}.`);
                setIsAudioGloballyReady(newState);
            }
        };

        // Add listener for state changes
        Tone.context.on('statechange', handleToneContextChange);
        handleToneContextChange(); // Initial check on mount

        return () => {
            // Clean up listener on unmount
            console.log('AudioContext: Cleaning up Tone.context statechange listener.');
            Tone.context.off('statechange', handleToneContextChange);
        };
    }, [isAudioGloballyReady]); // Added isAudioGloballyReady to dependencies to prevent stale closure issues with handleToneContextChange

    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, startGlobalAudio }}>
            {children}
        </AudioContext.Provider>
    );
};
// --- END AUDIO CONTEXT ---


// --- useADSREnvelopeSynth Hook ---
const useADSREnvelopeSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const synthRef = useRef(null); // Will hold the Tone.Synth
    const isSynthInitializedRef = useRef(false); // New ref to track if synth is initialized

    const [isPlaying, setIsPlaying] = useState(false); // Indicates if the note is currently sustaining or releasing
    const [attack, setAttack] = useState(0.1); // Attack time in seconds
    const [decay, setDecay] = useState(0.2); // Decay time in seconds
    const [sustain, setSustain] = useState(0.5); // Sustain level (0-1)
    const [release, setRelease] = useState(0.5); // Release time in seconds

    const [isAudioReady, setIsAudioReady] = useState(false); // True when context is running AND synth initialized
    const [isLoading, setIsLoading] = useState(true); // Initially loading until synth is set up

    const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0); // Current elapsed playback time
    const currentTotalPlaybackDurationRef = useRef(0); // NEW REF for total duration for smooth updates
    const playbackIntervalId = useRef(null); // Ref to store setInterval ID for cleanup

    // Function to dispose all Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log('useADSREnvelopeSynth: disposeAudioNodes called.');
        if (synthRef.current) {
            synthRef.current.dispose();
            synthRef.current = null;
        }

        // Clear any active timer when disposing
        if (playbackIntervalId.current) {
            clearInterval(playbackIntervalId.current);
            playbackIntervalId.current = null;
        }

        setIsPlaying(false);
        setIsAudioReady(false); // Set to false when disposing
        isSynthInitializedRef.current = false; // Reset initialized flag
        setCurrentPlaybackTime(0); // Reset timer
        currentTotalPlaybackDurationRef.current = 0; // Reset ref
        console.log('useADSREnvelopeSynth: Audio nodes disposed.');
    }, []);

    // Effect to initialize Tone.js Synth once
    useEffect(() => {
        const setupAudio = async () => {
            if (isSynthInitializedRef.current) {
                console.log('useADSREnvelopeSynth: Audio setup already completed, skipping.');
                setIsLoading(false); // Ensure loading is false if already set up
                return;
            }

            console.log('useADSREnvelopeSynth: Setting up Tone.Synth...');
            setIsLoading(true); // Indicate setup is happening

            try {
                disposeAudioNodes(); // Ensure a clean slate

                // Create Tone.Synth directly
                const synth = new Tone.Synth({
                    oscillator: { type: 'sine' }, // Use a sine wave as the source
                    envelope: {
                        attack: attack, // Initial values (these will be updated by a separate effect)
                        decay: decay,
                        sustain: sustain,
                        release: release,
                    }
                }).toDestination(); // Connect synth directly to output

                synthRef.current = synth;
                isSynthInitializedRef.current = true; // Mark synth as initialized
                console.log('useADSREnvelopeSynth: Tone.Synth created and connected.');

            } catch (error) {
                console.error("useADSREnvelopeSynth: Error during initial Tone.Synth setup:", error);
                setIsAudioReady(false);
                isSynthInitializedRef.current = false; // Ensure this is false on error
                disposeAudioNodes(); // Clean up on error
            } finally {
                setIsLoading(false); // Always turn off loading after attempt
            }
        };

        setupAudio();

        // Cleanup on unmount
        return () => {
            console.log('useADSREnvelopeSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, []); // Empty dependency array: runs only once on mount


    // Effect to update isAudioReady based on global audio and synth initialization status
    useEffect(() => {
        // isAudioReady means both the global context is running AND the synth instance is ready.
        // It's used to determine if the *sound can actually be produced*.
        const currentAudioReady = isAudioGloballyReady && isSynthInitializedRef.current;
        if (currentAudioReady !== isAudioReady) {
            setIsAudioReady(currentAudioReady);
            console.log(`useADSREnvelopeSynth: isAudioGloballyReady: ${isAudioGloballyReady}, isSynthInitialized: ${isSynthInitializedRef.current} => isAudioReady: ${currentAudioReady}`);
        }
    }, [isAudioGloballyReady, isSynthInitializedRef.current, isAudioReady]); // Added isAudioReady to dependencies to prevent infinite loop

    // Effect to update Synth envelope parameters when their state changes (for smooth adjustment)
    useEffect(() => {
        // Only update if the synth instance exists and is initialized to prevent errors
        // We do NOT check isAudioReady here, as envelope parameters should update even if context is suspended.
        if (synthRef.current && isSynthInitializedRef.current) {
            console.log(`useADSREnvelopeSynth: Updating envelope parameters - A:${attack}, D:${decay}, S:${sustain}, R:${release}`);
            synthRef.current.envelope.attack = attack;
            synthRef.current.envelope.decay = decay;
            synthRef.current.envelope.sustain = sustain;
            synthRef.current.envelope.release = release;
        }
    }, [attack, decay, sustain, release]);


    // Triggers the synth note with the current ADSR envelope
    const triggerNote = useCallback(async () => {
        console.log('triggerNote called. isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady, 'isLoading:', isLoading);

        // First, ensure the global audio context is running due to user interaction
        if (Tone.context.state !== 'running') {
            console.log('triggerNote: AudioContext is suspended, attempting to start global audio...');
            await startGlobalAudio(); // This will attempt to resume context on user click
            // After awaiting startGlobalAudio, re-check the context state
            if (Tone.context.state !== 'running') {
                console.warn('Audio context could not be started after user interaction. Cannot play note.');
                return; // Exit if audio context is still not running
            }
        }

        // Ensure synth is initialized and ready before proceeding
        // isAudioReady should be true if the global context just started.
        if (!isSynthInitializedRef.current || !synthRef.current || !isAudioReady) {
            console.warn('triggerNote: Audio system not fully ready (synth not initialized or context not running after attempt). Cannot trigger note.');
            // Only return if it's genuinely not ready after trying to start context
            if (!isAudioReady && Tone.context.state === 'running' && isSynthInitializedRef.current) {
                 // This specific case should ideally not happen if isAudioReady updates correctly.
                 // It means the state update from `isAudioGloballyReady` change might be delayed one render cycle.
                 // For now, let's allow it to proceed if the context is running and synth is initialized.
                 // The check `!isAudioReady` should already prevent this.
                 console.warn("Potential race condition: isAudioReady is false but context is running and synth is init. Proceeding.");
            } else {
                return;
            }
        }


        // If already playing, prevent re-triggering immediately
        if (isPlaying) {
            console.log('Note is already playing, ignoring triggerNote call.');
            return;
        }

        try {
            // Define how long the note is actively "held" (beyond attack and decay)
            // sustain * 8 scales the 0-1 sustain level to 0-8 seconds of hold time
            const sustainHoldTime = sustain * 8; 

            // Calculate the total actual audible duration including the release phase
            // Add a small buffer to ensure the timer runs for the full audible duration
            const totalSoundLength = attack + decay + sustainHoldTime + release + 0.1; 

            // Update the ref for total playback duration
            currentTotalPlaybackDurationRef.current = totalSoundLength;
            setCurrentPlaybackTime(0); // Reset current time for new playback

            // Clear any previous timer interval
            if (playbackIntervalId.current) {
                clearInterval(playbackIntervalId.current);
            }

            // Start timer for visual progress
            const startTime = Tone.now(); // Use Tone.now() for consistency
            playbackIntervalId.current = setInterval(() => {
                const elapsed = Tone.now() - startTime; // Use Tone.now() for consistency
                // Use the ref for the total duration
                setCurrentPlaybackTime(Math.min(elapsed, currentTotalPlaybackDurationRef.current));

                if (elapsed >= currentTotalPlaybackDurationRef.current) {
                    clearInterval(playbackIntervalId.current);
                    playbackIntervalId.current = null;
                }
            }, 50); // Update every 50ms for smoother progress bar

            // The note will be held for the sustainHoldTime, then released.
            const noteDurationForTrigger = attack + decay + sustainHoldTime; // Duration for triggerAttackRelease
            
            // Trigger the synth note
            // Play C4 for calculated duration, starting at Tone.now()
            synthRef.current.triggerAttackRelease("C4", noteDurationForTrigger, Tone.now()); 
            setIsPlaying(true);
            console.log('triggerNote: Synth note triggered.');

            // Schedule to update isPlaying state and stop timer when the full envelope completes
            // This schedule uses Tone.Transport for precise timing
            Tone.Transport.scheduleOnce(() => {
                setIsPlaying(false); // Update UI state
                console.log('triggerNote: Synth note finished playing after full ADSR cycle.');
                if (playbackIntervalId.current) {
                    clearInterval(playbackIntervalId.current);
                    playbackIntervalId.current = null;
                }
                // Ensure it shows max at end, using the ref for consistency
                setCurrentPlaybackTime(currentTotalPlaybackDurationRef.current);
            }, Tone.now() + totalSoundLength); // Schedule at the absolute end time of the sound

        } catch (e) {
            console.error("Error during synth note triggering:", e);
            setIsPlaying(false);
            // Ensure timer is cleared on error
            if (playbackIntervalId.current) {
                clearInterval(playbackIntervalId.current);
                playbackIntervalId.current = null;
            }
            setCurrentPlaybackTime(0);
            currentTotalPlaybackDurationRef.current = 0; // Reset ref
        }
    }, [isPlaying, isAudioReady, attack, decay, sustain, release, startGlobalAudio, isLoading]); // Added isLoading to dependencies

    // Function to immediately stop the note
    const stopNote = useCallback(() => {
        if (synthRef.current) {
            // Trigger an immediate release for the synth
            synthRef.current.triggerRelease(Tone.now());
            setIsPlaying(false); // Update UI state
            console.log('stopNote: Synth note stopped immediately.');

            // Clear timer and reset states
            if (playbackIntervalId.current) {
                clearInterval(playbackIntervalId.current);
                playbackIntervalId.current = null;
            }
            setCurrentPlaybackTime(0);
            currentTotalPlaybackDurationRef.current = 0; // Reset ref

        } else {
            console.warn('stopNote: Cannot stop note. Synth not initialized.');
        }
    }, []);

    return {
        isPlaying,
        triggerNote,
        stopNote, // Expose the stopNote function
        isAudioReady,
        isLoading, // Expose isLoading state
        attack, setAttack,
        decay, setDecay,
        sustain, setSustain,
        release, setRelease,
        totalPlaybackDuration: currentTotalPlaybackDurationRef.current, // Expose current value of ref
        currentPlaybackTime,  // Expose for UI
    };
};
// --- End useADSREnvelopeSynth Hook ---


// --- ParameterSlider Component (reused) ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '' }) => (
    <div className="flex flex-col items-center w-full">
        <label className="text-gray-800 font-medium mb-2 text-center">{label}: {typeof value === 'number' ? value.toFixed(value < 1 && value !== 0 ? 3 : 1) : value}{unit}</label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setter(parseFloat(e.target.value))}
            className="w-full accent-green-600 h-2 rounded-lg appearance-none cursor-pointer bg-green-100"
            // Slider should always be enabled, as it only changes state, not triggers audio directly
        />
        <p className="text-gray-700 text-sm mt-1 italic text-center px-2">{explanation}</p>
    </div>
);
// --- End ParameterSlider Component ---


// --- ADSREnvelopeToolContent (Main UI Logic) ---
const ADSREnvelopeToolContent = () => {
    const {
        isPlaying, triggerNote, stopNote,
        isAudioReady, // This now reflects if audio context is running AND synth is initialized
        isLoading, // This reflects if the synth itself is being initialized
        attack, setAttack,
        decay, setDecay,
        sustain, setSustain,
        release, setRelease,
        totalPlaybackDuration,
        currentPlaybackTime,
    } = useADSREnvelopeSynth();

    const progressBarWidth = totalPlaybackDuration > 0
        ? (currentPlaybackTime / totalPlaybackDuration) * 100
        : 0;

    const getExplanation = (param) => {
        switch (param) {
            case 'attack': return "Time to reach peak volume (seconds)";
            case 'decay': return "Time to fall to sustain level (seconds)";
            case 'sustain': return "Constant volume level (0-1) while held";
            case 'release': return "Time to fade out after release (seconds)";
            default: return "Shape your sound with ADSR controls!";
        }
    };

    return (
        <>
            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
                pageId="adsr-envelope-tool" 
                tool={adsrEnvelopeTool}
                customData={{}}
            />

            <div
                className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #ffe0e0 0%, #ffcccc 50%, #ffb3b3 100%)',
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                {/* Floating Icons Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%23ef4444' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                        backgroundSize: '200px 200px'
                    }}
                ></div>

                <div className="text-center mb-6 md:mb-10 z-10 w-full px-2">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                        <Ruler size={36} className="text-red-700 md:mb-0 mb-2" />
                        <h1 className="text-3xl md:text-5xl font-extrabold text-red-900 drop-shadow-lg">
                            ADSR Explorer
                        </h1>
                    </div>
                    {isLoading && (
                        <p className="text-red-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                            Setting up audio engine...
                        </p>
                    )}
                    {!isLoading && !isAudioReady && (
                        <p className="text-red-700 text-xs md:text-sm mt-2 md:mt-4">
                            Click "Play Note" to activate audio.
                        </p>
                    )}
                    {!isLoading && isAudioReady && (
                        <p className="text-red-600 text-xs md:text-sm mt-2 md:mt-4">
                            Ready. Adjust sliders and play!
                        </p>
                    )}
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col items-center space-y-4 md:space-y-8 z-10 border border-red-200 mx-2">

                    {/* Play and Stop Note Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-4 md:mb-6 w-full">
                        <button
                            type="button"
                            onClick={triggerNote}
                            className={`px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 w-full
                                    ${!isPlaying && !isLoading
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                            // Changed disabled logic to allow clicking to activate audio context
                            disabled={isPlaying || isLoading}
                        >
                            <Play size={20} />
                            Play Note
                        </button>

                        <button
                            type="button"
                            onClick={stopNote}
                            className={`px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 w-full
                                    ${isPlaying && isAudioReady
                                        ? 'bg-red-700 hover:bg-red-800 text-white'
                                        : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                            disabled={!isPlaying || !isAudioReady}
                        >
                            <Pause size={20} />
                            Stop
                        </button>
                    </div>

                    {/* Playback Progress Bar */}
                    {/* Always show progress bar once synth is initialized, even if context is suspended */}
                    {!isLoading && (
                        <div className="w-full px-2">
                            <div className="w-full bg-gray-200 rounded-full h-3 md:h-4 mb-2 md:mb-4 overflow-hidden">
                                <div
                                    className="bg-red-500 h-full rounded-full transition-all duration-100 ease-linear"
                                    style={{ width: `${progressBarWidth}%` }}
                                ></div>
                            </div>
                            <p className="text-gray-700 text-xs md:text-sm text-center">
                                {currentPlaybackTime.toFixed(1)}s / {totalPlaybackDuration.toFixed(1)}s
                            </p>
                        </div>
                    )}

                    {/* ADSR Parameter Sliders */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 w-full mt-4 md:mt-8">
                        <ParameterSlider
                            label="Attack" value={attack} setter={setAttack}
                            min="0.01" max="2" step="0.01" unit=" s"
                            explanation={getExplanation('attack')}
                        />

                        <ParameterSlider
                            label="Decay" value={decay} setter={setDecay}
                            min="0.01" max="2" step="0.01" unit=" s"
                            explanation={getExplanation('decay')}
                        />

                        <ParameterSlider
                            label="Sustain" value={sustain} setter={setSustain}
                            min="0.0" max="1.0" step="0.01" unit=""
                            explanation={getExplanation('sustain')}
                        />

                        <ParameterSlider
                            label="Release" value={release} setter={setRelease}
                            min="0.01" max="5" step="0.01" unit=" s"
                            explanation={getExplanation('release')}
                        />
                    </div>

                    <div className="text-center text-gray-700 text-xs md:text-sm mt-4 md:mt-6 italic px-2">
                        Generates a sine wave with ADSR envelope. "Play Note" triggers sound; sustain duration adjusts based on level.
                    </div>
                </div>
            </div>
        </>
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
        console.error("Uncaught error in ADSREnvelopeTool:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the ADSR Envelope Tool. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export wrapping the main content with AudioContextProvider and ErrorBoundary
const ADSREnvelopeTool = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <ADSREnvelopeToolContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default ADSREnvelopeTool;
