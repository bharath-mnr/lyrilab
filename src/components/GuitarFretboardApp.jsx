import React, { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from 'react';
import * as Tone from 'tone';
import { Volume2, VolumeX, Guitar, Info, Settings } from 'lucide-react';

// --- UTILITY FUNCTIONS ---
// Simple throttle function
const throttle = (func, limit) => {
    let inThrottle;
    let lastFunc;
    let lastRan;
    return function (...args) {
        const context = this;

        // Defensive check: Ensure func is actually a function before applying
        if (typeof func !== 'function') {
            console.error("Throttle error: 'func' is not a function. Type:", typeof func, "Value:", func);
            return; // Prevent further errors
        }

        if (!inThrottle) {
            func.apply(context, args);
            lastRan = Date.now();
            inThrottle = true;
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function () {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, Math.max(limit - (Date.now() - lastRan), 0));
        }
    };
};

// --- AUDIO CONTEXT ---
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);
    const [error, setError] = useState(null);
    const startedRef = useRef(false); // To prevent multiple start attempts

    const startGlobalAudio = useCallback(async () => {
        if (Tone.context.state === 'running') {
            setIsAudioGloballyReady(true);
            setError(null);
            console.log('AudioContext: Tone.js context already running.');
            return;
        }

        if (startedRef.current) {
            // If an attempt has already been made and it's not running, don't spam Tone.start()
            // This case handles a second trigger if the first failed and context is still suspended.
            console.log('AudioContext: Another start attempt in progress or already failed. Waiting for state change.');
            return;
        }
        startedRef.current = true; // Mark that an attempt has been made

        try {
            console.log('AudioContext: Attempting to start global Tone.js context...');
            await Tone.start();

            if (Tone.context.state === 'running') {
                setIsAudioGloballyReady(true);
                setError(null);
                console.log('AudioContext: Tone.js context started successfully');
            } else {
                console.warn('AudioContext: Tone.js context did not start properly (state is ' + Tone.context.state + ')');
                setIsAudioGloballyReady(false);
                setError("Failed to start audio. Browser context might be suspended.");
                startedRef.current = false; // Allow retrying if it failed to run
            }
        } catch (error) {
            console.error("AudioContext: Error starting Tone.js context:", error);
            setError("Failed to initialize audio. Please check your browser permissions.");
            setIsAudioGloballyReady(false);
            startedRef.current = false; // Allow retrying on actual error
        }
    }, []);

    useEffect(() => {
        const handleToneContextChange = () => {
            if (Tone.context.state === 'running') {
                setIsAudioGloballyReady(true);
                setError(null);
            } else {
                setIsAudioGloballyReady(false);
                // Only set error if not already set, or if it's explicitly suspended
                if (!error || Tone.context.state === 'suspended') setError("Audio context suspended. Click/Press any key to activate.");
            }
        };

        // Initialize immediately
        handleToneContextChange();

        // Listen for future state changes
        Tone.context.on('statechange', handleToneContextChange);

        return () => {
            Tone.context.off('statechange', handleToneContextChange);
        };
    }, [error]); // Added 'error' to dependency array for clarity, though it might not be strictly necessary here due to how error is set.

    const contextValue = useMemo(() => ({
        isAudioGloballyReady,
        startGlobalAudio,
        error
    }), [isAudioGloballyReady, startGlobalAudio, error]);

    return (
        <AudioContext.Provider value={contextValue}>
            {children}
        </AudioContext.Provider>
    );
};
// --- END AUDIO CONTEXT ---


