import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Circle, Square, Triangle, Activity, Waves, Music3, Minus, Plus } from 'lucide-react'; // Icons for play/pause, waveform types, general waves, and music/intervals
import SEOHead from './SEOHead';

// Define the tool object for SEO structured data
const consonanceDissonanceTool = {
    id: 'consonance-dissonance',
    name: 'Consonance & Dissonance',
    description: 'Explore harmonic relationships and tension between consonant and dissonant intervals.',
    path: '/consonance-dissonance',
    categories: [
        'Music Theory',
        'Harmony',
        'Interval Relationships',
        'Tension',
        'Acoustics'
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
            // Tone.start() handles resuming a suspended context or initializing a new one.
            await Tone.start();

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
            if (newState !== isAudioGloballyReady) {
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


// --- useConsonanceDissonanceSynth Hook ---
// This custom hook manages two Tone.js oscillators, their mixing, and interval logic.
const useConsonanceDissonanceSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const mainOscRef = useRef(null); // Main audible oscillator
    const intervalOscRef = useRef(null); // Second oscillator, frequency based on interval
    const mainGainRef = useRef(null); // Gain node for main oscillator
    const intervalGainRef = useRef(null); // Gain node for interval oscillator
    const masterGainRef = useRef(null); // Master gain for overall volume
    const waveformAnalyzerRef = useRef(null); // Will hold the Tone.Waveform analyzer for combined output
    const isSynthInitializedRef = useRef(false); // Flag to ensure single initialization

    const [isPlaying, setIsPlaying] = useState(false); // Indicates if the sound is currently playing

    // Main Oscillator States
    const [mainOscType, setMainOscType] = useState('sine');
    const [mainOscFrequency, setMainOscFrequency] = useState(220); // A3 by default
    const [mainOscVolume, setMainOscVolume] = useState(-10); // in dB

    // Interval Oscillator States
    const [intervalOscType, setIntervalOscType] = useState('sine');
    const [selectedInterval, setSelectedInterval] = useState('unison'); // Key for the selected interval ratio
    const [intervalOscVolume, setIntervalOscVolume] = useState(-10); // in dB

    // Master Volume
    const [masterVolume, setMasterVolume] = useState(-5); // Master volume in dB

    const [isAudioReady, setIsAudioReady] = useState(false); // True when context is running AND synth initialized
    const [isLoading, setIsLoading] = useState(true); // Indicates if audio setup is in progress, initially true

    // Define musical interval ratios with a type (consonant/dissonant) for visual indication
    const intervalInfo = useRef({
        'unison': { ratio: 1 / 1, type: 'consonant' },
        'minor_second': { ratio: 16 / 15, type: 'dissonant' },
        'major_second': { ratio: 9 / 8, type: 'dissonant' },
        'minor_third': { ratio: 6 / 5, type: 'consonant' },
        'major_third': { ratio: 5 / 4, type: 'consonant' },
        'perfect_fourth': { ratio: 4 / 3, type: 'consonant' },
        'tritone': { ratio: 45 / 32, type: 'dissonant' }, // Highly dissonant
        'perfect_fifth': { ratio: 3 / 2, type: 'consonant' },
        'minor_sixth': { ratio: 8 / 5, type: 'consonant' },
        'major_sixth': { ratio: 5 / 3, type: 'consonant' },
        'octave': { ratio: 2 / 1, type: 'consonant' },
    });

    // Function to calculate the frequency of the interval oscillator
    const getIntervalFrequency = useCallback(() => {
        const ratio = intervalInfo.current[selectedInterval]?.ratio || 1; // Use intervalInfo.current
        return mainOscFrequency * ratio;
    }, [mainOscFrequency, selectedInterval]);

    // Function to dispose all Tone.js nodes created by this hook
    const disposeAudioNodes = useCallback(() => {
        console.log('useConsonanceDissonanceSynth: disposeAudioNodes called.');
        if (mainOscRef.current) mainOscRef.current.dispose();
        if (intervalOscRef.current) intervalOscRef.current.dispose();
        if (mainGainRef.current) mainGainRef.current.dispose();
        if (intervalGainRef.current) intervalGainRef.current.dispose();
        if (masterGainRef.current) masterGainRef.current.dispose();
        if (waveformAnalyzerRef.current) waveformAnalyzerRef.current.dispose();

        mainOscRef.current = null;
        intervalOscRef.current = null;
        mainGainRef.current = null;
        intervalGainRef.current = null;
        masterGainRef.current = null;
        waveformAnalyzerRef.current = null;

        setIsPlaying(false);
        setIsAudioReady(false);
        isSynthInitializedRef.current = false;
        console.log('useConsonanceDissonanceSynth: Audio nodes disposed.');
    }, []);

    // Effect to initialize Tone.js components once on mount
    useEffect(() => {
        const setupAudio = async () => {
            if (isSynthInitializedRef.current) {
                console.log('useConsonanceDissonanceSynth: Audio setup already completed, skipping.');
                setIsLoading(false); // Ensure loading is false if already set up
                return;
            }

            console.log('useConsonanceDissonanceSynth: Setting up Tone.js components...');
            setIsLoading(true);

            try {
                disposeAudioNodes(); // Ensure a clean slate

                // Create main oscillator
                const mainOsc = new Tone.Oscillator({ type: mainOscType, frequency: mainOscFrequency }); // Do not start here
                // Create interval oscillator
                const intervalOsc = new Tone.Oscillator({ type: intervalOscType, frequency: getIntervalFrequency() }); // Do not start here

                // Create gain nodes for individual volume control
                const mainGain = new Tone.Gain(Tone.dbToGain(mainOscVolume));
                const intervalGain = new Tone.Gain(Tone.dbToGain(intervalOscVolume));

                // Create a master gain node for overall volume
                const masterGain = new Tone.Gain(Tone.dbToGain(masterVolume));

                // Create a Waveform analyzer for the combined output
                const waveform = new Tone.Waveform(4096); // High resolution for smoother visualization

                // Connect the signal flow: Osc -> Individual Gain -> Master Gain -> Analyzer -> Destination
                mainOsc.connect(mainGain);
                intervalOsc.connect(intervalGain);

                mainGain.connect(masterGain);
                intervalGain.connect(masterGain); // Both individual gains feed into the master gain

                masterGain.connect(waveform); // Analyzer takes input from master gain
                masterGain.toDestination(); // Master gain connects to speakers

                mainOscRef.current = mainOsc;
                intervalOscRef.current = intervalOsc;
                mainGainRef.current = mainGain;
                intervalGainRef.current = intervalGain;
                masterGainRef.current = masterGain;
                waveformAnalyzerRef.current = waveform;
                isSynthInitializedRef.current = true;
                console.log('useConsonanceDissonanceSynth: Tone.js components created and connected.');

                // Oscillators will be started by playNote

            } catch (error) {
                console.error("useConsonanceDissonanceSynth: Error during initial Tone.js setup:", error);
                setIsAudioReady(false);
                isSynthInitializedRef.current = false;
                disposeAudioNodes();
            } finally {
                setIsLoading(false);
            }
        };

        setupAudio();

        return () => {
            console.log('useConsonanceDissonanceSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, []); // Empty dependency array: runs only once on mount


    // Effect to update isAudioReady based on global audio and synth initialization status
    useEffect(() => {
        const currentAudioReady = isAudioGloballyReady && isSynthInitializedRef.current;
        if (currentAudioReady !== isAudioReady) { // Prevent unnecessary state updates
            setIsAudioReady(currentAudioReady);
            console.log(`useConsonanceDissonanceSynth: isAudioGloballyReady: ${isAudioGloballyReady}, isSynthInitialized: ${isSynthInitializedRef.current} => isAudioReady: ${currentAudioReady}`);
        }
    }, [isAudioGloballyReady, isSynthInitializedRef.current]); // Removed isAudioReady from here as it's set in this effect

    // Effects to update oscillator and gain parameters when their states change
    useEffect(() => {
        // Only update if synth is initialized, regardless of audio context state
        if (mainOscRef.current && mainGainRef.current && isSynthInitializedRef.current) {
            mainOscRef.current.type = mainOscType;
            mainOscRef.current.frequency.value = mainOscFrequency;
            mainGainRef.current.gain.value = Tone.dbToGain(mainOscVolume);
            console.log(`Main Wave Updated: Type=${mainOscType}, Freq=${mainOscFrequency}, Vol=${mainOscVolume}`);
        }
    }, [mainOscType, mainOscFrequency, mainOscVolume, isSynthInitializedRef.current]); // Added isSynthInitializedRef.current

    useEffect(() => {
        // Only update if synth is initialized, regardless of audio context state
        if (intervalOscRef.current && intervalGainRef.current && isSynthInitializedRef.current) {
            intervalOscRef.current.type = intervalOscType;
            intervalOscRef.current.frequency.value = getIntervalFrequency(); // Recalculate based on main freq and interval
            intervalGainRef.current.gain.value = Tone.dbToGain(intervalOscVolume);
            console.log(`Interval Wave Updated: Type=${intervalOscType}, Interval=${selectedInterval}, Freq=${getIntervalFrequency()}, Vol=${intervalOscVolume}`);
        }
    }, [intervalOscType, selectedInterval, intervalOscVolume, mainOscFrequency, getIntervalFrequency, isSynthInitializedRef.current]); // Added isSynthInitializedRef.current

    useEffect(() => {
        // Only update if synth is initialized, regardless of audio context state
        if (masterGainRef.current && isSynthInitializedRef.current) {
            masterGainRef.current.gain.value = Tone.dbToGain(masterVolume);
            console.log(`Master Volume Updated: ${masterVolume}`);
        }
    }, [masterVolume, isSynthInitializedRef.current]); // Added isSynthInitializedRef.current


    // Function to start playing the combined sound
    const playNote = useCallback(async () => {
        console.log('playNote called. isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady, 'isLoading:', isLoading);

        // First, ensure the global audio context is running due to user interaction
        if (Tone.context.state !== 'running') {
            console.log('playNote: AudioContext is suspended, attempting to start global audio...');
            await startGlobalAudio(); // This will attempt to resume context on user click
            if (Tone.context.state !== 'running') {
                console.warn('Audio context could not be started after user interaction. Cannot play note.');
                return; // Exit if audio context is still not running
            }
        }

        // Ensure all components are initialized and ready
        if (!isSynthInitializedRef.current || !mainOscRef.current || !intervalOscRef.current || isLoading) { // Also check isLoading here
            console.warn('playNote: Audio system not fully ready or still loading. Cannot play note.');
            return;
        }

        if (isPlaying) {
            console.log('Sound is already playing, ignoring playNote call.');
            return;
        }

        try {
            // Start both oscillators. They are connected to gains so their volume is controlled.
            // Check if they are already started to prevent error
            if (mainOscRef.current.state !== 'started') {
                 mainOscRef.current.start();
            }
            if (intervalOscRef.current.state !== 'started') {
                 intervalOscRef.current.start();
            }
            setIsPlaying(true);
            console.log('playNote: Oscillators started.');
        } catch (e) {
            console.error("Error starting oscillators:", e);
            setIsPlaying(false);
        }
    }, [isPlaying, isAudioReady, startGlobalAudio, isLoading]);

    // Function to stop playing the combined sound
    const stopNote = useCallback(() => {
        if (mainOscRef.current && intervalOscRef.current && isPlaying) {
            // Stop them only if they are currently playing
            if (mainOscRef.current.state === 'started') {
                mainOscRef.current.stop();
            }
            if (intervalOscRef.current.state === 'started') {
                intervalOscRef.current.stop();
            }
            setIsPlaying(false);
            console.log('stopNote: Oscillators stopped.');
        } else {
            console.warn('stopNote: Cannot stop note. Oscillators not playing or not initialized.');
        }
    }, [isPlaying]);

    return {
        isPlaying,
        playNote,
        stopNote,
        isAudioReady,
        isLoading,
        mainOscType, setMainOscType, mainOscFrequency, setMainOscFrequency, mainOscVolume, setMainOscVolume,
        intervalOscType, setIntervalOscType, selectedInterval, setSelectedInterval, intervalOscVolume, setIntervalOscVolume,
        masterVolume, setMasterVolume,
        waveformAnalyzer: waveformAnalyzerRef.current, // Expose the analyzer for visualization
        intervalInfo: intervalInfo.current, // Expose interval info for UI display
    };
};
// --- End useConsonanceDissonanceSynth Hook ---


// --- ParameterSlider Component (reused) ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '', isDisabled, colorClass = 'accent-orange-600 bg-orange-100' }) => (
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


// --- WaveformVisualizer Component (reused) ---
// This component draws the waveform data on a canvas.
const WaveformVisualizer = ({ waveformAnalyzer, isAudioReady, isPlaying }) => {
    const canvasRef = useRef(null);
    const animationFrameId = useRef(null); // For requestAnimationFrame cleanup

    // START OF CHANGES IN drawWaveform FUNCTION
    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        // This initial check for readiness is now less critical here because `animate` controls when `drawWaveform` is called.
        if (!canvas || !waveformAnalyzer || !isAudioReady) {
            // Removed the requestAnimationFrame from here. The `animate` function will handle continuous drawing.
            return;
        }

        const ctx = canvas.getContext('2d');
        const bufferLength = waveformAnalyzer.getValue().length;
        const dataArray = waveformAnalyzer.getValue();

        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawing

        // Get the device pixel ratio (DPR)
        const dpr = window.devicePixelRatio || 1;

        // Reset the transformation matrix and apply DPR scaling.
        // This ensures all subsequent drawing operations are scaled correctly for the display.
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Adjust line width by DPR so it appears the same thickness regardless of screen density.
        ctx.lineWidth = 2 / dpr;
        ctx.strokeStyle = '#8b5cf6'; // Purple color for the waveform
        ctx.beginPath();

        // Use canvas's *CSS* dimensions (offsetWidth/offsetHeight) for drawing calculations.
        // `setTransform` handles the conversion to physical pixels.
        const displayWidth = canvas.offsetWidth;
        const displayHeight = canvas.offsetHeight;

        const sliceWidth = displayWidth * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i]; // Value is between -1 and 1
            // Scale 'v' to fit the canvas height, mapping -1 to 0 (top) and 1 to displayHeight (bottom).
            // This centers the waveform vertically if data is symmetrical around 0.
            const y = (v + 1) / 2 * displayHeight; 

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        // Ensure it reaches the end of the visible waveform area.
        if (bufferLength > 0) {
             ctx.lineTo(displayWidth, (dataArray[bufferLength - 1] + 1) / 2 * displayHeight);
        }
        ctx.stroke();

        // Removed the `requestAnimationFrame` call from here. The `animate` function now manages the loop.
    }, [waveformAnalyzer, isAudioReady]);
    // END OF CHANGES IN drawWaveform FUNCTION


    // NEW: Helper function to manage the requestAnimationFrame loop.
    // This provides a cleaner way to start/stop the animation from useEffect.
    const animate = useCallback(() => {
        if (!isPlaying || !isAudioReady || !waveformAnalyzer) {
            // If conditions are not met, ensure the animation loop is stopped.
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
            return;
        }
        drawWaveform(); // Call the drawing function for the current frame.
        animationFrameId.current = requestAnimationFrame(animate); // Request the next frame.
    }, [isPlaying, isAudioReady, waveformAnalyzer, drawWaveform]);


    // START OF CHANGES IN useEffect HOOK
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            const parent = canvas.parentElement; // Get the parent element to determine its rendered size.
            if (!parent) return; // Defensive check.

            const newWidth = parent.offsetWidth;
            const newHeight = parent.offsetHeight;

            // Defensive check for zero dimensions. If the parent is hidden or has no size, skip resizing.
            if (newWidth === 0 || newHeight === 0) {
                console.warn("Canvas parent has zero dimensions, skipping resize and redraw.");
                return;
            }

            // Set the canvas's internal drawing buffer size (its "resolution") to match physical pixels.
            canvas.width = newWidth * dpr;
            canvas.height = newHeight * dpr;
            // IMPORTANT: Removed `ctx.scale(dpr, dpr);` from here. The `setTransform` in `drawWaveform` now handles this for each frame.
            drawWaveform(); // Redraw immediately after the canvas is resized.
        };

        // Replaced `window.addEventListener('resize')` with `ResizeObserver`.
        // This is more efficient and accurate as it only triggers when the *observed element's* size changes.
        const observer = new ResizeObserver(() => {
            resizeCanvas();
        });
        observer.observe(canvas.parentElement); // Observe the parent div that dictates the canvas's size.

        resizeCanvas(); // Perform an initial resize and draw when the component mounts.

        // Manage the animation loop: start it if conditions are met, stop it otherwise.
        if (isPlaying && isAudioReady && waveformAnalyzer) {
            if (!animationFrameId.current) { // Only start the loop if it's not already running.
                animate(); // Start the animation loop using the new `animate` function.
            }
        } else {
            if (animationFrameId.current) { // Only stop if the loop is currently running.
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
            // When audio is stopped or not ready, ensure the canvas is cleared to prevent stale drawings.
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the entire physical canvas.
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset the context transform to default for clean clearing.
        }

        // Cleanup function: runs when the component unmounts or dependencies of this effect change.
        return () => {
            observer.disconnect(); // Stop observing the parent element.
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current); // Cancel any pending animation frames.
                animationFrameId.current = null;
            }
        };
    }, [drawWaveform, isPlaying, isAudioReady, waveformAnalyzer, animate]); // Added `animate` to dependencies.
    // END OF CHANGES IN useEffect HOOK

    return (
        <div className="w-full h-48 bg-gray-900 rounded-lg overflow-hidden border border-purple-300 shadow-inner flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full"></canvas>
            {!isAudioReady && <p className="absolute text-gray-400 text-lg">Waiting for audio...</p>}
            {isAudioReady && !isPlaying && <p className="absolute text-gray-400 text-lg">Press Play to see waveform</p>}
        </div>
    );
};
// --- End WaveformVisualizer Component ---


