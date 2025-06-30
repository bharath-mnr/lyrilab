import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Drumstick, Volume2, Plus, Minus } from 'lucide-react'; // Icons for drumstick, volume, and controls
import SEOHead from './SEOHead';

// --- AUDIO CONTEXT ---
// This context manages the global Tone.js audio state, ensuring only one audio context.
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);
    const [error, setError] = useState(null); // Added error state for audio context initialization

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
                setError(null); // Clear error if successful
                console.log('AudioContext: Tone.js context started successfully');
            } else {
                console.warn('AudioContext: Tone.js context did not start properly (state is ' + Tone.context.state + ')');
                setIsAudioGloballyReady(false);
                setError("Failed to start audio. Browser context might be suspended.");
            }
        } catch (error) {
            console.error("AudioContext: Error starting Tone.js context:", error);
            setError("Failed to initialize audio. Please check your browser permissions.");
            setIsAudioGloballyReady(false);
        }
    }, []);

    // Effect to observe Tone.js context state changes and add/remove click listener
    useEffect(() => {
        const handleToneContextChange = () => {
            const newState = Tone.context.state === 'running';
            if (newState !== isAudioGloballyReady) { // Prevent unnecessary state updates
                console.log(`AudioContext: Tone.context state changed to '${Tone.context.state}'. isAudioGloballyReady set to ${newState}.`);
                setIsAudioGloballyReady(newState);
                if (newState) { // If audio is running, clear any suspended error
                    setError(null);
                } else { // If audio is not running, and there's no other error, indicate suspension
                    if (!error) setError("Audio context suspended. Click to activate.");
                }
            }
        };

        // Add listener for state changes
        Tone.context.on('statechange', handleToneContextChange);
        handleToneContextChange(); // Initial check on mount

        // Add a document-wide click listener to try and start audio if suspended
        const clickToActivateHandler = () => {
            if (Tone.context.state !== 'running') {
                startGlobalAudio();
            }
        };

        // Attach listener only if audio is not running initially and no other error is present
        if (Tone.context.state !== 'running' && !error) {
            document.addEventListener('click', clickToActivateHandler, { once: true });
        }
        
        return () => {
            // Clean up listener on unmount
            Tone.context.off('statechange', handleToneContextChange);
            document.removeEventListener('click', clickToActivateHandler); // Ensure cleanup
        };
    }, [error, startGlobalAudio, isAudioGloballyReady]); // Depend on error and startGlobalAudio to re-evaluate

    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, startGlobalAudio, error }}>
            {children}
        </AudioContext.Provider>
    );
};
// --- END AUDIO CONTEXT ---


    // 3. Drum Machine
    const drumMachineTool = {
        id: 'drum-machine',
        name: 'Drum Machine',
        description: 'Create beats and rhythms with our versatile online drum machine featuring multiple drum kits and sequencing.',
        path: '/drum-machine',
        categories: [
            'Beat Making',
            'Drum Programming',
            'Music Production',
            'Rhythm Training',
            'Sequencing'
        ]
    };



