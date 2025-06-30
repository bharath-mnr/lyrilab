import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Music, Volume2, VolumeX, TrendingUp, TrendingDown } from 'lucide-react'; // Added TrendingUp/Down for glide toggle
import SEOHead from './SEOHead';


// Define the tool object for SEO structured data
const portamentoGlideTool = {
    id: 'portamento-glide',
    name: 'Portamento Glide',
    description: 'Create smooth pitch transitions between notes with portamento and glide effects.',
    path: '/portamento-glide',
    categories: [
        'Pitch Effects',
        'Sound Design',
        'Synthesis',
        'Expression',
        'Legato'
    ]
};

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
    const [isPortamentoEnabled, setIsPortamentoEnabled] = useState(true); // State for glide on/off

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
            disposeSynth(); // Ensure any existing synth is disposed

            // Initialize synth with portamento set based on the current `isPortamentoEnabled` state.
            localSynth = new Tone.Synth({
                oscillator: { type: 'sine' }, // Simple sine wave
                envelope: {
                    attack: 0.01,
                    decay: 0.2,
                    sustain: 0.5,
                    release: 0.8,
                },
                portamento: (isPortamentoEnabled && portamentoTime > 0) ? portamentoTime : 0, // APPLYING INITIAL LOGIC HERE
            }).toDestination();
            synthRef.current = localSynth;
            console.log('usePortamentoSynth: Tone.js synth created with initial portamento:', localSynth.portamento);

        } catch (error) {
            console.error("usePortamentoSynth: Error during Tone.js synth setup:", error);
            setIsAudioReady(false);
            synthRef.current = null; // Ensure ref is null on error
        } finally {
            setIsLoading(false); // Set loading false after setup, regardless of success
            setIsAudioReady(isAudioGloballyReady && synthRef.current !== null);
        }

        return () => {
            console.log('usePortamentoSynth Cleanup: Disposing synth on unmount.');
            if (localSynth) {
                localSynth.dispose();
            }
            synthRef.current = null; // Ensure ref is cleared
            setIsAudioReady(false); // Mark as not ready
        };
    }, [disposeSynth, isAudioGloballyReady, isPortamentoEnabled]); // Keep isPortamentoEnabled here for initial synth creation logic

    // Effect to dynamically update portamento time or enable/disable glide AFTER synth is created
    useEffect(() => {
        // Only update if synthRef.current exists AND is not currently loading
        if (synthRef.current && !isLoading) {
            // When portamento is disabled OR time is 0, set portamento to 0
            const newPortamentoValue = (isPortamentoEnabled && portamentoTime > 0) ? portamentoTime : 0;
            
            // Only update if the synth's current portamento is different from the desired value
            if (synthRef.current.portamento !== newPortamentoValue) {
                synthRef.current.portamento = newPortamentoValue;
                console.log(`Synth portamento dynamically updated to: ${newPortamentoValue}s (Glide ${isPortamentoEnabled && portamentoTime > 0 ? 'ON' : 'OFF'})`);
            }
        }
    }, [portamentoTime, isPortamentoEnabled, isLoading]);


    // Effect to observe global audio readiness and update local state
    useEffect(() => {
        setIsAudioReady(isAudioGloballyReady && synthRef.current !== null && !isLoading);
    }, [isAudioGloballyReady, synthRef.current, isLoading]);


    // Function to play a note
    const playNote = useCallback(async (note, duration = '8n') => {
        if (Tone.context.state !== 'running') {
            console.log('playNote: AudioContext is suspended, attempting to start global audio...');
            await startGlobalAudio();
            if (Tone.context.state !== 'running') {
                console.warn('Audio context not running after interaction. Cannot play note.');
                return;
            }
        }

        if (!synthRef.current || isLoading) {
            console.warn('Synth not initialized or audio is still loading. Cannot play note.');
            return;
        }

        try {
            synthRef.current.triggerAttackRelease(note, duration);
        } catch (e) {
            console.error("Error playing note:", e);
        }
    }, [startGlobalAudio, isLoading]);


    return {
        playNote,
        portamentoTime,
        setPortamentoTime,
        isPortamentoEnabled,
        setIsPortamentoEnabled,
        isAudioReady,
        isLoading,
    };
};
// --- End usePortamentoSynth Hook ---


