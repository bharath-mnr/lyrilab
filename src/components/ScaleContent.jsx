import React, { useState, useEffect } from 'react';
import { Music3, Layers, Sparkles, ChevronDown } from 'lucide-react';
import SEOHead from './SEOHead';

// Define the tool object for SEO structured data
const scaleExplorerTool = {
    id: 'scale-explorer',
    name: 'Scale Explorer',
    description: 'Comprehensive scale library with visual and audio representation for all musical scales.',
    path: '/scale-explorer',
    categories: [
        'Music Scales',
        'Music Theory',
        'Guitar Scales',
        'Piano Scales',
        'Improvisation'
    ]
};

const ScaleContent = () => {
    const [selectedScale, setSelectedScale] = useState(null);
    const [isMobile, setIsMobile] = useState(false);
    const [isSmallMobile, setIsSmallMobile] = useState(false);

    // Check screen size on mount and resize
    useEffect(() => {
        const checkScreenSize = () => {
            const width = window.innerWidth;
            setIsMobile(width < 768);
            setIsSmallMobile(width < 400);
        };
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    const scalesData = [
        {
            name: "Major Scale",
            description: "The most common scale in Western music, often described as bright and happy.",
            structure: "W-W-H-W-W-W-H",
            intervals: ["Root", "Major 2nd", "Major 3rd", "Perfect 4th", "Perfect 5th", "Major 6th", "Major 7th", "Octave"],
            notesC: ["C", "D", "E", "F", "G", "A", "B"],
            mood: "Bright, Happy, Stable"
        },
        {
            name: "Natural Minor Scale",
            description: "Often described as sad or melancholic, the natural minor scale is built from the Aeolian mode.",
            structure: "W-H-W-W-H-W-W",
            intervals: ["Root", "Major 2nd", "Minor 3rd", "Perfect 4th", "Perfect 5th", "Minor 6th", "Minor 7th", "Octave"],
            notesC: ["C", "D", "Eb", "F", "G", "Ab", "Bb"],
            mood: "Sad, Melancholic, Serious"
        },
        {
            name: "Harmonic Minor Scale",
            description: "A minor scale with a raised 7th degree, creating a leading tone and an exotic sound.",
            structure: "W-H-W-W-H-A2-H",
            intervals: ["Root", "Major 2nd", "Minor 3rd", "Perfect 4th", "Perfect 5th", "Minor 6th", "Major 7th", "Octave"],
            notesC: ["C", "D", "Eb", "F", "G", "Ab", "B"],
            mood: "Exotic, Dramatic, Eastern"
        },
        {
            name: "Melodic Minor Scale (Ascending)",
            description: "A minor scale with raised 6th and 7th degrees when ascending.",
            structure: "W-H-W-W-W-W-H",
            intervals: ["Root", "Major 2nd", "Minor 3rd", "Perfect 4th", "Perfect 5th", "Major 6th", "Major 7th", "Octave"],
            notesC: ["C", "D", "Eb", "F", "G", "A", "B"],
            mood: "Smooth, Jazz-influenced"
        },
        {
            name: "Pentatonic Scale (Major)",
            description: "A five-note scale commonly used in folk music worldwide.",
            structure: "W-W-A3-W-A3",
            intervals: ["Root", "Major 2nd", "Major 3rd", "Perfect 5th", "Major 6th", "Octave"],
            notesC: ["C", "D", "E", "G", "A"],
            mood: "Simple, Folk, Open"
        },
        {
            name: "Pentatonic Scale (Minor)",
            description: "A common five-note scale with a bluesy or melancholic sound.",
            structure: "W-A-W-W-A",
            intervals: ["Root", "Minor 3rd", "Perfect 4th", "Perfect 5th", "Minor 7th", "Octave"],
            notesC: ["C", "Eb", "F", "G", "Bb"],
            mood: "Bluesy, Rock, Simple"
        },
        {
            name: "Blues Scale",
            description: "A six-note scale based on the minor pentatonic with a chromatic 'blue' note.",
            structure: "W-H-H-H-W-A",
            intervals: ["Root", "Minor 3rd", "Perfect 4th", "Diminished 5th", "Perfect 5th", "Minor 7th", "Octave"],
            notesC: ["C", "Eb", "F", "Gb", "G", "Bb"],
            mood: "Blues, Gritty, Expressive"
        },
        {
            name: "Chromatic Scale",
            description: "All twelve notes of the octave, each a half step apart.",
            structure: "H-H-H-H-H-H-H-H-H-H-H-H",
            intervals: ["Root", "m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7", "Octave"],
            notesC: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
            mood: "Tension, Modern, Jazz"
        },
    ];

    return (
        <>

            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
                pageId="scale-explorer" 
                tool={scaleExplorerTool}
                customData={{}}
            />

            <div className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #e6ffe6 0%, #ccffcc 50%, #b3ffb3 100%)',
                    fontFamily: 'Inter, sans-serif',
                }}>
                
                {/* Floating Icons Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%2322c55e' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                        backgroundSize: '200px 200px'
                    }} />

                <div className="text-center mb-6 md:mb-10 z-10 w-full px-4">
                    <div className="flex items-center justify-center gap-3 md:gap-4 mb-3 md:mb-4">
                        <Music3 size={isSmallMobile ? 32 : 48} className="text-green-700" />
                        <h1 className={`${isSmallMobile ? 'text-3xl' : 'text-4xl md:text-5xl'} font-extrabold text-green-900 drop-shadow-lg`}>
                            Scales Explorer
                        </h1>
                    </div>
                    <p className={`${isSmallMobile ? 'text-sm' : 'text-lg'} text-green-700 font-semibold`}>
                        Dive into the world of musical scales and their unique characteristics.
                    </p>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 lg:p-8 rounded-xl shadow-lg w-full max-w-5xl flex flex-col lg:flex-row items-start space-y-4 md:space-y-6 lg:space-y-0 lg:space-x-6 xl:space-x-8 z-10 border border-green-200">
                    {/* Scale Selection Panel */}
                    <div className="w-full lg:w-1/3 bg-green-50/70 p-3 md:p-4 lg:p-6 rounded-lg border border-green-100 shadow-inner flex flex-col space-y-2 md:space-y-3">
                        <h2 className={`${isSmallMobile ? 'text-lg' : 'text-xl md:text-2xl'} font-bold text-green-800 mb-2 md:mb-3 flex items-center gap-2`}>
                            <Layers size={isSmallMobile ? 16 : 20} /> Select a Scale
                        </h2>

                        {isMobile ? (
                            <div className="relative">
                                <select
                                    onChange={(e) => setSelectedScale(scalesData[e.target.value])}
                                    className="w-full p-2 pr-8 rounded-lg border border-green-300 bg-white text-green-900 appearance-none focus:ring-2 focus:ring-green-400 focus:border-transparent"
                                    value={selectedScale ? scalesData.findIndex(s => s.name === selectedScale.name) : ""}
                                >
                                    <option value="" disabled>Choose a scale...</option>
                                    {scalesData.map((scale, index) => (
                                        <option key={index} value={index}>
                                            {scale.name}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                    <ChevronDown size={16} className="text-green-700" />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {scalesData.map((scale, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedScale(scale)}
                                        className={`w-full text-left px-3 py-2 ${isSmallMobile ? 'text-xs' : 'text-sm md:text-base'} rounded-lg font-medium transition-all duration-200 flex items-center gap-2
                                            ${selectedScale?.name === scale.name
                                                ? 'bg-green-600 text-white shadow-md'
                                                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                                        `}
                                    >
                                        <Sparkles size={isSmallMobile ? 12 : 16} />
                                        <span className="truncate">{scale.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Scale Details Display */}
                    <div className="w-full lg:w-2/3 bg-green-50/70 p-4 md:p-6 rounded-lg border border-green-100 shadow-inner">
                        {selectedScale ? (
                            <div className="space-y-4 md:space-y-6">
                                <div className="text-center">
                                    <h2 className={`${isSmallMobile ? 'text-xl' : 'text-2xl md:text-3xl'} font-bold text-green-800 mb-1 md:mb-2`}>
                                        {selectedScale.name}
                                    </h2>
                                    <p className={`${isSmallMobile ? 'text-xs' : 'text-sm md:text-md'} text-gray-700 italic`}>
                                        {selectedScale.description}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                    <div className="bg-white/50 rounded-lg p-3 md:p-4 border border-green-100">
                                        <h3 className={`${isSmallMobile ? 'text-base' : 'text-lg'} font-bold text-green-700 mb-1 md:mb-2 flex items-center gap-1 md:gap-2`}>
                                            Structure
                                        </h3>
                                        <p className={`${isSmallMobile ? 'text-xs' : 'text-sm'} font-mono text-green-900`}>
                                            {selectedScale.structure}
                                        </p>
                                        <p className={`${isSmallMobile ? 'text-xxs' : 'text-xs'} text-gray-600 mt-1 md:mt-2`}>
                                            (W = Whole step, H = Half step, A2 = Augmented 2nd)
                                        </p>
                                    </div>
                                    <div className="bg-white/50 rounded-lg p-3 md:p-4 border border-green-100">
                                        <h3 className={`${isSmallMobile ? 'text-base' : 'text-lg'} font-bold text-green-700 mb-1 md:mb-2 flex items-center gap-1 md:gap-2`}>
                                            Intervals
                                        </h3>
                                        <ul className={`${isSmallMobile ? 'text-xs' : 'text-sm'} text-green-900 space-y-1 list-disc list-inside`}>
                                            {selectedScale.intervals.map((interval, i) => (
                                                <li key={i}>{interval}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                
                                <div className="bg-white/50 rounded-lg p-3 md:p-4 border border-green-100">
                                    <h3 className={`${isSmallMobile ? 'text-base' : 'text-lg'} font-bold text-green-700 mb-1 md:mb-2 flex items-center gap-1 md:gap-2`}>
                                        Notes in C
                                    </h3>
                                    <p className={`${isSmallMobile ? 'text-base' : 'text-xl'} font-mono text-green-900`}>
                                        {selectedScale.notesC.join(', ')}
                                    </p>
                                </div>

                                <div className="bg-white/50 rounded-lg p-3 md:p-4 border border-green-100">
                                    <h3 className={`${isSmallMobile ? 'text-base' : 'text-lg'} font-bold text-green-700 mb-1 md:mb-2 flex items-center gap-1 md:gap-2`}>
                                        Mood/Character
                                    </h3>
                                    <p className={`${isSmallMobile ? 'text-sm' : 'text-lg'} text-green-900`}>
                                        {selectedScale.mood}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center space-y-3 py-6 md:py-10">
                                <div className={`${isSmallMobile ? 'text-4xl' : 'text-6xl'} mb-3 md:mb-4 text-green-700`}>🎶</div>
                                <h2 className={`${isSmallMobile ? 'text-xl' : 'text-2xl'} font-bold text-green-800`}>
                                    Choose a Scale to Learn More
                                </h2>
                                <p className={`${isSmallMobile ? 'text-xs' : 'text-sm'} text-gray-700`}>
                                    Select any scale from the {isMobile ? 'dropdown' : 'panel'} to see its detailed structure and characteristics.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`${isSmallMobile ? 'text-xs' : 'text-sm'} text-center text-gray-700 mt-4 md:mt-6 italic px-4`}>
                    Understanding scales is key to unlocking melodies and harmonies!
                </div>
            </div>
        </>
    );
};

export default ScaleContent;