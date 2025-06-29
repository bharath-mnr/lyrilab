// src/components/VirtualPiano.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Import useMemo
import { Volume2, VolumeX, Music, RotateCw } from 'lucide-react';
import usePianoSynth from '../hooks/usePianoSynth';
import PianoUI from './PianoUI';

const VirtualPiano = () => {
    const [pressedKeys, setPressedKeys] = useState(new Set());
    const [isLandscape, setIsLandscape] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const {
        playNote,
        stopNote,
        isAudioReady,
        isSynthMuted,
        toggleMute,
        synthVolume,
        setSynthVolume
    } = usePianoSynth(0.7, false);

    // Original full piano keys configuration (3 octaves)
    const fullPianoKeys = useMemo(() => ([
        // C3 to B3 (1st Octave)
        { note: 'C3', type: 'white', key: 'z' },
        { note: 'C#3', type: 'black', key: 's' },
        { note: 'D3', type: 'white', key: 'x' },
        { note: 'D#3', type: 'black', key: 'd' },
        { note: 'E3', type: 'white', key: 'c' },
        { note: 'F3', type: 'white', key: 'v' },
        { note: 'F#3', type: 'black', key: 'g' },
        { note: 'G3', type: 'white', key: 'b' },
        { note: 'G#3', type: 'black', key: 'h' },
        { note: 'A3', type: 'white', key: 'n' },
        { note: 'A#3', type: 'black', key: 'j' },
        { note: 'B3', type: 'white', key: 'm' },

        // C4 to B4 (2nd Octave)
        { note: 'C4', type: 'white', key: 'q' },
        { note: 'C#4', type: 'black', key: '2' },
        { note: 'D4', type: 'white', key: 'w' },
        { note: 'D#4', type: 'black', key: '3' },
        { note: 'E4', type: 'white', key: 'e' },
        { note: 'F4', type: 'white', key: 'r' },
        { note: 'F#4', type: 'black', key: '5' },
        { note: 'G4', type: 'white', key: 't' },
        { note: 'G#4', type: 'black', key: '6' },
        { note: 'A4', type: 'white', key: 'y' },
        { note: 'A#4', type: 'black', key: '7' },
        { note: 'B4', type: 'white', key: 'u' },

        // C5 to B5 (3rd Octave)
        { note: 'C5', type: 'white', key: 'i' },
        { note: 'C#5', type: 'black', key: '9' },
        { note: 'D5', type: 'white', key: 'o' },
        { note: 'D#5', type: 'black', key: '0' },
        { note: 'E5', type: 'white', key: 'p' },
        { note: 'F5', type: 'white', key: '[' },
        { note: 'F#5', type: 'black', key: '=' },
        { note: 'G5', type: 'white', key: ']' },
        { note: 'G#5', type: 'black', key: '\\' },
        { note: 'A5', type: 'white', key: ';' },
        { note: 'A#5', type: 'black', key: '\'' },
        { note: 'B5', type: 'white', key: 'l' }
    ]), []); // useMemo to prevent re-creation on every render

    // Define 2-octave range for mobile
    const twoOctaveKeys = useMemo(() => ([
        // C4 to B4 (1st Octave for mobile focus)
        { note: 'C4', type: 'white', key: 'q' },
        { note: 'C#4', type: 'black', key: '2' },
        { note: 'D4', type: 'white', key: 'w' },
        { note: 'D#4', type: 'black', key: '3' },
        { note: 'E4', type: 'white', key: 'e' },
        { note: 'F4', type: 'white', key: 'r' },
        { note: 'F#4', type: 'black', key: '5' },
        { note: 'G4', type: 'white', key: 't' },
        { note: 'G#4', type: 'black', key: '6' },
        { note: 'A4', type: 'white', key: 'y' },
        { note: 'A#4', type: 'black', key: '7' },
        { note: 'B4', type: 'white', key: 'u' },

        // C5 to B5 (2nd Octave for mobile focus)
        { note: 'C5', type: 'white', key: 'i' },
        { note: 'C#5', type: 'black', key: '9' },
        { note: 'D5', type: 'white', key: 'o' },
        { note: 'D#5', type: 'black', key: '0' },
        { note: 'E5', type: 'white', key: 'p' },
        { note: 'F5', type: 'white', key: '[' },
        { note: 'F#5', type: 'black', key: '=' },
        { note: 'G5', type: 'white', key: ']' },
        { note: 'G#5', type: 'black', key: '\\' },
        { note: 'A5', type: 'white', key: ';' },
        { note: 'A#5', type: 'black', key: '\'' },
        { note: 'B5', type: 'white', key: 'l' }
    ]), []);

    // Conditionally select piano keys based on device
    const pianoKeys = isMobile ? twoOctaveKeys : fullPianoKeys;

    const handleKeyPress = useCallback((note) => {
        setPressedKeys(prev => {
            const newSet = new Set(prev);
            if (!newSet.has(note)) {
                newSet.add(note);
                playNote(note);
            }
            return newSet;
        });
    }, [playNote]);

    const handleKeyRelease = useCallback((note) => {
        setPressedKeys(prev => {
            const newSet = new Set(prev);
            if (newSet.has(note)) {
                newSet.delete(note);
                stopNote(note);
            }
            return newSet;
        });
    }, [stopNote]);

    // Check device orientation and screen size
    useEffect(() => {
        const checkDeviceState = () => {
            // Check orientation: Landscape if width > height
            const isCurrentLandscape = window.innerWidth > window.innerHeight;
            setIsLandscape(isCurrentLandscape);

            // Check mobile: Based on arbitrary breakpoint (e.g., less than 768px width for common mobile devices)
            const isCurrentMobile = window.innerWidth < 768; // Adjust this breakpoint as needed
            setIsMobile(isCurrentMobile);
        };

        // Call once on mount
        checkDeviceState();

        // Add event listener
        window.addEventListener('resize', checkDeviceState);

        // Cleanup event listener on unmount
        return () => {
            window.removeEventListener('resize', checkDeviceState);
        };
    }, []);

    // Keyboard event handlers
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.repeat) return; // Prevent repeated notes if key is held down

            // IMPORTANT: Find the key from the CURRENTLY ACTIVE pianoKeys
            const key = pianoKeys.find(k => k.key === e.key.toLowerCase());
            if (key) {
                e.preventDefault(); // Prevent default browser actions for mapped keys
                handleKeyPress(key.note);
            }
        };

        const handleKeyUp = (e) => {
            // IMPORTANT: Find the key from the CURRENTLY ACTIVE pianoKeys
            const key = pianoKeys.find(k => k.key === e.key.toLowerCase());
            if (key) {
                e.preventDefault();
                handleKeyRelease(key.note);
            }
        };

        // Add keyboard event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Cleanup event listeners on component unmount
        // Dependencies for useEffect: pianoKeys now needs to be included because its value changes based on isMobile
    }, [pianoKeys, handleKeyPress, handleKeyRelease]);

    return (
        <div
            className={`min-h-screen relative flex font-inter overflow-hidden ${
                isMobile && isLandscape ? 'flex-row' : 'flex-col' // Main layout switch
            }`}
            style={{
                background: 'linear-gradient(135deg, #e5d4ff 0%, #d6bfff 50%, #c8aaff 100%)',
            }}
        >
            {/* Floating Icons Background for visual flair */}
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Ccircle cx='25' cy='25' r='3' fill='%237d5fff'/%3E%3Ccircle cx='75' cy='25' r='3' fill='%237d5fff'/%3E%3Ccircle cx='50' cy='50' r='3' fill='%237d5fff'/%3E%3Ccircle cx='25' cy='75' r='3' fill='%237d5fff'/%3E%3Ccircle cx='75' cy='75' r='3' fill='%237d5fff'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            {/* Content Wrapper for dynamic layout */}
            <div className="relative z-10 flex flex-1 overflow-hidden">
                {/* Portrait Mode (and Desktop) Layout */}
                {(!isMobile || !isLandscape) && (
                    <div className="flex flex-col flex-1">
                        {/* Header Section */}
                        <div className="text-center py-4 md:py-8 px-4 shrink-0">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <Music className="text-indigo-600" size={24} />
                                <h1 className="text-2xl md:text-4xl font-bold text-indigo-800">Virtual Piano</h1>
                            </div>
                            <p className="text-indigo-700 text-sm md:text-base">Play with your keyboard or touch the keys</p>

                            {!isAudioReady && (
                                <p className="text-purple-700 text-sm mt-2 font-medium animate-pulse">
                                    Initializing audio... (Click/Press any key to start)
                                </p>
                            )}
                            {isAudioReady && (
                                <p className="text-purple-700 text-sm mt-2 font-medium">
                                    🎵 Piano ready to play!
                                </p>
                            )}
                        </div>

                        {/* Volume Controls Section */}
                        <div className="flex justify-center gap-4 md:gap-6 mb-4 md:mb-8 px-4 shrink-0">
                            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-indigo-200">
                                <button
                                    onClick={toggleMute}
                                    className="text-indigo-700 hover:text-indigo-900 transition-colors p-2 rounded-full hover:bg-indigo-100"
                                    disabled={!isAudioReady}
                                >
                                    {isSynthMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                                </button>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={synthVolume}
                                    onChange={(e) => setSynthVolume(parseFloat(e.target.value))}
                                    className="w-20 md:w-28 accent-indigo-600 h-2 rounded-lg appearance-none cursor-pointer"
                                    disabled={!isAudioReady}
                                />
                                <span className="text-sm text-indigo-700 w-8 font-medium">{Math.round(synthVolume * 100)}</span>
                            </div>
                        </div>

                        {/* Piano Keyboard Container */}
                        <PianoUI
                            pianoKeys={pianoKeys} // This will now be 2 or 3 octaves based on isMobile
                            pressedKeys={pressedKeys}
                            handleKeyPress={handleKeyPress}
                            handleKeyRelease={handleKeyRelease}
                            isAudioReady={isAudioReady}
                            isLandscape={false /* Explicitly set to false for portrait/desktop */}
                        />

                        {/* Instructions Section */}
                        <div className="text-center py-4 md:py-8 px-4 shrink-0">
                            <p className="text-xs text-indigo-600 mt-2">
                                Each keyboard key is mapped to a piano note. Try different combinations!
                            </p>
                        </div>
                    </div>
                )}

                {/* Landscape Mode (mobile only) Layout */}
                {isMobile && isLandscape && (
                    <div className="flex flex-1 items-stretch">
                        {/* Left Side - Controls */}
                        <div className="w-24 h-full flex flex-col items-center justify-between py-2 px-1 bg-white/80 backdrop-blur-sm shadow-md shrink-0">
                            <div className="text-center mt-1">
                                <Music className="text-indigo-600 mx-auto" size={16} />
                                <h2 className="text-xs font-bold text-indigo-800 mt-0.5">Piano</h2>
                            </div>

                            <div className="flex flex-col items-center gap-2">
                                <button
                                    onClick={toggleMute}
                                    className="text-indigo-700 hover:text-indigo-900 transition-colors p-1 rounded-full hover:bg-indigo-100"
                                    disabled={!isAudioReady}
                                >
                                    {isSynthMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                </button>

                                <div className="flex flex-col items-center">
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={synthVolume}
                                        onChange={(e) => setSynthVolume(parseFloat(e.target.value))}
                                        className="w-20 accent-indigo-600 h-1.5 rounded-lg appearance-none cursor-pointer transform -rotate-90 origin-[center_center]"
                                        disabled={!isAudioReady}
                                        style={{ WebkitAppearance: 'none' }}
                                    />
                                    <span className="text-[0.6rem] text-indigo-700 mt-2 font-medium">{Math.round(synthVolume * 100)}%</span>
                                </div>
                            </div>

                            <div className="text-center mb-1">
                                <RotateCw className="text-indigo-500 mx-auto" size={14} />
                                <p className="text-[0.6rem] text-indigo-600 mt-0.5">Rotate for portrait</p>
                            </div>
                        </div>

                        {/* Right Side - Piano */}
                        <div className="flex-1 flex items-center justify-center overflow-hidden">
                            <PianoUI
                                pianoKeys={pianoKeys} // This will now be 2 or 3 octaves based on isMobile
                                pressedKeys={pressedKeys}
                                handleKeyPress={handleKeyPress}
                                handleKeyRelease={handleKeyRelease}
                                isAudioReady={isAudioReady}
                                isLandscape={true /* Explicitly set to true for landscape */}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VirtualPiano;