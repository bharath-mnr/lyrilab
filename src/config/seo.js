// src/config/seo.js
export const SEO_CONFIG = {
  // Global defaults
  global: {
    siteName: "LyriLab",
    domain: "https://www.lyrilab.com", //https://lyrilab.com // npm run sitemap
    twitterHandle: "...",
    locale: "en_US",
    type: "website",
    author: "Bharath",
    image: "/images/og-default.jpg"
  },

  pages: {

    // Home page
    'home': {
      title: "LyriLab - Learn Music Visually Online | No DAW Software Needed",
      description: "Learn music fundamentals visually online without DAW or software downloads. Master EQ, compression, synthesis, and music theory with real-time visual feedback.",
      keywords: "learn music online, visual music learning, music theory online, EQ training online, compression tutorial, synthesis learning, no DAW needed, online music education",
      // image: "/images/og-home.jpg",
      canonical: "/"
    },

    // Static pages
    'docs': {
      title: "Documentation - How to Use LyriLab Music Tools | LyriLab",
      description: "Complete documentation and guides for all LyriLab music learning tools. Learn how to use our visual music training platform effectively.",
      keywords: "LyriLab documentation, music tool guides, online music learning help, music education tutorials, visual learning guides",
      // image: "/images/og-docs.jpg",
      canonical: "/docs"
    },

    'contact': {
      title: "Contact Us - Get Help with Music Learning | LyriLab",
      description: "Contact LyriLab for support, feedback, or questions about our visual music learning platform. We're here to help your musical journey.",
      keywords: "LyriLab contact, music learning support, customer service, feedback, music education help",
      // image: "/images/og-contact.jpg",
      canonical: "/contact"
    },

    'privacy-policy': {
      title: "Privacy Policy - How We Protect Your Data | LyriLab",
      description: "Learn how LyriLab protects your privacy and handles your data while you learn music online. Our commitment to user privacy.",
      keywords: "LyriLab privacy policy, data protection, user privacy, music learning platform privacy",
      // image: "/images/og-privacy.jpg",
      canonical: "/privacy-policy"
    },

    'terms-and-conditions': {
      title: "Terms and Conditions - LyriLab Usage Guidelines | LyriLab",
      description: "Read LyriLab's terms of service and usage guidelines for our online music learning platform.",
      keywords: "LyriLab terms of service, usage guidelines, music learning platform terms",
      // image: "/images/og-terms.jpg",
      canonical: "/terms-and-conditions"
    },

    // '404': {
    //   title: "Page Not Found - LyriLab Music Learning Platform",
    //   description: "The page you're looking for doesn't exist. Explore our visual music learning tools and educational resources.",
    //   keywords: "404 error, page not found, LyriLab, music learning",
    //   image: "/images/og-404.jpg",
    //   canonical: "/"
    // },

    'eq-studio': {
      title: "Online EQ Studio - Professional Audio Equalizer with Visual Controls | LyriLab",
      description: "Use our online EQ Studio to fine-tune your sound with vertical frequency controls and real-time visual feedback. Perfect for mixing, mastering, or casual listening.",
      keywords: "online audio equalizer, EQ studio online, frequency control tool, real-time EQ visualizer, audio mastering EQ online, web equalizer, vertical EQ controls, mix audio online, graphic equalizer browser tool",
      image: "/images/og-eq-studio.jpg",
      canonical: "/eq-studio"
    },

    'reverb-studio': {
      title: "Online Reverb Studio - Add Space and Depth with Real-Time Audio Reverb | LyriLab",
      description: "Enhance your audio with professional reverb using our online Reverb Studio. Adjust room size, decay, and more with live audio feedback and visualization.",
      keywords: "online reverb tool, reverb studio online, add reverb to audio online, real-time reverb visualizer, room reverb online, audio space simulator, sound reverb editor, web-based reverb effect, reverb mix tool",
      image: "/images/og-reverb-studio.jpg",
      canonical: "/reverb-studio"
    },

    'slowed-reverb-studio': {
      title: "Slowed + Reverb Audio Studio - Create Aesthetic Sounds Online | LyriLab",
      description: "Make your music dreamy and emotional with our Slowed Reverb Studio. Slow down tracks and add smooth reverb with real-time audio feedback and visual effects.",
      keywords: "slowed and reverb online, aesthetic audio editor, slowed reverb maker, chill sound effect tool, dreamy reverb audio online, slow reverb music editor, lofi sound online, online audio slowing and reverb",
      image: "/images/og-slowed-reverb-studio.jpg",
      canonical: "/slowed-reverb-studio"
    },

    '3D-audio-studio': {
      title: "3D Audio Studio - Create Immersive Audio Experiences Online | LyriLab",
      description: "Add depth and dimension to your sound with our 3D Audio Studio. Experience spatial audio movement in real time, great for headphones and immersive music.",
      keywords: "3D audio online, spatial sound editor, immersive audio tool, online 3D sound designer, surround sound studio, binaural audio editor, 3D sound panning online, 360 audio maker, 3D reverb audio studio",
      image: "/images/og-3d-audio-studio.jpg",
      canonical: "/3D-audio-studio"
    },

    'bass-booster-studio': {
      title: "Online Bass Booster Studio - Enhance Your Low-End in Real-Time | LyriLab",
      description: "Boost your bass frequencies instantly with our Bass Booster Studio. Designed for music producers, DJs, and listeners who love deep, punchy sound.",
      keywords: "bass booster online, enhance bass audio, low-end boost tool, bass boost studio, online audio bass enhancer, music bass booster, punchy bass tool online, subwoofer boost online, deep bass EQ",
      image: "/images/og-bass-booster-studio.jpg",
      canonical: "/bass-booster"
    },

    

    'virtual-piano': {
      title: "Online Piano Practice No Download - Visual Keyboard Learning | LyriLab",
      description: "Practice piano online with visual keyboard feedback - no software download needed. Learn piano basics with real-time visual guides and instant audio response.",
      keywords: "online piano practice no download, visual piano learning online, piano practice no software needed, virtual piano visual learning, online piano no DAW, piano keyboard visual practice, learn piano visually online, piano practice browser only, visual piano training online",
      image: "/images/og-piano.jpg",
      canonical: "/virtual-piano"
    },


    'drum-machine': {
      title: "Online Drum Machine Practice - Real-Time Beat Making | LyriLab",
      description: "Create beats online with our real-time drum machine. Practice drum patterns, make beats online, and learn rhythm production with instant audio feedback and multiple drum kits.",
      keywords: "online drum machine practice, drum machine online free, beat maker online practice, online drum practice, drum sequencer online, make beats online practice, drum pattern practice online, online rhythm practice, drum programming online, beat production online practice, drum kit online practice, electronic drums online",
      image: "/images/og-drum-machine.jpg",
      canonical: "/drum-machine"
    },

    'tap-tempo-tool': {
      title: "Online Tap Tempo Practice - Real-Time BPM Calculator | LyriLab",
      description: "Practice tempo recognition online with our real-time tap tempo tool. Calculate BPM instantly by tapping, perfect for online music practice and tempo training.",
      keywords: "tap tempo online practice, BPM calculator online, tempo practice online, online metronome practice, tap BPM online practice, tempo training online, rhythm tempo practice online, beat tempo online practice, music tempo practice online, tempo finder online practice, BPM practice online",
      image: "/images/og-tap-tempo.jpg",
      canonical: "/tap-tempo-tool"
    },

    'time-signature-metronome': {
      title: "Online Metronome Practice - All Time Signatures Real-Time | LyriLab",
      description: "Practice with advanced online metronome supporting all time signatures. Real-time tempo practice for complex rhythms, perfect for online music practice sessions.",
      keywords: "online metronome practice, metronome online practice, time signature practice online, rhythm practice online metronome, online music practice metronome, complex rhythm practice online, polyrhythm metronome online, metronome training online, tempo practice online tool, beat practice online metronome",
      image: "/images/og-metronome.jpg",
      canonical: "/time-signature-metronome"
    },

    'chord-explorer': {
      title: "Online Chord Practice - Interactive Guitar & Piano Chords | LyriLab",
      description: "Practice chords online with real-time audio feedback. Learn guitar and piano chords with our interactive online chord practice tool and chord dictionary.",
      keywords: "online chord practice, chord practice online, guitar chords online practice, piano chords online practice, chord trainer online, online music practice chords, chord learning online practice, chord dictionary online practice, interactive chord practice online, chord progression practice online",
      image: "/images/og-chord-explorer.jpg",
      canonical: "/chord-explorer"
    },

    'chord-progression-builder': {
      title: "Online Chord Progression Practice - Real-Time Song Building | LyriLab",
      description: "Practice chord progressions online with real-time playback. Build song progressions, practice chord changes, and learn harmony with our online chord progression tool.",
      keywords: "chord progression practice online, online chord progression practice, chord changes practice online, songwriting practice online, harmony practice online, chord sequence practice online, online music composition practice, chord progression trainer online, online chord progression builder",
      image: "/images/og-chord-progressions.jpg",
      canonical: "/chord-progression-builder"
    },

    'scale-explorer': {
      title: "Online Scale Practice - Interactive Music Scales Learning | LyriLab",
      description: "Practice music scales online with real-time audio and visual feedback. Learn guitar and piano scales with our comprehensive online scale practice tool.",
      keywords: "online scale practice, music scales practice online, guitar scales online practice, piano scales online practice, scale training online, pentatonic scale practice online, major scale practice online, minor scale practice online, modal scales practice online, blues scales online practice, jazz scales practice online",
      image: "/images/og-scales.jpg",
      canonical: "/scale-explorer"
    },

    'interval-training': {
      title: "Online Interval Training Practice - Real-Time Ear Training | LyriLab",
      description: "Practice interval recognition online with real-time audio feedback. Improve your musical ear with our interactive online interval training and ear practice tool.",
      keywords: "online interval training practice, ear training online practice, interval practice online, music interval training online, online ear training practice, interval recognition online practice, perfect pitch practice online, relative pitch training online, music ear practice online, audio interval training online",
      image: "/images/og-interval-training.jpg",
      canonical: "/interval-training"
    },

    'circle-of-fifths': {
      title: "Circle of Fifths Online Practice - Interactive Music Theory | LyriLab",
      description: "Learn circle of fifths online with real-time interactive practice. Master key relationships and music theory with our online circle of fifths training tool.",
      keywords: "circle of fifths online practice, circle of fifths practice online, music theory online practice, key signature practice online, online music theory practice, circle of fifths trainer online, harmonic relationships practice online, key relationships online practice, music theory circle of fifths online",
      image: "/images/og-circle-fifths.jpg",
      canonical: "/circle-of-fifths"
    },

    'arpeggiator-sequencer': {
      title: "Online Arpeggiator Practice - Real-Time Arpeggio Sequencer | LyriLab",
      description: "Practice arpeggios online with our real-time arpeggiator sequencer. Create and practice arpeggio patterns with instant audio feedback and customizable sequences.",
      keywords: "online arpeggiator practice, arpeggio practice online, arpeggio sequencer online, arpeggiator online practice, online arpeggio training, arpeggio pattern practice online, electronic music practice online, synth arpeggiator online practice, MIDI arpeggiator practice online",
      image: "/images/og-arpeggiator.jpg",
      canonical: "/arpeggiator-sequencer"
    },

    'wavetable-editor': {
      title: "Learn Sine Square Saw Triangle Waves Online - Visual Waveform Editor | LyriLab",
      description: "Master sine, square, saw, triangle waveforms visually online. No DAW needed - learn waveform fundamentals with real-time visual feedback and audio synthesis practice.",
      keywords: "learn sine wave online, square wave practice online, sawtooth wave online training, triangle wave visual learning, waveform editor no DAW, visual waveform learning online, basic waveforms practice online, oscillator waveforms online, fundamental waves online practice, waveform synthesis visual learning",
      image: "/images/og-wavetable.jpg",
      canonical: "/wavetable-editor"
    },

    'lfo-modulation': {
      title: "Learn LFO Visually Online - Visual Low Frequency Oscillator No DAW | LyriLab",
      description: "Learn LFO modulation visually online without DAW software. Master sine, square, triangle LFO waves with real-time visual feedback and parameter modulation practice.",
      keywords: "learn LFO visually online, visual LFO training, LFO modulation visual learning, low frequency oscillator visual practice, LFO waves visual training, sine square triangle LFO online, modulation visual learning no DAW, LFO parameter visual training",
      image: "/images/og-lfo.jpg",
      canonical: "/lfo-modulation"
    },

    'adsr-envelope-tool': {
      title: "Learn ADSR Visually Online - Visual Envelope Shaping No DAW | LyriLab",
      description: "Learn ADSR envelope visually online without DAW. Master Attack, Decay, Sustain, Release with real-time visual curves and instant audio feedback for sound shaping.",
      keywords: "learn ADSR visually online, visual ADSR training, ADSR envelope visual learning, attack decay sustain release visual, envelope shaping no DAW, ADSR curves visual practice, synthesizer ADSR visual training, sound envelope visual learning, envelope generator visual practice",
      image: "/images/og-adsr.jpg",
      canonical: "/adsr-envelope-tool"
    },

    'eq-explorer': {
      title: "Learn EQ Visually Online - No DAW EQ Training with Real Audio | LyriLab",
      description: "Learn EQ visually online without DAW software. Master frequency bands, Q settings, and gain control with real-time visual EQ curves and instant audio feedback.",
      keywords: "learn EQ visually online, visual EQ training online, EQ practice no DAW needed, frequency bands visual learning, parametric EQ visual training, EQ curves online learning, audio EQ visual practice, frequency response visual learning, EQ settings visual training, graphic EQ visual practice",
      image: "/images/og-eq.jpg",
      canonical: "/eq-explorer"
    },

    'compression-explorer': {
      title: "Learn Compressor Visually Online - Visual Compression No DAW Training | LyriLab",
      description: "Learn audio compression visually online without DAW. Master threshold, ratio, attack, release with real-time visual compression curves and instant audio feedback.",
      keywords: "learn compressor visually online, visual compression training, compressor visual learning no DAW, threshold ratio visual training, attack release visual learning, compression curves visual practice, audio dynamics visual training, vocal compressor visual learning",
      image: "/images/og-compressor.jpg",
      canonical: "/compression-explorer"
    },

    'reverb-explorer': {
      title: "Learn Reverb Online Practice - Real-Time Spatial Audio Training | LyriLab",
      description: "Practice reverb effects online with real-time audio processing. Learn room, hall, plate reverb with instant feedback in our interactive online reverb trainer.",
      keywords: "learn reverb online practice, reverb practice online, spatial audio training online, online reverb practice, room reverb online practice, hall reverb online training, plate reverb practice online, reverb mixing online practice, audio ambience online training, sound space online practice",
      image: "/images/og-reverb.jpg",
      canonical: "/reverb-explorer"
    },

    'delay-explorer': {
      title: "Learn Delay Effects Online - Real-Time Echo Practice Training | LyriLab",
      description: "Practice delay effects online with real-time audio processing. Master echo and time-based effects with instant feedback in our interactive online delay trainer.",
      keywords: "learn delay online practice, delay effects practice online, echo training online, online delay practice, audio delay online practice, ping pong delay online training, rhythmic delay online practice, delay mixing online training, echo effects online practice, time delay online training",
      image: "/images/og-delay.jpg",
      canonical: "/delay-explorer"
    },

    'polyrhythm-sequencer': {
      title: "Online Polyrhythm Practice - Real-Time Complex Rhythm Training | LyriLab",
      description: "Practice polyrhythms online with real-time sequencing. Master complex rhythm patterns with our interactive online polyrhythm trainer and visualization tool.",
      keywords: "polyrhythm practice online, online polyrhythm training, complex rhythm practice online, polyrhythmic practice online, rhythm layering online practice, advanced rhythm online training, percussion polyrhythm online practice, drum polyrhythm practice online, rhythmic complexity online training",
      image: "/images/og-polyrhythm.jpg",
      canonical: "/polyrhythm-sequencer"
    },

    'euclidean-rhythm-generator': {
      title: "Online Euclidean Rhythm Practice - Algorithmic Beat Training | LyriLab",
      description: "Practice Euclidean rhythms online with real-time generation. Learn mathematical rhythm patterns with our interactive online Euclidean rhythm trainer.",
      keywords: "euclidean rhythm practice online, online euclidean rhythm training, algorithmic rhythm practice online, mathematical rhythm online practice, euclidean algorithm online practice, rhythm generator online practice, percussion pattern online training, drum pattern online practice, algorithmic composition online training",
      image: "/images/og-euclidean.jpg",
      canonical: "/euclidean-rhythm-generator"
    },

    'chord-training-quiz': {
      title: "Online Chord Recognition Practice - Real-Time Musical Quiz Training | LyriLab",
      description: "Practice chord recognition online with real-time audio quizzes. Improve your musical ear with our interactive online chord training games and exercises.",
      keywords: "chord recognition practice online, online chord training practice, chord quiz online practice, music theory quiz online practice, chord identification online training, ear training chord practice online, chord game online practice, music education online practice, chord recognition online training",
      image: "/images/og-chord-quiz.jpg",
      canonical: "/chord-training-quiz"
    },

    'ear-training-quiz': {
      title: "Online Ear Training Practice - Comprehensive Musical Hearing Games | LyriLab",
      description: "Practice ear training online with real-time audio exercises. Improve interval, chord, and scale recognition with our comprehensive online ear training platform.",
      keywords: "ear training practice online, online ear training practice, music ear training online practice, interval recognition online practice, pitch training online practice, musical hearing online training, ear training exercises online practice, perfect pitch online training, relative pitch online practice",
      image: "/images/og-ear-training.jpg",
      canonical: "/ear-training-quiz"
    },

    'synthesis-challenge': {
      title: "Online Sound Design Practice - Real-Time Synthesizer Training | LyriLab",
      description: "Practice sound design online with real-time synthesis challenges. Master synthesizer programming with our interactive online sound design training games.",
      keywords: "sound design practice online, online synthesis practice, synthesizer training online, synth programming online practice, electronic music production online practice, sound design online training, synthesis challenge online practice, synthesizer practice online, audio synthesis online training",
      image: "/images/og-synth-challenge.jpg",
      canonical: "/synthesis-challenge"
    },

    'humanizer-panel': {
      title: "Online MIDI Humanization Practice - Real-Time Performance Enhancement | LyriLab",
      description: "Practice MIDI humanization online with real-time parameter control. Learn to add natural feel to digital performances with our online MIDI humanizer trainer.",
      keywords: "MIDI humanizer online practice, online MIDI practice, music humanization online training, MIDI variation online practice, timing variation online practice, natural MIDI online training, human feel online practice, MIDI processing online practice, performance enhancement online training",
      image: "/images/og-humanizer.jpg",
      canonical: "/humanizer-panel"
    },

    'portamento-glide': {
      title: "Online Portamento Practice - Real-Time Pitch Transition Training | LyriLab",
      description: "Practice portamento effects online with real-time pitch control. Learn smooth pitch transitions and glide techniques with our interactive online portamento trainer.",
      keywords: "portamento practice online, online portamento training, pitch glide online practice, smooth pitch online training, synthesizer portamento online practice, pitch bend online practice, legato playing online training, musical expression online practice, expressive playing online training",
      image: "/images/og-portamento.jpg",
      canonical: "/portamento-glide"
    },

    'waveform-combiner': {
      title: "Online Waveform Mixing Practice - Real-Time Audio Wave Synthesis | LyriLab",
      description: "Practice waveform mixing online with real-time audio synthesis. Learn to combine and manipulate audio waveforms with our interactive online waveform trainer.",
      keywords: "waveform mixing online practice, online waveform practice, audio waveform online training, wave synthesis online practice, harmonic mixing online practice, waveform synthesis online training, sound synthesis online practice, audio wave online training, waveform blending online practice",
      image: "/images/og-waveform-mixer.jpg",
      canonical: "/waveform-combiner"
    },

  'consonance-dissonance': {
  title: "Advanced Harmony Training - Interactive Consonance Dissonance Analyzer | LyriLab",
  description: "Master harmony with real-time consonance and dissonance analysis. Interactive wave visualization, interval training, and dynamic harmonic tension analysis. Features live waveform display, customizable frequencies, and instant feedback on musical intervals from unison to octave.",
  keywords: "harmony practice online, consonance dissonance analyzer, interactive music theory training, real-time harmonic analysis, interval relationship trainer, harmonic tension analyzer, music interval visualizer, wave interference patterns music, audio harmony generator, chord tension analysis tool, musical frequency relationships, harmonic series training, interval ear training online, practice consonance dissonance online, visual harmony training waveforms, musical interval mathematics, frequency ratio harmony training, acoustic harmony visualization, online pitch relationship trainer",
  image: "/images/og-consonance.jpg",
  canonical: "/consonance-dissonance"
  },

    'piano-roll-basics': {
      title: "Online Piano Roll Practice - Real-Time MIDI Sequencing Training | LyriLab",
      description: "Practice MIDI sequencing online with our real-time piano roll editor. Learn music production basics with interactive online MIDI programming exercises.",
      keywords: "piano roll online practice, online MIDI practice, MIDI sequencing online training, music production online practice, digital audio workstation online training, MIDI programming online practice, music composition online practice, MIDI editor online training, note editing online practice",
      image: "/images/og-piano-roll.jpg",
      canonical: "/piano-roll-basics"
    },

    'panner-tool': {
      title: "Online Audio Panning Practice - Real-Time Stereo Positioning Training | LyriLab",
      description: "Practice audio panning online with real-time stereo control. Learn stereo positioning techniques with our interactive online panning trainer for professional mixing.",
      keywords: "audio panning online practice, online panning practice, stereo positioning online training, stereo field online practice, audio mixing panning online practice, stereo imaging online training, sound placement online practice, stereo width online training, audio spatialization online practice",
      image: "/images/og-panner.jpg",
      canonical: "/panner-tool"
    },

    'mid-side-explorer': {
      title: "Online Mid/Side Processing Practice - Real-Time Stereo Training | LyriLab",
      description: "Practice Mid/Side processing online with real-time stereo manipulation. Master advanced stereo techniques with our interactive online M/S training tool.",
      keywords: "mid side processing online practice, MS processing online training, stereo processing online practice, advanced mixing online training, stereo separation online practice, center side processing online training, mastering techniques online practice, stereo imaging online training",
      image: "/images/og-mid-side.jpg",
      canonical: "/mid-side-explorer"
    },

    'pitch-shift-explorer': {
      title: "Online Pitch Shifting Practice - Real-Time Pitch Manipulation Training | LyriLab",
      description: "Practice pitch shifting online with real-time audio manipulation. Learn harmony creation and pitch effects with our interactive online pitch shifter trainer.",
      keywords: "pitch shifting online practice, online pitch shifter practice, pitch manipulation online training, harmony generator online practice, octave shifter online training, pitch correction online practice, vocal pitch online training, audio pitch online practice, pitch effects online training",
      image: "/images/og-pitch-shift.jpg",
      canonical: "/pitch-shift-explorer"
    },

    'stereo-imager-explorer': {
      title: "Online Stereo Imaging Practice - Real-Time Width Control Training | LyriLab",
      description: "Practice stereo imaging online with real-time width control. Master stereo enhancement techniques with our interactive online stereo imager trainer.",
      keywords: "stereo imaging online practice, online stereo imager practice, stereo width online training, stereo enhancement online practice, width control online training, stereo expansion online practice, mono compatibility online training, stereo field online practice",
      image: "/images/og-stereo-imager.jpg",
      canonical: "/stereo-imager-explorer"
    },

    'limiter-explorer': {
      title: "Learn Audio Limiter Online - Real-Time Peak Control Training | LyriLab",
      description: "Practice audio limiting online with real-time peak control. Master loudness maximization and professional mastering with our interactive online limiter trainer.",
      keywords: "learn limiter online practice, audio limiter online training, peak limiter online practice, loudness maximizer online training, mastering limiter online practice, audio limiting online training, peak control online practice, clipping prevention online training, mastering techniques online practice",
      image: "/images/og-limiter.jpg",
      canonical: "/limiter-explorer"
    },

    'saturation-explorer': {
      title: "Learn Audio Saturation Online - Real-Time Harmonic Enhancement Training | LyriLab",
      description: "Practice audio saturation online with real-time harmonic processing. Learn tape, tube, and digital saturation with our interactive online saturation trainer.",
      keywords: "learn saturation online practice, audio saturation online training, harmonic saturation online practice, tape saturation online training, tube saturation online practice, analog warmth online training, vintage sound online practice, saturation mixing online training",
      image: "/images/og-saturation.jpg",
      canonical: "/saturation-explorer"
    },

    'chorus-explorer': {
      title: "Online Chorus Effect Practice - Real-Time Modulation Training | LyriLab",
      description: "Practice chorus effects online with real-time modulation control. Create lush textures and learn modulation techniques with our interactive online chorus trainer.",
      keywords: "chorus effect online practice, online chorus practice, modulation effects online training, chorus modulation online practice, vintage chorus online training, stereo chorus online practice, guitar chorus online training, vocal chorus online practice",
      image: "/images/og-chorus.jpg",
      canonical: "/chorus-explorer"
    },

    'tremolo-explorer': {
      title: "Online Tremolo Effect Practice - Real-Time Amplitude Modulation Training | LyriLab",
      description: "Practice tremolo effects online with real-time amplitude modulation. Learn volume pulsation techniques with our interactive online tremolo trainer.",
      keywords: "tremolo effect online practice, online tremolo practice, amplitude modulation online training, tremolo guitar online practice, vintage tremolo online training, volume modulation online practice, tremolo rate online training, guitar tremolo online practice",
      image: "/images/og-tremolo.jpg",
      canonical: "/tremolo-explorer"
    },

    'granular-explorer': {
      title: "Online Granular Synthesis Practice - Real-Time Microscopic Sound Design | LyriLab",
      description: "Practice granular synthesis online with real-time granular processing. Master advanced sound design techniques with our interactive online granular trainer.",
      keywords: "granular synthesis online practice, online granular practice, microsound online training, granular processing online practice, sound granulation online training, texture synthesis online practice, advanced sound design online training, granular sampler online practice",
      image: "/images/og-granular.jpg",
      canonical: "/granular-explorer"
    },

    'beat-repeat-looper': {
      title: "Online Beat Repeater Practice - Real-Time Creative Loop Training | LyriLab",
      description: "Practice beat repeating online with real-time loop manipulation. Master stutter effects and creative looping with our interactive online beat repeater trainer.",
      keywords: "beat repeater online practice, online beat repeat practice, loop effects online training, stutter effects online practice, beat chopper online training, rhythmic effects online practice, creative looping online training, rhythm effects online practice",
      image: "/images/og-beat-repeat.jpg",
      canonical: "/beat-repeat-looper"
    },

    'swing-groove-visualizer': {
      title: "Online Swing & Groove Practice - Real-Time Rhythm Feel Training | LyriLab",
      description: "Practice swing and groove online with real-time timing visualization. Master rhythmic feel and swing percentage with our interactive online groove trainer.",
      keywords: "swing rhythm online practice, online groove practice, swing feel online training, rhythm swing online practice, jazz swing online training, shuffle rhythm online practice, groove quantization online training, rhythmic feel online practice, timing variation online practice",
      image: "/images/og-swing.jpg",
      canonical: "/swing-groove-visualizer"
    },

    'drum-sequencer-game': {
      title: "Online Drum Pattern Game - Real-Time Rhythm Challenge Training | LyriLab",
      description: "Practice drum patterns online with real-time rhythm challenges. Improve timing and beat creation skills with our interactive online drum pattern game.",
      keywords: "drum pattern game online practice, online rhythm game practice, drum game online training, beat game online practice, percussion game online training, rhythm challenge online practice, drum training game online, beat matching online practice, rhythm practice game online",
      image: "/images/og-drum-game.jpg",
      canonical: "/drum-sequencer-game"
    }
  }
};

