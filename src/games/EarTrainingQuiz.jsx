import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, RotateCcw, Volume2, Music } from 'lucide-react';

// --- AUDIO CONTEXT ---
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);
    const [error, setError] = useState(null);

    const startGlobalAudio = useCallback(async () => {
        if (Tone.context.state === 'running') {
            setIsAudioGloballyReady(true);
            setError(null);
            return;
        }

        try {
            await Tone.start();
            if (Tone.context.state === 'running') {
                setIsAudioGloballyReady(true);
                setError(null);
            } else {
                setIsAudioGloballyReady(false);
                setError("Failed to start audio. Browser context might be suspended.");
            }
        } catch (error) {
            setError("Failed to initialize audio. Please check your browser permissions.");
            setIsAudioGloballyReady(false);
        }
    }, []);

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
        handleToneContextChange();

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


// --- useEarTraining Hook ---
const useEarTraining = () => {
    const { isAudioGloballyReady, startGlobalAudio, error: audioContextError } = useContext(AudioContext);
    const synthRef = useRef(null);
    const reverbRef = useRef(null);
    const [score, setScore] = useState(0);
    const [questionCount, setQuestionCount] = useState(0);
    const [currentInterval, setCurrentInterval] = useState(null);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [hasGuessed, setHasGuessed] = useState(false);
    const [quizStarted, setQuizStarted] = useState(false);
    const [isSynthReady, setIsSynthReady] = useState(false);
    const [revealedAnswer, setRevealedAnswer] = useState(null);
    const [intervalPlayedForCurrentQuestion, setIntervalPlayedForCurrentQuestion] = useState(false);

    const intervals = useRef([
        { name: 'Unison', semitones: 0 },
        { name: 'Minor 2nd', semitones: 1 },
        { name: 'Major 2nd', semitones: 2 },
        { name: 'Minor 3rd', semitones: 3 },
        { name: 'Major 3rd', semitones: 4 },
        { name: 'Perfect 4th', semitones: 5 },
        { name: 'Tritone', semitones: 6 },
        { name: 'Perfect 5th', semitones: 7 },
        { name: 'Minor 6th', semitones: 8 },
        { name: 'Major 6th', semitones: 9 },
        { name: 'Minor 7th', semitones: 10 },
        { name: 'Major 7th', semitones: 11 },
        { name: 'Octave', semitones: 12 },
    ]);

    const disposeSynth = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.dispose();
            synthRef.current = null;
        }
        if (reverbRef.current) {
            reverbRef.current.dispose();
            reverbRef.current = null;
        }
        setIsSynthReady(false);
    }, []);

    useEffect(() => {
        disposeSynth();

        if (isAudioGloballyReady) {
            try {
                // Create a more musical reverb effect
                const reverb = new Tone.Reverb({
                    decay: 2.5,
                    wet: 0.3
                }).toDestination();
                reverbRef.current = reverb;

                // Create a more musical synthesizer with richer harmonics
                const synth = new Tone.PolySynth(Tone.Synth, {
                    oscillator: { 
                        type: "fatsawtooth",
                        partials: [1, 0.5, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05]
                    },
                    envelope: {
                        attack: 0.05,
                        decay: 0.3,
                        sustain: 0.4,
                        release: 1.2,
                    },
                    filter: {
                        frequency: 3000,
                        type: "lowpass",
                        rolloff: -12
                    },
                    filterEnvelope: {
                        attack: 0.02,
                        decay: 0.1,
                        sustain: 0.8,
                        release: 0.8,
                        baseFrequency: 800,
                        octaves: 2
                    }
                }).connect(reverb);

                // Add a subtle gain control for dynamics
                const gain = new Tone.Gain(0.7).connect(reverb);
                synth.disconnect();
                synth.connect(gain);

                synthRef.current = synth;
                setIsSynthReady(true);
            } catch (error) {
                setIsSynthReady(false);
            }
        }

        return disposeSynth;
    }, [isAudioGloballyReady, disposeSynth]);

    const generateNewQuestion = useCallback(() => {
        const rootMidi = Math.floor(Math.random() * 13) + 60;
        const rootNote = Tone.Midi(rootMidi).toNote();
        const randomInterval = intervals.current[Math.floor(Math.random() * intervals.current.length)];
        const secondMidi = rootMidi + randomInterval.semitones;
        const secondNote = Tone.Midi(secondMidi).toNote();

        setCurrentInterval({
            root: rootNote,
            second: secondNote,
            correctAnswer: randomInterval.name,
            semitones: randomInterval.semitones
        });
        setFeedbackMessage('');
        setHasGuessed(false);
        setRevealedAnswer(null);
        setIntervalPlayedForCurrentQuestion(false);
    }, []);

    const playInterval = useCallback(async () => {
        if (!currentInterval || !synthRef.current || !isSynthReady) return;

        if (Tone.context.state !== 'running') {
            await startGlobalAudio(); 
            if (Tone.context.state !== 'running') return;
        }

        const synth = synthRef.current;
        const now = Tone.now();
        const noteDuration = 1.0;
        const gap = 0.2;

        // Play notes with more musical timing and dynamics
        synth.triggerAttackRelease(currentInterval.root, noteDuration, now, 0.8);
        synth.triggerAttackRelease(currentInterval.second, noteDuration, now + noteDuration + gap, 0.8);
        
        // Also play them together harmonically after the melodic interval
        setTimeout(() => {
            if (synthRef.current) {
                synth.triggerAttackRelease([currentInterval.root, currentInterval.second], noteDuration * 1.5, Tone.now(), 0.6);
            }
        }, (noteDuration + gap + noteDuration + 0.3) * 1000);
        
        setIntervalPlayedForCurrentQuestion(true);
    }, [currentInterval, isSynthReady, startGlobalAudio]);

    const handleGuess = useCallback((guessedIntervalName) => {
        if (!intervalPlayedForCurrentQuestion) {
            setFeedbackMessage("Please play an interval first!");
            return;
        }
        if (hasGuessed || !currentInterval) return;

        setHasGuessed(true);
        setQuestionCount(prev => prev + 1);

        if (guessedIntervalName === currentInterval.correctAnswer) {
            setScore(prev => prev + 1);
            setFeedbackMessage('Correct!');
        } else {
            setFeedbackMessage('Incorrect!');
        }
        setRevealedAnswer(currentInterval.correctAnswer);
    }, [currentInterval, hasGuessed, intervalPlayedForCurrentQuestion]);

    const startQuiz = useCallback(() => {
        setScore(0);
        setQuestionCount(0);
        setFeedbackMessage('');
        setHasGuessed(false);
        setRevealedAnswer(null);
        setIntervalPlayedForCurrentQuestion(false);
        setQuizStarted(true);
        generateNewQuestion();
    }, [generateNewQuestion]);

    const resetQuiz = useCallback(() => {
        setQuizStarted(false);
        setScore(0);
        setQuestionCount(0);
        setFeedbackMessage('');
        setHasGuessed(false);
        setRevealedAnswer(null);
        setIntervalPlayedForCurrentQuestion(false);
        setCurrentInterval(null);
    }, []);

    const combinedError = audioContextError;

    return {
        score,
        questionCount,
        currentInterval,
        feedbackMessage,
        hasGuessed,
        quizStarted,
        isSynthReady,
        intervals: intervals.current,
        playInterval,
        handleGuess,
        startQuiz,
        resetQuiz,
        error: combinedError,
        isAudioGloballyReady,
        startGlobalAudio,
        generateNewQuestion,
        revealedAnswer,
        intervalPlayedForCurrentQuestion
    };
};
// --- End useEarTraining Hook ---