// --- ENHANCED GUITAR SYNTH HOOK ---
const useGuitarSynth = (initialVolume = 0.8, initialMuted = false) => {
    const { isAudioGloballyReady, startGlobalAudio, error: audioContextError } = useContext(AudioContext);
    const synthsRef = useRef(new Map()); // Map to hold a PluckSynth for each string for polyphony
    const hoverSynthRef = useRef(null); // Dedicated synth for transient hover sounds
    const masterVolumeNodeRef = useRef(null);
    const reverbRef = useRef(null);
    const [isSynthMuted, setIsSynthMuted] = useState(initialMuted);
    const [synthVolume, setSynthVolume] = useState(initialVolume);
    const [isSynthInitialized, setIsSynthInitialized] = useState(false);

    // Effect to initialize/dispose synths and audio nodes
    useEffect(() => {
        // Ensure Tone.js is ready before creating nodes
        if (!isAudioGloballyReady && isSynthInitialized) {
            // Dispose existing synths if audio context becomes unavailable
            console.log("GuitarSynth: Audio context no longer ready, disposing synths.");
            synthsRef.current.forEach(synth => synth.dispose());
            if (hoverSynthRef.current) hoverSynthRef.current.dispose();
            if (masterVolumeNodeRef.current) masterVolumeNodeRef.current.dispose();
            if (reverbRef.current) reverbRef.current.dispose();
            synthsRef.current.clear();
            hoverSynthRef.current = null;
            masterVolumeNodeRef.current = null;
            reverbRef.current = null;
            setIsSynthInitialized(false);
        } else if (isAudioGloballyReady && !isSynthInitialized) {
            // Initialize synths when audio context becomes ready and they aren't initialized
            console.log("GuitarSynth: Audio context ready, initializing synths.");
            try {
                // Create reverb for more realistic sound
                const reverb = new Tone.Reverb({
                    decay: 2.5,
                    wet: 0.35
                }).toDestination(); // Connect reverb directly to destination

                // Create master gain (volume control)
                const masterGain = new Tone.Gain(synthVolume).connect(reverb); // Connect masterGain to reverb

                // Create multiple PluckSynths for polyphonic playing (one per "string"/voice)
                const synths = new Map();
                for (let i = 0; i < 6; i++) { // 6 strings
                    const pluckSynth = new Tone.PluckSynth({
                        attackNoise: 0.9,
                        dampening: 300,
                        resonance: 0.9,
                        release: 5,
                        volume: -6
                    });
                    pluckSynth.connect(masterGain); // Connect individual synths to master gain
                    synths.set(i, pluckSynth);
                }

                // Create a separate synth for hover sounds (shorter, more immediate)
                const hoverSynth = new Tone.PluckSynth({
                    attackNoise: 1.2,
                    dampening: 600,
                    resonance: 0.7,
                    release: 0.5,
                    volume: -10
                }).connect(masterGain); // Connect hover synth to master gain

                synthsRef.current = synths;
                hoverSynthRef.current = hoverSynth;
                masterVolumeNodeRef.current = masterGain;
                reverbRef.current = reverb;
                setIsSynthInitialized(true);

                masterGain.mute = initialMuted; // Apply initial mute state
                setIsSynthMuted(initialMuted); // Sync internal state
            } catch (error) {
                console.error("Error initializing guitar synth:", error);
                setIsSynthInitialized(false);
            }
        }

        // Cleanup function for when the component unmounts
        return () => {
            if (isSynthInitialized) {
                console.log("GuitarSynth: Component unmounting, disposing all synths and nodes.");
                synthsRef.current.forEach(synth => synth.dispose());
                if (hoverSynthRef.current) hoverSynthRef.current.dispose();
                if (masterVolumeNodeRef.current) masterVolumeNodeRef.current.dispose();
                if (reverbRef.current) reverbRef.current.dispose();
                synthsRef.current.clear();
                hoverSynthRef.current = null;
                masterVolumeNodeRef.current = null;
                reverbRef.current = null;
                setIsSynthInitialized(false);
            }
        };
    }, [isAudioGloballyReady, initialMuted, isSynthInitialized, synthVolume]); // Added isSynthInitialized to deps

    // Effect to update master volume when synthVolume state changes
    useEffect(() => {
        if (masterVolumeNodeRef.current) {
            // Using Tone.js's rampTo for smooth volume changes
            masterVolumeNodeRef.current.gain.rampTo(synthVolume, 0.1);
        }
    }, [synthVolume]);

    // Effect to sync mute state from external prop
    useEffect(() => {
        if (masterVolumeNodeRef.current) {
            masterVolumeNodeRef.current.mute = initialMuted;
            setIsSynthMuted(initialMuted);
        }
    }, [initialMuted]);


    const toggleMute = useCallback(() => {
        if (masterVolumeNodeRef.current) {
            masterVolumeNodeRef.current.mute = !masterVolumeNodeRef.current.mute;
            setIsSynthMuted(masterVolumeNodeRef.current.mute);
        }
    }, []);

    // Play a note (for clicks/keyboard)
    const playNote = useCallback(async (note, stringIndex = 0) => {
        if (!isAudioGloballyReady) {
            await startGlobalAudio(); // Attempt to start audio context on user interaction
            if (Tone.context.state !== 'running') return; // If still not running, stop
        }

        const synth = synthsRef.current.get(stringIndex % 6);
        if (synth && isSynthInitialized && !isSynthMuted) {
            // Use Tone.now() for precise timing, notes are sustained until triggerRelease
            synth.triggerAttack(note, Tone.now());
        }
    }, [isAudioGloballyReady, startGlobalAudio, isSynthInitialized, isSynthMuted]);

    // Stop a note (for clicks/keyboard)
    const stopNote = useCallback((note, stringIndex = 0) => {
        const synth = synthsRef.current.get(stringIndex % 6);
        if (synth && isSynthInitialized && !isSynthMuted) { // Ensure not muted when stopping, though stop is usually unconditional
            synth.triggerRelease(Tone.now());
        }
    }, [isSynthInitialized, isSynthMuted]);

    // Play a transient note (for hover)
    const playHoverNote = useCallback((note) => {
        if (!isAudioGloballyReady) {
            return; // Do not attempt to start audio context on hover, rely on user click for activation
        }
        if (hoverSynthRef.current && isSynthInitialized && !isSynthMuted) {
            hoverSynthRef.current.triggerAttackRelease(note, '0.3s', Tone.now());
        }
    }, [isAudioGloballyReady, isSynthInitialized, isSynthMuted]);

    return {
        playNote,
        stopNote,
        playHoverNote,
        isAudioReady: isAudioGloballyReady && isSynthInitialized, // Both global context AND synth must be ready
        isSynthMuted,
        toggleMute,
        synthVolume,
        setSynthVolume,
        audioContextError
    };
};

