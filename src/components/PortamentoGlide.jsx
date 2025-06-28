import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Music } from 'lucide-react'; // Icons for play, music notes

// --- AUDIO CONTEXT ---
// This context manages the global Tone.js audio state, ensuring only one audio context.
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);

    // Function to start Tone.js audio context. This needs a user interaction.
    const startGlobalAudio = useCallback(async () => {
        if (Tone.context.state === 'running') {
            setIsAudioGloballyReady(true);
            console.log('AudioContext: Tone.js context already running.');
            return;
        }

        try {
            console.log('AudioContext: Attempting to start global Tone.js context...');
            await Tone.start(); // This will resume the audio context

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
            if (newState !== isAudioGloballyReady) { // Prevent unnecessary state updates
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
    }, [isAudioGloballyReady]);

    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, startGlobalAudio }}>
            {children}
        </AudioContext.Provider>
    );
};
// --- END AUDIO CONTEXT ---


// --- usePortamentoSynth Hook ---
const usePortamentoSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const synthRef = useRef(null); // The Tone.Synth instance
    const [portamentoTime, setPortamentoTime] = useState(0.05); // Default glide time in seconds

    const [isAudioReady, setIsAudioReady] = useState(false); // Overall audio system readiness
    const [isLoading, setIsLoading] = useState(true); // Indicates if audio setup is in progress, initially true

    // Function to dispose the synth
    const disposeSynth = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.dispose();
            synthRef.current = null;
            console.log('usePortamentoSynth: Synth disposed.');
        }
    }, []);

    // Effect for initializing and cleaning up the synth
    useEffect(() => {
        console.log('usePortamentoSynth: Setting up Tone.js synth...');
        setIsLoading(true); // Set loading true at the start of setup

        let localSynth = null;
        try {
            // Dispose any existing synth instance if effect re-runs
            disposeSynth();

            localSynth = new Tone.Synth({
                oscillator: { type: 'sine' }, // Simple sine wave
                envelope: {
                    attack: 0.01,
                    decay: 0.2,
                    sustain: 0.5,
                    release: 0.8,
                },
                portamento: portamentoTime, // Set initial portamento
            }).toDestination();
            synthRef.current = localSynth;
            console.log('usePortamentoSynth: Tone.js synth created.');

        } catch (error) {
            console.error("usePortamentoSynth: Error during Tone.js synth setup:", error);
            setIsAudioReady(false);
            synthRef.current = null; // Ensure ref is null on error
        } finally {
            setIsLoading(false); // Set loading false after setup, regardless of success
            // Set audioReady based on global audio context and synth existence
            setIsAudioReady(isAudioGloballyReady && synthRef.current !== null);
        }

        // Cleanup function for this effect
        return () => {
            console.log('usePortamentoSynth Cleanup: Disposing synth on unmount.');
            if (localSynth) {
                localSynth.dispose();
            }
            synthRef.current = null; // Ensure ref is cleared
            setIsAudioReady(false); // Mark as not ready
        };
    }, [disposeSynth, isAudioGloballyReady]); // Re-create synth if global audio context changes. portamentoTime will be updated by a separate effect.

    // Effect to update portamento time if only the value changes, without re-creating synth
    useEffect(() => {
        // Only update if synthRef.current exists AND is not currently loading
        if (synthRef.current && !isLoading) {
            // Only update if the portamentoTime has changed from the current synth setting
            if (synthRef.current.portamento !== portamentoTime) {
                synthRef.current.portamento = portamentoTime;
                console.log(`Portamento time updated to: ${portamentoTime}s`);
            }
        }
    }, [portamentoTime, isLoading]); // Depend on portamentoTime and isLoading


    // Effect to observe global audio readiness and update local state
    useEffect(() => {
        setIsAudioReady(isAudioGloballyReady && synthRef.current !== null && !isLoading);
    }, [isAudioGloballyReady, synthRef.current, isLoading]);


    // Function to play a note
    const playNote = useCallback(async (note, duration = '8n') => {
        // First, ensure the global audio context is running due to user interaction
        if (Tone.context.state !== 'running') {
            console.log('playNote: AudioContext is suspended, attempting to start global audio...');
            await startGlobalAudio(); // This will attempt to resume context on user click
            if (Tone.context.state !== 'running') {
                console.warn('Audio context not running after interaction. Cannot play note.');
                return;
            }
        }

        if (!synthRef.current || isLoading) { // Check isLoading here
            console.warn('Synth not initialized or audio is still loading. Cannot play note.');
            return;
        }

        try {
            synthRef.current.triggerAttackRelease(note, duration);
            console.log(`Playing note: ${note} with portamento: ${portamentoTime}s`);
        } catch (e) {
            console.error("Error playing note:", e);
        }
    }, [startGlobalAudio, portamentoTime, isLoading]); // Include portamentoTime and isLoading in deps

    return {
        playNote,
        portamentoTime,
        setPortamentoTime,
        isAudioReady,
        isLoading,
    };
};
// --- End usePortamentoSynth Hook ---


