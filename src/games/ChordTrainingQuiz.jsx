import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, RotateCcw, Volume2, Music, CheckCircle2, XCircle } from 'lucide-react';

// --- AUDIO CONTEXT ---
// This context manages the global Tone.js audio state, ensuring only one audio context.
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);
    const [error, setError] = useState(null);

    // Function to start Tone.js audio context. This needs a user interaction.
    const startGlobalAudio = useCallback(async () => {
        if (Tone.context.state === 'running') {
            setIsAudioGloballyReady(true);
            setError(null);
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
            if (Tone.context.state === 'running') {
                setIsAudioGloballyReady(true);
                setError(null);
            } else {
                setIsAudioGloballyReady(false);
                if (!error) setError("Audio context suspended. Click to activate.");
            }
        };

        Tone.context.on('statechange', handleToneContextChange);
        handleToneContextChange(); // Initial check on mount

        // Add a document-wide click listener to try and start audio if suspended
        const clickToActivateHandler = () => {
            if (Tone.context.state !== 'running') {
                startGlobalAudio();
            }
        };

        if (Tone.context.state !== 'running') {
            document.addEventListener('click', clickToActivateHandler, { once: true });
        }
        
        return () => {
            Tone.context.off('statechange', handleToneContextChange);
            document.removeEventListener('click', clickToActivateHandler);
        };
    }, [error, startGlobalAudio]);

    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, startGlobalAudio, error }}>
            {children}
        </AudioContext.Provider>
    );
};
// --- END AUDIO CONTEXT ---


