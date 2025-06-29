// src/contexts/AudioContext.jsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as Tone from 'tone';

// Create the AudioContext. This will be consumed by hooks/components.
export const AudioContext = createContext(null);

/**
 * AudioProvider component manages the global Tone.js AudioContext.
 * It ensures the AudioContext is started/resumed on the first user interaction
 * and provides its status to all consuming components.
 */
export const AudioProvider = ({ children }) => {
    // State to track if the global Tone.js AudioContext is running.
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);

    // Function to attempt to start/resume the Tone.js AudioContext.
    // This should be called on a user gesture (click, keydown, touch).
    const startGlobalAudio = useCallback(async () => {
        console.log("AudioContext: startGlobalAudio called. Current Tone.context.state:", Tone.context.state);
        if (Tone.context.state !== 'running') {
            try {
                await Tone.start();
                setIsAudioGloballyReady(true);
                console.log("AudioContext: Tone.js global audio context started/resumed successfully.");
            } catch (error) {
                console.error("AudioContext: Failed to start Tone.js audio context:", error);
                setIsAudioGloballyReady(false);
            }
        } else {
            console.log("AudioContext: Tone.js global audio context already running.");
            setIsAudioGloballyReady(true); // Already running
        }
    }, []);

    // Effect to monitor the Tone.js context state.
    // This catches external changes to the context state (e.g., browser suspending it).
    useEffect(() => {
        const checkContextState = () => {
            const currentState = Tone.context.state;
            const newReadyState = currentState === 'running';
            console.log(`AudioContext: Tone.context state changed to '${currentState}'. isAudioGloballyReady set to ${newReadyState}.`);
            setIsAudioGloballyReady(newReadyState);
        };

        // Initial check
        checkContextState();

        // Listen for context state changes
        Tone.context.on("statechange", checkContextState);

        // Cleanup: remove event listener
        return () => {
            console.log("AudioContext: Cleaning up Tone.context statechange listener.");
            Tone.context.off("statechange", checkContextState);
        };
    }, []);

    // The value provided to components that consume this context.
    const contextValue = {
        isAudioGloballyReady,
        startGlobalAudio,
    };

    console.log("AudioContext: Rendering AudioProvider. isAudioGloballyReady:", isAudioGloballyReady);

    return (
        <AudioContext.Provider value={contextValue}>
            {children}
        </AudioContext.Provider>
    );
};