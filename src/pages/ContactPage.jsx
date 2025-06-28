// src/pages/ContactPage.jsx
import React, { useState } from 'react';
import { Mail, Send } from 'lucide-react';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('https://formspree.io/f/mjkrjjwa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: formData.message,
          _subject: `New message from ${formData.name} - LyriLab`
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ name: '', email: '', message: '' });
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 to-blue-800 text-white py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="container mx-auto max-w-md bg-purple-900/40 backdrop-blur-lg rounded-2xl shadow-xl p-8 md:p-10 border border-purple-700/50">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-purple-600/20 p-3 rounded-full mb-4">
            <Mail size={28} className="text-purple-300" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">Contact Us</h1>
          <p className="text-lg text-white/80">
            Have questions or feedback? Send us a message below.
          </p>
        </div>

        {submitStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded-lg text-center">
            Thank you for your message! We'll get back to you soon.
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-center">
            There was an error sending your message. Please try again later.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-white/70 text-sm font-medium mb-1">Your Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-3 bg-purple-800/60 border border-purple-700/50 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-purple-400"
              placeholder="Your name"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-white/70 text-sm font-medium mb-1">Your Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3 bg-purple-800/60 border border-purple-700/50 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-purple-400"
              placeholder="your.email@example.com"
              required
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-white/70 text-sm font-medium mb-1">Your Message</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows="5"
              className="w-full p-3 bg-purple-800/60 border border-purple-700/50 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-purple-400"
              placeholder="How can we help you?"
              required
            ></textarea>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-70"
          >
            {isSubmitting ? (
              <span>Sending...</span>
            ) : (
              <>
                <Send size={18} />
                <span>Send Message</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ContactPage;