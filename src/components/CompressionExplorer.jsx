import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, SlidersHorizontal, BarChart2 } from 'lucide-react';
import SEOHead from './SEOHead';

// Define the tool object for SEO structured data
const compressionExplorerTool = {
    id: 'compression-explorer',
    name: 'Compression Explorer',
    description: 'Hands-on audio compression training with real-time controls and feedback.',
    path: '/compression-explorer',
    categories: [
        'Audio Compression',
        'Dynamic Range',
        'Music Production',
        'Sound Engineering',
        'Mixing'
    ]
};

// Define the path to your white noise MP3 file for compression testing
const WHITE_NOISE_MP3_PATH = '/white-noise/white-noise.mp3';

// --- INLINED AUDIO CONTEXT ---
// This context will manage the global Tone.js audio state.
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);

    // Function to start Tone.js audio context
    const startGlobalAudio = useCallback(async () => {
        if (Tone.context.state !== 'running') {
            try {
                console.log('AudioContext: Attempting to start global Tone.js context...');
                await Tone.start();
                setIsAudioGloballyReady(true);
                console.log('AudioContext: Tone.js context started and is running.');
            } catch (error) {
                console.error("AudioContext: Error starting Tone.js context:", error);
                setIsAudioGloballyReady(false);
            }
        } else {
            setIsAudioGloballyReady(true);
            console.log('AudioContext: Tone.js context already running.');
        }
    }, []);

    // Effect to observe Tone.js context state changes
    useEffect(() => {
        const handleToneContextChange = () => {
            if (Tone.context.state === 'running') {
                setIsAudioGloballyReady(true);
            } else {
                setIsAudioGloballyReady(false);
            }
        };

        Tone.context.on('statechange', handleToneContextChange);
        handleToneContextChange(); // Initial check on mount

        return () => {
            Tone.context.off('statechange', handleToneContextChange);
        };
    }, []);

    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, startGlobalAudio }}>
            {children}
        </AudioContext.Provider>
    );
};
// --- END INLINED AUDIO CONTEXT ---


