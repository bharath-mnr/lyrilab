import React, { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Drumstick, Volume2, Plus, Minus, Shuffle, Trash2 } from 'lucide-react';

// --- AUDIO CONTEXT ---
// This context manages the global Tone.js audio state, ensuring only one audio context.
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);
    const [error, setError] = useState(null); // Global audio context error

    // handleToneContextChange function is now the primary mechanism for setting state
    // based on Tone.context.state. The startGlobalAudio is no longer needed here
    // as the togglePlay in useDrumSequencer will handle Tone.start directly.
    const handleToneContextChange = useCallback(() => {
        const currentState = Tone.context.state;
        if (currentState === 'running') {
            setIsAudioGloballyReady(true);
            setError(null); // Clear any previous error if context is running
        } else {
            setIsAudioGloballyReady(false);
            // Set error only if it's suspended and not already a critical error
            if (currentState === 'suspended') {
                setError("Audio requires activation - click the Play button to start");
            } else if (currentState === 'closed') {
                setError("Audio system closed - please refresh the page");
            } else {
                setError(null); // Clear error if state is neither running, suspended, nor closed
            }
        }
        console.log(`AudioContext: Tone.context state changed to '${currentState}'. isAudioGloballyReady set to ${currentState === 'running'}.`);
    }, []); // No dependencies for this callback as it only reads Tone.context.state

    useEffect(() => {
        // Add listener for state changes
        Tone.context.on('statechange', handleToneContextChange);
        handleToneContextChange(); // Initial check on mount

        return () => {
            // Clean up listener on unmount
            Tone.context.off('statechange', handleToneContextChange);
            console.log('AudioContext: Cleaning up Tone.context statechange listener.');
        };
    }, [handleToneContextChange]); // Depend on the memoized callback

    // The value provided by this context no longer needs startGlobalAudio
    // as togglePlay will handle Tone.start directly.
    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, error }}>
            {children}
        </AudioContext.Provider>
    );
};
// --- END AUDIO CONTEXT ---


