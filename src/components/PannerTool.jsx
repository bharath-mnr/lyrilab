import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause } from 'lucide-react';
import SEOHead from './SEOHead';



const pannerTool = {
    id: 'panner-tool',
    name: 'Audio Panner',
    description: 'Control stereo positioning with precision panning for professional mixing.',
    path: '/panner-tool',
    categories: [
        'Audio Mixing',
        'Stereo Imaging',
        'Sound Placement',
        'Music Production',
        'Panning'
    ]
};


// Define the path to your white noise MP3 file
const WHITE_NOISE_MPPA_PATH = '/white-noise/white-noise.mp3';

// --- INLINED AUDIO CONTEXT (to make this a single JSX file) ---
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);

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

    useEffect(() => {
        const handleToneContextChange = () => {
            if (Tone.context.state === 'running') {
                setIsAudioGloballyReady(true);
            } else {
                setIsAudioGloballyReady(false);
            }
        };

        Tone.context.on('statechange', handleToneContextChange);
        handleToneContextChange(); // Initial check

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


// Custom hook to manage the Tone.js Panner and Player
const usePannerSynth = () => {
    // This hook must be called inside a component that is a child of AudioContextProvider
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);
    const playerRef = useRef(null);
    const pannerRef = useRef(null);
    const hasInitializedRef = useRef(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [pan, setPan] = useState(0); // -1 (left) to 1 (right)
    const [isAudioReady, setIsAudioReady] = useState(false);

    const initAudioNodes = useCallback(async () => {
        if (hasInitializedRef.current) {
            console.log('usePannerSynth: initAudioNodes: already initialized, skipping init.');
            return;
        }

        console.log(`usePannerSynth: initAudioNodes called. isAudioGloballyReady: ${isAudioGloballyReady}`);

        if (isAudioGloballyReady && !playerRef.current) {
            console.log('usePannerSynth: Proceeding with initialization of audio nodes and loading MP3...');
            try {
                const player = new Tone.Player({
                    url: WHITE_NOISE_MPPA_PATH,
                    loop: true,
                    autostart: false,
                    volume: -15 // Slightly reduced volume for white noise
                });
                await player.load(WHITE_NOISE_MPPA_PATH);
                console.log('usePannerSynth: White noise loaded successfully.');

                // Initialize Panner with a default value (e.g., 0 for center)
                // The 'pan' state will then update this value in a separate effect.
                const panner = new Tone.Panner(0).toDestination();

                player.connect(panner);

                playerRef.current = player;
                pannerRef.current = panner;

                setIsAudioReady(true);
                hasInitializedRef.current = true;
                console.log('usePannerSynth: Audio nodes initialized and connected.');

            } catch (error) {
                console.error("usePannerSynth: Error initializing audio nodes or loading MP3:", error);
                setIsAudioReady(false);
                hasInitializedRef.current = false;
            }
        } else {
            console.log("usePannerSynth: initAudioNodes skipped. Not globally ready or player already exists.");
        }
    }, [isAudioGloballyReady]); // Removed 'pan' from dependencies to prevent re-initialization

    const disposeAudioNodes = useCallback(() => {
        console.log(`usePannerSynth: disposeAudioNodes called. playerRef.current: ${playerRef.current}`);
        if (playerRef.current) {
            console.log('usePannerSynth: Disposing audio nodes...');
            playerRef.current.stop();
            playerRef.current.dispose();
            if (pannerRef.current) pannerRef.current.dispose();

            playerRef.current = null;
            pannerRef.current = null;

            setIsPlaying(false);
            setIsAudioReady(false);
            hasInitializedRef.current = false;
            console.log('usePannerSynth: Audio nodes disposed.');
        }
    }, []);

    useEffect(() => {
        console.log(`usePannerSynth Effect (Node Lifecycle): isAudioGloballyReady = ${isAudioGloballyReady}`);
        if (isAudioGloballyReady) {
            initAudioNodes();
        } else {
            disposeAudioNodes();
        }

        return () => {
            console.log('usePannerSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, [isAudioGloballyReady, initAudioNodes, disposeAudioNodes]);

    // Effect to update panner parameter when pan state changes
    useEffect(() => {
        if (pannerRef.current && isAudioReady) {
            // This is the correct place to update the pan value in real-time
            pannerRef.current.pan.value = pan;
        }
    }, [pan, isAudioReady]);

    const togglePlay = useCallback(async () => {
        console.log('togglePlay called. isPlaying:', isPlaying, 'isAudioGloballyReady:', isAudioGloballyReady, 'isAudioReady:', isAudioReady);

        if (!isAudioGloballyReady) {
            console.log('togglePlay: AudioContext not globally ready, attempting to start global audio...');
            await startGlobalAudio();
            await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for state propagation
        }

        if (isAudioGloballyReady && !hasInitializedRef.current) {
            console.log('togglePlay: Global audio ready but local nodes not initialized. Attempting to initialize them now...');
            await initAudioNodes();
            await new Promise(resolve => setTimeout(resolve, 10)); // Small delay for state propagation
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

    return {
        isPlaying,
        togglePlay,
        pan,
        setPan,
        isAudioReady,
    };
};

// src/components/PannerTool.jsx (Main component)
const PannerToolContent = () => { // Renamed to PannerToolContent
    const {
        isPlaying,
        togglePlay,
        pan,
        setPan,
        isAudioReady,
    } = usePannerSynth();

    const pannerAreaRef = useRef(null);
    const isDragging = useRef(false);

    const handleMouseDown = useCallback((e) => {
        if (!isAudioReady || !pannerAreaRef.current) return;
        isDragging.current = true;
        updatePanFromMouseEvent(e);
        // Add global event listeners to handle dragging even if mouse leaves the element
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [isAudioReady]);

    const updatePanFromMouseEvent = useCallback((e) => {
        if (!pannerAreaRef.current) return;

        const rect = pannerAreaRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left; // X position relative to the element
        const newPan = (x / rect.width) * 2 - 1; // Map 0-width to -1 to 1

        setPan(Math.max(-1, Math.min(1, newPan))); // Clamp between -1 and 1
    }, [setPan]);

    const handleMouseMove = useCallback((e) => {
        if (isDragging.current) {
            updatePanFromMouseEvent(e);
        }
    }, [updatePanFromMouseEvent]);

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
        // Remove global event listeners
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    // Handle touch events for mobile responsiveness
    const handleTouchStart = useCallback((e) => {
        if (!isAudioReady || !pannerAreaRef.current) return;
        isDragging.current = true;
        updatePanFromTouchEvent(e);
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('touchcancel', handleTouchEnd);
    }, [isAudioReady]);

    const updatePanFromTouchEvent = useCallback((e) => {
        if (!pannerAreaRef.current || !e.touches[0]) return;

        const rect = pannerAreaRef.current.getBoundingClientRect();
        const x = e.touches[0].clientX - rect.left;
        const newPan = (x / rect.width) * 2 - 1;

        setPan(Math.max(-1, Math.min(1, newPan)));
    }, [setPan]);

    const handleTouchMove = useCallback((e) => {
        if (isDragging.current) {
            e.preventDefault(); // Prevent scrolling while dragging
            updatePanFromTouchEvent(e);
        }
    }, [updatePanFromTouchEvent]);

    const handleTouchEnd = useCallback(() => {
        isDragging.current = false;
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('touchcancel', handleTouchEnd);
    }, [handleTouchMove]);


    const getPanText = (panValue) => {
        if (panValue < -0.9) return "Full Left";
        if (panValue > 0.9) return "Full Right";
        if (Math.abs(panValue) < 0.05) return "Center"; // A small tolerance for "Center"
        return panValue < 0 ? `Left ${Math.abs(panValue * 100).toFixed(0)}%` : `Right ${Math.abs(panValue * 100).toFixed(0)}%`;
    };

    // Calculate handle position based on pan value
    const handlePositionX = ((pan + 1) / 2) * 100; // Convert -1 to 1 to 0% to 100%

    return (
        <>
            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
                pageId="panner-tool" 
                tool={pannerTool}
                customData={{}}
            />

            <div
                className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #f7d4e5 0%, #e0b9d4 50%, #c99bc9 100%)', // Purplish-pink gradient
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                {/* Background pattern - for aesthetic purposes */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%236b7280' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                            backgroundSize: '200px 200px'
                        }}
                    ></div>

                    {/* Main title and description */}
                    <div className="text-center mb-10 z-10">
                        <h1 className="text-5xl font-extrabold text-gray-900 drop-shadow-lg mb-4">Stereo Panner Tool</h1>
                        <p className="text-gray-700 text-lg">Drag the circle to control the stereo balance.</p>
                        {!isAudioReady && (
                            <p className="text-gray-700 text-sm mt-4 animate-pulse">
                                Click "Play Audio Loop" to activate audio.
                            </p>
                        )}
                    </div>

                    {/* Main control panel */}
                    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg w-full max-w-lg flex flex-col items-center space-y-8 z-10 border border-gray-200">
                        {/* Play/Pause Button */}
                        <button
                            type="button"
                            onClick={togglePlay}
                            className={`px-8 py-4 rounded-full font-bold text-lg flex items-center gap-3 transition-all duration-300
                                        ${isPlaying
                                    ? 'bg-purple-700 hover:bg-purple-800 text-white'
                                    : 'bg-purple-500 hover:bg-purple-600 text-white'}
                                        ${!isAudioReady && !isPlaying ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                            {isPlaying ? "Stop Audio Loop" : "Play Audio Loop"}
                        </button>

                        {/* Panning Area - the core interactive element */}
                        <div
                            ref={pannerAreaRef}
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleTouchStart} // Added touch event
                            className={`relative w-full max-w-md h-24 bg-gradient-to-r from-blue-400 via-gray-300 to-red-400 rounded-lg shadow-inner cursor-grab active:cursor-grabbing flex items-center justify-between px-4 text-white font-bold text-xl select-none
                                        ${!isAudioReady ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            style={{
                                pointerEvents: isAudioReady ? 'auto' : 'none', // Disable pointer events if audio not ready
                            }}
                        >
                            <span>L</span>
                            <div
                                className="absolute w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-800 font-bold transition-transform duration-75 ease-out"
                                style={{
                                    left: `${handlePositionX}%`,
                                    transform: 'translateX(-50%)',
                                    border: '3px solid #6b7280'
                                }}
                            >
                                {/* You could put an icon here if needed */}
                            </div>
                            <span>R</span>
                        </div>

                        {/* Current Pan Value Display */}
                        <div className="text-xl font-semibold text-gray-800 mt-4">
                            Pan: {getPanText(pan)} ({pan.toFixed(2)})
                        </div>
                    </div>
                </div>
        </>
    );
};

// This is the default export, wrapping PannerToolContent with its own AudioContextProvider
const PannerTool = () => {
    return (
        <AudioContextProvider>
            <PannerToolContent />
        </AudioContextProvider>
    );
}

export default PannerTool;