// --- ParameterSlider Component ---
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
            disabled={isDisabled}
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
        isPortamentoEnabled, setIsPortamentoEnabled,
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
        <>
            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
                pageId="portamento-glide" 
                tool={portamentoGlideTool}
                customData={{}}
            />

            <div
                className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 md:p-8 relative overflow-hidden w-full"
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

                <div className="text-center mb-4 sm:mb-6 md:mb-10 z-10 w-full max-w-5xl">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-purple-900 drop-shadow-lg mb-2 sm:mb-4 leading-tight">
                        Glide Synthesizer
                    </h1>

                    {/* Status Messages */}
                    <div className="min-h-[1.5rem] flex items-center justify-center">
                        {isLoading && (
                            <p className="text-purple-700 text-sm sm:text-base animate-pulse">
                                Setting up audio...
                            </p>
                        )}
                        {!isLoading && !isAudioReady && (
                            <p className="text-purple-700 text-sm sm:text-base">
                                Tap any note to activate audio.
                            </p>
                        )}
                        {!isLoading && isAudioReady && (
                            <p className="text-purple-600 text-sm sm:text-base font-medium">
                                🎵 Ready! Tap notes and adjust glide.
                            </p>
                        )}
                    </div>
                </div>

                <div className="bg-white/90 backdrop-blur-md p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col items-center space-y-6 sm:space-y-8 z-10 border border-purple-200/50 mx-2">

                    {/* Glide ON/OFF Toggle Button */}
                    <button
                        onClick={() => {
                            setIsPortamentoEnabled(prev => !prev);
                            // Immediately set portamentoTime to 0 when disabling, for clear UX
                            // The useEffect will then correctly set synth.portamento to 0.
                            if (isPortamentoEnabled) { // If it was enabled, we are now disabling it
                                setPortamentoTime(0);
                            }
                        }}
                        className={`flex items-center justify-center gap-2 py-2 px-4 rounded-full text-sm font-semibold transition-colors duration-200 ease-in-out
                            ${isPortamentoEnabled
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md hover:from-purple-600 hover:to-indigo-600'
                                : 'bg-gray-200 text-gray-700 shadow-md hover:bg-gray-300'
                            }
                            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                        disabled={isLoading}
                    >
                        {isPortamentoEnabled ? (
                            <>
                                <TrendingUp size={20} /> Glide ON
                            </>
                        ) : (
                            <>
                                <TrendingDown size={20} /> Glide OFF
                            </>
                        )}
                    </button>

                    {/* Portamento Time Slider */}
                    <div className="w-full px-2">
                        <ParameterSlider
                            label="Glide Time"
                            value={portamentoTime}
                            setter={setPortamentoTime}
                            min="0"
                            max="3" // Max to 3 seconds
                            step="0.01"
                            unit=" s"
                            explanation={getExplanation('portamentoTime')}
                            isDisabled={isLoading || !isPortamentoEnabled} // Disable slider when loading or glide is off
                            colorClass="accent-purple-600 bg-purple-100"
                        />
                    </div>

                    {/* Note Play Buttons */}
                    <div className="w-full">
                        <div className="grid grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                            {notesToPlay.slice(0, 4).map(note => (
                                <button
                                    key={note}
                                    onMouseDown={() => playNote(note)}
                                    onTouchStart={(e) => { e.preventDefault(); playNote(note); }}
                                    className={`py-4 sm:py-5 md:py-6 rounded-xl text-base sm:text-lg md:text-xl font-bold transition-all duration-100 ease-out transform shadow-lg hover:shadow-xl
                                        ${!isLoading
                                            ? 'bg-purple-500 hover:bg-purple-600 active:scale-95 text-white'
                                            : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                                    disabled={isLoading}
                                    style={{
                                        WebkitTapHighlightColor: 'transparent',
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    {note}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-4 gap-3 sm:gap-4 md:gap-5 mt-3 sm:mt-4 md:mt-5">
                            {notesToPlay.slice(4).map(note => (
                                <button
                                    key={note}
                                    onMouseDown={() => playNote(note)}
                                    onTouchStart={(e) => { e.preventDefault(); playNote(note); }}
                                    className={`py-4 sm:py-5 md:py-6 rounded-xl text-base sm:text-lg md:text-xl font-bold transition-all duration-100 ease-out transform shadow-lg hover:shadow-xl
                                        ${!isLoading
                                            ? 'bg-purple-500 hover:bg-purple-600 active:scale-95 text-white'
                                            : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                                    disabled={isLoading}
                                    style={{
                                        WebkitTapHighlightColor: 'transparent',
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    {note}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="text-center text-gray-600 text-xs sm:text-sm italic max-w-md px-2">
                        **Portamento** creates smooth pitch slides between notes. Adjust the **Glide Time** to control the transition speed for a more fluid sound. Use the "Glide ON/OFF" button to enable or disable this effect.
                    </div>
                </div>

                {/* Footer spacing for mobile */}
                <div className="h-8 sm:h-4"></div>
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