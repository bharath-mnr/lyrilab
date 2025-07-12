import React from 'react';
import { BookOpen, Music, Headphones, Mic, Disc, Compass } from 'lucide-react';

const DocsPage = () => {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col p-3 sm:p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="relative z-10 flex flex-col flex-grow">
        <div className="container mx-auto max-w-4xl bg-white rounded-2xl shadow-lg p-6 sm:p-8 md:p-10 border border-slate-200">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center bg-emerald-100 p-3 rounded-full mb-4">
              <Music size={28} className="text-emerald-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-3">
              Learn Music with <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-cyan-600">Vishval</span>
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Your complete beginner's guide to music theory, production, and creative exploration.
            </p>
          </div>

          <div className="space-y-8">
            {/* Beginner's Journey */}
            <section id="beginner-journey">
              <div className="flex items-center gap-3 mb-6">
                <Compass size={24} className="text-emerald-600" />
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Beginner's Journey</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
                <div className="bg-slate-50 p-5 sm:p-6 rounded-lg border border-slate-200">
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <BookOpen size={18} className="text-emerald-600" /> Music Fundamentals
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 text-sm">
                    <li>Understanding rhythm and tempo</li>
                    <li>Basic music notation</li>
                    <li>Major vs minor scales</li>
                    <li>Chord construction</li>
                  </ul>
                  <a href="#music-fundamentals" className="text-emerald-600 hover:text-emerald-700 text-sm mt-3 inline-block font-medium">
                    Start Learning &raquo;
                  </a>
                </div>
                <div className="bg-slate-50 p-5 sm:p-6 rounded-lg border border-slate-200">
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Headphones size={18} className="text-emerald-600" /> Ear Training
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-600 text-sm">
                    <li>Interval recognition</li>
                    <li>Chord quality identification</li>
                    <li>Melodic dictation</li>
                    <li>Rhythm recognition</li>
                  </ul>
                  <a href="#ear-training" className="text-emerald-600 hover:text-emerald-700 text-sm mt-3 inline-block font-medium">
                    Start Training &raquo;
                  </a>
                </div>
              </div>
            </section>

            <hr className="border-slate-200" />

            {/* Tool Guides */}
            <section id="tool-guides">
              <div className="flex items-center gap-3 mb-6">
                <Mic size={24} className="text-emerald-600" />
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Interactive Learning Tools</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-slate-50 p-5 sm:p-6 rounded-lg border border-slate-200">
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Disc size={18} className="text-emerald-600" /> Rhythm Weaver
                  </h3>
                  <p className="text-slate-600 text-sm mb-3">
                    Master rhythm patterns with our visual step sequencer. Perfect for drum programming and understanding time signatures.
                  </p>
                  <div className="text-xs text-emerald-800 bg-emerald-100 px-2 py-1 rounded inline-block">
                    Beginner Friendly
                  </div>
                </div>
                <div className="bg-slate-50 p-5 sm:p-6 rounded-lg border border-slate-200">
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2 flex items-center gap-2">
                    <Music size={18} className="text-emerald-600" /> Chord Explorer
                  </h3>
                  <p className="text-slate-600 text-sm mb-3">
                    Visualize chord shapes across the keyboard. Learn chord progressions and voice leading.
                  </p>
                  <div className="text-xs text-emerald-800 bg-emerald-100 px-2 py-1 rounded inline-block">
                    Music Theory Essential
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-slate-200" />

            {/* Video Tutorials */}
            <section id="video-tutorials">
              <div className="flex items-center gap-3 mb-6">
                <Headphones size={24} className="text-emerald-600" />
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Video Tutorials</h2>
              </div>
              <div className="aspect-w-16 aspect-h-9 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 mb-4 flex items-center justify-center">
                <div className="text-center p-6">
                  <Music size={48} className="mx-auto mb-4 text-emerald-600" />
                  <p className="text-slate-800">Coming Soon: Vishval's Beginner Music Series</p>
                </div>
              </div>
              <p className="text-slate-600 text-sm">
                Subscribe to be notified when we launch our video tutorial series covering music production basics.
              </p>
            </section>

            <hr className="border-slate-200" />

            {/* Community */}
            <section id="community">
              <div className="flex items-center gap-3 mb-6">
                <Disc size={24} className="text-emerald-600" />
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Join Our Community</h2>
              </div>
              <p className="text-slate-600 mb-4">
                Connect with other beginner musicians, share your progress, and get feedback from Vishval and the team.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href="#" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-full text-sm text-white transition-colors shadow-sm">
                  Discord Server
                </a>
                <a href="#" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-sm text-slate-800 transition-colors shadow-sm border border-slate-200">
                  Facebook Group
                </a>
                <a href="#" className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-full text-sm text-slate-800 transition-colors shadow-sm border border-slate-200">
                  Instagram
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsPage;