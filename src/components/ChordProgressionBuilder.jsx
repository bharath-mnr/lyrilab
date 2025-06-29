import React, { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Music, Trash2, Shuffle, Plus, Eye, RotateCcw, Save, Volume2 } from 'lucide-react';

// --- AUDIO CONTEXT ---
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);
    const [error, setError] = useState(null);

    const startGlobalAudio = useCallback(async () => {
        if (Tone.context.state === 'running') {
            setIsAudioGloballyReady(true);
            return true;
        }

        try {
            await Tone.start();
            
            const startTime = Date.now();
            const success = await new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (Tone.context.state === 'running') {
                        clearInterval(checkInterval);
                        resolve(true);
                    } else if (Date.now() - startTime > 5000) {
                        clearInterval(checkInterval);
                        resolve(false);
                    }
                }, 100);
            });

            if (success) {
                setIsAudioGloballyReady(true);
                setError(null);
                return true;
            } else {
                setError("Failed to start audio. Browser context might be suspended.");
                return false;
            }
        } catch (error) {
            console.error("AudioContext Error:", error);
            setError("Failed to initialize audio. Please check your browser permissions.");
            setIsAudioGloballyReady(false);
            return false;
        }
    }, []);

    useEffect(() => {
        const handleToneContextChange = () => {
            const currentState = Tone.context.state;
            if (currentState === 'running') {
                setIsAudioGloballyReady(true);
                setError(null);
            } else {
                setIsAudioGloballyReady(false);
                if (currentState === 'suspended') {
                    setError("Audio context suspended. Click to activate.");
                }
            }
        };

        Tone.context.on('statechange', handleToneContextChange);
        handleToneContextChange();

        const clickToActivateHandler = () => {
            if (Tone.context.state !== 'running') {
                startGlobalAudio();
            }
        };

        if (Tone.context.state !== 'running') {
            document.addEventListener('click', clickToActivateHandler, { once: true });
        }
        
        return () => {
            Tone.context.off('statechange', handleToneContextChange);
            document.removeEventListener('click', clickToActivateHandler);
        };
    }, [startGlobalAudio]);

    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, startGlobalAudio, error }}>
            {children}
        </AudioContext.Provider>
    );
};

// --- ENHANCED MUSICAL DATA ---
const allNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];
const minorScaleIntervals = [0, 2, 3, 5, 7, 8, 10];
const harmonicMinorIntervals = [0, 2, 3, 5, 7, 8, 11];

// Enhanced chord types with more sophisticated voicings
const getChordNotes = (root, type, octave = 4, voicing = 'close') => {
    const rootIndex = allNotes.indexOf(root);
    let intervals;
    
    switch (type) {
        case 'major':
            intervals = [0, 4, 7];
            break;
        case 'minor':
            intervals = [0, 3, 7];
            break;
        case 'diminished':
            intervals = [0, 3, 6];
            break;
        case 'augmented':
            intervals = [0, 4, 8];
            break;
        case 'dom7':
            intervals = [0, 4, 7, 10];
            break;
        case 'maj7':
            intervals = [0, 4, 7, 11];
            break;
        case 'min7':
            intervals = [0, 3, 7, 10];
            break;
        case 'dim7':
            intervals = [0, 3, 6, 9];
            break;
        case 'sus2':
            intervals = [0, 2, 7];
            break;
        case 'sus4':
            intervals = [0, 5, 7];
            break;
        case '6':
            intervals = [0, 4, 7, 9];
            break;
        case 'min6':
            intervals = [0, 3, 7, 9];
            break;
        default:
            intervals = [0];
    }

    const notes = intervals.map((interval, index) => {
        let noteIndex = rootIndex + interval;
        let currentOctave = octave;
        
        // Apply voicing logic
        if (voicing === 'spread' && index > 0) {
            currentOctave += Math.floor(index / 2);
        } else if (voicing === 'drop2' && index === 1 && intervals.length >= 4) {
            currentOctave -= 1;
        }
        
        while (noteIndex >= allNotes.length) {
            noteIndex -= allNotes.length;
            currentOctave++;
        }
        return `${allNotes[noteIndex]}${currentOctave}`;
    });
    
    return notes;
};

