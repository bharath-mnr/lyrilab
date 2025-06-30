import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Circle, Square, Triangle, Activity, Volume2, Waves } from 'lucide-react'; // Corrected icon imports
import SEOHead from './SEOHead';

// Define the tool object for SEO structured data
const wavetableEditorTool = {
    id: 'wavetable-editor',
    name: 'Wavetable Editor',
    description: 'Design custom wavetables for unique synthesizer sounds and electronic music production.',
    path: '/wavetable-editor',
    categories: [
        'Sound Design',
        'Synthesis',
        'Wavetable',
        'Electronic Music',
        'Waveform Editing'
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
    }, [isAudioGloballyReady]);

    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, startGlobalAudio }}>
            {children}
        </AudioContext.Provider>
    );
};
// --- END AUDIO CONTEXT ---


// --- useWavetableSynth Hook ---
// This custom hook encapsulates the Tone.js oscillator and its controls.
const useWavetableSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const oscillatorRef = useRef(null); // Will hold the Tone.Oscillator
    const waveformAnalyzerRef = useRef(null); // Will hold the Tone.Waveform analyzer
    const isSynthInitializedRef = useRef(false); // Flag to ensure single initialization

    const [isPlaying, setIsPlaying] = useState(false); // Indicates if the sound is currently playing
    const [frequency, setFrequency] = useState(440); // Frequency in Hz (A4 by default)
    const [volume, setVolume] = useState(-10); // Volume in dB
    const [waveformType, setWaveformType] = useState('sine'); // Initial waveform type

    const [isAudioReady, setIsAudioReady] = useState(false); // True when context is running AND synth initialized
    const [isLoading, setIsLoading] = useState(true); // Initially loading until synth is set up

    // Function to dispose all Tone.js nodes created by this hook
    const disposeAudioNodes = useCallback(() => {
        console.log('useWavetableSynth: disposeAudioNodes called.');
        if (oscillatorRef.current) {
            oscillatorRef.current.stop(); // Ensure oscillator is stopped
            oscillatorRef.current.dispose();
            oscillatorRef.current = null;
        }
        if (waveformAnalyzerRef.current) {
            waveformAnalyzerRef.current.dispose();
            waveformAnalyzerRef.current = null;
        }
        setIsPlaying(false);
        setIsAudioReady(false); // Set to false when disposing
        isSynthInitializedRef.current = false; // Reset initialized flag
        console.log('useWavetableSynth: Audio nodes disposed.');
    }, []);

    // Effect to initialize Tone.js Oscillator and Waveform Analyzer once on mount
    useEffect(() => {
        const setupAudio = async () => {
            if (isSynthInitializedRef.current) {
                console.log('useWavetableSynth: Audio setup already completed, skipping.');
                setIsLoading(false); // Ensure loading is false if already set up
                return;
            }

            console.log('useWavetableSynth: Setting up Tone.Oscillator and Waveform Analyzer...');
            setIsLoading(true); // Indicate setup is happening

            try {
                disposeAudioNodes(); // Ensure a clean slate before new setup

                // Create Tone.Oscillator
                const osc = new Tone.Oscillator({
                    type: waveformType,
                    frequency: frequency,
                    volume: volume,
                });

                // Create a Waveform analyzer to visualize the output
                const waveform = new Tone.Waveform(1024); // 1024 samples for the waveform

                // Connect oscillator to the waveform analyzer and then to the destination
                osc.connect(waveform);
                osc.toDestination(); // Connect the oscillator to the main output (speakers)

                oscillatorRef.current = osc;
                waveformAnalyzerRef.current = waveform;
                isSynthInitializedRef.current = true; // Mark as initialized
                console.log('useWavetableSynth: Tone.Oscillator and Waveform Analyzer created and connected.');

            } catch (error) {
                console.error("useWavetableSynth: Error during initial Tone.js setup:", error);
                setIsAudioReady(false);
                isSynthInitializedRef.current = false; // Ensure this is false on error
                disposeAudioNodes(); // Clean up on error
            } finally {
                setIsLoading(false); // Always turn off loading after attempt
            }
        };

        setupAudio();

        // Cleanup function for when the component unmounts
        return () => {
            console.log('useWavetableSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, []); // Empty dependency array: runs only once on mount

    // Effect to update isAudioReady based on global audio and synth initialization status
    useEffect(() => {
        const currentAudioReady = isAudioGloballyReady && isSynthInitializedRef.current;
        if (currentAudioReady !== isAudioReady) {
            setIsAudioReady(currentAudioReady);
            console.log(`useWavetableSynth: isAudioGloballyReady: ${isAudioGloballyReady}, isSynthInitialized: ${isSynthInitializedRef.current} => isAudioReady: ${currentAudioReady}`);
        }
    }, [isAudioGloballyReady, isAudioReady]); // isSynthInitializedRef.current does not need to be a dependency here, as it's a ref.

    // Effect to update Oscillator parameters when their state changes (e.g., slider moves)
    useEffect(() => {
        if (oscillatorRef.current && isSynthInitializedRef.current) {
            console.log(`useWavetableSynth: Updating Oscillator - Type: ${waveformType}, Freq: ${frequency}Hz, Vol: ${volume}dB`);
            oscillatorRef.current.type = waveformType;
            oscillatorRef.current.frequency.value = frequency;
            oscillatorRef.current.volume.value = volume;
        }
    }, [waveformType, frequency, volume]);

    // Function to start playing the note
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

        // Ensure oscillator is initialized and ready before proceeding
        if (!isSynthInitializedRef.current || !oscillatorRef.current || !isAudioReady) {
            console.warn('playNote: Audio system not fully ready. Cannot play note.');
            // This specific check ensures that if isAudioReady *just* turned true
            // but the component hasn't re-rendered with the new state, we can still proceed
            // if the underlying conditions (context running, synth initialized) are met.
            if (!(Tone.context.state === 'running' && isSynthInitializedRef.current)) {
                return;
            }
        }

        if (isPlaying) {
            console.log('Note is already playing, ignoring playNote call.');
            return;
        }

        try {
            oscillatorRef.current.start(); // Start the oscillator
            setIsPlaying(true);
            console.log('playNote: Oscillator started.');
        } catch (e) {
            console.error("Error starting oscillator:", e);
            setIsPlaying(false);
        }
    }, [isPlaying, isAudioReady, startGlobalAudio, isLoading]);

    // Function to stop playing the note
    const stopNote = useCallback(() => {
        if (oscillatorRef.current && isPlaying) {
            oscillatorRef.current.stop(); // Stop the oscillator
            setIsPlaying(false);
            console.log('stopNote: Oscillator stopped.');
        } else {
            console.warn('stopNote: Cannot stop note. Oscillator not playing or not initialized.');
        }
    }, [isPlaying]);

    return {
        isPlaying,
        playNote,
        stopNote,
        isAudioReady,
        isLoading,
        frequency, setFrequency,
        volume, setVolume,
        waveformType, setWaveformType,
        waveformAnalyzer: waveformAnalyzerRef.current, // Expose the analyzer for visualization
    };
};
// --- End useWavetableSynth Hook ---


// --- ParameterSlider Component (reused from ADSR app) ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '' }) => (
    <div className="flex flex-col items-center w-full">
        <label className="text-gray-800 font-medium mb-2 text-center">{label}: {typeof value === 'number' ? value.toFixed(value < 1 && value !== 0 ? 3 : 1) : value}{unit}</label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => setter(parseFloat(e.target.value))}
            className="w-full accent-blue-600 h-2 rounded-lg appearance-none cursor-pointer bg-blue-100"
            // Slider should always be enabled, as it only changes state, not triggers audio directly
        />
        <p className="text-gray-700 text-sm mt-1 italic text-center px-2">{explanation}</p>
    </div>
);
// --- End ParameterSlider Component ---


