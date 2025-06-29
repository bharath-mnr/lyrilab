import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { Volume2, VolumeX, Music, Play } from 'lucide-react';

// --- usePianoSynth Hook ---
const usePianoSynth = (initialVolume = 0.7, initialMuteState = false) => {
    const synthRef = useRef(null);
    const [isSynthMuted, setIsSynthMuted] = useState(initialMuteState);
    const [synthVolume, setSynthVolume] = useState(initialVolume);
    const [isAudioReady, setIsAudioReady] = useState(false);

    const initializeAudio = useCallback(async () => {
        try {
            // Check Tone.context state before starting
            if (Tone.context.state !== 'running') {
                await Tone.start();
                console.log('Tone.js audio context started.');
            }

            // Initialize synth only once
            if (!synthRef.current) {
                synthRef.current = new Tone.PolySynth(Tone.Synth, {
                    oscillator: {
                        partials: [1, 0, 2, 0, 3] // Classic piano-like partials
                    },
                    envelope: {
                        attack: 0.006,
                        decay: 4,
                        sustain: 0.04,
                        release: 1.2,
                        attackCurve: "exponential"
                    }
                }).toDestination(); // Direct to speakers

                // Apply initial volume and mute state
                synthRef.current.volume.value = isSynthMuted ? -Infinity : Tone.gainToDb(synthVolume);
                console.log("Tone.js PolySynth created and ready.");
            }

            setIsAudioReady(true);
            return true;
        } catch (error) {
            console.error('Failed to initialize audio:', error);
            setIsAudioReady(false);
            return false;
        }
    }, [isSynthMuted, synthVolume]); // Re-create if these initial props change (rare for init)

    // Effect to update synth volume when state changes
    useEffect(() => {
        if (synthRef.current) {
            // Use Tone.js's rampTo for smooth volume changes
            synthRef.current.volume.rampTo(isSynthMuted ? -Infinity : Tone.gainToDb(synthVolume), 0.1);
        }
    }, [synthVolume, isSynthMuted]);

    // Cleanup: Dispose synth on component unmount
    useEffect(() => {
        return () => {
            if (synthRef.current) {
                synthRef.current.dispose();
                synthRef.current = null; // Clear ref
                console.log("Tone.js synth disposed.");
            }
        };
    }, []); // Empty dependency array means this runs once on mount and unmount

    const playNote = useCallback(async (note) => {
        const audioInitialized = await initializeAudio();
        if (!audioInitialized || !synthRef.current || isSynthMuted) {
            console.warn("Cannot play note - audio not ready or muted.");
            return;
        }

        try {
            synthRef.current.triggerAttack(note, Tone.now()); // Play immediately with precise timing
        } catch (error) {
            console.error('Error playing note:', error);
        }
    }, [isSynthMuted, initializeAudio]); // Only re-create if these change

    const stopNote = useCallback((note) => {
        if (synthRef.current) {
            try {
                synthRef.current.triggerRelease(note, Tone.now()); // Release immediately with precise timing
            } catch (error) {
                console.error('Error stopping note:', error);
            }
        }
    }, []); // No dependencies, always the same logic

    const releaseAllNotes = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.releaseAll();
            console.log("All notes released.");
        }
    }, []); // No dependencies, always the same logic

    const toggleMute = useCallback(() => {
        setIsSynthMuted(prev => !prev);
    }, []); // No dependencies, always the same logic

    return {
        playNote,
        stopNote,
        releaseAllNotes,
        isAudioReady,
        isSynthMuted,
        toggleMute,
        synthVolume,
        setSynthVolume,
        initializeAudio
    };
};

