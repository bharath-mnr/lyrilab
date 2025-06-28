// src/pages/TermsAndConditionsPage.jsx
import React from 'react';
import { Gavel, BookOpen } from 'lucide-react';

const TermsAndConditionsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 to-blue-800 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-4xl bg-purple-900/40 backdrop-blur-lg rounded-2xl shadow-xl p-8 md:p-10 border border-purple-700/50">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center bg-purple-600/20 p-3 rounded-full mb-4">
            <Gavel size={28} className="text-purple-300" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">
            Terms & Conditions
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Please read these terms carefully before using our services.
          </p>
        </div>

        <div className="space-y-8 text-white/90">
          <section>
            <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
              <BookOpen size={20} /> Introduction
            </h2>
            <p className="mb-3">
              Welcome to LyriLab! These Terms and Conditions ("Terms") govern your use of our website and services ("Services"). By accessing or using our Services, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Services.
            </p>
          </section>

          <hr className="border-purple-700/50" />

          <section>
            <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
              <BookOpen size={20} /> Intellectual Property
            </h2>
            <p className="mb-3">
              The Services and their original content, features, and functionality are and will remain the exclusive property of LyriLab and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of LyriLab.
            </p>
          </section>

          <hr className="border-purple-700/50" />

          <section>
            <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
              <BookOpen size={20} /> User Accounts
            </h2>
            <p className="mb-3">
              When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Services.
            </p>
            <p>
              You are responsible for safeguarding the password that you use to access the Services and for any activities or actions under your password, whether your password is with our Service or a third-party service.
            </p>
          </section>

          <hr className="border-purple-700/50" />

          <section>
            <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
              <BookOpen size={20} /> Links To Other Websites
            </h2>
            <p className="mb-3">
              Our Service may contain links to third-party web sites or services that are not owned or controlled by LyriLab.
            </p>
            <p>
              LyriLab has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third party web sites or services. You further acknowledge and agree that LyriLab shall not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with use of or reliance on any such content, goods or services available on or through any such web sites or services.
            </p>
          </section>

          <hr className="border-purple-700/50" />

          <section>
            <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
              <BookOpen size={20} /> Termination
            </h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>

          <hr className="border-purple-700/50" />

          <section>
            <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
              <BookOpen size={20} /> Governing Law
            </h2>
            <p>
              These Terms shall be governed and construed in accordance with the laws of [Your Country/State], without regard to its conflict of law provisions.
            </p>
          </section>

          <hr className="border-purple-700/50" />

          <section>
            <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
              <BookOpen size={20} /> Changes to Terms
            </h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;