// --- WaveformVisualizer Component ---
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


// --- WavetableEditorContent (Main UI Logic) ---
// This component renders the UI for the Wavetable Viewer/Editor.
const WavetableEditorContent = () => {
    const {
        isPlaying, playNote, stopNote,
        isAudioReady,
        isLoading,
        frequency, setFrequency,
        volume, setVolume,
        waveformType, setWaveformType,
        waveformAnalyzer,
    } = useWavetableSynth();

    const getExplanation = (param) => {
        switch (param) {
            case 'frequency': return "Pitch of the sound (Hz). Higher = higher pitch.";
            case 'volume': return "Loudness (dB). -60 = silent, 0 = max.";
            default: return "Adjust parameters to shape your sound!";
        }
    };

    return (
        <>

            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
                pageId="wavetable-editor" 
                tool={wavetableEditorTool}
                customData={{}}
            />

            <div
                className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 md:p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #e0f2fe 0%, #bfdbfe 50%, #93c5fd 100%)',
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

                <div className="text-center mb-4 sm:mb-6 md:mb-10 z-10 w-full max-w-5xl">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-blue-900 drop-shadow-lg mb-2 sm:mb-4 leading-tight">
                        Wavetable Synth
                    </h1>

                    {/* Status Messages */}
                    <div className="min-h-[1.5rem] flex items-center justify-center">
                        {isLoading && (
                            <p className="text-blue-700 text-sm sm:text-base animate-pulse">
                                Setting up audio engine...
                            </p>
                        )}
                        {!isLoading && !isAudioReady && (
                            <p className="text-blue-700 text-sm sm:text-base">
                                Click "Play Sound" to activate audio.
                            </p>
                        )}
                        {!isLoading && isAudioReady && (
                            <p className="text-blue-600 text-sm sm:text-base font-medium">
                                Ready! Choose waveform and play.
                            </p>
                        )}
                    </div>
                </div>

                <div className="bg-white/90 backdrop-blur-md p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col items-center space-y-6 sm:space-y-8 z-10 border border-blue-200/50 mx-2">

                    {/* Play and Stop Sound Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-md">
                        <button
                            type="button"
                            onClick={playNote}
                            className={`px-6 py-4 sm:px-8 sm:py-5 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 transition-all duration-300 w-full shadow-lg hover:shadow-xl
                                    ${!isPlaying && !isLoading
                                        ? 'bg-blue-500 hover:bg-blue-600 active:scale-95 text-white hover:scale-105'
                                        : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                            disabled={isPlaying || isLoading}
                            style={{
                                WebkitTapHighlightColor: 'transparent',
                                touchAction: 'manipulation'
                            }}
                        >
                            <Play size={20} />
                            Play Sound
                        </button>

                        <button
                            type="button"
                            onClick={stopNote}
                            className={`px-6 py-4 sm:px-8 sm:py-5 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 transition-all duration-300 w-full shadow-lg hover:shadow-xl
                                    ${isPlaying && isAudioReady
                                        ? 'bg-blue-700 hover:bg-blue-800 active:scale-95 text-white hover:scale-105'
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

                    {/* Waveform Visualizer */}
                    <div className="w-full px-2">
                        <WaveformVisualizer
                            waveformAnalyzer={waveformAnalyzer}
                            isAudioReady={isAudioReady}
                            isPlaying={isPlaying}
                        />
                    </div>

                    {/* Waveform Type Selection */}
                    <div className="w-full px-2">
                        <h3 className="text-sm sm:text-base font-semibold text-gray-700 mb-3 text-center">Waveform Type:</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 justify-center">
                            {[
                                { type: 'sine', label: 'Sine', Icon: Circle },
                                { type: 'square', label: 'Square', Icon: Square },
                                { type: 'sawtooth', label: 'Saw', Icon: Activity },
                                { type: 'triangle', label: 'Tri', Icon: Triangle },
                            ].map(({ type, label, Icon }) => (
                                <button
                                    key={type}
                                    onClick={() => setWaveformType(type)}
                                    className={`px-4 py-2 sm:px-5 sm:py-3 rounded-lg font-semibold text-sm sm:text-base flex items-center justify-center gap-1 sm:gap-2 transition-all duration-200 shadow-sm hover:shadow-md
                                        ${waveformType === type
                                            ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400'
                                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300 active:scale-95'}
                                        ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                                    `}
                                    disabled={isLoading}
                                    style={{
                                        WebkitTapHighlightColor: 'transparent',
                                        touchAction: 'manipulation'
                                    }}
                                >
                                    <Icon size={16} className="flex-shrink-0" />
                                    <span className="whitespace-nowrap">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>


                    {/* Parameter Sliders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full">
                        <ParameterSlider
                            label="Frequency" value={frequency} setter={setFrequency}
                            min="50" max="2000" step="1" unit=" Hz"
                            explanation={getExplanation('frequency')}
                            isDisabled={isLoading}
                            colorClass="accent-blue-600 bg-blue-100"
                        />

                        <ParameterSlider
                            label="Volume" value={volume} setter={setVolume}
                            min="-60" max="0" step="1" unit=" dB"
                            explanation={getExplanation('volume')}
                            isDisabled={isLoading}
                            colorClass="accent-blue-600 bg-blue-100"
                        />
                    </div>
                </div>

                {/* Footer spacing for mobile */}
                <div className="h-8 sm:h-4"></div>
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
        console.error("Uncaught error in WavetableEditor:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-blue-100 text-blue-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Wavetable Editor. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export wrapping the main content with AudioContextProvider and ErrorBoundary
const WavetableEditor = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <WavetableEditorContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default WavetableEditor;
