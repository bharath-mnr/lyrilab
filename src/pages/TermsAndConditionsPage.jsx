import React from 'react';
import { Gavel, BookOpen } from 'lucide-react';

const TermsAndConditionsPage = () => {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col p-3 sm:p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="relative z-10 flex flex-col flex-grow">
        <div className="container mx-auto max-w-4xl bg-white rounded-2xl shadow-lg p-6 sm:p-8 md:p-10 border border-slate-200">
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center justify-center bg-emerald-100 p-3 rounded-full mb-4">
              <Gavel size={28} className="text-emerald-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-800 mb-3">
              Terms & Conditions
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Please read these terms carefully before using our services.
            </p>
          </div>

          <div className="space-y-6 text-slate-700">
            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 mb-3 flex items-center gap-2">
                <BookOpen size={20} className="text-emerald-600" /> Introduction
              </h2>
              <p className="mb-3">
                Welcome to LyriLab! These Terms and Conditions ("Terms") govern your use of our website and services ("Services"). By accessing or using our Services, you agree to be bound by these Terms. If you disagree with any part of the terms, then you may not access the Services.
              </p>
            </section>

            <hr className="border-slate-200" />

            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 mb-3 flex items-center gap-2">
                <BookOpen size={20} className="text-emerald-600" /> Intellectual Property
              </h2>
              <p className="mb-3">
                The Services and their original content, features, and functionality are and will remain the exclusive property of LyriLab and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of LyriLab.
              </p>
            </section>

            <hr className="border-slate-200" />

            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 mb-3 flex items-center gap-2">
                <BookOpen size={20} className="text-emerald-600" /> User Accounts
              </h2>
              <p className="mb-3">
                When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Services.
              </p>
              <p>
                You are responsible for safeguarding the password that you use to access the Services and for any activities or actions under your password, whether your password is with our Service or a third-party service.
              </p>
            </section>

            <hr className="border-slate-200" />

            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 mb-3 flex items-center gap-2">
                <BookOpen size={20} className="text-emerald-600" /> Links To Other Websites
              </h2>
              <p className="mb-3">
                Our Service may contain links to third-party web sites or services that are not owned or controlled by LyriLab.
              </p>
              <p>
                LyriLab has no control over, and assumes no responsibility for, the content, privacy policies, or practices of any third party web sites or services. You further acknowledge and agree that LyriLab shall not be responsible or liable, directly or indirectly, for any damage or loss caused or alleged to be caused by or in connection with use of or reliance on any such content, goods or services available on or through any such web sites or services.
              </p>
            </section>

            <hr className="border-slate-200" />

            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 mb-3 flex items-center gap-2">
                <BookOpen size={20} className="text-emerald-600" /> Termination
              </h2>
              <p>
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
              </p>
            </section>

            <hr className="border-slate-200" />

            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 mb-3 flex items-center gap-2">
                <BookOpen size={20} className="text-emerald-600" /> Governing Law
              </h2>
              <p>
                These Terms shall be governed and construed in accordance with the laws of [Your Country/State], without regard to its conflict of law provisions.
              </p>
            </section>

            <hr className="border-slate-200" />

            <section>
              <h2 className="text-xl sm:text-2xl font-bold text-emerald-600 mb-3 flex items-center gap-2">
                <BookOpen size={20} className="text-emerald-600" /> Changes to Terms
              </h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;