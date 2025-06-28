// src/hooks/usePianoSynth.js
import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import * as Tone from 'tone';
import { AudioContext } from '../contexts/AudioContext'; // Import the global AudioContext

/**
 * A custom React hook to manage a Tone.js PolySynth instance for piano sounds.
 * This hook encapsulates the audio initialization, note playing/stopping,
 * and global volume/mute state for the synthesizer, making it reusable.
 *
 * @param {number} initialVolume - The initial volume for the synth (0.0 to 1.0).
 * @param {boolean} initialMuteState - The initial mute state for the synth.
 * @returns {object} An object containing synth-related state and functions.
 */
const usePianoSynth = (initialVolume = 0.7, initialMuteState = false) => {
    // Get global audio readiness and start function from context
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);

    // useRef to hold the Tone.js PolySynth instance.
    const synthRef = useRef(null);

    // State for the synth's mute status.
    const [isSynthMuted, setIsSynthMuted] = useState(initialMuteState);
    // State for the synth's volume, mapping to the UI slider.
    const [synthVolume, setSynthVolume] = useState(initialVolume);

    /**
     * Creates the Tone.PolySynth instance. This function specifically handles
     * the creation of the synthesizer object.
     */
    const createSynth = useCallback(() => {
        // Prevent re-creation if the synth object already exists.
        if (synthRef.current) return;

        try {
            // Create the PolySynth with specified oscillator and envelope.
            synthRef.current = new Tone.PolySynth(Tone.Synth, {
                oscillator: {
                    partials: [1, 0, 2, 0, 3] // Custom harmonics for a piano-like sound
                },
                envelope: {
                    attack: 0.006,       // Fast attack for percussive sound
                    decay: 4,            // Longer decay
                    sustain: 0.04,       // Low sustain
                    release: 1.2,        // Moderate release
                    attackCurve: "exponential" // Natural attack curve
                }
            }).toDestination(); // Connect the synth directly to the audio output

            // Set the initial volume and mute state for the newly created synth.
            synthRef.current.volume.value = isSynthMuted ? -Infinity : Tone.gainToDb(synthVolume);
            console.log("Tone.js PolySynth object created.");
        } catch (error) {
            console.error('Failed to create Tone.js synth object:', error);
        }
    }, [isSynthMuted, synthVolume]); // Dependencies for useCallback.

    // Effect hook to create the synth object when global audio is ready.
    useEffect(() => {
        if (isAudioGloballyReady && !synthRef.current) {
            createSynth();
        }
    }, [isAudioGloballyReady, createSynth]);

    // Effect hook to update the synthesizer's volume and mute state
    useEffect(() => {
        if (synthRef.current) {
            synthRef.current.volume.value = isSynthMuted ? -Infinity : Tone.gainToDb(synthVolume);
        }
    }, [synthVolume, isSynthMuted]);

    // Cleanup effect: Dispose of the Tone.js synthesizer instance when component unmounts.
    useEffect(() => {
        return () => {
            if (synthRef.current) {
                synthRef.current.dispose();
                synthRef.current = null; // Clear the ref
                console.log("Tone.js synth disposed.");
            }
        };
    }, []);

    /**
     * Plays a specific musical note on the synthesizer.
     * It will trigger the global audio context to start if not already running.
     * @param {string} note - The musical note to play (e.g., 'C4', 'G#3').
     */
    const playNote = useCallback((note) => {
        // Always try to start the global audio context on a user gesture.
        // The startGlobalAudio function handles the Tone.start() call.
        startGlobalAudio();

        // Play the note only if the synth object exists and is not muted.
        if (synthRef.current && !isSynthMuted) {
            synthRef.current.triggerAttack(note);
        } else {
            // Log a warning if audio isn't fully ready but a play action occurred.
            // This might happen if the synth object hasn't been created yet despite context being active.
            if (!isSynthMuted) {
                console.warn("Attempted to play note, but synth object not fully ready or muted.");
            }
        }
    }, [isSynthMuted, startGlobalAudio]);

    /**
     * Stops a specific musical note on the synthesizer, triggering its release phase.
     * @param {string} note - The musical note to stop.
     */
    const stopNote = useCallback((note) => {
        if (synthRef.current) {
            synthRef.current.triggerRelease(note);
        }
    }, []);

    /**
     * Releases all currently held notes on the synthesizer.
     */
    const releaseAllNotes = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.releaseAll();
        }
    }, []);

    /**
     * Toggles the mute state of the synthesizer.
     */
    const toggleMute = useCallback(() => {
        setIsSynthMuted(prev => !prev);
    }, []);

    // isAudioReady now truly reflects if both Tone.js context is running and the synth object is created
    const isAudioReady = isAudioGloballyReady && !!synthRef.current;

    return {
        playNote,
        stopNote,
        releaseAllNotes,
        isAudioReady, // Exposed for UI to know when it's fully ready for interaction.
        isSynthMuted,
        toggleMute,
        synthVolume,
        setSynthVolume
    };
};

export default usePianoSynth;