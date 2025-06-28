import React, { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Music, Trash2, Shuffle, Plus, Eye } from 'lucide-react'; // Icons

// --- AUDIO CONTEXT ---
// This context manages the global Tone.js audio state, ensuring only one audio context.
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);
    const [error, setError] = useState(null); // Added error state for audio context initialization

    // Function to start Tone.js audio context. This needs a user interaction.
    const startGlobalAudio = useCallback(async () => {
        if (Tone.context.state === 'running') {
            setIsAudioGloballyReady(true);
            console.log('AudioContext: Tone.js context already running.');
            return true; // Indicate success
        }

        try {
            console.log('AudioContext: Attempting to start global Tone.js context...');
            await Tone.start(); // This will resume the audio context

            // Wait for the context state to actually become 'running' with a timeout
            const startTime = Date.now();
            const success = await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (Tone.context.state === 'running') {
                        clearInterval(checkInterval);
                        resolve(true);
                    } else if (Date.now() - startTime > 5000) { // Timeout after 5 seconds
                        clearInterval(checkInterval);
                        resolve(false);
                    }
                }, 100); // Check every 100ms
            });

            if (success) {
                setIsAudioGloballyReady(true);
                setError(null); // Clear error if successful
                console.log('AudioContext: Tone.js context started successfully');
                return true;
            } else {
                setIsAudioGloballyReady(false);
                console.warn('AudioContext: Tone.js context did not start properly (state is ' + Tone.context.state + ')');
                setError("Failed to start audio. Browser context might be suspended.");
                return false;
            }
        } catch (error) {
            console.error("AudioContext: Error starting Tone.js context:", error);
            setError("Failed to initialize audio. Please check your browser permissions.");
            setIsAudioGloballyReady(false);
            return false;
        }
    }, []);

    // Effect to observe Tone.js context state changes and add/remove click listener
    useEffect(() => {
        const handleToneContextChange = () => {
            const currentState = Tone.context.state;
            if (currentState === 'running') {
                setIsAudioGloballyReady(true);
                setError(null);
            } else {
                setIsAudioGloballyReady(false);
                if (!error && currentState === 'suspended') {
                     setError("Audio context suspended. Click to activate.");
                } else if (currentState === 'closed') {
                     setError("Audio context closed unexpectedly. Please refresh.");
                }
            }
            console.log(`AudioContext: Tone.context state changed to '${currentState}'. isAudioGloballyReady set to ${currentState === 'running'}.`);
        };

        // Add listener for state changes
        Tone.context.on('statechange', handleToneContextChange);
        handleToneContextChange(); // Initial check on mount

        // Add a document-wide click listener to try and start audio if suspended
        const clickToActivateHandler = () => {
            if (Tone.context.state !== 'running') {
                startGlobalAudio();
            }
        };

        // Attach listener only if audio is not running initially
        if (Tone.context.state !== 'running') {
            document.addEventListener('click', clickToActivateHandler, { once: true });
        }
        
        return () => {
            // Clean up listener on unmount
            Tone.context.off('statechange', handleToneContextChange);
            document.removeEventListener('click', clickToActivateHandler); // Ensure cleanup
        };
    }, [error, startGlobalAudio]); // Depend on error and startGlobalAudio to re-evaluate

    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, startGlobalAudio, error }}>
            {children}
        </AudioContext.Provider>
    );
};
// --- END AUDIO CONTEXT ---


// --- Musical Data (can be expanded) ---
const allNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11]; // Semitones from root
const minorScaleIntervals = [0, 2, 3, 5, 7, 8, 10]; // Semitones from root

// Roman numeral analysis data
const romanNumeralsMajor = {
    'major': ['I', 'IV', 'V'],
    'minor': ['ii', 'iii', 'vi'],
    'diminished': ['vii°']
};
const romanNumeralsMinor = {
    'minor': ['i', 'iv'],
    'major': ['III', 'V', 'VI', 'VII'],
    'diminished': ['ii°', 'vii°']
};


