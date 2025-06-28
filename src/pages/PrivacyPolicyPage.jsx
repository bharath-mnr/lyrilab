// src/pages/PrivacyPolicyPage.jsx
import React from 'react';
import { Shield, BookOpen } from 'lucide-react';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 to-blue-800 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-4xl bg-purple-900/40 backdrop-blur-lg rounded-2xl shadow-xl p-8 md:p-10 border border-purple-700/50">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center bg-purple-600/20 p-3 rounded-full mb-4">
            <Shield size={28} className="text-purple-300" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">
            Privacy Policy
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Your privacy is critically important to us.
          </p>
        </div>

        <div className="space-y-8 text-white/90">
          <section>
            <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
              <BookOpen size={20} /> Introduction
            </h2>
            <p className="mb-3">
              This Privacy Policy describes how LyriLab ("we," "us," or "our") collects, uses, and discloses your information when you use our website and services ("Services"). By accessing or using our Services, you agree to this Privacy Policy.
            </p>
            <p>
              We are committed to protecting your personal data and your right to privacy. If you have any questions or concerns about our policy or our practices regarding your personal information, please contact us.
            </p>
          </section>

          <hr className="border-purple-700/50" />

          <section>
            <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
              <BookOpen size={20} /> Information We Collect
            </h2>
            <p className="mb-3">
              We collect information that you provide to us directly and information we collect automatically when you use our Services.
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>
                <strong>Personal Data You Disclose to Us:</strong> We collect personal information that you voluntarily provide to us when you express an interest in obtaining information about us or our products and services, when you participate in activities on the Services (such as sending us messages via the contact form), or otherwise when you contact us. The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make, and the products and features you use.
              </li>
              <li>
                <strong>Information Automatically Collected:</strong> We automatically collect certain information when you visit, use, or navigate the Services. This information does not reveal your specific identity (like your name or contact information) but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, information about how and when you use our Services, and other technical information.
              </li>
            </ul>
          </section>

          <hr className="border-purple-700/50" />

          <section>
            <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
              <BookOpen size={20} /> How We Use Your Information
            </h2>
            <p>
              We use personal information collected via our Services for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm mt-3">
              <li>To facilitate account creation and logon process.</li>
              <li>To respond to user inquiries and offer support.</li>
              <li>To send you marketing and promotional communications.</li>
              <li>To protect our Services (e.g., fraud monitoring and prevention).</li>
              <li>To enforce our terms, conditions, and policies.</li>
            </ul>
          </section>

          <hr className="border-purple-700/50" />

          <section>
            <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
              <BookOpen size={20} /> Your Privacy Rights
            </h2>
            <p>
              In some regions (like the European Economic Area), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; and (iv) if applicable, to data portability. In certain circumstances, you may also have the right to object to the processing of your personal information.
            </p>
          </section>

          <hr className="border-purple-700/50" />

          <section>
            <h2 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
              <BookOpen size={20} /> Changes to This Policy
            </h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;