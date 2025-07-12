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
    <div className="min-h-screen relative overflow-hidden flex flex-col p-3 sm:p-4 md:p-8 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="relative z-10 flex flex-col flex-grow items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-slate-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-emerald-100 p-3 rounded-full mb-4">
              <Mail size={28} className="text-emerald-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 mb-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-cyan-600">
                Contact Us
              </span>
            </h1>
            <p className="text-slate-600">
              Have questions or feedback? Send us a message below.
            </p>
          </div>

          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-800 text-center">
              Thank you for your message! We'll get back to you soon.
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-50 rounded-lg border border-red-200 text-red-800 text-center">
              There was an error sending your message. Please try again later.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-slate-700 text-sm font-medium mb-1">Your Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-3 bg-white border border-slate-300 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                placeholder="Your name"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-slate-700 text-sm font-medium mb-1">Your Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-3 bg-white border border-slate-300 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                placeholder="your.email@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-slate-700 text-sm font-medium mb-1">Your Message</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows="5"
                className="w-full p-3 bg-white border border-slate-300 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                placeholder="How can we help you?"
                required
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-emerald-700 hover:to-cyan-700 transition-all disabled:opacity-70 shadow-sm"
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
    </div>
  );
};

export default ContactPage;