// Function to get notes for a chord type (simple triads/septads)
const getChordNotes = (root, type, octave = 4) => {
    const rootIndex = allNotes.indexOf(root);
    let intervals;
    switch (type) {
        case 'major':
            intervals = [0, 4, 7]; // Root, Major 3rd, Perfect 5th
            break;
        case 'minor':
            intervals = [0, 3, 7]; // Root, Minor 3rd, Perfect 5th
            break;
        case 'diminished':
            intervals = [0, 3, 6]; // Root, Minor 3rd, Diminished 5th
            break;
        case 'dom7':
            intervals = [0, 4, 7, 10]; // Root, Major 3rd, Perfect 5th, Minor 7th
            break;
        default:
            intervals = [0]; // Just the root
    }

    const notes = intervals.map(interval => {
        let noteIndex = rootIndex + interval;
        let currentOctave = octave;
        while (noteIndex >= allNotes.length) {
            noteIndex -= allNotes.length;
            currentOctave++;
        }
        return `${allNotes[noteIndex]}${currentOctave}`;
    });
    return notes;
};


// Function to analyze a chord's Roman numeral given a key
const getRomanNumeral = (chordRoot, chordType, keyRoot, keyType) => {
    const rootIndex = allNotes.indexOf(chordRoot);
    const keyIndex = allNotes.indexOf(keyRoot);
    let scaleIntervals;
    let romanMap;

    if (keyType === 'major') {
        scaleIntervals = majorScaleIntervals;
        romanMap = romanNumeralsMajor;
    } else if (keyType === 'minor') {
        scaleIntervals = minorScaleIntervals;
        romanMap = romanNumeralsMinor;
    } else {
        return ''; // Unsupported key type for analysis
    }

    // Find the position of the chord root in the scale
    let scaleDegree = -1;
    for (let i = 0; i < scaleIntervals.length; i++) {
        const intervalNoteIndex = (keyIndex + scaleIntervals[i]) % allNotes.length;
        if (intervalNoteIndex === rootIndex) {
            scaleDegree = i;
            break;
        }
    }

    if (scaleDegree === -1) {
        return ''; // Chord root is not in the selected scale
    }

    // Map scale degree to Roman numeral base (I, II, III etc.)
    const romanBase = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][scaleDegree];

    // Find the correct Roman numeral based on chord type and scale degree
    if (romanMap[chordType] && romanMap[chordType][scaleDegree] !== undefined) {
        // This is a simplified lookup. A more robust system would involve checking chord quality against scale degrees.
        // For now, we'll try to match based on direct lookup for common primary chords.
        // If not found, use a general rule or provide a more complex lookup
        // For simplicity, we'll return a generic combination if exact match isn't in romanMap,
        // which implies the chord is diatonic but perhaps not a common primary triad.
        
        // A more correct approach for minor/diminished quality
        let numeral = romanBase;
        if (chordType === 'minor') numeral = numeral.toLowerCase();
        if (chordType === 'diminished') numeral = numeral.toLowerCase() + '°';
        if (chordType === 'dom7') numeral = numeral + '7'; // Simple indicator for 7th chord

        // Special handling for major/minor mapping consistency
        if (keyType === 'major') {
            if (scaleDegree === 1 || scaleDegree === 2 || scaleDegree === 5) { // ii, iii, vi are minor
                if (chordType === 'minor') return numeral;
                if (chordType === 'major') return numeral.toUpperCase(); // Non-diatonic major
            } else if (scaleDegree === 6) { // vii is diminished
                if (chordType === 'diminished') return numeral;
                if (chordType === 'major') return numeral.toUpperCase(); // Non-diatonic major
            }
        } else if (keyType === 'minor') {
            if (scaleDegree === 0 || scaleDegree === 3) { // i, iv are minor
                if (chordType === 'minor') return numeral;
                if (chordType === 'major') return numeral.toUpperCase(); // Non-diatonic major
            } else if (scaleDegree === 1) { // ii is diminished
                if (chordType === 'diminished') return numeral;
                if (chordType === 'minor') return numeral.toLowerCase(); // Non-diatonic minor
            }
        }
        
        // Final fallback to just the combined roman base and chord type if not handled specifically above
        return numeral;

    } else {
        // For chords not directly in our simplified romanMap, we can still attempt a basic Roman numeral.
        let numeral = romanBase;
        if (chordType === 'minor') numeral = numeral.toLowerCase();
        if (chordType === 'diminished') numeral = numeral.toLowerCase() + '°';
        if (chordType === 'dom7') numeral = numeral + '7';
        return numeral;
    }
};


