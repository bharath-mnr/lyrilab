import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, FastForward, Repeat, Music4, ArrowUp, ArrowDown, Shuffle } from 'lucide-react'; // Icons for controls and patterns
import SEOHead from './SEOHead';    

// Define the tool object for SEO structured data
const arpeggiatorTool = {
    id: 'arpeggiator-sequencer',
    name: 'Arpeggiator',
    description: 'Create complex arpeggios with customizable patterns and sequencing options.',
    path: '/arpeggiator-sequencer',
    categories: [
        'Arpeggios',
        'Music Sequencing',
        'Electronic Music',
        'MIDI',
        'Pattern Generation'
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


// --- useArpeggiatorSequencer Hook ---
// This custom hook manages the Tone.js synth, loop, and arpeggiation logic.
const useArpeggiatorSequencer = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const synthRef = useRef(null); // The Tone.Synth to play notes
    const loopRef = useRef(null); // The Tone.Loop for sequencing
    const isSynthInitializedRef = useRef(false); // Flag to indicate if synth/loop are successfully initialized

    const [isPlaying, setIsPlaying] = useState(false); // Indicates if the sequencer is playing
    const [bpm, setBpm] = useState(120); // Beats per minute
    const [stepSubdivision, setStepSubdivision] = useState("8n"); // e.g., "8n" for 8th notes, "16n" for 16th notes

    // Arpeggio settings
    const allNotes = useRef(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']);
    const [selectedNotes, setSelectedNotes] = useState(['C', 'E', 'G']); // Default to C Major triad
    const [baseOctave, setBaseOctave] = useState(4); // Starting octave for the first note
    const [octaveRange, setOctaveRange] = useState(2); // Number of octaves to span (e.g., 1 for single octave, 2 for two octaves)
    const [arpeggioPattern, setArpeggioPattern] = useState('up'); // 'up', 'down', 'upDown', 'random'

    const [currentStep, setCurrentStep] = useState(-1); // Index of the currently playing step for UI
    const activeArpeggioNotesRef = useRef([]); // Stores the dynamically generated notes for the current arpeggio
    const currentStepRef = useRef(0); // Internal ref for Tone.Loop's current step index
    const stepSubdivisionRef = useRef(stepSubdivision); // Ref to hold subdivision for loop callback

    const [isAudioReady, setIsAudioReady] = useState(false); // True when context is running AND synth initialized
    const [isLoading, setIsLoading] = useState(true); // Indicates if audio setup is in progress, initially true

    // Update stepSubdivisionRef whenever stepSubdivision state changes
    useEffect(() => {
        stepSubdivisionRef.current = stepSubdivision;
        if (loopRef.current) { // Immediately update the loop's interval if it exists
            loopRef.current.interval = stepSubdivision;
        }
    }, [stepSubdivision]);


    // Function to stop playing the arpeggio
    const stopSequencer = useCallback(() => {
        if (loopRef.current) {
            loopRef.current.stop();
        }
        // Tone.Synth doesn't have .releaseAll(), notes stop based on their envelope or transport stop
        Tone.Transport.stop(); // Stop the global transport
        setCurrentStep(-1); // Reset visual step
        setIsPlaying(false);
        currentStepRef.current = 0; // Reset internal step counter
        console.log('Sequencer stopped.');
    }, []);


    // Helper function to generate the full sequence of notes based on current settings
    const generateArpeggioNotes = useCallback(() => {
        const notes = [];
        const sortedSelectedNotes = [...selectedNotes].sort((a, b) => // Create a copy to sort
            allNotes.current.indexOf(a) - allNotes.current.indexOf(b)
        );

        for (let o = 0; o < octaveRange; o++) {
            sortedSelectedNotes.forEach(note => {
                notes.push(`${note}${baseOctave + o}`);
            });
        }

        // Apply arpeggio pattern
        if (arpeggioPattern === 'down') {
            notes.reverse();
        } else if (arpeggioPattern === 'upDown') {
            const downPart = [...notes].reverse();
            // Avoid repeating the highest note in the 'down' part if it's the last in 'up'
            notes.push(...downPart.slice(1));
        } else if (arpeggioPattern === 'random') {
            // Fisher-Yates shuffle (in-place)
            for (let i = notes.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [notes[i], notes[j]] = [notes[j], notes[i]];
            }
        }
        return notes;
    }, [selectedNotes, baseOctave, octaveRange, arpeggioPattern]);


    // --- MAIN AUDIO SETUP / CLEANUP EFFECT ---
    // This effect runs only once on mount to create Tone.js objects.
    // It does not depend on parameters like BPM or subdivision to avoid re-creation.
    useEffect(() => {
        console.log('useArpeggiatorSequencer: Main audio setup effect running.');
        setIsLoading(true);

        let localSynth = null;
        let localLoop = null;

        try {
            // Dispose any existing instances first if this effect re-runs (e.g., due to hot reload in dev).
            // Ensure Tone.Transport is stopped to prevent audio glitches on re-init
            Tone.Transport.stop();
            if (synthRef.current) {
                synthRef.current.dispose();
                synthRef.current = null;
            }
            if (loopRef.current) {
                loopRef.current.dispose();
                loopRef.current = null;
            }
            setCurrentStep(-1); // Reset visual step
            setIsPlaying(false); // Reset playing state
            currentStepRef.current = 0; // Reset internal step counter

            localSynth = new Tone.Synth({
                oscillator: { type: 'sine' },
                envelope: {
                    attack: 0.05,
                    decay: 0.1,
                    sustain: 0.3,
                    release: 0.5,
                }
            }).toDestination();
            synthRef.current = localSynth; // Store in ref

            // Create the loop. The callback uses the ref for stepSubdivision.
            localLoop = new Tone.Loop(time => {
                // Defensive checks within the loop callback
                if (Tone.context.state !== 'running' || !synthRef.current || !activeArpeggioNotesRef.current || activeArpeggioNotesRef.current.length === 0) {
                    Tone.Draw.schedule(() => {
                        setCurrentStep(-1);
                        stopSequencer(); // Ensure full state reset if an issue occurs
                    }, time);
                    return;
                }

                const note = activeArpeggioNotesRef.current[currentStepRef.current];
                // Use the ref for current step subdivision to avoid stale closures
                synthRef.current.triggerAttackRelease(note, stepSubdivisionRef.current, time);

                // Schedule UI update on Tone.js's draw callback for synchronization
                Tone.Draw.schedule(() => {
                    setCurrentStep(currentStepRef.current);
                }, time);

                currentStepRef.current = (currentStepRef.current + 1) % activeArpeggioNotesRef.current.length;
            }, stepSubdivisionRef.current); // Initial interval uses ref as well
            loopRef.current = localLoop; // Store in ref

            // Initial BPM setting
            Tone.Transport.bpm.value = bpm;

            isSynthInitializedRef.current = true; // Set ref to true on successful initialization
            console.log('useArpeggiatorSequencer: Tone.js components created and connected.');

        } catch (error) {
            console.error("useArpeggiatorSequencer: Error during Tone.js setup:", error);
            isSynthInitializedRef.current = false; // Set ref to false on error
            setIsAudioReady(false); // Mark audio as not ready on error
            synthRef.current = null; // Ensure refs are null on error
            loopRef.current = null;
        } finally {
            setIsLoading(false);
            // Update overall audio readiness state based on current Tone.js context and refs
            setIsAudioReady(isAudioGloballyReady && isSynthInitializedRef.current);
        }

        // --- CLEANUP FUNCTION FOR THIS EFFECT ---
        return () => {
            console.log('useArpeggiatorSequencer Cleanup: Disposing Tone.js nodes.');
            // Stop Tone.Transport on unmount
            Tone.Transport.stop();
            if (loopRef.current) { // Use ref for cleanup directly if it exists
                loopRef.current.stop();
                loopRef.current.dispose();
            }
            if (synthRef.current) { // Use ref for cleanup directly if it exists
                synthRef.current.dispose();
            }
            // Reset refs to null on cleanup
            synthRef.current = null;
            loopRef.current = null;
            setIsPlaying(false);
            setCurrentStep(-1);
            currentStepRef.current = 0;
            isSynthInitializedRef.current = false; // Set ref to false on unmount/cleanup
            setIsAudioReady(false); // Mark audio as not ready
        };
    }, [stopSequencer, isAudioGloballyReady]); // Dependencies: only things that *must* trigger re-creation (like global audio state)


    // Effect to update isAudioReady state based on global audio context and local synth refs
    // This effect now primarily observes the `isAudioGloballyReady` and `isSynthInitializedRef.current`
    // to determine the overall `isAudioReady` state for the UI.
    useEffect(() => {
        const currentAudioReady = isAudioGloballyReady && isSynthInitializedRef.current;
        if (currentAudioReady !== isAudioReady) {
            setIsAudioReady(currentAudioReady);
            console.log(`useArpeggiatorSequencer: isAudioGloballyReady: ${isAudioGloballyReady}, isSynthInitializedRef.current: ${isSynthInitializedRef.current} => isAudioReady: ${currentAudioReady}`);
        }
    }, [isAudioGloballyReady, isSynthInitializedRef.current]);


    // --- PARAMETER UPDATE EFFECT ---
    // This effect updates Tone.js parameters on existing objects.
    useEffect(() => {
        // Only update if audio system is ready and refs are valid
        // Also ensure it's not during the initial loading phase where objects might not be fully configured yet
        if (!isSynthInitializedRef.current || isLoading) {
            console.warn("Parameter update skipped: Audio system not initialized or still loading.");
            return;
        }

        // Update BPM on Tone.Transport
        Tone.Transport.bpm.value = bpm;
        console.log(`BPM updated to: ${bpm}`);

        // Update loop subdivision interval - this is handled by a separate useEffect now
        // loopRef.current.interval = stepSubdivision;
        // console.log(`Step subdivision updated to: ${stepSubdivision}`);

        // Re-generate active notes when relevant settings change
        activeArpeggioNotesRef.current = generateArpeggioNotes();
        console.log("Active arpeggio notes re-generated:", activeArpeggioNotesRef.current);

        // If playing and notes become empty, stop the sequencer
        if (isPlaying && activeArpeggioNotesRef.current.length === 0) {
            stopSequencer();
        } else if (isPlaying && currentStepRef.current >= activeArpeggioNotesRef.current.length) {
            // If playing and current step is out of bounds after note regeneration, reset step
            currentStepRef.current = 0;
            setCurrentStep(0);
        }

    }, [bpm, stepSubdivision, selectedNotes, baseOctave, octaveRange, arpeggioPattern, generateArpeggioNotes, isPlaying, stopSequencer, isLoading, isSynthInitializedRef.current]);


    // Function to start playing the arpeggio
    const playSequencer = useCallback(async () => {
        console.log('playSequencer called.');

        if (isPlaying) { // Use state for immediate UI reaction
            console.log('Sequencer is already playing, ignoring playSequencer call.');
            return;
        }

        // First, ensure the global audio context is running due to user interaction
        if (Tone.context.state !== 'running') {
            console.log('playSequencer: AudioContext is suspended, attempting to start global audio...');
            await startGlobalAudio(); // This will attempt to resume context on user click
            if (Tone.context.state !== 'running') {
                console.warn('Audio context could not be started after user interaction. Cannot play sequence.');
                return; // Exit if audio context is still not running
            }
        }

        // Ensure all components are initialized and ready
        if (!isSynthInitializedRef.current || !synthRef.current || !loopRef.current || isLoading) { // Also check isLoading here
            console.warn('playSequencer: Audio system not fully ready or still loading. Cannot play note.');
            return;
        }

        // Generate notes right before playing to ensure the latest settings are used
        activeArpeggioNotesRef.current = generateArpeggioNotes();
        if (activeArpeggioNotesRef.current.length === 0) {
            console.warn('No notes selected for arpeggio. Cannot play.');
            return;
        }

        try {
            currentStepRef.current = 0;
            setCurrentStep(0);

            if (Tone.Transport.state !== 'started') {
                Tone.Transport.start();
            }
            loopRef.current.start(0);
            setIsPlaying(true); // Update state
            console.log('Sequencer started successfully.');
        } catch (e) {
            console.error("Error starting sequencer:", e);
            setIsPlaying(false);
        }
    }, [isPlaying, startGlobalAudio, generateArpeggioNotes, isLoading, isSynthInitializedRef.current]);


    return {
        isPlaying,
        playSequencer,
        stopSequencer,
        isAudioReady,
        isLoading,
        bpm, setBpm,
        stepSubdivision, setStepSubdivision,
        allNotes: allNotes.current,
        selectedNotes, setSelectedNotes,
        baseOctave, setBaseOctave,
        octaveRange, setOctaveRange,
        arpeggioPattern, setArpeggioPattern,
        currentStep, // For UI visualization
        totalArpeggioNotesCount: activeArpeggioNotesRef.current.length, // For progress bar/step count
    };
};
// --- End useArpeggiatorSequencer Hook ---


// --- ParameterSlider Component (reused) ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '', isDisabled, colorClass = 'accent-cyan-600 bg-cyan-100' }) => (
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
            disabled={isDisabled} // Now correctly uses the isDisabled prop
        />
        <p className="text-gray-700 text-sm mt-1 italic text-center px-2">{explanation}</p>
    </div>
);
// --- End ParameterSlider Component ---


// --- ArpeggiatorSequencerContent (Main UI Logic) ---
const ArpeggiatorSequencerContent = () => {
    const {
        isPlaying, playSequencer, stopSequencer,
        isAudioReady, isLoading,
        bpm, setBpm,
        stepSubdivision, setStepSubdivision,
        allNotes,
        selectedNotes, setSelectedNotes,
        baseOctave, setBaseOctave,
        octaveRange, setOctaveRange,
        arpeggioPattern, setArpeggioPattern,
        currentStep,
        totalArpeggioNotesCount,
    } = useArpeggiatorSequencer();

    const getExplanation = (param) => {
        switch (param) {
            case 'bpm': return "Tempo (beats per minute)";
            case 'octaveRange': return "Number of octaves spanned";
            case 'baseOctave': return "Starting octave";
            case 'stepSubdivision': return "Rhythmic value of each note";
            default: return "Create melodic patterns!";
        }
    };

    const toggleNoteSelection = (note) => {
        setSelectedNotes(prev =>
            prev.includes(note) ? prev.filter(n => n !== note) : [...prev, note]
        );
    };

    const patternOptions = [
        { key: 'up', label: 'Up', Icon: ArrowUp },
        { key: 'down', label: 'Down', Icon: ArrowDown },
        { key: 'upDown', label: 'Up/Down', Icon: Repeat },
        { key: 'random', label: 'Rand', Icon: Shuffle },
    ];

    const subdivisionOptions = [
        { value: '4n', label: '1/4' },
        { value: '8n', label: '1/8' },
        { value: '16n', label: '1/16' },
        { value: '32n', label: '1/32' },
    ];

    return (
        <>

            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
                pageId="arpeggiator-sequencer" 
                tool={arpeggiatorTool}
                customData={{}}
            />

            <div
                className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 md:p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #e0ffff 0%, #ccf5ff 50%, #99ebff 100%)',
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                {/* Floating Icons Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%2320c997' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                        backgroundSize: '200px 200px'
                    }}
                ></div>

                <div className="text-center mb-4 sm:mb-6 md:mb-10 z-10 w-full max-w-5xl">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-cyan-900 drop-shadow-lg mb-2 sm:mb-4 leading-tight">
                        Arpeggiator
                    </h1>
                    
                    {/* Status Messages */}
                    <div className="min-h-[1.5rem] flex items-center justify-center">
                        {isLoading && (
                            <p className="text-cyan-700 text-sm sm:text-base animate-pulse">
                                Setting up audio...
                            </p>
                        )}
                        {!isLoading && !isAudioReady && (
                            <p className="text-cyan-700 text-sm sm:text-base">
                                Click "Play" to activate audio
                            </p>
                        )}
                        {!isLoading && isAudioReady && (
                            <p className="text-cyan-600 text-sm sm:text-base font-medium">
                                🎼 Ready! Select notes and play
                            </p>
                        )}
                    </div>
                </div>

                <div className="bg-white/90 backdrop-blur-md p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col items-center space-y-4 sm:space-y-6 md:space-y-8 z-10 border border-cyan-200/50 mx-2">

                    {/* Play and Stop Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md">
                        <button
                            type="button"
                            onClick={playSequencer}
                            className={`px-6 py-4 sm:px-8 sm:py-5 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 transition-all duration-300 w-full shadow-lg hover:shadow-xl
                                    ${!isPlaying && !isLoading && selectedNotes.length > 0
                                        ? 'bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-white hover:scale-105'
                                        : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                            disabled={isPlaying || isLoading || selectedNotes.length === 0}
                            style={{
                                WebkitTapHighlightColor: 'transparent',
                                touchAction: 'manipulation'
                            }}
                        >
                            <Play size={20} />
                            Play
                        </button>

                        <button
                            type="button"
                            onClick={stopSequencer}
                            className={`px-6 py-4 sm:px-8 sm:py-5 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 transition-all duration-300 w-full shadow-lg hover:shadow-xl
                                    ${isPlaying && isAudioReady
                                        ? 'bg-cyan-700 hover:bg-cyan-800 active:scale-95 text-white hover:scale-105'
                                        : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                            disabled={!isPlaying || !isAudioReady}
                            style={{
                                WebkitTapHighlightColor: 'transparent',
                                touchAction: 'manipulation'
                            }}
                        >
                            <Pause size={20} />
                            Stop
                        </button>
                    </div>

                    {/* Current Step Indicator */}
                    {isAudioReady && totalArpeggioNotesCount > 0 && (
                        <div className="w-full">
                            <div className="flex justify-center items-center gap-1 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto py-2 px-2">
                                {Array.from({ length: totalArpeggioNotesCount }).map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0
                                            ${currentStep === idx ? 'bg-cyan-600 text-white shadow-lg ring-2 ring-cyan-400' : 'bg-gray-200 text-gray-600'}
                                            transition-all duration-100 ease-linear
                                        `}
                                    >
                                        {idx + 1}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {isAudioReady && totalArpeggioNotesCount === 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 w-full max-w-md">
                            <p className="text-red-600 text-sm sm:text-base font-medium text-center">
                                ⚠️ Select at least one note to play
                            </p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full">
                        {/* Note Selection */}
                        <div className="bg-cyan-50/80 p-4 sm:p-6 rounded-xl border border-cyan-200 flex flex-col items-center shadow-lg">
                            <h2 className="text-xl sm:text-2xl font-bold text-cyan-800 mb-3 sm:mb-4">🎵 Notes</h2>
                            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 w-full">
                                {allNotes.map(note => (
                                    <button
                                        key={note}
                                        onClick={() => toggleNoteSelection(note)}
                                        className={`py-2 sm:py-3 px-2 sm:px-3 rounded-lg text-sm sm:text-base font-semibold transition-all duration-200 shadow-sm hover:shadow-md
                                            ${selectedNotes.includes(note)
                                                ? 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-400'
                                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:scale-95'}
                                            ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
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
                            <p className="text-gray-600 text-xs sm:text-sm mt-3 sm:mt-4 italic text-center">
                                Tap to select base notes for the arpeggio
                            </p>
                        </div>

                        {/* Arpeggio Settings */}
                        <div className="bg-cyan-50/80 p-4 sm:p-6 rounded-xl border border-cyan-200 flex flex-col shadow-lg">
                            <h2 className="text-xl sm:text-2xl font-bold text-cyan-800 mb-3 sm:mb-4 text-center">⚙️ Settings</h2>
                            
                            {/* Pattern Selection */}
                            <div className="mb-4 sm:mb-6">
                                <h3 className="text-sm sm:text-base font-semibold text-gray-700 mb-2 text-center">Pattern:</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-2">
                                    {patternOptions.map(({ key, label, Icon }) => (
                                        <button
                                            key={key}
                                            onClick={() => setArpeggioPattern(key)}
                                            className={`px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 sm:gap-2 transition-all duration-200 shadow-sm hover:shadow-md
                                                ${arpeggioPattern === key
                                                    ? 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-400'
                                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:scale-95'}
                                                ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                                            `}
                                            disabled={isLoading}
                                            style={{
                                                WebkitTapHighlightColor: 'transparent',
                                                touchAction: 'manipulation'
                                            }}
                                        >
                                            <Icon size={14} className="flex-shrink-0" />
                                            <span className="whitespace-nowrap">{label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Subdivision Selection */}
                            <div className="mb-4 sm:mb-6">
                                <h3 className="text-sm sm:text-base font-semibold text-gray-700 mb-2 text-center">Subdivision:</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {subdivisionOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => setStepSubdivision(option.value)}
                                            className={`px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md
                                                ${stepSubdivision === option.value
                                                    ? 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-400'
                                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:scale-95'}
                                                ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                                            `}
                                            disabled={isLoading}
                                            style={{
                                                WebkitTapHighlightColor: 'transparent',
                                                touchAction: 'manipulation'
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-gray-600 text-xs sm:text-sm mt-2 italic text-center">
                                    {getExplanation('stepSubdivision')}
                                </p>
                            </div>

                            {/* Sliders */}
                            <div className="space-y-4">
                                <ParameterSlider
                                    label="Base Oct" value={baseOctave} setter={setBaseOctave}
                                    min="2" max="6" step="1" unit=""
                                    explanation={getExplanation('baseOctave')}
                                    isDisabled={isLoading}
                                    colorClass="accent-cyan-600 bg-cyan-100"
                                />
                                <ParameterSlider
                                    label="Oct Range" value={octaveRange} setter={setOctaveRange}
                                    min="1" max="3" step="1" unit=""
                                    explanation={getExplanation('octaveRange')}
                                    isDisabled={isLoading}
                                    colorClass="accent-cyan-600 bg-cyan-100"
                                />
                            </div>
                        </div>
                    </div>

                    {/* BPM Slider */}
                    <div className="w-full max-w-2xl pt-4 sm:pt-6 border-t border-cyan-200">
                        <ParameterSlider
                            label="BPM" value={bpm} setter={setBpm}
                            min="60" max="240" step="5" unit=""
                            explanation={getExplanation('bpm')}
                            isDisabled={isLoading}
                            colorClass="accent-cyan-700 bg-cyan-200"
                        />
                    </div>

                    <div className="text-center text-gray-600 text-xs sm:text-sm italic max-w-md">
                        🎶 Create beautiful arpeggios from selected notes. Try different patterns and speeds for unique melodies!
                    </div>
                </div>
                
                {/* Footer spacing for mobile */}
                <div className="h-8 sm:h-4"></div>
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
        console.error("Uncaught error in ArpeggiatorSequencer:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-cyan-100 text-cyan-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Arpeggiator & Sequencer. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export
const ArpeggiatorSequencer = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <ArpeggiatorSequencerContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default ArpeggiatorSequencer;