// --- ConsonanceDissonanceContent (Main UI Logic) ---
const ConsonanceDissonanceContent = () => {
    const {
        isPlaying, playNote, stopNote,
        isAudioReady, isLoading,
        mainOscType, setMainOscType, mainOscFrequency, setMainOscFrequency, mainOscVolume, setMainOscVolume,
        intervalOscType, setIntervalOscType, selectedInterval, setSelectedInterval, intervalOscVolume, setIntervalOscVolume,
        masterVolume, setMasterVolume,
        waveformAnalyzer,
        intervalInfo,
    } = useConsonanceDissonanceSynth();

    const getExplanation = (param) => {
        switch (param) {
            case 'mainOscFrequency': return "Base pitch (Hz) of first sound";
            case 'mainOscVolume': return "Loudness (dB) of first sound";
            case 'intervalOscVolume': return "Loudness (dB) of second sound";
            case 'masterVolume': return "Overall loudness of combined sound";
            default: return "Explore how intervals sound together!";
        }
    };

    const waveformOptions = [
        { type: 'sine', label: 'Sine', Icon: Circle },
        { type: 'square', label: 'Square', Icon: Square },
        { type: 'sawtooth', label: 'Saw', Icon: Activity },
        { type: 'triangle', label: 'Tri', Icon: Triangle },
    ];

    const formatIntervalLabel = (key) => {
        return key.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <>
            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
                pageId="consonance-dissonance" 
                tool={consonanceDissonanceTool}
                customData={{}}
            />

            <div
                className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #fffbe6 0%, #fff0b3 50%, #ffe380 100%)',
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                {/* Floating Icons Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%23fbbf24' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                        backgroundSize: '200px 200px'
                    }}
                ></div>

                <div className="text-center mb-6 md:mb-10 z-10 w-full px-2">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                        <Music3 size={36} className="text-orange-700 md:mb-0 mb-2" />
                        <h1 className="text-3xl md:text-5xl font-extrabold text-orange-900 drop-shadow-lg">
                            Interval Explorer
                        </h1>
                    </div>
                    {isLoading && (
                        <p className="text-orange-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                            Setting up audio engine...
                        </p>
                    )}
                    {!isLoading && !isAudioReady && (
                        <p className="text-orange-700 text-xs md:text-sm mt-2 md:mt-4">
                            Click "Play" to activate audio.
                        </p>
                    )}
                    {!isLoading && isAudioReady && (
                        <p className="text-orange-600 text-xs md:text-sm mt-2 md:mt-4">
                            Ready. Choose waves and interval to play!
                        </p>
                    )}
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-xl shadow-lg w-full max-w-5xl flex flex-col items-center space-y-4 md:space-y-8 z-10 border border-orange-200 mx-2">

                    {/* Play and Stop Sound Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-4 md:mb-6 w-full">
                        <button
                            type="button"
                            onClick={playNote}
                            className={`px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 w-full
                                    ${!isPlaying && !isLoading
                                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                        : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                            disabled={isPlaying || isLoading} // Allow click to activate audio context if not playing or loading
                        >
                            <Play size={20} />
                            Play
                        </button>

                        <button
                            type="button"
                            onClick={stopNote}
                            className={`px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 w-full
                                    ${isPlaying && isAudioReady
                                        ? 'bg-orange-700 hover:bg-orange-800 text-white'
                                        : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                            disabled={!isPlaying || !isAudioReady}
                        >
                            <Pause size={20} />
                            Stop
                        </button>
                    </div>

                    {/* Waveform Visualizer */}
                    <div className="w-full px-2">
                        <WaveformVisualizer
                            waveformAnalyzer={waveformAnalyzer}
                            isAudioReady={isAudioReady}
                            isPlaying={isPlaying}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-8 w-full mt-4 md:mt-6">
                        {/* Main Wave Controls */}
                        <div className="bg-orange-50/70 p-4 md:p-6 rounded-lg border border-orange-100 flex flex-col items-center shadow-inner">
                            <h2 className="text-xl md:text-2xl font-bold text-orange-800 mb-3 md:mb-4">Main Wave</h2>
                            <div className="flex justify-center gap-1 md:gap-2 mb-4 md:mb-6 flex-wrap">
                                {waveformOptions.map(({ type, label, Icon }) => (
                                    <button
                                        key={`main-${type}`}
                                        onClick={() => setMainOscType(type)}
                                        className={`px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1 transition-all duration-200
                                            ${mainOscType === type
                                                ? 'bg-orange-600 text-white shadow-md'
                                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                                            ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                                        `}
                                        disabled={isLoading} // Disabled only during initial loading
                                    >
                                        <Icon size={14} className="flex-shrink-0" />
                                        <span className="whitespace-nowrap">{label}</span>
                                    </button>
                                ))}
                            </div>
                            <ParameterSlider
                                label="Freq" value={mainOscFrequency} setter={setMainOscFrequency}
                                min="100" max="800" step="1" unit=" Hz"
                                explanation={getExplanation('mainOscFrequency')}
                                isDisabled={isLoading} // Pass isLoading to control disabled state
                                colorClass="accent-orange-600 bg-orange-100"
                            />
                            <ParameterSlider
                                label="Vol" value={mainOscVolume} setter={setMainOscVolume}
                                min="-40" max="-5" step="1" unit=" dB"
                                explanation={getExplanation('mainOscVolume')}
                                isDisabled={isLoading} // Pass isLoading to control disabled state
                                colorClass="accent-orange-600 bg-orange-100"
                            />
                        </div>

                        {/* Interval Wave Controls */}
                        <div className="bg-orange-50/70 p-4 md:p-6 rounded-lg border border-orange-100 flex flex-col items-center shadow-inner">
                            <h2 className="text-xl md:text-2xl font-bold text-orange-800 mb-3 md:mb-4">Interval Wave</h2>
                            <div className="flex justify-center gap-1 md:gap-2 mb-4 md:mb-6 flex-wrap">
                                {waveformOptions.map(({ type, label, Icon }) => (
                                    <button
                                        key={`interval-${type}`}
                                        onClick={() => setIntervalOscType(type)}
                                        className={`px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1 transition-all duration-200
                                            ${intervalOscType === type
                                                ? 'bg-orange-600 text-white shadow-md'
                                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                                            ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                                        `}
                                        disabled={isLoading} // Disabled only during initial loading
                                    >
                                        <Icon size={14} className="flex-shrink-0" />
                                        <span className="whitespace-nowrap">{label}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="w-full flex flex-col items-center mb-4 md:mb-6">
                                <label className="text-gray-800 font-medium mb-2 text-center">Interval:</label>
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    {Object.entries(intervalInfo).map(([key, info]) => (
                                        <button
                                            key={key}
                                            onClick={() => setSelectedInterval(key)}
                                            className={`px-2 py-1.5 rounded-lg text-xs md:text-sm transition-all duration-200 flex items-center justify-center gap-1.5
                                                ${selectedInterval === key
                                                    ? 'bg-orange-600 text-white font-bold shadow-md'
                                                    : 'bg-orange-100 text-orange-800 hover:bg-orange-200'}
                                                ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                                            `}
                                            disabled={isLoading} // Disabled only during initial loading
                                        >
                                            <span className={`w-2.5 h-2.5 rounded-full ${info.type === 'consonant' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                            {formatIntervalLabel(key)}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-gray-700 text-xs md:text-sm mt-1 italic text-center px-2">
                                    Musical relationship between waves
                                </p>
                            </div>
                            <ParameterSlider
                                label="Vol" value={intervalOscVolume} setter={setIntervalOscVolume}
                                min="-40" max="-5" step="1" unit=" dB"
                                explanation={getExplanation('intervalOscVolume')}
                                isDisabled={isLoading} // Pass isLoading to control disabled state
                                colorClass="accent-orange-600 bg-orange-100"
                            />
                        </div>
                    </div>

                    {/* Legend for Consonance/Dissonance */}
                    <div className="w-full mt-4 md:mt-6 pt-4 md:pt-6 border-t border-orange-200 text-center">
                        <h3 className="text-lg md:text-xl font-bold text-orange-800 mb-3 md:mb-4">Legend</h3>
                        <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-8 text-gray-700 text-sm md:text-base">
                            <div className="flex items-center justify-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                <span>Consonant (Harmonious)</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                <span>Dissonant (Clashing)</span>
                            </div>
                        </div>
                    </div>

                    {/* Master Volume Slider */}
                    <div className="w-full mt-4 md:mt-6 pt-4 md:pt-6 border-t border-orange-200 px-2">
                        <ParameterSlider
                            label="Master Vol" value={masterVolume} setter={setMasterVolume}
                            min="-40" max="0" step="1" unit=" dB"
                            explanation={getExplanation('masterVolume')}
                            isDisabled={isLoading} // Pass isLoading to control disabled state
                            colorClass="accent-orange-700 bg-orange-200"
                        />
                    </div>

                    <div className="text-center text-gray-700 text-xs md:text-sm mt-4 md:mt-6 italic px-2">
                        Explore harmonious (consonant) and clashing (dissonant) intervals by combining two waveforms.
                    </div>
                </div>
            </div>
        </>
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
        console.error("Uncaught error in ConsonanceDissonance:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-orange-100 text-orange-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Consonance & Dissonance Explorer. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export wrapping the main content with AudioContextProvider and ErrorBoundary
const ConsonanceDissonance = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <ConsonanceDissonanceContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default ConsonanceDissonance;
