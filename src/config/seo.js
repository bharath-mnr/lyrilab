// src/config/seo.js
export const SEO_CONFIG = {
  // Global defaults
  global: {
    siteName: "LiriLab",
    domain: "http://localhost:3000",
    twitterHandle: "...",
    locale: "en_US",
    type: "website",
    author: "Bharath"
  },

  pages: {
    'virtual-piano': {
      title: "Play Virtual Piano Online - Free Keyboard Simulator | LiriLab",
      description: "Use LiriLab's free virtual piano to play music directly from your keyboard or mouse. Perfect for beginners, students, and anyone practicing or exploring piano online.",
      keywords: "virtual piano, online piano, free piano keyboard, piano simulator, play piano online, learn piano, digital piano app, music learning tool, keyboard piano online, piano practice, piano lessons, virtual piano keyboard, piano software, online keyboard, piano for beginners, piano game, musical keyboard, piano web app, piano trainer",
      image: "/images/og-piano.jpg",
      canonical: "/virtual-piano"
    },

    'guitar-fretboard': {
      title: "Interactive Guitar Fretboard - Learn Notes & Scales | LiriLab",
      description: "Master guitar fretboard with our interactive tool. Visualize notes, scales, and chord shapes across the entire neck. Perfect for guitar learning and practice.",
      keywords: "guitar fretboard, guitar neck, learn guitar notes, guitar scales, guitar chord shapes, fretboard visualization, guitar learning tool, guitar practice, guitar theory, note finder guitar, guitar fretboard trainer, guitar education, guitar lessons online, fret positions, guitar map",
      image: "/images/og-guitar-fretboard.jpg",
      canonical: "/guitar-fretboard"
    },

    'drum-machine': {
      title: "Online Drum Machine - Create Beats & Rhythms | LiriLab",
      description: "Create professional drum beats with our free online drum machine. Multiple drum kits, step sequencer, and tempo control for music production.",
      keywords: "drum machine, online drum machine, beat maker, drum sequencer, create beats, drum patterns, rhythm maker, drum programming, electronic drums, drum loops, beat production, drum software, music production, hip hop beats, techno beats, drum kit online, beat box, drum composer",
      image: "/images/og-drum-machine.jpg",
      canonical: "/drum-machine"
    },

    'tap-tempo-tool': {
      title: "Tap Tempo Tool - Find BPM by Tapping | LiriLab",
      description: "Calculate BPM instantly by tapping along to any song or rhythm. Free tap tempo tool with visual feedback and accurate BPM detection.",
      keywords: "tap tempo, BPM calculator, beats per minute, tempo finder, metronome BPM, tap BPM, tempo tool, rhythm calculator, music BPM, beat counter, tempo detection, BPM finder, music tempo, drumming BPM, DJ BPM tool, tempo measurement",
      image: "/images/og-tap-tempo.jpg",
      canonical: "/tap-tempo-tool"
    },

    'time-signature-metronome': {
      title: "Advanced Metronome - All Time Signatures | LiriLab",
      description: "Professional metronome with support for all time signatures. Perfect for musicians practicing complex rhythms and unusual time signatures.",
      keywords: "metronome, online metronome, time signatures, rhythm practice, musical metronome, tempo practice, beat counter, rhythm trainer, music practice tool, drum practice, piano practice, guitar practice, odd time signatures, polyrhythm metronome, subdivision practice",
      image: "/images/og-metronome.jpg",
      canonical: "/time-signature-metronome"
    },

    'chord-explorer': {
      title: "Chord Finder - Discover Guitar & Piano Chords | LiriLab",
      description: "Interactive chord dictionary for guitar and piano. Visualize chord structures, hear chord sounds, and learn new chord progressions.",
      keywords: "chord finder, guitar chords, piano chords, chord dictionary, chord charts, chord progressions, music chords, chord shapes, chord theory, chord builder, chord lookup, chord reference, guitar chord chart, piano chord chart, chord trainer, chord library",
      image: "/images/og-chord-explorer.jpg",
      canonical: "/chord-explorer"
    },

    'chord-progression-builder': {
      title: "Chord Progression Builder - Create Song Progressions | LiriLab",
      description: "Build and experiment with chord progressions for your songs. Explore popular progressions, different keys, and create your own harmonic sequences.",
      keywords: "chord progressions, chord progression builder, song writing, chord sequences, harmonic progression, music composition, chord changes, popular chord progressions, songwriting tool, music theory, chord progression generator, harmony builder, chord analysis",
      image: "/images/og-chord-progressions.jpg",
      canonical: "/chord-progression-builder"
    },

    'scale-explorer': {
      title: "Music Scales Explorer - Learn All Scales | LiriLab",
      description: "Comprehensive scale library with visual and audio representation. Learn major, minor, pentatonic, modal scales and more for guitar and piano.",
      keywords: "music scales, guitar scales, piano scales, scale finder, musical scales, scale theory, pentatonic scale, major scale, minor scale, modal scales, scale practice, music theory scales, scale patterns, scale exercises, blues scales, jazz scales",
      image: "/images/og-scales.jpg",
      canonical: "/scale-explorer"
    },

    'interval-training': {
      title: "Interval Ear Training - Perfect Your Musical Ear | LiriLab",
      description: "Improve your musical ear with interval recognition training. Multiple difficulty levels and comprehensive ear training exercises.",
      keywords: "ear training, interval training, music intervals, perfect pitch, ear training exercises, interval recognition, music ear training, audio training, musical intervals, pitch training, hearing training, music education, interval practice, relative pitch",
      image: "/images/og-interval-training.jpg",
      canonical: "/interval-training"
    },

    'circle-of-fifths': {
      title: "Interactive Circle of Fifths - Music Theory Tool | LiriLab",
      description: "Master key relationships with our interactive circle of fifths. Explore chord functions, key signatures, and harmonic relationships.",
      keywords: "circle of fifths, music theory, key signatures, chord relationships, music keys, harmonic relationships, music theory tool, key finder, chord functions, music education, theory learning, composition tool",
      image: "/images/og-circle-fifths.jpg",
      canonical: "/circle-of-fifths"
    },

    'arpeggiator-sequencer': {
      title: "Arpeggiator Sequencer - Create Arpeggios | LiriLab",
      description: "Advanced arpeggiator with customizable patterns and sequencing. Create complex arpeggios with various modes and timing controls.",
      keywords: "arpeggiator, arpeggio generator, sequencer, arpeggio patterns, music sequencing, electronic music, synth arpeggiator, MIDI arpeggiator, arpeggio sequencer, music production, pattern generator",
      image: "/images/og-arpeggiator.jpg",
      canonical: "/arpeggiator-sequencer"
    },

    'wavetable-editor': {
      title: "Wavetable Editor - Create Custom Synth Waves | LiriLab",
      description: "Design custom wavetables for unique synthesizer sounds. Draw, morph, and manipulate waveforms for electronic music production.",
      keywords: "wavetable editor, wavetable synthesis, waveform editor, synth wavetables, custom waveforms, sound design, synthesizer programming, electronic music production, wavetable synth, audio waveforms, digital synthesis",
      image: "/images/og-wavetable.jpg",
      canonical: "/wavetable-editor"
    },

    'lfo-modulation': {
      title: "LFO Modulation Tool - Low Frequency Oscillator | LiriLab",
      description: "Experiment with LFO modulation effects. Control various parameters with low frequency oscillators for dynamic sound shaping.",
      keywords: "LFO, low frequency oscillator, modulation, sound modulation, synthesizer LFO, audio modulation, electronic music, synth programming, sound design, modulation effects, parameter modulation",
      image: "/images/og-lfo.jpg",
      canonical: "/lfo-modulation"
    },

    'adsr-envelope-tool': {
      title: "ADSR Envelope Editor - Shape Your Sounds | LiriLab",
      description: "Visual ADSR envelope editor for precise sound shaping. Control attack, decay, sustain, and release parameters with intuitive interface.",
      keywords: "ADSR, envelope generator, sound envelope, attack decay sustain release, synthesizer envelope, sound shaping, synth programming, audio envelope, envelope editor, sound design",
      image: "/images/og-adsr.jpg",
      canonical: "/adsr-envelope-tool"
    },

    'eq-explorer': {
      title: "Learn EQ Online - Interactive Audio Equalizer Training | LiriLab",
      description: "Master audio equalization with real-time interactive EQ controls. Learn frequency shaping, hear different EQ curves, and understand audio mixing fundamentals.",
      keywords: "learn equalizer online, EQ training, audio EQ tutorial, frequency response interactive, EQ simulator, parametric EQ learning, graphic EQ practice, audio mixing EQ, frequency shaping tool, EQ ear training, sound engineer EQ, mixing board EQ, audio frequency learning",
      image: "/images/og-eq.jpg",
      canonical: "/eq-explorer"
    },

    'compression-explorer': {
      title: "Learn Audio Compressor - Interactive Compression Training | LiriLab",
      description: "Master audio compression with hands-on controls. Learn threshold, ratio, attack, release settings through real-time audio processing and instant feedback.",
      keywords: "learn audio compressor online, compression training, compressor tutorial interactive, dynamic range compression, threshold ratio tutorial, attack release explained, vocal compressor settings, mixing compression guide, compressor ear training, audio dynamics control, learn compression online",
      image: "/images/og-compressor.jpg",
      canonical: "/compression-explorer"
    },

    'reverb-explorer': {
      title: "Learn Reverb Effects - Interactive Spatial Audio Training | LiriLab",
      description: "Explore different reverb types and settings with real-time audio processing. Learn room, hall, plate reverb through interactive controls and instant audio feedback.",
      keywords: "learn reverb online, reverb tutorial interactive, spatial audio training, room reverb explained, hall reverb settings, plate reverb guide, reverb mixing tutorial, audio ambience control, reverb ear training, sound space learning, reverb effects practice",
      image: "/images/og-reverb.jpg",
      canonical: "/reverb-explorer"
    },

    'delay-explorer': {
      title: "Learn Delay Effects - Interactive Echo & Time Processing | LiriLab",
      description: "Master delay and echo effects with real-time controls. Learn feedback, timing, and filtering through hands-on audio processing experience.",
      keywords: "learn delay effects online, echo tutorial interactive, time delay training, audio delay guide, feedback delay explained, ping pong delay tutorial, rhythmic delay patterns, delay mixing guide, echo effects practice, temporal audio processing",
      image: "/images/og-delay.jpg",
      canonical: "/delay-explorer"
    },

    'polyrhythm-sequencer': {
      title: "Polyrhythm Sequencer - Complex Rhythm Patterns | LiriLab",
      description: "Create and visualize complex polyrhythmic patterns. Layer multiple rhythms and explore advanced rhythmic concepts.",
      keywords: "polyrhythm, complex rhythms, rhythm patterns, polyrhythmic sequences, rhythm layering, advanced rhythms, rhythm theory, percussion patterns, drum polyrhythms, rhythmic complexity",
      image: "/images/og-polyrhythm.jpg",
      canonical: "/polyrhythm-sequencer"
    },

    'euclidean-rhythm-generator': {
      title: "Euclidean Rhythm Generator - Algorithmic Beats | LiriLab",
      description: "Generate mathematically perfect rhythms using Euclidean algorithms. Create balanced and interesting percussion patterns.",
      keywords: "euclidean rhythms, algorithmic rhythms, euclidean algorithm, mathematical rhythms, rhythm generator, percussion patterns, drum patterns, algorithmic composition, rhythm mathematics",
      image: "/images/og-euclidean.jpg",
      canonical: "/euclidean-rhythm-generator"
    },

    'chord-training-quiz': {
      title: "Chord Recognition Quiz - Test Your Musical Knowledge | LiriLab",
      description: "Challenge yourself with chord recognition quizzes. Multiple difficulty levels to improve your musical ear and theory knowledge.",
      keywords: "chord quiz, chord recognition, music quiz, chord training, ear training quiz, music theory quiz, chord identification, musical knowledge test, chord game, music education game",
      image: "/images/og-chord-quiz.jpg",
      canonical: "/chord-training-quiz"
    },

    'ear-training-quiz': {
      title: "Comprehensive Ear Training - Musical Hearing Games | LiriLab",
      description: "Improve your musical ear with comprehensive training exercises. Intervals, chords, scales, and rhythm recognition challenges.",
      keywords: "ear training, music ear training, interval recognition, chord recognition, pitch training, musical hearing, ear training exercises, music training games, perfect pitch training, relative pitch",
      image: "/images/og-ear-training.jpg",
      canonical: "/ear-training-quiz"
    },

    'synthesis-challenge': {
      title: "Sound Design Challenge - Synthesizer Puzzles | LiriLab",
      description: "Test your sound design skills with synthesis challenges. Recreate target sounds using various synthesizer parameters.",
      keywords: "sound design, synthesis challenge, synthesizer challenge, sound design puzzle, synth programming, electronic music production, sound design game, synthesizer learning, audio synthesis",
      image: "/images/og-synth-challenge.jpg",
      canonical: "/synthesis-challenge"
    },

    'humanizer-panel': {
      title: "Music Humanizer - Add Natural Feel to MIDI | LiriLab",
      description: "Add human-like variations to your MIDI performances. Control timing, velocity, and micro-tuning for more natural sounding music.",
      keywords: "MIDI humanizer, music humanization, MIDI variation, timing variation, velocity humanization, micro timing, natural MIDI, human feel, MIDI processing, performance enhancement",
      image: "/images/og-humanizer.jpg",
      canonical: "/humanizer-panel"
    },

    'portamento-glide': {
      title: "Portamento & Glide Effects - Smooth Pitch Transitions | LiriLab",
      description: "Create smooth pitch transitions between notes. Experiment with portamento and glide effects for expressive musical passages.",
      keywords: "portamento, glide effects, pitch bend, smooth pitch transitions, legato playing, synthesizer portamento, pitch glide, expressive playing, musical expression",
      image: "/images/og-portamento.jpg",
      canonical: "/portamento-glide"
    },

    'waveform-combiner': {
      title: "Waveform Mixer - Combine Audio Waveforms | LiriLab",
      description: "Mix and combine multiple waveforms to create complex sounds. Adjust phase, amplitude, and harmonic content for unique textures.",
      keywords: "waveform mixer, waveform combiner, audio waveforms, waveform synthesis, harmonic mixing, phase manipulation, sound synthesis, waveform blending, audio wave mixing",
      image: "/images/og-waveform-mixer.jpg",
      canonical: "/waveform-combiner"
    },

    'consonance-dissonance': {
      title: "Consonance & Dissonance - Harmonic Tension Tool | LiriLab",
      description: "Explore harmonic relationships and tension. Understand the difference between consonant and dissonant intervals in music theory.",
      keywords: "consonance, dissonance, harmonic tension, music theory, interval relationships, harmonic relationships, music harmony, chord tension, harmonic analysis, music consonance",
      image: "/images/og-consonance.jpg",
      canonical: "/consonance-dissonance"
    },

    'piano-roll-basics': {
      title: "Piano Roll Editor - MIDI Sequencing Basics | LiriLab",
      description: "Learn MIDI sequencing with our interactive piano roll editor. Understand note timing, velocity, and basic music production concepts.",
      keywords: "piano roll, MIDI editor, MIDI sequencing, music production, digital audio workstation, MIDI piano roll, music sequencer, note editing, MIDI programming, music composition software",
      image: "/images/og-piano-roll.jpg",
      canonical: "/piano-roll-basics"
    },

    'panner-tool': {
      title: "Audio Panner - Stereo Positioning Tool | LiriLab",
      description: "Control stereo positioning with precision panning. Learn how to place sounds in the stereo field for professional mixing.",
      keywords: "audio panner, stereo panning, sound positioning, stereo field, audio mixing, stereo imaging, pan control, sound placement, stereo width, audio spatialization",
      image: "/images/og-panner.jpg",
      canonical: "/panner-tool"
    },

    'mid-side-explorer': {
      title: "Mid/Side Processing - Advanced Stereo Techniques | LiriLab",
      description: "Master mid/side processing techniques. Separate and process center vs. side information for advanced stereo manipulation.",
      keywords: "mid side processing, MS processing, stereo processing, mid side EQ, stereo imaging, advanced mixing, stereo separation, center side processing, mastering techniques",
      image: "/images/og-mid-side.jpg",
      canonical: "/mid-side-explorer"
    },

    'pitch-shift-explorer': {
      title: "Pitch Shifter - Real-time Pitch Manipulation | LiriLab",
      description: "Experiment with real-time pitch shifting effects. Create harmonies, octave shifts, and formant-preserving pitch changes.",
      keywords: "pitch shifter, pitch shifting, pitch correction, harmony generator, octave shifter, formant shifting, vocal pitch, audio pitch manipulation, pitch effects",
      image: "/images/og-pitch-shift.jpg",
      canonical: "/pitch-shift-explorer"
    },

    'stereo-imager-explorer': {
      title: "Stereo Imager - Control Stereo Width | LiriLab",
      description: "Adjust stereo width and imaging with precision controls. Learn how to enhance or reduce stereo information in your mix.",
      keywords: "stereo imager, stereo width, stereo enhancement, stereo imaging, width control, stereo expansion, mono compatibility, stereo field manipulation",
      image: "/images/og-stereo-imager.jpg",
      canonical: "/stereo-imager-explorer"
    },

    'limiter-explorer': {
      title: "Learn Audio Limiter - Peak Control & Loudness Training | LiriLab",
      description: "Master audio limiting with interactive controls. Learn peak limiting, loudness maximization, and professional mastering techniques through hands-on practice.",
      keywords: "learn audio limiter online, limiter tutorial interactive, peak limiter training, loudness maximizer guide, mastering limiter explained, audio limiting practice, peak control tutorial, clipping prevention guide, mastering techniques online, dynamic range limiting",
      image: "/images/og-limiter.jpg",
      canonical: "/limiter-explorer"
    },

    'saturation-explorer': {
      title: "Learn Audio Saturation - Harmonic Enhancement Training | LiriLab",
      description: "Master audio saturation with real-time controls. Learn tape, tube, and digital saturation through interactive audio processing and instant feedback.",
      keywords: "learn audio saturation online, saturation tutorial interactive, harmonic saturation guide, tape saturation explained, tube saturation training, analog warmth tutorial, harmonic distortion practice, saturation mixing guide, vintage sound processing",
      image: "/images/og-saturation.jpg",
      canonical: "/saturation-explorer"
    },

    'chorus-explorer': {
      title: "Chorus Effect - Lush Modulation Textures | LiriLab",
      description: "Create rich, animated textures with chorus effects. Control rate, depth, and feedback for classic modulation sounds.",
      keywords: "chorus effect, chorus modulation, modulation effects, chorus pedal, vintage chorus, stereo chorus, chorus settings, guitar chorus, vocal chorus",
      image: "/images/og-chorus.jpg",
      canonical: "/chorus-explorer"
    },

    'tremolo-explorer': {
      title: "Tremolo Effect - Amplitude Modulation | LiriLab",
      description: "Create rhythmic volume pulsations with tremolo effects. Experiment with different waveforms and modulation rates.",
      keywords: "tremolo effect, amplitude modulation, tremolo guitar, vintage tremolo, tremolo pedal, volume modulation, tremolo settings, guitar tremolo, tremolo rate",
      image: "/images/og-tremolo.jpg",
      canonical: "/tremolo-explorer"
    },

    'granular-explorer': {
      title: "Granular Synthesis - Microscopic Sound Design | LiriLab",
      description: "Manipulate sound at the granular level. Create unique textures and effects through advanced granular synthesis techniques.",
      keywords: "granular synthesis, granular effects, microsound, granular processing, sound granulation, texture synthesis, granular sampler, advanced sound design",
      image: "/images/og-granular.jpg",
      canonical: "/granular-explorer"
    },

    'beat-repeat-looper': {
      title: "Beat Repeater - Creative Loop Effects | LiriLab",
      description: "Capture and manipulate rhythmic fragments in real-time. Create stutter effects, beat repeats, and creative loop variations.",
      keywords: "beat repeater, loop effects, stutter effects, beat chopper, rhythmic effects, loop manipulation, beat slicer, creative looping, rhythm effects",
      image: "/images/og-beat-repeat.jpg",
      canonical: "/beat-repeat-looper"
    },

    'swing-groove-visualizer': {
      title: "Swing & Groove - Rhythm Feel Visualizer | LiriLab",
      description: "Understand swing and groove with visual timing analysis. Adjust swing percentage and explore different rhythmic feels.",
      keywords: "swing rhythm, groove, swing feel, rhythm swing, jazz swing, shuffle rhythm, groove quantization, rhythmic feel, timing variation, swing percentage",
      image: "/images/og-swing.jpg",
      canonical: "/swing-groove-visualizer"
    },

    'drum-sequencer-game': {
      title: "Drum Pattern Game - Rhythm Challenge | LiriLab",
      description: "Test your rhythm skills with drum pattern challenges. Recreate beats and improve your timing with fun game mechanics.",
      keywords: "drum game, rhythm game, drum pattern game, beat game, percussion game, rhythm challenge, drum training game, music game, beat matching, rhythm practice game",
      image: "/images/og-drum-game.jpg",
      canonical: "/drum-sequencer-game"
    }
  }
};

