import React, { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Drumstick, Volume2, Plus, Minus, Shuffle, Trash2 } from 'lucide-react';
import SEOHead from '../components/SEOHead';


// Define the tool object for SEO structured data
const drumSequencerGameTool = {
    id: 'drum-sequencer-game',
    name: 'Drum Pattern Game',
    description: 'Test your rhythm skills with drum pattern challenges and beat matching.',
    path: '/drum-sequencer-game',
    categories: [
        'Rhythm Game',
        'Drum Training',
        'Music Education',
        'Beat Matching',
        'Percussion'
    ]
};

// --- AUDIO CONTEXT ---
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);
    const [error, setError] = useState(null);

    const handleToneContextChange = useCallback(() => {
        const currentState = Tone.context.state;
        if (currentState === 'running') {
            setIsAudioGloballyReady(true);
            setError(null);
        } else {
            setIsAudioGloballyReady(false);
            if (currentState === 'suspended') {
                setError("Audio requires activation - click the Play button to start");
            } else if (currentState === 'closed') {
                setError("Audio system closed - please refresh the page");
            } else {
                setError(null);
            }
        }
        console.log(`AudioContext: Tone.context state changed to '${currentState}'.`);
    }, []);

    useEffect(() => {
        Tone.context.on('statechange', handleToneContextChange);
        handleToneContextChange();

        return () => {
            Tone.context.off('statechange', handleToneContextChange);
        };
    }, [handleToneContextChange]);

    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, error }}>
            {children}
        </AudioContext.Provider>
    );
};

