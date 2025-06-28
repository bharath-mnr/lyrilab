import React, { useState, useEffect, useRef, useCallback, createContext, useContext, useMemo } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Split, Merge } from 'lucide-react'; // Icons for Mid-Side

// Define the path to your white noise MP3 file.
// For a true mid-side effect, a stereo source is recommended.
// This white noise is likely mono, meaning the 'Side' channel will be silent.
const WHITE_NOISE_MP3_PATH = '/white-noise/white-noise.mp3';

// --- INLINED AUDIO CONTEXT ---
// This context manages the global Tone.js audio state.
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


// --- useMidSideSynth Hook ---
const useMidSideSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const playerRef = useRef(null);
    const midSideSplitRef = useRef(null);
    const midGainRef = useRef(null);
    const sideGainRef = useRef(null);
    const midSideMergeRef = useRef(null);
    const hasInitializedRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [midGainDb, setMidGainDb] = useState(0); // in dB
    const [sideGainDb, setSideGainDb] = useState(0); // in dB

    const [isAudioReady, setIsAudioReady] = useState(false);

    // Function to create and connect Tone.js nodes for Mid-Side processing
    const initAudioNodes = useCallback(async () => {
        if (hasInitializedRef.current) {
            console.log('useMidSideSynth: initAudioNodes: already initialized, skipping init.');
            return;
        }

        console.log(`useMidSideSynth: initAudioNodes called. isAudioGloballyReady: ${isAudioGloballyReady}`);

        if (isAudioGloballyReady && !playerRef.current) {
            console.log('useMidSideSynth: Proceeding with initialization of audio nodes and loading MP3...');
            try {
                // Create Tone.Player for the audio source
                const player = new Tone.Player({
                    url: WHITE_NOISE_MP3_PATH,
                    loop: true,
                    autostart: false,
                    volume: -15 // Slightly reduced volume
                });
                await player.load(WHITE_NOISE_MP3_PATH);
                console.log('useMidSideSynth: Audio sample loaded successfully.');

                // Mid/Side Split and Merge
                const midSideSplit = new Tone.MidSideSplit();
                const midGain = new Tone.Gain(Tone.dbToGain(midGainDb));
                const sideGain = new Tone.Gain(Tone.dbToGain(sideGainDb));
                const midSideMerge = new Tone.MidSideMerge();

                // Connect the chain: Player -> Split -> Gains -> Merge -> Destination
                player.connect(midSideSplit);
                midSideSplit.mid.connect(midGain);
                midSideSplit.side.connect(sideGain);
                midGain.connect(midSideMerge.mid);
                sideGain.connect(midSideMerge.side);
                midSideMerge.toDestination();

                // Store references
                playerRef.current = player;
                midSideSplitRef.current = midSideSplit;
                midGainRef.current = midGain;
                sideGainRef.current = sideGain;
                midSideMergeRef.current = midSideMerge;

                setIsAudioReady(true);
                hasInitializedRef.current = true;
                console.log('useMidSideSynth: Audio nodes initialized and connected.');

            } catch (error) {
                console.error("useMidSideSynth: Error initializing audio nodes or loading MP3:", error);
                setIsAudioReady(false);
                hasInitializedRef.current = false;
            }
        } else {
            console.log("useMidSideSynth: initAudioNodes skipped. Not globally ready or player already exists.");
        }
    }, [isAudioGloballyReady]); // Dependencies for initial setup are intentionally limited

    // Function to dispose Tone.js nodes
    const disposeAudioNodes = useCallback(() => {
        console.log(`useMidSideSynth: disposeAudioNodes called. playerRef.current: ${playerRef.current}`);
        if (playerRef.current) {
            console.log('useMidSideSynth: Disposing audio nodes...');
            playerRef.current.stop();
            playerRef.current.dispose();
            if (midSideSplitRef.current) midSideSplitRef.current.dispose();
            if (midGainRef.current) midGainRef.current.dispose();
            if (sideGainRef.current) sideGainRef.current.dispose();
            if (midSideMergeRef.current) midSideMergeRef.current.dispose();

            playerRef.current = null;
            midSideSplitRef.current = null;
            midGainRef.current = null;
            sideGainRef.current = null;
            midSideMergeRef.current = null;

            setIsPlaying(false);
            setIsAudioReady(false);
            hasInitializedRef.current = false;
            console.log('useMidSideSynth: Audio nodes disposed.');
        }
    }, []);

    // Effect to manage creation/disposal of nodes based on global audio readiness
    useEffect(() => {
        console.log(`useMidSideSynth Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
        if (isAudioGloballyReady) {
            initAudioNodes();
        } else {
            disposeAudioNodes();
        }

        return () => {
            console.log('useMidSideSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes]);

    // Effect to update Mid/Side gain parameters when their state changes
    useEffect(() => {
        if (midGainRef.current && sideGainRef.current && isAudioReady) {
            console.log(`useMidSideSynth: Updating Mid/Side gains - Mid: ${midGainDb.toFixed(1)} dB, Side: ${sideGainDb.toFixed(1)} dB`);
            midGainRef.current.gain.value = Tone.dbToGain(midGainDb);
            sideGainRef.current.gain.value = Tone.dbToGain(sideGainDb);
        }
    }, [midGainDb, sideGainDb, isAudioReady]);

    // Toggles playback of the audio source
    const togglePlay = useCallback(async () => {
        console.log('togglePlay called. isPlaying:', isPlaying, 'isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady);

        // Ensure global audio context is running
        if (!isAudioGloballyReady) {
            console.log('togglePlay: AudioContext not globally ready, attempting to start global audio...');
            await startGlobalAudio();
        }

        // Initialize local audio nodes if not already done and global context is ready
        if (Tone.context.state === 'running' && !hasInitializedRef.current) {
            console.log('togglePlay: Global audio ready but local nodes not initialized. Attempting to initialize them now...');
            await initAudioNodes();
        }

        // Now, proceed with playback toggle if everything is ready
        if (playerRef.current && hasInitializedRef.current && isAudioReady) {
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

    return {
        isPlaying,
        togglePlay,
        midGainDb,
        setMidGainDb,
        sideGainDb,
        setSideGainDb,
        isAudioReady,
    };
};
// --- End useMidSideSynth Hook ---


// --- MidSideXYController Component ---
const MidSideXYController = ({ midGain, sideGain, setMidGain, setSideGain, width, height, disabled }) => {
    const canvasRef = useRef(null);
    const isDragging = useRef(false);
    const animationFrameId = useRef(null);

    // Map a value from one range to another
    const mapRange = useCallback((value, inMin, inMax, outMin, outMax) => {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }, []);

    // Draw function for the canvas
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#2d3748'; // Darker background for the controller area
        ctx.fillRect(0, 0, width, height);

        // Grid lines (subtle)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 0.5;
        // Vertical lines
        for (let i = 0; i <= 10; i++) {
            const x = (width / 10) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        // Horizontal lines
        for (let i = 0; i <= 10; i++) {
            const y = (height / 10) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Center lines (more prominent)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width / 2, 0); // Vertical center line
        ctx.lineTo(width / 2, height);
        ctx.moveTo(0, height / 2); // Horizontal center line
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Labels for axes
        ctx.fillStyle = '#cbd5e1'; // slate-300
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // X-axis labels (Side Gain)
        ctx.fillText('-20 dB', width * 0.05, height - 10);
        ctx.fillText('+10 dB', width * 0.95, height - 10);
        ctx.fillText('SIDE', width / 2, height - 10);

        // Y-axis labels (Mid Gain)
        ctx.textAlign = 'left';
        ctx.fillText('+10 dB', 5, height * 0.05);
        ctx.textBaseline = 'bottom';
        ctx.fillText('-20 dB', 5, height * 0.95);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('MID', 0, 0);
        ctx.restore();


        // Draw draggable circle
        const circleRadius = 15;
        const xPos = mapRange(sideGain, -20, 10, 0, width);
        const yPos = mapRange(midGain, -20, 10, height, 0); // Y-axis inverted for canvas

        ctx.beginPath();
        ctx.arc(xPos, yPos, circleRadius, 0, Math.PI * 2);
        ctx.fillStyle = disabled ? 'rgba(100, 100, 100, 0.7)' : '#60a5fa'; // Blue circle, dimmed when disabled
        ctx.fill();
        ctx.strokeStyle = disabled ? 'rgba(200, 200, 200, 0.5)' : '#e0f2fe'; // Light border
        ctx.lineWidth = 2;
        ctx.stroke();

        animationFrameId.current = requestAnimationFrame(draw);
    }, [midGain, sideGain, width, height, mapRange, disabled]);

    // Handle mouse/touch events
    const updateGainsFromCoords = useCallback((clientX, clientY) => {
        const canvas = canvasRef.current;
        if (disabled || !canvas) return;

        const rect = canvas.getBoundingClientRect();
        const xInCanvas = clientX - rect.left;
        const yInCanvas = clientY - rect.top;

        // Clamp coordinates to canvas bounds
        const clampedX = Math.max(0, Math.min(width, xInCanvas));
        const clampedY = Math.max(0, Math.min(height, yInCanvas));

        // Map clamped coordinates back to gain ranges
        const newSideGain = mapRange(clampedX, 0, width, -20, 10);
        const newMidGain = mapRange(clampedY, height, 0, -20, 10); // Y-axis inverted

        setSideGain(newSideGain);
        setMidGain(newMidGain);
    }, [width, height, mapRange, setMidGain, setSideGain, disabled]);

    const handleInteractionStart = useCallback((e) => {
        if (disabled) return;
        isDragging.current = true;
        // Prevent default touch behavior (scrolling, zooming) when interacting with the canvas
        if (e.touches) e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        updateGainsFromCoords(clientX, clientY);
    }, [updateGainsFromCoords, disabled]);

    const handleInteractionMove = useCallback((e) => {
        if (!isDragging.current || disabled) return;
        if (e.touches) e.preventDefault(); // Prevent default touch behavior
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        updateGainsFromCoords(clientX, clientY);
    }, [updateGainsFromCoords, disabled]);

    const handleInteractionEnd = useCallback(() => {
        isDragging.current = false;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = width;
        canvas.height = height;

        const currentCanvas = canvasRef.current;
        currentCanvas.addEventListener('mousedown', handleInteractionStart);
        currentCanvas.addEventListener('mousemove', handleInteractionMove);
        window.addEventListener('mouseup', handleInteractionEnd); // Use window for mouseup

        currentCanvas.addEventListener('touchstart', handleInteractionStart, { passive: false });
        currentCanvas.addEventListener('touchmove', handleInteractionMove, { passive: false });
        window.addEventListener('touchend', handleInteractionEnd); // Use window for touchend
        window.addEventListener('touchcancel', handleInteractionEnd); // Handle touch cancel

        animationFrameId.current = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(animationFrameId.current);
            currentCanvas.removeEventListener('mousedown', handleInteractionStart);
            currentCanvas.removeEventListener('mousemove', handleInteractionMove);
            window.removeEventListener('mouseup', handleInteractionEnd);

            currentCanvas.removeEventListener('touchstart', handleInteractionStart);
            currentCanvas.removeEventListener('touchmove', handleInteractionMove);
            window.removeEventListener('touchend', handleInteractionEnd);
            window.removeEventListener('touchcancel', handleInteractionEnd);
        };
    }, [draw, width, height, handleInteractionStart, handleInteractionMove, handleInteractionEnd]);

    return (
        <div className={`relative w-full overflow-hidden rounded-xl shadow-inner ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-grab'}`}
             style={{ maxWidth: `${width}px`, height: `${height}px` }}>
            <canvas
                ref={canvasRef}
                className="block w-full h-full"
                tabIndex={disabled ? -1 : 0} // Make canvas focusable for keyboard interaction if not disabled
                style={{ filter: disabled ? 'grayscale(100%)' : 'none' }}
            />
        </div>
    );
};
// --- End MidSideXYController Component ---


// --- MidSideExplorer Component (Main App Component) ---
const MidSideExplorerContent = () => {
    const {
        isPlaying, togglePlay,
        midGainDb, setMidGainDb,
        sideGainDb, setSideGainDb,
        isAudioReady,
    } = useMidSideSynth();

    const controllerWidth = 400;
    const controllerHeight = 300;

    return (
        <div
            className="min-h-screen flex flex-col items-center p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #d4e7f7 0%, #b9d8e0 50%, #9cc9c9 100%)', // Light blue/cyan gradient
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* Floating Icons Background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%2364748b' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            <div className="text-center mb-10 z-10">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <Split size={48} className="text-teal-700" />
                    <Merge size={48} className="text-teal-700" />
                    <h1 className="text-5xl font-extrabold text-teal-900 drop-shadow-lg">Mid-Side Explorer</h1>
                </div>
                {!isAudioReady && (
                    <p className="text-teal-700 text-sm mt-4 animate-pulse">
                        Click "Play Audio" to activate audio and begin.
                    </p>
                )}
                <p className="text-teal-800 text-sm mt-2">
                    Note: For a strong effect, use a stereo audio source. This explorer uses mono white noise, so side processing will have minimal effect.
                </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg w-full max-w-2xl flex flex-col items-center space-y-8 z-10 border border-teal-200">

                {/* Play/Pause Button */}
                <button
                    type="button"
                    onClick={togglePlay}
                    className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all duration-300
                                ${isPlaying
                                ? 'bg-teal-700 hover:bg-teal-800 text-white'
                                : 'bg-teal-500 hover:bg-teal-600 text-white'}
                                ${!isAudioReady && !isPlaying ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                    {isPlaying ? "Stop Audio" : "Play Audio"}
                </button>

                {/* Mid-Side X-Y Controller */}
                <div className="flex flex-col items-center gap-4 w-full">
                    <MidSideXYController
                        midGain={midGainDb}
                        setMidGain={setMidGainDb}
                        sideGain={sideGainDb}
                        setSideGain={setSideGainDb}
                        width={controllerWidth}
                        height={controllerHeight}
                        disabled={!isAudioReady}
                    />
                    <div className="flex justify-around w-full max-w-sm text-lg font-semibold text-teal-800">
                        <span>Mid: {midGainDb.toFixed(1)} dB</span>
                        <span>Side: {sideGainDb.toFixed(1)} dB</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// This is the default export for the standalone Mid-Side Explorer
const MidSideExplorer = () => {
    return (
        <AudioContextProvider>
            <MidSideExplorerContent />
        </AudioContextProvider>
    );
}

export default MidSideExplorer;