// --- useDrumMachine Hook ---
const useDrumMachine = () => {
    const { isAudioGloballyReady, startGlobalAudio, error: audioContextError } = useContext(AudioContext);
    const samplerRef = useRef(null); // The Tone.Sampler instance
    const [masterVolume, setMasterVolume] = useState(-10); // Master volume in dB

    const [isAudioReady, setIsAudioReady] = useState(false); // Overall audio system readiness (samples loaded & sampler initialized)
    const [isLoading, setIsLoading] = useState(false); // Indicates if audio setup is in progress
    const [isSamplesLoaded, setIsSamplesLoaded] = useState(false); // Indicates if samples are loaded
    const [loadError, setLoadError] = useState(null); // Specific error for sample loading

    // Define mapping from descriptive drum key to a specific musical note for Tone.js Sampler
    const drumKeyToNoteMap = useRef({
        'kick': 'C1',
        'snare': 'D1',
        'hihat': 'E1',
        'clap': 'F1',
        'rimshot': 'G1',
        'open_hihat': 'A1',
        'ride': 'B1',
        'crash': 'C2', // Using C2 for crash, just an arbitrary choice
    });

    // Create the urls object that Tone.Sampler expects: { "note": "full/path/to/filename.mp3" }
    // Constructing paths relative to the root for consistency.
    const getSamplerUrls = useCallback(() => {
        const urls = {};
        for (const drumKey in drumKeyToNoteMap.current) {
            const note = drumKeyToNoteMap.current[drumKey];
            const fileExtension = drumKey === 'open_hihat' ? 'wav' : 'mp3';
            // Explicitly constructing the path relative to the root (starting with /)
            urls[note] = `/drum_samples/${drumKey}.${fileExtension}`; 
        }
        return urls;
    }, []);


    // Function to dispose the sampler
    const disposeSampler = useCallback(() => {
        if (samplerRef.current) {
            samplerRef.current.dispose();
            samplerRef.current = null;
            setIsSamplesLoaded(false);
            console.log('useDrumMachine: Sampler disposed.');
        }
    }, []);

    // Effect for initializing and loading the sampler
    useEffect(() => {
        console.log('useDrumMachine: Setting up Tone.js Sampler...');
        setIsLoading(true);
        setIsSamplesLoaded(false); // Reset sample loaded status
        setLoadError(null); // Clear previous load errors

        let localSampler = null;
        try {
            disposeSampler(); // Ensure any existing sampler is disposed
            
            localSampler = new Tone.Sampler({
                urls: getSamplerUrls(), // Providing paths constructed with '/' at the beginning
                onload: () => {
                    console.log('useDrumMachine: Drum samples loaded successfully!');
                    setIsSamplesLoaded(true);
                    setIsLoading(false);
                },
                onerror: (error) => {
                    console.error('useDrumMachine: Error loading drum samples:', error);
                    setLoadError(`Failed to load drum samples: ${error.message || error}. Ensure '/drum_samples/' folder exists with the correct files.`);
                    setIsLoading(false);
                    setIsSamplesLoaded(false);
                },
            }).toDestination(); // Connect directly to output

            samplerRef.current = localSampler; // Store in ref
            console.log('useDrumMachine: Tone.js Sampler instance created.');

        } catch (error) {
            console.error("useDrumMachine: Error during Tone.js Sampler setup:", error);
            setLoadError('Failed to initialize audio engine. Check console for details.');
            setIsLoading(false);
            setIsSamplesLoaded(false);
            samplerRef.current = null; // Ensure ref is null on error
        }

        // Cleanup function for this effect
        return () => {
            console.log('useDrumMachine Cleanup: Disposing sampler on unmount.');
            if (localSampler) {
                localSampler.dispose();
            }
            samplerRef.current = null; // Ensure ref is cleared
            setIsSamplesLoaded(false);
        };
    }, [disposeSampler, getSamplerUrls]); // isAudioGloballyReady is removed as a dependency here.

    // Effect to update master volume
    useEffect(() => {
        if (samplerRef.current && samplerRef.current.output) { // Access the output gain node
            samplerRef.current.volume.value = masterVolume;
            console.log(`Master volume updated to: ${masterVolume} dB`);
        }
    }, [masterVolume]);

    // Effect to observe global audio readiness and update local state for UI control
    useEffect(() => {
        // `isAudioReady` should mean the app's audio components are ready to *respond* to input,
        // even if the global browser AudioContext is still suspended.
        setIsAudioReady(isSamplesLoaded && samplerRef.current !== null && !isLoading && !loadError);
        console.log(`useDrumMachine: isSamplesLoaded: ${isSamplesLoaded}, samplerRef.current exists: ${samplerRef.current !== null}, isLoading: ${isLoading}, loadError: ${!!loadError} => isAudioReady: ${isAudioReady}`);
    }, [isSamplesLoaded, samplerRef.current, isLoading, loadError, isAudioReady]);


    // Function to play a drum sound
    const playDrum = useCallback(async (drumKey) => {
        // Step 1: Always attempt to resume/start the audio context on user interaction.
        if (Tone.context.state !== 'running') {
            console.log('playDrum: Audio context not running, attempting to start globally.');
            await startGlobalAudio(); // Attempt to resume/start context
            if (Tone.context.state !== 'running') { // Check if it succeeded
                console.warn('Audio context could not be started after interaction. Cannot play drum.');
                return;
            }
        }

        // Step 2: Now that the audio context *should* be running, check if sampler and samples are ready.
        if (!samplerRef.current || !isSamplesLoaded || isLoading || loadError) {
            console.warn('Sampler not initialized, samples not loaded, or still loading/error. Cannot play drum.');
            return;
        }

        // Step 3: Play the drum sound
        const note = drumKeyToNoteMap.current[drumKey];

        if (note) { 
            try {
                samplerRef.current.triggerAttack(note, Tone.now()); // Trigger using the note name at current Tone time
                console.log(`Playing drum: ${drumKey} (Note: ${note})`);
            } catch (e) {
                console.error(`Error triggering drum sound ${drumKey} (Note: ${note}):`, e);
            }
        } else {
            console.warn(`Drum sample '${drumKey}' (Note: ${note}) not mapped.`);
        }
    }, [startGlobalAudio, isSamplesLoaded, isLoading, loadError]); // Added isLoading, loadError to deps


    return {
        playDrum,
        masterVolume,
        setMasterVolume,
        isAudioReady, // This now indicates if the drum machine is functionally ready (samples loaded, not loading/error)
        isLoading,
        isSamplesLoaded,
        drumKeys: Object.keys(drumKeyToNoteMap.current), // Expose descriptive drum keys for UI buttons
        error: audioContextError || loadError // Combine errors from AudioContext and Sampler loading
    };
};
// --- End useDrumMachine Hook ---