// --- Chord Definitions ---
const CHORDS = [
    { name: 'C Major', notes: ['C4', 'E4', 'G4'], intervals: ['1', '3', '5'] },
    { name: 'C Minor', notes: ['C4', 'Eb4', 'G4'], intervals: ['1', 'b3', '5'] },
    { name: 'C Diminished', notes: ['C4', 'Eb4', 'Gb4'], intervals: ['1', 'b3', 'b5'] },
    { name: 'C Augmented', notes: ['C4', 'E4', 'G#4'], intervals: ['1', '3', '#5'] },
    { name: 'C Major 7', notes: ['C4', 'E4', 'G4', 'B4'], intervals: ['1', '3', '5', '7'] },
    { name: 'C Minor 7', notes: ['C4', 'Eb4', 'G4', 'Bb4'], intervals: ['1', 'b3', '5', 'b7'] },
    { name: 'C Dominant 7', notes: ['C4', 'E4', 'G4', 'Bb4'], intervals: ['1', '3', '5', 'b7'] },
    { name: 'C Suspended 4', notes: ['C4', 'F4', 'G4'], intervals: ['1', '4', '5'] },
    { name: 'C 6th', notes: ['C4', 'E4', 'G4', 'A4'], intervals: ['1', '3', '5', '6'] },
    { name: 'C Minor 6th', notes: ['C4', 'Eb4', 'G4', 'A4'], intervals: ['1', 'b3', '5', '6'] },
    { name: 'C 9th', notes: ['C4', 'E4', 'G4', 'Bb4', 'D5'], intervals: ['1', '3', '5', 'b7', '9'] },
    { name: 'C Major 9th', notes: ['C4', 'E4', 'G4', 'B4', 'D5'], intervals: ['1', '3', '5', '7', '9'] },
];

const enharmonicMap = {
    'Db': 'C#',
    'Eb': 'D#',
    'Gb': 'F#',
    'Ab': 'G#',
    'Bb': 'A#'
};

const getStandardPianoNote = (note) => {
    const root = note.slice(0, -1);
    const octave = note.slice(-1);
    if (enharmonicMap[root]) {
        return enharmonicMap[root] + octave;
    }
    return note;
};