// --- useChordProgressionBuilder Hook ---
const useChordProgressionBuilder = () => {
    const { isAudioGloballyReady, startGlobalAudio, error: audioContextError } = useContext(AudioContext);
    const synthRef = useRef(null); // The Tone.PolySynth instance
    const sequenceRef = useRef(null); // The Tone.Sequence instance

    const [progression, setProgression] = useState([]); // Array of { id, root, type } objects
    const [bpm, setBpm] = useState(100);
    const [chordDuration, setChordDuration] = useState(1); // Duration of each chord in seconds (e.g., 1 for quarter note at 60bpm)
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentChordIndex, setCurrentChordIndex] = useState(-1); // For UI visualization

    const [selectedKey, setSelectedKey] = useState({ root: 'C', type: 'major' }); // Key for analysis
    const [voicingOctaveShift, setVoicingOctaveShift] = useState(0); // +/- octave shift for playback

    const [isAudioReady, setIsAudioReady] = useState(false); // Overall audio system readiness
    const [isLoading, setIsLoading] = useState(false); // Indicates if audio setup is in progress

    // Memoized list of available chord types for the palette - MODIFIED HERE
    const availableChordTypes = useMemo(() => [
        { name: 'Major', type: 'major' },
        { name: 'Minor', type: 'minor' },
        { name: 'Diminished', type: 'diminished' },
    ], []);

    // Memoized list of available keys for selection
    const availableKeys = useMemo(() => {
        const keys = [];
        allNotes.forEach(note => {
            keys.push({ root: note, type: 'major' });
            keys.push({ root: note, type: 'minor' });
        });
        return keys;
    }, []);


    // Function to dispose Tone.js nodes
    const disposeSynthAndSequence = useCallback(() => {
        if (sequenceRef.current) {
            sequenceRef.current.stop();
            sequenceRef.current.dispose();
            sequenceRef.current = null;
        }
        if (synthRef.current) {
            synthRef.current.releaseAll();
            synthRef.current.dispose();
            synthRef.current = null;
        }
        Tone.Transport.stop();
        setIsPlaying(false);
        setCurrentChordIndex(-1);
        setIsAudioReady(false);
        console.log('useChordProgressionBuilder: Synth and Sequence disposed.');
    }, []);

    // Effect for initializing Tone.js Synth and Sequence
    useEffect(() => {
        console.log('useChordProgressionBuilder: Setting up Tone.js Synth and Sequence...');
        setIsLoading(true);

        let localSynth = null;
        let localSequence = null;

        try {
            disposeSynthAndSequence(); // Ensure any existing instances are disposed

            localSynth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'sawtooth' }, // Richer sound for chords
                envelope: {
                    attack: 0.02,
                    decay: 0.1,
                    sustain: 0.3,
                    release: 0.8,
                },
            }).toDestination();
            synthRef.current = localSynth;

            // Tone.Transport setup
            Tone.Transport.bpm.value = bpm;
            Tone.Transport.loop = true;
            // LoopEnd will be set dynamically based on progression length later

            // Create the Tone.Sequence
            localSequence = new Tone.Sequence(
                (time, index) => {
                    // Update UI for current chord
                    Tone.Draw.schedule(() => {
                        setCurrentChordIndex(index);
                    }, time);

                    if (progression.length > 0 && index < progression.length) {
                        const chord = progression[index];
                        const notes = getChordNotes(chord.root, chord.type, 4 + voicingOctaveShift); // Apply octave shift
                        synthRef.current.triggerAttackRelease(notes, chordDuration, time);
                        console.log(`Playing chord: ${chord.root} ${chord.type}, notes: ${notes}`);
                    }
                },
                [], // Initial events array is empty, will be populated dynamically
                `${chordDuration}s` // Interval for each chord, based on chordDuration
            ).start(0);

            sequenceRef.current = localSequence;
            console.log('useChordProgressionBuilder: Tone.js Synth and Sequence created and configured.');

        } catch (error) {
            console.error("useChordProgressionBuilder: Error during Tone.js setup:", error);
            setIsLoading(false);
            setIsAudioReady(false);
            synthRef.current = null;
            sequenceRef.current = null;
        } finally {
            setIsLoading(false);
            setIsAudioReady(isAudioGloballyReady && synthRef.current !== null && sequenceRef.current !== null);
        }

        // Cleanup function for this effect
        return () => {
            console.log('useChordProgressionBuilder Cleanup: Disposing synth and sequence.');
            disposeSynthAndSequence();
        };
    }, [disposeSynthAndSequence, isAudioGloballyReady, chordDuration, progression, voicingOctaveShift]); // Re-create if these critical audio-related properties change

    // Effect to update isAudioReady based on global audio and synth initialization status
    useEffect(() => {
        const currentAudioReady = isAudioGloballyReady && synthRef.current !== null && sequenceRef.current !== null;
        setIsAudioReady(currentAudioReady);
        console.log(`useChordProgressionBuilder: isAudioGloballyReady: ${isAudioGloballyReady}, synthInitialized: ${synthRef.current !== null}, sequenceInitialized: ${sequenceRef.current !== null} => isAudioReady: ${currentAudioReady}`);
    }, [isAudioGloballyReady, synthRef.current, sequenceRef.current]);


    // Effect to update Tone.Transport and Sequence properties when state changes
    useEffect(() => {
        if (!isAudioReady || !sequenceRef.current) return;

        Tone.Transport.bpm.value = bpm;
        console.log(`Tone.Transport BPM set to: ${bpm}`);

        // Update the events array and loopEnd of the sequence
        const sequenceEvents = progression.map((_, index) => index);
        sequenceRef.current.events = sequenceEvents;
        Tone.Transport.loopEnd = `${progression.length * chordDuration}s`; // Loop end is total duration of progression
        sequenceRef.current.interval = `${chordDuration}s`; // Update interval of each step
        
        // If progression becomes empty while playing, stop
        if (isPlaying && progression.length === 0) {
            stopPlayback();
        } else if (isPlaying && currentChordIndex >= progression.length) {
            // If current index is out of bounds after progression change, reset
            setCurrentChordIndex(0);
        }

    }, [bpm, progression, chordDuration, isAudioReady, isPlaying, currentChordIndex]); // Dependencies for updates

    // Playback control functions
    const togglePlayback = useCallback(async () => {
        if (!isAudioReady) {
            console.warn('Audio system not ready. Cannot toggle playback.');
            const started = await startGlobalAudio(); // Attempt to start globally
            if (!started) {
                console.warn('Audio context could not be started after interaction. Cannot toggle playback.');
                return;
            }
        }

        if (progression.length === 0) {
            console.warn('Progression is empty. Cannot play.');
            return;
        }

        if (isPlaying) {
            Tone.Transport.pause(); // Pause allows resuming from where it left off
            // Tone.Transport.stop(); // Use stop if you want to reset to beginning on next play
            setIsPlaying(false);
            console.log('Playback paused.');
        } else {
            Tone.Transport.start();
            setIsPlaying(true);
            console.log('Playback started.');
        }
    }, [isPlaying, progression.length, isAudioReady, startGlobalAudio]);

    const stopPlayback = useCallback(() => {
        if (Tone.Transport.state !== 'stopped') {
            Tone.Transport.stop();
        }
        setIsPlaying(false);
        setCurrentChordIndex(-1); // Reset highlight
        console.log('Playback stopped and reset.');
    }, []);

    // Progression management functions
    const addChord = useCallback((root, type) => {
        setProgression(prev => [...prev, { id: Date.now() + Math.random(), root, type }]); // Unique ID for keying
    }, []);

    const removeChord = useCallback((idToRemove) => {
        setProgression(prev => prev.filter(chord => chord.id !== idToRemove));
    }, []);

    const clearProgression = useCallback(() => {
        setProgression([]);
        stopPlayback(); // Stop playback when clearing
    }, [stopPlayback]);

    // Drag and Drop logic
    const dragItem = useRef(null); // ref for the index of the dragged item
    const dragOverItem = useRef(null); // ref for the index of the item being dragged over

    const handleDragStart = useCallback((e, index) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = "move"; // Indicate move operation
        // For Firefox, setData is often needed
        e.dataTransfer.setData("text/plain", index); 
        e.currentTarget.classList.add('opacity-50', 'border-dashed', 'border-blue-500'); // Visual feedback
    }, []);

    const handleDragEnter = useCallback((e, index) => {
        dragOverItem.current = index;
        e.currentTarget.classList.add('bg-blue-100'); // Visual feedback for drag over
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.currentTarget.classList.remove('bg-blue-100'); // Remove visual feedback
    }, []);

    const handleDragEnd = useCallback((e) => {
        e.currentTarget.classList.remove('opacity-50', 'border-dashed', 'border-blue-500'); // Clean up feedback
        // Additional cleanup for dragOverItem visuals if needed
        const currentElements = document.querySelectorAll('.chord-block-draggable');
        currentElements.forEach(el => el.classList.remove('bg-blue-100'));
    }, []);

    const handleDrop = useCallback(() => {
        const newProgression = [...progression];
        const draggedChord = newProgression.splice(dragItem.current, 1)[0];
        if (dragOverItem.current !== null) {
            newProgression.splice(dragOverItem.current, 0, draggedChord);
            setProgression(newProgression);
        }
        dragItem.current = null;
        dragOverItem.current = null;
    }, [progression]);

    const handleDragOver = (e) => {
        e.preventDefault(); // Essential to allow drop
    };

    // Roman Numeral Analysis function exposed by hook
    const analyzeRomanNumeral = useCallback((chordRoot, chordType) => {
        return getRomanNumeral(chordRoot, chordType, selectedKey.root, selectedKey.type);
    }, [selectedKey]);


    return {
        // Playback state and controls
        isPlaying,
        togglePlayback,
        stopPlayback,
        bpm, setBpm,
        chordDuration, setChordDuration,
        currentChordIndex,

        // Progression data and modifications
        progression,
        addChord,
        removeChord,
        clearProgression,

        // Drag & Drop handlers
        handleDragStart,
        handleDragEnter,
        handleDragLeave,
        handleDragEnd,
        handleDrop,
        handleDragOver,

        // Analysis
        selectedKey, setSelectedKey,
        analyzeRomanNumeral,

        // General status
        isAudioReady,
        isLoading,
        error: audioContextError,

        // Data for UI components
        availableChordTypes,
        allNotes,
        availableKeys,
        voicingOctaveShift, setVoicingOctaveShift,
    };
};
// --- End useChordProgressionBuilder Hook ---