// // Helper function to get SEO data for a specific page
// export const getSEOData = (pageId) => {
//   console.log('getSEOData called with pageId:', pageId);
  
//   const pageData = SEO_CONFIG.pages[pageId];
//   const global = SEO_CONFIG.global;
  
//   console.log('Found pageData:', pageData);
  
//   if (!pageData) {
//     console.warn(`No SEO data found for pageId: ${pageId}`);
//     return {
//       title: `${global.siteName} - Learn Music Visually Online | No DAW Software Needed`,
//       description: "Learn music fundamentals visually online - no DAW or software downloads needed. Master sine, square, saw waves, EQ, compression with real-time visual feedback.",
//       keywords: "learn music visually online, music training no DAW needed, visual music learning online, sine square saw triangle waves online, EQ visual learning, compression visual training, no software music practice",
//       image: "/images/og-default.jpg",
//       canonical: "/",
//       ...global
//     };
//   }

//   const result = {
//     ...pageData,
//     fullTitle: pageData.title,
//     ogTitle: pageData.title,
//     ogDescription: pageData.description,
//     ogImage: `${global.domain}${pageData.image}`,
//     ogUrl: `${global.domain}${pageData.canonical}`,
//     ...global
//   };
  
//   console.log('getSEOData returning:', result);
//   return result;
// };