// --- useDrumSequencer Hook ---
const useDrumSequencer = () => {
    // We only need isAudioGloballyReady and the error from AudioContext now.
    // startGlobalAudio is NOT directly used here anymore.
    const { isAudioGloballyReady, error: audioContextError } = useContext(AudioContext); 
    const samplerRef = useRef(null);
    const fallbackOscillatorsRef = useRef({});
    const sequenceRef = useRef(null);
    
    const STEPS_PER_MEASURE = 16;

    const [isPlaying, setIsPlaying] = useState(false);
    const [bpm, setBpm] = useState(120);
    const [masterVolume, setMasterVolume] = useState(0);
    const [currentStep, setCurrentStep] = useState(-1);

    const [isAudioReady, setIsAudioReady] = useState(false); 
    const [isLoading, setIsLoading] = useState(false);
    const [isSamplesLoaded, setIsSamplesLoaded] = useState(false);
    const [loadError, setLoadError] = useState(null);

    const drumKeyToNoteMap = useRef({
        'kick': 'C1', 'snare': 'D1', 'hihat': 'E1', 'clap': 'F1',
        'rimshot': 'G1', 'open_hihat': 'A1', 'ride': 'B1', 'crash': 'C2',
    });

    const drumKeyToFallbackOscSettings = useRef({
        'kick': { type: 'sine', frequency: 60, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 } },
        'snare': { type: 'square', frequency: 200, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }, noise: true },
        'hihat': { type: 'sawtooth', frequency: 8000, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 } },
        'clap': { type: 'triangle', frequency: 1000, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } },
        'rimshot': { type: 'triangle', frequency: 500, envelope: { attack: 0.01, decay: 0.08, sustain: 0, release: 0.08 } },
        'open_hihat': { type: 'sawtooth', frequency: 7000, envelope: { attack: 0.001, decay: 0.2, sustain: 0.1, release: 0.3 } },
        'ride': { type: 'sine', frequency: 4000, envelope: { attack: 0.01, decay: 0.5, sustain: 0.2, release: 1 } },
        'crash': { type: 'sine', frequency: 5000, envelope: { attack: 0.01, decay: 1, sustain: 0.1, release: 2 } },
    });

    const initialPattern = useMemo(() => {
        const pattern = {};
        for (const drumKey in drumKeyToNoteMap.current) {
            pattern[drumKey] = Array(STEPS_PER_MEASURE).fill(false);
        }
        return pattern;
    }, []);

    const [pattern, setPattern] = useState(initialPattern);
    const patternRef = useRef(pattern);
    useEffect(() => {
        patternRef.current = pattern;
    }, [pattern]);

    const getSamplerUrls = useCallback(() => {
        const urls = {};
        for (const drumKey in drumKeyToNoteMap.current) {
            const note = drumKeyToNoteMap.current[drumKey];
            const fileExtension = drumKey === 'open_hihat' ? 'wav' : 'mp3';
            urls[note] = `${drumKey}.${fileExtension}`; 
        }
        return urls;
    }, []);

    const disposeSequencer = useCallback(() => {
        if (sequenceRef.current) {
            sequenceRef.current.stop();
            sequenceRef.current.dispose();
            sequenceRef.current = null;
        }
        if (samplerRef.current) {
            samplerRef.current.dispose();
            samplerRef.current = null;
        }
        for (const drumKey in fallbackOscillatorsRef.current) {
            if (fallbackOscillatorsRef.current[drumKey]) {
                fallbackOscillatorsRef.current[drumKey].dispose();
            }
        }
        fallbackOscillatorsRef.current = {};
        Tone.Transport.stop();
        setIsPlaying(false);
        setCurrentStep(-1);
        setIsSamplesLoaded(false);
        console.log('useDrumSequencer: Sequencer, Sampler, and fallback oscillators disposed.');
    }, []);

    // MAIN EFFECT: Initializes Tone.js instruments and sequence. Should run only once.
    useEffect(() => {
        console.log('useDrumSequencer: Setting up Tone.js Sampler and Sequence...');
        setIsLoading(true);
        setIsSamplesLoaded(false);
        setLoadError(null);

        disposeSequencer(); 

        let localSampler = null;
        let localSequence = null;

        try {
            localSampler = new Tone.Sampler({
                urls: getSamplerUrls(),
                baseUrl: "/drum_samples/",
                onload: () => {
                    console.log('useDrumSequencer: Drum samples loaded successfully!');
                    setIsSamplesLoaded(true);
                    setIsLoading(false); 
                },
                onerror: (error) => {
                    console.error('useDrumSequencer: Error loading drum samples:', error);
                    setLoadError(`Failed to load samples. Using synthesized sounds.`);
                    setIsSamplesLoaded(false);
                    setIsLoading(false); 
                },
            }).toDestination();
            samplerRef.current = localSampler;

            for (const drumKey in drumKeyToFallbackOscSettings.current) {
                const settings = drumKeyToFallbackOscSettings.current[drumKey];
                let osc;
                if (settings.noise) {
                    osc = new Tone.Synth({
                        oscillator: { type: settings.type, frequency: settings.frequency },
                        envelope: settings.envelope,
                        noise: { type: 'white' },
                    }).toDestination();
                } else {
                    osc = new Tone.Synth({
                        oscillator: { type: settings.type, frequency: settings.frequency },
                        envelope: settings.envelope,
                    }).toDestination();
                }
                fallbackOscillatorsRef.current[drumKey] = osc;
            }
            console.log('useDrumSequencer: Fallback oscillators created.');

            Tone.Transport.bpm.value = bpm;
            Tone.Transport.loop = true;
            Tone.Transport.loopStart = 0;
            Tone.Transport.loopEnd = `${STEPS_PER_MEASURE}n`;

            localSequence = new Tone.Sequence(
                (time, stepIndex) => {
                    Tone.Draw.schedule(() => {
                        setCurrentStep(stepIndex);
                    }, time);

                    for (const drumKey in patternRef.current) {
                        if (patternRef.current[drumKey][stepIndex]) {
                            const note = drumKeyToNoteMap.current[drumKey];
                            if (isSamplesLoaded && samplerRef.current && samplerRef.current.loaded) {
                                samplerRef.current.triggerAttack(note, time);
                            } else {
                                const fallbackSynth = fallbackOscillatorsRef.current[drumKey];
                                if (fallbackSynth) {
                                    fallbackSynth.triggerAttackRelease(note, "16n", time);
                                }
                            }
                        }
                    }
                },
                Array.from({ length: STEPS_PER_MEASURE }, (_, i) => i),
                "16n"
            ).start(0);
            sequenceRef.current = localSequence;
            console.log('useDrumSequencer: Tone.js Sequence created and configured.');

        } catch (err) {
            console.error("useDrumSequencer: Critical error during Tone.js setup:", err);
            setLoadError('Failed to initialize audio engine. Check console for details.');
            setIsLoading(false);
            samplerRef.current = null;
            sequenceRef.current = null;
        } finally {
            if (loadError) setIsLoading(false); 
        }

        return () => {
            console.log('useDrumSequencer Cleanup: Disposing sequencer and sampler.');
            disposeSequencer();
        };
    }, [disposeSequencer, getSamplerUrls, bpm]); 

    // Effect to update master volume
    useEffect(() => {
        if (!isLoading && (isSamplesLoaded || Object.keys(fallbackOscillatorsRef.current).length > 0)) {
            if (samplerRef.current) {
                samplerRef.current.volume.value = masterVolume;
            }
            for (const drumKey in fallbackOscillatorsRef.current) {
                if (fallbackOscillatorsRef.current[drumKey].volume) {
                    fallbackOscillatorsRef.current[drumKey].volume.value = masterVolume;
                }
            }
            console.log(`Master volume updated to: ${masterVolume} dB`);
        }
    }, [masterVolume, isLoading, isSamplesLoaded]);

    // isAudioReady: True when instruments are ready for interaction
    useEffect(() => {
        setIsAudioReady(
            !isLoading && 
            !loadError && 
            (isSamplesLoaded || Object.keys(fallbackOscillatorsRef.current).length > 0) 
        );
        console.log(`useDrumSequencer: isLoading: ${isLoading}, loadError: ${!!loadError}, isSamplesLoaded: ${isSamplesLoaded}, fallbackOscillators exist: ${Object.keys(fallbackOscillatorsRef.current).length > 0} => isAudioReady: ${isAudioReady}`);
    }, [isSamplesLoaded, isLoading, loadError]);

    // Effect to manage Tone.Transport play/pause
    useEffect(() => {
        if (!sequenceRef.current || !isAudioReady) { 
            Tone.Transport.stop();
            setCurrentStep(-1);
            return;
        }

        if (isPlaying) {
            Tone.Transport.start();
            console.log('Sequencer started.');
        } else {
            Tone.Transport.stop();
            setCurrentStep(-1);
            console.log('Sequencer stopped.');
        }
    }, [isPlaying, isAudioReady]);

    // Effect to sync BPM from state to Tone.Transport
    useEffect(() => {
        if (Tone.Transport && !isLoading) {
            Tone.Transport.bpm.value = bpm;
            console.log(`Tone.Transport BPM set to: ${bpm}`);
        }
    }, [bpm, isLoading]);

    const togglePlay = useCallback(async () => {
        // First, check if our *internal instruments* are ready to go.
        if (!isAudioReady || isLoading) {
            console.warn('togglePlay: Audio system components not ready or still loading. Cannot toggle play.');
            return;
        }

        // Then, ensure the global browser AudioContext is running.
        // This is the crucial step that requires a user gesture.
        if (Tone.context.state !== 'running') {
            console.log('togglePlay: Audio context not running, attempting to start globally.');
            try {
                await Tone.start(); // This is the key call that resumes the audio context
                // Wait for the context state to actually become 'running'
                await new Promise(resolve => {
                    const check = () => {
                        if (Tone.context.state === 'running') {
                            resolve();
                        } else {
                            // Give it a little time, but not too long to avoid blocking UI
                            setTimeout(check, 50); 
                        }
                    };
                    check();
                });
            } catch (err) {
                console.error('togglePlay: Failed to start audio context:', err);
                // Optionally set a user-facing error here if starting context fails
                return;
            }
        }
        
        // Only if everything is initialized and the context is running, toggle playback.
        setIsPlaying(prev => !prev);
    }, [isAudioReady, isLoading]); // startGlobalAudio is removed from deps as Tone.start() is called directly.

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
                newPattern[drumKey] = Array(STEPS_PER_MEASURE).fill(false).map(() => Math.random() > 0.7);
            }
            return newPattern;
        });
        console.log('Pattern randomized!');
    }, []);

    const clearPattern = useCallback(() => {
        setPattern(initialPattern);
        console.log('Pattern cleared!');
    }, [initialPattern]);

    return {
        isPlaying,
        togglePlay,
        bpm, setBpm,
        masterVolume, setMasterVolume,
        currentStep,
        pattern, toggleStep,
        drumKeys: Object.keys(drumKeyToNoteMap.current),
        STEPS_PER_MEASURE,
        isAudioReady, 
        isLoading,
        isSamplesLoaded, 
        error: audioContextError || loadError, // Combined error for display
        randomizePattern,
        clearPattern,
    };
};
// --- End useDrumSequencer Hook ---