// --- ENHANCED FRET COMPONENT ---
const Fret = React.memo(({ note, isPressed, onNotePress, onNoteRelease, fretNumber, stringIndex, stringNote, onHoverNotePlay }) => {
    const isSpecialFret = [3, 5, 7, 9, 15, 17, 19, 21].includes(fretNumber);
    const isDoubledotFret = fretNumber === 12;
    const isOpenString = fretNumber === 0;

    // Handles both mouse down and touch start for sustained notes
    const handleInteractionStart = useCallback((e) => {
        e.preventDefault(); // Prevent default touch behavior (e.g., scrolling)
        onNotePress(note, stringIndex);
    }, [onNotePress, note, stringIndex]);

    // Handles both mouse up and touch end/cancel for sustained notes
    const handleInteractionEnd = useCallback((e) => {
        e.preventDefault(); // Prevent default touch behavior
        if (isPressed) { // Only release if it was actively pressed
            onNoteRelease(note, stringIndex);
        }
    }, [onNoteRelease, note, stringIndex, isPressed]);

    // Handles mouse enter for hover sounds (only if not already pressed by click/touch)
    const handleMouseEnter = useCallback(() => {
        if (!isPressed) { // Don't play hover sound if the note is already held by a click
            onHoverNotePlay(note);
        }
    }, [onHoverNotePlay, note, isPressed]);

    return (
        <div
            className={`
                relative flex items-center justify-center flex-grow h-full border-r border-amber-600
                ${isOpenString ? 'border-l-2 border-l-amber-800' : ''}
                ${isPressed ? 'bg-blue-400 shadow-inner' : 'bg-amber-800 hover:bg-amber-700'}
                ${isOpenString ? 'bg-amber-900' : ''}
                transition-all duration-75 ease-out cursor-pointer
                active:scale-95 select-none
            `}
            onMouseDown={handleInteractionStart}
            onMouseUp={handleInteractionEnd}
            // Only trigger mouseleave end if it was 'pressed' to allow notes to stop if user drags mouse away
            onMouseLeave={isPressed ? handleInteractionEnd : undefined}
            onTouchStart={handleInteractionStart}
            onTouchEnd={handleInteractionEnd}
            onTouchCancel={handleInteractionEnd}
            onMouseEnter={handleMouseEnter} // New: Trigger hover sound
            role="button"
            tabIndex={0}
            aria-label={`${stringNote.replace(/\d/, '')} string, Fret ${fretNumber}: ${note}`}
        >
            {/* Fret markers */}
            {isSpecialFret && !isDoubledotFret && (
                <div className="absolute w-2 h-2 rounded-full bg-gray-300 opacity-60" />
            )}
            {isDoubledotFret && (
                <>
                    <div className="absolute w-2 h-2 rounded-full bg-gray-300 opacity-60 top-2" />
                    <div className="absolute w-2 h-2 rounded-full bg-gray-300 opacity-60 bottom-2" />
                </>
            )}

            {/* Note label for open strings */}
            {isOpenString && (
                <span className="absolute text-xs text-amber-200 font-bold">
                    {note.replace(/\d/, '')}
                </span>
            )}

            {/* Pressed indicator */}
            {isPressed && (
                <div className="absolute inset-0 bg-blue-300 opacity-30 rounded animate-pulse" />
            )}
        </div>
    );
});

