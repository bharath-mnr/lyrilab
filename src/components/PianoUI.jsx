// src/components/PianoUI.jsx
import React, { useCallback } from 'react';

/**
 * PianoUI Component
 * Renders the visual representation of the piano keyboard (white and black keys).
 * It receives key data, pressed key state, and handlers for key presses/releases as props.
 */
const PianoUI = ({ pianoKeys, pressedKeys, handleKeyPress, handleKeyRelease, isAudioReady }) => {
    // Filter pianoKeys array to separate white and black keys for distinct rendering.
    const whiteKeys = pianoKeys.filter(key => key.type === 'white');
    const blackKeys = pianoKeys.filter(key => key.type === 'black');

    /**
     * Calculates the 'left' CSS position for a black key to ensure it correctly
     * overlaps and is visually aligned with the white keys below it.
     * @param {string} blackNote - The musical note of the black key (e.g., 'C#3').
     * @returns {number} The percentage value for the CSS 'left' property.
     */
    const getBlackKeyPosition = useCallback((blackNote) => {
        // Map each black note to the white key they visually "precede" or is positioned over.
        const blackKeyWhiteKeyMap = {
            'C#3': 'C3', 'D#3': 'D3', 'F#3': 'F3', 'G#3': 'G3', 'A#3': 'A3',
            'C#4': 'C4', 'D#4': 'D4', 'F#4': 'F4', 'G#4': 'G4', 'A#4': 'A4',
            'C#5': 'C5', 'D#5': 'D5', 'F#5': 'F5', 'G#5': 'G5', 'A#5': 'A5'
        };

        const correspondingWhiteKeyNote = blackKeyWhiteKeyMap[blackNote];
        if (!correspondingWhiteKeyNote) return 0; // Fallback, though all black notes should have a mapping

        // Find the array index of the corresponding white key.
        const whiteKeyIndex = whiteKeys.findIndex(wk => wk.note === correspondingWhiteKeyNote);
        if (whiteKeyIndex === -1) return 0;

        // Calculate the relative width of a single white key as a percentage of the total piano width.
        const whiteKeyWidthPercentage = 100 / whiteKeys.length;
        // Determine the base left position by multiplying the white key's index by its width.
        let baseLeft = whiteKeyIndex * whiteKeyWidthPercentage;

        // Define specific offsets for each black key type to fine-tune its horizontal placement.
        // These values are empirically tuned for optimal visual appearance.
        const offsetMap = {
            'C#': 0.65, // C# tends to be slightly to the right of the 'C' white key.
            'D#': 0.85, // D# is further to the right of 'D'.
            'F#': 0.65, // F# is slightly to the right of 'F'.
            'G#': 0.75, // G# is more centered between 'G' and 'A'.
            'A#': 0.85  // A# is further to the right of 'A'.
        };

        // Extract the root note (e.g., 'C#', 'D#') from the full note string (e.g., 'C#3').
        const blackKeyRootNote = blackNote.replace(/[0-9]/g, '');
        // Apply the specific offset from the map, or a default if not found (shouldn't happen with complete map).
        const offset = offsetMap[blackKeyRootNote] || 0.75;

        // The final left position is the base position adjusted by the offset within a white key's width.
        return baseLeft + (whiteKeyWidthPercentage * offset);
    }, [whiteKeys]); // Dependency: relies on the `whiteKeys` array to correctly calculate positions.

    return (
        <div className={`flex-1 flex items-center justify-center px-2 md:px-4 ${!isAudioReady ? 'opacity-50' : ''}`}>
            <div className="w-full max-w-6xl 2xl:max-w-7xl">
                {/* Piano Frame (visual border around the keys) */}
                <div className="bg-gradient-to-b from-amber-800 via-amber-900 to-black p-4 md:p-8 rounded-2xl shadow-2xl border border-gray-700">
                    <div className="bg-black p-3 md:p-6 rounded-xl shadow-inner">
                        {/* Inner container for all piano keys, allowing relative positioning */}
                        <div className="relative select-none overflow-hidden">
                            {/* White Piano Keys */}
                            <div className="flex w-full gap-0.5">
                                {whiteKeys.map((key) => (
                                    <button
                                        key={key.note}
                                        // Mouse and Touch event handlers for playing notes
                                        onMouseDown={() => handleKeyPress(key.note)}
                                        onMouseUp={() => handleKeyRelease(key.note)}
                                        onMouseLeave={() => handleKeyRelease(key.note)} // Ensures note stops if mouse leaves while held
                                        onTouchStart={(e) => { e.preventDefault(); handleKeyPress(key.note); }}
                                        onTouchEnd={(e) => { e.preventDefault(); handleKeyRelease(key.note); }}
                                        className={`flex-1 h-28 md:h-36 lg:h-44 xl:h-52 2xl:h-60 bg-gradient-to-b from-gray-50 to-white border border-gray-300 rounded-b-xl transition-all duration-100 ease-out hover:from-gray-100 hover:to-gray-50 active:from-gray-200 active:to-gray-100 touch-manipulation flex flex-col justify-end items-center pb-2 md:pb-3 shadow-lg
                                            ${pressedKeys.has(key.note) ? 'from-gray-200 to-gray-100 shadow-inner transform translate-y-1 scale-95' : ''}`}
                                        style={{ minWidth: '32px' }} // Ensures keys have a minimum clickable width
                                    >
                                        {/* Display the musical note name */}
                                        <span className="text-xs md:text-sm text-gray-600 font-bold">
                                            {key.note}
                                        </span>
                                        {/* Display the corresponding keyboard key (hidden on smaller screens) */}
                                        <span className="text-xs text-gray-400 mt-1 hidden sm:block">
                                            {key.key.toUpperCase()}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Black Piano Keys */}
                            <div className="absolute top-0 left-0 right-0 h-18 md:h-24 lg:h-28 xl:h-32 2xl:h-36">
                                {blackKeys.map((key) => {
                                    const leftPosition = getBlackKeyPosition(key.note); // Dynamically calculate position
                                    return (
                                        <button
                                            key={key.note}
                                            onMouseDown={() => handleKeyPress(key.note)}
                                            onMouseUp={() => handleKeyRelease(key.note)}
                                            onMouseLeave={() => handleKeyRelease(key.note)}
                                            onTouchStart={(e) => { e.preventDefault(); handleKeyPress(key.note); }}
                                            onTouchEnd={(e) => { e.preventDefault(); handleKeyRelease(key.note); }}
                                            className={`absolute w-5 md:w-7 lg:w-9 xl:w-11 2xl:w-13 h-18 md:h-24 lg:h-28 xl:h-32 2xl:h-36 bg-gradient-to-b from-gray-800 via-gray-900 to-black rounded-b-xl transition-all duration-100 ease-out hover:from-gray-700 hover:via-gray-800 active:from-gray-600 touch-manipulation flex flex-col justify-end items-center pb-1 shadow-xl border border-gray-600
                                                ${pressedKeys.has(key.note) ? 'from-gray-600 via-gray-700 to-gray-800 shadow-inner transform translate-y-1 scale-95' : ''}`}
                                            style={{
                                                left: `${leftPosition}%`,
                                                transform: 'translateX(-50%)' // Centers the button horizontally
                                            }}
                                        >
                                            {/* Display the musical note name for black keys (hidden on smaller screens) */}
                                            <span className="text-xs text-gray-300 font-bold hidden md:block">
                                                {key.note}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Piano Legs (Decorative bottom elements) */}
                <div className="flex justify-between px-8 md:px-16">
                    <div className="w-6 md:w-8 h-12 md:h-20 bg-gradient-to-b from-amber-800 to-amber-900 rounded-b-xl shadow-lg"></div>
                    <div className="w-6 md:w-8 h-12 md:h-20 bg-gradient-to-b from-amber-800 to-amber-900 rounded-b-xl shadow-lg"></div>
                </div>
            </div>
        </div>
    );
};

export default PianoUI;