// Enhanced Roman numeral analysis
const getRomanNumeral = (chordRoot, chordType, keyRoot, keyType) => {
    const rootIndex = allNotes.indexOf(chordRoot);
    const keyIndex = allNotes.indexOf(keyRoot);
    
    const scaleIntervals = keyType === 'major' ? majorScaleIntervals : 
                          keyType === 'minor' ? minorScaleIntervals : 
                          harmonicMinorIntervals;

    let scaleDegree = -1;
    for (let i = 0; i < scaleIntervals.length; i++) {
        const intervalNoteIndex = (keyIndex + scaleIntervals[i]) % allNotes.length;
        if (intervalNoteIndex === rootIndex) {
            scaleDegree = i;
            break;
        }
    }

    if (scaleDegree === -1) {
        // Check for secondary dominants and other common non-diatonic chords
        const circleOfFifths = getCircleOfFifthsRelation(chordRoot, chordType, keyRoot, keyType);
        return circleOfFifths || '?';
    }

    const romanBase = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][scaleDegree];
    
    // Enhanced quality mapping
    let numeral = romanBase;
    if (keyType === 'major') {
        if ([1, 2, 5].includes(scaleDegree) && chordType === 'minor') numeral = numeral.toLowerCase();
        if (scaleDegree === 6 && chordType === 'diminished') numeral = numeral.toLowerCase() + '°';
        if (chordType.includes('7')) numeral += '7';
        if (chordType === 'dim7') numeral = numeral.toLowerCase() + '°7';
    } else if (keyType === 'minor') {
        if ([0, 3].includes(scaleDegree) && chordType === 'minor') numeral = numeral.toLowerCase();
        if ([2, 4, 5].includes(scaleDegree) && chordType === 'major') numeral = numeral.toUpperCase();
        if (scaleDegree === 1 && chordType === 'diminished') numeral = numeral.toLowerCase() + '°';
        if (chordType.includes('7')) numeral += '7';
    }
    
    return numeral;
};

// Secondary dominants and circle of fifths analysis
const getCircleOfFifthsRelation = (chordRoot, chordType, keyRoot, keyType) => {
    if (chordType === 'dom7' || (chordType === 'major' && chordRoot !== keyRoot)) {
        // Check if this could be a secondary dominant
        const chordIndex = allNotes.indexOf(chordRoot);
        const keyIndex = allNotes.indexOf(keyRoot);
        const scaleIntervals = keyType === 'major' ? majorScaleIntervals : minorScaleIntervals;
        
        for (let i = 0; i < scaleIntervals.length; i++) {
            const targetNote = (keyIndex + scaleIntervals[i]) % allNotes.length;
            const dominantOfTarget = (targetNote + 7) % allNotes.length; // Fifth above
            
            if (dominantOfTarget === chordIndex) {
                const targetRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][i];
                const adjustedTarget = keyType === 'minor' && [0, 3].includes(i) ? 
                    targetRoman.toLowerCase() : targetRoman;
                return `V/${adjustedTarget}`;
            }
        }
    }
    return null;
};

// Common chord progressions
const commonProgressions = {
    'I-V-vi-IV': [
        { root: 'C', type: 'major' },
        { root: 'G', type: 'major' },
        { root: 'A', type: 'minor' },
        { root: 'F', type: 'major' }
    ],
    'vi-IV-I-V': [
        { root: 'A', type: 'minor' },
        { root: 'F', type: 'major' },
        { root: 'C', type: 'major' },
        { root: 'G', type: 'major' }
    ],
    'ii-V-I': [
        { root: 'D', type: 'minor' },
        { root: 'G', type: 'dom7' },
        { root: 'C', type: 'maj7' }
    ],
    'I-vi-ii-V': [
        { root: 'C', type: 'major' },
        { root: 'A', type: 'minor' },
        { root: 'D', type: 'minor' },
        { root: 'G', type: 'dom7' }
    ]
};

