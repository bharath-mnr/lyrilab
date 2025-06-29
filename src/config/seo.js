// src/config/seo.js

// Ensure this matches your actual domain for correct canonical URLs and OG URLs
const SITE_DOMAIN = "https://www.lirilab.com"; // **IMPORTANT: Update this to your ACTUAL LIVE DOMAIN!**

// Base SEO data that applies across the site or serves as a fallback
const GLOBAL_SEO = {
  siteName: "LiriLab: Online Music Tools & Experiments",
  domain: SITE_DOMAIN,
  twitterHandle: "@LiriLab", // Ensure this is your actual Twitter handle, e.g., "@YourTwitterHandle"
  locale: "en_US",
  type: "website", // Default type for the site. Specific pages can override.
  author: "Bharath",
  // Default image for social sharing if not specified for a page
  // IMPORTANT: This should be a general, engaging image for your brand.
  ogImage: `${SITE_DOMAIN}/images/og-default.jpg`,
};

// Page-specific SEO data
export const SEO_CONFIG = {
  global: GLOBAL_SEO,
  pages: {
    'home': {
      title: "LiriLab: Interactive Online Music Tools, Synth & Theory",
      description: "Explore 40+ **free online music tools** for interactive learning and sound design. Play virtual instruments, create beats, learn music theory visually, and master audio effects directly in your browser.",
      keywords: "online music tools, free music learning, interactive music, virtual instruments online, online synthesizers, audio effects online, music theory online, ear training games, browser music apps, learn music visually, sound design tools",
      image: "/images/og-home.jpg", // Specific image for your homepage
      canonical: "/", // This is the path part of the URL
    },
    'virtual-piano': {
      title: "Virtual Piano Keyboard Online - Play & Learn Free | LiriLab",
      description: "Play a **full-featured virtual piano keyboard online** with realistic sounds. Perfect for composing, learning piano basics, and practice. Works instantly in your browser with mouse & computer keyboard.",
      keywords: "virtual piano online, free online piano, web piano, browser piano, online piano keyboard, learn piano online, music practice online, interactive piano, digital piano online",
      image: "/images/og-piano.jpg", // Specific image for the Virtual Piano tool
      canonical: "/virtual-piano",
      type: "SoftwareApplication", // Override default type for tool pages
    },
    'guitar-fretboard': {
      title: "Interactive Guitar Fretboard Online - Learn Notes & Scales | LiriLab",
      description: "Master the **guitar fretboard online** with our interactive tool. Visualize scales, chords, and note positions across all strings and frets. Perfect for visual learners and guitar practice.",
      keywords: "online guitar fretboard, interactive guitar, learn guitar notes online, guitar scales online, guitar chord visualization, fretboard trainer online, guitar theory tool",
      image: "/images/og-guitar.jpg",
      canonical: "/guitar-fretboard",
      type: "SoftwareApplication",
    },
    // ... (rest of your page data)
    'drum-machine': {
      title: "Online Drum Machine & Beat Maker - Free Web Sequencer | LiriLab",
      description: "Create pro-quality beats with our **free online drum machine**. Features multiple drum kits, a step sequencer, tempo control, and rhythm pattern creation. Start making music in your browser now!",
      keywords: "online drum machine, free beat maker, web drum sequencer, online rhythm machine, create beats online, drum patterns, browser drum machine, music production online",
      image: "/images/og-drums.jpg",
      canonical: "/drum-machine",
      type: "SoftwareApplication",
    },
    'arpeggiator-sequencer': {
      title: "Online Arpeggiator - Create Melodic Patterns & Synth Arps | LiriLab",
      description: "Generate complex **melodic arpeggios online** with customizable patterns, note lengths, and octave ranges. Perfect for synth experimentation and discovering new musical ideas in your browser.",
      keywords: "online arpeggiator, web arpeggio generator, melodic patterns online, synth arpeggio, music sequencer online, interactive arpeggiator",
      image: "/images/og-arpeggiator.jpg",
      canonical: "/arpeggiator-sequencer",
      type: "SoftwareApplication",
    },
    'portamento-glide': {
      title: "Online Portamento & Glide Effect - Smooth Synth Transitions | LiriLab",
      description: "Experiment with **smooth pitch transitions online** using our portamento tool. Adjust glide time and curve for expressive, iconic synth sounds directly in your web browser.",
      keywords: "online portamento, glide effect online, synth pitch bend, web sound design, music synthesis tool, smooth note transitions",
      image: "/images/og-portamento.jpg",
      canonical: "/portamento-glide",
      type: "SoftwareApplication",
    },
    'wavetable-editor': {
      title: "Online Wavetable Synthesizer Editor - Create Custom Waveforms | LiriLab",
      description: "Design unique sounds with our **online wavetable synthesizer editor**. Draw, morph, and manipulate custom waveforms to create professional synth patches directly in your browser.",
      keywords: "online wavetable synth, web waveform editor, custom wavetable creator, browser synthesizer, sound design online, wavetable creation tool",
      image: "/images/og-wavetable.jpg",
      canonical: "/wavetable-editor",
      type: "SoftwareApplication",
    },
    'waveform-combiner': {
      title: "Online Waveform Mixer - Combine & Create Complex Sounds | LiriLab",
      description: "Combine multiple waveforms to craft rich, complex sounds with our **online waveform mixer**. Adjust phase, volume, and harmonics for advanced browser-based sound design.",
      keywords: "online waveform combiner, sound synthesis online, harmonic mixing tool, audio manipulation online, create synth sounds",
      image: "/images/og-waveform-combiner.jpg",
      canonical: "/waveform-combiner",
      type: "SoftwareApplication",
    },
    'lfo-modulation': {
      title: "Online LFO Modulation Tool - Low Frequency Oscillator | LiriLab",
      description: "Control audio parameters with our **online Low Frequency Oscillator (LFO) tool**. Experiment with various LFO waveforms and speeds for dynamic sound modulation in your browser.",
      keywords: "online LFO, web low frequency oscillator, sound modulation online, synth effects tool, audio parameters control",
      image: "/images/og-lfo.jpg",
      canonical: "/lfo-modulation",
      type: "SoftwareApplication",
    },
    'adsr-envelope-tool': {
      title: "Online ADSR Envelope Editor - Shape Sound Dynamics | LiriLab",
      description: "Visually sculpt the **Attack, Decay, Sustain, and Release (ADSR) phases of your sound online**. Essential for understanding and controlling sound dynamics for synthesizers and samples.",
      keywords: "online ADSR envelope, sound dynamics control, attack decay sustain release, synth parameters online, sound shaping tool",
      image: "/images/og-adsr.jpg",
      canonical: "/adsr-envelope-tool",
      type: "SoftwareApplication",
    },
    'humanizer-panel': {
      title: "Online Music Humanizer - Add Realistic MIDI Feel | LiriLab",
      description: "Inject **human-like variations into your musical performances online**. Adjust timing, velocity, and micro-tuning for a natural, expressive feel in your browser-based compositions.",
      keywords: "online music humanizer, MIDI humanization online, realistic music feel, performance variations tool, web music production",
      image: "/images/og-humanizer.jpg",
      canonical: "/humanizer-panel",
      type: "SoftwareApplication",
    },
    'tap-tempo-tool': {
      title: "Online Tap Tempo Calculator - Find BPM Instantly | LiriLab",
      description: "Quickly determine the **tempo (BPM) by tapping along online**. Features visual feedback and accurate BPM calculation for musicians and producers. Free and instant in your browser.",
      keywords: "online tap tempo, BPM calculator online, metronome online, rhythm tools, music tempo finder, free BPM tool",
      image: "/images/og-tap-tempo.jpg",
      canonical: "/tap-tempo-tool",
      type: "SoftwareApplication",
    },
    'chord-explorer': {
      title: "Online Chord Dictionary & Explorer - Interactive Music Chords | LiriLab",
      description: "Explore thousands of **chord variations online** with visual and audio feedback. A perfect, interactive chord reference for guitarists, pianists, and composers.",
      keywords: "online chord dictionary, interactive music chords, chord finder online, chord explorer, music theory online, harmony reference",
      image: "/images/og-chords.jpg",
      canonical: "/chord-explorer",
      type: "SoftwareApplication",
    },
    'chord-progression-builder': {
      title: "Online Chord Progression Builder - Create & Hear Progressions | LiriLab",
      description: "Build and audition various **chord sequences online**. Explore common and unique chord progressions in different keys for songwriting inspiration and music theory practice.",
      keywords: "online chord progression builder, music composition online, songwriting tool, music theory practice, harmony builder online, interactive progressions",
      image: "/images/og-chord-progression.jpg",
      canonical: "/chord-progression-builder",
      type: "SoftwareApplication",
    },
    'scale-explorer': {
      title: "Online Music Scale Explorer - Interactive Scale Library | LiriLab",
      description: "Discover and visualize a comprehensive library of **musical scales online**. See notes on virtual instruments and hear their sound for better understanding and practice.",
      keywords: "online music scales, interactive scale library, learn scales online, music theory scales, scale practice tool, visual scales",
      image: "/images/og-scales.jpg",
      canonical: "/scale-explorer",
      type: "SoftwareApplication",
    },
    'interval-training': {
      title: "Online Interval Ear Training - Improve Your Musical Ear | LiriLab",
      description: "Improve your musical ear with **online interval training exercises**. Multiple difficulty levels and comprehensive ear training to recognize pitches and intervals by ear.",
      keywords: "online interval training, ear training online, music intervals quiz, aural skills online, music education games, pitch recognition training",
      image: "/images/og-intervals.jpg",
      canonical: "/interval-training",
      type: "SoftwareApplication",
    },
    'circle-of-fifths': {
      title: "Interactive Circle of Fifths Online - Key Relationships | LiriLab",
      description: "Explore the fundamental relationships between keys and chords with our **interactive Circle of Fifths diagram online**. Essential for music theory and composition.",
      keywords: "online circle of fifths, interactive music theory, key signatures online, chord functions, music harmony tool, compositional aid",
      image: "/images/og-circle-of-fifths.jpg",
      canonical: "/circle-of-fifths",
      type: "SoftwareApplication",
    },
    'consonance-dissonance': {
      title: "Online Consonance & Dissonance Explorer - Harmonic Tension | LiriLab",
      description: "Experiment with **harmonic tension online** by comparing consonant and dissonant musical intervals. Understand their emotional impact directly in your browser.",
      keywords: "online consonance dissonance, harmonic tension, music theory intervals, harmony exploration, sound perception tool",
      image: "/images/og-consonance.jpg",
      canonical: "/consonance-dissonance",
      type: "SoftwareApplication",
    },
    'piano-roll-basics': {
      title: "Online Piano Roll Editor - Learn MIDI Sequencing | LiriLab",
      description: "Learn **MIDI sequencing fundamentals online** with our interactive piano roll editor. Understand note placement, velocity, and timing for browser-based music creation.",
      keywords: "online piano roll, MIDI editor online, music sequencing basics, web DAW, learn MIDI, browser music production",
      image: "/images/og-piano-roll.jpg",
      canonical: "/piano-roll-basics",
      type: "SoftwareApplication",
    },
    'eq-explorer': {
      title: "Online EQ Explorer - Interactive Frequency Visualizer | LiriLab",
      description: "Learn **equalization online** with our interactive EQ tool. Adjust frequency bands and hear real-time changes with visual feedback. Perfect for aspiring audio engineers.",
      keywords: "online equalizer, interactive EQ, frequency response visualizer, audio mixing online, sound engineering tools, web audio effects",
      image: "/images/og-eq.jpg",
      canonical: "/eq-explorer",
      type: "SoftwareApplication",
    },
    'compression-explorer': {
      title: "Online Audio Compressor - Dynamic Range Processing Tool | LiriLab",
      description: "Master **audio compression online** with our interactive tool. Adjust threshold, ratio, attack, and release parameters to control dynamic range for better mixes.",
      keywords: "online audio compressor, dynamic range processing, audio mixing online, sound engineering software, music production effects, web compressor",
      image: "/images/og-compression.jpg",
      canonical: "/compression-explorer",
      type: "SoftwareApplication",
    },
    'reverb-explorer': {
      title: "Online Reverb Effect - Space & Ambiance Simulator | LiriLab",
      description: "Simulate acoustic spaces with our **online reverb effect**. Adjust decay time, pre-delay, and room size to create realistic ambiance for your sounds, all in your browser.",
      keywords: "online reverb, web reverb effect, audio spatial effects, sound design online, music mixing tools, acoustic simulation",
      image: "/images/og-reverb.jpg",
      canonical: "/reverb-explorer",
      type: "SoftwareApplication",
    },
    'panner-tool': {
      title: "Online Stereo Panner - Position Sounds in Stereo Field | LiriLab",
      description: "Control the **stereo positioning of sounds online** with our interactive panner. Experiment with left-right placement and automation for dynamic mixes in your browser.",
      keywords: "online panner, stereo imaging online, audio panning tool, sound placement, web audio mixing, stereo field control",
      image: "/images/og-panner.jpg",
      canonical: "/panner-tool",
      type: "SoftwareApplication",
    },
    'mid-side-explorer': {
      title: "Online Mid/Side Processing - Stereo Width Control | LiriLab",
      description: "Explore **Mid/Side processing online** to independently control the center and side information of your audio. Enhance stereo width and clarity directly in your browser.",
      keywords: "online mid side processing, stereo width control, audio mastering online, mixing techniques, sound engineering web app",
      image: "/images/og-mid-side.jpg",
      canonical: "/mid-side-explorer",
      type: "SoftwareApplication",
    },
    'delay-explorer': {
      title: "Online Delay Effect - Echoes & Rhythmic Patterns | LiriLab",
      description: "Create various time-based effects like echoes, slapbacks, and rhythmic delays with our **online delay effect**. Explore different delay types and parameters in your browser.",
      keywords: "online delay effect, web audio delay, echo effect, rhythmic effects online, music production tools, sound design delay",
      image: "/images/og-delay.jpg",
      canonical: "/delay-explorer",
      type: "SoftwareApplication",
    },
    'pitch-shift-explorer': {
      title: "Online Pitch Shifter - Real-time Pitch Manipulation | LiriLab",
      description: "Experiment with **real-time pitch manipulation online**, including formant-preserving shifts and creating harmonies. Explore the creative possibilities of pitch directly in your browser.",
      keywords: "online pitch shifter, web pitch manipulation, formant shifting, audio effects online, harmony generation, sound design pitch",
      image: "/images/og-pitch-shift.jpg",
      canonical: "/pitch-shift-explorer",
      type: "SoftwareApplication",
    },
    'stereo-imager-explorer': {
      title: "Online Stereo Imager - Adjust Stereo Field Width | LiriLab",
      description: "Control and enhance the **stereo width of your audio online** with our interactive stereo imager. Expand or narrow the soundstage for impactful mixes, right in your browser.",
      keywords: "online stereo imager, stereo width controller, spatial audio online, audio mixing tool, soundstage adjustment",
      image: "/images/og-stereo-imager.jpg",
      canonical: "/stereo-imager-explorer",
      type: "SoftwareApplication",
    },
    'limiter-explorer': {
      title: "Online Audio Limiter - Prevent Clipping & Maximize Loudness | LiriLab",
      description: "Understand and apply **limiting online** to prevent audio clipping and maximize the overall loudness of your tracks without distortion. Essential for mixing and mastering.",
      keywords: "online audio limiter, web mastering tool, loudness maximization, peak control, audio engineering online, music production limiter",
      image: "/images/og-limiter.jpg",
      canonical: "/limiter-explorer",
      type: "SoftwareApplication",
    },
    'saturation-explorer': {
      title: "Online Audio Saturation - Add Warmth & Harmonics | LiriLab",
      description: "Explore various **saturation algorithms online** to add warmth, harmonic richness, and subtle distortion to your sounds for character and depth. Perfect for sound design.",
      keywords: "online audio saturation, harmonic distortion, analog warmth, sound design effects, web audio enhancer",
      image: "/images/og-saturation.jpg",
      canonical: "/saturation-explorer",
      type: "SoftwareApplication",
    },
    'chorus-explorer': {
      title: "Online Chorus Effect - Create Lush, Animated Textures | LiriLab",
      description: "Generate thick, lush, and animated textures with our **online chorus effect**. Adjust rate and depth to create shimmering or swirling sounds directly in your browser.",
      keywords: "online chorus effect, web modulation effects, lush sounds, animated audio textures, sound design online, vocal thickening",
      image: "/images/og-chorus.jpg",
      canonical: "/chorus-explorer",
      type: "SoftwareApplication",
    },
    'tremolo-explorer': {
      title: "Online Tremolo Effect - Rhythmic Volume Pulsations | LiriLab",
      description: "Create **rhythmic volume pulsations online** with our tremolo effect. Experiment with different waveforms and speeds for expressive sonic movement in your browser.",
      keywords: "online tremolo effect, web amplitude modulation, rhythmic volume, audio effects online, sound design tremolo",
      image: "/images/og-tremolo.jpg",
      canonical: "/tremolo-explorer",
      type: "SoftwareApplication",
    },
    'granular-explorer': {
      title: "Online Granular Synthesis Explorer - Microscopic Sound Design | LiriLab",
      description: "Dive into **granular synthesis online** and manipulate sound at a microscopic level. Create unique textures, drones, and evolving soundscapes directly in your browser.",
      keywords: "online granular synthesis, web sound design, experimental audio, texture creation online, soundscapes tool",
      image: "/images/og-granular.jpg",
      canonical: "/granular-explorer",
      type: "SoftwareApplication",
    },
    'time-signature-metronome': {
      title: "Online Time Signature Metronome - Practice Complex Rhythms | LiriLab",
      description: "Practice with a flexible **online metronome** supporting various time signatures. Visualize and internalize different rhythmic subdivisions for improved timing.",
      keywords: "online metronome, time signature practice, complex rhythms, rhythm training online, music theory timing",
      image: "/images/og-time-signature.jpg",
      canonical: "/time-signature-metronome",
      type: "SoftwareApplication",
    },
    'polyrhythm-sequencer': {
      title: "Online Polyrhythm Sequencer - Create Complex Rhythmic Layers | LiriLab",
      description: "Build and visualize **complex rhythmic layers online** with our polyrhythm sequencer. Experience multiple concurrent patterns for advanced rhythm exploration in your browser.",
      keywords: "online polyrhythm sequencer, complex rhythms, music theory rhythm, rhythmic patterns online, advanced rhythm tool",
      image: "/images/og-polyrhythm.jpg",
      canonical: "/polyrhythm-sequencer",
      type: "SoftwareApplication",
    },
    'euclidean-rhythm-generator': {
      title: "Online Euclidean Rhythm Generator - Algorithmic Beat Creation | LiriLab",
      description: "Generate balanced and engaging rhythms based on **Euclidean algorithms online**. Discover unique and mathematically precise beat patterns for your music projects.",
      keywords: "online euclidean rhythm, algorithmic beat generator, rhythm creation online, mathematical music patterns, unique beats",
      image: "/images/og-euclidean.jpg",
      canonical: "/euclidean-rhythm-generator",
      type: "SoftwareApplication",
    },
    'beat-repeat-looper': {
      title: "Online Beat Repeat Looper - Creative Rhythmic Manipulation | LiriLab",
      description: "Capture and creatively manipulate **rhythmic fragments in real-time online** with our beat repeat looper. Perfect for glitch effects, fills, and live performance in your browser.",
      keywords: "online beat repeat, web audio looper, rhythmic effects, glitch effect online, live performance tool, creative looping",
      image: "/images/og-beat-repeat.jpg",
      canonical: "/beat-repeat-looper",
      type: "SoftwareApplication",
    },
    'swing-groove-visualizer': {
      title: "Online Swing Groove Visualizer - Understand Rhythmic Feel | LiriLab",
      description: "Visualize and adjust **swing percentages online** to understand how rhythmic timing variations create different grooves and feels. Improve your musicality and rhythm.",
      keywords: "online swing groove, rhythmic timing, music feel, rhythm theory online, music quantize tool, interactive swing",
      image: "/images/og-swing.jpg",
      canonical: "/swing-groove-visualizer",
      type: "SoftwareApplication",
    },
    'chord-training-quiz': {
      title: "Online Chord Recognition Quiz - Test Your Music Theory | LiriLab",
      description: "Challenge yourself with **online chord recognition quizzes**. Progressive difficulty levels to improve your harmonic ear training skills directly in your browser.",
      keywords: "online chord quiz, chord recognition game, music theory quiz online, ear training game, harmony training online, music learning game",
      image: "/images/og-chord-quiz.jpg",
      canonical: "/chord-training-quiz",
      type: "SoftwareApplication",
    },
    'drum-sequencer-game': {
      title: "Online Drum Sequencer Game - Rhythm Challenge | LiriLab",
      description: "Test and improve your **rhythmic accuracy online** by recreating drum patterns in this fun and challenging drum sequencer game. Play and learn beats in your browser.",
      keywords: "online drum game, rhythm challenge game, web drum sequencer, timing game online, music learning game, beat challenge",
      image: "/images/og-drum-game.jpg",
      canonical: "/drum-sequencer-game",
      type: "SoftwareApplication",
    },
    'ear-training-quiz': {
      title: "Online Ear Training Quiz - Comprehensive Aural Skills Trainer | LiriLab",
      description: "Comprehensive **online ear training exercises** to identify intervals, chords, and progressions by ear. Essential for musicians of all levels, right in your browser.",
      keywords: "online ear training quiz, aural skills trainer, music ear training online, intervals quiz, chords quiz, music learning games",
      image: "/images/og-ear-training.jpg",
      canonical: "/ear-training-quiz",
      type: "SoftwareApplication",
    },
    'synthesis-challenge': {
      title: "Online Synthesis Challenge - Sound Design Puzzles | LiriLab",
      description: "Engage in **online sound design puzzles** where you recreate target sounds using provided synthesizer parameters. A fun and interactive way to learn synthesis in your browser.",
      keywords: "online synthesis challenge, sound design game, synth puzzles online, learn synthesis, audio engineering game, interactive sound design",
      image: "/images/og-synth-challenge.jpg",
      canonical: "/synthesis-challenge",
      type: "SoftwareApplication",
    }
  }
};

