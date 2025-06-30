import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import * as Tone from 'tone';
import { Play, Pause, Circle, Square, Triangle, Activity, Volume2, Waves, RefreshCcw } from 'lucide-react';
import SEOHead from '../components/SEOHead';


// Define the tool object for SEO structured data
const synthesisChallengeTool = {
    id: 'synthesis-challenge',
    name: 'Synthesis Challenge',
    description: 'Test your sound design skills by recreating target sounds using synthesizer parameters.',
    path: '/synthesis-challenge',
    categories: [
        'Sound Design',
        'Synthesis',
        'Audio Challenge',
        'Electronic Music',
        'Sound Engineering'
    ]
};


// --- AUDIO CONTEXT ---
export const AudioContext = createContext(null);

const AudioContextProvider = ({ children }) => {
    const [isAudioGloballyReady, setIsAudioGloballyReady] = useState(false);

    const startGlobalAudio = useCallback(async () => {
        if (Tone.context.state === 'running') {
            setIsAudioGloballyReady(true);
            console.log('AudioContext: Tone.js context already running.');
            return;
        }
        try {
            console.log('AudioContext: Attempting to start global Tone.js context...');
            await Tone.start();
            if (Tone.context.state === 'running') {
                setIsAudioGloballyReady(true);
                console.log('AudioContext: Tone.js context started successfully');
            } else {
                console.warn('AudioContext: Tone.js context did not start properly (state is ' + Tone.context.state + ')');
                setIsAudioGloballyReady(false);
            }
        } catch (error) {
            console.error("AudioContext: Error starting Tone.js context:", error);
            setIsAudioGloballyReady(false);
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
        handleToneContextChange();
        return () => {
            Tone.context.off('statechange', handleToneContextChange);
        };
    }, []); // No need for isAudioGloballyReady in deps for this useEffect

    return (
        <AudioContext.Provider value={{ isAudioGloballyReady, startGlobalAudio }}>
            {children}
        </AudioContext.Provider>
    );
};
// --- END AUDIO CONTEXT ---


// --- useSynthesisChallengeSynth Hook ---
const useSynthesisChallengeSynth = () => {
    const { isAudioGloballyReady, startGlobalAudio } = useContext(AudioContext);

    // Refs for User's Synth
    const userOscillator1Ref = useRef(null);
    const userOscillator2Ref = useRef(null);
    const userGain1Ref = useRef(null);
    const userGain2Ref = useRef(null);
    const userMasterGainRef = useRef(null);
    const userEnvelopeRef = useRef(null);
    const userWaveformAnalyzerRef = useRef(null); // Analyzer for user's sound

    // Refs for Target Synth
    const targetOscillator1Ref = useRef(null);
    const targetOscillator2Ref = useRef(null);
    const targetGain1Ref = useRef(null);
    const targetGain2Ref = useRef(null);
    const targetMasterGainRef = useRef(null);
    const targetEnvelopeRef = useRef(null);
    const targetWaveformAnalyzerRef = useRef(null); // Analyzer for target sound

    const isSynthInitializedRef = useRef(false);

    const [isUserPlaying, setIsUserPlaying] = useState(false);
    const [isTargetPlaying, setIsTargetPlaying] = useState(false);

    // User's adjustable parameters
    const [userWaveformType1, setUserWaveformType1] = useState('sine');
    const [userFrequency1, setUserFrequency1] = useState(220);
    const [userVolume1, setUserVolume1] = useState(-10);

    const [userWaveformType2, setUserWaveformType2] = useState('square');
    const [userFrequency2, setUserFrequency2] = useState(440);
    const [userVolume2, setUserVolume2] = useState(-10);

    const [userMasterVolume, setUserMasterVolume] = useState(-5);
    // User's ADSR parameters
    const [userAttack, setUserAttack] = useState(0.1);
    const [userDecay, setUserDecay] = useState(0.2);
    const [userSustain, setUserSustain] = useState(0.5);
    const [userRelease, setUserRelease] = useState(0.5);

    // Target parameters (randomly generated)
    const [targetSettings, setTargetSettings] = useState(null);

    const [accuracyPercentage, setAccuracyPercentage] = useState(0);
    const [isAudioReady, setIsAudioReady] = useState(false); // Indicates if synth nodes are ready (not necessarily global context)
    const [isLoading, setIsLoading] = useState(false); // Indicates if audio setup is in progress

    const WAVEFORM_TYPES = ['sine', 'square', 'sawtooth', 'triangle'];
    const MIN_FREQ = 100;
    const MAX_FREQ = 800;
    const MIN_VOL = -30;
    const MAX_VOL = -5;
    const MIN_ATTACK = 0.01;
    const MAX_ATTACK = 1.0;
    const MIN_DECAY = 0.05;
    const MAX_DECAY = 2.0;
    const MIN_SUSTAIN = 0.1;
    const MAX_SUSTAIN = 1.0;
    const MIN_RELEASE = 0.1;
    const MAX_RELEASE = 3.0;


    // --- Audio Node Management ---
    const disposeAudioNodes = useCallback(() => {
        console.log('useSynthesisChallengeSynth: disposeAudioNodes called.');
        if (userOscillator1Ref.current) userOscillator1Ref.current.dispose();
        if (userOscillator2Ref.current) userOscillator2Ref.current.dispose();
        if (userGain1Ref.current) userGain1Ref.current.dispose();
        if (userGain2Ref.current) userGain2Ref.current.dispose();
        if (userMasterGainRef.current) userMasterGainRef.current.dispose();
        if (userEnvelopeRef.current) userEnvelopeRef.current.dispose();
        if (userWaveformAnalyzerRef.current) userWaveformAnalyzerRef.current.dispose();

        if (targetOscillator1Ref.current) targetOscillator1Ref.current.dispose();
        if (targetOscillator2Ref.current) targetOscillator2Ref.current.dispose();
        if (targetGain1Ref.current) targetGain1Ref.current.dispose();
        if (targetGain2Ref.current) targetGain2Ref.current.dispose();
        if (targetMasterGainRef.current) targetMasterGainRef.current.dispose();
        if (targetEnvelopeRef.current) targetEnvelopeRef.current.dispose();
        if (targetWaveformAnalyzerRef.current) targetWaveformAnalyzerRef.current.dispose();

        userOscillator1Ref.current = null; userOscillator2Ref.current = null;
        userGain1Ref.current = null; userGain2Ref.current = null;
        userMasterGainRef.current = null; userEnvelopeRef.current = null;
        userWaveformAnalyzerRef.current = null;

        targetOscillator1Ref.current = null; targetOscillator2Ref.current = null;
        targetGain1Ref.current = null; targetGain2Ref.current = null;
        targetMasterGainRef.current = null; targetEnvelopeRef.current = null;
        targetWaveformAnalyzerRef.current = null;

        setIsUserPlaying(false);
        setIsTargetPlaying(false);
        // setIsAudioReady will be set by its own useEffect.
        isSynthInitializedRef.current = false;
        console.log('useSynthesisChallengeSynth: All audio nodes disposed.');
    }, []);

    // Function to ensure audio context is running before playing any sound
    const ensureAudioContext = useCallback(async () => {
        if (Tone.context.state !== 'running') {
            await startGlobalAudio();
            if (Tone.context.state !== 'running') {
                console.warn('Audio context could not be started after user interaction. Cannot play sound.');
                return false;
            }
        }
        return true;
    }, [startGlobalAudio]);

    // Stop User Sound - Defined early to avoid reference errors
    const stopUserSound = useCallback(() => {
        if (userEnvelopeRef.current && isUserPlaying) {
            userEnvelopeRef.current.triggerRelease();
            setTimeout(() => {
                if (userOscillator1Ref.current) userOscillator1Ref.current.stop();
                if (userOscillator2Ref.current) userOscillator2Ref.current.stop();
            }, userRelease * 1000 + 50);
            setIsUserPlaying(false);
            console.log('User sound stopped via envelope release.');
        } else {
            console.warn('Cannot stop user sound. Not playing or not initialized.');
        }
    }, [isUserPlaying, userRelease]);

    // Stop Target Sound - Defined early to avoid reference errors
    const stopTargetSound = useCallback(() => {
        if (targetEnvelopeRef.current && isTargetPlaying) {
            targetEnvelopeRef.current.triggerRelease();
            setTimeout(() => {
                if (targetOscillator1Ref.current) targetOscillator1Ref.current.stop();
                if (targetOscillator2Ref.current) targetOscillator2Ref.current.stop();
            }, (targetSettings?.release || 0.5) * 1000 + 50);
            setIsTargetPlaying(false);
            console.log('Target sound stopped via envelope release.');
            // No need to explicitly set gain to -Infinity if envelope handles it.
            // if (targetMasterGainRef.current) {
            //     targetMasterGainRef.current.gain.value = Tone.dbToGain(-Infinity);
            // }
        } else {
            console.warn('Cannot stop target sound. Not playing or not initialized.');
        }
    }, [isTargetPlaying, targetSettings]);


    // --- Synth Initialization ---
    useEffect(() => {
        const setupAudio = async () => {
            if (isSynthInitializedRef.current) {
                console.log('useSynthesisChallengeSynth: Audio setup already completed, skipping.');
                return;
            }

            console.log('useSynthesisChallengeSynth: Setting up Tone.js components...');
            setIsLoading(true);

            try {
                disposeAudioNodes();

                // User Synth Setup
                const userOsc1 = new Tone.Oscillator({ type: userWaveformType1, frequency: userFrequency1 });
                const userOsc2 = new Tone.Oscillator({ type: userWaveformType2, frequency: userFrequency2 });
                const userGain1 = new Tone.Gain(Tone.dbToGain(userVolume1));
                const userGain2 = new Tone.Gain(Tone.dbToGain(userVolume2));
                const userMasterGain = new Tone.Gain(Tone.dbToGain(userMasterVolume));
                const userEnvelope = new Tone.AmplitudeEnvelope({
                    attack: userAttack, decay: userDecay, sustain: userSustain, release: userRelease,
                });
                const userWaveform = new Tone.Waveform(4096);

                userOsc1.connect(userGain1);
                userOsc2.connect(userGain2);
                userGain1.connect(userMasterGain);
                userGain2.connect(userMasterGain);
                userMasterGain.connect(userEnvelope);
                userEnvelope.connect(userWaveform); // User envelope output to user waveform analyzer
                userEnvelope.toDestination();

                userOscillator1Ref.current = userOsc1;
                userOscillator2Ref.current = userOsc2;
                userGain1Ref.current = userGain1;
                userGain2Ref.current = userGain2;
                userMasterGainRef.current = userMasterGain;
                userEnvelopeRef.current = userEnvelope;
                userWaveformAnalyzerRef.current = userWaveform;

                // Target Synth Setup
                const targetOsc1 = new Tone.Oscillator({ type: 'sine', frequency: 1 });
                const targetOsc2 = new Tone.Oscillator({ type: 'sine', frequency: 1 });
                const targetGain1 = new Tone.Gain(Tone.dbToGain(MAX_VOL)); // Fixed to MAX_VOL
                const targetGain2 = new Tone.Gain(Tone.dbToGain(MAX_VOL)); // Fixed to MAX_VOL
                const targetMasterGain = new Tone.Gain(Tone.dbToGain(MAX_VOL)); // Fixed to MAX_VOL
                const targetEnvelope = new Tone.AmplitudeEnvelope({
                    attack: MIN_ATTACK, decay: MIN_DECAY, sustain: MIN_SUSTAIN, release: MIN_RELEASE,
                });
                const targetWaveform = new Tone.Waveform(4096); // Re-added target waveform analyzer
                
                targetOsc1.connect(targetGain1);
                targetOsc2.connect(targetGain2);
                targetGain1.connect(targetMasterGain);
                targetGain2.connect(targetMasterGain);
                targetMasterGain.connect(targetEnvelope);
                targetEnvelope.connect(targetWaveform); // Target envelope output to target waveform analyzer
                targetEnvelope.toDestination();

                targetOscillator1Ref.current = targetOsc1;
                targetOscillator2Ref.current = targetOsc2;
                targetGain1Ref.current = targetGain1;
                targetGain2Ref.current = targetGain2;
                targetMasterGainRef.current = targetMasterGain;
                targetEnvelopeRef.current = targetEnvelope;
                targetWaveformAnalyzerRef.current = targetWaveform; // Store target waveform analyzer
                
                isSynthInitializedRef.current = true;
                console.log('useSynthesisChallengeSynth: All Tone.js components created and connected.');

                // --- NEW: Generate initial target settings immediately after synth initialization ---
                // We'll call it here directly to ensure targetSettings is populated on page load.
                // The `generateRandomTarget` is self-contained and safe to call here.
                // This is placed *after* the refs are assigned to ensure stopUserSound/stopTargetSound work.
                generateRandomTarget(); 

            } catch (error) {
                console.error("useSynthesisChallengeSynth: Error during initial Tone.js setup:", error);
                setIsAudioReady(false);
                isSynthInitializedRef.current = false;
                disposeAudioNodes();
            } finally {
                setIsLoading(false);
            }
        };

        setupAudio();

        return () => {
            console.log('useSynthesisChallengeSynth Cleanup: Running disposeAudioNodes on unmount.');
            disposeAudioNodes();
        };
    }, []); // Empty dependency array means this runs once on mount and cleans up on unmount


    // Update isAudioReady based on global audio and synth initialization status
    useEffect(() => {
        // isAudioReady means the core synth nodes are initialized AND Tone.context is running.
        // It's the overall readiness of the app to produce sound.
        const currentAudioReady = isAudioGloballyReady && isSynthInitializedRef.current;
        setIsAudioReady(currentAudioReady);
        console.log(`useSynthesisChallengeSynth: isAudioGloballyReady: ${isAudioGloballyReady}, isSynthInitialized: ${isSynthInitializedRef.current} => isAudioReady: ${currentAudioReady}`);
    }, [isAudioGloballyReady]); // Removed isSynthInitializedRef.current from deps, as it's a ref.

    // --- Parameter Updates for User Synth ---
    // These effects update parameters on existing Tone.js nodes.
    // They should run whenever the parameter changes, *after* the nodes are initialized.
    useEffect(() => {
        if (userOscillator1Ref.current && userGain1Ref.current && isSynthInitializedRef.current) {
            userOscillator1Ref.current.type = userWaveformType1;
            userOscillator1Ref.current.frequency.value = userFrequency1;
            userGain1Ref.current.gain.value = Tone.dbToGain(userVolume1);
        }
    }, [userWaveformType1, userFrequency1, userVolume1, isSynthInitializedRef.current]);

    useEffect(() => {
        if (userOscillator2Ref.current && userGain2Ref.current && isSynthInitializedRef.current) {
            userOscillator2Ref.current.type = userWaveformType2;
            userOscillator2Ref.current.frequency.value = userFrequency2;
            userGain2Ref.current.gain.value = Tone.dbToGain(userVolume2);
        }
    }, [userWaveformType2, userFrequency2, userVolume2, isSynthInitializedRef.current]);

    useEffect(() => {
        if (userMasterGainRef.current && userEnvelopeRef.current && isSynthInitializedRef.current) {
            userMasterGainRef.current.gain.value = Tone.dbToGain(userMasterVolume);
            userEnvelopeRef.current.attack = userAttack;
            userEnvelopeRef.current.decay = userDecay;
            userEnvelopeRef.current.sustain = userSustain;
            userEnvelopeRef.current.release = userRelease;
        }
    }, [userMasterVolume, userAttack, userDecay, userSustain, userRelease, isSynthInitializedRef.current]);


    // Play User Sound
    const playUserSound = useCallback(async () => {
        console.log('playUserSound called.');
        if (isLoading || !isSynthInitializedRef.current) { // Check loading and synth initialization
            console.warn('Cannot play user sound. Audio setup is loading or not initialized.');
            return;
        }
        if (isUserPlaying) { console.log('User sound already playing.'); return; }

        await stopTargetSound(); // Stop target sound if playing

        // Ensure audio context is running through user interaction
        if (Tone.context.state !== 'running') {
            await startGlobalAudio(); // Explicitly call to resume context
            if (Tone.context.state !== 'running') {
                console.warn('Audio context could not be started. Cannot play user sound.');
                return;
            }
        }

        try {
            userOscillator1Ref.current.start();
            userOscillator2Ref.current.start();
            userEnvelopeRef.current.triggerAttack();
            setIsUserPlaying(true);
            console.log('User oscillators started and envelope triggered.');
        } catch (e) {
            console.error("Error starting user oscillators:", e);
            setIsUserPlaying(false);
        }
    }, [isLoading, isUserPlaying, stopTargetSound, startGlobalAudio]); // Removed isAudioReady as a direct dependency.


    // Play Target Sound
    const playTargetSound = useCallback(async () => {
        console.log('playTargetSound called.');
        if (isLoading || !isSynthInitializedRef.current || !targetSettings) { // Check loading, synth initialization, and target settings
            console.warn('Cannot play target sound. Audio not ready, loading, or target not generated.');
            return;
        }
        if (isTargetPlaying) { console.log('Target sound already playing.'); return; }
        
        await stopUserSound(); // Stop user sound if playing

        // Ensure audio context is running through user interaction
        if (Tone.context.state !== 'running') {
            await startGlobalAudio(); // Explicitly call to resume context
            if (Tone.context.state !== 'running') {
                console.warn('Audio context could not be started. Cannot play target sound.');
                return;
            }
        }

        try {
            // Apply target settings to target synths - these are only set here
            targetOscillator1Ref.current.type = targetSettings.waveformType1;
            targetOscillator1Ref.current.frequency.value = targetSettings.frequency1;
            targetGain1Ref.current.gain.value = Tone.dbToGain(targetSettings.volume1);

            targetOscillator2Ref.current.type = targetSettings.waveformType2;
            targetOscillator2Ref.current.frequency.value = targetSettings.frequency2;
            targetGain2Ref.current.gain.value = Tone.dbToGain(targetSettings.volume2);
            
            targetMasterGainRef.current.gain.value = Tone.dbToGain(targetSettings.masterVolume);
            targetEnvelopeRef.current.attack = targetSettings.attack;
            targetEnvelopeRef.current.decay = targetSettings.decay;
            targetEnvelopeRef.current.sustain = targetSettings.sustain;
            targetEnvelopeRef.current.release = targetSettings.release;

            targetOscillator1Ref.current.start();
            targetOscillator2Ref.current.start();
            targetEnvelopeRef.current.triggerAttack();
            
            setIsTargetPlaying(true);
            console.log('Target oscillators started and envelope triggered.');
        } catch (e) {
            console.error("Error starting target oscillators:", e);
            setIsTargetPlaying(false);
        }
    }, [isLoading, isTargetPlaying, targetSettings, stopUserSound, startGlobalAudio]); // Removed isAudioReady as a direct dependency.

    // --- Challenge Logic ---
    const generateRandomTarget = useCallback(() => {
        console.log('Generating new random target.');
        stopUserSound();
        stopTargetSound();

        const randomWaveform1 = WAVEFORM_TYPES[Math.floor(Math.random() * WAVEFORM_TYPES.length)];
        const randomFrequency1 = Math.round(Math.random() * (MAX_FREQ - MIN_FREQ) + MIN_FREQ);
        const fixedVolume1 = MAX_VOL; // Fixed volume1 for target

        const randomWaveform2 = WAVEFORM_TYPES[Math.floor(Math.random() * WAVEFORM_TYPES.length)];
        const randomFrequency2 = Math.round(Math.random() * (MAX_FREQ - MIN_FREQ) + MIN_FREQ);
        const fixedVolume2 = MAX_VOL; // Fixed volume2 for target
        
        const fixedMasterVolume = MAX_VOL; // Fixed masterVolume for target

        const randomAttack = parseFloat((Math.random() * (MAX_ATTACK - MIN_ATTACK) + MIN_ATTACK).toFixed(2));
        const randomDecay = parseFloat((Math.random() * (MAX_DECAY - MIN_DECAY) + MIN_DECAY).toFixed(2));
        const randomSustain = parseFloat((Math.random() * (MAX_SUSTAIN - MIN_SUSTAIN) + MIN_SUSTAIN).toFixed(2));
        const randomRelease = parseFloat((Math.random() * (MAX_RELEASE - MIN_RELEASE) + MIN_RELEASE).toFixed(2));

        const newTarget = {
            waveformType1: randomWaveform1, frequency1: randomFrequency1, volume1: fixedVolume1,
            waveformType2: randomWaveform2, frequency2: randomFrequency2, volume2: fixedVolume2,
            masterVolume: fixedMasterVolume,
            attack: randomAttack, decay: randomDecay, sustain: randomSustain, release: randomRelease,
        };
        setTargetSettings(newTarget);
        setAccuracyPercentage(0); // Reset accuracy for new challenge
        console.log('New Target Generated:', newTarget);
    }, [stopUserSound, stopTargetSound, WAVEFORM_TYPES, MAX_VOL, MIN_FREQ, MAX_FREQ, MIN_ATTACK, MAX_ATTACK, MIN_DECAY, MAX_DECAY, MIN_SUSTAIN, MAX_SUSTAIN, MIN_RELEASE, MAX_RELEASE]);

    // Calculate accuracy between user's settings and target settings
    useEffect(() => {
        if (!targetSettings || isLoading) {
            setAccuracyPercentage(0);
            return;
        }

        let score = 0;
        let maxPossibleScore = 0;

        // --- Waveform Type Comparison ---
        maxPossibleScore += 2;
        if (userWaveformType1 === targetSettings.waveformType1) score += 1;
        if (userWaveformType2 === targetSettings.waveformType2) score += 1;
        
        // --- Numerical Parameter Comparison (Binary hit/miss within tolerance) ---
        const FREQ_TOLERANCE_PERCENT = 0.20;
        const VOL_TOLERANCE_DB = 7;
        const ADSR_ABSOLUTE_TOLERANCE = 0.15; // +/- 0.15s for ADSR values

        const compareNumerical = (userVal, targetVal, type) => {
            const diff = Math.abs(userVal - targetVal);
            if (type === 'freq') {
                const tolerance = targetVal * FREQ_TOLERANCE_PERCENT;
                return diff <= tolerance ? 1 : 0;
            } else if (type === 'vol') {
                return diff <= VOL_TOLERANCE_DB ? 1 : 0;
            } else if (type === 'adsr') {
                return diff <= ADSR_ABSOLUTE_TOLERANCE ? 1 : 0; // Use absolute tolerance for ADSR
            }
            return 0;
        };
        
        maxPossibleScore += 9;

        score += compareNumerical(userFrequency1, targetSettings.frequency1, 'freq');
        score += compareNumerical(userVolume1, targetSettings.volume1, 'vol');
        score += compareNumerical(userFrequency2, targetSettings.frequency2, 'freq');
        score += compareNumerical(userVolume2, targetSettings.volume2, 'vol');
        score += compareNumerical(userMasterVolume, targetSettings.masterVolume, 'vol');
        score += compareNumerical(userAttack, targetSettings.attack, 'adsr');
        score += compareNumerical(userDecay, targetSettings.decay, 'adsr');
        score += compareNumerical(userSustain, targetSettings.sustain, 'adsr');
        score += compareNumerical(userRelease, targetSettings.release, 'adsr');

        const calculatedPercentage = (score / maxPossibleScore) * 100;
        setAccuracyPercentage(Math.round(calculatedPercentage));

    }, [userWaveformType1, userFrequency1, userVolume1, userWaveformType2, userFrequency2, userVolume2, userMasterVolume, userAttack, userDecay, userSustain, userRelease, targetSettings, isLoading]);


    return {
        isUserPlaying, playUserSound, stopUserSound,
        isTargetPlaying, playTargetSound, stopTargetSound,
        isAudioReady, isLoading,
        userWaveformType1, setUserWaveformType1, userFrequency1, setUserFrequency1, userVolume1, setUserVolume1,
        userWaveformType2, setUserWaveformType2, userFrequency2, setUserFrequency2, userVolume2, setUserVolume2,
        userMasterVolume, setUserMasterVolume,
        userAttack, setUserAttack, userDecay, setUserDecay, userSustain, setUserSustain, userRelease, setUserRelease,
        userWaveformAnalyzer: userWaveformAnalyzerRef.current,
        targetWaveformAnalyzer: targetWaveformAnalyzerRef.current, // Re-exposed target visualizer
        targetSettings, generateRandomTarget, accuracyPercentage,
        WAVEFORM_TYPES
    };
};
// --- End useSynthesisChallengeSynth Hook ---


// --- ParameterSlider Component ---
const ParameterSlider = ({ label, value, setter, min, max, step, explanation, unit = '', isDisabled, colorClass = 'accent-blue-600 bg-blue-100' }) => (
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


// --- WaveformVisualizer Component ---
const WaveformVisualizer = ({ waveformAnalyzer, isAudioReady, isPlaying }) => {
    const canvasRef = useRef(null);
    const animationFrameId = useRef(null); // For requestAnimationFrame cleanup

    // START OF CHANGES IN drawWaveform FUNCTION
    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;
        // This initial check for readiness is now less critical here because `animate` controls when `drawWaveform` is called.
        if (!canvas || !waveformAnalyzer || !isPlaying) { // Only draw if playing
            return;
        }

        const ctx = canvas.getContext('2d');
        const bufferLength = waveformAnalyzer.getValue().length;
        const dataArray = waveformAnalyzer.getValue();

        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous drawing

        // Get the device pixel ratio (DPR)
        const dpr = window.devicePixelRatio || 1;

        // Reset the transformation matrix and apply DPR scaling.
        // This ensures all subsequent drawing operations are scaled correctly for the display.
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Adjust line width by DPR so it appears the same thickness regardless of screen density.
        ctx.lineWidth = 2 / dpr;
        ctx.strokeStyle = '#8b5cf6'; // Purple color for the waveform
        ctx.beginPath();

        // Use canvas's *CSS* dimensions (offsetWidth/offsetHeight) for drawing calculations.
        // `setTransform` handles the conversion to physical pixels.
        const displayWidth = canvas.offsetWidth;
        const displayHeight = canvas.offsetHeight;

        const sliceWidth = displayWidth * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i]; // Value is between -1 and 1
            // Scale 'v' to fit the canvas height, mapping -1 to 0 (top) and 1 to displayHeight (bottom).
            // This centers the waveform vertically if data is symmetrical around 0.
            const y = (v + 1) / 2 * displayHeight; 

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        // Ensure it reaches the end of the visible waveform area.
        if (bufferLength > 0) {
             ctx.lineTo(displayWidth, (dataArray[bufferLength - 1] + 1) / 2 * displayHeight);
        }
        ctx.stroke();

        // Removed the `requestAnimationFrame` call from here. The `animate` function now manages the loop.
    }, [waveformAnalyzer, isPlaying]); // Added isPlaying to deps


    // NEW: Helper function to manage the requestAnimationFrame loop.
    // This provides a cleaner way to start/stop the animation from useEffect.
    const animate = useCallback(() => {
        if (!isPlaying || !isAudioReady || !waveformAnalyzer || !canvasRef.current) {
            // If conditions are not met, ensure the animation loop is stopped.
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
            // Clear canvas when not playing or not ready
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for clean clear
            }
            return;
        }
        drawWaveform(); // Call the drawing function for the current frame.
        animationFrameId.current = requestAnimationFrame(animate); // Request the next frame.
    }, [isPlaying, isAudioReady, waveformAnalyzer, drawWaveform]);


    // START OF CHANGES IN useEffect HOOK
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const dpr = window.devicePixelRatio || 1;
            const parent = canvas.parentElement; // Get the parent element to determine its rendered size.
            if (!parent) return; // Defensive check.

            const newWidth = parent.offsetWidth;
            const newHeight = parent.offsetHeight;

            // Defensive check for zero dimensions. If the parent is hidden or has no size, skip resizing.
            if (newWidth === 0 || newHeight === 0) {
                console.warn("Canvas parent has zero dimensions, skipping resize and redraw.");
                return;
            }

            // Set the canvas's internal drawing buffer size (its "resolution") to match physical pixels.
            canvas.width = newWidth * dpr;
            canvas.height = newHeight * dpr;
            // IMPORTANT: Removed `ctx.scale(dpr, dpr);` from here. The `setTransform` in `drawWaveform` now handles this for each frame.
            drawWaveform(); // Redraw immediately after the canvas is resized.
        };

        // Replaced `window.addEventListener('resize')` with `ResizeObserver`.
        // This is more efficient and accurate as it only triggers when the *observed element's* size changes.
        const observer = new ResizeObserver(() => {
            resizeCanvas();
        });
        observer.observe(canvas.parentElement); // Observe the parent div that dictates the canvas's size.

        resizeCanvas(); // Perform an initial resize and draw when the component mounts.

        // Manage the animation loop: start it if conditions are met, stop it otherwise.
        if (isPlaying && isAudioReady && waveformAnalyzer) {
            if (!animationFrameId.current) { // Only start the loop if it's not already running.
                animate(); // Start the animation loop using the new `animate` function.
            }
        } else {
            if (animationFrameId.current) { // Only stop if the loop is currently running.
                cancelAnimationFrame(animationFrameId.current);
                animationFrameId.current = null;
            }
            // When audio is stopped or not ready, ensure the canvas is cleared to prevent stale drawings.
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the entire physical canvas.
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset the context transform to default for clean clearing.
        }

        // Cleanup function: runs when the component unmounts or dependencies of this effect change.
        return () => {
            observer.disconnect(); // Stop observing the parent element.
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current); // Cancel any pending animation frames.
                animationFrameId.current = null;
            }
        };
    }, [drawWaveform, isPlaying, isAudioReady, waveformAnalyzer, animate]); // Added `animate` to dependencies. Removed `animate` from deps, as it's a stable useCallback.
    // END OF CHANGES IN useEffect HOOK

    return (
        <div className="w-full h-48 bg-gray-900 rounded-lg overflow-hidden border border-purple-300 shadow-inner flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full"></canvas>
            {!isAudioReady && <p className="absolute text-gray-400 text-lg">Waiting for audio...</p>}
            {isAudioReady && !isPlaying && <p className="absolute text-gray-400 text-lg">Press Play to see waveform</p>}
        </div>
    );
};
// --- End WaveformVisualizer Component ---