// --- ENHANCED HOOK ---
const useChordProgressionBuilder = () => {
    const { isAudioGloballyReady, startGlobalAudio, error: audioContextError } = useContext(AudioContext);
    const synthRef = useRef(null);
    const sequenceRef = useRef(null);
    
    const [progression, setProgression] = useState([]);
    const [bpm, setBpm] = useState(120);
    const [chordDuration, setChordDuration] = useState(1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentChordIndex, setCurrentChordIndex] = useState(-1);
    const [selectedKey, setSelectedKey] = useState({ root: 'C', type: 'major' });
    const [voicingOctaveShift, setVoicingOctaveShift] = useState(0);
    const [voicingType, setVoicingType] = useState('close');
    const [volume, setVolume] = useState(-12);
    const [isAudioReady, setIsAudioReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Enhanced chord types
    const availableChordTypes = useMemo(() => [
        { name: 'Major', type: 'major' },
        { name: 'Minor', type: 'minor' },
        { name: 'Dom7', type: 'dom7' },
        { name: 'Maj7', type: 'maj7' },
        { name: 'Min7', type: 'min7' },
        { name: 'Dim', type: 'diminished' },
        { name: 'Dim7', type: 'dim7' },
        { name: 'Aug', type: 'augmented' },
        { name: 'Sus2', type: 'sus2' },
        { name: 'Sus4', type: 'sus4' },
        { name: '6', type: '6' },
        { name: 'Min6', type: 'min6' }
    ], []);

    const availableKeys = useMemo(() => {
        const keys = [];
        allNotes.forEach(note => {
            keys.push({ root: note, type: 'major' });
            keys.push({ root: note, type: 'minor' });
        });
        return keys;
    }, []);

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
    }, []);

    // Enhanced audio setup
    useEffect(() => {
        if (!isAudioGloballyReady) return;
        
        setIsLoading(true);
        
        try {
            disposeSynthAndSequence();

            // Enhanced synth with better sound
            const synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { 
                    type: 'sawtooth',
                    partials: [1, 0.5, 0.25, 0.125] // Add some harmonics
                },
                envelope: {
                    attack: 0.02,
                    decay: 0.1,
                    sustain: 0.4,
                    release: 1.2,
                },
                filter: {
                    frequency: 2000,
                    rolloff: -12
                }
            });

            // Add effects
            const reverb = new Tone.Reverb({
                decay: 2,
                wet: 0.3
            }).toDestination();

            const filter = new Tone.Filter({
                frequency: 800,
                type: 'lowpass'
            });

            synth.chain(filter, reverb);
            synth.volume.value = volume;
            
            synthRef.current = synth;

            Tone.Transport.bpm.value = bpm;
            Tone.Transport.loop = true;

            const sequence = new Tone.Sequence(
                (time, index) => {
                    Tone.Draw.schedule(() => {
                        setCurrentChordIndex(index);
                    }, time);

                    if (progression.length > 0 && index < progression.length) {
                        const chord = progression[index];
                        const notes = getChordNotes(
                            chord.root, 
                            chord.type, 
                            4 + voicingOctaveShift, 
                            voicingType
                        );
                        synthRef.current.triggerAttackRelease(notes, chordDuration, time);
                    }
                },
                [],
                `${chordDuration}s`
            ).start(0);

            sequenceRef.current = sequence;
            setIsAudioReady(true);

        } catch (error) {
            console.error("Audio setup error:", error);
            setIsAudioReady(false);
        } finally {
            setIsLoading(false);
        }

        return disposeSynthAndSequence;
    }, [isAudioGloballyReady, disposeSynthAndSequence, voicingType, volume]);

    // Update sequence when progression changes
    useEffect(() => {
        if (!isAudioReady || !sequenceRef.current) return;

        const sequenceEvents = progression.map((_, index) => index);
        sequenceRef.current.events = sequenceEvents;
        Tone.Transport.loopEnd = `${progression.length * chordDuration}s`;
        
        if (synthRef.current) {
            synthRef.current.volume.value = volume;
        }
        
        if (isPlaying && progression.length === 0) {
            stopPlayback();
        }
    }, [progression, chordDuration, volume, isAudioReady, isPlaying]);

    // Update BPM
    useEffect(() => {
        if (isAudioReady) {
            Tone.Transport.bpm.value = bpm;
        }
    }, [bpm, isAudioReady]);

    const togglePlayback = useCallback(async () => {
        if (!isAudioReady) {
            const started = await startGlobalAudio();
            if (!started) return;
        }

        if (progression.length === 0) return;

        if (isPlaying) {
            Tone.Transport.pause();
            setIsPlaying(false);
        } else {
            Tone.Transport.start();
            setIsPlaying(true);
        }
    }, [isPlaying, progression.length, isAudioReady, startGlobalAudio]);

    const stopPlayback = useCallback(() => {
        Tone.Transport.stop();
        setIsPlaying(false);
        setCurrentChordIndex(-1);
    }, []);

    const addChord = useCallback((root, type) => {
        setProgression(prev => [...prev, { 
            id: Date.now() + Math.random(), 
            root, 
            type 
        }]);
    }, []);

    const removeChord = useCallback((idToRemove) => {
        setProgression(prev => prev.filter(chord => chord.id !== idToRemove));
    }, []);

    const clearProgression = useCallback(() => {
        setProgression([]);
        stopPlayback();
    }, [stopPlayback]);

    // Transpose progression
    const transposeProgression = useCallback((semitones) => {
        setProgression(prev => prev.map(chord => ({
            ...chord,
            root: allNotes[(allNotes.indexOf(chord.root) + semitones + 12) % 12]
        })));
    }, []);

    // Load common progression
    const loadCommonProgression = useCallback((progressionName) => {
        const baseProgression = commonProgressions[progressionName];
        if (baseProgression) {
            // Transpose to selected key
            const keyOffset = allNotes.indexOf(selectedKey.root);
            const transposedProgression = baseProgression.map(chord => ({
                ...chord,
                id: Date.now() + Math.random(),
                root: allNotes[(allNotes.indexOf(chord.root) + keyOffset) % 12]
            }));
            setProgression(transposedProgression);
        }
    }, [selectedKey.root]);

    // Shuffle progression
    const shuffleProgression = useCallback(() => {
        setProgression(prev => {
            const shuffled = [...prev];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        });
    }, []);

    // Drag and drop functionality
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    const handleDragStart = useCallback((e, index) => {
        dragItem.current = index;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", index);
    }, []);

    const handleDragEnter = useCallback((e, index) => {
        dragOverItem.current = index;
        e.preventDefault();
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        if (dragItem.current !== null && dragOverItem.current !== null) {
            const newProgression = [...progression];
            const draggedChord = newProgression.splice(dragItem.current, 1)[0];
            newProgression.splice(dragOverItem.current, 0, draggedChord);
            setProgression(newProgression);
        }
        dragItem.current = null;
        dragOverItem.current = null;
    }, [progression]);

    const analyzeRomanNumeral = useCallback((chordRoot, chordType) => {
        return getRomanNumeral(chordRoot, chordType, selectedKey.root, selectedKey.type);
    }, [selectedKey]);

    return {
        // Playback
        isPlaying, togglePlayback, stopPlayback,
        bpm, setBpm,
        chordDuration, setChordDuration,
        currentChordIndex,
        
        // Progression
        progression,
        addChord, removeChord, clearProgression,
        transposeProgression, shuffleProgression,
        loadCommonProgression,
        
        // Audio config
        volume, setVolume,
        voicingType, setVoicingType,
        voicingOctaveShift, setVoicingOctaveShift,
        
        // Drag & Drop
        handleDragStart, handleDragEnter, handleDragOver, handleDrop,
        
        // Analysis
        selectedKey, setSelectedKey,
        analyzeRomanNumeral,
        
        // Status
        isAudioReady, isLoading,
        error: audioContextError,
        
        // Data
        availableChordTypes, allNotes, availableKeys,
        commonProgressions: Object.keys(commonProgressions)
    };
};