// export const generateMusicToolStructuredData = (tool, seoData) => {
//   return {
//     "@context": "https://schema.org",
//     "@type": "SoftwareApplication",
//     "name": tool.name,
//     "description": tool.description,
//     "url": `${SEO_CONFIG.global.domain}${tool.path}`,
//     "applicationCategory": "MultimediaApplication",
//     "operatingSystem": "Web Browser",
//     "offers": {
//       "@type": "Offer",
//       "price": "0",
//       "priceCurrency": "USD"
//     },
//     "creator": {
//       "@type": "Organization",
//       "name": SEO_CONFIG.global.siteName
//     },
//     "featureList": tool.categories,
//     "keywords": seoData.keywords
//   };
// };



// Enhanced helper function to get SEO data for a specific page
export const getSEOData = (pageId) => {
  console.log('getSEOData called with pageId:', pageId);
  
  const pageData = SEO_CONFIG.pages[pageId];
  const global = SEO_CONFIG.global;
  
  console.log('Found pageData:', pageData);
  
  if (!pageData) {
    console.warn(`No SEO data found for pageId: ${pageId}`);
    return {
      title: `${global.siteName} - Learn Music Visually Online | No DAW Software Needed`,
      description: "Learn music fundamentals visually online - no DAW or software downloads needed. Master sine, square, saw waves, EQ, compression with real-time visual feedback.",
      keywords: "learn music visually online, music training no DAW needed, visual music learning online, sine square saw triangle waves online, EQ visual learning, compression visual training, no software music practice",
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

// Enhanced structured data generator
export const generateMusicToolStructuredData = (tool, seoData) => {
  const baseStructuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": tool.name,
    "description": tool.description,
    "url": `${SEO_CONFIG.global.domain}${tool.path}`,
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "Web Browser",
    "browserRequirements": "Requires JavaScript. Works with Chrome, Firefox, Safari, Edge.",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    },
    "creator": {
      "@type": "Organization",
      "name": SEO_CONFIG.global.siteName,
      "url": SEO_CONFIG.global.domain
    },
    "publisher": {
      "@type": "Organization",
      "name": SEO_CONFIG.global.siteName,
      "url": SEO_CONFIG.global.domain
    },
    "featureList": tool.categories || [],
    "keywords": seoData.keywords,
    "inLanguage": "en-US",
    "isFreeOfCharge": true,
    "isAccessibleForFree": true,
    "accessibilityControl": ["fullKeyboardControl", "fullMouseControl"],
    "accessibilityFeature": ["alternativeText", "structuralNavigation"],
    "accessibilityHazard": "none",
    "educationalUse": "instruction",
    "interactivityType": "active",
    "learningResourceType": "interactive resource",
    "typicalAgeRange": "13-99"
  };

  // Add additional structured data for music education tools
  if (tool.categories && tool.categories.includes('Music Theory')) {
    baseStructuredData["@type"] = ["SoftwareApplication", "LearningResource"];
    baseStructuredData.about = {
      "@type": "Thing",
      "name": "Music Theory",
      "description": "Educational content about music theory and composition"
    };
  }

  return baseStructuredData;
};

// Sitemap generation helper
export const generateSitemap = () => {
  const pages = Object.keys(SEO_CONFIG.pages).map(pageId => {
    const pageData = SEO_CONFIG.pages[pageId];
    return {
      url: `${SEO_CONFIG.global.domain}${pageData.canonical}`,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: pageId === 'home' ? 'weekly' : 'monthly',
      priority: pageId === 'home' ? '1.0' : '0.8'
    };
  });
  
  return pages;
};