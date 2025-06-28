import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Circle, Square, Triangle, Activity, Volume2, Waves, Repeat } from 'lucide-react'; // Icons for play/pause, waveform types, volume, general waves, and LFO repeat

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
    }, [isAudioGloballyReady]); // Added isAudioGloballyReady to dependencies to prevent stale closure issues with handleToneContextChange

    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, startGlobalAudio }}>
            {children}
        </AudioContext.Provider>
    );
};
// --- END AUDIO CONTEXT ---


// --- useLFOModulationSynth Hook ---
// This custom hook encapsulates the Tone.js main oscillator, LFO, and modulation logic.
const useLFOModulationSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const mainOscRef = useRef(null); // Main audible oscillator
    const tremoloRef = useRef(null); // Tone.Tremolo effect for LFO-based amplitude modulation
    const waveformAnalyzerRef = useRef(null); // Will hold the Tone.Waveform analyzer for combined output
    const isSynthInitializedRef = useRef(false); // Flag to ensure single initialization

    const [isPlaying, setIsPlaying] = useState(false); // Indicates if the sound is currently playing

    // Main Oscillator States
    const [mainOscType, setMainOscType] = useState('sine');
    const [mainOscFrequency, setMainOscFrequency] = useState(440); // A4
    const [mainOscVolume, setMainOscVolume] = useState(-10); // in dB

    // LFO (Tremolo) States
    const [lfoType, setLfoType] = useState('sine'); // Waveform of the LFO
    const [lfoFrequency, setLfoFrequency] = useState(5); // LFO frequency in Hz (e.g., 5 Hz for a noticeable tremolo)
    const [lfoDepth, setLfoDepth] = useState(0.5); // Depth of the LFO modulation (0 to 1)

    const [isAudioReady, setIsAudioReady] = useState(false); // True when context is running AND synth initialized
    const [isLoading, setIsLoading] = useState(true); // Indicates if audio setup is in progress

    // Function to dispose all Tone.js nodes created by this hook
    const disposeAudioNodes = useCallback(() => {
        console.log('useLFOModulationSynth: disposeAudioNodes called.');
        if (mainOscRef.current) mainOscRef.current.dispose();
        if (tremoloRef.current) tremoloRef.current.dispose();
        if (waveformAnalyzerRef.current) waveformAnalyzerRef.current.dispose();

        mainOscRef.current = null;
        tremoloRef.current = null;
        waveformAnalyzerRef.current = null;

        setIsPlaying(false);
        setIsAudioReady(false);
        isSynthInitializedRef.current = false;
        console.log('useLFOModulationSynth: Audio nodes disposed.');
    }, []);

    // Effect to initialize Tone.js components once on mount
    useEffect(() => {
        const setupAudio = async () => {
            if (isSynthInitializedRef.current) {
                console.log('useLFOModulationSynth: Audio setup already completed, skipping.');
                setIsLoading(false);
                return;
            }

            console.log('useLFOModulationSynth: Setting up Tone.js components...');
            setIsLoading(true);

            try {
                disposeAudioNodes(); // Ensure a clean slate

                // Create main oscillator
                const mainOsc = new Tone.Oscillator({
                    type: mainOscType,
                    frequency: mainOscFrequency,
                    volume: mainOscVolume,
                });

                // Create Tremolo effect (LFO for amplitude modulation)
                const tremolo = new Tone.Tremolo({
                    frequency: lfoFrequency,
                    depth: lfoDepth,
                    type: lfoType, // LFO waveform type
                    wet: 1, // Full wet signal for tremolo
                }).start(); // LFO starts immediately but effect only applies when oscillator plays

                // Create a Waveform analyzer for the combined output
                const waveform = new Tone.Waveform(4096); // High resolution for smoother visualization

                // Connect the signal flow: Main Osc -> Tremolo -> Analyzer -> Destination
                mainOsc.connect(tremolo);
                tremolo.connect(waveform);
                tremolo.toDestination(); // Connect the tremolo effect to the main output (speakers)

                mainOscRef.current = mainOsc;
                tremoloRef.current = tremolo;
                waveformAnalyzerRef.current = waveform;
                isSynthInitializedRef.current = true;
                console.log('useLFOModulationSynth: Tone.js components created and connected.');

                // Initially stop main oscillator, it will be started by playNote
                mainOsc.stop();

            } catch (error) {
                console.error("useLFOModulationSynth: Error during initial Tone.js setup:", error);
                setIsAudioReady(false);
                isSynthInitializedRef.current = false;
                disposeAudioNodes();
            } finally {
                setIsLoading(false);
            }
        };

        setupAudio();

        return () => {
            console.log('useLFOModulationSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, []); // Empty dependency array: runs only once on mount


    // Effect to update isAudioReady based on global audio and synth initialization status
    useEffect(() => {
        const currentAudioReady = isAudioGloballyReady && isSynthInitializedRef.current;
        if (currentAudioReady !== isAudioReady) {
            setIsAudioReady(currentAudioReady);
            console.log(`useLFOModulationSynth: isAudioGloballyReady: ${isAudioGloballyReady}, isSynthInitialized: ${isSynthInitializedRef.current} => isAudioReady: ${currentAudioReady}`);
        }
    }, [isAudioGloballyReady, isSynthInitializedRef.current, isAudioReady]);

    // Effects to update parameters when their states change
    useEffect(() => {
        if (mainOscRef.current && isSynthInitializedRef.current) {
            mainOscRef.current.type = mainOscType;
            mainOscRef.current.frequency.value = mainOscFrequency;
            mainOscRef.current.volume.value = mainOscVolume;
            console.log(`Main Osc Updated: Type=${mainOscType}, Freq=${mainOscFrequency}, Vol=${mainOscVolume}`);
        }
    }, [mainOscType, mainOscFrequency, mainOscVolume]); // Removed isAudioReady from dependencies

    useEffect(() => {
        if (tremoloRef.current && isSynthInitializedRef.current) {
            tremoloRef.current.frequency.value = lfoFrequency;
            tremoloRef.current.depth.value = lfoDepth;
            tremoloRef.current.type = lfoType;
            console.log(`LFO (Tremolo) Updated: Type=${lfoType}, Freq=${lfoFrequency}, Depth=${lfoDepth}`);
        }
    }, [lfoType, lfoFrequency, lfoDepth]); // Removed isAudioReady from dependencies


    // Function to start playing the modulated sound
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
        if (!isSynthInitializedRef.current || !mainOscRef.current || !tremoloRef.current || !isAudioReady) {
            console.warn('playNote: Audio system not fully ready. Cannot play note.');
            return;
        }

        if (isPlaying) {
            console.log('Sound is already playing, ignoring playNote call.');
            return;
        }

        try {
            // Start main oscillator only if not already started
            if (mainOscRef.current.state !== 'started') {
                 mainOscRef.current.start();
            }
            // Start tremolo only if not already started
            if (tremoloRef.current.state !== 'started') {
                 tremoloRef.current.start();
            }
            setIsPlaying(true);
            console.log('playNote: Modulated sound started.');
        } catch (e) {
            console.error("Error starting modulation:", e);
            setIsPlaying(false);
        }
    }, [isPlaying, isAudioReady, startGlobalAudio, isLoading]);

    // Function to stop playing the modulated sound
    const stopNote = useCallback(() => {
        if (mainOscRef.current && isPlaying) {
            if (mainOscRef.current.state === 'started') {
                mainOscRef.current.stop(); // Stop the main oscillator
            }
            if (tremoloRef.current.state === 'started') {
                tremoloRef.current.stop(); // Stop the tremolo LFO as well
            }
            setIsPlaying(false);
            console.log('stopNote: Modulated sound stopped.');
        } else {
            console.warn('stopNote: Cannot stop sound. Oscillator not playing or not initialized.');
        }
    }, [isPlaying]);

    return {
        isPlaying,
        playNote,
        stopNote,
        isAudioReady,
        isLoading,
        mainOscType, setMainOscType, mainOscFrequency, setMainOscFrequency, mainOscVolume, setMainOscVolume,
        lfoType, setLfoType, lfoFrequency, setLfoFrequency, lfoDepth, setLfoDepth,
        waveformAnalyzer: waveformAnalyzerRef.current, // Expose the analyzer for visualization
    };
};
// --- End useLFOModulationSynth Hook ---


// --- ParameterSlider Component (reused) ---
// Note: Changed `isAudioReady` prop to `isDisabled` for clarity in this component's context.
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '', isDisabled, colorClass = 'accent-purple-600 bg-purple-100' }) => (
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


// --- LFOModulationContent (Main UI Logic) ---
const LFOModulationContent = () => {
    const {
        isPlaying, playNote, stopNote,
        isAudioReady, isLoading, // isLoading is now properly used to disable elements during setup
        mainOscType, setMainOscType, mainOscFrequency, setMainOscFrequency, mainOscVolume, setMainOscVolume,
        lfoType, setLfoType, lfoFrequency, setLfoFrequency, lfoDepth, setLfoDepth,
        waveformAnalyzer,
    } = useLFOModulationSynth();

    const getExplanation = (param) => {
        switch (param) {
            case 'mainOscFrequency': return "Pitch of main sound (Hz)";
            case 'mainOscVolume': return "Base loudness (dB)";
            case 'lfoFrequency': return "Speed of modulation (Hz)";
            case 'lfoDepth': return "Intensity of effect (0-1)";
            default: return "Explore LFO modulation effects!";
        }
    };

    const waveformOptions = [
        { type: 'sine', label: 'Sine', Icon: Circle },
        { type: 'square', label: 'Square', Icon: Square },
        { type: 'sawtooth', label: 'Saw', Icon: Activity },
        { type: 'triangle', label: 'Tri', Icon: Triangle },
    ];

    return (
        <div
            className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 50%, #d8b4fe 100%)',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Floating Icons Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%23a78bfa' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            <div className="text-center mb-6 md:mb-10 z-10 w-full px-2">
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                    <Repeat size={36} className="text-purple-700 md:mb-0 mb-2" />
                    <h1 className="text-3xl md:text-5xl font-extrabold text-purple-900 drop-shadow-lg">
                        LFO Modulator
                    </h1>
                </div>
                {isLoading && (
                    <p className="text-purple-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                        Setting up audio engine...
                    </p>
                )}
                {!isLoading && !isAudioReady && (
                    <p className="text-purple-700 text-xs md:text-sm mt-2 md:mt-4">
                        Click "Play" to activate audio.
                    </p>
                )}
                {!isLoading && isAudioReady && (
                    <p className="text-purple-600 text-xs md:text-sm mt-2 md:mt-4">
                        Ready. Adjust LFO and play!
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-xl shadow-lg w-full max-w-5xl flex flex-col items-center space-y-4 md:space-y-8 z-10 border border-purple-200 mx-2">

                {/* Play and Stop Sound Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-4 md:mb-6 w-full">
                    <button
                        type="button"
                        onClick={playNote}
                        className={`px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 w-full
                                ${!isPlaying && !isLoading
                                    ? 'bg-purple-500 hover:bg-purple-600 text-white'
                                    : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                `}
                        disabled={isPlaying || isLoading} // Allow click to activate audio context
                    >
                        <Play size={20} />
                        Play
                    </button>

                    <button
                        type="button"
                        onClick={stopNote}
                        className={`px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 w-full
                                ${isPlaying && isAudioReady
                                    ? 'bg-purple-700 hover:bg-purple-800 text-white'
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
                    {/* Main Oscillator Controls */}
                    <div className="bg-purple-50/70 p-4 md:p-6 rounded-lg border border-purple-100 flex flex-col items-center shadow-inner">
                        <h2 className="text-xl md:text-2xl font-bold text-purple-800 mb-3 md:mb-4">Main Osc</h2>
                        <div className="flex justify-center gap-1 md:gap-2 mb-4 md:mb-6 flex-wrap">
                            {waveformOptions.map(({ type, label, Icon }) => (
                                <button
                                    key={`main-${type}`}
                                    onClick={() => setMainOscType(type)}
                                    className={`px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1 transition-all duration-200
                                        ${mainOscType === type
                                            ? 'bg-purple-600 text-white shadow-md'
                                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                                        ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                                    `}
                                    disabled={isLoading} // Correctly disabled only during initial loading
                                >
                                    <Icon size={14} className="flex-shrink-0" />
                                    <span className="whitespace-nowrap">{label}</span>
                                </button>
                            ))}
                        </div>
                        <ParameterSlider
                            label="Freq" value={mainOscFrequency} setter={setMainOscFrequency}
                            min="100" max="1000" step="1" unit=" Hz"
                            explanation={getExplanation('mainOscFrequency')}
                            isDisabled={isLoading} // Pass isLoading to control disabled state
                            colorClass="accent-purple-600 bg-purple-100"
                        />
                        <ParameterSlider
                            label="Vol" value={mainOscVolume} setter={setMainOscVolume}
                            min="-40" max="-5" step="1" unit=" dB"
                            explanation={getExplanation('mainOscVolume')}
                            isDisabled={isLoading} // Pass isLoading to control disabled state
                            colorClass="accent-purple-600 bg-purple-100"
                        />
                    </div>

                    {/* LFO Controls */}
                    <div className="bg-purple-50/70 p-4 md:p-6 rounded-lg border border-purple-100 flex flex-col items-center shadow-inner">
                        <h2 className="text-xl md:text-2xl font-bold text-purple-800 mb-3 md:mb-4">LFO (Tremolo)</h2>
                        <div className="flex justify-center gap-1 md:gap-2 mb-4 md:mb-6 flex-wrap">
                            {waveformOptions.map(({ type, label, Icon }) => (
                                <button
                                    key={`lfo-${type}`}
                                    onClick={() => setLfoType(type)}
                                    className={`px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1 transition-all duration-200
                                        ${lfoType === type
                                            ? 'bg-purple-600 text-white shadow-md'
                                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                                        ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                                    `}
                                    disabled={isLoading} // Correctly disabled only during initial loading
                                >
                                    <Icon size={14} className="flex-shrink-0" />
                                    <span className="whitespace-nowrap">{label}</span>
                                </button>
                            ))}
                        </div>
                        <ParameterSlider
                            label="Speed" value={lfoFrequency} setter={setLfoFrequency}
                            min="0.1" max="10" step="0.1" unit=" Hz"
                            explanation={getExplanation('lfoFrequency')}
                            isDisabled={isLoading} // Pass isLoading to control disabled state
                            colorClass="accent-purple-600 bg-purple-100"
                        />
                        <ParameterSlider
                            label="Depth" value={lfoDepth} setter={setLfoDepth}
                            min="0.0" max="1.0" step="0.01" unit=""
                            explanation={getExplanation('lfoDepth')}
                            isDisabled={isLoading} // Pass isLoading to control disabled state
                            colorClass="accent-purple-600 bg-purple-100"
                        />
                    </div>
                </div>

                <div className="text-center text-gray-700 text-xs md:text-sm mt-4 md:mt-6 italic px-2">
                    Demonstrates amplitude modulation (Tremolo). LFO controls volume fluctuations.
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
        console.error("Uncaught error in LFOModulation:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-purple-100 text-purple-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the LFO Modulation Tool. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export wrapping the main content with AudioContextProvider and ErrorBoundary
const LFOModulation = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <LFOModulationContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default LFOModulation;
