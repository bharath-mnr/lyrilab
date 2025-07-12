import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, ChevronRight } from 'lucide-react';

const Navbar = ({ allTools, categorizedTools }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdownCategory, setActiveDropdownCategory] = useState(null);
  const [isMobileToolsDropdownOpen, setIsMobileToolsDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const mobileMenuRef = useRef(null);
  const categoryAreaRefs = useRef({});
  const dropdownCloseTimeoutRef = useRef(null);

  const location = useLocation();

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu and desktop dropdowns when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdownCategory(null);
    setIsMobileToolsDropdownOpen(false);
    if (dropdownCloseTimeoutRef.current) {
      clearTimeout(dropdownCloseTimeoutRef.current);
    }
  }, [location.pathname]);

  // Handle clicks outside to close dropdowns and mobile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target) && !event.target.closest('.lg\\:hidden button')) {
        setIsMobileMenuOpen(false);
      }

      let clickedInsideAnyDropdownArea = false;
      for (const category in categoryAreaRefs.current) {
        const areaRef = categoryAreaRefs.current[category];
        if (areaRef && areaRef.contains(event.target)) {
          clickedInsideAnyDropdownArea = true;
          break;
        }
      }

      if (!clickedInsideAnyDropdownArea) {
        setActiveDropdownCategory(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdownCategory, isMobileMenuOpen]);

  // Handle keyboard navigation (Escape key)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveDropdownCategory(null);
        setIsMobileMenuOpen(false);
        setIsMobileToolsDropdownOpen(false);
        if (dropdownCloseTimeoutRef.current) {
          clearTimeout(dropdownCloseTimeoutRef.current);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  // Handle mouse entering a category area (to open dropdown)
  const handleMouseEnterCategoryArea = (category) => {
    if (dropdownCloseTimeoutRef.current) {
      clearTimeout(dropdownCloseTimeoutRef.current);
    }
    setActiveDropdownCategory(category);
  };

  // Handle mouse leaving a category area (to close dropdown with delay)
  const handleMouseLeaveCategoryArea = () => {
    dropdownCloseTimeoutRef.current = setTimeout(() => {
      setActiveDropdownCategory(null);
    }, 200);
  };

  const categories = Object.keys(categorizedTools).sort();

  // Reusable style for NavLinks and category buttons
  const baseNavLinkClass = "flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 relative overflow-hidden group";
  const activeNavLinkClass = "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg";
  // Updated default nav link class with dark text colors
  const defaultNavLinkClass = "text-gray-700 hover:text-gray-900 hover:bg-gray-100/10 hover:backdrop-blur-sm";

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out ${
        isScrolled
          ? 'bg-black/10 backdrop-blur-md shadow-lg border-b border-white/10' // Very light transparent when scrolled
          : 'bg-transparent backdrop-blur-none border-b border-transparent' // Fully transparent initially
      }`}>
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex justify-between items-center h-16 relative">

            {/* Home Link (Replaced Logo) */}
            <Link
              to="/"
              className="flex items-center justify-center h-full pr-4 group flex-shrink-0"
              aria-label="Go to Home page"
            >
              <span className="text-gray-700 text-lg font-bold drop-shadow-lg">Home</span>
            </Link>

            {/* Desktop Navigation - Centered with Individual Category Dropdowns */}
            <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex items-center space-x-1 h-full">

              {/* Category Links with Dropdowns */}
              {categories.map(category => (
                <div
                  key={category}
                  className="relative h-full flex items-center"
                  onMouseEnter={() => handleMouseEnterCategoryArea(category)}
                  onMouseLeave={handleMouseLeaveCategoryArea}
                  ref={el => categoryAreaRefs.current[category] = el}
                >
                  <button
                    className={`${baseNavLinkClass} ${activeDropdownCategory === category ? activeNavLinkClass : defaultNavLinkClass} drop-shadow-md`}
                    onClick={() => setActiveDropdownCategory(activeDropdownCategory === category ? null : category)}
                    aria-expanded={activeDropdownCategory === category}
                    aria-haspopup="true"
                  >
                    <span>{category}</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${activeDropdownCategory === category ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {activeDropdownCategory === category && categorizedTools[category] && (
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-0 w-max min-w-[200px] max-w-sm bg-white/90 backdrop-blur-lg border border-gray-200/50 rounded-2xl shadow-2xl p-3 animate-in slide-in-from-top-2 duration-200 z-50"
                    >
                      <div className="space-y-1">
                        {categorizedTools[category].map(tool => (
                          <Link
                            key={tool.id}
                            to={tool.path}
                            className="flex items-center space-x-3 p-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 rounded-xl transition-all duration-200 group backdrop-blur-sm"
                            onClick={() => setActiveDropdownCategory(null)}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-sm drop-shadow-sm">{tool.name}</span>
                              {tool.description && (
                                <span className="text-xs text-gray-600 drop-shadow-sm">
                                  {tool.description.substring(0, 30)}{tool.description.length > 30 ? '...' : ''}
                                </span>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Menu Button (remains on the far right) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-full text-gray-700 hover:bg-gray-100/10 transition-all duration-200 hover:scale-105 flex-shrink-0 drop-shadow-lg backdrop-blur-sm"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile Menu Panel Content */}
            <div
              ref={mobileMenuRef}
              className={`absolute top-0 left-0 h-full w-full max-w-sm bg-white/90 backdrop-blur-xl shadow-2xl transform transition-transform duration-300 ease-out ${
                isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
              } border-r border-gray-200/50`}
            >
              {/* Mobile Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200/50">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-gray-800 drop-shadow-lg">Menu</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-100/50 transition-colors duration-200 backdrop-blur-sm"
                >
                  <X size={20} className="text-gray-700" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="h-full overflow-y-auto pb-20">
                <div className="p-6">
                  {/* Mobile Home Link */}
                  <div className="space-y-2 mb-6">
                    <NavLink
                      to="/"
                      className={({ isActive }) => `${baseNavLinkClass} ${isActive ? activeNavLinkClass : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100/50'} drop-shadow-md`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span>Home</span>
                    </NavLink>
                  </div>

                  {/* Mobile "Explore Tools" Section (with toggle) */}
                  <div className="space-y-4">
                    <button
                      onClick={() => setIsMobileToolsDropdownOpen(!isMobileToolsDropdownOpen)}
                      className="flex items-center justify-between w-full p-4 bg-gray-100/50 backdrop-blur-sm rounded-xl text-gray-800 font-medium hover:bg-gray-100/70 transition-colors duration-200 border border-gray-200/50"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="drop-shadow-sm">Explore Tools</span>
                      </div>
                      <ChevronRight
                        size={20}
                        className={`transition-transform duration-200 ${
                          isMobileToolsDropdownOpen ? 'rotate-90' : ''
                        } text-gray-700`}
                      />
                    </button>

                    {isMobileToolsDropdownOpen && (
                      <div className="space-y-4 pl-4 border-l-2 border-gray-300/50">
                        {categories.map(category => (
                          <div key={category} className="space-y-2">
                            <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wide drop-shadow-sm">
                              {category}
                            </h4>
                            <div className="space-y-1">
                              {categorizedTools[category].map(tool => (
                                <Link
                                  key={tool.id}
                                  to={tool.path}
                                  className="flex items-center space-x-3 p-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100/50 rounded-lg transition-all duration-200 group backdrop-blur-sm"
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                  <span className="text-sm font-medium drop-shadow-sm">{tool.name}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Spacer to prevent content from hiding under fixed navbar */}
      <div className="h-16" />
    </>
  );
};

export default Navbar;

