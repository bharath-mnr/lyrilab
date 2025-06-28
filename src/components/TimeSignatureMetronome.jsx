import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Music, Volume2, VolumeX, Clock } from 'lucide-react';

// --- AUDIO CONTEXT ---
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);
    const [error, setError] = useState(null);

    const startGlobalAudio = useCallback(async () => {
        if (Tone.context.state === 'running') {
            setIsAudioGloballyReady(true);
            setError(null);
            return;
        }

        try {
            await Tone.start();
            setIsAudioGloballyReady(true);
            setError(null);
        } catch (error) {
            setError(`Failed to initialize audio: ${error.message}`);
            setIsAudioGloballyReady(false);
        }
    }, []);

    useEffect(() => {
        const handleToneContextChange = () => {
            if (Tone.context.state === 'running') {
                setIsAudioGloballyReady(true);
                setError(null);
            } else {
                setIsAudioGloballyReady(false);
                if (!error) setError("Audio context suspended. Click to activate.");
            }
        };

        Tone.context.on('statechange', handleToneContextChange);
        handleToneContextChange();

        return () => {
            Tone.context.off('statechange', handleToneContextChange);
        };
    }, [error]);

    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, startGlobalAudio, error }}>
            {children}
        </AudioContext.Provider>
    );
};

// --- useMetronome Hook ---
const useMetronome = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const synthRef = useRef(null);
    const sequenceRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [bpm, setBpm] = useState(120);
    const [numerator, setNumerator] = useState(4);
    const [denominator, setDenominator] = useState(4);
    const [currentBeat, setCurrentBeat] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [metronomeVolume, setMetronomeVolume] = useState(-10);
    const [isMetronomeInitialized, setIsMetronomeInitialized] = useState(false);

    const disposeMetronome = useCallback(() => {
        if (sequenceRef.current) {
            sequenceRef.current.stop();
            sequenceRef.current.dispose();
            sequenceRef.current = null;
        }
        if (synthRef.current) {
            synthRef.current.dispose();
            synthRef.current = null;
        }
        Tone.Transport.stop();
        Tone.Transport.cancel();
        setIsPlaying(false);
        setCurrentBeat(0);
    }, []);

    useEffect(() => {
        const setupMetronome = async () => {
            if (isMetronomeInitialized) return;

            try {
                // Create a simple synth for metronome clicks
                const synth = new Tone.Synth({
                    oscillator: {
                        type: 'sine'
                    },
                    envelope: {
                        attack: 0.01,
                        decay: 0.1,
                        sustain: 0,
                        release: 0.1
                    }
                }).toDestination();
                
                synthRef.current = synth;
                setIsMetronomeInitialized(true);

            } catch (error) {
                console.error("Metronome setup error:", error);
                setIsMetronomeInitialized(false);
            }
        };

        setupMetronome();
        return () => disposeMetronome();
    }, []); // Empty dependency array - only run once on mount

    useEffect(() => {
        if (!isMetronomeInitialized || !synthRef.current) return;

        // Set transport BPM
        Tone.Transport.bpm.value = bpm;
        
        // Set synth volume
        synthRef.current.volume.value = isMuted ? -Infinity : metronomeVolume;

        // Store current playing state
        const wasPlaying = isPlaying;

        // Clear existing sequence
        if (sequenceRef.current) {
            sequenceRef.current.stop();
            sequenceRef.current.dispose();
        }

        // Calculate the correct subdivision based on denominator
        // denominator 4 = quarter note, 8 = eighth note, etc.
        const subdivision = `${denominator}n`;
        
        // Create sequence events for each beat in the measure
        const events = [];
        for (let i = 0; i < numerator; i++) {
            events.push({
                time: i * Tone.Time(subdivision).toSeconds(),
                note: i === 0 ? 'C5' : 'C4', // First beat is higher pitch (accent)
                beatNumber: i + 1
            });
        }

        // Create new sequence
        const sequence = new Tone.Sequence((time, event) => {
            if (!isMuted && synthRef.current) {
                synthRef.current.triggerAttackRelease(event.note, '8n', time);
            }
            
            // Update beat indicator
            Tone.Draw.schedule(() => {
                setCurrentBeat(event.beatNumber);
            }, time);
        }, events, subdivision);

        sequenceRef.current = sequence;

        // If it was playing, restart it immediately
        if (wasPlaying && Tone.Transport.state === 'started') {
            sequence.start(0);
        }

    }, [bpm, numerator, denominator, isMuted, metronomeVolume, isMetronomeInitialized, isPlaying]);

    const togglePlay = useCallback(async () => {
        if (!isMetronomeInitialized || !synthRef.current) return;

        await startGlobalAudio();
        if (!isAudioGloballyReady) return;

        if (isPlaying) {
            Tone.Transport.stop();
            if (sequenceRef.current) {
                sequenceRef.current.stop();
            }
            setIsPlaying(false);
            setCurrentBeat(0);
        } else {
            setCurrentBeat(0);
            if (sequenceRef.current) {
                sequenceRef.current.start(0);
            }
            Tone.Transport.start();
            setIsPlaying(true);
        }
    }, [isPlaying, isMetronomeInitialized, startGlobalAudio, isAudioGloballyReady]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    return {
        isPlaying,
        togglePlay,
        bpm, setBpm,
        numerator, setNumerator,
        denominator, setDenominator,
        currentBeat,
        isMuted, toggleMute,
        metronomeVolume, setMetronomeVolume,
        isAudioReady: isAudioGloballyReady && isMetronomeInitialized,
    };
};