/**
 * Fetches SEO data for a given page ID.
 * Falls back to global settings and general defaults if specific data is missing.
 * @param {string} pageId - The ID of the page (e.g., 'home', 'virtual-piano').
 * @returns {object} The consolidated SEO data for the page.
 */
export const getSEOData = (pageId) => {
  const pageData = SEO_CONFIG.pages[pageId] || {};
  const globalData = SEO_CONFIG.global;

  // Construct fullTitle, ogTitle, ogDescription
  // fullTitle for the <title> tag, often more detailed.
  // ogTitle for Open Graph, can be slightly shorter/snappier for social media.
  const fullTitle = pageData.title || globalData.siteName; // Use page title if available, else siteName
  const ogTitle = pageData.ogTitle || pageData.title || globalData.siteName; // Prioritize ogTitle, then title, then siteName
  const ogDescription = pageData.ogDescription || pageData.description || "Explore free and interactive online music tools for learning, creating, and experimenting with sound."; // Fallback description

  // Construct absolute canonical URL and Open Graph URL
  const canonicalUrl = `${globalData.domain}${pageData.canonical || '/'}`;
  const ogUrl = canonicalUrl; // Typically, canonical and og:url should be the same.

  // Construct absolute Open Graph image URL
  const ogImage = pageData.image
    ? `${globalData.domain}${pageData.image}`
    : globalData.ogImage; // Prioritize page-specific image, else global default

  return {
    ...globalData, // Start with global defaults
    ...pageData, // Override with page-specific data (title, description, keywords, image, canonical, type)
    fullTitle, // Use the constructed fullTitle
    ogTitle, // Use the constructed ogTitle
    ogDescription, // Use the constructed ogDescription
    ogUrl, // Use the constructed absolute ogUrl
    ogImage, // Use the constructed absolute ogImage
    canonical: canonicalUrl, // Ensure canonical is always an absolute URL
  };
};

