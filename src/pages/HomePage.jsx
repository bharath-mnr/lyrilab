// src/components/HomePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Search, Music, Disc, Guitar, Drum, Headphones, Volume2, X, Gamepad2, BookOpen } from 'lucide-react';
import Autosuggest from 'react-autosuggest';
import ALL_TOOLS, { getCategorizedTools } from '../config/tools.js'; // Ensure path is correct
import Footer from '../layout/Footer.jsx'; // Import the Footer component here

// --- Autosuggest Helper Functions ---
// Teach Autosuggest how to calculate suggestions for any given input value.
const getSuggestions = (value, allTools) => {
  const inputValue = value.trim().toLowerCase();
  const inputLength = inputValue.length;

  if (inputLength === 0) {
    return [];
  }

  // Filter based on name or description (still using description for search logic)
  return allTools.filter(tool =>
    tool.name.toLowerCase().includes(inputValue) ||
    tool.description.toLowerCase().includes(inputValue)
  ).slice(0, 5); // Limit to 5 suggestions to keep the list concise
};

// When a suggestion is clicked, Autosuggest needs to know what to render into the input field.
const getSuggestionValue = (suggestion) => suggestion.name;

// Use your imagination to render suggestions. This now only displays the name.
const renderSuggestion = (suggestion) => (
  <div className="flex items-center p-3 hover:bg-purple-100/10 transition-colors duration-200 cursor-pointer">
    <Music size={16} className="text-purple-300 mr-2" />
    <span className="text-white">{suggestion.name}</span> {/* Only display the tool name */}
  </div>
);
// --- End Autosuggest Helper Functions ---