// --- ParameterSlider Component (reused from previous docs) ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '', isDisabled, colorClass = 'accent-green-600 bg-green-100' }) => (
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


// --- DrumMachineContent (Main UI Logic) ---
const DrumMachineContent = () => {

    const {
        playDrum,
        masterVolume, setMasterVolume,
        isAudioReady, isLoading,
        drumKeys,
        error, // Combined error from hook
    } = useDrumMachine();

    const [activePad, setActivePad] = useState(null);

    // This function will now be called only once per click/tap
    const handleDrumPadInteraction = (drumKey) => { // Renamed for clarity
        playDrum(drumKey);
        setActivePad(drumKey);
        setTimeout(() => setActivePad(null), 100);
    };

    return (
        <>
            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
            pageId="drum-machine" 
            tool={drumMachineTool}
            customData={{}}
            />
            <div
                className="min-h-screen flex flex-col items-center justify-center p-3 sm:p-4 md:p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #e6ffe6 0%, #ccffcc 50%, #80ff80 100%)',
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                {/* Floating Icons Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%2368d391' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                        backgroundSize: '200px 200px'
                    }}
                ></div>

                <div className="text-center mb-4 sm:mb-6 md:mb-10 z-10 w-full max-w-4xl">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-green-900 drop-shadow-lg mb-2 sm:mb-4 leading-tight">
                        Drum Machine
                    </h1>
                    
                    {/* Status Messages */}
                    <div className="min-h-[1.5rem] flex items-center justify-center">
                        {error && (
                            <p className="text-red-600 text-sm sm:text-base font-semibold animate-pulse">
                                Error: {error}
                            </p>
                        )}
                        {!isAudioReady && isLoading && (
                            <p className="text-green-700 text-sm sm:text-base animate-pulse">
                                Loading samples...
                            </p>
                        )}
                        {!isAudioReady && !isLoading && !error && (
                            <p className="text-green-700 text-sm sm:text-base">
                                Tap any pad to activate audio
                            </p>
                        )}
                        {isAudioReady && !isLoading && (
                            <p className="text-green-600 text-sm sm:text-base font-medium">
                                🎵 Ready! Tap the pads
                            </p>
                        )}
                    </div>

                    {/* Only show "Activate Audio" button if specifically suspended and not loading/erroring */}
                    {!isLoading && error && error.includes("suspended") && (
                        <button
                            onClick={startGlobalAudio} 
                            className="mt-4 px-6 py-3 sm:px-8 sm:py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all duration-200 text-base sm:text-lg"
                        >
                            🔊 Activate Audio
                        </button>
                    )}
                </div>

                <div className="bg-white/90 backdrop-blur-md p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl w-full max-w-2xl lg:max-w-4xl flex flex-col items-center space-y-6 sm:space-y-8 z-10 border border-green-200/50 mx-2">

                    {/* Drum Pads Grid - Mobile First Design */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 w-full max-w-3xl">
                        {drumKeys.map(drumKey => (
                            <button
                                key={drumKey}
                                onClick={() => handleDrumPadInteraction(drumKey)} 
                                className={`
                                    relative overflow-hidden
                                    py-8 sm:py-10 md:py-12 lg:py-16
                                    rounded-xl sm:rounded-2xl 
                                    text-sm sm:text-base md:text-lg lg:text-xl 
                                    font-bold 
                                    transition-all duration-150 ease-out transform
                                    touch-manipulation select-none
                                    min-h-[80px] sm:min-h-[100px] md:min-h-[120px]
                                    ${activePad === drumKey 
                                        ? 'scale-95 shadow-inner bg-green-700 text-white ring-4 ring-green-400' 
                                        : 'shadow-lg hover:shadow-xl'}
                                    ${!isLoading && !error 
                                        ? 'bg-green-500 hover:bg-green-600 active:scale-95 text-white hover:scale-105' 
                                        : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                `}
                                disabled={isLoading || !!error}
                                style={{
                                    WebkitTapHighlightColor: 'transparent',
                                    touchAction: 'manipulation'
                                }}
                            >
                                {/* Ripple effect background */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl sm:rounded-2xl"></div>
                                
                                {/* Button text */}
                                <span className="relative z-10 leading-tight">
                                    {drumKey.replace(/_/g, ' ').toUpperCase()}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Master Volume Slider */}
                    <div className="w-full max-w-2xl mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-green-200 px-2">
                        <ParameterSlider
                            label="Volume" 
                            value={masterVolume} 
                            setter={setMasterVolume}
                            min="-40" 
                            max="0" 
                            step="1" 
                            unit=" dB"
                            explanation="Adjust overall loudness"
                            isDisabled={isLoading || !!error}
                            colorClass="accent-green-700 bg-green-200"
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
        console.error("Uncaught error in DrumMachine:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-green-100 text-green-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Drum Machine. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export wrapping the main content with AudioContextProvider and ErrorBoundary
const DrumMachine = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <DrumMachineContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default DrumMachine;