/**
 * Generates Schema.org JSON-LD structured data for a MusicTool SoftwareApplication.
 * This function should be tailored to the specific properties of your 'tool' object.
 * @param {object} tool - The tool object from your ALL_TOOLS or similar.
 * @param {object} seoData - The consolidated SEO data for the page (which now contains absolute URLs).
 * @returns {object|null} The structured data object or null if tool/data is insufficient.
 */
export const generateMusicToolStructuredData = (tool, seoData) => {
  if (!tool || !seoData || seoData.type !== "SoftwareApplication") {
    // Only generate SoftwareApplication schema for actual tool pages with type defined
    return null;
  }

  // Define a mapping from your tool categories to Schema.org SoftwareApplication categories
  const categoryMap = {
    'Instruments': 'MusicApplication',
    'Synth': 'MusicApplication',
    'Theory': 'EducationalSoftware',
    'Effects': 'MusicApplication',
    'Rhythm': 'MusicApplication',
    'Games': 'GameApplication',
    // Add more mappings as needed. Use general "SoftwareApplication" if no specific match.
  };

  const applicationCategory = tool.categories && tool.categories.length > 0
    ? categoryMap[tool.categories[0]] || 'SoftwareApplication'
    : 'SoftwareApplication';

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": tool.name,
    "description": tool.description,
    "url": seoData.ogUrl, // Use the absolute URL from seoData
    "applicationCategory": applicationCategory,
    "operatingSystem": "Web Browser", // Accurate for browser-based tools
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock", // Assuming always available
      "url": seoData.ogUrl // Offer URL should link to the tool page
    },
    // Adding optional aggregateRating if you plan to implement user ratings
    "aggregateRating": tool.rating ? {
      "@type": "AggregateRating",
      "ratingValue": tool.rating.value,
      "reviewCount": tool.rating.count
    } : undefined, // Only include if rating data exists
    "image": seoData.ogImage, // Use the absolute OG image URL from seoData
    "author": {
      "@type": "Person",
      "name": seoData.author // From global SEO data
    },
    "publisher": {
      "@type": "Organization",
      "name": seoData.siteName,
      "url": seoData.domain,
      "logo": {
        "@type": "ImageObject",
        "url": `${seoData.domain}/images/logo.png` // **IMPORTANT: Ensure this path exists for your site logo**
      }
    },
    "keywords": seoData.keywords.split(', ').map(k => k.trim()), // Keywords as an array
    "featureList": tool.features ? tool.features.map(f => f.name) : undefined, // Example if tools have a 'features' array
    "screenshot": seoData.ogImage // Can be an array if multiple screenshots, but ogImage is a good default
  };
};