// --- Improved PianoKeys Component ---
const PianoKeys = React.memo(({ highlightedNotes, playNote, stopNote, isAudioReady }) => {
    const [pressedKeys, setPressedKeys] = useState(new Set());

    // Memoize the piano key layout to prevent unnecessary re-renders
    // Each position represents a "white key unit" or half for black keys
    const PIANO_KEY_LAYOUT = useMemo(() => [
        { note: 'C4', type: 'white', display: 'C', basePosition: 0 },
        { note: 'C#4', type: 'black', display: 'C#', basePosition: 0.5 },
        { note: 'D4', type: 'white', display: 'D', basePosition: 1 },
        { note: 'D#4', type: 'black', display: 'D#', basePosition: 1.5 },
        { note: 'E4', type: 'white', display: 'E', basePosition: 2 },
        { note: 'F4', type: 'white', display: 'F', basePosition: 3 },
        { note: 'F#4', type: 'black', display: 'F#', basePosition: 3.5 },
        { note: 'G4', type: 'white', display: 'G', basePosition: 4 },
        { note: 'G#4', type: 'black', display: 'G#', basePosition: 4.5 },
        { note: 'A4', type: 'white', display: 'A', basePosition: 5 },
        { note: 'A#4', type: 'black', display: 'A#', basePosition: 5.5 },
        { note: 'B4', type: 'white', display: 'B', basePosition: 6 },
        { note: 'C5', type: 'white', display: 'C', basePosition: 7 },
        { note: 'C#5', type: 'black', display: 'C#', basePosition: 7.5 },
        { note: 'D5', type: 'white', display: 'D', basePosition: 8 },
        { note: 'D#5', type: 'black', display: 'D#', basePosition: 8.5 },
        { note: 'E5', type: 'white', display: 'E', basePosition: 9 },
    ], []); // Empty dependency array, created once

    const handleInteractionStart = useCallback((note) => {
        if (!isAudioReady) return;
        setPressedKeys(prev => {
            const newSet = new Set(prev);
            newSet.add(note);
            return newSet;
        });
        playNote(note);
    }, [isAudioReady, playNote]);

    const handleInteractionEnd = useCallback((note) => {
        setPressedKeys(prev => {
            const newSet = new Set(prev);
            newSet.delete(note);
            return newSet;
        });
        stopNote(note);
    }, [stopNote]);

    const handleTouchStart = useCallback((note, e) => {
        e.preventDefault();
        handleInteractionStart(note);
    }, [handleInteractionStart]);

    const handleTouchEnd = useCallback((note) => {
        handleInteractionEnd(note);
    }, [handleInteractionEnd]);

    const whiteKeys = PIANO_KEY_LAYOUT.filter(key => key.type === 'white');
    const blackKeys = PIANO_KEY_LAYOUT.filter(key => key.type === 'black');

    // The total span of the white keys is 10 units (C4 to E5 inclusive, C4=0, D4=1 ... E5=9).
    // The width of a single white key is 1/10th of the total width.
    const numWhiteKeyUnits = 10; // C4 to E5 has 10 white keys positions including sharps.
                                 // C4, D4, E4, F4, G4, A4, B4, C5, D5, E5 = 10 white keys.
    const whiteKeyWidthUnit = 100 / numWhiteKeyUnits;
    const blackKeyWidthPercentage = whiteKeyWidthUnit * 0.6; // Black keys are typically ~60% width of white keys

    return (
        <div className="relative w-full overflow-hidden">
            <div className="flex relative w-full h-40"> {/* Fixed height, but flexible width for white keys */}
                {/* White Keys */}
                {whiteKeys.map((key) => {
                    const standardNote = getStandardPianoNote(key.note);
                    const isHighlighted = highlightedNotes.has(standardNote);
                    const isPressed = pressedKeys.has(key.note);

                    return (
                        <div
                            key={key.note}
                            className={`
                                flex-1 h-full border-2 rounded-b-lg shadow-lg flex items-end justify-center pb-3 text-xs font-bold cursor-pointer select-none transition-all duration-100 relative
                                ${isHighlighted
                                    ? 'bg-gradient-to-b from-yellow-200 to-yellow-400 border-yellow-500 shadow-yellow-300/50 transform scale-y-95'
                                    : isPressed
                                        ? 'bg-gradient-to-b from-gray-200 to-gray-400 border-gray-500 transform scale-y-98'
                                        : 'bg-gradient-to-b from-white to-gray-100 border-gray-300 hover:from-gray-50 hover:to-gray-200'
                                }
                                touch-manipulation active:scale-y-95
                            `}
                            onMouseDown={() => handleInteractionStart(key.note)}
                            onMouseUp={() => handleInteractionEnd(key.note)}
                            onMouseLeave={() => handleInteractionEnd(key.note)}
                            onTouchStart={(e) => handleTouchStart(key.note, e)}
                            onTouchEnd={() => handleTouchEnd(key.note)}
                            onTouchCancel={() => handleTouchEnd(key.note)}
                            style={{ width: `${whiteKeyWidthUnit}%`, marginRight: '-1px' }} // Apply the calculated unit width
                            role="button"
                            aria-label={`White piano key for ${key.display}${key.note.slice(-1)}`}
                        >
                            <span className={`${isHighlighted ? 'text-amber-800' : 'text-gray-600'} absolute bottom-2`}>
                                {key.display}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Black Keys */}
            <div className="absolute top-0 left-0 flex w-full h-2/3"> {/* Black keys take 2/3 height of white keys */}
                {blackKeys.map((key) => {
                    const standardNote = getStandardPianoNote(key.note);
                    const isHighlighted = highlightedNotes.has(standardNote);
                    const isPressed = pressedKeys.has(key.note);

                    // Calculate left position for black keys.
                    // This positions the *left edge* of the black key.
                    // The transform will then center it.
                    // Each full 'position' unit corresponds to one white key width.
                    // A black key at position X.5 means it's centered between white keys at X and X+1.
                    const leftPosition = (key.basePosition * whiteKeyWidthUnit);

                    return (
                        <div
                            key={key.note}
                            className={`
                                absolute h-full rounded-b-lg shadow-xl flex items-end justify-center pb-2 text-xs font-bold cursor-pointer select-none transition-all duration-100
                                ${isHighlighted
                                    ? 'bg-gradient-to-b from-orange-400 to-orange-600 text-white transform scale-y-95 shadow-orange-400/50'
                                    : isPressed
                                        ? 'bg-gradient-to-b from-gray-600 to-gray-800 text-white transform scale-y-98'
                                        : 'bg-gradient-to-b from-gray-800 to-black text-gray-300 hover:from-gray-700 hover:to-gray-900'
                                }
                                touch-manipulation active:scale-y-95
                            `}
                            style={{
                                width: `${blackKeyWidthPercentage}%`,
                                left: `${leftPosition}%`,
                                transform: 'translateX(-50%)', // Pull it back by half its own width to center
                                zIndex: 10
                            }}
                            onMouseDown={() => handleInteractionStart(key.note)}
                            onMouseUp={() => handleInteractionEnd(key.note)}
                            onMouseLeave={() => handleInteractionEnd(key.note)}
                            onTouchStart={(e) => handleTouchStart(key.note, e)}
                            onTouchEnd={() => handleTouchEnd(key.note)}
                            onTouchCancel={() => handleTouchEnd(key.note)}
                            role="button"
                            aria-label={`Black piano key for ${key.display}${key.note.slice(-1)}`}
                        >
                            {isHighlighted && (
                                <span className="text-white text-xs absolute bottom-2">
                                    {key.display.replace('#', '♯')}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

// --- Main Component ---
const ChordHighlightApp = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [highlightedNotes, setHighlightedNotes] = useState(new Set());
    const [selectedChord, setSelectedChord] = useState(CHORDS[0]);

    const {
        playNote,
        stopNote,
        releaseAllNotes,
        isAudioReady,
        isSynthMuted,
        toggleMute,
        synthVolume,
        setSynthVolume,
        initializeAudio
    } = usePianoSynth(0.7, false);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    const playChordAudio = useCallback(async (chord) => {
        const audioInitialized = await initializeAudio();
        if (!audioInitialized) {
            console.error('Audio initialization failed, cannot play chord.');
            return;
        }

        releaseAllNotes();

        if (isAudioReady && !isSynthMuted) {
            const notesToPlay = chord.notes.map(getStandardPianoNote);
            setHighlightedNotes(new Set(notesToPlay));

            notesToPlay.forEach(note => {
                playNote(note);
                setTimeout(() => stopNote(note), 1500);
            });

            setTimeout(() => {
                setHighlightedNotes(new Set());
            }, 2000);
        } else {
            setHighlightedNotes(new Set(chord.notes.map(getStandardPianoNote)));
            setTimeout(() => setHighlightedNotes(new Set()), 1000);
        }
    }, [initializeAudio, releaseAllNotes, isAudioReady, isSynthMuted, playNote, stopNote]);

    useEffect(() => {
        if (selectedChord) {
            playChordAudio(selectedChord);
        }
    }, [selectedChord, playChordAudio]);

    useEffect(() => {
        initializeAudio();
    }, [initializeAudio]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center"
                style={{
                    background: 'linear-gradient(135deg, #e5d4ff 0%, #d6bfff 50%, #c8aaff 100%)',
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-500 border-opacity-75 mx-auto mb-4"></div>
                    <p className="text-lg font-medium text-gray-700">Loading Chord Explorer...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex flex-col relative overflow-hidden p-4"
            style={{
                background: 'linear-gradient(135deg, #e5d4ff 0%, #d6bfff 50%, #c8aaff 100%)',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Header */}
            <div className="text-center py-8 px-4 z-10">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <Music className="text-indigo-600" size={32} />
                    <h1 className="text-4xl font-bold text-indigo-800">Chord Explorer</h1>
                </div>

                {isAudioReady ? (
                    <p className="text-purple-700 text-sm mt-2 font-medium">
                        🎵 Audio is active - Click chords or piano keys!
                    </p>
                ) : (
                    <p className="text-yellow-700 text-sm mt-2 font-medium animate-pulse">
                        Click any chord button or piano key to enable audio and start exploring!
                    </p>
                )}
            </div>

            {/* Volume Controls */}
            <div className="flex justify-center mb-6 z-10">
                <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-xl px-6 py-3 shadow-lg border border-indigo-200">
                    <button
                        onClick={toggleMute}
                        className="text-indigo-700 hover:text-indigo-900 transition-colors p-2 rounded-full hover:bg-indigo-100"
                        disabled={!isAudioReady}
                        aria-label={isSynthMuted ? "Unmute audio" : "Mute audio"}
                    >
                        {isSynthMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={synthVolume}
                        onChange={(e) => setSynthVolume(parseFloat(e.target.value))}
                        className="w-32 accent-indigo-600"
                        disabled={!isAudioReady}
                        aria-label="Volume slider"
                        aria-valuemin="0"
                        aria-valuemax="1"
                        aria-valuenow={synthVolume}
                        aria-valuetext={`${Math.round(synthVolume * 100)} percent volume`}
                    />
                    <span className="text-sm text-indigo-700 w-8 font-medium">{Math.round(synthVolume * 100)}</span>
                </div>
            </div>

            {/* Chord Selection */}
            <div className="flex justify-center flex-wrap gap-3 mb-8 px-4 max-w-6xl mx-auto z-10">
                {CHORDS.map((chord) => (
                    <button
                        key={chord.name}
                        onClick={() => setSelectedChord(chord)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-md
                            ${selectedChord.name === chord.name
                                ? 'bg-indigo-600 text-white shadow-lg transform scale-105 shadow-indigo-300/50'
                                : 'bg-white/90 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 border border-indigo-200 hover:shadow-lg'
                            }
                        `}
                        aria-pressed={selectedChord.name === chord.name}
                        aria-label={`Play and highlight ${chord.name} chord`}
                    >
                        {chord.name}
                    </button>
                ))}
            </div>

            {/* Piano & Chord Info Display */}
            <div className="flex-1 flex flex-col items-center justify-center px-4 z-10 w-full">
                <div className="w-full max-w-full overflow-x-auto flex flex-col items-center">
                    {/* Current Chord Info */}
                    {selectedChord && (
                        <div className="mb-8 text-center bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-indigo-200">
                            <h2 className="text-3xl font-bold text-indigo-800 mb-2">
                                {selectedChord.name}
                            </h2>
                            <p className="text-xl text-indigo-700 mb-1">
                                Intervals: {selectedChord.intervals.join(' - ')}
                            </p>
                            <p className="text-lg text-gray-700">
                                Notes: {selectedChord.notes.map(getStandardPianoNote).join(', ')}
                            </p>
                        </div>
                    )}

                    {/* Piano Frame with Improved Design */}
                    <div className="bg-gradient-to-b from-amber-800 via-amber-900 to-amber-950 p-4 sm:p-8 rounded-3xl shadow-2xl border-4 border-amber-700 w-full max-w-2xl">
                        <div className="bg-gradient-to-b from-gray-900 to-black p-3 sm:p-6 rounded-2xl shadow-inner border-2 border-gray-800">
                            <div className="bg-black p-2 sm:p-4 rounded-xl relative">
                                <PianoKeys
                                    highlightedNotes={highlightedNotes}
                                    playNote={playNote}
                                    stopNote={stopNote}
                                    isAudioReady={isAudioReady}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Piano Legs - Enhanced Design */}
                    <div className="flex justify-between px-10 sm:px-20 mt-6 w-full max-w-lg">
                        <div className="w-8 sm:w-10 h-16 sm:h-20 bg-gradient-to-b from-amber-800 to-amber-900 rounded-b-2xl shadow-xl border-2 border-amber-700"></div>
                        <div className="w-8 sm:w-10 h-16 sm:h-20 bg-gradient-to-b from-amber-800 to-amber-900 rounded-b-2xl shadow-xl border-2 border-amber-700"></div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center py-6 text-indigo-700 px-4 z-10">
                <p className="text-sm bg-white/60 backdrop-blur-sm rounded-lg p-3 inline-block">
                    Click chord buttons to hear them, or interact directly with the piano keys
                </p>
            </div>
        </div>
    );
};

// Error Boundary for robust error handling
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error in ChordHighlightApp:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Chord Explorer. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

const ChordHighlightPage = () => {
    return (
        <ErrorBoundary>
            <ChordHighlightApp />
        </ErrorBoundary>
    );
}

export default ChordHighlightPage;