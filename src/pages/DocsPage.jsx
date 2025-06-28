// src/pages/DocsPage.jsx
import React from 'react';
import { BookOpen, Music, Headphones, Mic, Disc, Compass } from 'lucide-react';

const DocsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 to-blue-800 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-4xl bg-purple-900/40 backdrop-blur-lg rounded-2xl shadow-xl p-8 md:p-10 border border-purple-700/50">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center bg-purple-600/20 p-3 rounded-full mb-4">
            <Music size={28} className="text-purple-300" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">
            Learn Music with <span className="text-purple-300">Vishval</span>
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Your complete beginner's guide to music theory, production, and creative exploration.
          </p>
        </div>

        <div className="space-y-12">
          {/* Beginner's Journey */}
          <section id="beginner-journey">
            <div className="flex items-center gap-3 mb-6">
              <Compass size={24} className="text-purple-300" />
              <h2 className="text-3xl font-bold text-white">Beginner's Journey</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-purple-800/30 p-6 rounded-lg border border-purple-700/50">
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                  <BookOpen size={18} /> Music Fundamentals
                </h3>
                <ul className="list-disc list-inside space-y-2 text-white/70 text-sm">
                  <li>Understanding rhythm and tempo</li>
                  <li>Basic music notation</li>
                  <li>Major vs minor scales</li>
                  <li>Chord construction</li>
                </ul>
                <a href="#music-fundamentals" className="text-purple-400 hover:text-purple-300 text-sm mt-3 inline-block">
                  Start Learning &raquo;
                </a>
              </div>
              <div className="bg-purple-800/30 p-6 rounded-lg border border-purple-700/50">
                <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
                  <Headphones size={18} /> Ear Training
                </h3>
                <ul className="list-disc list-inside space-y-2 text-white/70 text-sm">
                  <li>Interval recognition</li>
                  <li>Chord quality identification</li>
                  <li>Melodic dictation</li>
                  <li>Rhythm recognition</li>
                </ul>
                <a href="#ear-training" className="text-purple-400 hover:text-purple-300 text-sm mt-3 inline-block">
                  Start Training &raquo;
                </a>
              </div>
            </div>
          </section>

          <hr className="border-purple-700/50" />

          {/* Tool Guides */}
          <section id="tool-guides">
            <div className="flex items-center gap-3 mb-6">
              <Mic size={24} className="text-purple-300" />
              <h2 className="text-3xl font-bold text-white">Interactive Learning Tools</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-purple-800/30 p-6 rounded-lg border border-purple-700/50">
                <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                  <Disc size={18} /> Rhythm Weaver
                </h3>
                <p className="text-white/70 text-sm mb-3">
                  Master rhythm patterns with our visual step sequencer. Perfect for drum programming and understanding time signatures.
                </p>
                <div className="text-xs text-purple-400 bg-purple-900/40 px-2 py-1 rounded inline-block">
                  Beginner Friendly
                </div>
              </div>
              <div className="bg-purple-800/30 p-6 rounded-lg border border-purple-700/50">
                <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                  <Music size={18} /> Chord Explorer
                </h3>
                <p className="text-white/70 text-sm mb-3">
                  Visualize chord shapes across the keyboard. Learn chord progressions and voice leading.
                </p>
                <div className="text-xs text-purple-400 bg-purple-900/40 px-2 py-1 rounded inline-block">
                  Music Theory Essential
                </div>
              </div>
            </div>
          </section>

          <hr className="border-purple-700/50" />

          {/* Video Tutorials */}
          <section id="video-tutorials">
            <div className="flex items-center gap-3 mb-6">
              <Headphones size={24} className="text-purple-300" />
              <h2 className="text-3xl font-bold text-white">Video Tutorials</h2>
            </div>
            <div className="aspect-w-16 aspect-h-9 bg-purple-800/20 rounded-lg overflow-hidden border border-purple-700/50 mb-4">
              <div className="w-full h-full flex items-center justify-center text-purple-300">
                <div className="text-center p-6">
                  <Music size={48} className="mx-auto mb-4" />
                  <p className="text-lg">Coming Soon: Vishval's Beginner Music Series</p>
                </div>
              </div>
            </div>
            <p className="text-white/70 text-sm">
              Subscribe to be notified when we launch our video tutorial series covering music production basics.
            </p>
          </section>

          <hr className="border-purple-700/50" />

          {/* Community */}
          <section id="community">
            <div className="flex items-center gap-3 mb-6">
              <Disc size={24} className="text-purple-300" />
              <h2 className="text-3xl font-bold text-white">Join Our Community</h2>
            </div>
            <p className="text-white/70 mb-4">
              Connect with other beginner musicians, share your progress, and get feedback from Vishval and the team.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#" className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-full text-sm border border-purple-500/50 transition-colors">
                Discord Server
              </a>
              <a href="#" className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-full text-sm border border-purple-500/50 transition-colors">
                Facebook Group
              </a>
              <a href="#" className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-full text-sm border border-purple-500/50 transition-colors">
                Instagram
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DocsPage;