// --- ParameterSlider Component (reused) ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '', isAudioReady, colorClass = 'accent-purple-600 bg-purple-100' }) => (
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
            disabled={!isAudioReady}
        />
        <p className="text-gray-700 text-sm mt-1 italic text-center px-2">{explanation}</p>
    </div>
);
// --- End ParameterSlider Component ---


// --- ChordBlock Component ---
const ChordBlock = ({ chord, index, onRemove, isCurrent, analyzeRomanNumeral, onDragStart, onDragEnter, onDragLeave, onDrop, onDragOver, isAudioReady }) => {
    const romanNumeral = analyzeRomanNumeral(chord.root, chord.type);

    return (
        <div
            className={`
                chord-block-draggable flex flex-col items-center justify-between p-3 rounded-lg shadow-md border
                bg-blue-200 text-blue-900 font-semibold text-center cursor-grab select-none min-w-[100px]
                ${isCurrent ? 'border-4 border-yellow-400 transform scale-105 transition-transform duration-100 ease-out' : 'border-blue-300'}
                ${!isAudioReady ? 'opacity-70 cursor-not-allowed' : ''}
            `}
            draggable={isAudioReady} // Only draggable if audio is ready
            onDragStart={(e) => onDragStart(e, index)}
            onDragEnter={(e) => onDragEnter(e, index)}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragEnd={e => {
                onDragEnd && onDragEnd(e); // Call the global drag end handler
                e.currentTarget.classList.remove('opacity-50', 'border-dashed', 'border-blue-500'); // Specific cleanup
            }}
        >
            <div className="flex-grow flex flex-col justify-center items-center">
                <span className="text-xl">{chord.root}</span>
                <span className="text-sm">{chord.type === 'dom7' ? '7' : chord.type.charAt(0).toUpperCase() + chord.type.slice(1)}</span>
                {romanNumeral && <span className="text-xs italic text-blue-700 mt-1">({romanNumeral})</span>}
            </div>
            {onRemove && (
                <button
                    onClick={() => onRemove(chord.id)}
                    className="mt-2 text-red-600 hover:text-red-800 transition-colors"
                    title="Remove Chord"
                    disabled={!isAudioReady}
                >
                    <Trash2 size={16} />
                </button>
            )}
        </div>
    );
};
// --- End ChordBlock Component ---