// Helper function to get SEO data for a specific page
export const getSEOData = (pageId) => {
  console.log('getSEOData called with pageId:', pageId);
  
  const pageData = SEO_CONFIG.pages[pageId];
  const global = SEO_CONFIG.global;
  
  console.log('Found pageData:', pageData);
  
  if (!pageData) {
    console.warn(`No SEO data found for pageId: ${pageId}`);
    return {
      title: `${global.siteName} - Music Tools & Sound Design`,
      description: "Interactive music tools for learning and creating music.",
      keywords: "music tools, sound design, music education",
      image: "/images/og-default.jpg",
      canonical: "/",
      ...global
    };
  }

  const result = {
    ...pageData,
    fullTitle: pageData.title,
    ogTitle: pageData.title,
    ogDescription: pageData.description,
    ogImage: `${global.domain}${pageData.image}`,
    ogUrl: `${global.domain}${pageData.canonical}`,
    ...global
  };
  
  console.log('getSEOData returning:', result);
  return result;
};

export const generateMusicToolStructuredData = (tool, seoData) => {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": tool.name,
    "description": tool.description,
    "url": `${SEO_CONFIG.global.domain}${tool.path}`,
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "creator": {
      "@type": "Organization",
      "name": SEO_CONFIG.global.siteName
    },
    "featureList": tool.categories
  };
};