const EarTrainingQuizContent = () => {
    const {
        score,
        questionCount,
        feedbackMessage,
        hasGuessed,
        quizStarted,
        isSynthReady,
        intervals,
        playInterval,
        handleGuess,
        startQuiz,
        resetQuiz,
        error,
        isAudioGloballyReady,
        startGlobalAudio,
        generateNewQuestion,
        revealedAnswer,
        intervalPlayedForCurrentQuestion
    } = useEarTraining();

    return (
        <div
            className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
            style={{
                background: 'linear-gradient(135deg, #e0f2f7 0%, #b3e5fc 50%, #81d4fa 100%)',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%2303a9f4' d='M25 0l-5 5v15l5 5h15v-5h-10l5-5V5l-5-5H25zm50 0l5 5v15l-5 5h-15v-5h10l-5-5V5l5-5h-50zM0 75l5 5h15l5-5v-15l-5-5H5l-5 5v15zm75 0l-5 5h-15l-5-5v-15l5-5h15l5 5v15z'/%3E%3C/svg%3E\")",
                    backgroundSize: '200px 200px'
                }}
            ></div>

            <div className="text-center mb-6 md:mb-10 z-10 w-full">
                <div className="flex items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                    <Music size={32} className="text-blue-700 md:h-12 md:w-12" />
                    <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-blue-900 drop-shadow-lg">
                        Ear Training Quiz
                    </h1>
                </div>
                {error && (
                    <p className="text-red-600 text-xs md:text-sm mt-2 md:mt-4 font-semibold">
                        Error: {error}
                    </p>
                )}
                {!quizStarted && !isAudioGloballyReady && (
                    <p className="text-blue-700 text-xs md:text-sm mt-2 md:mt-4">
                        Audio context suspended. Click "Start Quiz" or the button below to activate audio.
                    </p>
                )}
                {!isSynthReady && !error && (
                    <p className="text-blue-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                        Setting up audio synthesizer...
                    </p>
                )}
                {quizStarted && isSynthReady && (
                    <p className="text-blue-600 text-sm md:text-base mt-2 md:mt-4">
                        Question: {questionCount} | Score: {score}
                    </p>
                )}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 lg:p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col items-center space-y-4 md:space-y-6 lg:space-y-8 z-10 border border-blue-200 mx-2">
                {!quizStarted ? (
                    <>
                        <p className="text-sm md:text-base lg:text-lg text-gray-800 mb-2 md:mb-4 text-center">
                            Test your musical ear! Identify common intervals played melodically and harmonically.
                        </p>
                        <button
                            onClick={startQuiz}
                            className="px-6 py-3 md:px-8 md:py-4 bg-blue-600 text-white rounded-lg font-bold text-lg md:text-xl shadow-md hover:bg-blue-700 transition-all duration-200 flex items-center gap-2"
                            disabled={!isSynthReady && !error}
                        >
                            <Play size={20} /> Start Quiz
                        </button>
                        {!isAudioGloballyReady && !isSynthReady && error && error.includes("suspended") && (
                            <button
                                onClick={startGlobalAudio}
                                className="mt-2 md:mt-4 px-4 py-2 md:px-6 md:py-3 bg-blue-500 text-white rounded-lg font-bold shadow hover:bg-blue-600 transition-all duration-200 text-sm md:text-base"
                            >
                                Click to Activate Audio
                            </button>
                        )}
                    </>
                ) : (
                    <>
                        <button
                            onClick={playInterval}
                            className="px-6 py-3 md:px-8 md:py-4 bg-purple-600 text-white rounded-full font-bold text-xl md:text-2xl shadow-lg hover:bg-purple-700 transition-all duration-200 flex items-center gap-2 md:gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!isSynthReady || hasGuessed}
                        >
                            <Volume2 size={24} className="md:h-8 md:w-8" /> Play Interval
                        </button>

                        {/* Feedback and Revealed Answer */}
                        {feedbackMessage && (
                            <p className={`text-base md:text-xl font-bold mt-2 md:mt-4 ${feedbackMessage.includes('Correct') ? 'text-green-700' : (feedbackMessage.includes('Incorrect') ? 'text-red-700' : 'text-orange-700')}`}>
                                {feedbackMessage}
                            </p>
                        )}
                        {revealedAnswer && (
                            <p className="text-sm md:text-base lg:text-lg text-gray-700 text-center">
                                The correct answer was: <span className="font-semibold text-blue-800">{revealedAnswer}</span>
                            </p>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3 lg:gap-4 w-full mt-4 md:mt-6">
                            {intervals.map(interval => (
                                <button
                                    key={interval.name}
                                    onClick={() => handleGuess(interval.name)}
                                    className={`
                                        py-2 px-1 md:py-3 md:px-2 rounded-lg text-sm md:text-base lg:text-lg font-semibold shadow-md transition-all duration-100 ease-out transform
                                        ${hasGuessed ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white active:scale-98'}
                                    `}
                                    disabled={hasGuessed || !isSynthReady || !intervalPlayedForCurrentQuestion}
                                >
                                    {interval.name}
                                </button>
                            ))}
                        </div>

                        {/* Next Question and Reset Buttons */}
                        {hasGuessed && (
                            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 lg:gap-4 mt-4 md:mt-6 lg:mt-8 w-full justify-center">
                                <button
                                    onClick={generateNewQuestion}
                                    className="px-4 py-2 md:px-6 md:py-3 bg-green-500 text-white rounded-lg font-bold shadow hover:bg-green-600 transition-all duration-200 flex items-center justify-center gap-1 md:gap-2 text-sm md:text-base"
                                >
                                    Next Question
                                </button>
                                <button
                                    onClick={resetQuiz}
                                    className="px-4 py-2 md:px-6 md:py-3 bg-red-500 text-white rounded-lg font-bold shadow hover:bg-red-600 transition-all duration-200 flex items-center justify-center gap-1 md:gap-2 text-sm md:text-base"
                                >
                                    <RotateCcw size={16} className="md:h-5 md:w-5" /> Reset Quiz
                                </button>
                            </div>
                        )}
                        {!hasGuessed && quizStarted && (
                             <button
                                onClick={resetQuiz}
                                className="mt-4 md:mt-6 px-4 py-2 md:px-6 md:py-3 bg-red-500 text-white rounded-lg font-bold shadow hover:bg-red-600 transition-all duration-200 flex items-center justify-center gap-1 md:gap-2 text-sm md:text-base w-full sm:w-auto"
                            >
                                <RotateCcw size={16} className="md:h-5 md:w-5" /> Reset Quiz
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error: error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught error in EarTrainingQuiz:", error, errorInfo);
        this.setState({ errorInfo: errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-red-100 text-red-800 font-bold text-lg md:text-xl p-4 md:p-8">
                    <h2>Oops! Something went wrong with the Ear Training Quiz.</h2>
                    <p className="text-sm md:text-base mt-2">Please try refreshing the page. If the issue persists, contact support with the details below.</p>
                    {this.state.error && (
                        <details className="mt-2 md:mt-4 text-xs md:text-sm text-gray-700 p-2 bg-red-50 rounded">
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

const EarTrainingQuiz = () => {
    return (
        <AudioContextProvider>
            <ErrorBoundary>
                <EarTrainingQuizContent />
            </ErrorBoundary>
        </AudioContextProvider>
    );
}

export default EarTrainingQuiz;