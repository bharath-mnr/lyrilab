import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Circle, Square, Triangle, Activity, Volume2, Waves } from 'lucide-react'; // Icons for play/pause, waveform types, volume, and general waves
import SEOHead from './SEOHead';


// Define the tool object for SEO structured data
const waveformCombinerTool = {
    id: 'waveform-combiner',
    name: 'Waveform Combiner',
    description: 'Mix and combine multiple waveforms to create complex sounds with unique textures.',
    path: '/waveform-combiner',
    categories: [
        'Waveform Synthesis',
        'Sound Design',
        'Harmonic Mixing',
        'Audio Processing',
        'Synthesis'
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


// --- useWaveformCombinerSynth Hook ---
// This custom hook encapsulates the Tone.js oscillators, their mixing, and controls.
const useWaveformCombinerSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const oscillator1Ref = useRef(null); // First oscillator
    const oscillator2Ref = useRef(null); // Second oscillator
    const gain1Ref = useRef(null); // Gain node for oscillator 1
    const gain2Ref = useRef(null); // Gain node for oscillator 2
    const masterGainRef = useRef(null); // Master gain for overall volume
    const waveformAnalyzerRef = useRef(null); // Will hold the Tone.Waveform analyzer for combined output
    const isSynthInitializedRef = useRef(false); // Flag to ensure single initialization

    const [isPlaying, setIsPlaying] = useState(false); // Indicates if the sound is currently playing

    // Wave 1 States
    const [waveformType1, setWaveformType1] = useState('sine');
    const [frequency1, setFrequency1] = useState(220); // A3
    const [volume1, setVolume1] = useState(-10); // in dB

    // Wave 2 States
    const [waveformType2, setWaveformType2] = useState('square');
    const [frequency2, setFrequency2] = useState(440); // A4
    const [volume2, setVolume2] = useState(-10); // in dB

    // Master Volume
    const [masterVolume, setMasterVolume] = useState(-5); // Master volume in dB

    const [isAudioReady, setIsAudioReady] = useState(false); // True when context is running AND synth initialized
    const [isLoading, setIsLoading] = useState(true); // Initially loading until synth is set up

    // Function to dispose all Tone.js nodes created by this hook
    const disposeAudioNodes = useCallback(() => {
        console.log('useWaveformCombinerSynth: disposeAudioNodes called.');
        if (oscillator1Ref.current) oscillator1Ref.current.dispose();
        if (oscillator2Ref.current) oscillator2Ref.current.dispose();
        if (gain1Ref.current) gain1Ref.current.dispose();
        if (gain2Ref.current) gain2Ref.current.dispose();
        if (masterGainRef.current) masterGainRef.current.dispose();
        if (waveformAnalyzerRef.current) waveformAnalyzerRef.current.dispose();

        oscillator1Ref.current = null;
        oscillator2Ref.current = null;
        gain1Ref.current = null;
        gain2Ref.current = null;
        masterGainRef.current = null;
        waveformAnalyzerRef.current = null;

        setIsPlaying(false);
        setIsAudioReady(false);
        isSynthInitializedRef.current = false;
        console.log('useWaveformCombinerSynth: Audio nodes disposed.');
    }, []);

    // Effect to initialize Tone.js components once on mount
    useEffect(() => {
        const setupAudio = async () => {
            if (isSynthInitializedRef.current) {
                console.log('useWaveformCombinerSynth: Audio setup already completed, skipping.');
                setIsLoading(false);
                return;
            }

            console.log('useWaveformCombinerSynth: Setting up Tone.js components...');
            setIsLoading(true);

            try {
                disposeAudioNodes(); // Ensure a clean slate

                // Create individual oscillators
                // Set initial start to false, they will be controlled by playNote/stopNote
                const osc1 = new Tone.Oscillator({ type: waveformType1, frequency: frequency1 });
                const osc2 = new Tone.Oscillator({ type: waveformType2, frequency: frequency2 });

                // Create gain nodes for individual volume control
                const gain1 = new Tone.Gain(Tone.dbToGain(volume1));
                const gain2 = new Tone.Gain(Tone.dbToGain(volume2));

                // Create a master gain node for overall volume
                const masterGain = new Tone.Gain(Tone.dbToGain(masterVolume));

                // Create a Waveform analyzer for the combined output
                const waveform = new Tone.Waveform(4096);

                // Connect the signal flow: Osc -> Individual Gain -> Master Gain -> Analyzer -> Destination
                osc1.connect(gain1);
                osc2.connect(gain2);

                gain1.connect(masterGain);
                gain2.connect(masterGain); // Both individual gains feed into the master gain

                masterGain.connect(waveform); // Analyzer takes input from master gain
                masterGain.toDestination(); // Master gain connects to speakers

                oscillator1Ref.current = osc1;
                oscillator2Ref.current = osc2;
                gain1Ref.current = gain1;
                gain2Ref.current = gain2;
                masterGainRef.current = masterGain;
                waveformAnalyzerRef.current = waveform;
                isSynthInitializedRef.current = true;
                console.log('useWaveformCombinerSynth: Tone.js components created and connected.');

                // Oscillators are created but not started yet. They will start on playNote.
            } catch (error) {
                console.error("useWaveformCombinerSynth: Error during initial Tone.js setup:", error);
                setIsAudioReady(false);
                isSynthInitializedRef.current = false;
                disposeAudioNodes();
            } finally {
                setIsLoading(false);
            }
        };

        setupAudio();

        return () => {
            console.log('useWaveformCombinerSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, []); // Empty dependency array: runs only once on mount


    // Effect to update isAudioReady based on global audio and synth initialization status
    useEffect(() => {
        const currentAudioReady = isAudioGloballyReady && isSynthInitializedRef.current;
        if (currentAudioReady !== isAudioReady) {
            setIsAudioReady(currentAudioReady);
            console.log(`useWaveformCombinerSynth: isAudioGloballyReady: ${isAudioGloballyReady}, isSynthInitialized: ${isSynthInitializedRef.current} => isAudioReady: ${currentAudioReady}`);
        }
    }, [isAudioGloballyReady, isSynthInitializedRef.current, isAudioReady]);

    // Effects to update oscillator and gain parameters when their states change
    useEffect(() => {
        if (oscillator1Ref.current && gain1Ref.current && isSynthInitializedRef.current) {
            oscillator1Ref.current.type = waveformType1;
            oscillator1Ref.current.frequency.value = frequency1;
            gain1Ref.current.gain.value = Tone.dbToGain(volume1);
            console.log(`Wave 1 Updated: Type=${waveformType1}, Freq=${frequency1}, Vol=${volume1}`);
        }
    }, [waveformType1, frequency1, volume1]); // Removed isAudioReady from dependencies

    useEffect(() => {
        if (oscillator2Ref.current && gain2Ref.current && isSynthInitializedRef.current) {
            oscillator2Ref.current.type = waveformType2;
            oscillator2Ref.current.frequency.value = frequency2;
            gain2Ref.current.gain.value = Tone.dbToGain(volume2);
            console.log(`Wave 2 Updated: Type=${waveformType2}, Freq=${frequency2}, Vol=${volume2}`);
        }
    }, [waveformType2, frequency2, volume2]); // Removed isAudioReady from dependencies

    useEffect(() => {
        if (masterGainRef.current && isSynthInitializedRef.current) {
            masterGainRef.current.gain.value = Tone.dbToGain(masterVolume);
            console.log(`Master Volume Updated: ${masterVolume}`);
        }
    }, [masterVolume]); // Removed isAudioReady from dependencies


    // Function to start playing the combined sound
    const playNote = useCallback(async () => {
        console.log('playNote called. isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady, 'isLoading:', isLoading);

        // First, ensure the global audio context is running due to user interaction
        if (Tone.context.state !== 'running') {
            console.log('playNote: AudioContext is suspended, attempting to start global audio...');
            await startGlobalAudio(); // This will attempt to resume context on user click
            // After awaiting startGlobalAudio, re-check the context state
            if (Tone.context.state !== 'running') {
                console.warn('Audio context could not be started after user interaction. Cannot play note.');
                return; // Exit if audio context is still not running
            }
        }

        // Ensure all components are initialized and ready
        if (!isSynthInitializedRef.current || !oscillator1Ref.current || !oscillator2Ref.current || !isAudioReady) {
            console.warn('playNote: Audio system not fully ready. Cannot play note.');
            return;
        }

        if (isPlaying) {
            console.log('Sound is already playing, ignoring playNote call.');
            return;
        }

        try {
            // Start both oscillators. They are connected to gains so their volume is controlled.
            // Check if they are already started to prevent error
            if (oscillator1Ref.current.state !== 'started') {
                oscillator1Ref.current.start();
            }
            if (oscillator2Ref.current.state !== 'started') {
                oscillator2Ref.current.start();
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
        if (oscillator1Ref.current && oscillator2Ref.current && isPlaying) {
            // Stop them only if they are currently playing
            if (oscillator1Ref.current.state === 'started') {
                oscillator1Ref.current.stop();
            }
            if (oscillator2Ref.current.state === 'started') {
                oscillator2Ref.current.stop();
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
        waveformType1, setWaveformType1, frequency1, setFrequency1, volume1, setVolume1,
        waveformType2, setWaveformType2, frequency2, setFrequency2, volume2, setVolume2,
        masterVolume, setMasterVolume,
        waveformAnalyzer: waveformAnalyzerRef.current, // Expose the analyzer for visualization
    };
};
// --- End useWaveformCombinerSynth Hook ---


// --- ParameterSlider Component (reused) ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '', isAudioReady, colorClass = 'accent-blue-600 bg-blue-100' }) => (
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
            disabled={!isAudioReady} // This slider only updates parameter, not triggers audio. It should be enabled.
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

    // Function to draw a single frame of the waveform
    const renderWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !waveformAnalyzer || !isAudioReady) {
            return;
        }

        const ctx = canvas.getContext('2d');
        const bufferLength = waveformAnalyzer.getValue().length;
        const dataArray = waveformAnalyzer.getValue();

        // Clear previous drawing
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the full physical canvas size

        // Reset the transformation matrix and apply device pixel ratio scaling
        // This ensures drawing coordinates map 1:1 with CSS pixels, while rendering at native resolution
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        ctx.lineWidth = 2 / dpr; // Adjust line width for DPR if needed, otherwise it'll be too thick on high-DPR screens
        ctx.strokeStyle = '#3b82f6'; // Blue color for the waveform
        ctx.beginPath();

        // Use canvas's client dimensions (CSS pixels) for drawing calculations
        // This means x will go from 0 to canvas.offsetWidth, and y from 0 to canvas.offsetHeight
        const displayWidth = canvas.offsetWidth;
        const displayHeight = canvas.offsetHeight;

        const sliceWidth = displayWidth * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i]; // Value is between -1 and 1
            // Center the waveform vertically on the displayHeight
            const y = (v * (displayHeight / 2)) + (displayHeight / 2);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        // Ensure the last point connects properly
        if (bufferLength > 0) {
            ctx.lineTo(displayWidth, (dataArray[bufferLength - 1] * (displayHeight / 2)) + (displayHeight / 2));
        }
        ctx.stroke();
    }, [waveformAnalyzer, isAudioReady]); // Only depends on analyzer and audio readiness for drawing data

    // Animation loop function (no changes needed here, as it calls renderWaveform)
    const animate = useCallback(() => {
        if (!isPlaying || !isAudioReady || !waveformAnalyzer) {
            // Stop animating if conditions are not met
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
            return;
        }
        renderWaveform(); // Draw the current frame
        animationFrameId.current = requestAnimationFrame(animate); // Request next frame
    }, [isPlaying, isAudioReady, waveformAnalyzer, renderWaveform]);

    // Effect to handle canvas setup and animation loop management
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvasDimensions = () => {
            const dpr = window.devicePixelRatio || 1;
            // Set canvas drawing buffer size (internal resolution)
            canvas.width = canvas.offsetWidth * dpr;
            canvas.height = canvas.offsetHeight * dpr;
            // No ctx.scale here, it's handled in renderWaveform via setTransform
            renderWaveform(); // Redraw on resize
        };

        const observer = new ResizeObserver(() => {
            resizeCanvasDimensions();
        });
        // Observe the parent div to react to its size changes
        observer.observe(canvas.parentElement);

        resizeCanvasDimensions(); // Initial setup

        // Start or stop the animation loop based on props
        if (isPlaying && isAudioReady && waveformAnalyzer) {
            if (!animationFrameId.current) { // Only start if not already running
                animate(); // Start the loop
            }
        } else {
            if (animationFrameId.current) { // Only stop if it's running
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
            // Clear canvas when stopped or not ready
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the full physical canvas size
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform when not drawing to ensure proper clearing
        }

        // Cleanup function
        return () => {
            observer.disconnect(); // Disconnect ResizeObserver
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
        };
    }, [isPlaying, isAudioReady, waveformAnalyzer, animate, renderWaveform]);

    return (
        <div className="relative w-full h-48 bg-gray-900 rounded-lg overflow-hidden border border-blue-300 shadow-inner flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full"></canvas>
            {!isAudioReady && <p className="absolute text-gray-400 text-lg">Waiting for audio...</p>}
            {isAudioReady && !isPlaying && <p className="absolute text-gray-400 text-lg">Press Play to see waveform</p>}
        </div>
    );
};
// --- End WaveformVisualizer Component ---


// --- WaveformCombinerContent (Main UI Logic) ---
const WaveformCombinerContent = () => {
    const {
        isPlaying, playNote, stopNote,
        isAudioReady, isLoading,
        waveformType1, setWaveformType1, frequency1, setFrequency1, volume1, setVolume1,
        waveformType2, setWaveformType2, frequency2, setFrequency2, volume2, setVolume2,
        masterVolume, setMasterVolume,
        waveformAnalyzer,
    } = useWaveformCombinerSynth();

    const getExplanation = (param) => {
        switch (param) {
            case 'frequency': return "Pitch of sound (Hz). Higher = higher pitch.";
            case 'volume': return "Loudness (dB). -60 = silent, 0 = max.";
            case 'masterVolume': return "Controls overall loudness.";
            default: return "Adjust parameters to shape your sound!";
        }
    };

    const waveformOptions = [
        { type: 'sine', label: 'Sine', Icon: Circle },
        { type: 'square', label: 'Square', Icon: Square },
        { type: 'sawtooth', label: 'Saw', Icon: Activity },
        { type: 'triangle', label: 'Tri', Icon: Triangle },
    ];

    return (
        <>
            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
                pageId="waveform-combiner" 
                tool={waveformCombinerTool}
                customData={{}}
            />

            <div
                className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #e6ffe6 0%, #ccffcc 50%, #b3ffb3 100%)',
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                {/* Floating Icons Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%2322c55e' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                        backgroundSize: '200px 200px'
                    }}
                ></div>

                <div className="text-center mb-6 md:mb-10 z-10 w-full px-2">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                        <Waves size={36} className="text-green-700 md:mb-0 mb-2" />
                        <h1 className="text-3xl md:text-5xl font-extrabold text-green-900 drop-shadow-lg">
                            Waveform Combiner
                        </h1>
                    </div>
                    {isLoading && (
                        <p className="text-green-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                            Setting up audio engine...
                        </p>
                    )}
                    {!isLoading && !isAudioReady && (
                        <p className="text-green-700 text-xs md:text-sm mt-2 md:mt-4">
                            Click "Play" to activate audio.
                        </p>
                    )}
                    {!isLoading && isAudioReady && (
                        <p className="text-green-600 text-xs md:text-sm mt-2 md:mt-4">
                            Ready. Mix two waveforms and play!
                        </p>
                    )}
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-xl shadow-lg w-full max-w-5xl flex flex-col items-center space-y-4 md:space-y-8 z-10 border border-green-200 mx-2">

                    {/* Play and Stop Sound Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-4 md:mb-6 w-full">
                        <button
                            type="button"
                            onClick={playNote}
                            className={`px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 w-full
                                    ${!isPlaying && !isLoading
                                        ? 'bg-green-500 hover:bg-green-600 text-white'
                                        : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                            disabled={isPlaying || isLoading}
                        >
                            <Play size={20} />
                            Play
                        </button>

                        <button
                            type="button"
                            onClick={stopNote}
                            className={`px-6 py-3 md:px-8 md:py-4 rounded-full font-bold text-base md:text-lg flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 w-full
                                    ${isPlaying && isAudioReady
                                        ? 'bg-green-700 hover:bg-green-800 text-white'
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
                        {/* Wave 1 Controls */}
                        <div className="bg-green-50/70 p-4 md:p-6 rounded-lg border border-green-100 flex flex-col items-center shadow-inner">
                            <h2 className="text-xl md:text-2xl font-bold text-green-800 mb-3 md:mb-4">Wave 1</h2>
                            <div className="flex justify-center gap-1 md:gap-2 mb-4 md:mb-6 flex-wrap">
                                {waveformOptions.map(({ type, label, Icon }) => (
                                    <button
                                        key={`wave1-${type}`}
                                        onClick={() => setWaveformType1(type)}
                                        className={`px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1 transition-all duration-200
                                            ${waveformType1 === type
                                                ? 'bg-green-600 text-white shadow-md'
                                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                                            ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                                        `}
                                        disabled={isLoading}
                                    >
                                        <Icon size={14} className="flex-shrink-0" />
                                        <span className="whitespace-nowrap">{label}</span>
                                    </button>
                                ))}
                            </div>
                            <ParameterSlider
                                label="Freq 1" value={frequency1} setter={setFrequency1}
                                min="20" max="1000" step="1" unit=" Hz"
                                explanation={getExplanation('frequency')}
                                isAudioReady={isAudioReady}
                                colorClass="accent-green-600 bg-green-100"
                            />
                            <ParameterSlider
                                label="Vol 1" value={volume1} setter={setVolume1}
                                min="-60" max="0" step="1" unit=" dB"
                                explanation={getExplanation('volume')}
                                isAudioReady={isAudioReady}
                                colorClass="accent-green-600 bg-green-100"
                            />
                        </div>

                        {/* Wave 2 Controls */}
                        <div className="bg-green-50/70 p-4 md:p-6 rounded-lg border border-green-100 flex flex-col items-center shadow-inner">
                            <h2 className="text-xl md:text-2xl font-bold text-green-800 mb-3 md:mb-4">Wave 2</h2>
                            <div className="flex justify-center gap-1 md:gap-2 mb-4 md:mb-6 flex-wrap">
                                {waveformOptions.map(({ type, label, Icon }) => (
                                    <button
                                        key={`wave2-${type}`}
                                        onClick={() => setWaveformType2(type)}
                                        className={`px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1 transition-all duration-200
                                            ${waveformType2 === type
                                                ? 'bg-green-600 text-white shadow-md'
                                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                                            ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                                        `}
                                        disabled={isLoading}
                                    >
                                        <Icon size={14} className="flex-shrink-0" />
                                        <span className="whitespace-nowrap">{label}</span>
                                    </button>
                                ))}
                            </div>
                            <ParameterSlider
                                label="Freq 2" value={frequency2} setter={setFrequency2}
                                min="20" max="1000" step="1" unit=" Hz"
                                explanation={getExplanation('frequency')}
                                isAudioReady={isAudioReady}
                                colorClass="accent-green-600 bg-green-100"
                            />
                            <ParameterSlider
                                label="Vol 2" value={volume2} setter={setVolume2}
                                min="-60" max="0" step="1" unit=" dB"
                                explanation={getExplanation('volume')}
                                isAudioReady={isAudioReady}
                                colorClass="accent-green-600 bg-green-100"
                            />
                        </div>
                    </div>

                    {/* Master Volume Slider */}
                    <div className="w-full mt-4 md:mt-6 pt-4 md:pt-6 border-t border-green-200 px-2">
                        <ParameterSlider
                            label="Master Vol" value={masterVolume} setter={setMasterVolume}
                            min="-40" max="0" step="1" unit=" dB"
                            explanation={getExplanation('masterVolume')}
                            isAudioReady={isAudioReady}
                            colorClass="accent-green-700 bg-green-200"
                        />
                    </div>

                    <div className="text-center text-gray-700 text-xs md:text-sm mt-4 md:mt-6 italic px-2">
                        Combines two waveforms. Adjust each wave's settings and master volume.
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
        console.error("Uncaught error in WaveformCombiner:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-green-100 text-green-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Waveform Combiner. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export wrapping the main content with AudioContextProvider and ErrorBoundary
const WaveformCombiner = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <WaveformCombinerContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default WaveformCombiner;
