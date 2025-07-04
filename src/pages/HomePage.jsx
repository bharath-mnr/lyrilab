// src/components/HomePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Search, Music, Disc, Guitar, Drum, Headphones, Volume2, X, Gamepad2, BookOpen } from 'lucide-react';
import Autosuggest from 'react-autosuggest';
import ALL_TOOLS, { getCategorizedTools } from '../config/tools.js';
import Footer from '../layout/Footer.jsx';

// --- Autosuggest Helper Functions ---
const getSuggestions = (value, allTools) => {
  const inputValue = value.trim().toLowerCase();
  const inputLength = inputValue.length;

  if (inputLength === 0) {
    return [];
  }

  return allTools.filter(tool =>
    tool.name.toLowerCase().includes(inputValue) ||
    tool.description.toLowerCase().includes(inputValue)
  ).slice(0, 5);
};

const getSuggestionValue = (suggestion) => suggestion.name;

const renderSuggestion = (suggestion) => (
  <div className="flex items-center p-3 hover:bg-slate-700/50 transition-colors duration-200 cursor-pointer">
    <Music size={16} className="text-emerald-400 mr-2" />
    <span className="text-slate-100">{suggestion.name}</span>
  </div>
);

const HomePage = ({ tools, allTools, categorizedTools }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const carouselRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

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

  // Enhanced canvas visualization with better colors
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrame;
    let time = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const draw = () => {
      time += 0.01;
      animationFrame = requestAnimationFrame(draw);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Beautiful gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0.95)'); // slate-900
      gradient.addColorStop(0.3, 'rgba(30, 41, 59, 0.9)'); // slate-800
      gradient.addColorStop(0.7, 'rgba(51, 65, 85, 0.85)'); // slate-700
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0.95)'); // slate-900
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Dynamic grid with emerald accents
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(16, 185, 129, ${0.1 + Math.sin(time) * 0.05})`; // emerald-500
      ctx.beginPath();
      for (let i = 0; i < canvas.width; i += 120) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i - 20, canvas.height);
      }
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i < canvas.height; i += 120) {
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i - 20);
      }
      ctx.stroke();

      // Floating particles
      for (let i = 0; i < 8; i++) {
        const x = (canvas.width / 8) * i + Math.sin(time + i) * 50;
        const y = canvas.height * 0.3 + Math.cos(time + i * 0.7) * 100;
        const size = 2 + Math.sin(time * 2 + i) * 1;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(16, 185, 129, ${0.3 + Math.sin(time + i) * 0.2})`; // emerald-500
        ctx.fill();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Random tools carousel logic
  const [randomTools, setRandomTools] = useState([]);
  
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
      return shuffledTools.slice(0, 6);
    };
    
    setRandomTools(getRandomTools());
    
    const interval = setInterval(() => {
      setRandomTools(getRandomTools());
    }, 30000);
    
    return () => clearInterval(interval);
  }, [tools]);

  const displayTools = randomTools.length > 0 ? randomTools : tools.slice(0, 3);
  
  const [itemsPerSlide, setItemsPerSlide] = useState(1);

  useEffect(() => {
    const calculateItemsPerSlide = () => {
      if (window.innerWidth >= 1024) {
        setItemsPerSlide(3);
      } else if (window.innerWidth >= 640) {
        setItemsPerSlide(2);
      } else {
        setItemsPerSlide(1);
      }
    };

    calculateItemsPerSlide();
    window.addEventListener('resize', calculateItemsPerSlide);
    return () => window.removeEventListener('resize', calculateItemsPerSlide);
  }, []);

  useEffect(() => {
    if (displayTools.length > itemsPerSlide) {
      const maxIndex = displayTools.length - itemsPerSlide;
      const interval = setInterval(() => {
        setCurrentFeaturedIndex((prevIndex) => {
          if (prevIndex >= maxIndex) {
            return 0;
          }
          return prevIndex + 1;
        });
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [displayTools.length, itemsPerSlide]);

  // Enhanced category icons with better colors
  const getCategoryIcon = (category) => {
    const iconClass = "mr-1 sm:mr-2";
    switch(category) {
      case 'Instruments': return <Guitar size={16} className={iconClass} />;
      case 'Synth': return <Disc size={16} className={iconClass} />;
      case 'Theory': return <BookOpen size={16} className={iconClass} />;
      case 'Effects': return <Volume2 size={16} className={iconClass} />;
      case 'Rhythm': return <Drum size={16} className={iconClass} />;
      case 'Games': return <Gamepad2 size={16} className={iconClass} />;
      case 'All': return <Music size={16} className={iconClass} />;
      default: return <Music size={16} className={iconClass} />;
    }
  };

  const getToolIcon = (tool) => {
    if (!tool.categories || tool.categories.length === 0) {
      return <Music size={20} className="text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300" />;
    }
    
    const category = tool.categories[0];
    const iconClass = "text-emerald-400 group-hover:text-emerald-300 transition-colors duration-300";
    
    switch(category) {
      case 'Instruments': return <Guitar size={20} className={iconClass} />;
      case 'Synth': return <Disc size={20} className={iconClass} />;
      case 'Theory': return <BookOpen size={20} className={iconClass} />;
      case 'Effects': return <Volume2 size={20} className={iconClass} />;
      case 'Rhythm': return <Drum size={20} className={iconClass} />;
      case 'Games': return <Gamepad2 size={20} className={iconClass} />;
      default: return <Music size={20} className={iconClass} />;
    }
  };

  const totalCarouselSlides = Math.ceil(displayTools.length / itemsPerSlide);

  // Autosuggest Event Handlers
  const onChange = (event, { newValue, method }) => {
    setSearchTerm(newValue);
    if (method === 'click' || method === 'enter') {
      const selectedTool = tools.find(tool => tool.name === newValue);
      if (selectedTool) {
        navigate(selectedTool.path);
      }
    }
  };

  const onSuggestionsFetchRequested = ({ value }) => {
    setSuggestions(getSuggestions(value, tools));
  };

  const onSuggestionsClearRequested = () => {
    setSuggestions([]);
  };

  const inputProps = {
    placeholder: 'Find tools, instruments, effects...',
    value: searchTerm,
    onChange: onChange,
    className: `w-full p-3 sm:p-4 pl-10 sm:pl-12 pr-6 rounded-xl sm:rounded-2xl 
                bg-slate-800/60 backdrop-blur-lg text-slate-100 placeholder-slate-400
                focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-slate-800/80
                shadow-xl border border-slate-700/50 text-sm sm:text-base transition-all duration-300`
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col p-3 sm:p-4 md:p-8 bg-slate-900">
      {/* Canvas for background visualization */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-grow">
        {/* Header Section */}
        <header className="text-center mb-6 sm:mb-8 md:mb-12 mt-4 sm:mt-6 md:mt-10">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold text-slate-100 mb-2 sm:mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400">
              LyriLab
            </span>
          </h1>
          <div className="max-w-2xl mx-auto">
            <p className="text-slate-300 text-sm sm:text-base md:text-lg mb-3 sm:mb-4">
              Learn music production the easy way with 
              <span className="text-emerald-400 font-semibold"> visual tools</span> and 
              <span className="text-cyan-400 font-semibold"> interactive tutorials</span>
            </p>
            <p className="text-slate-400 text-xs sm:text-sm">
              Master music theory, instruments, and production techniques through hands-on learning
            </p>
          </div>
        </header>

        {/* Search Bar */}
        <div className="relative mb-6 sm:mb-8 md:mb-10 mx-auto w-full max-w-xl">
          <div className="relative">
            <Autosuggest
              suggestions={suggestions}
              onSuggestionsFetchRequested={onSuggestionsFetchRequested}
              onSuggestionsClearRequested={onSuggestionsClearRequested}
              getSuggestionValue={getSuggestionValue}
              renderSuggestion={renderSuggestion}
              inputProps={inputProps}
              theme={{
                container: 'relative',
                input: 'w-full p-3 sm:p-4 pl-10 sm:pl-12 pr-6 rounded-xl sm:rounded-2xl bg-slate-800/60 backdrop-blur-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-slate-800/80 shadow-xl border border-slate-700/50 text-sm sm:text-base transition-all duration-300',
                suggestionsContainer: 'absolute mt-1 w-full bg-slate-800/95 backdrop-blur-md border border-slate-700/50 rounded-lg shadow-xl max-h-60 overflow-y-auto z-20',
                suggestionsList: 'list-none p-0 m-0',
                suggestion: 'p-3 hover:bg-slate-700/50 transition-colors duration-200 cursor-pointer',
                suggestionHighlighted: 'bg-slate-700/60'
              }}
            />
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400 z-20" size={20} />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 z-20"
                aria-label="Clear search"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-8 md:mb-12 max-w-full overflow-x-auto pb-2 scrollbar-hide px-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`flex items-center px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300
                          shadow-lg backdrop-blur-sm border ${
                            activeCategory === category
                              ? 'bg-gradient-to-r from-emerald-600/90 to-teal-600/90 text-white border-emerald-500/50 shadow-emerald-500/25'
                              : 'bg-slate-800/60 text-slate-300 border-slate-700/50 hover:bg-slate-700/60 hover:text-slate-100 hover:border-slate-600/50'
                          }`}
              aria-pressed={activeCategory === category}
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
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 pl-2 border-l-4 border-emerald-500">
                Discover Random Tools
              </h2>
              <button
                onClick={() => {
                  const shuffledTools = [...tools].sort(() => Math.random() - 0.5);
                  setRandomTools(shuffledTools.slice(0, 6));
                  setCurrentFeaturedIndex(0);
                }}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-600/70 hover:bg-emerald-600/90 
                           rounded-full text-white text-xs sm:text-sm font-medium transition-all duration-300
                           border border-emerald-500/50 hover:border-emerald-400 shadow-lg"
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
                      className="block relative overflow-hidden rounded-xl sm:rounded-2xl 
                                 bg-gradient-to-br from-slate-800/80 to-slate-900/80
                                 backdrop-blur-lg border border-slate-700/50 hover:border-emerald-500/50
                                 shadow-xl hover:shadow-2xl transition-all duration-300 group h-full
                                 hover:scale-105 hover:-translate-y-1"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-teal-500/10 
                                   opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl sm:rounded-2xl" />
                      
                      <div className="absolute top-2 right-2 z-20">
                        <div className="w-6 h-6 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full 
                                        flex items-center justify-center shadow-lg">
                          <span className="text-white text-xs font-bold">🎯</span>
                        </div>
                      </div>
                      
                      <div className="relative z-10 p-4 sm:p-6 h-full flex flex-col">
                        <div className="flex items-center mb-3 sm:mb-4">
                          <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-slate-700/60 flex items-center justify-center mr-3 sm:mr-4 
                                         group-hover:bg-slate-600/80 transition-colors duration-300">
                            {getToolIcon(tool)}
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-slate-100 group-hover:text-emerald-100 transition-colors duration-300">
                            {tool.name}
                          </h3>
                        </div>
                        <p className="text-slate-300 mb-3 sm:mb-4 text-xs sm:text-sm flex-grow group-hover:text-slate-200 transition-colors duration-300">
                          {tool.description}
                        </p>
                        <div className="flex justify-between items-center mt-auto">
                          <span className="text-xs px-2 py-1 bg-slate-700/70 rounded text-emerald-400 
                                           group-hover:bg-slate-600/80 group-hover:text-emerald-300 transition-all duration-300">
                            {tool.categories && tool.categories[0]}
                          </span>
                          <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-full bg-slate-700/60 flex items-center justify-center 
                                         group-hover:bg-emerald-600 group-hover:scale-110 transition-all duration-300">
                            <Play size={14} className="text-slate-300 group-hover:text-white ml-0.5" />
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
                      currentFeaturedIndex === idx ? 'bg-emerald-500' : 'bg-slate-600 hover:bg-slate-500'
                    }`}
                  />
                ))}
              </div>
            )}
            
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-slate-800/60 to-slate-900/60 
                            backdrop-blur-sm rounded-xl border border-slate-700/50">
              <div className="flex items-center text-slate-300 text-xs sm:text-sm">
                <div className="w-6 h-6 bg-cyan-500/60 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                  <span className="text-white text-xs">💡</span>
                </div>
                <span>
                  <strong>Pro Tip:</strong> Try different tools randomly to discover new creative possibilities and expand your music production skills!
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tools Grid */}
        <div className="mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-slate-100 mb-4 sm:mb-6 pl-2 border-l-4 border-emerald-500">
            {activeCategory === 'All' ? 'All Tools' : activeCategory}
          </h2>

          {filteredAndCategorizedTools.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
              {filteredAndCategorizedTools.map((tool, index) => (
                <Link
                  key={tool.id}
                  to={tool.path}
                  className="block relative overflow-hidden rounded-xl sm:rounded-2xl 
                             bg-slate-800/60 backdrop-blur-lg border border-slate-700/50 hover:border-emerald-500/50
                             shadow-lg hover:shadow-xl transform hover:-translate-y-1
                             transition-all duration-300 group"
                  style={{
                    animation: `fadeInUp 0.5s ease-out ${index * 0.05}s both`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 to-teal-500/10 
                                   opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl sm:rounded-2xl" />
                  
                  <div className="relative z-10 p-3 sm:p-5 h-full flex flex-col">
                    <div className="flex items-start mb-2 sm:mb-4">
                      <div className="bg-gradient-to-br from-emerald-600/80 to-teal-600/80 w-8 sm:w-10 h-8 sm:h-10 rounded-lg 
                                       flex items-center justify-center flex-shrink-0 mr-2 sm:mr-3 
                                       group-hover:from-emerald-500 group-hover:to-teal-500 transition-all duration-300">
                        {getToolIcon(tool)}
                      </div>
                      <h3 className="text-sm sm:text-lg font-bold text-slate-100 group-hover:text-emerald-100 transition-colors duration-300 leading-tight">
                        {tool.name}
                      </h3>
                    </div>
                    <p className="text-slate-300 text-xs sm:text-sm mb-2 sm:mb-4 flex-grow group-hover:text-slate-200 transition-colors duration-300 line-clamp-2">
                      {tool.description}
                    </p>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-4">
                      {tool.categories && tool.categories.slice(0, 2).map(cat => (
                        <span
                          key={cat}
                          className="text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-slate-700/70 rounded text-emerald-400
                                     group-hover:bg-slate-600/80 group-hover:text-emerald-300 transition-all duration-300"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-2 sm:pt-3 border-t border-slate-700/50 group-hover:border-slate-600/50 transition-colors duration-300">
                      <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors duration-300 hidden sm:block">
                        Click to explore
                      </span>
                      <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors duration-300 sm:hidden">
                        Tap to open
                      </span>
                      <div className="w-6 sm:w-8 h-6 sm:h-8 rounded-full bg-slate-700/60 flex items-center justify-center 
                                       group-hover:bg-emerald-600 group-hover:scale-110 transition-all duration-300">
                        <Play size={12} className="text-slate-400 group-hover:text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="col-span-full text-center py-12 sm:py-16 rounded-xl sm:rounded-2xl bg-slate-800/60 backdrop-blur-lg border border-slate-700/50">
              <div className="text-slate-300 mb-4 text-sm sm:text-base">No tools found matching your criteria</div>
              <button
                onClick={() => { setSearchTerm(''); setActiveCategory('All'); }}
                className="px-4 sm:px-6 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 transition-all duration-300 text-sm sm:text-base shadow-lg"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>
      
      <Footer allTools={allTools} categorizedTools={categorizedTools} />
    </div>
  );
};

export default HomePage;