// --- useCompressorSynth Hook ---
const useCompressorSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const playerRef = useRef(null);
    const compressorRef = useRef(null);
    const analyserRef = useRef(null); // Added analyserRef for waveform data
    const hasInitializedRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [threshold, setThreshold] = useState(-20); // dB
    const [ratio, setRatio] = useState(4); // :1
    const [knee, setKnee] = useState(30); // dB
    const [attack, setAttack] = useState(0.003); // seconds
    const [release, setRelease] = useState(0.25); // seconds

    const [isAudioReady, setIsAudioReady] = useState(false);
    const [gainReduction, setGainReduction] = useState(0); // Real-time gain reduction in dB

    // Function to create and connect Tone.js nodes
    const initAudioNodes = useCallback(async () => {
        if (hasInitializedRef.current) {
            console.log('useCompressorSynth: initAudioNodes: already initialized, skipping init.');
            return;
        }

        console.log(`useCompressorSynth: initAudioNodes called. isAudioGloballyReady: ${isAudioGloballyReady}`);

        if (isAudioGloballyReady && !playerRef.current) {
            console.log('useCompressorSynth: Proceeding with initialization of audio nodes and loading MP3...');
            try {
                // Create Tone.Player for the white noise
                const player = new Tone.Player({
                    url: WHITE_NOISE_MP3_PATH,
                    loop: true,
                    autostart: false,
                    volume: -10 // Slightly reduced volume
                });
                await player.load(WHITE_NOISE_MP3_PATH);
                console.log('useCompressorSynth: White noise loaded successfully.');

                // Create Tone.Compressor
                const compressor = new Tone.Compressor({
                    threshold: threshold,
                    ratio: ratio,
                    knee: knee,
                    attack: attack,
                    release: release,
                });

                // Create Tone.Analyser for waveform visualization
                const analyser = new Tone.Analyser("waveform", 1024); // "waveform" type for time-domain data

                // Connect the nodes: Player -> Compressor -> Analyser -> Destination
                player.connect(compressor);
                compressor.connect(analyser); // Connect compressor output to analyser
                compressor.toDestination(); // Send the compressed audio to the output

                // Store references
                playerRef.current = player;
                compressorRef.current = compressor;
                analyserRef.current = analyser; // Store analyser reference

                setIsAudioReady(true);
                hasInitializedRef.current = true;
                console.log('useCompressorSynth: Audio nodes initialized and connected.');

            } catch (error) {
                console.error("useCompressorSynth: Error initializing audio nodes or loading MP3:", error);
                setIsAudioReady(false);
                hasInitializedRef.current = false;
            }
        } else {
            console.log("useCompressorSynth: initAudioNodes skipped. Not globally ready or player already exists.");
        }
    }, [isAudioGloballyReady]); // Removed threshold, ratio, knee, attack, release from dependencies to prevent re-initialization

    // Function to dispose Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log(`useCompressorSynth: disposeAudioNodes called. playerRef.current: ${playerRef.current}`);
        if (playerRef.current) {
            console.log('useCompressorSynth: Disposing audio nodes...');
            playerRef.current.stop();
            playerRef.current.dispose();
            if (compressorRef.current) compressorRef.current.dispose();
            if (analyserRef.current) analyserRef.current.dispose(); // Dispose analyser

            playerRef.current = null;
            compressorRef.current = null;
            analyserRef.current = null; // Nullify analyser reference

            setIsPlaying(false);
            setIsAudioReady(false);
            hasInitializedRef.current = false;
            console.log('useCompressorSynth: Audio nodes disposed.');
        }
    }, []);

    // Effect to manage creation/disposal of nodes based on global audio readiness
    useEffect(() => {
        console.log(`useCompressorSynth Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
        if (isAudioGloballyReady) {
            initAudioNodes();
        } else {
            disposeAudioNodes();
        }

        return () => {
            console.log('useCompressorSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes]);

    // Effect to update compressor parameters when their state changes
    useEffect(() => {
        if (compressorRef.current && isAudioReady) {
            console.log(`useCompressorSynth: Updating compressor parameters - Threshold: ${threshold}, Ratio: ${ratio}, Knee: ${knee}, Attack: ${attack}, Release: ${release}`);
            compressorRef.current.threshold.value = threshold;
            compressorRef.current.ratio.value = ratio;
            compressorRef.current.knee.value = knee;
            compressorRef.current.attack.value = attack;
            compressorRef.current.release.value = release;
        }
    }, [threshold, ratio, knee, attack, release, isAudioReady]);

    // Effect to continuously read gain reduction
    useEffect(() => {
        let animationFrameId;
        const updateGainReduction = () => {
            if (compressorRef.current) { // Read reduction directly from compressor
                setGainReduction(compressorRef.current.reduction);
            }
            animationFrameId = requestAnimationFrame(updateGainReduction);
        };

        if (isPlaying && isAudioReady) {
            console.log('useCompressorSynth: Starting gain reduction meter.');
            animationFrameId = requestAnimationFrame(updateGainReduction);
        } else {
            console.log('useCompressorSynth: Stopping gain reduction meter.');
            cancelAnimationFrame(animationFrameId);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isPlaying, isAudioReady]);


    // Toggles playback
    const togglePlay = useCallback(async () => {
        console.log('togglePlay called. isPlaying:', isPlaying, 'isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady);

        if (!isAudioGloballyReady) {
            console.log('togglePlay: AudioContext not globally ready, attempting to start global audio...');
            await startGlobalAudio();
        }

        if (Tone.context.state === 'running' && !hasInitializedRef.current) {
            console.log('togglePlay: Global audio ready but local nodes not initialized. Attempting to initialize them now...');
            await initAudioNodes();
        }

        if (playerRef.current && isAudioReady) {
            if (isPlaying) {
                playerRef.current.stop();
                setIsPlaying(false);
                console.log('togglePlay: Audio stopped.');
            } else {
                playerRef.current.start();
                setIsPlaying(true);
                console.log('togglePlay: Audio started.');
            }
        } else {
            console.warn('togglePlay: Cannot toggle playback. Audio system not fully ready.');
        }
    }, [isPlaying, isAudioGloballyReady, isAudioReady, startGlobalAudio, initAudioNodes]);

    // Function to get real-time waveform data
    const getWaveformData = useCallback(() => {
        if (analyserRef.current) {
            return analyserRef.current.getValue(); // Returns Float32Array for waveform
        }
        return null;
    }, []);

    return {
        isPlaying,
        togglePlay,
        threshold,
        setThreshold,
        ratio,
        setRatio,
        knee,
        setKnee,
        attack,
        setAttack,
        release,
        setRelease,
        isAudioReady,
        gainReduction, // Expose real-time gain reduction
        compressorParams: { threshold, ratio, knee },
        getWaveformData, // Expose waveform data getter
    };
};
// --- End useCompressorSynth Hook ---


// --- GainReductionVisualizer Component ---
const GainReductionVisualizer = ({ threshold, ratio, knee, gainReduction, waveformDataAnalyser, width = 600, height = 200, waveformScale = 2.5 }) => { // Added waveformScale prop
    const canvasRef = useRef(null);
    const animationFrameId = useRef(null);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        // Ensure canvas is available and essential parameters are defined
        if (!canvas || threshold === undefined || ratio === undefined || knee === undefined || typeof waveformDataAnalyser !== 'function') {
            animationFrameId.current = requestAnimationFrame(draw);
            return;
        }

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);

        // Styling
        ctx.font = '10px Inter, sans-serif';
        const PADDING = 20;
        const GRID_COLOR = 'rgba(255, 255, 255, 0.07)'; // Adjusted for dark background
        const TEXT_COLOR = '#cbd5e1'; // slate-300
        const LINE_WIDTH = 2;

        // --- Background Gradient ---
        const backgroundGradient = ctx.createLinearGradient(0, 0, 0, height);
        backgroundGradient.addColorStop(0, '#1a202c'); // Darker background
        backgroundGradient.addColorStop(1, '#2d3748');
        ctx.fillStyle = backgroundGradient;
        ctx.fillRect(0, 0, width, height);

        // --- Draw Grid and Labels ---
        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 0.5;

        // X-axis (Input Level dB)
        const minDb = -80;
        const maxDb = 0;
        const dbRange = maxDb - minDb;
        const dbStep = 10;
        for (let db = minDb; db <= maxDb; db += dbStep) {
            const x = PADDING + ((db - minDb) / dbRange) * (width - PADDING * 2);
            ctx.beginPath();
            ctx.moveTo(x, PADDING);
            ctx.lineTo(x, height - PADDING);
            ctx.stroke();
            ctx.fillStyle = TEXT_COLOR;
            ctx.textAlign = 'center';
            if (db % 20 === 0) { // Label every 20dB
                ctx.fillText(`${db}dB`, x, height - PADDING + 15);
            }
        }
        ctx.fillText("Input Level (dB)", width / 2, height - 5);


        // Y-axis (Output Level dB)
        for (let db = minDb; db <= maxDb; db += dbStep) {
            const y = height - PADDING - ((db - minDb) / dbRange) * (height - PADDING * 2);
            ctx.beginPath();
            ctx.moveTo(PADDING, y);
            ctx.lineTo(width - PADDING, y);
            ctx.stroke();
            ctx.fillStyle = TEXT_COLOR;
            ctx.textAlign = 'right';
            if (db % 20 === 0) { // Label every 20dB
                ctx.fillText(`${db}dB`, PADDING - 5, y + 3);
            }
        }
        ctx.textAlign = 'center';
        ctx.save(); // Save the current state
        ctx.translate(PADDING - 15, height / 2); // Move to the center of the y-axis label position
        ctx.rotate(-Math.PI / 2); // Rotate text 90 degrees counter-clockwise
        ctx.fillText("Output Level (dB)", 0, 0);
        ctx.restore(); // Restore the original state

        // --- Draw Transfer Curve ---
        // Using passed threshold, ratio, knee from state
        ctx.strokeStyle = '#60a5fa'; // blue-400
        ctx.lineWidth = LINE_WIDTH;
        ctx.lineJoin = 'round';
        ctx.beginPath();

        const pointCount = 200;
        for (let i = 0; i <= pointCount; i++) {
            const inputDb = minDb + (i / pointCount) * dbRange;
            let outputDb;

            // Simplified model from CodePen for the transfer curve
            if (inputDb < threshold - knee / 2) { // Below knee
                outputDb = inputDb;
            } else if (inputDb > threshold + knee / 2) { // Above knee
                outputDb = threshold + (inputDb - threshold) / ratio;
            } else { // Inside knee
                const x = (inputDb - (threshold - knee / 2)) / knee;
                const y = x * (1 / ratio - 1) / 2 + (1 - 1 / ratio) / 2;
                outputDb = inputDb + knee * y;
            }

            const x = PADDING + ((inputDb - minDb) / dbRange) * (width - PADDING * 2);
            const y = height - PADDING - ((outputDb - minDb) / dbRange) * (height - PADDING * 2);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // --- Draw Real-time Gain Reduction Meter (vertical bar) ---
        if (gainReduction !== null && gainReduction !== undefined) {
            const meterWidth = 10;
            const meterHeight = height - PADDING * 2;
            const meterX = width - PADDING - meterWidth;
            const meterY = PADDING;

            // Normalize gainReduction (it's typically a negative dB value, e.g., -10dB)
            // We want it to be a positive value from 0 (no reduction) up to max reduction
            const maxReduction = -60;
            const normalizedReduction = Math.max(0, Math.min(1, gainReduction / maxReduction)); // 0 to 1 scale

            const fillHeight = meterHeight * normalizedReduction;
            const fillY = meterY + (meterHeight - fillHeight);

            // Background of the meter
            ctx.fillStyle = '#4b5563'; // gray-700
            ctx.fillRect(meterX, meterY, meterWidth, meterHeight);

            // Filled part of the meter (red for reduction)
            ctx.fillStyle = '#dc2626'; // red-600
            ctx.fillRect(meterX, fillY, meterWidth, fillHeight);

            // Label for gain reduction
            ctx.fillStyle = TEXT_COLOR;
            ctx.textAlign = 'center';
            ctx.fillText(`${gainReduction.toFixed(1)}dB`, meterX + meterWidth / 2, height - PADDING + 15);
        }

        // --- Draw Waveform ---
        const waveformData = waveformDataAnalyser();
        if (waveformData && waveformData.length > 0) {
            ctx.strokeStyle = '#22d3ee'; // Cyan for waveform
            ctx.lineWidth = 1.5;
            ctx.beginPath();

            const sliceHeight = 50; // Height allocated for the waveform visualization
            // Position waveform starting from the bottom of the canvas, moving up by PADDING, then centering the slice
            const waveformStartY = height - PADDING - sliceHeight; // Top edge of the waveform area
            const waveformCenterY = waveformStartY + (sliceHeight / 2); // Center line for waveform

            for (let i = 0; i < waveformData.length; i++) {
                const x = PADDING + (i / waveformData.length) * (width - PADDING * 2);
                // Map audio data (-1 to 1) to canvas Y-coordinates, centered within its slice, and scaled
                const y = waveformCenterY + (waveformData[i] * (sliceHeight / 2) * waveformScale); // Applied waveformScale

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }

        animationFrameId.current = requestAnimationFrame(draw);
    }, [threshold, ratio, knee, gainReduction, waveformDataAnalyser, width, height, waveformScale]); // Added waveformScale to dependencies

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = width;
            canvas.height = height;
        }
        animationFrameId.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [draw]);

    return (
        <div className="w-full max-w-5xl mx-auto p-4 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 shadow-2xl border border-slate-700 text-white">
            <canvas
                ref={canvasRef}
                className="w-full h-full rounded-lg"
                style={{ display: 'block', borderRadius: '0.75rem' }}
            />
        </div>
    );
};
// --- End GainReductionVisualizer Component ---


// --- CompressionExplorer Component (Main Component) ---
const CompressionExplorerContent = () => {
    const {
        isPlaying, togglePlay,
        threshold, setThreshold,
        ratio, setRatio,
        knee, setKnee,
        attack, setAttack,
        release, setRelease,
        isAudioReady,
        gainReduction,
        compressorParams,
        getWaveformData,
    } = useCompressorSynth();

    const visualizerWidth = 700;
    const visualizerHeight = 250;

    const getExplanation = (param) => {
        switch (param) {
            case 'threshold':
                return "The level (in dB) at which the compressor begins to reduce the gain.";
            case 'ratio':
                return "The amount of gain reduction applied once the threshold is exceeded. E.g., a 4:1 ratio means for every 4dB the input goes over the threshold, the output only increases by 1dB.";
            case 'knee':
                return "The 'softness' of the transition into compression once the signal crosses the threshold. A softer knee means a more gradual transition.";
            case 'attack':
                return "The time it takes for the compressor to react and apply full gain reduction after the signal exceeds the threshold (in seconds).";
            case 'release':
                return "The time it takes for the compressor to return to its original state (stop reducing gain) after the signal drops below the threshold (in seconds).";
            default:
                return "Adjust parameters to hear and see the effect of compression!";
        }
    };

    return (
        <>
            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
                pageId="compression-explorer" 
                tool={compressionExplorerTool}
                customData={{}}
            />

            <div
                className="min-h-screen flex flex-col items-center p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #d4f7e5 0%, #b9e0d4 50%, #9bc9c9 100%)', // Greenish-blue gradient
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                {/* Floating Icons Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='25' cy='25' r='3' fill='%236b7280'/%3E%3Ccircle cx='75' cy='25' r='3' fill='%236b7280'/%3E%3Ccircle cx='50' cy='50' r='3' fill='%236b7280'/%3E%3Ccircle cx='25' cy='75' r='3' fill='%236b7280'/%3E%3Ccircle cx='75' cy='75' r='3' fill='%236b7280'/%3E%3C/svg%3E\")",
                        backgroundSize: '200px 200px'
                    }}
                ></div>

                <div className="text-center mb-10 z-10">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <BarChart2 size={48} className="text-gray-700" />
                        <h1 className="text-5xl font-extrabold text-gray-900 drop-shadow-lg">Compression Explorer</h1>
                    </div>
                    {!isAudioReady && (
                        <p className="text-gray-700 text-sm mt-4 animate-pulse">
                            Click "Play Audio Loop" to activate audio and begin.
                        </p>
                    )}
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col items-center space-y-8 z-10 border border-gray-200">

                    {/* Play/Pause Button */}
                    <button
                        type="button"
                        onClick={togglePlay}
                        className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all duration-300
                                    ${isPlaying
                                    ? 'bg-blue-700 hover:bg-blue-800 text-white'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'}
                                    ${!isAudioReady && !isPlaying ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        {isPlaying ? "Stop Audio Loop" : "Play Audio Loop"}
                    </button>

                    {/* Gain Reduction Visualizer */}
                    <div className="w-full flex justify-center">
                        {isAudioReady && compressorParams && getWaveformData ? (
                            <GainReductionVisualizer
                                threshold={threshold}
                                ratio={ratio}
                                knee={knee}
                                gainReduction={gainReduction}
                                waveformDataAnalyser={getWaveformData}
                                width={visualizerWidth}
                                height={visualizerHeight}
                                waveformScale={3} // Passed a default scale of 3 for more visibility
                            />
                        ) : (
                            <div className="w-full bg-white/60 rounded-lg shadow-inner border border-gray-200 flex items-center justify-center"
                                style={{ width: visualizerWidth, height: visualizerHeight }}>
                                <p className="text-gray-500">Visualizer will appear after audio starts.</p>
                            </div>
                        )}
                    </div>

                    {/* Compressor Parameter Sliders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full mt-8">
                        {/* Threshold Slider */}
                        <div className="flex flex-col items-center">
                            <label className="text-gray-800 font-medium mb-2">Threshold: {threshold.toFixed(1)} dB</label>
                            <input
                                type="range"
                                min="-60"
                                max="0"
                                step="1"
                                value={threshold}
                                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                className="w-full accent-blue-600 h-2 rounded-lg appearance-none cursor-pointer bg-blue-100"
                                disabled={!isAudioReady}
                            />
                            <p className="text-gray-700 text-sm mt-1 italic">{getExplanation('threshold')}</p>
                        </div>

                        {/* Ratio Slider */}
                        <div className="flex flex-col items-center">
                            <label className="text-gray-800 font-medium mb-2">Ratio: {ratio.toFixed(1)}:1</label>
                            <input
                                type="range"
                                min="1"
                                max="20"
                                step="0.5"
                                value={ratio}
                                onChange={(e) => setRatio(parseFloat(e.target.value))}
                                className="w-full accent-blue-600 h-2 rounded-lg appearance-none cursor-pointer bg-blue-100"
                                disabled={!isAudioReady}
                            />
                            <p className="text-gray-700 text-sm mt-1 italic">{getExplanation('ratio')}</p>
                        </div>

                        {/* Knee Slider */}
                        <div className="flex flex-col items-center">
                            <label className="text-gray-800 font-medium mb-2">Knee: {knee.toFixed(1)} dB</label>
                            <input
                                type="range"
                                min="0"
                                max="40"
                                step="1"
                                value={knee}
                                onChange={(e) => setKnee(parseFloat(e.target.value))}
                                className="w-full accent-blue-600 h-2 rounded-lg appearance-none cursor-pointer bg-blue-100"
                                disabled={!isAudioReady}
                            />
                            <p className="text-gray-700 text-sm mt-1 italic">{getExplanation('knee')}</p>
                        </div>

                        {/* Attack Slider */}
                        <div className="flex flex-col items-center">
                            <label className="text-gray-800 font-medium mb-2">Attack: {attack.toFixed(3)} s</label>
                            <input
                                type="range"
                                min="0.001"
                                max="1"
                                step="0.001"
                                value={attack}
                                onChange={(e) => setAttack(parseFloat(e.target.value))}
                                className="w-full accent-blue-600 h-2 rounded-lg appearance-none cursor-pointer bg-blue-100"
                                disabled={!isAudioReady}
                            />
                            <p className="text-gray-700 text-sm mt-1 italic">{getExplanation('attack')}</p>
                        </div>

                        {/* Release Slider */}
                        <div className="flex flex-col items-center">
                            <label className="text-gray-800 font-medium mb-2">Release: {release.toFixed(3)} s</label>
                            <input
                                type="range"
                                min="0.01"
                                max="1"
                                step="0.01"
                                value={release}
                                onChange={(e) => setRelease(parseFloat(e.target.value))}
                                className="w-full accent-blue-600 h-2 rounded-lg appearance-none cursor-pointer bg-blue-100"
                                disabled={!isAudioReady}
                            />
                            <p className="text-gray-700 text-sm mt-1 italic">{getExplanation('release')}</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// This is the default export, wrapping CompressionExplorerContent with its own AudioContextProvider
const CompressionExplorer = () => {
    return (
        <AudioContextProvider>
            <CompressionExplorerContent />
        </AudioContextProvider>
    );
}

export default CompressionExplorer;
