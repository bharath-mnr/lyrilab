import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { Music, Play, Piano, Volume2, VolumeX, Volume1 } from 'lucide-react';

// --- usePianoSynth Hook ---
// Custom React hook for managing a Tone.js PolySynth instance.
// Handles audio initialization, note playback, volume control, and muting.
const usePianoSynth = (initialVolume = 0.7, initialMuteState = false) => {
    const synthRef = useRef(null); // Ref to hold the Tone.PolySynth instance
    const [isSynthMuted, setIsSynthMuted] = useState(initialMuteState); // State for mute status
    const [synthVolume, setSynthVolume] = useState(initialVolume); // State for synth volume (0-1 range)
    const [isPlaying, setIsPlaying] = useState(false); // State to track if any sound is actively playing
    const [isAudioReady, setIsAudioReady] = useState(false); // State to track if Tone.js is initialized
    const activeNotesRef = useRef(new Set()); // Ref to keep track of currently active (playing) notes
    const initializationRef = useRef(false); // Ref to ensure audio context is initialized only once

    // useCallback memoizes the initializeAudio function to prevent unnecessary re-creations.
    // It starts the Tone.js audio context and creates the PolySynth.
    const initializeAudio = useCallback(async () => {
        // Prevent re-initialization if already in progress or done
        if (initializationRef.current) return true;
        initializationRef.current = true; // Mark as initializing

        try {
            // Ensure audio context is running. Tone.start() activates the Web Audio API.
            if (Tone.context.state !== 'running') {
                await Tone.start();
                // Add a small delay to ensure context is fully started and stable
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            // Clean up any existing synth instance to prevent resource leaks
            if (synthRef.current) {
                synthRef.current.dispose(); // Release audio resources
                synthRef.current = null;
            }

            // Create a new PolySynth (multiple voices for polyphony) with specific oscillator and envelope settings.
            // These settings define the timbre (sound quality) of the piano-like instrument.
            synthRef.current = new Tone.PolySynth(Tone.Synth, {
                oscillator: {
                    partials: [1, 0, 2, 0, 3] // Harmonic content for a richer sound
                },
                envelope: {
                    attack: 0.01, // Quick initial attack
                    decay: 2,     // Long decay for a sustained sound
                    sustain: 0.1, // Low sustain level
                    release: 0.8, // Medium release for notes to fade out naturally
                    attackCurve: "exponential" // Smoother attack
                }
            }).toDestination(); // Connect the synth to the main audio output (speakers)

            // Set the initial volume based on `synthVolume` and `isSynthMuted` states.
            // Tone.js volume is in dB, so `Tone.gainToDb` converts linear gain to dB.
            synthRef.current.volume.value = isSynthMuted ? -Infinity : Tone.gainToDb(synthVolume);

            setIsAudioReady(true); // Update state to indicate audio is ready
            return true;
        } catch (error) {
            console.error('Audio initialization failed:', error);
            setIsAudioReady(false);
            initializationRef.current = false; // Reset if initialization fails
            return false;
        }
    }, [isSynthMuted, synthVolume]); // Dependencies: re-initialize if these change

    // Effect to update synth volume when `synthVolume` or `isSynthMuted` states change.
    useEffect(() => {
        if (synthRef.current && initializationRef.current) { // Only update if synth exists and is initialized
            try {
                synthRef.current.volume.value = isSynthMuted ? -Infinity : Tone.gainToDb(synthVolume);
            } catch (error) {
                console.error('Error updating volume:', error);
            }
        }
    }, [synthVolume, isSynthMuted]); // Dependencies: re-run if volume or mute status changes

    // Cleanup effect: Runs when the component unmounts to release audio resources.
    useEffect(() => {
        return () => {
            if (synthRef.current) {
                try {
                    // Ensure all currently playing notes are stopped
                    activeNotesRef.current.forEach(note => {
                        synthRef.current.triggerRelease(note);
                    });
                    activeNotesRef.current.clear(); // Clear the set of active notes

                    // Dispose the synth instance to free up memory and audio context resources
                    synthRef.current.dispose();
                    synthRef.current = null;
                } catch (error) {
                    console.error('Error during cleanup:', error);
                }
            }
            initializationRef.current = false; // Reset initialization flag
        };
    }, []); // Empty dependency array means this runs only on mount and unmount

    // useCallback memoizes `playNote` to ensure stable function reference across renders.
    // Plays a specific musical note.
    const playNote = useCallback(async (note) => {
        try {
            // Initialize audio context if not already done
            const audioInitialized = await initializeAudio();
            // If audio is not ready or muted, do not play note
            if (!audioInitialized || !synthRef.current || isSynthMuted) {
                return false;
            }

            // Basic validation for note format (e.g., "C4", "G#3")
            if (typeof note !== 'string' || !note.match(/^[A-G]#?[0-9]$/)) {
                console.error('Invalid note format:', note);
                return false;
            }

            // If the note is already active, release it first to re-trigger for a clear sound
            if (activeNotesRef.current.has(note)) {
                synthRef.current.triggerRelease(note);
                activeNotesRef.current.delete(note);
            }

            synthRef.current.triggerAttack(note); // Start playing the note
            activeNotesRef.current.add(note); // Add to active notes set
            return true;
        } catch (error) {
            console.error('Error playing note:', error);
            return false;
        }
    }, [isSynthMuted, initializeAudio]); // Dependencies: re-create if mute state or init function changes

    // useCallback memoizes `stopNote`.
    // Stops a specific musical note.
    const stopNote = useCallback((note) => {
        try {
            // Only stop if synth exists and the note is currently active
            if (synthRef.current && activeNotesRef.current.has(note)) {
                synthRef.current.triggerRelease(note); // Release the note
                activeNotesRef.current.delete(note); // Remove from active notes set
                return true;
            }
        } catch (error) {
            console.error('Error stopping note:', error);
        }
        return false;
    }, []); // No dependencies, as it only interacts with refs and Tone.js instance

    // useCallback memoizes `stopAllNotes`.
    // Stops all currently playing notes.
    const stopAllNotes = useCallback(() => {
        try {
            if (synthRef.current) {
                activeNotesRef.current.forEach(note => {
                    synthRef.current.triggerRelease(note); // Release each active note
                });
                activeNotesRef.current.clear(); // Clear the entire set
            }
        } catch (error) {
            console.error('Error stopping all notes:', error);
        }
    }, []); // No dependencies

    // useCallback memoizes `toggleMute`.
    // Toggles the mute state of the synth.
    const toggleMute = useCallback(() => {
        setIsSynthMuted(prev => !prev); // Toggle the mute state
    }, []);

    // Returns the functions and states provided by the hook.
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
        initializeAudio // Expose initializeAudio for manual triggering if needed
    };
};

// --- useIntervalTrainer Hook ---
// Custom React hook for the interval training logic.
// Manages interval generation, playback, and state for the UI.
const useIntervalTrainer = () => {
    // Destructure necessary functions and states from usePianoSynth
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

    const [currentIntervalNotes, setCurrentIntervalNotes] = useState([]); // Notes currently playing/highlighted
    const [currentIntervalSemitones, setCurrentIntervalSemitones] = useState(0); // Semitone value of the current interval
    const [randomIntervalName, setRandomIntervalName] = useState(''); // Name of the random interval played
    const [playedNotes, setPlayedNotes] = useState([]); // Notes that were just played
    const playbackTimeoutsRef = useRef([]); // Ref to store timeout IDs for cleanup

    // Define standard musical intervals and their semitone values.
    // Using useRef for INTERVALS to ensure it's not recreated on every render.
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

    // Cleanup effect: Clears all scheduled timeouts when the component unmounts.
    useEffect(() => {
        return () => {
            playbackTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            playbackTimeoutsRef.current = [];
        };
    }, []); // Empty dependency array ensures it runs once on mount/unmount

    // useCallback memoizes `noteToMidi`.
    // Converts a musical note string (e.g., "C4") to its MIDI number.
    const noteToMidi = useCallback((note) => {
        try {
            return Tone.Midi(note).toMidi();
        } catch (error) {
            console.error('Error converting note to MIDI:', note, error);
            return null;
        }
    }, []); // No dependencies as Tone.Midi is a static conversion

    // useCallback memoizes `midiToNote`.
    // Converts a MIDI number to its musical note string.
    const midiToNote = useCallback((midi) => {
        try {
            return Tone.Midi(midi).toNote();
        } catch (error) {
            console.error('Error converting MIDI to note:', midi, error);
            return null;
        }
    }, []); // No dependencies as Tone.Midi is a static conversion

    // useCallback memoizes `clearPlaybackTimeouts`.
    // Utility to clear all currently stored playback timeouts.
    const clearPlaybackTimeouts = useCallback(() => {
        playbackTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
        playbackTimeoutsRef.current = [];
    }, []); // No dependencies, interacts only with ref

    // useCallback memoizes `playInterval`.
    // Plays an interval (two notes) sequentially, handles state updates and error logging.
    const playInterval = useCallback(async (root, intervalSemitones, isRandom = false) => {
        if (isPlaying) { // Prevent multiple simultaneous playbacks
            console.log('Already playing, skipping...');
            return;
        }

        // Immediately clear any pending playback and stop all notes from previous actions.
        clearPlaybackTimeouts();
        stopAllNotes();

        try {
            const audioReady = await initializeAudio(); // Ensure audio context is running
            if (!audioReady) {
                console.error('Audio not ready');
                return;
            }

            setIsPlaying(true); // Set playing state

            // Convert root note to MIDI and calculate the second note's MIDI and name
            const rootMidi = noteToMidi(root);
            if (rootMidi === null) {
                throw new Error('Invalid root note provided for interval playback');
            }

            const secondNoteMidi = rootMidi + intervalSemitones;
            const secondNoteName = midiToNote(secondNoteMidi);
            if (secondNoteName === null) {
                throw new Error('Invalid second note generated for interval playback');
            }

            setCurrentIntervalNotes([root, secondNoteName]); // Highlight notes on the piano
            setPlayedNotes([root, secondNoteName]); // Store notes that were played for display

            // If it's a random interval, set its name for display
            if (isRandom) {
                const interval = INTERVALS.current.find(int => int.semitones === intervalSemitones);
                if (interval) {
                    setRandomIntervalName(`${interval.name} (${interval.semitones} semitones)`);
                } else {
                    setRandomIntervalName(`Unknown Interval (${intervalSemitones} semitones)`);
                }
            } else {
                setRandomIntervalName(''); // Clear for non-random intervals
            }

            // Play the first note
            const firstNoteSuccess = await playNote(root);
            if (!firstNoteSuccess) {
                throw new Error('Failed to play first note');
            }

            // Schedule the second note playback after a delay (e.g., 800ms)
            const timeout1 = setTimeout(async () => {
                try {
                    stopNote(root); // Stop the first note
                    const secondNoteSuccess = await playNote(secondNoteName); // Play the second note

                    if (secondNoteSuccess) {
                        // Schedule stopping the second note and reset playing state
                        const timeout2 = setTimeout(() => {
                            stopNote(secondNoteName);
                            setIsPlaying(false);

                            // Schedule clearing highlight after notes have fully released
                            const timeout3 = setTimeout(() => {
                                setCurrentIntervalNotes([]);
                            }, 300); // Small delay to show highlight
                            playbackTimeoutsRef.current.push(timeout3);
                        }, 800); // Duration for second note
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
            }, 800); // Delay before playing the second note

            playbackTimeoutsRef.current.push(timeout1); // Store timeout for cleanup

        } catch (error) {
            console.error('Error playing interval:', error);
            setIsPlaying(false);
            setCurrentIntervalNotes([]);
            clearPlaybackTimeouts(); // Ensure all timeouts are cleared on error
            stopAllNotes(); // Ensure all notes are stopped on error
        }
    }, [isPlaying, noteToMidi, midiToNote, playNote, stopNote, stopAllNotes, setIsPlaying, initializeAudio, clearPlaybackTimeouts]); // Extensive dependencies

    // useCallback memoizes `generateRandomInterval`.
    // Generates a random root note and a random interval, then plays it.
    const generateRandomInterval = useCallback(() => {
        if (isPlaying) {
            console.log('Already playing, skipping random interval generation...');
            return;
        }

        const rootNotes = ['C3', 'C4', 'C5', 'G3', 'D4', 'A4']; // Expanded root notes for more variety
        const randomRoot = rootNotes[Math.floor(Math.random() * rootNotes.length)];
        // Filter out Unison (0 semitones) for playable intervals
        const playableIntervals = INTERVALS.current.filter(interval => interval.semitones > 0);
        const randomIndex = Math.floor(Math.random() * playableIntervals.length);
        const randomInterval = playableIntervals[randomIndex];

        setCurrentIntervalSemitones(randomInterval.semitones); // Store semitones for potential quiz logic
        playInterval(randomRoot, randomInterval.semitones, true); // Play the random interval
    }, [playInterval, isPlaying]); // Dependencies: playInterval and isPlaying state

    // useCallback memoizes `stopPlayback`.
    // Stops any ongoing interval playback and resets states.
    const stopPlayback = useCallback(() => {
        clearPlaybackTimeouts(); // Clear all pending timeouts
        stopAllNotes(); // Stop any currently playing notes
        setIsPlaying(false); // Reset playing state
        setCurrentIntervalNotes([]); // Clear note highlights
        setRandomIntervalName(''); // Clear random interval display
        setPlayedNotes([]); // Clear played notes display
    }, [clearPlaybackTimeouts, stopAllNotes, setIsPlaying]); // Dependencies: cleanup functions

    // Returns the functions and states provided by the hook.
    return {
        isAudioReady,
        INTERVALS: INTERVALS.current, // Expose the intervals array
        currentIntervalNotes,
        currentIntervalSemitones,
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
// Renders a visual representation of a piano keyboard, highlighting specified notes.
const PianoVisualizer = ({ highlightedNotes }) => {
    // Define the note names for white and black keys.
    const WHITE_KEYS_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const BLACK_KEYS_NOTES = ['C#', 'D#', 'F#', 'G#', 'A#'];

    // Utility to convert a note name to its MIDI number (0-127).
    const noteToMidi = useCallback((noteName) => {
        try {
            return Tone.Midi(noteName).toMidi();
        } catch (e) {
            console.warn(`Invalid note name for MIDI conversion: ${noteName}`, e);
            return null; // Return null for invalid notes instead of 0
        }
    }, []);

    // Checks if a given note should be highlighted based on the `highlightedNotes` array.
    const isNoteHighlighted = useCallback((noteToCheck) => {
        if (!highlightedNotes || highlightedNotes.length === 0) return false;

        // Iterate through highlighted notes to find a match
        return highlightedNotes.some(highlightedNote => {
            // Direct string comparison first for efficiency
            if (noteToCheck === highlightedNote) return true;

            // If no direct match, try MIDI conversion for equivalent notes (e.g., C# vs Db)
            try {
                const noteToCheckMidi = noteToMidi(noteToCheck);
                const highlightedNoteMidi = noteToMidi(highlightedNote);
                return noteToCheckMidi !== null && highlightedNoteMidi !== null && noteToCheckMidi === highlightedNoteMidi;
            } catch (e) {
                return false;
            }
        });
    }, [highlightedNotes, noteToMidi]); // Dependencies: highlightedNotes and noteToMidi

    // Determine the octave range to display based on highlighted notes.
    // Default to C3-C5 if no notes are highlighted or if they are out of typical range.
    let minOctave = 3;
    let maxOctave = 5;
    if (highlightedNotes && highlightedNotes.length > 0) {
        const midiNumbers = highlightedNotes.map(noteToMidi).filter(num => num !== null && !isNaN(num));
        if (midiNumbers.length > 0) {
            // Calculate min/max octaves from highlighted notes, adjusting to common range
            minOctave = Math.min(...midiNumbers.map(m => Math.floor(m / 12) - 1)); // MIDI to octave number
            maxOctave = Math.max(...midiNumbers.map(m => Math.floor(m / 12) - 1));
            // Extend view to show a bit more of the keyboard around the highlighted notes
            minOctave = Math.max(minOctave - 1, 1); // Ensure min is not below octave 1
            maxOctave = Math.min(maxOctave + 1, 7); // Ensure max is not above octave 7
        }
    }

    // Renders a single octave (white and black keys).
    const renderOctave = useCallback((octaveNum) => {
        const octaveElements = [];

        // Render White Keys
        WHITE_KEYS_NOTES.forEach(noteName => {
            const fullNoteName = noteName + octaveNum;
            const isHighlighted = isNoteHighlighted(fullNoteName);

            octaveElements.push(
                <div
                    key={fullNoteName}
                    className={`relative w-8 md:w-10 h-24 md:h-40 border border-gray-300 bg-white rounded-b-md shadow-md flex items-end justify-center pb-1 md:pb-2 text-xs font-semibold
                                ${isHighlighted ? 'bg-blue-300 scale-y-95 shadow-lg border-blue-500' : ''}
                                transition-all duration-200 ease-out flex-shrink-0`} // flex-shrink-0 to prevent shrinking
                    style={{ zIndex: 0 }} // White keys are behind black keys
                >
                    <span className="hidden sm:block text-gray-700">{fullNoteName}</span>
                    <span className="block sm:hidden text-gray-700">{noteName}</span>
                </div>
            );
        });

        // Render Black Keys (positioned absolutely over white keys)
        // Corrected pixel positioning for black keys for standard piano layout
        const baseKeyWidth = 40; // width for md:w-10
        const blackKeyPositions = {
            'C#': baseKeyWidth * 0.75, // Between C and D
            'D#': baseKeyWidth * 1.75, // Between D and E
            'F#': baseKeyWidth * 3.25, // Between F and G
            'G#': baseKeyWidth * 4.25, // Between G and A
            'A#': baseKeyWidth * 5.25  // Between A and B
        };

        BLACK_KEYS_NOTES.forEach(noteName => {
            const fullNoteName = noteName + octaveNum;
            const isHighlighted = isNoteHighlighted(fullNoteName);

            // Calculate 'left' position dynamically based on baseKeyWidth
            const leftOffset = blackKeyPositions[noteName] || 0; // Fallback to 0 if not found

            octaveElements.push(
                <div
                    key={fullNoteName}
                    className={`absolute w-5 md:w-6 h-16 md:h-24 bg-black text-white rounded-b-md shadow-lg flex items-end justify-center pb-1 md:pb-2 text-xs font-semibold
                                ${isHighlighted ? 'bg-purple-600 scale-y-95 shadow-xl border-purple-900' : ''}
                                transition-all duration-200 ease-out`}
                    style={{
                        left: `${leftOffset}px`,
                        zIndex: 10, // Black keys are always on top
                    }}
                >
                    <span className="text-white hidden sm:block">{isHighlighted ? noteName : ''}</span> {/* Only show name if highlighted */}
                </div>
            );
        });
        return octaveElements;
    }, [isNoteHighlighted]); // Dependencies: isNoteHighlighted, ensures re-render on highlight changes

    const allOctaveRender = [];
    for (let octave = minOctave; octave <= maxOctave; octave++) {
        allOctaveRender.push(
            // The relative flex container for each octave group of keys
            <div key={`octave-${octave}`} className="flex relative" style={{ width: '280px' }}>
                {renderOctave(octave)}
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center p-2 md:p-4 bg-gray-50 rounded-lg shadow-inner border border-gray-200 w-full overflow-x-auto">
            <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-4 text-gray-800 flex items-center gap-2">
                <Piano size={16} className="md:h-5 md:w-5" /> Piano Visualizer
            </h3>
            {/* Main container for all octaves, allowing horizontal scroll */}
            <div className="flex relative justify-center overflow-x-auto w-full pb-2">
                {allOctaveRender}
            </div>
        </div>
    );
};


// --- Main App Component ---
// The primary component for the Interval Training application.
const IntervalTrainingApp = () => {
    // State to store the semitone value of the interval selected by the user.
    const [selectedIntervalSemitones, setSelectedIntervalSemitones] = useState(7); // Default to Perfect 5th

    // Destructure properties from the custom interval training hook.
    const {
        isAudioReady,
        INTERVALS,
        currentIntervalNotes,
        playInterval,
        generateRandomInterval,
        isSynthMuted,
        toggleMute,
        isPlaying,
        stopPlayback
    } = useIntervalTrainer();

    // Handler for when the user selects a new interval from the dropdown.
    const handleIntervalSelect = (event) => {
        const semitones = parseInt(event.target.value, 10); // Parse value to integer
        setSelectedIntervalSemitones(semitones);
    };

    // Handler for playing a random interval.
    const handlePlayRandom = () => {
        if (isPlaying) { // If audio is already playing, stop it first
            stopPlayback();
        } else {
            generateRandomInterval(); // Otherwise, generate and play a random interval
        }
    };

    // Handler for playing the currently selected fixed interval.
    const handlePlayInterval = () => {
        if (isPlaying) { // If audio is already playing, stop it first
            stopPlayback();
        } else {
            // Play the selected interval with a fixed root note (C4)
            playInterval('C4', selectedIntervalSemitones, false);
        }
    };

    // Main application UI.
    return (
        <div
            className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #e0f2f7 0%, #b3e5fc 50%, #81d4fa 100%)',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Background Pattern (subtle SVG) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%2303a9f4' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            {/* Header Section */}
            <div className="text-center mb-6 md:mb-10 z-10 w-full">
                <div className="flex items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                    <Music size={32} className="text-blue-700 md:h-12 md:w-12" />
                    <h1 className="text-3xl md:text-5xl font-extrabold text-blue-900 drop-shadow-lg">Interval Training</h1>
                </div>
                <p className="text-blue-600 text-xs md:text-sm mt-2 md:mt-4">
                    Click any play button to enable audio and start learning intervals!
                </p>
            </div>

            {/* Main Content Card */}
            <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 lg:p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col items-center space-y-4 md:space-y-6 lg:space-y-8 z-10 border border-blue-200">

                {/* Audio Controls */}
                <section className="w-full flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-4 md:mb-6">
                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Audio Ready/Not Initialized Status */}
                        <span className={`px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium ${isAudioReady ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {isAudioReady ? '🔊 Audio Ready' : '🔇 Audio Not Initialized'}
                        </span>
                        {/* Mute/Unmute Button */}
                        <button
                            onClick={toggleMute}
                            className="px-3 py-1 md:px-4 md:py-2 rounded-full font-bold text-xs md:text-sm flex items-center gap-1 md:gap-2 transition-all duration-300 bg-blue-500 hover:bg-blue-600 text-white"
                        >
                            {isSynthMuted ? <VolumeX size={16} className="md:h-5 md:w-5" /> : <Volume1 size={16} className="md:h-5 md:w-5" />}
                            {isSynthMuted ? 'Unmute' : 'Mute'}
                        </button>
                        {/* Stop Playback Button (conditionally rendered) */}
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

                {/* Interval Selector Section */}
                <section className="w-full">
                    <h2 className="text-xl md:text-2xl font-bold text-blue-800 mb-2 md:mb-4 flex items-center gap-2">
                        <Music size={20} className="md:h-6 md:w-6" /> Interval Selector
                    </h2>
                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
                        {/* Dropdown for selecting an interval */}
                        <select
                            className="p-2 md:p-3 border border-gray-300 rounded-md shadow-sm w-full md:w-1/2 focus:ring-blue-500 focus:border-blue-500 text-sm md:text-base"
                            onChange={handleIntervalSelect}
                            value={selectedIntervalSemitones}
                            aria-label="Select interval"
                            disabled={isPlaying} // Disable selector while playing
                        >
                            {/* Map over the INTERVALS array to create options */}
                            {INTERVALS.map(interval => (
                                <option key={interval.name} value={interval.semitones}>
                                    {interval.name} ({interval.semitones} semitones)
                                </option>
                            ))}
                        </select>
                        {/* Button to play the selected interval */}
                        <button
                            onClick={handlePlayInterval}
                            className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-bold text-sm md:text-lg flex items-center gap-1 md:gap-2 transition-all duration-300 w-full md:w-auto justify-center
                                         ${!isPlaying
                                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                    : 'bg-orange-500 hover:bg-orange-600 text-white'}
                                      `}
                        >
                            {isPlaying ? 'Stop' : <><Play size={16} className="md:h-5 md:w-5" /> Play Interval</>}
                        </button>
                    </div>
                </section>

                {/* Random Interval Explorer Section */}
                <section className="w-full bg-blue-50 p-4 md:p-6 rounded-lg border border-blue-200">
                    <h2 className="text-xl md:text-2xl font-bold text-blue-800 mb-2 md:mb-4 flex items-center gap-2">
                        <Volume2 size={20} className="md:h-6 md:w-6" /> Random Interval Explorer
                    </h2>
                    <div className="flex flex-col items-center justify-center gap-2 md:gap-4">
                        {/* Button to play a random interval */}
                        <button
                            onClick={handlePlayRandom}
                            className={`px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-xl flex items-center gap-1 md:gap-2 transition-all duration-300 w-full justify-center
                                         ${!isPlaying
                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                    : 'bg-orange-500 hover:bg-orange-600 text-white'}
                                      `}
                        >
                            {isPlaying ? 'Stop' : <><Play size={20} className="md:h-6 md:w-6" /> Play Random Interval</>}
                        </button>
                    </div>
                </section>

                {/* Piano Visualizer Section */}
                <section className="w-full">
                    <PianoVisualizer highlightedNotes={currentIntervalNotes} />
                </section>
            </div>
        </div>
    );
};

export default IntervalTrainingApp;