// --- ChordProgressionBuilderContent (Main UI Logic) ---
const ChordProgressionBuilderContent = () => {
    const {
        isPlaying, togglePlayback, stopPlayback,
        bpm, setBpm,
        chordDuration, setChordDuration,
        currentChordIndex,
        progression,
        addChord,
        removeChord,
        clearProgression,
        handleDragStart, handleDragEnter, handleDragLeave, handleDragEnd, handleDrop, handleDragOver,
        selectedKey, setSelectedKey,
        analyzeRomanNumeral,
        isAudioReady, isLoading, error,
        availableChordTypes, allNotes, availableKeys,
        voicingOctaveShift, setVoicingOctaveShift,
    } = useChordProgressionBuilder();

    const getExplanation = (param) => {
        switch (param) {
            case 'bpm': return "The tempo (beats per minute) for playback.";
            case 'chordDuration': return "The duration each chord plays (in seconds).";
            case 'voicingOctaveShift': return "Shift the entire chord voicing up or down by octaves.";
            default: return "";
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 50%, #93c5fd 100%)', // Light blue gradient
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Floating Icons Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%2360a5fa' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            <div className="text-center mb-10 z-10">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <Music size={48} className="text-blue-700" />
                    <h1 className="text-5xl font-extrabold text-blue-900 drop-shadow-lg">Chord Progression Builder</h1>
                </div>
                {error && (
                    <p className="text-red-600 text-sm mt-4 font-semibold">
                        Error: {error}
                    </p>
                )}
                {!isAudioReady && isLoading && (
                    <p className="text-blue-700 text-sm mt-4 animate-pulse">
                        Setting up audio system...
                    </p>
                )}
                {!isAudioReady && !isLoading && !error && (
                    <p className="text-blue-700 text-sm mt-4">
                        Audio context suspended. Click "Play Progression" to activate audio.
                    </p>
                )}
                {isAudioReady && !isLoading && (
                    <p className="text-blue-600 text-sm mt-4">
                        Audio system ready! Drag chords below to build your progression.
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg w-full max-w-6xl flex flex-col items-center space-y-8 z-10 border border-blue-200">

                {/* Playback Controls & Settings */}
                <div className="flex flex-wrap justify-center items-center gap-4 w-full border-b border-blue-200 pb-6 mb-6">
                    <button
                        type="button"
                        onClick={togglePlayback}
                        className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all duration-300
                                ${isAudioReady && !isPlaying && progression.length > 0
                                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                    : isPlaying && isAudioReady
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                `}
                        disabled={!isAudioReady || progression.length === 0}
                    >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        {isPlaying ? 'Pause Progression' : 'Play Progression'}
                    </button>

                    <button
                        type="button"
                        onClick={stopPlayback}
                        className={`px-6 py-3 rounded-full font-semibold text-base flex items-center gap-2 transition-all duration-200
                                bg-orange-100 text-orange-800 hover:bg-orange-200
                                ${(!isPlaying && currentChordIndex === -1) || !isAudioReady ? 'cursor-not-allowed opacity-50' : ''}
                            `}
                        disabled={(!isPlaying && currentChordIndex === -1) || !isAudioReady}
                    >
                        <Trash2 size={20} />
                        Stop & Reset
                    </button>

                    {/* BPM Slider */}
                    <div className="w-48">
                        <ParameterSlider
                            label="Tempo" value={bpm} setter={setBpm}
                            min="40" max="240" step="1" unit=" BPM"
                            explanation={getExplanation('bpm')}
                            isAudioReady={isAudioReady}
                            colorClass="accent-blue-700 bg-blue-200"
                        />
                    </div>

                    {/* Chord Duration Slider */}
                    <div className="w-48">
                        <ParameterSlider
                            label="Chord Duration" value={chordDuration} setter={setChordDuration}
                            min="0.1" max="2" step="0.1" unit=" s"
                            explanation={getExplanation('chordDuration')}
                            isAudioReady={isAudioReady}
                            colorClass="accent-blue-700 bg-blue-200"
                        />
                    </div>

                    {/* Voicing Octave Shift */}
                    <div className="w-48">
                        <ParameterSlider
                            label="Voicing Shift" value={voicingOctaveShift} setter={setVoicingOctaveShift}
                            min="-2" max="2" step="1" unit=" Octaves"
                            explanation={getExplanation('voicingOctaveShift')}
                            isAudioReady={isAudioReady}
                            colorClass="accent-blue-700 bg-blue-200"
                        />
                    </div>
                </div>

                {/* Key Selection for Analysis */}
                <div className="w-full md:w-1/2 lg:w-1/3 flex flex-col items-center mb-6">
                    <label htmlFor="key-select" className="text-gray-800 font-semibold mb-2 flex items-center gap-2">
                        <Eye size={20} /> Analyze in Key:
                    </label>
                    <select
                        id="key-select"
                        value={`${selectedKey.root}-${selectedKey.type}`}
                        onChange={(e) => {
                            const [root, type] = e.target.value.split('-');
                            setSelectedKey({ root, type });
                        }}
                        className="p-3 rounded-lg border border-blue-300 bg-blue-50 text-blue-800 w-full shadow-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                        disabled={!isAudioReady}
                    >
                        {availableKeys.map(key => (
                            <option key={`${key.root}-${key.type}`} value={`${key.root}-${key.type}`}>
                                {key.root} {key.type.charAt(0).toUpperCase() + key.type.slice(1)}
                            </option>
                        ))}
                    </select>
                    <p className="text-gray-700 text-sm mt-1 italic text-center px-2">Select the key to analyze Roman numerals for your progression.</p>
                </div>


                {/* Chord Progression Display Area */}
                <div
                    className={`bg-blue-50/70 p-6 rounded-xl shadow-inner w-full min-h-[150px] border border-blue-100
                                flex flex-wrap gap-4 items-center justify-center transition-all duration-200
                                ${progression.length === 0 ? 'border-dashed border-blue-300' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                >
                    {progression.length === 0 ? (
                        <p className="text-blue-500 italic text-lg text-center">Drag and drop chords here to build your progression!</p>
                    ) : (
                        progression.map((chord, index) => (
                            <ChordBlock
                                key={chord.id}
                                chord={chord}
                                index={index}
                                onRemove={removeChord}
                                isCurrent={isPlaying && currentChordIndex === index}
                                analyzeRomanNumeral={analyzeRomanNumeral}
                                onDragStart={handleDragStart}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                isAudioReady={isAudioReady}
                            />
                        ))
                    )}
                </div>

                {/* Action Buttons for Progression */}
                {progression.length > 0 && (
                    <button
                        onClick={clearProgression}
                        className={`mt-4 px-6 py-3 rounded-full font-semibold text-base flex items-center gap-2 transition-all duration-200
                            bg-red-100 text-red-800 hover:bg-red-200
                            ${!isAudioReady ? 'cursor-not-allowed opacity-50' : ''}
                        `}
                        disabled={!isAudioReady}
                    >
                        <Trash2 size={20} />
                        Clear Progression
                    </button>
                )}


                {/* Available Chord Palette */}
                <div className="w-full mt-8 pt-6 border-t border-blue-200">
                    <h2 className="text-3xl font-bold text-blue-800 mb-6 text-center flex items-center justify-center gap-3">
                        <Plus size={28} /> Available Chords
                    </h2>
                    <div className="flex flex-wrap justify-center gap-4">
                        {allNotes.map(root => (
                            <div key={root} className="flex flex-col items-center gap-2 border p-3 rounded-lg shadow-sm bg-gray-50 border-gray-200">
                                <h3 className="text-lg font-bold text-gray-800">{root}</h3>
                                {availableChordTypes.map(chordType => (
                                    <button
                                        key={`${root}-${chordType.type}`}
                                        draggable={isAudioReady}
                                        onDragStart={(e) => {
                                            if (isAudioReady) {
                                                e.dataTransfer.effectAllowed = "copy"; // Indicate copy operation
                                                e.dataTransfer.setData("application/json", JSON.stringify({ root, type: chordType.type }));
                                                e.currentTarget.classList.add('opacity-50'); // Visual feedback
                                            } else {
                                                e.preventDefault(); // Prevent drag if not ready
                                            }
                                        }}
                                        onDragEnd={(e) => {
                                            e.currentTarget.classList.remove('opacity-50'); // Clean up feedback
                                        }}
                                        onClick={() => addChord(root, chordType.type)}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 w-full text-left
                                            ${isAudioReady
                                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 active:bg-blue-300 active:scale-95'
                                                : 'bg-gray-300 text-gray-600 cursor-not-allowed'}
                                        `}
                                        disabled={!isAudioReady}
                                    >
                                        {chordType.name}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="text-center text-gray-700 text-sm mt-6 italic px-4">
                    **Note:** Drag chords from the "Available Chords" palette below into the progression area above. You can drag them into specific positions or reorder existing chords by dragging them within the progression. Click "Play Progression" to hear your sequence. Select a key to see Roman numeral analysis for each chord.
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
        console.error("Uncaught error in ChordProgressionBuilder:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Chord Progression Builder. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export wrapping the main content with AudioContextProvider and ErrorBoundary
const ChordProgressionBuilder = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <ChordProgressionBuilderContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default ChordProgressionBuilder;
