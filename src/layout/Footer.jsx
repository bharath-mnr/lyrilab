import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Music } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full bg-white border-t border-slate-200 text-slate-800 py-6 md:py-8 relative z-10">
      <div className="container mx-auto px-4 md:px-8 flex flex-col items-center justify-center">

        {/* Main Content Area: Brand, Quick Links, Resources */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-8 gap-x-4 w-full max-w-5xl text-center md:text-left mb-6">

          {/* Brand & Description */}
          <div className="flex flex-col items-center md:items-start">
            <Link to="/" className="flex items-center space-x-2 mb-2 text-slate-800 hover:text-emerald-600 transition-colors duration-300">
              <Music size={28} className="text-emerald-500" />
              <span className="font-bold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-cyan-600">
                LyriLab
              </span>
            </Link>
            <p className="text-slate-600 text-sm max-w-xs mx-auto md:mx-0">
              Explore, learn, and create with interactive music tools.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-semibold text-emerald-600 text-lg mb-3">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="flex items-center justify-center md:justify-start text-slate-600 hover:text-emerald-600 hover:underline text-sm transition-colors duration-200"
                >
                  <Search size={14} className="mr-2 text-emerald-500/70" />
                  Search Tools
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-slate-600 hover:text-emerald-600 hover:underline text-sm transition-colors duration-200"
                >
                  About LyriLab
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Links (Docs, Contact, Privacy, Terms) */}
          <div className="flex flex-col items-center md:items-start">
            <h4 className="font-semibold text-emerald-600 text-lg mb-3">Resources</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/docs"
                  className="text-slate-600 hover:text-emerald-600 hover:underline text-sm transition-colors duration-200"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-slate-600 hover:text-emerald-600 hover:underline text-sm transition-colors duration-200"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy-policy"
                  className="text-slate-600 hover:text-emerald-600 hover:underline text-sm transition-colors duration-200"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-and-conditions"
                  className="text-slate-600 hover:text-emerald-600 hover:underline text-sm transition-colors duration-200"
                >
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-slate-500 text-xs mt-4 pt-4 border-t border-slate-200 w-full text-center">
          &copy; {new Date().getFullYear()} LyriLab. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;