const HomePage = ({ tools, allTools, categorizedTools }) => { // Added allTools and categorizedTools props
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]); // State for autosuggest suggestions
  const [activeCategory, setActiveCategory] = useState('All');
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const carouselRef = useRef(null); // Ref for the carousel container
  const canvasRef = useRef(null);
  const navigate = useNavigate(); // Hook for navigation

  // Get categorized tools (if not passed as prop, calculate here)
  const availableCategorizedTools = categorizedTools || getCategorizedTools(allTools || ALL_TOOLS);
  const categories = ['All', ...Object.keys(availableCategorizedTools)];

  // Filter tools based on search and category
  const filteredAndCategorizedTools = tools.filter(tool => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const toolNameLowerCase = tool.name ? tool.name.toLowerCase() : '';
    const toolDescriptionLowerCase = tool.description ? tool.description.toLowerCase() : '';

    const matchesSearch =
      toolNameLowerCase.includes(lowerCaseSearchTerm) ||
      toolDescriptionLowerCase.includes(lowerCaseSearchTerm);

    const matchesCategory =
      activeCategory === 'All' || (tool.categories && tool.categories.includes(activeCategory));

    return matchesSearch && matchesCategory;
  });

  // Canvas visualization effect (simplified - no floating symbols)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrame;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const draw = () => {
      animationFrame = requestAnimationFrame(draw);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(40, 10, 80, 0.2)');
      gradient.addColorStop(0.5, 'rgba(20, 30, 100, 0.2)');
      gradient.addColorStop(1, 'rgba(60, 10, 90, 0.2)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(180, 120, 255, 0.15)';
      ctx.beginPath();
      for (let i = 0; i < canvas.width; i += 80) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i - 10, canvas.height);
      }
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i < canvas.height; i += 80) {
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i - 10);
      }
      ctx.stroke();
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Random tools carousel logic
  const [randomTools, setRandomTools] = useState([]);
  
  // Generate random tools for carousel
  useEffect(() => {
    const shuffleArray = (array) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    
    const getRandomTools = () => {
      const shuffledTools = shuffleArray(tools);
      return shuffledTools.slice(0, 6); // Get 6 random tools
    };
    
    setRandomTools(getRandomTools());
    
    // Refresh random tools every 30 seconds
    const interval = setInterval(() => {
      setRandomTools(getRandomTools());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [tools]);

  const displayTools = randomTools.length > 0 ? randomTools : tools.slice(0, 3);
  
  // Calculate items per slide based on screen width for responsive carousel
  const [itemsPerSlide, setItemsPerSlide] = useState(1);

  useEffect(() => {
    const calculateItemsPerSlide = () => {
      if (window.innerWidth >= 1024) { // lg
        setItemsPerSlide(3);
      } else if (window.innerWidth >= 640) { // sm
        setItemsPerSlide(2);
      } else { // mobile
        setItemsPerSlide(1);
      }
    };

    calculateItemsPerSlide();
    window.addEventListener('resize', calculateItemsPerSlide);
    return () => window.removeEventListener('resize', calculateItemsPerSlide);
  }, []);

  // Fixed carousel auto-slide logic
  useEffect(() => {
    if (displayTools.length > itemsPerSlide) {
      const maxIndex = displayTools.length - itemsPerSlide;
      const interval = setInterval(() => {
        setCurrentFeaturedIndex((prevIndex) => {
          if (prevIndex >= maxIndex) {
            return 0; // Reset to beginning
          }
          return prevIndex + 1;
        });
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [displayTools.length, itemsPerSlide]);

  // Function to get category-specific icons
  const getCategoryIcon = (category) => {
    switch(category) {
      case 'Instruments': return <Guitar size={16} className="mr-1 sm:mr-2" />;
      case 'Synth': return <Disc size={16} className="mr-1 sm:mr-2" />;
      case 'Theory': return <BookOpen size={16} className="mr-1 sm:mr-2" />;
      case 'Effects': return <Volume2 size={16} className="mr-1 sm:mr-2" />;
      case 'Rhythm': return <Drum size={16} className="mr-1 sm:mr-2" />;
      case 'Games': return <Gamepad2 size={16} className="mr-1 sm:mr-2" />;
      case 'All': return <Music size={16} className="mr-1 sm:mr-2" />;
      default: return <Music size={16} className="mr-1 sm:mr-2" />;
    }
  };

  // Function to get tool-specific icon based on categories
  const getToolIcon = (tool) => {
    if (!tool.categories || tool.categories.length === 0) {
      return <Music size={20} className="text-purple-300 group-hover:text-white transition-colors duration-300" />;
    }
    
    const category = tool.categories[0]; // Use first category
    
    switch(category) {
      case 'Instruments':
        return <Guitar size={20} className="text-purple-300 group-hover:text-white transition-colors duration-300" />;
      case 'Synth':
        return <Disc size={20} className="text-purple-300 group-hover:text-white transition-colors duration-300" />;
      case 'Theory':
        return <BookOpen size={20} className="text-purple-300 group-hover:text-white transition-colors duration-300" />;
      case 'Effects':
        return <Volume2 size={20} className="text-purple-300 group-hover:text-white transition-colors duration-300" />;
      case 'Rhythm':
        return <Drum size={20} className="text-purple-300 group-hover:text-white transition-colors duration-300" />;
      case 'Games':
        return <Gamepad2 size={20} className="text-purple-300 group-hover:text-white transition-colors duration-300" />;
      default:
        return <Music size={20} className="text-purple-300 group-hover:text-white transition-colors duration-300" />;
    }
  };

  const totalCarouselSlides = Math.ceil(displayTools.length / itemsPerSlide);

  // --- Autosuggest Event Handlers ---
  const onChange = (event, { newValue, method }) => {
    setSearchTerm(newValue);
    if (method === 'click' || method === 'enter') {
        // If a suggestion is clicked or entered, navigate to its path
        const selectedTool = tools.find(tool => tool.name === newValue);
        if (selectedTool) {
            navigate(selectedTool.path);
        }
    }
  };

  // Autosuggest will call this function every time you need to update suggestions.
  const onSuggestionsFetchRequested = ({ value }) => {
    setSuggestions(getSuggestions(value, tools)); // Pass `tools` to getSuggestions
  };

  // Autosuggest will call this function every time you need to clear suggestions.
  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  // Autosuggest input properties
  const inputProps = {
    placeholder: 'Find tools, instruments, effects...',
    value: searchTerm,
    onChange: onChange,
    className: `w-full p-3 sm:p-4 pl-10 sm:pl-12 pr-6 rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-lg text-white placeholder-white/70
                  focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-lg border border-white/20 text-sm sm:text-base`
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col p-3 sm:p-4 md:p-8">
      {/* Canvas for background visualization */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/50 via-blue-900/40 to-indigo-900/60 z-0" />

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-grow">
        {/* Header Section - More compact on mobile */}
        <header className="text-center mb-6 sm:mb-8 md:mb-12 mt-4 sm:mt-6 md:mt-10">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-white mb-2 sm:mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
              LyriLab
            </span>
          </h1>
          <div className="max-w-2xl mx-auto">
            <p className="text-white/90 text-sm sm:text-base md:text-lg mb-3 sm:mb-4">
              Learn music production the easy way with 
              <span className="text-purple-300 font-semibold"> visual tools</span> and 
              <span className="text-pink-300 font-semibold"> interactive tutorials</span>
            </p>
            <p className="text-white/80 text-xs sm:text-sm">
              Master music theory, instruments, and production techniques through hands-on learning
            </p>
          </div>
        </header>

        {/* Search Bar - More compact on mobile */}
        <div className="relative mb-6 sm:mb-8 md:mb-10 mx-auto w-full max-w-xl">
          <div className="relative">
            <Autosuggest
              suggestions={suggestions}
              onSuggestionsFetchRequested={onSuggestionsFetchRequested}
              onSuggestionsClearRequested={onSuggestionsClearRequested}
              getSuggestionValue={getSuggestionValue}
              renderSuggestion={renderSuggestion}
              inputProps={inputProps}
              // Tailwind CSS for the container and suggestions list
              theme={{
                container: 'relative',
                input: 'w-full p-3 sm:p-4 pl-10 sm:pl-12 pr-6 rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-lg text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-lg border border-white/20 text-sm sm:text-base',
                suggestionsContainer: 'absolute mt-1 w-full bg-purple-900/30 backdrop-blur-md border border-purple-700/20 rounded-lg shadow-lg max-h-60 overflow-y-auto z-20',
                suggestionsList: 'list-none p-0 m-0',
                suggestion: 'p-3 hover:bg-purple-100/10 transition-colors duration-200 cursor-pointer',
                suggestionHighlighted: 'bg-purple-700/20'
              }}
            />
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-white/80 z-20" size={20} />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white z-20"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter - More compact on mobile */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 md:mb-12 max-w-full overflow-x-auto pb-2 scrollbar-hide px-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`flex items-center px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300
                            shadow-lg backdrop-blur-sm border ${
                              activeCategory === category
                                ? 'bg-gradient-to-r from-pink-600/80 to-purple-600/80 text-white border-transparent'
                                : 'bg-white/25 text-white/95 border-white/30 hover:bg-white/35 hover:text-white'
                            }`}
              aria-pressed={activeCategory === category}
              aria-label={`Filter by ${category}`}
            >
              {getCategoryIcon(category)}
              <span className="hidden xs:inline sm:inline">
                {category === 'Synth' ? 'Synth & Sound' :
                 category === 'Theory' ? 'Theory' :
                 category === 'Effects' ? 'Effects' :
                 category === 'Rhythm' ? 'Rhythm' :
                 category === 'Games' ? 'Games' : category}
              </span>
              <span className="xs:hidden sm:hidden">
                {category === 'Synth' ? 'Synth' :
                 category === 'Instruments' ? 'Inst' :
                 category === 'Effects' ? 'FX' : category}
              </span>
            </button>
          ))}
        </div>

        {/* Random Tools Carousel Section */}
        {displayTools.length > 0 && activeCategory === 'All' && (
          <div className="mb-8 sm:mb-10 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-white pl-2 border-l-4 border-purple-500">
                Discover Random Tools
              </h2>
              <button
                onClick={() => {
                  const shuffledTools = [...tools].sort(() => Math.random() - 0.5);
                  setRandomTools(shuffledTools.slice(0, 6));
                  setCurrentFeaturedIndex(0);
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600/60 hover:bg-purple-600/80 
                           rounded-full text-white text-xs sm:text-sm font-medium transition-all duration-300
                           border border-purple-400/50 hover:border-purple-300"
              >
                🎲 Shuffle
              </button>
            </div>
            <div className="relative w-full overflow-hidden" ref={carouselRef}>
              <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentFeaturedIndex * (100 / itemsPerSlide)}%)` }}
              >
                {displayTools.map((tool, index) => (
                  <div
                    key={`${tool.id}-${index}-${Date.now()}`}
                    className="flex-shrink-0 p-1 sm:p-2"
                    style={{ width: `${100 / itemsPerSlide}%` }}
                  >
                    <Link
                      to={tool.path}
                      className="block relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-900/70 to-pink-800/50
                                  backdrop-blur-lg border border-white/20 hover:border-purple-400/80
                                  shadow-xl hover:shadow-2xl transition-all duration-300 group h-full
                                  hover:scale-105 hover:-translate-y-1"
                    >
                      {/* Background overlay that appears on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-500/20 
                                   opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl sm:rounded-2xl" />
                      
                      {/* Random indicator */}
                      <div className="absolute top-2 right-2 z-20">
                        <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full 
                                        flex items-center justify-center shadow-lg">
                          <span className="text-white text-xs font-bold">🎯</span>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="relative z-10 p-4 sm:p-6 h-full flex flex-col">
                        <div className="flex items-center mb-3 sm:mb-4">
                          <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-purple-600/60 flex items-center justify-center mr-3 sm:mr-4 
                                         group-hover:bg-purple-500/80 transition-colors duration-300">
                            {getToolIcon(tool)}
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-purple-100 transition-colors duration-300">
                            {tool.name}
                          </h3>
                        </div>
                        <p className="text-white/90 mb-3 sm:mb-4 text-xs sm:text-sm flex-grow group-hover:text-white transition-colors duration-300">
                          {tool.description}
                        </p>
                        <div className="flex justify-between items-center mt-auto">
                          <span className="text-xs px-2 py-1 bg-purple-900/70 rounded text-purple-300 
                                           group-hover:bg-purple-800/80 group-hover:text-purple-200 transition-all duration-300">
                            {tool.categories && tool.categories[0]}
                          </span>
                          <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-full bg-white/30 flex items-center justify-center 
                                         group-hover:bg-purple-500 group-hover:scale-110 transition-all duration-300">
                            <Play size={14} className="text-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
            {totalCarouselSlides > 1 && (
              <div className="flex justify-center space-x-2 mt-3 sm:mt-4">
                {Array.from({ length: totalCarouselSlides }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentFeaturedIndex(idx)}
                    className={`w-2 sm:w-3 h-2 sm:h-3 rounded-full transition-colors duration-300 ${
                      currentFeaturedIndex === idx ? 'bg-purple-500' : 'bg-white/40 hover:bg-white/70'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
            
            {/* Learning tip */}
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-900/40 to-purple-900/40 
                            backdrop-blur-sm rounded-xl border border-blue-400/30">
              <div className="flex items-center text-white/90 text-xs sm:text-sm">
                <div className="w-6 h-6 bg-blue-500/60 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                  <span className="text-white text-xs">💡</span>
                </div>
                <span>
                  <strong>Pro Tip:</strong> Try different tools randomly to discover new creative possibilities and expand your music production skills!
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tools Grid - 2 per row on mobile */}
        <div className="mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 pl-2 border-l-4 border-purple-500">
            {activeCategory === 'All' ? 'All Tools' : activeCategory}
          </h2>

          {filteredAndCategorizedTools.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {filteredAndCategorizedTools.map((tool, index) => (
                <Link
                  key={tool.id}
                  to={tool.path}
                  className="block relative overflow-hidden rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-lg
                                  border border-white/20 hover:border-purple-400/80
                                  shadow-lg hover:shadow-2xl transform hover:-translate-y-1
                                  transition-all duration-300 group"
                  style={{
                    animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`
                  }}
                >
                  {/* Background overlay that appears on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-pink-500/20 
                                   opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl sm:rounded-2xl" />
                  
                  {/* Content */}
                  <div className="relative z-10 p-3 sm:p-5 h-full flex flex-col">
                    <div className="flex items-start mb-2 sm:mb-4">
                      <div className="bg-gradient-to-br from-purple-600/80 to-pink-500/80 w-8 sm:w-10 h-8 sm:h-10 rounded-lg 
                                       flex items-center justify-center flex-shrink-0 mr-2 sm:mr-3 
                                       group-hover:from-purple-500 group-hover:to-pink-400 transition-all duration-300">
                        {getToolIcon(tool)}
                      </div>
                      <h3 className="text-sm sm:text-lg font-bold text-white group-hover:text-purple-100 transition-colors duration-300 leading-tight">
                        {tool.name}
                      </h3>
                    </div>
                    <p className="text-white/90 text-xs sm:text-sm mb-2 sm:mb-4 flex-grow group-hover:text-white transition-colors duration-300 line-clamp-2">
                      {tool.description}
                    </p>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-4">
                      {tool.categories && tool.categories.slice(0, 2).map(cat => (
                        <span
                          key={cat}
                          className="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-900/70 rounded text-purple-300
                                     group-hover:bg-purple-800/80 group-hover:text-purple-200 transition-all duration-300"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2 sm:pt-3 border-t border-white/20 group-hover:border-white/30 transition-colors duration-300">
                      <span className="text-xs text-white/80 group-hover:text-white transition-colors duration-300 hidden sm:block">
                        Click to explore
                      </span>
                      <span className="text-xs text-white/80 group-hover:text-white transition-colors duration-300 sm:hidden">
                        Tap to open
                      </span>
                      <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-white/30 flex items-center justify-center 
                                       group-hover:bg-purple-500 group-hover:scale-110 transition-all duration-300">
                        <Play size={12} className="text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="col-span-full text-center py-12 sm:py-16 rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-lg border border-white/20">
              <div className="text-white mb-4 text-sm sm:text-base">No tools found matching your criteria</div>
              <button
                onClick={() => { setSearchTerm(''); setActiveCategory('All'); }}
                className="px-4 sm:px-6 py-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:opacity-90 transition-opacity text-sm sm:text-base"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Footer is now rendered only on the HomePage */}
      <Footer allTools={allTools} categorizedTools={categorizedTools} />
    </div>
  );
};

export default HomePage;