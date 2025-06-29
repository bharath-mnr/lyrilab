import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { Music, Play, Piano, Volume2, VolumeX, Volume1 } from 'lucide-react';

// --- usePianoSynth Hook ---
const usePianoSynth = (initialVolume = 0.7, initialMuteState = false) => {
    const synthRef = useRef(null);
    const [isSynthMuted, setIsSynthMuted] = useState(initialMuteState);
    const [synthVolume, setSynthVolume] = useState(initialVolume);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isAudioReady, setIsAudioReady] = useState(false);
    const activeNotesRef = useRef(new Set());
    const initializationRef = useRef(false);

    const initializeAudio = useCallback(async () => {
        if (initializationRef.current) return true;
        initializationRef.current = true;

        try {
            if (Tone.context.state !== 'running') {
                await Tone.start();
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (synthRef.current) {
                synthRef.current.dispose();
                synthRef.current = null;
            }

            synthRef.current = new Tone.PolySynth(Tone.Synth, {
                oscillator: {
                    partials: [1, 0, 2, 0, 3]
                },
                envelope: {
                    attack: 0.01,
                    decay: 2,
                    sustain: 0.1,
                    release: 0.8,
                    attackCurve: "exponential"
                }
            }).toDestination();

            synthRef.current.volume.value = isSynthMuted ? -Infinity : Tone.gainToDb(synthVolume);
            setIsAudioReady(true);
            return true;
        } catch (error) {
            console.error('Audio initialization failed:', error);
            setIsAudioReady(false);
            initializationRef.current = false;
            return false;
        }
    }, [isSynthMuted, synthVolume]);

    useEffect(() => {
        if (synthRef.current && initializationRef.current) {
            try {
                synthRef.current.volume.value = isSynthMuted ? -Infinity : Tone.gainToDb(synthVolume);
            } catch (error) {
                console.error('Error updating volume:', error);
            }
        }
    }, [synthVolume, isSynthMuted]);

    useEffect(() => {
        return () => {
            if (synthRef.current) {
                try {
                    activeNotesRef.current.forEach(note => {
                        synthRef.current.triggerRelease(note);
                    });
                    activeNotesRef.current.clear();
                    synthRef.current.dispose();
                    synthRef.current = null;
                } catch (error) {
                    console.error('Error during cleanup:', error);
                }
            }
            initializationRef.current = false;
        };
    }, []);

    const playNote = useCallback(async (note) => {
        try {
            const audioInitialized = await initializeAudio();
            if (!audioInitialized || !synthRef.current || isSynthMuted) {
                return false;
            }

            if (typeof note !== 'string' || !note.match(/^[A-G][#b]?[0-9]$/)) {
                console.error('Invalid note format:', note);
                return false;
            }

            if (activeNotesRef.current.has(note)) {
                synthRef.current.triggerRelease(note);
                activeNotesRef.current.delete(note);
            }

            synthRef.current.triggerAttack(note);
            activeNotesRef.current.add(note);
            return true;
        } catch (error) {
            console.error('Error playing note:', error);
            return false;
        }
    }, [isSynthMuted, initializeAudio]);

    const stopNote = useCallback((note) => {
        try {
            if (synthRef.current && activeNotesRef.current.has(note)) {
                synthRef.current.triggerRelease(note);
                activeNotesRef.current.delete(note);
                return true;
            }
        } catch (error) {
            console.error('Error stopping note:', error);
        }
        return false;
    }, []);

    const stopAllNotes = useCallback(() => {
        try {
            if (synthRef.current) {
                activeNotesRef.current.forEach(note => {
                    synthRef.current.triggerRelease(note);
                });
                activeNotesRef.current.clear();
            }
        } catch (error) {
            console.error('Error stopping all notes:', error);
        }
    }, []);

    const toggleMute = useCallback(() => {
        setIsSynthMuted(prev => !prev);
    }, []);

    return {
        playNote,
        stopNote,
        stopAllNotes,
        isAudioReady,
        isSynthMuted,
        toggleMute,
        synthVolume,
        setSynthVolume,
        isPlaying,
        setIsPlaying,
        initializeAudio
    };
};

// --- useIntervalTrainer Hook ---
const useIntervalTrainer = () => {
    const {
        playNote,
        stopNote,
        stopAllNotes,
        isAudioReady,
        isSynthMuted,
        toggleMute,
        isPlaying,
        setIsPlaying,
        initializeAudio
    } = usePianoSynth();

    const [currentIntervalNotes, setCurrentIntervalNotes] = useState([]);
    const [currentIntervalSemitones, setCurrentIntervalSemitones] = useState(0);
    const [randomIntervalName, setRandomIntervalName] = useState('');
    const [playedNotes, setPlayedNotes] = useState([]);
    const [currentRootNote, setCurrentRootNote] = useState('C4');
    const playbackTimeoutsRef = useRef([]);

    const INTERVALS = useRef([
        { name: 'Unison', semitones: 0 },
        { name: 'Minor 2nd', semitones: 1 },
        { name: 'Major 2nd', semitones: 2 },
        { name: 'Minor 3rd', semitones: 3 },
        { name: 'Major 3rd', semitones: 4 },
        { name: 'Perfect 4th', semitones: 5 },
        { name: 'Tritone', semitones: 6 },
        { name: 'Perfect 5th', semitones: 7 },
        { name: 'Minor 6th', semitones: 8 },
        { name: 'Major 6th', semitones: 9 },
        { name: 'Minor 7th', semitones: 10 },
        { name: 'Major 7th', semitones: 11 },
        { name: 'Octave', semitones: 12 },
    ]);

    useEffect(() => {
        return () => {
            playbackTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            playbackTimeoutsRef.current = [];
        };
    }, []);

    const noteToMidi = useCallback((note) => {
        try {
            return Tone.Midi(note).toMidi();
        } catch (error) {
            console.error('Error converting note to MIDI:', note, error);
            return null;
        }
    }, []);

    const midiToNote = useCallback((midi) => {
        try {
            return Tone.Midi(midi).toNote();
        } catch (error) {
            console.error('Error converting MIDI to note:', midi, error);
            return null;
        }
    }, []);

    const clearPlaybackTimeouts = useCallback(() => {
        playbackTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
        playbackTimeoutsRef.current = [];
    }, []);

    // Improved interval generation with better musical logic
    const generateMusicallyValidInterval = useCallback((rootNote, intervalSemitones) => {
        const rootMidi = noteToMidi(rootNote);
        if (rootMidi === null) return null;

        const targetMidi = rootMidi + intervalSemitones;
        
        // Ensure we stay within a reasonable range (C2 to C7)
        if (targetMidi < 36 || targetMidi > 96) {
            // Try different octaves of the root note
            const noteWithoutOctave = rootNote.slice(0, -1);
            for (let octave = 2; octave <= 6; octave++) {
                const testRoot = noteWithoutOctave + octave;
                const testRootMidi = noteToMidi(testRoot);
                const testTargetMidi = testRootMidi + intervalSemitones;
                
                if (testTargetMidi >= 36 && testTargetMidi <= 96) {
                    const secondNote = midiToNote(testTargetMidi);
                    if (secondNote) {
                        return {
                            rootNote: testRoot,
                            secondNote: secondNote,
                            rootMidi: testRootMidi,
                            secondMidi: testTargetMidi
                        };
                    }
                }
            }
            return null;
        }

        const secondNote = midiToNote(targetMidi);
        if (!secondNote) return null;

        return {
            rootNote: rootNote,
            secondNote: secondNote,
            rootMidi: rootMidi,
            secondMidi: targetMidi
        };
    }, [noteToMidi, midiToNote]);

    const playInterval = useCallback(async (root, intervalSemitones, isRandom = false) => {
        if (isPlaying) {
            console.log('Already playing, skipping...');
            return;
        }

        clearPlaybackTimeouts();
        stopAllNotes();

        try {
            const audioReady = await initializeAudio();
            if (!audioReady) {
                console.error('Audio not ready');
                return;
            }

            // Generate musically valid interval
            const intervalData = generateMusicallyValidInterval(root, intervalSemitones);
            if (!intervalData) {
                console.error('Could not generate valid interval');
                return;
            }

            const { rootNote, secondNote } = intervalData;

            setIsPlaying(true);
            setCurrentIntervalNotes([rootNote, secondNote]);
            setPlayedNotes([rootNote, secondNote]);
            setCurrentRootNote(rootNote);
            setCurrentIntervalSemitones(intervalSemitones);

            if (isRandom) {
                const interval = INTERVALS.current.find(int => int.semitones === intervalSemitones);
                if (interval) {
                    setRandomIntervalName(`${interval.name} (${interval.semitones} semitones)`);
                } else {
                    setRandomIntervalName(`Unknown Interval (${intervalSemitones} semitones)`);
                }
            } else {
                setRandomIntervalName('');
            }

            // Play the first note
            const firstNoteSuccess = await playNote(rootNote);
            if (!firstNoteSuccess) {
                throw new Error('Failed to play first note');
            }

            // Schedule the second note playback
            const timeout1 = setTimeout(async () => {
                try {
                    stopNote(rootNote);
                    const secondNoteSuccess = await playNote(secondNote);

                    if (secondNoteSuccess) {
                        const timeout2 = setTimeout(() => {
                            stopNote(secondNote);
                            setIsPlaying(false);

                            const timeout3 = setTimeout(() => {
                                setCurrentIntervalNotes([]);
                            }, 500);
                            playbackTimeoutsRef.current.push(timeout3);
                        }, 1000);
                        playbackTimeoutsRef.current.push(timeout2);
                    } else {
                        setIsPlaying(false);
                        setCurrentIntervalNotes([]);
                        console.error('Failed to play second note.');
                    }
                } catch (error) {
                    console.error('Error during second note playback sequence:', error);
                    setIsPlaying(false);
                    setCurrentIntervalNotes([]);
                }
            }, 1000);

            playbackTimeoutsRef.current.push(timeout1);

        } catch (error) {
            console.error('Error playing interval:', error);
            setIsPlaying(false);
            setCurrentIntervalNotes([]);
            clearPlaybackTimeouts();
            stopAllNotes();
        }
    }, [isPlaying, generateMusicallyValidInterval, playNote, stopNote, stopAllNotes, setIsPlaying, initializeAudio, clearPlaybackTimeouts]);

    const generateRandomInterval = useCallback(() => {
        if (isPlaying) {
            console.log('Already playing, skipping random interval generation...');
            return;
        }

        // More musical root note selection
        const rootNotes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
        const randomRoot = rootNotes[Math.floor(Math.random() * rootNotes.length)];
        
        // Include more intervals but weight them musically
        const intervalWeights = [
            { interval: INTERVALS.current[2], weight: 3 }, // Major 2nd
            { interval: INTERVALS.current[3], weight: 4 }, // Minor 3rd
            { interval: INTERVALS.current[4], weight: 4 }, // Major 3rd
            { interval: INTERVALS.current[5], weight: 3 }, // Perfect 4th
            { interval: INTERVALS.current[6], weight: 2 }, // Tritone
            { interval: INTERVALS.current[7], weight: 4 }, // Perfect 5th
            { interval: INTERVALS.current[8], weight: 3 }, // Minor 6th
            { interval: INTERVALS.current[9], weight: 3 }, // Major 6th
            { interval: INTERVALS.current[10], weight: 2 }, // Minor 7th
            { interval: INTERVALS.current[11], weight: 2 }, // Major 7th
            { interval: INTERVALS.current[12], weight: 3 }, // Octave
        ];

        // Create weighted array
        const weightedIntervals = [];
        intervalWeights.forEach(({ interval, weight }) => {
            for (let i = 0; i < weight; i++) {
                weightedIntervals.push(interval);
            }
        });

        const randomInterval = weightedIntervals[Math.floor(Math.random() * weightedIntervals.length)];
        playInterval(randomRoot, randomInterval.semitones, true);
    }, [playInterval, isPlaying]);

    const stopPlayback = useCallback(() => {
        clearPlaybackTimeouts();
        stopAllNotes();
        setIsPlaying(false);
        setCurrentIntervalNotes([]);
        setRandomIntervalName('');
        setPlayedNotes([]);
    }, [clearPlaybackTimeouts, stopAllNotes, setIsPlaying]);

    return {
        isAudioReady,
        INTERVALS: INTERVALS.current,
        currentIntervalNotes,
        currentIntervalSemitones,
        currentRootNote,
        playInterval,
        generateRandomInterval,
        randomIntervalName,
        playedNotes,
        isSynthMuted,
        toggleMute,
        isPlaying,
        stopPlayback
    };
};

// --- Piano Visualizer Component ---
const PianoVisualizer = ({ highlightedNotes }) => {
    const WHITE_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const BLACK_KEYS = ['C#', 'D#', 'F#', 'G#', 'A#'];

    // Improved note comparison that handles enharmonic equivalents
    const normalizeNote = useCallback((note) => {
        if (!note) return null;
        
        try {
            const midi = Tone.Midi(note).toMidi();
            // Convert back to note to get consistent naming
            return Tone.Midi(midi).toNote();
        } catch (e) {
            console.warn(`Invalid note: ${note}`);
            return null;
        }
    }, []);

    const isNoteHighlighted = useCallback((noteToCheck) => {
        if (!highlightedNotes || highlightedNotes.length === 0) return false;

        const normalizedCheck = normalizeNote(noteToCheck);
        if (!normalizedCheck) return false;

        return highlightedNotes.some(highlightedNote => {
            const normalizedHighlighted = normalizeNote(highlightedNote);
            return normalizedHighlighted === normalizedCheck;
        });
    }, [highlightedNotes, normalizeNote]);

    // Determine octave range based on highlighted notes
    let minOctave = 3;
    let maxOctave = 5;
    
    if (highlightedNotes && highlightedNotes.length > 0) {
        const octaves = highlightedNotes
            .map(note => {
                const normalized = normalizeNote(note);
                if (normalized) {
                    const match = normalized.match(/(\d+)$/);
                    return match ? parseInt(match[1]) : null;
                }
                return null;
            })
            .filter(octave => octave !== null);

        if (octaves.length > 0) {
            minOctave = Math.max(Math.min(...octaves) - 1, 2);
            maxOctave = Math.min(Math.max(...octaves) + 1, 6);
        }
    }

    const renderOctave = useCallback((octaveNum) => {
        const octaveElements = [];

        // Render white keys
        WHITE_KEYS.forEach((noteName, index) => {
            const fullNoteName = noteName + octaveNum;
            const isHighlighted = isNoteHighlighted(fullNoteName);

            octaveElements.push(
                <div
                    key={fullNoteName}
                    className={`relative w-10 h-32 border-2 border-gray-400 bg-white rounded-b-lg shadow-md flex items-end justify-center pb-2 text-xs font-bold transition-all duration-300 ease-out
                                ${isHighlighted 
                                    ? 'bg-gradient-to-b from-blue-200 to-blue-400 border-blue-600 shadow-xl transform scale-105 z-20' 
                                    : 'hover:bg-gray-50'}
                                `}
                    style={{ 
                        zIndex: isHighlighted ? 20 : 1,
                        marginLeft: index > 0 ? '-1px' : '0' // Slight overlap for cleaner look
                    }}
                >
                    <span className={`${isHighlighted ? 'text-blue-900' : 'text-gray-600'} font-semibold`}>
                        {noteName}{octaveNum}
                    </span>
                </div>
            );
        });

        // Render black keys with proper positioning
        const blackKeyPositions = [
            { note: 'C#', leftOffset: 30 },  // Between C and D
            { note: 'D#', leftOffset: 70 },  // Between D and E
            { note: 'F#', leftOffset: 150 }, // Between F and G
            { note: 'G#', leftOffset: 190 }, // Between G and A
            { note: 'A#', leftOffset: 230 }  // Between A and B
        ];

        blackKeyPositions.forEach(({ note, leftOffset }) => {
            const fullNoteName = note + octaveNum;
            const isHighlighted = isNoteHighlighted(fullNoteName);

            octaveElements.push(
                <div
                    key={fullNoteName}
                    className={`absolute w-6 h-20 rounded-b-md shadow-lg flex items-end justify-center pb-1 text-xs font-bold transition-all duration-300 ease-out
                                ${isHighlighted 
                                    ? 'bg-gradient-to-b from-purple-400 to-purple-700 shadow-2xl transform scale-110 z-30' 
                                    : 'bg-gradient-to-b from-gray-800 to-black hover:from-gray-700'}
                                `}
                    style={{
                        left: `${leftOffset}px`,
                        zIndex: isHighlighted ? 30 : 10,
                    }}
                >
                    <span className={`${isHighlighted ? 'text-white font-bold' : 'text-gray-300'} text-xs`}>
                        {isHighlighted ? note : ''}
                    </span>
                </div>
            );
        });

        return octaveElements;
    }, [isNoteHighlighted]);

    const allOctaveRender = [];
    for (let octave = minOctave; octave <= maxOctave; octave++) {
        allOctaveRender.push(
            <div key={`octave-${octave}`} className="flex relative" style={{ width: '280px' }}>
                {renderOctave(octave)}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center p-6 bg-gradient-to-b from-gray-100 to-gray-200 rounded-xl shadow-inner border-2 border-gray-300 w-full overflow-x-auto">
            <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-3">
                <Piano size={24} /> Piano Visualizer
            </h3>
            <div className="flex relative justify-center overflow-x-auto w-full pb-4">
                <div className="flex bg-gray-800 p-4 rounded-lg shadow-lg">
                    {allOctaveRender}
                </div>
            </div>
            {highlightedNotes && highlightedNotes.length > 0 && (
                <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600 font-medium">
                        Playing: {highlightedNotes.join(' → ')}
                    </p>
                </div>
            )}
        </div>
    );
};

// --- Main App Component ---
const IntervalTrainingApp = () => {
    const [selectedIntervalSemitones, setSelectedIntervalSemitones] = useState(7);

    const {
        isAudioReady,
        INTERVALS,
        currentIntervalNotes,
        currentRootNote,
        playInterval,
        generateRandomInterval,
        randomIntervalName,
        isSynthMuted,
        toggleMute,
        isPlaying,
        stopPlayback
    } = useIntervalTrainer();

    const handleIntervalSelect = (event) => {
        const semitones = parseInt(event.target.value, 10);
        setSelectedIntervalSemitones(semitones);
    };

    const handlePlayRandom = () => {
        if (isPlaying) {
            stopPlayback();
        } else {
            generateRandomInterval();
        }
    };

    const handlePlayInterval = () => {
        if (isPlaying) {
            stopPlayback();
        } else {
            playInterval(currentRootNote, selectedIntervalSemitones, false);
        }
    };

    const selectedInterval = INTERVALS.find(interval => interval.semitones === selectedIntervalSemitones);

    return (
        <div
            className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #e0f2f7 0%, #b3e5fc 50%, #81d4fa 100%)',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%2303a9f4' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            {/* Header */}
            <div className="text-center mb-6 md:mb-10 z-10 w-full">
                <div className="flex items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                    <Music size={32} className="text-blue-700 md:h-12 md:w-12" />
                    <h1 className="text-3xl md:text-5xl font-extrabold text-blue-900 drop-shadow-lg">Interval Training</h1>
                </div>
                
            </div>

            {/* Main Content */}
            <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 lg:p-8 rounded-xl shadow-lg w-full max-w-5xl flex flex-col items-center space-y-4 md:space-y-6 lg:space-y-8 z-10 border border-blue-200">

                {/* Audio Controls */}
                <section className="w-full flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-4 md:mb-6">
                    <div className="flex items-center gap-2 md:gap-4">
                        <span className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium ${isAudioReady ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {isAudioReady ? '🔊 Audio Ready' : '🔇 Audio Not Initialized'}
                        </span>
                        <button
                            onClick={toggleMute}
                            className="px-3 py-1 md:px-4 md:py-2 rounded-full font-bold text-xs md:text-sm flex items-center gap-1 md:gap-2 transition-all duration-300 bg-blue-500 hover:bg-blue-600 text-white"
                        >
                            {isSynthMuted ? <VolumeX size={16} className="md:h-5 md:w-5" /> : <Volume1 size={16} className="md:h-5 md:w-5" />}
                            {isSynthMuted ? 'Unmute' : 'Mute'}
                        </button>
                        {isPlaying && (
                            <button
                                onClick={stopPlayback}
                                className="px-3 py-1 md:px-4 md:py-2 rounded-full font-bold text-xs md:text-sm flex items-center gap-1 md:gap-2 transition-all duration-300 bg-red-500 hover:bg-red-600 text-white"
                            >
                                Stop
                            </button>
                        )}
                    </div>
                </section>

                {/* Current Interval Display */}
                {randomIntervalName && (
                    <section className="w-full bg-green-50 p-4 rounded-lg border border-green-200">
                        <h3 className="text-lg font-bold text-green-800 text-center">
                            Random Interval: {randomIntervalName}
                        </h3>
                    </section>
                )}

                {/* Interval Selector */}
                <section className="w-full">
                    <h2 className="text-xl md:text-2xl font-bold text-blue-800 mb-2 md:mb-4 flex items-center gap-2">
                        <Music size={20} className="md:h-6 md:w-6" /> Interval Selector
                    </h2>
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                        <select
                            className="p-2 md:p-3 border border-gray-300 rounded-md shadow-sm w-full md:w-1/2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                            onChange={handleIntervalSelect}
                            value={selectedIntervalSemitones}
                            aria-label="Select interval"
                            disabled={isPlaying}
                        >
                            {INTERVALS.map(interval => (
                                <option key={interval.name} value={interval.semitones}>
                                    {interval.name} ({interval.semitones} semitones)
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handlePlayInterval}
                            className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-bold text-sm md:text-lg flex items-center gap-1 md:gap-2 transition-all duration-300 w-full md:w-auto justify-center
                                         ${!isPlaying
                                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                    : 'bg-orange-500 hover:bg-orange-600 text-white'}
                                      `}
                        >
                            {isPlaying ? 'Stop' : <><Play size={16} className="md:h-5 md:w-5" /> Play {selectedInterval?.name}</>}
                        </button>

			</div>
                </section>

                {/* Random Interval Button */}
                <section className="w-full">
                    <button
                        onClick={handlePlayRandom}
                        className={`w-full px-4 py-3 md:px-6 md:py-4 rounded-full font-bold text-lg md:text-xl flex items-center justify-center gap-2 md:gap-3 transition-all duration-300
                                   ${!isPlaying
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg'
                                : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg'}
                                `}
                    >
                        {isPlaying ? 'Stop Random' : <>🎲 Play Random Interval</>}
                    </button>
                </section>

                {/* Piano Visualizer */}
                <section className="w-full">
                    <PianoVisualizer highlightedNotes={currentIntervalNotes} />
                </section>

                {/* Instructions */}
                <section className="w-full bg-blue-50 p-4 md:p-6 rounded-lg border border-blue-200">
                    <h3 className="text-lg md:text-xl font-bold text-blue-800 mb-2 md:mb-3">How to Use:</h3>
                    <ul className="text-blue-700 space-y-1 md:space-y-2 text-sm md:text-base">
                        <li>• <strong>Select an interval</strong> from the dropdown and click "Play" to hear it</li>
                        <li>• <strong>Click "Play Random Interval"</strong> to test your interval recognition skills</li>
                        <li>• <strong>Watch the piano visualizer</strong> to see which notes are being played</li>
                        <li>• <strong>Use the mute button</strong> to control audio output</li>
                    </ul>
                </section>

                {/* Interval Reference */}
                <section className="w-full bg-gray-50 p-4 md:p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2 md:mb-3">Interval Reference:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 text-sm md:text-base">
                        {INTERVALS.map(interval => (
                            <div key={interval.name} className="flex justify-between items-center p-2 md:p-3 bg-white rounded border border-gray-200 hover:bg-gray-100 transition-colors">
                                <span className="font-medium text-gray-800">{interval.name}</span>
                                <span className="text-gray-600 text-xs md:text-sm">{interval.semitones} semitones</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {/* Footer */}
            
        </div>
    );
};

export default IntervalTrainingApp;