// --- ENHANCED STRING COMPONENT ---
const GuitarString = React.memo(({ stringNote, frets, pressedFrets, onNotePress, onNoteRelease, stringIndex, onHoverNotePlay }) => {
    const stringThickness = useMemo(() => {
        const thicknesses = [1, 1.5, 2, 2.5, 3, 3.5]; // Thinnest to thickest
        return thicknesses[stringIndex] || 2;
    }, [stringIndex]);

    return (
        <div className="relative flex w-full h-12 items-stretch">
            {/* String line */}
            <div
                className="absolute top-1/2 left-0 right-16 bg-gray-400 transform -translate-y-1/2 opacity-70"
                style={{ height: `${stringThickness}px` }}
            />

            {/* Frets */}
            <div className="flex flex-1 relative z-10">
                {frets.map((note, index) => (
                    <Fret
                        key={`${stringNote}-${index}`}
                        note={note}
                        fretNumber={index}
                        stringIndex={stringIndex}
                        stringNote={stringNote}
                        isPressed={pressedFrets.has(`${note}-${stringIndex}`)}
                        onNotePress={onNotePress}
                        onNoteRelease={onNoteRelease}
                        onHoverNotePlay={onHoverNotePlay} // Pass hover play function
                    />
                ))}
            </div>

            {/* Tuning peg */}
            <div className="w-16 flex-shrink-0 bg-gradient-to-r from-amber-900 to-amber-800 border-l-2 border-amber-700 flex items-center justify-center">
                <span className="text-amber-200 text-sm font-bold drop-shadow">
                    {stringNote.replace(/\d/, '')}
                </span>
            </div>
        </div>
    );
});