// --- ParameterSlider Component ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '', isDisabled, colorClass = 'accent-green-600 bg-green-100' }) => (
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
        isSamplesLoaded,
        error, 
        randomizePattern,
        clearPattern,
    } = useDrumSequencer();

    // areControlsDisabled: Determines if any control (except Play) should be non-interactive.
    // This is true during initial setup (isLoading) or if there's any critical error.
    const areControlsDisabled = isLoading || !!error; 

    return (
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
                        Loading samples...
                    </p>
                )}
                {!isAudioReady && !isLoading && !error && (
                    <p className="text-green-700 text-xs md:text-sm mt-2 md:mt-4">
                        Tap "Play" to activate audio
                    </p>
                )}
                {isAudioReady && !isLoading && !error && (
                    <p className="text-green-600 text-xs md:text-sm mt-2 md:mt-4">
                        Ready! {isSamplesLoaded ? '(Using samples)' : '(Using fallback sounds)'}
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-xl shadow-lg w-full max-w-5xl flex flex-col items-center space-y-4 md:space-y-8 z-10 border border-green-200 mx-2">

                {/* Sequencer Controls (Play/Stop, Randomize, Clear) */}
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
                                className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center font-bold text-xxs md:text-xs mx-0.5
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
                    <div className="inline-grid gap-0.5 md:gap-1 py-1 md:py-2" style={{ gridTemplateColumns: `60px repeat(${STEPS_PER_MEASURE}, minmax(30px, 1fr))` }}>
                        {/* Header for steps */}
                        <div className="text-right pr-1 md:pr-2 font-bold text-gray-700"></div>
                        {Array.from({ length: STEPS_PER_MEASURE }).map((_, stepIdx) => (
                            <div key={`header-${stepIdx}`} className="text-center font-semibold text-green-700 text-xxs md:text-xs px-0.5 md:px-1">
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
                        min="40" max="240" step="1" unit=" BPM"
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
                    Tap squares to create beats. Samples load from `/drum_samples/`. Use "Random" for new patterns.
                </div>
            </div>
        </div>
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
}

export default DrumSequencer;