// --- useDrumSequencer Hook ---
const useDrumSequencer = () => {
    const { isAudioGloballyReady, error: audioContextError } = useContext(AudioContext);
    const synthsRef = useRef({});
    const sequenceRef = useRef(null);
    
    const STEPS_PER_MEASURE = 16;

    const [isPlaying, setIsPlaying] = useState(false);
    const [bpm, setBpm] = useState(120);
    const [masterVolume, setMasterVolume] = useState(-12);
    const [currentStep, setCurrentStep] = useState(-1);
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Define drum sounds with synthesizer settings
    const drumSounds = {
        'kick': { 
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 },
            filter: { frequency: 100, type: 'lowpass' },
            frequency: 60
        },
        'snare': { 
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
            filter: { frequency: 2000, type: 'highpass' },
            frequency: 200
        },
        'hihat': { 
            oscillator: { type: 'square' },
            envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
            filter: { frequency: 8000, type: 'highpass' },
            frequency: 8000
        },
        'clap': { 
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 },
            filter: { frequency: 1000, type: 'bandpass' },
            frequency: 1000
        },
        'rimshot': { 
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.01, decay: 0.08, sustain: 0, release: 0.08 },
            filter: { frequency: 500, type: 'bandpass' },
            frequency: 500
        },
        'crash': { 
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 1, sustain: 0.1, release: 2 },
            filter: { frequency: 5000, type: 'highpass' },
            frequency: 5000
        }
    };

    const initialPattern = useMemo(() => {
        const pattern = {};
        for (const drumKey in drumSounds) {
            pattern[drumKey] = Array(STEPS_PER_MEASURE).fill(false);
        }
        // Add a simple default pattern
        pattern.kick[0] = true;
        pattern.kick[8] = true;
        pattern.snare[4] = true;
        pattern.snare[12] = true;
        pattern.hihat[2] = true;
        pattern.hihat[6] = true;
        pattern.hihat[10] = true;
        pattern.hihat[14] = true;
        return pattern;
    }, []);

    const [pattern, setPattern] = useState(initialPattern);
    const patternRef = useRef(pattern);
    
    useEffect(() => {
        patternRef.current = pattern;
    }, [pattern]);

    const createSynths = useCallback(() => {
        console.log('Creating synthesizers...');
        
        // Dispose existing synths
        Object.values(synthsRef.current).forEach(synth => {
            if (synth) synth.dispose();
        });
        synthsRef.current = {};

        // Create new synths for each drum sound
        for (const [drumKey, config] of Object.entries(drumSounds)) {
            try {
                const synth = new Tone.MonoSynth({
                    oscillator: config.oscillator,
                    envelope: config.envelope,
                    filter: config.filter
                }).toDestination();
                
                synth.volume.value = masterVolume;
                synthsRef.current[drumKey] = synth;
            } catch (error) {
                console.error(`Failed to create synth for ${drumKey}:`, error);
            }
        }
        
        console.log('Synthesizers created:', Object.keys(synthsRef.current));
    }, [masterVolume]);

    const setupSequence = useCallback(() => {
        console.log('Setting up sequence...');
        
        if (sequenceRef.current) {
            sequenceRef.current.dispose();
        }

        Tone.Transport.bpm.value = bpm;
        Tone.Transport.loop = true;
        Tone.Transport.loopStart = 0;
        Tone.Transport.loopEnd = "1m";

        const sequence = new Tone.Sequence(
            (time, stepIndex) => {
                // Update current step indicator
                Tone.Draw.schedule(() => {
                    setCurrentStep(stepIndex);
                }, time);

                // Trigger sounds for active steps
                for (const [drumKey, steps] of Object.entries(patternRef.current)) {
                    if (steps[stepIndex] && synthsRef.current[drumKey]) {
                        const frequency = drumSounds[drumKey].frequency;
                        synthsRef.current[drumKey].triggerAttackRelease(frequency, "16n", time);
                    }
                }
            },
            Array.from({ length: STEPS_PER_MEASURE }, (_, i) => i),
            "16n"
        );

        sequence.start(0);
        sequenceRef.current = sequence;
        console.log('Sequence setup complete');
    }, [bpm]);

    // Initialize audio components
    useEffect(() => {
        const initializeAudio = async () => {
            setIsLoading(true);
            try {
                createSynths();
                setupSequence();
                setIsAudioReady(true);
                console.log('Audio initialization complete');
            } catch (error) {
                console.error('Audio initialization failed:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeAudio();

        return () => {
            if (sequenceRef.current) {
                sequenceRef.current.dispose();
            }
            Object.values(synthsRef.current).forEach(synth => {
                if (synth) synth.dispose();
            });
            Tone.Transport.stop();
        };
    }, [createSynths, setupSequence]);

    // Update master volume
    useEffect(() => {
        Object.values(synthsRef.current).forEach(synth => {
            if (synth && synth.volume) {
                synth.volume.value = masterVolume;
            }
        });
    }, [masterVolume]);

    // Handle play/pause
    useEffect(() => {
        if (isPlaying && isAudioReady) {
            Tone.Transport.start();
        } else {
            Tone.Transport.pause();
            setCurrentStep(-1);
        }
    }, [isPlaying, isAudioReady]);

    // Update BPM
    useEffect(() => {
        if (Tone.Transport) {
            Tone.Transport.bpm.value = bpm;
        }
    }, [bpm]);

    const togglePlay = useCallback(async () => {
        if (!isAudioReady || isLoading) {
            console.warn('Audio not ready');
            return;
        }

        if (Tone.context.state !== 'running') {
            try {
                await Tone.start();
                console.log('Audio context started');
            } catch (err) {
                console.error('Failed to start audio context:', err);
                return;
            }
        }
        
        setIsPlaying(prev => !prev);
    }, [isAudioReady, isLoading]);

    const toggleStep = useCallback((drumKey, stepIndex) => {
        setPattern(prevPattern => {
            const newPattern = { ...prevPattern };
            newPattern[drumKey] = [...newPattern[drumKey]];
            newPattern[drumKey][stepIndex] = !newPattern[drumKey][stepIndex];
            return newPattern;
        });
    }, []);

    const randomizePattern = useCallback(() => {
        setPattern(prevPattern => {
            const newPattern = {};
            for (const drumKey in prevPattern) {
                newPattern[drumKey] = Array(STEPS_PER_MEASURE).fill(false).map(() => Math.random() > 0.75);
            }
            return newPattern;
        });
    }, []);

    const clearPattern = useCallback(() => {
        setPattern(prevPattern => {
            const newPattern = {};
            for (const drumKey in prevPattern) {
                newPattern[drumKey] = Array(STEPS_PER_MEASURE).fill(false);
            }
            return newPattern;
        });
    }, []);

    return {
        isPlaying,
        togglePlay,
        bpm, 
        setBpm,
        masterVolume, 
        setMasterVolume,
        currentStep,
        pattern, 
        toggleStep,
        drumKeys: Object.keys(drumSounds),
        STEPS_PER_MEASURE,
        isAudioReady,
        isLoading,
        error: audioContextError,
        randomizePattern,
        clearPattern,
    };
};

// --- ParameterSlider Component ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '', isDisabled, colorClass = 'accent-green-600 bg-green-100' }) => (
    <div className="flex flex-col items-center w-full">
        <label className="text-gray-800 font-medium mb-2 text-center">
            {label}: {typeof value === 'number' ? value.toFixed(value < 1 && value !== 0 ? 3 : 0) : value}{unit}
        </label>
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

// --- DrumSequencerContent (Main UI Logic) ---
const DrumSequencerContent = () => {
    const {
        isPlaying, togglePlay,
        bpm, setBpm,
        masterVolume, setMasterVolume,
        currentStep,
        pattern, toggleStep,
        drumKeys,
        STEPS_PER_MEASURE,
        isAudioReady,
        isLoading,
        error,
        randomizePattern,
        clearPattern,
    } = useDrumSequencer();

    const areControlsDisabled = isLoading || !!error;

    return (
        <>  
            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
                pageId="drum-sequencer-game" 
                tool={drumSequencerGameTool}
                customData={{}}
            />

            <div
                className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #e6ffe6 0%, #ccffcc 50%, #80ff80 100%)',
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%2368d391' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                        backgroundSize: '200px 200px'
                    }}
                ></div>

                <div className="text-center mb-6 md:mb-10 z-10 w-full px-2">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                        <Drumstick size={36} className="text-green-700 md:mb-0 mb-2" />
                        <h1 className="text-3xl md:text-5xl font-extrabold text-green-900 drop-shadow-lg">
                            Drum Sequencer
                        </h1>
                    </div>
                    {error && (
                        <p className="text-red-600 text-xs md:text-sm mt-2 md:mt-4 font-semibold">
                            Error: {error}
                        </p>
                    )}
                    {!isAudioReady && isLoading && (
                        <p className="text-green-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                            Loading audio system...
                        </p>
                    )}
                    {!isAudioReady && !isLoading && !error && (
                        <p className="text-green-700 text-xs md:text-sm mt-2 md:mt-4">
                            Tap "Play" to activate audio
                        </p>
                    )}
                    {isAudioReady && !isLoading && !error && (
                        <p className="text-green-600 text-xs md:text-sm mt-2 md:mt-4">
                            Ready! Using synthesized drum sounds
                        </p>
                    )}
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-xl shadow-lg w-full max-w-5xl flex flex-col items-center space-y-4 md:space-y-8 z-10 border border-green-200 mx-2">

                    {/* Sequencer Controls */}
                    <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-4 md:mb-6 w-full">
                        <button
                            type="button"
                            onClick={togglePlay}
                            className={`px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg flex items-center gap-2 md:gap-3 transition-all duration-300
                                    ${isPlaying && !error
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : (isAudioReady && !isPlaying && !error) 
                                            ? 'bg-green-500 hover:bg-green-600 text-white'
                                            : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                            disabled={isLoading || !!error}
                        >
                            {isPlaying ? <Pause size={20} className="md:w-6 md:h-6 w-5 h-5" /> : <Play size={20} className="md:w-6 md:h-6 w-5 h-5" />}
                            {isPlaying ? 'Stop' : 'Play'}
                        </button>

                        <button
                            type="button"
                            onClick={randomizePattern}
                            className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-semibold text-sm md:text-base flex items-center gap-1 md:gap-2 transition-all duration-200
                                    bg-blue-100 text-blue-800 hover:bg-blue-200
                                    ${areControlsDisabled ? 'cursor-not-allowed opacity-50' : ''}
                                `}
                            disabled={areControlsDisabled}
                        >
                            <Shuffle size={18} className="md:w-5 md:h-5 w-4 h-4" />
                            Random
                        </button>

                        <button
                            type="button"
                            onClick={clearPattern}
                            className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-semibold text-sm md:text-base flex items-center gap-1 md:gap-2 transition-all duration-200
                                    bg-orange-100 text-orange-800 hover:bg-orange-200
                                    ${areControlsDisabled ? 'cursor-not-allowed opacity-50' : ''}
                                `}
                            disabled={areControlsDisabled}
                        >
                            <Trash2 size={18} className="md:w-5 md:h-5 w-4 h-4" />
                            Clear
                        </button>
                    </div>

                    {/* Current Step Indicator */}
                    <div className="w-full flex justify-center items-center h-6 md:h-8 mb-3 md:mb-4 overflow-x-auto px-2">
                        <div className="flex">
                            {Array.from({ length: STEPS_PER_MEASURE }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center font-bold text-xs mx-0.5
                                        ${currentStep === idx ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-200 text-gray-600'}
                                        transition-all duration-100 ease-linear
                                    `}
                                >
                                    {idx + 1}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Drum Sequencer Grid */}
                    <div className="w-full overflow-x-auto p-1 md:p-2 border border-green-100 rounded-lg bg-green-50/50">
                        <div className="inline-grid gap-0.5 md:gap-1 py-1 md:py-2" style={{ gridTemplateColumns: `80px repeat(${STEPS_PER_MEASURE}, minmax(30px, 1fr))` }}>
                            {/* Header for steps */}
                            <div className="text-right pr-1 md:pr-2 font-bold text-gray-700"></div>
                            {Array.from({ length: STEPS_PER_MEASURE }).map((_, stepIdx) => (
                                <div key={`header-${stepIdx}`} className="text-center font-semibold text-green-700 text-xs px-0.5 md:px-1">
                                    {stepIdx + 1}
                                </div>
                            ))}

                            {/* Drum rows */}
                            {drumKeys.map(drumKey => (
                                <React.Fragment key={drumKey}>
                                    <div className="text-right pr-1 md:pr-2 font-semibold text-green-800 py-0.5 md:py-1 flex items-center justify-end text-xs md:text-sm">
                                        {drumKey.replace(/_/g, ' ').toUpperCase()}
                                    </div>
                                    {pattern[drumKey].map((isActive, stepIdx) => (
                                        <button
                                            key={`${drumKey}-${stepIdx}`}
                                            onClick={() => toggleStep(drumKey, stepIdx)}
                                            className={`w-8 h-8 md:w-10 md:h-10 rounded-sm md:rounded-md transition-all duration-100 ease-in-out
                                                ${isActive
                                                    ? 'bg-green-600 shadow-md transform scale-105'
                                                    : 'bg-green-200 hover:bg-green-300'}
                                                ${currentStep === stepIdx ? 'border-2 border-yellow-400' : ''}
                                                ${areControlsDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                                            `}
                                            disabled={areControlsDisabled}
                                            aria-label={`Toggle ${drumKey} on step ${stepIdx + 1}`}
                                        ></button>
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* BPM Slider */}
                    <div className="w-full mt-4 md:mt-6 pt-4 md:pt-6 border-t border-green-200">
                        <ParameterSlider
                            label="Tempo" value={bpm} setter={setBpm}
                            min="60" max="180" step="1" unit=" BPM"
                            explanation="Adjust sequence speed"
                            isDisabled={areControlsDisabled}
                            colorClass="accent-green-700 bg-green-200"
                        />
                    </div>

                    {/* Master Volume Slider */}
                    <div className="w-full mt-4 md:mt-6 pt-4 md:pt-6 border-t border-green-200">
                        <ParameterSlider
                            label="Volume" value={masterVolume} setter={setMasterVolume}
                            min="-40" max="0" step="1" unit=" dB"
                            explanation="Adjust overall loudness"
                            isDisabled={areControlsDisabled}
                            colorClass="accent-green-700 bg-green-200"
                        />
                    </div>

                    <div className="text-center text-gray-700 text-xs md:text-sm mt-4 md:mt-6 italic px-2">
                        Click squares to create beats. Use "Random" for new patterns or "Clear" to start fresh.
                    </div>
                </div>
            </div>
        </>
    );
};

// Error Boundary
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error in DrumSequencer:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Drum Sequencer. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export
const DrumSequencer = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <DrumSequencerContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
};

export default DrumSequencer;