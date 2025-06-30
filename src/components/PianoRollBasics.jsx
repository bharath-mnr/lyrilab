import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Music, Sparkles, Zap } from 'lucide-react';
import SEOHead from './SEOHead';


// Define the tool object for SEO structured data
const pianoRollBasicsTool = {
    id: 'piano-roll-basics',
    name: 'Piano Roll Editor',
    description: 'Learn MIDI sequencing fundamentals with our interactive piano roll editor.',
    path: '/piano-roll-basics',
    categories: [
        'MIDI Editing',
        'Music Production',
        'Sequencing',
        'DAW',
        'Note Editing'
    ]
};


const PianoRollBasics = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [notes, setNotes] = useState({});
  const [audioContext, setAudioContext] = useState(null);
  const [tempo, setTempo] = useState(120);
  const [isMuted, setIsMuted] = useState(false);
  const [activeNote, setActiveNote] = useState(null);
  const [particles, setParticles] = useState([]);
  const [noteHistory, setNoteHistory] = useState([]);
  const [volume, setVolume] = useState(0.3);
  const [waveform, setWaveform] = useState('sine');
  const particleId = useRef(0);

  const pianoKeys = [
    { name: 'B4', freq: 493.88, isBlack: false, color: 'from-pink-400 to-pink-600' },
    { name: 'A#4', freq: 466.16, isBlack: true, color: 'from-purple-600 to-purple-800' },
    { name: 'A4', freq: 440.00, isBlack: false, color: 'from-blue-400 to-blue-600' },
    { name: 'G#4', freq: 415.30, isBlack: true, color: 'from-indigo-600 to-indigo-800' },
    { name: 'G4', freq: 392.00, isBlack: false, color: 'from-green-400 to-green-600' },
    { name: 'F#4', freq: 369.99, isBlack: true, color: 'from-teal-600 to-teal-800' },
    { name: 'F4', freq: 349.23, isBlack: false, color: 'from-yellow-400 to-yellow-600' },
    { name: 'E4', freq: 329.63, isBlack: false, color: 'from-orange-400 to-orange-600' },
    { name: 'D#4', freq: 311.13, isBlack: true, color: 'from-red-600 to-red-800' },
    { name: 'D4', freq: 293.66, isBlack: false, color: 'from-rose-400 to-rose-600' },
    { name: 'C#4', freq: 277.18, isBlack: true, color: 'from-violet-600 to-violet-800' },
    { name: 'C4', freq: 261.63, isBlack: false, color: 'from-cyan-400 to-cyan-600' },
  ];

  const waveforms = [
    { type: 'sine', name: '🌊 Sine', icon: '〜' },
    { type: 'square', name: '📦 Square', icon: '⬜' },
    { type: 'sawtooth', name: '🔺 Saw', icon: '⚡' },
    { type: 'triangle', name: '📐 Triangle', icon: '△' }
  ];

  useEffect(() => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    setAudioContext(ctx);
    return () => {
      if (ctx) ctx.close();
    };
  }, []);

  const createParticle = useCallback((x, y, color) => {
    const id = particleId.current++;
    const particle = {
      id,
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4 - 2,
      life: 1,
      decay: 0.02,
      color,
      size: Math.random() * 4 + 2
    };
    
    setParticles(prev => [...prev, particle]);
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 2000);
  }, []);

  const playNote = useCallback((freq, noteName, keyIndex, x = 0, y = 0) => {
    if (!audioContext || isMuted) return;
    
    setActiveNote(noteName);
    setNoteHistory(prev => [...prev.slice(-5), { note: noteName, time: Date.now() }]);
    
    // Create particles
    const key = pianoKeys[keyIndex];
    createParticle(x, y, key.isBlack ? '#7c3aed' : '#a855f7');
    
    setTimeout(() => setActiveNote(null), 300);

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioContext.destination);

    osc.frequency.value = freq;
    osc.type = waveform;
    
    filter.type = 'lowpass';
    filter.frequency.value = freq * 4;
    filter.Q.value = 1;

    const attackTime = 0.01;
    const releaseTime = 0.4;
    
    gain.gain.setValueAtTime(0, audioContext.currentTime);
    gain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + attackTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + releaseTime);

    osc.start();
    osc.stop(audioContext.currentTime + releaseTime);
  }, [audioContext, isMuted, volume, waveform, createParticle, pianoKeys]);

  const toggleNote = (step, keyIndex, event) => {
    const key = `${step}-${keyIndex}`;
    const newNotes = { ...notes };
    const rect = event.target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    if (newNotes[key]) {
      delete newNotes[key];
    } else {
      newNotes[key] = true;
      playNote(pianoKeys[keyIndex].freq, pianoKeys[keyIndex].name, keyIndex, x, y);
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
            playNote(key.freq, key.name, keyIndex);
          }
        });

        return nextStep;
      });
    }, stepTime);

    return () => clearInterval(interval);
  }, [isPlaying, notes, playNote, tempo]);

  // Animate particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => 
        prev.map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          life: particle.life - particle.decay,
          vy: particle.vy + 0.1 // gravity
        })).filter(particle => particle.life > 0)
      );
    }, 16);

    return () => clearInterval(interval);
  }, []);

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
    setParticles([]);
    setNoteHistory([]);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const randomPattern = () => {
    const newNotes = {};
    const noteCount = Math.floor(Math.random() * 20) + 10;
    
    for (let i = 0; i < noteCount; i++) {
      const step = Math.floor(Math.random() * 16);
      const keyIndex = Math.floor(Math.random() * pianoKeys.length);
      newNotes[`${step}-${keyIndex}`] = true;
    }
    setNotes(newNotes);
  };

  return (
    <>
      {/* SEO Head - Add this at the very beginning */}
      <SEOHead 
        pageId="piano-roll-basics" 
        tool={pianoRollBasicsTool}
        customData={{}}
      />
      
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

        {/* Floating Particles */}
        <div className="fixed inset-0 pointer-events-none z-20">
          {particles.map(particle => (
            <div
              key={particle.id}
              className="absolute rounded-full animate-pulse"
              style={{
                left: particle.x,
                top: particle.y,
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                opacity: particle.life,
                transform: `translate(-50%, -50%) scale(${particle.life})`,
                transition: 'all 0.1s ease-out'
              }}
            />
          ))}
        </div>

        {/* Header */}
        <div className="text-center py-4 md:py-6 z-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="relative">
              <Music size={36} className="text-purple-700" />
              <Sparkles size={16} className="absolute -top-1 -right-1 text-yellow-400 animate-pulse" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-purple-800 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Piano Roll Studio
            </h1>
          </div>
          <p className="text-purple-700 md:text-lg animate-bounce">🎵 Create magical melodies by clicking the grid! ✨</p>
          
          {/* Note History Display */}
          {noteHistory.length > 0 && (
            <div className="mt-2 flex justify-center items-center gap-2 flex-wrap">
              <span className="text-sm text-purple-600">Recent notes:</span>
              {noteHistory.slice(-3).map((entry, i) => (
                <span 
                  key={entry.time} 
                  className="text-xs bg-white/60 px-2 py-1 rounded-full text-purple-800 animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  {entry.note}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Enhanced Controls */}
        <div className="flex flex-col lg:flex-row justify-center items-center gap-4 mb-6 z-10">
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={togglePlay}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-lg transition-all transform hover:scale-105 ${
                isPlaying 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white animate-pulse' 
                  : 'bg-white hover:bg-purple-100 text-purple-800 hover:shadow-xl'
              }`}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              <span className="hidden sm:inline">{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              onClick={clearAll}
              className="flex items-center gap-2 bg-white hover:bg-red-50 text-purple-800 hover:text-red-600 px-6 py-3 rounded-full font-bold shadow-lg transition-all transform hover:scale-105"
            >
              <RotateCcw size={20} />
              <span className="hidden sm:inline">Clear</span>
            </button>

            <button
              onClick={randomPattern}
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all transform hover:scale-105"
            >
              <Zap size={20} />
              <span className="hidden sm:inline">Random</span>
            </button>

            <button
              onClick={toggleMute}
              className={`flex items-center gap-2 px-4 py-3 rounded-full font-bold shadow-lg transition-all transform hover:scale-105 ${
                isMuted ? 'bg-red-100 text-red-800 animate-pulse' : 'bg-white hover:bg-purple-100 text-purple-800'
              }`}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>

          {/* Enhanced Control Panel */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm px-4 py-2 md:py-3 rounded-full border border-purple-200 shadow-sm">
              <span className="text-purple-700 font-semibold text-sm md:text-base">🏃 Tempo:</span>
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

            <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm px-4 py-2 md:py-3 rounded-full border border-purple-200 shadow-sm">
              <span className="text-purple-700 font-semibold text-sm md:text-base">🔊 Vol:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 accent-purple-600"
              />
            </div>

            <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full border border-purple-200 shadow-sm">
              <span className="text-purple-700 font-semibold text-sm">Wave:</span>
              <select 
                value={waveform} 
                onChange={(e) => setWaveform(e.target.value)}
                className="bg-transparent text-purple-700 text-sm font-semibold outline-none"
              >
                {waveforms.map(wave => (
                  <option key={wave.type} value={wave.type}>{wave.icon}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Enhanced Piano Keyboard */}
        <div className="flex justify-center mb-2 z-10 overflow-x-auto">
          <div className="flex">
            {pianoKeys.map((key, index) => (
              <div 
                key={key.name}
                className={`relative h-16 w-8 md:w-10 flex items-end justify-center pb-1 text-xs font-semibold border border-purple-200 cursor-pointer transition-all transform hover:scale-105 ${
                  key.isBlack 
                    ? `bg-gradient-to-b ${key.color} text-white rounded-b-sm z-10 -mx-1 shadow-lg` 
                    : `bg-gradient-to-b from-white to-gray-100 text-purple-800 rounded-b-md shadow-md`
                } ${
                  activeNote === key.name ? 'ring-4 ring-yellow-400 shadow-2xl animate-pulse' : ''
                }`}
                onClick={(e) => {
                  const rect = e.target.getBoundingClientRect();
                  playNote(key.freq, key.name, index, rect.left + rect.width / 2, rect.top + rect.height / 2);
                }}
              >
                {key.name}
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Main Grid */}
        <div className="flex-1 flex justify-center px-2 md:px-4 pb-6 z-10 overflow-x-auto">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-xl p-4 md:p-6 w-full max-w-5xl border border-purple-200">
            <div className="flex">
              {/* Enhanced Piano keys labels */}
              <div className="flex flex-col mr-1">
                {pianoKeys.map((key, index) => (
                  <div 
                    key={key.name}
                    className={`h-12 flex items-center justify-end pr-2 text-xs font-mono cursor-pointer transition-all hover:bg-purple-50 rounded ${
                      key.isBlack ? 'text-purple-900 font-bold' : 'text-purple-700'
                    }`}
                    onClick={(e) => {
                      const rect = e.target.getBoundingClientRect();
                      playNote(key.freq, key.name, index, rect.left + rect.width / 2, rect.top + rect.height / 2);
                    }}
                  >
                    {key.name}
                  </div>
                ))}
              </div>

              {/* Enhanced Grid */}
              <div className="flex-1 overflow-x-auto">
                {/* Enhanced Step headers */}
                <div className="flex mb-1">
                  {[...Array(16)].map((_, step) => (
                    <div 
                      key={step}
                      className={`flex-1 min-w-[2rem] h-6 flex items-center justify-center text-xs font-bold border-l border-purple-100 transition-all ${
                        currentStep === step && isPlaying 
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-purple-900 transform scale-110 shadow-lg animate-pulse' 
                          : 'text-purple-700 hover:bg-purple-50'
                      } ${step % 4 === 0 ? 'border-l-2 border-purple-300' : ''}`}
                    >
                      {step + 1}
                    </div>
                  ))}
                </div>

                {/* Enhanced Note grid */}
                {pianoKeys.map((key, keyIndex) => (
                  <div key={key.name} className="flex">
                    {[...Array(16)].map((_, step) => {
                      const hasNote = notes[`${step}-${keyIndex}`];
                      const isBeat = step % 4 === 0;
                      const isCurrentStep = currentStep === step && isPlaying;

                      return (
                        <button
                          key={step}
                          onClick={(e) => toggleNote(step, keyIndex, e)}
                          className={`flex-1 min-w-[2rem] h-12 border border-purple-100 transition-all transform hover:scale-105 relative overflow-hidden ${
                            hasNote 
                              ? `bg-gradient-to-br ${key.color} hover:brightness-110 shadow-lg animate-pulse`
                              : isBeat
                              ? 'bg-purple-50 hover:bg-purple-100'
                              : 'bg-white hover:bg-purple-50'
                          } ${
                            isCurrentStep ? 'ring-2 ring-yellow-400 shadow-xl' : ''
                          } ${step % 4 === 0 ? 'border-l-2 border-purple-200' : ''}`}
                        >
                          {hasNote && (
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                          )}
                          {isCurrentStep && hasNote && (
                            <div className="absolute inset-0 bg-yellow-400/30 animate-ping"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className="text-center text-xs text-purple-700 mt-2 z-10">
          <div className="flex items-center justify-center gap-2">
            <Sparkles size={12} className="animate-spin" />
            <span>Inspired by Chrome Music Lab's Melody Maker</span>
            <Sparkles size={12} className="animate-spin" style={{ animationDirection: 'reverse' }} />
          </div>
        </div>
      </div>
    </>
  );
};

export default PianoRollBasics;