// --- useChordTraining Hook ---
const useChordTraining = () => {
    const { isAudioGloballyReady, startGlobalAudio, error: audioContextError } = useContext(AudioContext);
    const polySynthRef = useRef(null); // The Tone.PolySynth instance
    const [score, setScore] = useState(0);
    const [questionCount, setQuestionCount] = useState(0);
    const [currentChordProgression, setCurrentChordProgression] = useState(null);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [hasGuessed, setHasGuessed] = useState(false);
    const [quizStarted, setQuizStarted] = useState(false);
    const [isSynthReady, setIsSynthReady] = useState(false);
    const [revealedAnswer, setRevealedAnswer] = useState(null);
    const [chordsPlayedForCurrentQuestion, setChordsPlayedForCurrentQuestion] = useState(false);

    // Define TRIAD chord structures by semitone differences from the root
    const chordTypes = useRef([
        { name: 'Major Triad', intervals: [0, 4, 7] },     // Root, M3, P5
        { name: 'Minor Triad', intervals: [0, 3, 7] },     // Root, m3, P5
        { name: 'Diminished Triad', intervals: [0, 3, 6] },// Root, m3, d5
        { name: 'Augmented Triad', intervals: [0, 4, 8] }, // Root, M3, A5
    ]);

    // Cleanup function for the synth
    const disposeSynth = useCallback(() => {
        if (polySynthRef.current) {
            polySynthRef.current.dispose();
            polySynthRef.current = null;
            setIsSynthReady(false);
            console.log('useChordTraining: PolySynth disposed.');
        }
    }, []);

    // Initialize Tone.PolySynth
    useEffect(() => {
        console.log('useChordTraining: Setting up Tone.PolySynth...');
        disposeSynth(); // Ensure any existing synth is disposed

        if (isAudioGloballyReady) {
            try {
                // Using a PolySynth to play multiple notes simultaneously for chords
                // Adjusted envelope for smoother sound to reduce perceived noise.
                const polySynth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { type: "sine" },
                    envelope: {
                        attack: 0.08, // Slightly increased attack to prevent clicks
                        decay: 0.3,  // Slightly increased decay for smoother transition
                        sustain: 0.05, // Lower sustain for a more percussive, fading sound
                        release: 1.0, // Increased release for a longer, smoother fade-out
                    },
                }).toDestination();
                polySynthRef.current = polySynth;
                setIsSynthReady(true);
                console.log('useChordTraining: Tone.PolySynth instance created and ready.');
            } catch (error) {
                console.error("useChordTraining: Error during Tone.PolySynth setup:", error);
                setIsSynthReady(false);
            }
        }

        return disposeSynth;
    }, [isAudioGloballyReady, disposeSynth]);

    // Helper to get notes for a chord from a root MIDI note
    const getChordNotes = useCallback((rootMidi, chordType) => {
        return chordType.intervals.map(interval =>
            Tone.Midi(rootMidi + interval).toNote()
        );
    }, []);

    // Function to generate a new chord progression question
    const generateNewQuestion = useCallback(() => {
        // Choose a random root note for the first chord (e.g., C4 to G4 range)
        const rootMidi = Math.floor(Math.random() * 8) + 60; // MIDI notes 60 (C4) to 67 (G4)
        const rootNote = Tone.Midi(rootMidi).toNote();

        // The first chord will always be a Major Triad for reference
        const firstChordType = chordTypes.current.find(c => c.name === 'Major Triad');
        const firstChordNotes = getChordNotes(rootMidi, firstChordType);

        // Choose a random second chord type that is DIFFERENT from the first chord
        let randomSecondChordType = null;
        do {
            randomSecondChordType = chordTypes.current[Math.floor(Math.random() * chordTypes.current.length)];
        } while (randomSecondChordType.name === firstChordType.name); // Ensure the second chord is not the same as the first

        const secondChordNotes = getChordNotes(rootMidi, randomSecondChordType);

        setCurrentChordProgression({
            root: rootNote,
            firstChordNotes: firstChordNotes,
            secondChordNotes: secondChordNotes,
            correctAnswer: randomSecondChordType.name,
        });
        setFeedbackMessage('');
        setHasGuessed(false);
        setRevealedAnswer(null); // Reset revealed answer for new question
        setChordsPlayedForCurrentQuestion(false); // Reset played status for new question
        console.log(`New question: Play a progression starting on ${rootNote}. Correct answer: ${randomSecondChordType.name}`);
    }, [getChordNotes]);

    // Function to play the current chord progression
    const playChordProgression = useCallback(async () => {
        if (!currentChordProgression || !polySynthRef.current || !isSynthReady) {
            console.warn("Cannot play chord progression: Synth not ready or no current progression.");
            return;
        }

        if (Tone.context.state !== 'running') {
            await startGlobalAudio(); 
            if (Tone.context.state !== 'running') {
                console.warn('Audio context could not be started after interaction. Cannot play progression.');
                return;
            }
        }

        const polySynth = polySynthRef.current;
        const now = Tone.now();
        const chordDuration = 1; // seconds for each chord
        const delayBetweenChords = 0.5; // seconds

        // Play first chord
        polySynth.triggerAttackRelease(currentChordProgression.firstChordNotes, chordDuration, now);
        // Play second chord after a delay
        polySynth.triggerAttackRelease(currentChordProgression.secondChordNotes, chordDuration, now + chordDuration + delayBetweenChords);
        
        setChordsPlayedForCurrentQuestion(true); // Mark that chords have been played for this question
        console.log(`Playing chord progression. First chord: ${currentChordProgression.firstChordNotes}, Second chord: ${currentChordProgression.secondChordNotes}`);
    }, [currentChordProgression, isSynthReady, startGlobalAudio]);

    // Function to handle user's guess
    const handleGuess = useCallback((guessedChordName) => {
        if (!chordsPlayedForCurrentQuestion) {
            setFeedbackMessage("Please play the chords first!");
            return;
        }
        if (hasGuessed || !currentChordProgression) return;

        setHasGuessed(true);
        setQuestionCount(prev => prev + 1);

        if (guessedChordName === currentChordProgression.correctAnswer) {
            setScore(prev => prev + 1);
            setFeedbackMessage('Correct!');
        } else {
            setFeedbackMessage('Incorrect!');
        }
        setRevealedAnswer(currentChordProgression.correctAnswer);
    }, [currentChordProgression, hasGuessed, chordsPlayedForCurrentQuestion]);

    // Start the quiz
    const startQuiz = useCallback(() => {
        setScore(0);
        setQuestionCount(0);
        setFeedbackMessage('');
        setHasGuessed(false);
        setRevealedAnswer(null);
        setChordsPlayedForCurrentQuestion(false);
        setQuizStarted(true);
        generateNewQuestion();
        console.log('Chord Quiz started.');
    }, [generateNewQuestion]);

    // Reset the quiz
    const resetQuiz = useCallback(() => {
        setQuizStarted(false);
        setScore(0);
        setQuestionCount(0);
        setFeedbackMessage('');
        setHasGuessed(false);
        setRevealedAnswer(null);
        setChordsPlayedForCurrentQuestion(false);
        setCurrentChordProgression(null);
        console.log('Chord Quiz reset.');
    }, []);

    // Combine errors for display
    const combinedError = audioContextError;

    return {
        score,
        questionCount,
        currentChordProgression,
        feedbackMessage,
        hasGuessed,
        quizStarted,
        isSynthReady,
        chordTypes: chordTypes.current, // Expose all chord type options for the UI
        playChordProgression,
        handleGuess,
        startQuiz,
        resetQuiz,
        error: combinedError,
        isAudioGloballyReady,
        startGlobalAudio,
        generateNewQuestion,
        revealedAnswer,
        chordsPlayedForCurrentQuestion
    };
};
// --- End useChordTraining Hook ---


