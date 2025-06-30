import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Play, Pause, RotateCcw, Volume2, BookOpen, Zap, Music } from 'lucide-react';
import SEOHead from './SEOHead';

// Define the tool object for SEO structured data
const circleOfFifthsTool = {
    id: 'circle-of-fifths',
    name: 'Circle of Fifths',
    description: 'Interactive circle of fifths tool to explore key relationships and music theory concepts.',
    path: '/circle-of-fifths',
    categories: [
        'Music Theory',
        'Key Signatures',
        'Harmony',
        'Music Education',
        'Composition'
    ]
};

const CircleOfFifths = () => {
    const [selectedKey, setSelectedKey] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [hoveredKey, setHoveredKey] = useState(null);

    const circleData = [
        { 
            major: "C", minor: "Am", accidentals: "0", 
            sharps: [], flats: [],
            chords: ["C", "Dm", "Em", "F", "G", "Am", "B°"],
            modes: ["Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"],
            description: "The natural major scale with no sharps or flats",
            commonSongs: ["Twinkle Twinkle Little Star", "Mary Had a Little Lamb"]
        },
        { 
            major: "G", minor: "Em", accidentals: "1#", 
            sharps: ["F#"], flats: [],
            chords: ["G", "Am", "Bm", "C", "D", "Em", "F#°"],
            modes: ["G Ionian", "A Dorian", "B Phrygian", "C Lydian", "D Mixolydian", "E Aeolian", "F# Locrian"],
            description: "One sharp (F#) - bright and uplifting",
            commonSongs: ["Amazing Grace", "House of the Rising Sun"]
        },
        { 
            major: "D", minor: "Bm", accidentals: "2#", 
            sharps: ["F#", "C#"], flats: [],
            chords: ["D", "Em", "F#m", "G", "A", "Bm", "C#°"],
            modes: ["D Ionian", "E Dorian", "F# Phrygian", "G Lydian", "A Mixolydian", "B Aeolian", "C# Locrian"],
            description: "Two sharps (F#, C#) - guitar-friendly key",
            commonSongs: ["Wonderwall", "Hey Jude"]
        },
        { 
            major: "A", minor: "F#m", accidentals: "3#", 
            sharps: ["F#", "C#", "G#"], flats: [],
            chords: ["A", "Bm", "C#m", "D", "E", "F#m", "G#°"],
            modes: ["A Ionian", "B Dorian", "C# Phrygian", "D Lydian", "E Mixolydian", "F# Aeolian", "G# Locrian"],
            description: "Three sharps (F#, C#, G#) - common in rock",
            commonSongs: ["Sweet Home Alabama", "Free Bird"]
        },
        { 
            major: "E", minor: "C#m", accidentals: "4#", 
            sharps: ["F#", "C#", "G#", "D#"], flats: [],
            chords: ["E", "F#m", "G#m", "A", "B", "C#m", "D#°"],
            modes: ["E Ionian", "F# Dorian", "G# Phrygian", "A Lydian", "B Mixolydian", "C# Aeolian", "D# Locrian"],
            description: "Four sharps - bright, energetic sound",
            commonSongs: ["Love Me Tender", "Blue Suede Shoes"]
        },
        { 
            major: "B", minor: "G#m", accidentals: "5#", 
            sharps: ["F#", "C#", "G#", "D#", "A#"], flats: [],
            chords: ["B", "C#m", "D#m", "E", "F#", "G#m", "A#°"],
            modes: ["B Ionian", "C# Dorian", "D# Phrygian", "E Lydian", "F# Mixolydian", "G# Aeolian", "A# Locrian"],
            description: "Five sharps - complex but beautiful",
            commonSongs: ["Norwegian Wood", "Here Comes the Sun"]
        },
        { 
            major: "F#/Gb", minor: "D#m/Ebm", accidentals: "6#/6b", 
            sharps: ["F#", "C#", "G#", "D#", "A#", "E#"], 
            flats: ["Bb", "Eb", "Ab", "Db", "Gb", "Cb"],
            chords: ["F#", "G#m", "A#m", "B", "C#", "D#m", "E#°"],
            modes: ["F# Ionian", "G# Dorian", "A# Phrygian", "B Lydian", "C# Mixolydian", "D# Aeolian", "E# Locrian"],
            description: "Enharmonic equivalent - same pitch, different spelling",
            commonSongs: ["Black Bird", "The Long and Winding Road"]
        },
        { 
            major: "Db", minor: "Bbm", accidentals: "5b", 
            sharps: [], flats: ["Bb", "Eb", "Ab", "Db", "Gb"],
            chords: ["Db", "Ebm", "Fm", "Gb", "Ab", "Bbm", "C°"],
            modes: ["Db Ionian", "Eb Dorian", "F Phrygian", "Gb Lydian", "Ab Mixolydian", "Bb Aeolian", "C Locrian"],
            description: "Five flats - warm, mellow sound",
            commonSongs: ["Fly Me to the Moon", "Autumn Leaves"]
        },
        { 
            major: "Ab", minor: "Fm", accidentals: "4b", 
            sharps: [], flats: ["Bb", "Eb", "Ab", "Db"],
            chords: ["Ab", "Bbm", "Cm", "Db", "Eb", "Fm", "G°"],
            modes: ["Ab Ionian", "Bb Dorian", "C Phrygian", "Db Lydian", "Eb Mixolydian", "F Aeolian", "G Locrian"],
            description: "Four flats - rich, full sound",
            commonSongs: ["All of Me", "Body and Soul"]
        },
        { 
            major: "Eb", minor: "Cm", accidentals: "3b", 
            sharps: [], flats: ["Bb", "Eb", "Ab"],
            chords: ["Eb", "Fm", "Gm", "Ab", "Bb", "Cm", "D°"],
            modes: ["Eb Ionian", "F Dorian", "G Phrygian", "Ab Lydian", "Bb Mixolydian", "C Aeolian", "D Locrian"],
            description: "Three flats - warm, jazzy feel",
            commonSongs: ["Georgia on My Mind", "Summertime"]
        },
        { 
            major: "Bb", minor: "Gm", accidentals: "2b", 
            sharps: [], flats: ["Bb", "Eb"],
            chords: ["Bb", "Cm", "Dm", "Eb", "F", "Gm", "A°"],
            modes: ["Bb Ionian", "C Dorian", "D Phrygian", "Eb Lydian", "F Mixolydian", "G Aeolian", "A Locrian"],
            description: "Two flats - popular in jazz and classical",
            commonSongs: ["Take Five", "Blue Moon"]
        },
        { 
            major: "F", minor: "Dm", accidentals: "1b", 
            sharps: [], flats: ["Bb"],
            chords: ["F", "Gm", "Am", "Bb", "C", "Dm", "E°"],
            modes: ["F Ionian", "G Dorian", "A Phrygian", "Bb Lydian", "C Mixolydian", "D Aeolian", "E Locrian"],
            description: "One flat (Bb) - gentle, pastoral sound",
            commonSongs: ["Yesterday", "Let It Be"]
        },
    ];

    const numSegments = circleData.length;
    const radius = 150;
    const innerRadius = 110;
    const accidentalRadius = 65;
    const center = { x: 200, y: 200 };

    const getCoordinates = (index, totalSegments, r, rotationOffset = -90) => {
        const angleDeg = (index * (360 / totalSegments)) + rotationOffset;
        const angleRad = angleDeg * (Math.PI / 180);
        const x = center.x + r * Math.cos(angleRad);
        const y = center.y + r * Math.sin(angleRad);
        return { x, y, angle: angleDeg };
    };

    const getLineCoordinates = (index, totalSegments, r1, r2, rotationOffset = -90) => {
        const angleDeg = (index * (360 / totalSegments)) + rotationOffset;
        const angleRad = angleDeg * (Math.PI / 180);
        const x1 = center.x + r1 * Math.cos(angleRad);
        const y1 = center.y + r1 * Math.sin(angleRad);
        const x2 = center.x + r2 * Math.cos(angleRad);
        const y2 = center.y + r2 * Math.sin(angleRad);
        return { x1, y1, x2, y2 };
    };

    useEffect(() => {
        if (isAnimating) {
            const interval = setInterval(() => {
                setSelectedKey(prev => {
                    const currentIndex = prev ? circleData.findIndex(d => d.major === prev.major) : -1;
                    const nextIndex = (currentIndex + 1) % circleData.length;
                    return circleData[nextIndex];
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [isAnimating]);

    const handleKeyClick = (keyData) => {
        setSelectedKey(keyData);
        setIsAnimating(false);
    };

    const toggleAnimation = () => {
        setIsAnimating(!isAnimating);
    };

    const resetSelection = () => {
        setSelectedKey(null);
        setIsAnimating(false);
    };

    return (
        <>
            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
                pageId="circle-of-fifths" 
                tool={circleOfFifthsTool}
                customData={{}}
            />


            <div className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #e0f2f7 0%, #b3e5fc 50%, #81d4fa 100%)',
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                {/* Floating Music Notes Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%2303a9f4' d='M25 0l-5 5v15l5 5h15v-5h-10l5-5V5l-5-5H25zm50 0l5 5v15l-5 5h-15v-5h10l-5-5V5l5-5h-50zM0 75l5 5h15l5-5v-15l-5-5H5l-5 5v15zm75 0l-5 5h-15l-5-5v-15l5-5h15l5 5v15z'/%3E%3C/svg%3E\")",
                        backgroundSize: '200px 200px'
                    }}
                ></div>

                <div className="text-center mb-6 md:mb-10 z-10 w-full">
                    <div className="flex items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                        <Music size={32} className="text-blue-700 md:h-12 md:w-12" />
                        <h1 className="text-3xl md:text-5xl font-extrabold text-blue-900 drop-shadow-lg">Circle of Fifths</h1>
                    </div>
                    <p className="text-blue-600 text-xs md:text-sm mt-2 md:mt-4">
                        Master music theory through interactive exploration
                    </p>
                </div>

                {/* Main content container with relative positioning */}
                <div className="relative w-full max-w-6xl">
                    {/* Desktop controls - positioned absolutely on left side */}
                    <div className="absolute left-0 top-0 z-20 hidden lg:flex flex-col gap-3">
                        <button
                            onClick={toggleAnimation}
                            className="flex items-center justify-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-blue-600 text-white rounded-lg font-bold text-sm md:text-base shadow-md hover:bg-blue-700 transition-all duration-200"
                        >
                            {isAnimating ? <Pause size={16} className="md:h-5 md:w-5" /> : <Play size={16} className="md:h-5 md:w-5" />}
                            {isAnimating ? 'Pause Tour' : 'Start Tour'}
                        </button>
                        <button
                            onClick={resetSelection}
                            className="flex items-center justify-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-gray-600 text-white rounded-lg font-bold text-sm md:text-base shadow-md hover:bg-gray-700 transition-all duration-200"
                        >
                            <RotateCcw size={16} className="md:h-5 md:w-5" /> Reset
                        </button>
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center justify-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-purple-600 text-white rounded-lg font-bold text-sm md:text-base shadow-md hover:bg-purple-700 transition-all duration-200"
                        >
                            <Zap size={16} className="md:h-5 md:w-5" /> {showAdvanced ? 'Basic' : 'Advanced'}
                        </button>
                    </div>

                    {/* Mobile controls - shown only on small screens */}
                    <div className="flex justify-center gap-3 mb-4 lg:hidden">
                        <button
                            onClick={toggleAnimation}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 transition-all duration-200"
                        >
                            {isAnimating ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button
                            onClick={resetSelection}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-gray-700 transition-all duration-200"
                        >
                            <RotateCcw size={16} />
                        </button>
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-bold text-sm shadow-md hover:bg-purple-700 transition-all duration-200"
                        >
                            <Zap size={16} />
                        </button>
                    </div>

                    {/* Circle and info panel container */}
                    <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 lg:p-8 rounded-xl shadow-lg w-full flex flex-col lg:flex-row items-center justify-center gap-6 md:gap-8 z-10 border border-blue-200">
                        {/* Circle Container */}
                        <div className="w-full max-w-md">
                            <svg className="w-full h-auto" viewBox="0 0 400 400">
                                <defs>
                                    <radialGradient id="circleGradient" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.3" />
                                        <stop offset="100%" stopColor="#312e81" stopOpacity="0.1" />
                                    </radialGradient>
                                    <filter id="glow">
                                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                        <feMerge> 
                                            <feMergeNode in="coloredBlur"/>
                                            <feMergeNode in="SourceGraphic"/>
                                        </feMerge>
                                    </filter>
                                </defs>

                                <circle cx={center.x} cy={center.y} r={radius + 35} fill="url(#circleGradient)" />
                                <circle cx={center.x} cy={center.y} r={radius + 30} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="2" />
                                <circle cx={center.x} cy={center.y} r={innerRadius + 15} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
                                <circle cx={center.x} cy={center.y} r={accidentalRadius - 10} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />

                                {circleData.map((_, index) => {
                                    const { x1, y1, x2, y2 } = getLineCoordinates(index, numSegments, radius + 30, accidentalRadius - 10);
                                    return (
                                        <line
                                            key={`line-${index}`}
                                            x1={x1} y1={y1} x2={x2} y2={y2}
                                            stroke="rgba(0,0,0,0.2)"
                                            strokeWidth="1"
                                        />
                                    );
                                })}

                                {circleData.map((data, index) => {
                                    const isSelected = selectedKey?.major === data.major;
                                    const isHovered = hoveredKey === data.major;
                                    const angle = (index * (360 / numSegments)) - 90;
                                    const nextAngle = ((index + 1) * (360 / numSegments)) - 90;
                                    const angleRad = angle * Math.PI / 180;
                                    const nextAngleRad = nextAngle * Math.PI / 180;
                                    
                                    const outerRadius = radius + 30;
                                    const innerRadius = accidentalRadius - 10;
                                    
                                    const pathData = `
                                        M ${center.x + innerRadius * Math.cos(angleRad)} ${center.y + innerRadius * Math.sin(angleRad)}
                                        L ${center.x + outerRadius * Math.cos(angleRad)} ${center.y + outerRadius * Math.sin(angleRad)}
                                        A ${outerRadius} ${outerRadius} 0 0 1 ${center.x + outerRadius * Math.cos(nextAngleRad)} ${center.y + outerRadius * Math.sin(nextAngleRad)}
                                        L ${center.x + innerRadius * Math.cos(nextAngleRad)} ${center.y + innerRadius * Math.sin(nextAngleRad)}
                                        A ${innerRadius} ${innerRadius} 0 0 0 ${center.x + innerRadius * Math.cos(angleRad)} ${center.y + innerRadius * Math.sin(angleRad)}
                                        Z
                                    `;

                                    return (
                                        <path
                                            key={`segment-${index}`}
                                            d={pathData}
                                            fill={isSelected ? "rgba(59, 130, 246, 0.3)" : isHovered ? "rgba(59, 130, 246, 0.1)" : "transparent"}
                                            stroke={isSelected ? "#3b82f6" : "transparent"}
                                            strokeWidth="2"
                                            className="cursor-pointer transition-all duration-300"
                                            onClick={() => handleKeyClick(data)}
                                            onMouseEnter={() => setHoveredKey(data.major)}
                                            onMouseLeave={() => setHoveredKey(null)}
                                        />
                                    );
                                })}

                                {circleData.map((data, index) => {
                                    const { x, y } = getCoordinates(index, numSegments, radius + 5);
                                    const isSelected = selectedKey?.major === data.major;
                                    return (
                                        <text
                                            key={`major-${data.major}`}
                                            x={x} y={y + 2}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            className={`text-lg font-bold cursor-pointer transition-all duration-300 ${
                                                isSelected ? 'fill-blue-700' : 'fill-blue-900'
                                            }`}
                                            filter={isSelected ? "url(#glow)" : "none"}
                                            onClick={() => handleKeyClick(data)}
                                        >
                                            {data.major}
                                        </text>
                                    );
                                })}

                                {circleData.map((data, index) => {
                                    const { x, y } = getCoordinates(index, numSegments, innerRadius - 5);
                                    const isSelected = selectedKey?.major === data.major;
                                    return (
                                        <text
                                            key={`minor-${data.minor}`}
                                            x={x} y={y + 1}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            className={`text-sm font-semibold cursor-pointer transition-all duration-300 ${
                                                isSelected ? 'fill-purple-700' : 'fill-purple-900'
                                            }`}
                                            onClick={() => handleKeyClick(data)}
                                        >
                                            {data.minor}
                                        </text>
                                    );
                                })}

                                {circleData.map((data, index) => {
                                    const { x, y } = getCoordinates(index, numSegments, accidentalRadius - 25);
                                    const isSelected = selectedKey?.major === data.major;
                                    return (
                                        <text
                                            key={`acc-${data.major}`}
                                            x={x} y={y + 1}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            className={`text-xs font-mono transition-all duration-300 ${
                                                isSelected ? 'fill-yellow-600' : 'fill-gray-600'
                                            }`}
                                        >
                                            {data.accidentals}
                                        </text>
                                    );
                                })}

                                <text
                                    x={center.x} y={center.y}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="text-xl font-bold fill-blue-900"
                                >
                                    Keys
                                </text>

                                <g className="fill-blue-600">
                                    <text x={center.x + radius + 50} y={center.y - 15} textAnchor="middle" className="text-sm font-bold">♯</text>
                                    <text x={center.x + radius + 50} y={center.y + 5} textAnchor="middle" className="text-xs">SHARPS</text>
                                    <g transform={`translate(${center.x + radius + 35}, ${center.y - 10})`}>
                                        <ChevronRight size={16} />
                                    </g>
                                </g>
                                <g className="fill-purple-600">
                                    <text x={center.x - radius - 50} y={center.y - 15} textAnchor="middle" className="text-sm font-bold">♭</text>
                                    <text x={center.x - radius - 50} y={center.y + 5} textAnchor="middle" className="text-xs">FLATS</text>
                                    <g transform={`translate(${center.x - radius - 35}, ${center.y - 10})`}>
                                        <ChevronLeft size={16} />
                                    </g>
                                </g>
                            </svg>
                        </div>

                        {/* Information Panel */}
                        <div className="bg-white/90 rounded-xl p-4 md:p-6 shadow-lg border border-blue-200 w-full max-w-md">
                            {selectedKey ? (
                                <div className="space-y-4 md:space-y-6">
                                    <div className="text-center">
                                        <h2 className="text-2xl md:text-3xl font-bold text-blue-800 mb-1 md:mb-2">
                                            {selectedKey.major} Major
                                        </h2>
                                        <p className="text-lg text-blue-600">
                                            {selectedKey.minor} Minor
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1 md:mt-2">
                                            {selectedKey.description}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                                        <div className="bg-blue-50 rounded-lg p-3 md:p-4">
                                            <h3 className="text-xs md:text-sm font-bold text-blue-600 mb-1 md:mb-2 flex items-center gap-1 md:gap-2">
                                                <Music size={14} className="md:h-4 md:w-4" />
                                                Key Signature
                                            </h3>
                                            <p className="text-base md:text-lg font-mono text-blue-800">{selectedKey.accidentals}</p>
                                            {selectedKey.sharps.length > 0 && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Sharps: {selectedKey.sharps.join(', ')}
                                                </p>
                                            )}
                                            {selectedKey.flats.length > 0 && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Flats: {selectedKey.flats.join(', ')}
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div className="bg-purple-50 rounded-lg p-3 md:p-4">
                                            <h3 className="text-xs md:text-sm font-bold text-purple-600 mb-1 md:mb-2 flex items-center gap-1 md:gap-2">
                                                <Volume2 size={14} className="md:h-4 md:w-4" />
                                                Scale Chords
                                            </h3>
                                            <div className="text-xs space-y-1">
                                                {selectedKey.chords.map((chord, i) => (
                                                    <div key={i} className="flex justify-between">
                                                        <span className="text-gray-500">{['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'][i]}:</span>
                                                        <span className="font-mono text-purple-800">{chord}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {showAdvanced && (
                                        <div className="bg-yellow-50 rounded-lg p-3 md:p-4">
                                            <h3 className="text-xs md:text-sm font-bold text-yellow-600 mb-1 md:mb-2 flex items-center gap-1 md:gap-2">
                                                <BookOpen size={14} className="md:h-4 md:w-4" />
                                                Advanced Info
                                            </h3>
                                            <div className="text-xs space-y-2">
                                                <div>
                                                    <p className="text-gray-500 mb-1">Modal Names:</p>
                                                    <div className="grid grid-cols-1 gap-1">
                                                        {selectedKey.modes.slice(0, 4).map((mode, i) => (
                                                            <span key={i} className="font-mono text-gray-700">{mode}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 mb-1">Common Songs:</p>
                                                    {selectedKey.commonSongs.map((song, i) => (
                                                        <p key={i} className="text-gray-700 italic">"{song}"</p>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center space-y-3 md:space-y-4">
                                    <div className="text-4xl md:text-6xl mb-2 md:mb-4">🎵</div>
                                    <h2 className="text-xl md:text-2xl font-bold text-blue-800">Select a Key</h2>
                                    <p className="text-sm md:text-base text-gray-600">
                                        Click on any key in the circle to explore its properties, chords, and musical relationships.
                                    </p>
                                    <div className="bg-blue-50 rounded-lg p-3 md:p-4 mt-4 md:mt-6">
                                        <h3 className="text-base md:text-lg font-bold text-blue-600 mb-2 md:mb-3">Quick Guide</h3>
                                        <div className="text-xs md:text-sm text-gray-700 space-y-1 md:space-y-2">
                                            <p>• <span className="text-blue-600">Outer ring:</span> Major keys</p>
                                            <p>• <span className="text-purple-600">Inner ring:</span> Relative minor keys</p>
                                            <p>• <span className="text-yellow-600">Center:</span> Number of sharps/flats</p>
                                            <p>• <span className="text-green-600">Clockwise:</span> Add sharps</p>
                                            <p>• <span className="text-orange-600">Counter-clockwise:</span> Add flats</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </>
    );
};

export default CircleOfFifths;