import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Music } from 'lucide-react';

const PianoRollBasics = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [notes, setNotes] = useState({});
  const [audioContext, setAudioContext] = useState(null);
  const [tempo, setTempo] = useState(120);
  const [isMuted, setIsMuted] = useState(false);
  const [activeNote, setActiveNote] = useState(null);

  const pianoKeys = [
    { name: 'B4', freq: 493.88, isBlack: false },
    { name: 'A#4', freq: 466.16, isBlack: true },
    { name: 'A4', freq: 440.00, isBlack: false },
    { name: 'G#4', freq: 415.30, isBlack: true },
    { name: 'G4', freq: 392.00, isBlack: false },
    { name: 'F#4', freq: 369.99, isBlack: true },
    { name: 'F4', freq: 349.23, isBlack: false },
    { name: 'E4', freq: 329.63, isBlack: false },
    { name: 'D#4', freq: 311.13, isBlack: true },
    { name: 'D4', freq: 293.66, isBlack: false },
    { name: 'C#4', freq: 277.18, isBlack: true },
    { name: 'C4', freq: 261.63, isBlack: false },
  ];

  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(ctx);
    return () => {
      if (ctx) ctx.close();
    };
  }, []);

  const playNote = useCallback((freq, noteName) => {
    if (!audioContext || isMuted) return;
    
    setActiveNote(noteName);
    setTimeout(() => setActiveNote(null), 200);

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.frequency.value = freq;
    osc.type = 'sine';

    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    osc.start();
    osc.stop(audioContext.currentTime + 0.5);
  }, [audioContext, isMuted]);

  const toggleNote = (step, keyIndex) => {
    const key = `${step}-${keyIndex}`;
    const newNotes = { ...notes };

    if (newNotes[key]) {
      delete newNotes[key];
    } else {
      newNotes[key] = true;
      playNote(pianoKeys[keyIndex].freq, pianoKeys[keyIndex].name);
    }
    setNotes(newNotes);
  };

  useEffect(() => {
    if (!isPlaying) return;

    const stepTime = (60 / tempo) * 250;

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        const nextStep = (prev + 1) % 16;

        pianoKeys.forEach((key, keyIndex) => {
          if (notes[`${nextStep}-${keyIndex}`]) {
            playNote(key.freq, key.name);
          }
        });

        return nextStep;
      });
    }, stepTime);

    return () => clearInterval(interval);
  }, [isPlaying, notes, playNote, tempo]);

  const togglePlay = () => {
    if (audioContext?.state === 'suspended') {
      audioContext.resume();
    }
    setIsPlaying(!isPlaying);
  };

  const clearAll = () => {
    setNotes({});
    setIsPlaying(false);
    setCurrentStep(0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div 
      className="min-h-screen flex flex-col p-4 md:p-8 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 50%, #d8b4fe 100%)',
      }}
    >
      {/* Floating Music Notes Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%237e22ce' d='M25 0l-5 5v15l5 5h15v-5h-10l5-5V5l-5-5H25zm50 0l5 5v15l-5 5h-15v-5h10l-5-5V5l5-5h-50zM0 75l5 5h15l5-5v-15l-5-5H5l-5 5v15zm75 0l-5 5h-15l-5-5v-15l5-5h15l5 5v15z'/%3E%3C/svg%3E\")",
          backgroundSize: '200px 200px'
        }}
      ></div>

      {/* Header */}
      <div className="text-center py-4 md:py-6 z-10">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Music size={36} className="text-purple-700" />
          <h1 className="text-3xl md:text-4xl font-bold text-purple-800">Piano Roll</h1>
        </div>
        <p className="text-purple-700 md:text-lg">Create melodies by clicking the grid</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-6 z-10">
        <div className="flex gap-3">
          <button
            onClick={togglePlay}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-lg transition-all ${
              isPlaying 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'bg-white hover:bg-purple-100 text-purple-800'
            }`}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={clearAll}
            className="flex items-center gap-2 bg-white hover:bg-purple-100 text-purple-800 px-6 py-3 rounded-full font-bold shadow-lg transition-all"
          >
            <RotateCcw size={20} />
            <span className="hidden sm:inline">Clear</span>
          </button>

          <button
            onClick={toggleMute}
            className={`flex items-center gap-2 px-4 py-3 rounded-full font-bold shadow-lg transition-all ${
              isMuted ? 'bg-red-100 text-red-800' : 'bg-white hover:bg-purple-100 text-purple-800'
            }`}
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm px-4 py-2 md:py-3 rounded-full border border-purple-200 shadow-sm">
          <span className="text-purple-700 font-semibold text-sm md:text-base">Tempo:</span>
          <input
            type="range"
            min="60"
            max="180"
            value={tempo}
            onChange={(e) => setTempo(parseInt(e.target.value))}
            className="w-24 md:w-32 accent-purple-600"
          />
          <span className="text-purple-700 font-semibold w-8 text-sm md:text-base">{tempo}</span>
        </div>
      </div>

      {/* Piano Keyboard */}
      <div className="flex justify-center mb-2 z-10 overflow-x-auto">
        <div className="flex">
          {pianoKeys.map((key, index) => (
            <div 
              key={key.name}
              className={`relative h-16 w-8 md:w-10 flex items-end justify-center pb-1 text-xs font-semibold border border-purple-200 ${
                key.isBlack 
                  ? 'bg-purple-900 text-white rounded-b-sm z-10 -mx-1' 
                  : 'bg-white text-purple-800 rounded-b-md'
              } ${
                activeNote === key.name ? 'ring-2 ring-yellow-400' : ''
              }`}
              onClick={() => playNote(key.freq, key.name)}
            >
              {key.name}
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 flex justify-center px-2 md:px-4 pb-6 z-10 overflow-x-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-4 md:p-6 w-full max-w-4xl border border-purple-200">
          <div className="flex">
            {/* Piano keys labels */}
            <div className="flex flex-col mr-1">
              {pianoKeys.map((key) => (
                <div 
                  key={key.name}
                  className={`h-12 flex items-center justify-end pr-2 text-xs font-mono ${
                    key.isBlack ? 'text-purple-900' : 'text-purple-700'
                  }`}
                >
                  {key.name}
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-x-auto">
              {/* Step headers */}
              <div className="flex mb-1">
                {[...Array(16)].map((_, step) => (
                  <div 
                    key={step}
                    className={`flex-1 min-w-[2rem] h-6 flex items-center justify-center text-xs font-bold border-l border-purple-100 ${
                      currentStep === step && isPlaying 
                        ? 'bg-yellow-400 text-purple-900' 
                        : 'text-purple-700'
                    }`}
                  >
                    {step + 1}
                  </div>
                ))}
              </div>

              {/* Note grid */}
              {pianoKeys.map((key, keyIndex) => (
                <div key={key.name} className="flex">
                  {[...Array(16)].map((_, step) => {
                    const hasNote = notes[`${step}-${keyIndex}`];
                    const isBeat = step % 4 === 0;

                    return (
                      <button
                        key={step}
                        onClick={() => toggleNote(step, keyIndex)}
                        className={`flex-1 min-w-[2rem] h-12 border border-purple-100 transition-all ${
                          hasNote 
                            ? key.isBlack
                              ? 'bg-purple-900 hover:bg-purple-800 shadow-inner'
                              : 'bg-purple-600 hover:bg-purple-700 shadow-inner'
                            : isBeat
                            ? 'bg-purple-50 hover:bg-purple-100'
                            : 'bg-white hover:bg-purple-50'
                        } ${
                          currentStep === step && isPlaying ? 'ring-1 ring-yellow-400' : ''
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-purple-700 mt-2 z-10">
        Inspired by Chrome Music Lab's Melody Maker
      </div>
    </div>
  );
};

export default PianoRollBasics;