// --- ChordTrainingQuizContent (Main UI Logic) ---
const ChordTrainingQuizContent = () => {
    const {
        score,
        questionCount,
        feedbackMessage,
        hasGuessed,
        quizStarted,
        isSynthReady,
        chordTypes,
        playChordProgression,
        handleGuess,
        startQuiz,
        resetQuiz,
        error,
        isAudioGloballyReady,
        startGlobalAudio,
        generateNewQuestion,
        revealedAnswer,
        chordsPlayedForCurrentQuestion
    } = useChordTraining();

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #e0f2f7 0%, #b3e5fc 50%, #81d4fa 100%)', // Light blue gradient
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

            <div className="text-center mb-8 sm:mb-10 z-10 w-full max-w-lg">
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-4">
                    <Music size={36} sm:size={48} className="text-blue-700" />
                    <h1 className="text-3xl sm:text-5xl font-extrabold text-blue-900 drop-shadow-lg">Chord Ear Training</h1>
                </div>
                {error && (
                    <p className="text-red-600 text-sm sm:text-base mt-2 sm:mt-4 font-semibold">
                        Error: {error}
                    </p>
                )}
                {!quizStarted && !isAudioGloballyReady && (
                    <p className="text-blue-700 text-sm sm:text-base mt-2 sm:mt-4">
                        Audio context suspended. Click "Start Quiz" or the button below to activate audio.
                    </p>
                )}
                {!isSynthReady && !error && (
                    <p className="text-blue-700 text-sm sm:text-base mt-2 sm:mt-4 animate-pulse">
                        Setting up audio synthesizer...
                    </p>
                )}
                {quizStarted && isSynthReady && (
                    <p className="text-blue-600 text-sm sm:text-base mt-2 sm:mt-4">
                        Question: {questionCount} | Score: {score}
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 sm:p-8 rounded-xl shadow-lg w-full max-w-xl flex flex-col items-center space-y-6 sm:space-y-8 z-10 border border-blue-200">
                {!quizStarted ? (
                    <>
                        <p className="text-base sm:text-lg text-gray-800 mb-4 text-center">
                            Identify the second chord in a two-chord progression.
                            The first chord will always be a Major Triad.
                        </p>
                        <button
                            onClick={startQuiz}
                            className="px-6 py-3 sm:px-8 sm:py-4 bg-blue-600 text-white rounded-lg font-bold text-lg sm:text-xl shadow-md hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 w-full sm:w-auto justify-center"
                            disabled={!isSynthReady && !error}
                        >
                            <Play size={20} sm:size={24} /> Start Quiz
                        </button>
                        {/* Fallback for audio activation */}
                        {!isAudioGloballyReady && !isSynthReady && error && error.includes("suspended") && (
                            <button
                                onClick={startGlobalAudio}
                                className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg font-bold shadow hover:bg-blue-600 transition-all duration-200 w-full sm:w-auto justify-center"
                            >
                                Click to Activate Audio
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <button
                            onClick={playChordProgression}
                            className="px-6 py-3 sm:px-8 sm:py-4 bg-purple-600 text-white rounded-full font-bold text-xl sm:text-2xl shadow-lg hover:bg-purple-700 transition-all duration-200 flex items-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
                            disabled={!isSynthReady || hasGuessed}
                        >
                            <Volume2 size={28} sm:size={32} /> Play Chords
                        </button>

                        {/* Feedback and Revealed Answer */}
                        {feedbackMessage && (
                            <p className={`text-lg sm:text-xl font-bold mt-4 ${feedbackMessage.includes('Correct') ? 'text-green-700' : (feedbackMessage.includes('Incorrect') ? 'text-red-700' : 'text-orange-700')}`}>
                                {feedbackMessage}
                            </p>
                        )}
                        {revealedAnswer && (
                            <p className="text-base sm:text-lg text-gray-700">
                                The correct answer was: <span className="font-semibold text-blue-800">{revealedAnswer}</span>
                            </p>
                        )}

                        <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full mt-6">
                            {chordTypes.map(chord => (
                                <button
                                    key={chord.name}
                                    onClick={() => handleGuess(chord.name)}
                                    className={`
                                        py-3 px-2 sm:py-4 sm:px-4 rounded-lg text-base sm:text-lg font-semibold shadow-md transition-all duration-100 ease-out transform
                                        ${hasGuessed ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white active:scale-98'}
                                    `}
                                    disabled={hasGuessed || !isSynthReady || !chordsPlayedForCurrentQuestion}
                                >
                                    {chord.name}
                                </button>
                            ))}
                        </div>

                        {/* Next Question and Reset Buttons */}
                        {hasGuessed && (
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 w-full justify-center">
                                <button
                                    onClick={generateNewQuestion}
                                    className="px-5 py-2 sm:px-6 sm:py-3 bg-green-500 text-white rounded-lg font-bold text-sm sm:text-base shadow hover:bg-green-600 transition-all duration-200 flex items-center gap-2 justify-center"
                                >
                                    <CheckCircle2 size={18} sm:size={20} /> Next Question
                                </button>
                                <button
                                    onClick={resetQuiz}
                                    className="px-5 py-2 sm:px-6 sm:py-3 bg-red-500 text-white rounded-lg font-bold text-sm sm:text-base shadow hover:bg-red-600 transition-all duration-200 flex items-center gap-2 justify-center"
                                >
                                    <RotateCcw size={18} sm:size={20} /> Reset Quiz
                                </button>
                            </div>
                        )}
                        {!hasGuessed && quizStarted && (
                             <button
                                onClick={resetQuiz}
                                className="mt-6 sm:mt-8 px-5 py-2 sm:px-6 sm:py-3 bg-red-500 text-white rounded-lg font-bold text-sm sm:text-base shadow hover:bg-red-600 transition-all duration-200 flex items-center gap-2 justify-center"
                            >
                                <RotateCcw size={18} sm:size={20} /> Reset Quiz
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// Error Boundary for robust application
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error: error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error in ChordTrainingQuiz:", error, errorInfo);
        this.setState({ errorInfo: errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-red-100 text-red-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Chord Training Quiz.</h2>
                    <p className="text-base mt-2">Please try refreshing the page. If the issue persists, contact support with the details below.</p>
                    {this.state.error && (
                        <details className="mt-4 text-sm text-gray-700 p-2 bg-red-50 rounded">
                            <summary>Error Details</summary>
                            <pre className="whitespace-pre-wrap">{this.state.error.toString()}</pre>
                            <pre className="whitespace-pre-wrap mt-2">{this.state.errorInfo?.componentStack}</pre>
                        </details>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export wrapping the main content with AudioContextProvider and ErrorBoundary
const ChordTrainingQuiz = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <ChordTrainingQuizContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default ChordTrainingQuiz;
