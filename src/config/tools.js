// src/config/tools.js
// This file defines the tools available in the application, including their routing,
// descriptions, icons, and categories.

export const TOOLS = [
  {
    id: 'home',
    name: 'Home',
    path: '/',
    component: 'HomePage',
    importPath: './pages/HomePage.jsx', // Correct for pages directory
    description: 'Explore all the musical experiments and sound design tools.',
    icon: '',
    categories: ['Navigation']
  },
  
  // INSTRUMENTS SECTION
  {
    id: 'virtual-piano',
    name: 'Piano',
    path: '/virtual-piano',
    component: 'VirtualPiano',
    importPath: './components/VirtualPiano.jsx', // Corrected: direct to file in components/
    description: 'Full-featured virtual piano with keyboard and mouse support. Play melodies and chords with realistic sound.',
    icon: '',
    categories: ['Instruments', 'Fun']
  },
  {
    id: 'drum-machine',
    name: 'Drum Machine',
    path: '/drum-machine',
    component: 'DrumMachine',
    importPath: './components/DrumMachine.jsx', // Corrected: direct to file in components/
    description: 'Step sequencer with multiple drum kits. Create beats, adjust tempo, and experiment with rhythm patterns.',
    icon: '',
    categories: ['Instruments', 'Rhythm', 'Fun']
  },

  // RHYTHM/TEMPO SECTION
  {
    id: 'tap-tempo-tool',
    name: 'Tap Tempo',
    path: '/tap-tempo-tool',
    component: 'TapTempoTool',
    importPath: './components/TapTempoTool.jsx', // Corrected
    description: 'Set your project tempo by tapping. Includes visual feedback and BPM calculation.',
    icon: '',
    categories: ['Rhythm']
  },
  {
    id: 'time-signature-metronome',
    name: 'Time Signatures',
    path: '/time-signature-metronome',
    component: 'TimeSignatureMetronome',
    importPath: './components/TimeSignatureMetronome.jsx', // Corrected
    description: 'Metronome with flexible time signatures. Visualize different rhythmic divisions.',
    icon: '',
    categories: ['Rhythm']
  },
  {
    id: 'polyrhythm-sequencer',
    name: 'Polyrhythms',
    path: '/polyrhythm-sequencer',
    component: 'PolyrhythmSequencer',
    importPath: './components/PolyrhythmSequencer.jsx', // Corrected
    description: 'Create complex rhythmic layers. Visualize and audition multiple concurrent patterns.',
    icon: '',
    categories: ['Rhythm', 'Challenge']
  },
 
  

  // THEORY SECTION (Chords, Intervals, Scales)
  {
    id: 'chord-explorer',
    name: 'Chord Finder',
    path: '/chord-explorer',
    component: 'ChordHighlightPage',
    importPath: './components/ChordHighlightPage.jsx', // Corrected
    description: 'Interactive chord dictionary. Visualize chord structures and hear how they sound.',
    icon: '',
    categories: ['Theory']
  },
 
  {
    id: 'interval-training',
    name: 'Interval Trainer',
    path: '/interval-training',
    component: 'IntervalTrainingApp',
    importPath: './components/IntervalTrainingApp.jsx', // Corrected
    description: 'Ear training for recognizing musical intervals. Includes multiple difficulty levels.',
    icon: '',
    categories: ['Theory', 'Games', 'Challenge']
  },
  {
    id: 'scale-explorer',
    name: 'Scales',
    path: '/scale-explorer',
    component: 'ScaleContent',
    importPath: './components/ScaleContent.jsx', // Corrected
    description: 'Comprehensive scale library. Visualize scales across instruments with audio playback.',
    icon: '',
    categories: ['Theory']
  },
  {
    id: 'circle-of-fifths',
    name: 'Circle of Fifths',
    path: '/circle-of-fifths',
    component: 'CircleOfFifthsContent',
    importPath: './components/CircleOfFifthsContent.jsx', // Corrected
    description: 'Interactive circle of fifths diagram. Explore key relationships and chord functions.',
    icon: '',
    categories: ['Theory']
  },
  {
    id: 'consonance-dissonance',
    name: 'Consonance',
    path: '/consonance-dissonance',
    component: 'ConsonanceDissonance',
    importPath: './components/ConsonanceDissonance.jsx', // Corrected
    description: 'Experiment with harmonic tension. Compare consonant and dissonant intervals.',
    icon: '',
    categories: ['Theory']
  },

  // SYNTH SECTION
  {
    id: 'arpeggiator-sequencer',
    name: 'Arpeggiator',
    path: '/arpeggiator-sequencer',
    component: 'ArpeggiatorSequencer',
    importPath: './components/ArpeggiatorSequencer.jsx', // Corrected
    description: 'Advanced arpeggio generator with customizable patterns, note length, and octave range controls.',
    icon: '',
    categories: ['Instruments', 'Rhythm', 'Theory', 'Synth']
  },
  {
    id: 'portamento-glide',
    name: 'Portamento',
    path: '/portamento-glide',
    component: 'PortamentoGlide',
    importPath: './components/PortamentoGlide.jsx', // Corrected
    description: 'Experiment with smooth pitch transitions between notes. Adjust glide time and curve parameters.',
    icon: '',
    categories: ['Instruments', 'Synth']
  },
  {
    id: 'wavetable-editor',
    name: 'Wavetable',
    path: '/wavetable-editor',
    component: 'WavetableEditor',
    importPath: './components/WavetableEditor.jsx', // Corrected
    description: 'Create and manipulate custom wavetables for unique synth sounds. Draw and morph waveforms.',
    icon: '',
    categories: ['Synth', 'Challenge']
  },
  {
    id: 'waveform-combiner',
    name: 'Waveform Mixer',
    path: '/waveform-combiner',
    component: 'WaveformCombiner',
    importPath: './components/WaveformCombiner.jsx', // Corrected
    description: 'Combine multiple waveforms to create complex sounds. Adjust phase, volume, and harmonic content.',
    icon: '',
    categories: ['Synth']
  },
  {
    id: 'lfo-modulation',
    name: 'LFO',
    path: '/lfo-modulation',
    component: 'LFOModulation',
    importPath: './components/LFOModulation.jsx', // Corrected
    description: 'Low Frequency Oscillator tool. Modulate parameters with various waveforms and speed controls.',
    icon: '',
    categories: ['Synth']
  },
  {
    id: 'adsr-envelope-tool',
    name: 'ADSR',
    path: '/adsr-envelope-tool',
    component: 'ADSREnvelopeTool',
    importPath: './components/ADSREnvelopeTool.jsx', // Corrected
    description: 'Visual ADSR envelope editor. Shape attack, decay, sustain, and release parameters for dynamic sounds.',
    icon: '',
    categories: ['Synth', 'Theory']
  },
  {
    id: 'saturation-explorer',
    name: 'Saturation',
    path: '/saturation-explorer',
    component: 'SaturationExplor',
    importPath: './components/SaturationExplor.jsx', // Corrected
    description: 'Harmonic exciter. Add warmth and distortion with various saturation algorithms.',
    icon: '',
    categories: ['Effects', 'Synth']
  },
  {
    id: 'granular-explorer',
    name: 'Granular',
    path: '/granular-explorer',
    component: 'GranularExplor',
    importPath: './components/GranularExplor.jsx', // Corrected
    description: 'Granular synthesis engine. Manipulate sound at the microscopic level.',
    icon: '',
    categories: ['Effects', 'Synth']
  },

  // EFFECTS/MIXING SECTION
  {
    id: 'eq-explorer',
    name: 'EQ',
    path: '/eq-explorer',
    component: 'EQExplorer',
    importPath: './components/EQExplorer.jsx', // Corrected
    description: 'Interactive equalizer. Learn how different frequency bands affect your sound.',
    icon: '',
    categories: ['Effects']
  },
  {
    id: 'compression-explorer',
    name: 'Compressor',
    path: '/compression-explorer',
    component: 'CompressionExplorer',
    importPath: './components/CompressionExplorer.jsx', // Corrected
    description: 'Dynamic range processor. Adjust threshold, ratio, attack, and release parameters.',
    icon: '',
    categories: ['Effects']
  },
  {
    id: 'limiter-explorer',
    name: 'Limiter',
    path: '/limiter-explorer',
    component: 'LimiterExplorer',
    importPath: './components/LimiterExplorer.jsx', // Corrected
    description: 'Peak controller. Prevent clipping while maximizing loudness.',
    icon: '',
    categories: ['Effects']
  },
  {
    id: 'reverb-explorer',
    name: 'Reverb',
    path: '/reverb-explorer',
    component: 'ReverbExplorer',
    importPath: './components/ReverbExplorer.jsx', // Corrected
    description: 'Space simulator. Adjust decay time, pre-delay, and room size parameters.',
    icon: '',
    categories: ['Effects']
  },
  {
    id: 'delay-explorer',
    name: 'Delay',
    path: '/delay-explorer',
    component: 'DelayExplorer',
    importPath: './components/DelayExplorer.jsx', // Corrected
    description: 'Time-based effects processor. Create echoes, slapbacks, and rhythmic patterns.',
    icon: '',
    categories: ['Effects']
  },
  {
    id: 'chorus-explorer',
    name: 'Chorus',
    path: '/chorus-explorer',
    component: 'ChorusExplor',
    importPath: './components/ChorusExplor.jsx', // Corrected
    description: 'Modulation effect. Create lush, animated textures with rate and depth controls.',
    icon: '',
    categories: ['Effects']
  },
  {
    id: 'tremolo-explorer',
    name: 'Tremolo',
    path: '/tremolo-explorer',
    component: 'TremoloExplorer',
    importPath: './components/TremoloExplorer.jsx', // Corrected
    description: 'Amplitude modulator. Create rhythmic volume pulsations with shape controls.',
    icon: '',
    categories: ['Effects']
  },
  {
    id: 'panner-tool',
    name: 'Panner',
    path: '/panner-tool',
    component: 'PannerTool',
    importPath: './components/PannerTool.jsx', // Corrected
    description: 'Stereo imaging tool. Position sounds in the stereo field with automation options.',
    icon: '',
    categories: ['Effects']
  },
  {
    id: 'mid-side-explorer',
    name: 'Mid/Side',
    path: '/mid-side-explorer',
    component: 'MidSideExplorer',
    importPath: './components/MidSideExplorer.jsx', // Corrected
    description: 'Mid/Side processing toolkit. Isolate and process center vs. side information separately.',
    icon: '',
    categories: ['Effects']
  },
  {
    id: 'stereo-imager-explorer',
    name: 'Stereo Imager',
    path: '/stereo-imager-explorer',
    component: 'StereoImagerExplorer',
    importPath: './components/StereoImagerExplorer.jsx', // Corrected
    description: 'Stereo width controller. Adjust spatial characteristics of your mix.',
    icon: '',
    categories: ['Effects']
  },
  {
    id: 'pitch-shift-explorer',
    name: 'Pitch Shifter',
    path: '/pitch-shift-explorer',
    component: 'PitchShiftExplorer',
    importPath: './components/PitchShiftExplorer.jsx', // Corrected
    description: 'Real-time pitch manipulation. Experiment with formant-preserving shifts and harmonies.',
    icon: '',
    categories: ['Effects']
  },

  // GAMES SECTION
  {
    id: 'chord-training-quiz',
    name: 'Chord Quiz',
    path: '/chord-training-quiz',
    component: 'ChordTrainingQuiz',
    importPath: './games/ChordTrainingQuiz.jsx', // Corrected: direct to file in games/
    description: 'Test your chord recognition skills. Multiple difficulty levels and feedback.',
    icon: '',
    categories: ['Games', 'Theory', 'Challenge']
  },
  
  {
    id: 'ear-training-quiz',
    name: 'Ear Trainer',
    path: '/ear-training-quiz',
    component: 'EarTrainingQuiz',
    importPath: './games/EarTrainingQuiz.jsx', // Corrected
    description: 'Comprehensive ear training. Identify intervals, chords, and progressions by ear.',
    icon: '',
    categories: ['Games', 'Theory', 'Challenge']
  },
  {
    id: 'synthesis-challenge',
    name: 'Synth Challenge',
    path: '/synthesis-challenge',
    component: 'SynthesisChallenge',
    importPath: './games/SynthesisChallenge.jsx', // Corrected
    description: 'Sound design puzzles. Recreate target sounds using provided synth parameters.',
    icon: '',
    categories: ['Games', 'Synth', 'Challenge']
  }
];

// Define the desired order of categories for the Navbar dropdown
const DEFAULT_CATEGORIES_ORDER = [
  'Instruments',
  'Synth',
  'Theory',
  'Effects',
  'Rhythm',
  'Games',
  'Fun',
  'Challenge'
];

// Helper to group tools by category for external use (e.g., in Navbar)
export const getCategorizedTools = (tools) => {
  const categories = {};

  DEFAULT_CATEGORIES_ORDER.forEach(categoryName => {
    categories[categoryName] = [];
  });

  tools.forEach(tool => {
    if (tool.categories && Array.isArray(tool.categories)) {
      tool.categories.forEach(categoryName => {
        if (DEFAULT_CATEGORIES_ORDER.includes(categoryName) && tool.id !== 'home') {
          if (!categories[categoryName].some(existingTool => existingTool.id === tool.id)) {
            categories[categoryName].push(tool);
          }
        }
      });
    }
  });

  const filteredAndSortedCategories = {};
  DEFAULT_CATEGORIES_ORDER.forEach(categoryName => {
    if (categories[categoryName] && categories[categoryName].length > 0) {
      filteredAndSortedCategories[categoryName] = [...new Set(categories[categoryName])]
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  });

  return filteredAndSortedCategories;
};

export default TOOLS;