// --- COMPONENTS ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '', isAudioReady, colorClass = 'accent-blue-600' }) => (
    <div className="flex flex-col items-center w-full">
        <label className="text-gray-800 font-medium mb-2 text-center text-sm">
            {label}: {typeof value === 'number' ? value.toFixed(value < 1 && value !== 0 ? 2 : 0) : value}{unit}
        </label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setter(parseFloat(e.target.value))}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${colorClass} disabled:opacity-50`}
            disabled={!isAudioReady}
        />
        <p className="text-gray-600 text-xs mt-1 text-center px-1">{explanation}</p>
    </div>
);

const ChordBlock = ({ chord, index, onRemove, isCurrent, analyzeRomanNumeral, onDragStart, onDragEnter, onDragOver, onDrop, isAudioReady }) => {
    const romanNumeral = analyzeRomanNumeral(chord.root, chord.type);
    
    const getChordColor = (type) => {
        switch (type) {
            case 'major': return 'bg-blue-200 text-blue-900 border-blue-300';
            case 'minor': return 'bg-green-200 text-green-900 border-green-300';
            case 'dom7': return 'bg-orange-200 text-orange-900 border-orange-300';
            case 'diminished': case 'dim7': return 'bg-red-200 text-red-900 border-red-300';
            default: return 'bg-purple-200 text-purple-900 border-purple-300';
        }
    };

    return (
        <div
            className={`
                flex flex-col items-center justify-between p-3 rounded-lg shadow-md border-2
                ${getChordColor(chord.type)}
                ${isCurrent ? 'ring-4 ring-yellow-400 transform scale-105' : ''}
                ${isAudioReady ? 'cursor-grab hover:shadow-lg' : 'opacity-50 cursor-not-allowed'}
                min-w-[90px] transition-all duration-200
            `}
            draggable={isAudioReady}
            onDragStart={(e) => onDragStart(e, index)}
            onDragEnter={(e) => onDragEnter(e, index)}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            <div className="text-center">
                <div className="text-lg font-bold">{chord.root}</div>
                <div className="text-sm">{chord.type}</div>
                {romanNumeral && (
                    <div className="text-xs italic mt-1 opacity-75">({romanNumeral})</div>
                )}
            </div>
            {onRemove && (
                <button
                    onClick={() => onRemove(chord.id)}
                    className="mt-2 text-red-500 hover:text-red-700 transition-colors"
                    disabled={!isAudioReady}
                >
                    <Trash2 size={14} />
                </button>
            )}
        </div>
    );
};

const ChordProgressionBuilderContent = () => {
    const hookData = useChordProgressionBuilder();
    const {
        isPlaying, togglePlayback, stopPlayback,
        bpm, setBpm, chordDuration, setChordDuration, currentChordIndex,
        progression, addChord, removeChord, clearProgression,
        transposeProgression, shuffleProgression, loadCommonProgression,
        volume, setVolume, voicingType, setVoicingType, voicingOctaveShift, setVoicingOctaveShift,
        handleDragStart, handleDragEnter, handleDragOver, handleDrop,
        selectedKey, setSelectedKey, analyzeRomanNumeral,
        isAudioReady, isLoading, error,
        availableChordTypes, allNotes, availableKeys, commonProgressions
    } = hookData;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Music size={40} className="text-blue-700" />
                        <h1 className="text-4xl font-bold text-gray-800">Enhanced Chord Progression Builder</h1>
                    </div>
                    
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}
                    
                    {!isAudioReady && isLoading && (
                        <div className="text-blue-600 animate-pulse">Setting up audio system...</div>
                    )}
                </div>

                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-6">
                    {/* Controls Row 1: Playback */}
                    <div className="flex flex-wrap gap-4 items-center justify-center mb-6 pb-6 border-b">
                        <button
                            onClick={togglePlayback}
                            disabled={!isAudioReady || progression.length === 0}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all ${
                                isAudioReady && progression.length > 0
                                    ? isPlaying 
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : 'bg-green-500 hover:bg-green-600 text-white'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                            {isPlaying ? 'Pause' : 'Play'}
                        </button>

                        <button
                            onClick={stopPlayback}
                            disabled={!isPlaying}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white disabled:bg-gray-300 disabled:text-gray-500"
                        >
                            <RotateCcw size={16} />
                            Stop
                        </button>

                        <button
                            onClick={shuffleProgression}
                            disabled={!isAudioReady || progression.length < 2}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500 hover:bg-purple-600 text-white disabled:bg-gray-300 disabled:text-gray-500"
                        >
                            <Shuffle size={16} />
                            Shuffle
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={() => transposeProgression(1)}
                                disabled={!isAudioReady || progression.length === 0}
                                className="px-3 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:text-gray-500"
                            >
                                +1♯
                            </button>
                            <button
                                onClick={() => transposeProgression(-1)}
                                disabled={!isAudioReady || progression.length === 0}
                                className="px-3 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:text-gray-500"
                            >
                                -1♭
                            </button>
                        </div>
                    </div>

                    {/* Controls Row 2: Parameters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 pb-6 border-b">
                        <ParameterSlider
                            label="Tempo"
                            value={bpm}
                            setter={setBpm}
                            min="60"
                            max="200"
                            step="1"
                            unit=" BPM"
                            explanation="Playback speed"

			    isAudioReady={isAudioReady}
                            colorClass="accent-blue-600"
                        />
                        
                        <ParameterSlider
                            label="Chord Duration"
                            value={chordDuration}
                            setter={setChordDuration}
                            min="0.25"
                            max="4"
                            step="0.25"
                            unit=" beats"
                            explanation="Length of each chord"
                            isAudioReady={isAudioReady}
                            colorClass="accent-green-600"
                        />
                        
                        <ParameterSlider
                            label="Volume"
                            value={volume}
                            setter={setVolume}
                            min="-30"
                            max="0"
                            step="1"
                            unit=" dB"
                            explanation="Overall volume level"
                            isAudioReady={isAudioReady}
                            colorClass="accent-purple-600"
                        />
                        
                        <div className="flex flex-col items-center">
                            <label className="text-gray-800 font-medium mb-2 text-sm">Voicing</label>
                            <select
                                value={voicingType}
                                onChange={(e) => setVoicingType(e.target.value)}
                                disabled={!isAudioReady}
                                className="w-full p-2 border rounded-lg bg-white disabled:opacity-50"
                            >
                                <option value="close">Close</option>
                                <option value="spread">Spread</option>
                                <option value="drop2">Drop 2</option>
                            </select>
                            <p className="text-gray-600 text-xs mt-1 text-center">Chord voicing style</p>
                        </div>
                    </div>

                    {/* Key Selection and Common Progressions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 pb-6 border-b">
                        <div className="flex flex-col">
                            <label className="text-gray-800 font-medium mb-2">Key Center</label>
                            <div className="flex gap-2">
                                <select
                                    value={selectedKey.root}
                                    onChange={(e) => setSelectedKey(prev => ({ ...prev, root: e.target.value }))}
                                    className="flex-1 p-2 border rounded-lg bg-white"
                                >
                                    {allNotes.map(note => (
                                        <option key={note} value={note}>{note}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedKey.type}
                                    onChange={(e) => setSelectedKey(prev => ({ ...prev, type: e.target.value }))}
                                    className="flex-1 p-2 border rounded-lg bg-white"
                                >
                                    <option value="major">Major</option>
                                    <option value="minor">Minor</option>
                                    <option value="harmonic-minor">Harmonic Minor</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <label className="text-gray-800 font-medium mb-2">Common Progressions</label>
                            <div className="flex flex-wrap gap-2">
                                {commonProgressions.map(prog => (
                                    <button
                                        key={prog}
                                        onClick={() => loadCommonProgression(prog)}
                                        disabled={!isAudioReady}
                                        className="px-3 py-1 rounded bg-indigo-500 hover:bg-indigo-600 text-white text-sm disabled:bg-gray-300 disabled:text-gray-500"
                                    >
                                        {prog}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Chord Selection */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Plus size={20} />
                            Add Chords
                        </h3>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {allNotes.map(note => (
                                <div key={note} className="bg-gray-50 rounded-lg p-3">
                                    <div className="text-center font-bold text-gray-700 mb-2">{note}</div>
                                    <div className="flex flex-wrap gap-1 justify-center">
                                        {availableChordTypes.slice(0, 4).map(chordType => (
                                            <button
                                                key={`${note}-${chordType.type}`}
                                                onClick={() => addChord(note, chordType.type)}
                                                disabled={!isAudioReady}
                                                className="px-2 py-1 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:text-gray-500"
                                            >
                                                {chordType.name}
                                            </button>
                                        ))}
                                    </div>
                                    <details className="mt-2">
                                        <summary className="text-xs text-gray-600 cursor-pointer">More...</summary>
                                        <div className="flex flex-wrap gap-1 justify-center mt-1">
                                            {availableChordTypes.slice(4).map(chordType => (
                                                <button
                                                    key={`${note}-${chordType.type}`}
                                                    onClick={() => addChord(note, chordType.type)}
                                                    disabled={!isAudioReady}
                                                    className="px-2 py-1 text-xs rounded bg-purple-500 hover:bg-purple-600 text-white disabled:bg-gray-300 disabled:text-gray-500"
                                                >
                                                    {chordType.name}
                                                </button>
                                            ))}
                                        </div>
                                    </details>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Progression Display */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                            <Eye size={20} />
                            Progression ({progression.length} chords)
                        </h3>
                        <button
                            onClick={clearProgression}
                            disabled={!isAudioReady || progression.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:bg-gray-300 disabled:text-gray-500"
                        >
                            <Trash2 size={16} />
                            Clear All
                        </button>
                    </div>

                    {progression.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Music size={48} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg">No chords added yet.</p>
                            <p className="text-sm">Add some chords above to get started!</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-4 justify-center">
                            {progression.map((chord, index) => (
                                <ChordBlock
                                    key={chord.id}
                                    chord={chord}
                                    index={index}
                                    onRemove={removeChord}
                                    isCurrent={currentChordIndex === index}
                                    analyzeRomanNumeral={analyzeRomanNumeral}
                                    onDragStart={handleDragStart}
                                    onDragEnter={handleDragEnter}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    isAudioReady={isAudioReady}
                                />
                            ))}
                        </div>
                    )}

                    {progression.length > 0 && (
                        <div className="mt-6 pt-4 border-t text-center text-sm text-gray-600">
                            <p><strong>Roman Numeral Analysis:</strong> {selectedKey.root} {selectedKey.type}</p>
                            <p className="mt-1">
                                {progression.map((chord, index) => (
                                    <span key={chord.id} className={currentChordIndex === index ? 'font-bold text-yellow-600' : ''}>
                                        {analyzeRomanNumeral(chord.root, chord.type)}
                                        {index < progression.length - 1 ? ' - ' : ''}
                                    </span>
                                ))}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-gray-600">
                    <p className="text-sm">
                        Enhanced Chord Progression Builder with Roman numeral analysis, drag & drop reordering, and advanced voicings.
                    </p>
                    <p className="text-xs mt-2">
                        💡 Tip: Drag chords to reorder them, use common progressions as starting points, and experiment with different voicings!
                    </p>
                </div>
            </div>
        </div>
    );
};

const ChordProgressionBuilder = () => {
    return (
        <AudioContextProvider>
            <ChordProgressionBuilderContent />
        </AudioContextProvider>
    );
};

export default ChordProgressionBuilder;