// --- SynthesisChallengeContent (Main UI Logic) ---
const SynthesisChallengeContent = () => {
    const {
        isUserPlaying, playUserSound, stopUserSound,
        isTargetPlaying, playTargetSound, stopTargetSound,
        isAudioReady, isLoading,
        userWaveformType1, setUserWaveformType1, userFrequency1, setUserFrequency1, userVolume1, setUserVolume1,
        userWaveformType2, setUserWaveformType2, userFrequency2, setUserFrequency2, userVolume2, setUserVolume2,
        userMasterVolume, setUserMasterVolume,
        userAttack, setUserAttack, userDecay, setUserDecay, userSustain, setUserSustain, userRelease, setUserRelease,
        userWaveformAnalyzer,
        targetWaveformAnalyzer,
        targetSettings, generateRandomTarget, accuracyPercentage,
        WAVEFORM_TYPES
    } = useSynthesisChallengeSynth();

    const currentVisualizerAnalyzer = isUserPlaying ? userWaveformAnalyzer : targetWaveformAnalyzer;
    const currentVisualizerTitle = isUserPlaying ? "Your Waveform" : "Target Waveform";
    const currentVisualizerBorderColor = isUserPlaying ? "border-blue-500" : "border-purple-500";

    const getExplanation = (param) => {
        switch (param) {
            case 'frequency': return "Pitch of the sound (Hz)";
            case 'volume': return "Loudness of the sound (dB)";
            case 'masterVolume': return "Overall loudness";
            case 'attack': return "Time to reach peak volume (s)";
            case 'decay': return "Time to fall to sustain level (s)";
            case 'sustain': return "Volume while held (0-1)";
            case 'release': return "Fade out time after release (s)";
            default: return "Adjust parameters to shape your sound";
        }
    };

    const waveformOptions = WAVEFORM_TYPES.map(type => {
        let IconComponent;
        switch (type) {
            case 'sine': IconComponent = Circle; break;
            case 'square': IconComponent = Square; break;
            case 'sawtooth': IconComponent = Activity; break;
            case 'triangle': IconComponent = Triangle; break;
            default: IconComponent = Waves;
        }
        return { type, label: type.charAt(0).toUpperCase() + type.slice(1), Icon: IconComponent };
    });

    useEffect(() => {
        // This useEffect is no longer needed to generate initial target settings
        // as generateRandomTarget is now called directly in the synth setup useEffect.
        // It remains here only for its previous role, which is now redundant for initial load.
        // It will still run if targetSettings somehow becomes null AFTER initial load and isAudioReady becomes true.
        if (isAudioReady && !targetSettings) {
            generateRandomTarget();
        }
    }, [isAudioReady, targetSettings, generateRandomTarget]);

    return (
        <>
            {/* SEO Head - Add this at the very beginning */}
            <SEOHead 
                pageId="synthesis-challenge" 
                tool={synthesisChallengeTool}
                customData={{}}
            />

            <div
                className="min-h-screen flex flex-col items-center p-4 md:p-8 relative overflow-hidden w-full"
                style={{
                    background: 'linear-gradient(135deg, #e6ffe6 0%, #ccffcc 50%, #b3ffb3 100%)',
                    fontFamily: 'Inter, sans-serif',
                }}
            >
                {/* Floating Icons Background */}
                <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%2322c55e' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
                        backgroundSize: '200px 200px'
                    }}
                ></div>

                <div className="text-center mb-6 md:mb-10 z-10 w-full px-2">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
                        <Waves size={36} className="text-green-700 md:mb-0 mb-2" />
                        <h1 className="text-3xl md:text-5xl font-extrabold text-green-900 drop-shadow-lg">
                            Synthesis Challenge
                        </h1>
                    </div>
                    {!isAudioReady && !isLoading && (
                        <p className="text-green-700 text-xs md:text-sm mt-2 md:mt-4">
                            Tap any 'Play' button to activate audio
                        </p>
                    )}
                    {isLoading && (
                        <p className="text-green-700 text-xs md:text-sm mt-2 md:mt-4 animate-pulse">
                            Setting up audio...
                        </p>
                    )}
                    {isAudioReady && !isLoading && (
                        <p className="text-green-600 text-base md:text-lg font-semibold mt-2 md:mt-4">
                            Recreate the Target Sound!
                        </p>
                    )}
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-4 md:p-8 rounded-xl shadow-lg w-full max-w-5xl flex flex-col items-center space-y-4 md:space-y-8 z-10 border border-green-200 mx-2">

                    {/* Challenge Actions */}
                    <div className="flex flex-wrap justify-center gap-3 md:gap-4 mb-4 md:mb-6 w-full">
                        <button
                            type="button"
                            onClick={generateRandomTarget}
                            className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-bold text-sm md:text-md flex items-center gap-1 md:gap-2 transition-all duration-300
                                    ${!isLoading // Enabled if not loading
                                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                        : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                            disabled={isLoading} // Changed to isLoading
                        >
                            <RefreshCcw size={18} className="md:w-5 md:h-5 w-4 h-4" />
                            New Challenge
                        </button>

                        <button
                            type="button"
                            onClick={playTargetSound}
                            className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-bold text-sm md:text-md flex items-center gap-1 md:gap-2 transition-all duration-300
                                    ${isAudioReady && !isLoading && !isTargetPlaying && targetSettings // Still need targetSettings to exist
                                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                        : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                            disabled={isTargetPlaying || isLoading || !targetSettings} // Simplified
                        >
                            <Play size={18} className="md:w-5 md:h-5 w-4 h-4" />
                            Play Target
                        </button>

                        <button
                            type="button"
                            onClick={stopTargetSound}
                            className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-bold text-sm md:text-md flex items-center gap-1 md:gap-2 transition-all duration-300
                                    ${isTargetPlaying && isAudioReady // Only enabled if currently playing and audio ready
                                        ? 'bg-blue-700 hover:bg-blue-800 text-white'
                                        : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                    `}
                            disabled={!isTargetPlaying} // Simplified
                        >
                            <Pause size={18} className="md:w-5 md:h-5 w-4 h-4" />
                            Stop Target
                        </button>
                    </div>

                    {/* Accuracy Display */}
                    <div className="w-full text-center py-3 md:py-4 bg-green-100 rounded-lg border border-green-300 shadow-md">
                        <p className="text-xl md:text-2xl font-bold text-green-800">
                            Accuracy: {accuracyPercentage}%
                        </p>
                        <p className="text-xs md:text-sm text-green-700">Get closer to 100%!</p>
                    </div>

                    {/* Single Visualizer Section */}
                    <div className="w-full mt-4 md:mt-6 flex flex-col items-center">
                        <h2 className="text-xl md:text-2xl font-bold text-green-800 mb-3 md:mb-4">Current Sound</h2>
                        <WaveformVisualizer
                            waveformAnalyzer={currentVisualizerAnalyzer}
                            isAudioReady={isAudioReady}
                            isPlaying={isUserPlaying || isTargetPlaying}
                            title={currentVisualizerTitle}
                            borderColor={currentVisualizerBorderColor}
                        />
                        <div className="flex gap-3 md:gap-4 mt-3 md:mt-4">
                            <button
                                type="button"
                                onClick={playUserSound}
                                className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-bold text-sm md:text-md flex items-center gap-1 md:gap-2 transition-all duration-300
                                        ${!isUserPlaying && !isLoading // Enabled if not playing and not loading
                                            ? 'bg-green-500 hover:bg-green-600 text-white'
                                            : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                        `}
                                disabled={isUserPlaying || isLoading} // Simplified
                            >
                                <Play size={18} className="md:w-5 md:h-5 w-4 h-4" />
                                Play Yours
                            </button>

                            <button
                                type="button"
                                onClick={stopUserSound}
                                className={`px-4 py-2 md:px-6 md:py-3 rounded-full font-bold text-sm md:text-md flex items-center gap-1 md:gap-2 transition-all duration-300
                                        ${isUserPlaying && isAudioReady // Only enabled if currently playing and audio ready
                                            ? 'bg-green-700 hover:bg-green-800 text-white'
                                            : 'bg-gray-400 cursor-not-allowed text-gray-700'}
                                        `}
                                disabled={!isUserPlaying} // Simplified
                            >
                                <Pause size={18} className="md:w-5 md:h-5 w-4 h-4" />
                                Stop Yours
                            </button>
                        </div>
                    </div>

                    {/* User's Synth Controls */}
                    <div className="grid grid-cols-1 gap-6 md:gap-8 w-full mt-4 md:mt-6">
                        {/* Wave 1 Controls */}
                        <div className="bg-green-50/70 p-4 md:p-6 rounded-lg border border-green-100 flex flex-col items-center shadow-inner">
                            <h2 className="text-xl md:text-2xl font-bold text-green-800 mb-3 md:mb-4">Wave 1</h2>
                            <div className="flex justify-center gap-1 md:gap-2 mb-4 md:mb-6 flex-wrap">
                                {waveformOptions.map(({ type, label, Icon }) => (
                                    <button
                                        key={`user-wave1-${type}`}
                                        onClick={() => setUserWaveformType1(type)}
                                        className={`px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1 transition-all duration-200
                                                ${userWaveformType1 === type
                                                    ? 'bg-green-600 text-white shadow-md'
                                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                                                ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                                            `}
                                        disabled={isLoading} // Changed to isLoading
                                    >
                                        <Icon size={14} className="md:w-4 md:h-4 w-3 h-3" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <ParameterSlider
                                label="Freq 1" value={userFrequency1} setter={setUserFrequency1}
                                min="20" max="1000" step="1" unit=" Hz"
                                explanation={getExplanation('frequency')}
                                isDisabled={isLoading} // Changed to isLoading
                                colorClass="accent-green-600 bg-green-100"
                            />
                            <ParameterSlider
                                label="Vol 1" value={userVolume1} setter={setUserVolume1}
                                min="-60" max="0" step="1" unit=" dB"
                                explanation={getExplanation('volume')}
                                isDisabled={isLoading} // Changed to isLoading
                                colorClass="accent-green-600 bg-green-100"
                            />
                        </div>

                        {/* Wave 2 Controls */}
                        <div className="bg-green-50/70 p-4 md:p-6 rounded-lg border border-green-100 flex flex-col items-center shadow-inner">
                            <h2 className="text-xl md:text-2xl font-bold text-green-800 mb-3 md:mb-4">Wave 2</h2>
                            <div className="flex justify-center gap-1 md:gap-2 mb-4 md:mb-6 flex-wrap">
                                {waveformOptions.map(({ type, label, Icon }) => (
                                    <button
                                        key={`user-wave2-${type}`}
                                        onClick={() => setUserWaveformType2(type)}
                                        className={`px-3 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-semibold flex items-center gap-1 transition-all duration-200
                                                ${userWaveformType2 === type
                                                    ? 'bg-green-600 text-white shadow-md'
                                                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}
                                                ${isLoading ? 'cursor-not-allowed opacity-50' : ''}
                                            `}
                                        disabled={isLoading} // Changed to isLoading
                                    >
                                        <Icon size={14} className="md:w-4 md:h-4 w-3 h-3" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <ParameterSlider
                                label="Freq 2" value={userFrequency2} setter={setUserFrequency2}
                                min="20" max="1000" step="1" unit=" Hz"
                                explanation={getExplanation('frequency')}
                                isDisabled={isLoading} // Changed to isLoading
                                colorClass="accent-green-600 bg-green-100"
                            />
                            <ParameterSlider
                                label="Vol 2" value={userVolume2} setter={setUserVolume2}
                                min="-60" max="0" step="1" unit=" dB"
                                explanation={getExplanation('volume')}
                                isDisabled={isLoading} // Changed to isLoading
                                colorClass="accent-green-600 bg-green-100"
                            />
                        </div>
                    </div>

                    {/* ADSR Controls */}
                    <div className="w-full mt-6 md:mt-8 pt-4 md:pt-6 border-t border-green-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                        <ParameterSlider
                            label="Attack" value={userAttack} setter={setUserAttack}
                            min="0.01" max="1" step="0.01" unit=" s"
                            explanation={getExplanation('attack')}
                            isDisabled={isLoading} // Changed to isLoading
                            colorClass="accent-teal-600 bg-teal-100"
                        />
                        <ParameterSlider
                            label="Decay" value={userDecay} setter={setUserDecay}
                            min="0.05" max="2" step="0.05" unit=" s"
                            explanation={getExplanation('decay')}
                            isDisabled={isLoading} // Changed to isLoading
                            colorClass="accent-teal-600 bg-teal-100"
                        />
                        <ParameterSlider
                            label="Sustain" value={userSustain} setter={setUserSustain}
                            min="0.1" max="1" step="0.01" unit=" "
                            explanation={getExplanation('sustain')}
                            isDisabled={isLoading} // Changed to isLoading
                            colorClass="accent-teal-600 bg-teal-100"
                        />
                        <ParameterSlider
                            label="Release" value={userRelease} setter={setUserRelease}
                            min="0.1" max="3" step="0.05" unit=" s"
                            explanation={getExplanation('release')}
                            isDisabled={isLoading} // Changed to isLoading
                            colorClass="accent-teal-600 bg-teal-100"
                        />
                    </div>

                    {/* Master Volume Slider */}
                    <div className="w-full mt-6 md:mt-8 pt-4 md:pt-6 border-t border-green-200">
                        <ParameterSlider
                            label="Master Vol" value={userMasterVolume} setter={setUserMasterVolume}
                            min="-40" max="0" step="1" unit=" dB"
                            explanation={getExplanation('masterVolume')}
                            isDisabled={isLoading} // Changed to isLoading
                            colorClass="accent-green-700 bg-green-200"
                        />
                    </div>

                    <div className="text-center text-gray-700 text-xs md:text-sm mt-4 md:mt-6 italic px-2">
                        **Instructions:** Tap "New Challenge" for a target sound. Adjust "Wave 1" and "Wave 2" parameters and ADSR settings to match it. "Accuracy" shows how close you are!
                    </div>
                </div>
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
        console.error("Uncaught error in SynthesisChallenge:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-green-100 text-green-800 font-bold text-xl p-8 rounded-lg shadow-lg">
                    <h2>Oops! Something went wrong with the Synthesis Challenge. Please try refreshing the page.</h2>
                </div>
            );
        }

        return this.props.children;
    }
}

// Default export wrapping the main content with AudioContextProvider and ErrorBoundary
const SynthesisChallenge = () => {
    return (
        <AudioContext.Provider value={{ isAudioGloballyReady: true, startGlobalAudio: async () => {} }}>
            <ErrorBoundary>
                <SynthesisChallengeContent />
            </ErrorBoundary>
        </AudioContext.Provider>
    );
}

export default SynthesisChallenge;
