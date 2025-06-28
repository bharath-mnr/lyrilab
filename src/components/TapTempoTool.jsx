import React, { useState, useRef, useCallback } from 'react';
import { RefreshCcw, Hand } from 'lucide-react';

const useTapTempo = () => {
  const tapTimesRef = useRef([]);
  const [bpm, setBpm] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [beatCount, setBeatCount] = useState(0);

  const MIN_TAPS_FOR_BPM = 3;

  const handleTap = useCallback(() => {
    const currentTime = performance.now();
    tapTimesRef.current.push(currentTime);
    setTapCount((prev) => prev + 1);
    setBeatCount((prev) => prev + 1);

    if (tapTimesRef.current.length > 10) {
      tapTimesRef.current.shift();
    }

    if (tapTimesRef.current.length >= MIN_TAPS_FOR_BPM) {
      const intervals = [];
      for (let i = 1; i < tapTimesRef.current.length; i++) {
        intervals.push(tapTimesRef.current[i] - tapTimesRef.current[i - 1]);
      }

      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      setBpm(calculatedBpm);
    } else {
      setBpm(0);
    }
  }, []);

  const resetTapTempo = useCallback(() => {
    tapTimesRef.current = [];
    setTapCount(0);
    setBpm(0);
    setTimeSignature('4/4');
    setBeatCount(0);
  }, []);

  return {
    bpm,
    tapCount,
    timeSignature,
    setTimeSignature,
    beatCount,
    handleTap,
    resetTapTempo,
  };
};

const TapTempoTool = () => {
  const {
    bpm,
    tapCount,
    timeSignature,
    setTimeSignature,
    beatCount,
    handleTap,
    resetTapTempo,
  } = useTapTempo();

  const bpmDisplay = bpm > 0 ? bpm : "---";
  const MIN_TAPS_FOR_BPM = 3;

  return (
    <div
      className="min-h-screen flex flex-col items-center p-8 relative overflow-hidden w-full"
      style={{
        background: 'linear-gradient(135deg, #e6ffee 0%, #d9f7e6 50%, #ccf0cc 100%)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Light SVG grid pattern */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath fill='%2360a5fa' d='M0 0h10v10H0zm20 0h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 20h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 40h10v10H0zm20 40h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 60h10v10H0zm20 20h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80zM0 80h10v10H0zm20 80h10v10H20zm20 0h10v10H40zm20 0h10v10H60zm20 0h10v10H80z'/%3E%3C/svg%3E\")",
          backgroundSize: '200px 200px',
        }}
      ></div>

      <div className="text-center mb-10 z-10">
        <div className="flex items-center justify-center gap-4 mb-4">
          <Hand size={48} className="text-blue-700" />
          <h1 className="text-5xl font-extrabold text-blue-900 drop-shadow-lg">Tap Tempo</h1>
        </div>
        <p className="text-blue-700 text-lg mt-2">
          Tap the button to find your tempo and choose your time signature
        </p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg w-full max-w-md flex flex-col items-center space-y-8 z-10 border border-blue-200">
        <div className="flex items-center gap-8">
          <div className="text-6xl font-extrabold text-blue-800 tracking-wider">
            {bpmDisplay} <span className="text-3xl">BPM</span>
          </div>

          {/* Manual Time Signature Selector */}
          <select
            value={timeSignature}
            onChange={(e) => setTimeSignature(e.target.value)}
            className="text-2xl font-semibold text-blue-800 border border-blue-300 rounded px-4 py-2 bg-white shadow-sm"
          >
            <option value="4/4">4/4</option>
            <option value="3/4">3/4</option>
            <option value="6/8">6/8</option>
            <option value="5/4">5/4</option>
            <option value="7/8">7/8</option>
          </select>
        </div>

        <button
          onClick={handleTap}
          className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white flex items-center justify-center text-3xl font-bold uppercase transition-all duration-100 ease-in-out shadow-lg hover:shadow-xl active:shadow-inner transform active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300"
        >
          Tap!
        </button>

        <div className="text-center text-gray-700 mt-6 space-y-2">
          <p className="text-lg">
            Taps: <span className="font-semibold">{tapCount}</span>
          </p>
          <p className="text-lg">
            Current Beat: <span className="font-semibold">{beatCount}</span>
          </p>
          {tapCount < MIN_TAPS_FOR_BPM && (
            <p className="text-orange-600 text-sm italic">
              Tap {MIN_TAPS_FOR_BPM - tapCount} more time(s) for BPM calculation
            </p>
          )}
        </div>

        <button
          onClick={resetTapTempo}
          className="px-6 py-3 rounded-full font-bold text-lg flex items-center gap-2 transition-all duration-300 bg-gray-500 hover:bg-gray-600 text-white mt-8"
        >
          <RefreshCcw size={20} /> Reset
        </button>
      </div>
    </div>
  );
};

export default TapTempoTool;