// --- MAIN GUITAR FRETBOARD COMPONENT ---
const GuitarFretboard = () => {
    const {
        playNote,
        stopNote,
        playHoverNote,
        isAudioReady,
        isSynthMuted,
        toggleMute,
        synthVolume,
        setSynthVolume,
        audioContextError
    } = useGuitarSynth();

    const [pressedFrets, setPressedFrets] = useState(new Set());
    const [showInstructions, setShowInstructions] = useState(false);
    const [showSettings, setShowSettings] = useState(false); // Settings not yet implemented, but UI button exists

    // State for right-click drag feature
    const [isRightClickDragging, setIsRightClickDragging] = useState(false);
    const lastPlayedNoteDuringDrag = useRef(null); // To track note played during drag and avoid re-triggering same note

    // Standard guitar tuning
    const guitarStringsConfig = useMemo(() => [
        { baseNote: 'E4', numFrets: 24, label: 'E (high)' },
        { baseNote: 'B3', numFrets: 24, label: 'B' },
        { baseNote: 'G3', numFrets: 24, label: 'G' },
        { baseNote: 'D3', numFrets: 24, label: 'D' },
        { baseNote: 'A2', numFrets: 24, label: 'A' },
        { baseNote: 'E2', numFrets: 24, label: 'E (low)' },
    ], []);

    const generateNotesForString = useCallback((baseNote, numFrets) => {
        const notes = [];
        for (let i = 0; i <= numFrets; i++) {
            const midiNote = Tone.Midi(baseNote).toMidi() + i;
            notes.push(Tone.Midi(midiNote).toNote());
        }
        return notes;
    }, []);

    const fullFretboardNotes = useMemo(() => {
        return guitarStringsConfig.map((string, index) => ({
            ...string,
            frets: generateNotesForString(string.baseNote, string.numFrets),
            stringIndex: index // Add stringIndex for easier access
        }));
    }, [guitarStringsConfig, generateNotesForString]);

    const handleFretPress = useCallback((note, stringIndex) => {
        const key = `${note}-${stringIndex}`;
        setPressedFrets(prev => {
            const newSet = new Set(prev);
            if (!newSet.has(key)) {
                newSet.add(key);
                playNote(note, stringIndex); // Call the sustained playNote
            }
            return newSet;
        });
    }, [playNote]);

    const handleFretRelease = useCallback((note, stringIndex) => {
        const key = `${note}-${stringIndex}`;
        setPressedFrets(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
                stopNote(note, stringIndex); // Call the sustained stopNote
            }
            return newSet;
        });
    }, [stopNote]);

    // Enhanced keyboard mappings for all strings
    const keyboardMappings = useMemo(() => ({
        // String 0 (High E): Numbers row
        '1': { note: 'E4', string: 0 }, '2': { note: 'F4', string: 0 }, '3': { note: 'F#4', string: 0 },
        '4': { note: 'G4', string: 0 }, '5': { note: 'G#4', string: 0 }, '6': { note: 'A4', string: 0 },
        '7': { note: 'A#4', string: 0 }, '8': { note: 'B4', string: 0 }, '9': { note: 'C5', string: 0 },
        '0': { note: 'C#5', string: 0 }, '-': { note: 'D5', string: 0 }, '=': { note: 'D#5', string: 0 }, // Extend high E

        // String 1 (B): QWERTY row
        'q': { note: 'B3', string: 1 }, 'w': { note: 'C4', string: 1 }, 'e': { note: 'C#4', string: 1 },
        'r': { note: 'D4', string: 1 }, 't': { note: 'D#4', string: 1 }, 'y': { note: 'E4', string: 1 },
        'u': { note: 'F4', string: 1 }, 'i': { note: 'F#4', string: 1 }, 'o': { note: 'G4', string: 1 },
        'p': { note: 'G#4', string: 1 }, '[': { note: 'A4', string: 1 }, ']': { note: 'A#4', string: 1 }, // Extend B string

        // String 2 (G): ASDF row
        'a': { note: 'G3', string: 2 }, 's': { note: 'G#3', string: 2 }, 'd': { note: 'A3', string: 2 },
        'f': { note: 'A#3', string: 2 }, 'g': { note: 'B3', string: 2 }, 'h': { note: 'C4', string: 2 },
        'j': { note: 'C#4', string: 2 }, 'k': { note: 'D4', string: 2 }, 'l': { note: 'D#4', string: 2 },
        ';': { note: 'E4', string: 2 }, "'": { note: 'F4', string: 2 }, // Extend G string

        // String 3 (D): ZXCV row
        'z': { note: 'D3', string: 3 }, 'x': { note: 'D#3', string: 3 }, 'c': { note: 'E3', string: 3 },
        'v': { note: 'F3', string: 3 }, 'b': { note: 'F#3', string: 3 }, 'n': { note: 'G3', string: 3 },
        'm': { note: 'G#3', string: 3 }, ',': { note: 'A3', string: 3 }, '.': { note: 'A#3', string: 3 },
        '/': { note: 'B3', string: 3 }, // Extend D string

        // String 4 (A): Added to keyboard mappings (e.g., Left Shift + QWERTY for an octave lower or adjacent keys)
        // Using lower row for consistency, starting from the leftmost keys
        // These keys might conflict with other mappings or be less intuitive for general use.
        // Consider 'f1', 'f2', etc. or a Shift/Alt modifier layer for more keys.
        // For now, let's pick some unused keys or re-evaluate.
        // Let's use some less common punctuation/special keys for the lower strings.
        // To avoid conflicts, I'll prioritize these for the primary "keyboard" rows,
        // but for strings 4 and 5, perhaps function keys or numpad keys are better.
        // Given the F-keys are mapped later, let's use them for consistency.
        'f1': { note: 'A2', string: 4 }, 'f2': { note: 'A#2', string: 4 }, 'f3': { note: 'B2', string: 4 },
        'f4': { note: 'C3', string: 4 }, 'f5': { note: 'C#3', string: 4 }, 'f6': { note: 'D3', string: 4 },
        'f7': { note: 'D#3', string: 4 }, 'f8': { note: 'E3', string: 4 }, 'f9': { note: 'F3', string: 4 },
        'f10': { note: 'F#3', string: 4 }, 'f11': { note: 'G3', string: 4 }, 'f12': { note: 'G#3', string: 4 },

        // String 5 (Low E):
        // Consider mapping to keys like CapsLock, Tab, Shift, Ctrl, Alt (though these are often reserved by OS/browser)
        // For web apps, actual key codes are better for modifiers. Let's use the number row for low E if possible,
        // or a different set of keys.
        // Let's use a simpler mapping for demonstration.
        // You might need to adjust these based on what feels natural on a keyboard.
        '`': { note: 'E2', string: 5 }, // Open E (low)
        '~': { note: 'F2', string: 5 },
        '!': { note: 'F#2', string: 5 },
        '@': { note: 'G2', string: 5 },
        '#': { note: 'G#2', string: 5 },
        '$': { note: 'A2', string: 5 },
        '%': { note: 'A#2', string: 5 },
        '^': { note: 'B2', string: 5 },
        '&': { note: 'C3', string: 5 },
        '*': { note: 'C#3', string: 5 },
        '(': { note: 'D3', string: 5 },
        ')': { note: 'D#3', string: 5 },
    }), []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.repeat) return;

            const mapping = keyboardMappings[e.key.toLowerCase()];
            if (mapping) {
                e.preventDefault(); // Prevent default browser actions for mapped keys
                handleFretPress(mapping.note, mapping.string);
            }
        };

        const handleKeyUp = (e) => {
            const mapping = keyboardMappings[e.key.toLowerCase()];
            if (mapping) {
                e.preventDefault(); // Prevent default browser actions for mapped keys
                handleFretRelease(mapping.note, mapping.string);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [keyboardMappings, handleFretPress, handleFretRelease]);

    // --- Right-Click Drag Feature ---
    const handleContextMenu = useCallback((e) => {
        e.preventDefault(); // Prevent default right-click context menu
        setIsRightClickDragging(true);
        // Do not clear pressedFrets here, only on mouse up.
        // lastPlayedNoteDuringDrag.current is cleared by handleMouseMove when dragging off a fret.
    }, []);

    const throttledHandleMouseMove = useCallback(throttle((e) => {
        if (!isRightClickDragging) return;

        // Ensure only right-click is held down (buttons: 2 for right-click)
        // e.buttons property is a bitmask: 1 (left), 2 (right), 4 (middle)
        if (!(e.buttons & 2)) { // Check if right-click button is still pressed
            setIsRightClickDragging(false);
            // This case means the user released right-click while moving outside the window or quickly.
            // Ensure all notes are stopped.
            pressedFrets.forEach(key => {
                const [note, stringIndex] = key.split('-');
                stopNote(note, parseInt(stringIndex));
            });
            setPressedFrets(new Set()); // Clear all notes pressed by drag
            lastPlayedNoteDuringDrag.current = null;
            return;
        }

        const target = e.target;
        const fretDiv = target.closest('[role="button"][aria-label*="string, Fret"]');

        if (fretDiv) {
            const noteAttr = fretDiv.getAttribute('aria-label');
            const match = noteAttr.match(/Fret (\d+): (\w+#?\d+)/);
            if (match) {
                const noteName = match[2];
                const stringMatch = noteAttr.match(/(\w+#?\d+) string/);
                let stringIndex = -1;
                if (stringMatch) {
                    const stringLabel = stringMatch[1];
                    // Find string index based on the label, making it more robust
                    stringIndex = fullFretboardNotes.findIndex(s =>
                        s.label.startsWith(stringLabel) || s.baseNote.replace(/\d/, '') === stringLabel
                    );
                }

                if (stringIndex !== -1) {
                    const currentNoteKey = `${noteName}-${stringIndex}`;

                    if (lastPlayedNoteDuringDrag.current !== currentNoteKey) {
                        // Stop the previously played note during this drag, if any
                        if (lastPlayedNoteDuringDrag.current) {
                            const [prevNote, prevStringIndex] = lastPlayedNoteDuringDrag.current.split('-');
                            stopNote(prevNote, parseInt(prevStringIndex));
                        }
                        handleFretPress(noteName, stringIndex); // Trigger the sustained play logic
                        lastPlayedNoteDuringDrag.current = currentNoteKey;
                    }
                }
            }
        } else {
            // If dragging off a fret, stop the last played note and clear reference
            if (lastPlayedNoteDuringDrag.current) {
                const [prevNote, prevStringIndex] = lastPlayedNoteDuringDrag.current.split('-');
                stopNote(prevNote, parseInt(prevStringIndex));
            }
            lastPlayedNoteDuringDrag.current = null;
        }
    }, 50), [isRightClickDragging, handleFretPress, stopNote, fullFretboardNotes, pressedFrets]); // Throttle at 50ms

    const handleMouseUp = useCallback((e) => {
        // Only trigger if it was a right-click release after dragging
        if (isRightClickDragging && e.button === 2) {
            setIsRightClickDragging(false);
            // Stop all currently pressed notes that were activated by dragging
            // This will iterate through `pressedFrets` set at the moment of release.
            pressedFrets.forEach(key => {
                const [note, stringIndex] = key.split('-');
                stopNote(note, parseInt(stringIndex));
            });
            setPressedFrets(new Set()); // Clear all notes pressed by drag
            lastPlayedNoteDuringDrag.current = null;
        }
    }, [isRightClickDragging, pressedFrets, stopNote]); // Depend on pressedFrets to ensure it's current

    useEffect(() => {
        // Add global mouseup listener to catch releases even if dragging off the fretboard
        window.addEventListener('mouseup', handleMouseUp);
        // Add contextmenu and mousemove listeners to the fretboard container
        const fretboardContainer = document.querySelector('.fretboard-container');
        if (fretboardContainer) {
            fretboardContainer.addEventListener('contextmenu', handleContextMenu);
            fretboardContainer.addEventListener('mousemove', throttledHandleMouseMove); // Use throttled handler
        }

        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
            if (fretboardContainer) {
                fretboardContainer.removeEventListener('contextmenu', handleContextMenu);
                fretboardContainer.removeEventListener('mousemove', throttledHandleMouseMove);
            }
        };
    }, [handleMouseUp, handleContextMenu, throttledHandleMouseMove]); // Re-run effect if handlers change


    // Correctly URL-encode the SVG content for background-image
    const svgBackground = useMemo(() => {
        const rawSvg = `<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="#d4a574" fill-opacity="0.4"><circle cx="30" cy="30" r="2"/></g></g></svg>`;
        return `url("data:image/svg+xml,${encodeURIComponent(rawSvg)}")`;
    }, []);


    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-900 to-slate-900 relative overflow-hidden">
            {/* Background texture */}
            <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: svgBackground, backgroundSize: '60px 60px' }} // Apply encoded SVG here
            />

            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Header */}
                <header className="text-center py-6 px-4">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Guitar className="text-amber-400" size={40} />
                        <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-2xl">
                            Virtual Fretboard
                        </h1>
                    </div>

                    <p className="text-amber-200 text-lg mb-4">
                        Professional guitar fretboard simulator
                    </p>

                    {/* Status indicators */}
                    <div className="flex justify-center gap-4 text-sm">
                        {audioContextError && (
                            <div className="bg-red-500 text-white p-2 rounded-md flex items-center gap-2">
                                <Info size={16} />
                                <span>Error: {audioContextError}</span>
                            </div>
                        )}
                        {!isAudioReady && !audioContextError && (
                            <div className="bg-yellow-500 text-slate-900 p-2 rounded-md flex items-center gap-2 animate-pulse">
                                <Info size={16} />
                                <span>Click/Press to enable audio!</span>
                            </div>
                        )}
                        {isAudioReady && (
                            <div className="bg-green-500 text-white p-2 rounded-md flex items-center gap-2">
                                <Volume2 size={16} />
                                <span>Audio Ready</span>
                            </div>
                        )}
                    </div>
                </header>

                {/* Main Fretboard and Controls */}
                <main className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="fretboard-container bg-amber-950 shadow-2xl rounded-lg p-4 flex flex-col overflow-hidden max-w-full w-[1200px] aspect-[3/1] relative">
                        {fullFretboardNotes.map((string, index) => (
                            <GuitarString
                                key={string.baseNote}
                                stringNote={string.baseNote}
                                frets={string.frets}
                                pressedFrets={pressedFrets}
                                onNotePress={handleFretPress}
                                onNoteRelease={handleFretRelease}
                                stringIndex={string.stringIndex}
                                onHoverNotePlay={playHoverNote}
                            />
                        ))}

                        {/* Fretboard number markers */}
                        <div className="absolute bottom-2 left-16 right-16 flex justify-around text-amber-200 text-xs font-semibold select-none">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24].map(fretNum => (
                                <div key={fretNum} className="flex-grow text-center">
                                    {fretNum}
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                {/* Controls Bar */}
                <div className="bg-slate-800 text-white p-4 flex justify-center items-center gap-6 shadow-lg">
                    {/* Volume Control */}
                    <div className="flex items-center gap-2">
                        {isSynthMuted ? (
                            <VolumeX className="cursor-pointer text-red-400 hover:text-red-300 transition-colors" size={24} onClick={toggleMute} />
                        ) : (
                            <Volume2 className="cursor-pointer text-green-400 hover:text-green-300 transition-colors" size={24} onClick={toggleMute} />
                        )}
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={synthVolume}
                            onChange={(e) => setSynthVolume(parseFloat(e.target.value))}
                            className="w-24 md:w-32 accent-amber-500 cursor-pointer"
                            aria-label="Volume slider"
                        />
                    </div>

                    {/* Instructions Button */}
                    <button
                        onClick={() => setShowInstructions(!showInstructions)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors text-sm font-medium"
                    >
                        <Info size={18} />
                        Instructions
                    </button>

                    {/* Settings Button (Placeholder) */}
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md transition-colors text-sm font-medium"
                    >
                        <Settings size={18} />
                        Settings (Soon!)
                    </button>
                </div>

                {/* Instructions Modal */}
                {showInstructions && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 text-white rounded-lg p-6 max-w-lg w-full shadow-2xl relative">
                            <h2 className="text-2xl font-bold mb-4 text-amber-300">How to Play</h2>
                            <ul className="list-disc list-inside space-y-2 mb-4 text-gray-200">
                                <li>**Click/Tap:** Click or tap on a fret to play a sustained note. Click/tap again or move off the fret to release.</li>
                                <li>**Right-Click Drag:** Hold down the **right mouse button** and drag across frets to quickly play individual notes as you hover over them.</li>
                                <li>**Keyboard:** Use your **QWERTY** keyboard to play notes:
                                    <ul className="list-disc list-inside ml-4 mt-1 text-gray-300">
                                        <li>**Row 1 (`1` to `=`):** High E String</li>
                                        <li>**Row 2 (`Q` to `]`):** B String</li>
                                        <li>**Row 3 (`A` to `'`):** G String</li>
                                        <li>**Row 4 (`Z` to `/`):** D String</li>
                                        <li>**Function Keys (`F1` to `F12`):** A String (A2-G#3) and Low E String (E2-D#3)</li>
                                    </ul>
                                </li>
                                <li>**Hover:** Simply **hover your mouse** over a fret to hear a light, transient pluck sound (without needing to click).</li>
                                <li>**Mute/Volume:** Use the **speaker icon** and **volume slider** at the bottom to control the sound.</li>
                            </ul>
                            <button
                                onClick={() => setShowInstructions(false)}
                                className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                                aria-label="Close instructions"
                            >
                                <VolumeX size={24} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Settings Modal (Placeholder) */}
                {showSettings && (
                    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 text-white rounded-lg p-6 max-w-lg w-full shadow-2xl relative">
                            <h2 className="text-2xl font-bold mb-4 text-amber-300">Settings</h2>
                            <p className="text-gray-200">Settings will be available in a future update!</p>
                            <button
                                onClick={() => setShowSettings(false)}
                                className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                                aria-label="Close settings"
                            >
                                <VolumeX size={24} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- App Wrapper ---
function GuitarFretboardApp() {
    return (
        <AudioContextProvider>
            <GuitarFretboard />
        </AudioContextProvider>
    );
}

export default GuitarFretboardApp;