// --- ParameterSlider Component ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '', isAudioReady, colorClass = 'accent-blue-600' }) => (
    <div className="flex flex-col items-center w-full px-2">
        <label className="text-gray-800 font-medium mb-1 text-sm md:text-base text-center">
            {label}: {value}{unit}
        </label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setter(parseFloat(e.target.value))}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${colorClass} bg-blue-100`}
            disabled={!isAudioReady}
        />
        <p className="text-gray-600 text-xs md:text-sm mt-1 italic text-center">
            {explanation}
        </p>
    </div>
);

// --- Main Component ---
const TimeSignatureMetronomeContent = () => {
    const {
        isPlaying, togglePlay,
        bpm, setBpm,
        numerator, setNumerator,
        denominator, setDenominator,
        currentBeat,
        isMuted, toggleMute,
        metronomeVolume, setMetronomeVolume,
        isAudioReady,
    } = useMetronome();

    const denominatorOptions = [2, 4, 8, 16];

    return (
        <div className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #f0f9ff 0%, #d8f0ff 50%, #c0e7ff 100%)',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%2367e8f9' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            />

            <div className="text-center mb-6 md:mb-10 z-10 w-full">
                <div className="flex items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                    <Clock size={32} className="text-blue-700 md:h-12 md:w-12" />
                    <h1 className="text-3xl md:text-5xl font-extrabold text-blue-900 drop-shadow-lg">
                        Metronome
                    </h1>
                </div>
                {!isAudioReady && (
                    <p className="text-blue-700 text-xs md:text-sm mt-2 md:mt-4">
                        Audio loading... Click "Play" to activate
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-xl shadow-lg w-full max-w-3xl flex flex-col items-center space-y-4 md:space-y-6 z-10 border border-blue-200">

                {/* Time Signature Display */}
                <div className="text-center mb-4">
                    <div className="text-6xl md:text-8xl font-bold text-blue-900 leading-none">
                        <span>{numerator}</span>
                        <div className="border-t-4 border-blue-900 mx-4 inline-block w-8"></div>
                        <span>{denominator}</span>
                    </div>
                    <p className="text-gray-600 text-sm mt-2">
                        {numerator} beats per measure, {denominator === 4 ? 'quarter' : denominator === 8 ? 'eighth' : denominator === 2 ? 'half' : 'sixteenth'} note gets the beat
                    </p>
                </div>

                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-3 md:gap-4 w-full justify-center">
                    <button
                        onClick={togglePlay}
                        className={`flex items-center justify-center gap-2 px-4 py-3 md:px-6 md:py-3 rounded-full font-bold text-sm md:text-base shadow-md transition-all ${
                            isPlaying 
                                ? 'bg-red-500 hover:bg-red-600 text-white' 
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                        } ${!isAudioReady ? 'opacity-70' : ''}`}
                        disabled={!isAudioReady}
                    >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                        {isPlaying ? 'Stop' : 'Play'}
                    </button>

                    <button
                        onClick={toggleMute}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-full font-bold text-sm md:text-base shadow-md transition-all ${
                            isMuted 
                                ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                                : 'bg-blue-400 hover:bg-blue-500 text-white'
                        } ${!isAudioReady ? 'opacity-70' : ''}`}
                        disabled={!isAudioReady}
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                </div>

                {/* Beat Indicator */}
                <div className="w-full overflow-x-auto py-2">
                    <div className="flex min-w-max justify-center">
                        {Array.from({ length: numerator }).map((_, idx) => (
                            <div
                                key={idx}
                                className={`w-12 h-16 md:w-16 md:h-20 mx-1 rounded-lg flex items-center justify-center text-2xl md:text-4xl font-bold transition-all duration-75 ${
                                    currentBeat === idx + 1
                                        ? idx === 0 
                                            ? 'bg-red-600 text-white shadow-lg scale-110' // First beat (downbeat) is red
                                            : 'bg-blue-600 text-white shadow-lg scale-110'
                                        : idx === 0
                                            ? 'bg-red-200 text-red-700' // First beat indicator is red even when inactive
                                            : 'bg-blue-200 text-blue-700'
                                }`}
                            >
                                {idx + 1}
                            </div>
                        ))}
                    </div>
                </div>

                {/* BPM Slider */}
                <ParameterSlider
                    label="Tempo" value={bpm} setter={setBpm}
                    min="40" max="240" step="1" unit=" BPM"
                    explanation="Beats per minute (speed)"
                    isAudioReady={isAudioReady}
                />

                {/* Time Signature Controls */}
                <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="flex flex-col items-center">
                        <label className="text-gray-800 font-medium mb-1 text-sm md:text-base">
                            Beats per Measure
                        </label>
                        <select
                            value={numerator}
                            onChange={(e) => setNumerator(parseInt(e.target.value))}
                            className="w-full p-2 md:p-3 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 focus:ring-2 focus:ring-blue-500"
                            disabled={!isAudioReady}
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                                <option key={num} value={num}>{num}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col items-center">
                        <label className="text-gray-800 font-medium mb-1 text-sm md:text-base">
                            Beat Note Value
                        </label>
                        <select
                            value={denominator}
                            onChange={(e) => setDenominator(parseInt(e.target.value))}
                            className="w-full p-2 md:p-3 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 focus:ring-2 focus:ring-blue-500"
                            disabled={!isAudioReady}
                        >
                            {denominatorOptions.map(den => (
                                <option key={den} value={den}>
                                    {den === 2 ? '2 (Half Note)' : 
                                     den === 4 ? '4 (Quarter Note)' : 
                                     den === 8 ? '8 (Eighth Note)' : 
                                     '16 (Sixteenth Note)'}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Volume Slider */}
                <ParameterSlider
                    label="Volume" value={metronomeVolume} setter={setMetronomeVolume}
                    min="-40" max="0" step="1" unit=" dB"
                    explanation="Adjust metronome loudness"
                    isAudioReady={isAudioReady}
                />

                <p className="text-gray-600 text-xs md:text-sm text-center mt-2 px-4">
                    Set your desired time signature and tempo, then click Play to start the metronome. The first beat (downbeat) is accented with a higher pitch and red color.
                </p>
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
        console.error("Metronome error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 p-4">
                    <h2 className="text-lg md:text-xl">Metronome error. Please refresh.</h2>
                </div>
            );
        }
        return this.props.children;
    }
}

// Main Export
const TimeSignatureMetronome = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <TimeSignatureMetronomeContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
};

export default TimeSignatureMetronome;