// --- ParameterSlider Component (reused from previous docs) ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '', isDisabled, colorClass = 'accent-purple-600 bg-purple-100' }) => (
    <div className="flex flex-col items-center w-full">
        <label className="text-gray-800 font-medium mb-2 text-center">{label}: {typeof value === 'number' ? value.toFixed(value < 1 && value !== 0 ? 3 : 1) : value}{unit}</label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setter(parseFloat(e.target.value))}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${colorClass}`}
            disabled={isDisabled} // Now correctly uses the isDisabled prop
        />
        <p className="text-gray-700 text-sm mt-1 italic text-center px-2">{explanation}</p>
    </div>
);
// --- End ParameterSlider Component ---


// --- PortamentoGlideContent (Main UI Logic) ---
const PortamentoGlideContent = () => {
    const {
        playNote,
        portamentoTime, setPortamentoTime,
        isAudioReady, isLoading,
    } = usePortamentoSynth();

    const notesToPlay = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
    const getExplanation = (param) => {
        switch (param) {
            case 'portamentoTime': return "Time (seconds) to glide between notes. 0 = no glide.";
            default: return "Explore smooth note transitions!";
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #e6e6fa 0%, #d8bfd8 50%, #c084fc 100%)',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Floating Icons Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%23a78bfa' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            <div className="text-center mb-6 md:mb-10 z-10 w-full px-2">
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                    <Music size={36} className="text-purple-700 md:mb-0 mb-2" />
                    <h1 className="text-3xl md:text-5xl font-extrabold text-purple-900 drop-shadow-lg">
                        Glide Synthesizer
                    </h1>
                </div>
                {isLoading && (
                    <p className="text-purple-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                        Setting up audio...
                    </p>
                )}
                {!isLoading && !isAudioReady && (
                    <p className="text-purple-700 text-xs md:text-sm mt-2 md:mt-4">
                        Tap any note to activate audio.
                    </p>
                )}
                {!isLoading && isAudioReady && (
                    <p className="text-purple-600 text-xs md:text-sm mt-2 md:mt-4">
                        Ready. Tap notes and adjust glide!
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col items-center space-y-4 md:space-y-8 z-10 border border-purple-200 mx-2">

                {/* Portamento Time Slider */}
                <div className="w-full mb-4 md:mb-6 px-2">
                    <ParameterSlider
                        label="Glide Time" value={portamentoTime} setter={setPortamentoTime}
                        min="0" max="2" step="0.01" unit=" s"
                        explanation={getExplanation('portamentoTime')}
                        isDisabled={isLoading} // Changed to isLoading
                        colorClass="accent-purple-600 bg-purple-100"
                    />
                </div>

                {/* Note Play Buttons - 2 rows on mobile */}
                <div className="w-full">
                    <div className="grid grid-cols-4 gap-2 md:gap-3">
                        {notesToPlay.slice(0, 4).map(note => (
                            <button
                                key={note}
                                onMouseDown={() => playNote(note)}
                                onTouchStart={(e) => { e.preventDefault(); playNote(note); }}
                                className={`py-4 md:py-6 px-1 md:px-2 rounded-lg text-base md:text-lg font-bold transition-all duration-100 ease-out transform
                                    ${!isLoading // Enabled if not loading
                                        ? 'bg-purple-500 hover:bg-purple-600 active:scale-95 text-white shadow-md'
                                        : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                                disabled={isLoading} // Changed to isLoading
                            >
                                {note}
                            </button>
                        ))}
                    </div>
                    <div className="grid grid-cols-4 gap-2 md:gap-3 mt-2 md:mt-3">
                        {notesToPlay.slice(4).map(note => (
                            <button
                                key={note}
                                onMouseDown={() => playNote(note)}
                                onTouchStart={(e) => { e.preventDefault(); playNote(note); }}
                                className={`py-4 md:py-6 px-1 md:px-2 rounded-lg text-base md:text-lg font-bold transition-all duration-100 ease-out transform
                                    ${!isLoading // Enabled if not loading
                                        ? 'bg-purple-500 hover:bg-purple-600 active:scale-95 text-white shadow-md'
                                        : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                                disabled={isLoading} // Changed to isLoading
                            >
                                {note}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="text-center text-gray-700 text-xs md:text-sm mt-4 md:mt-6 italic px-2">
                    Portamento creates smooth pitch slides between notes. Adjust glide time to control the transition speed.
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
        console.error("Uncaught error in PortamentoGlide:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-purple-100 text-purple-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Portamento/Glide Synthesizer. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export wrapping the main content with AudioContextProvider and ErrorBoundary
const PortamentoGlide = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <PortamentoGlideContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default PortamentoGlide;
