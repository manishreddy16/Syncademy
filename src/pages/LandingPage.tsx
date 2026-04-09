import { useState } from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const [showLoginOptions, setShowLoginOptions] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero Section with Background Image */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')`,
          }}
        ></div>

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/60"></div>

        {/* Content */}
        <div className="relative z-10 text-center max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-bold mb-6 text-white drop-shadow-2xl">
              Syncademy
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto drop-shadow-lg">
              Empowering education in low-connectivity environments with seamless offline-first learning management
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <button
              onClick={() => setShowLoginOptions(true)}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-full text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-2xl"
            >
              Get Started
            </button>
            <Link
              to="/login"
              className="px-8 py-4 border-2 border-white/80 hover:border-white rounded-full text-lg font-semibold transition-all duration-300 hover:bg-white hover:text-slate-900"
            >
              Sign In
            </Link>
          </div>

          {/* Quick Register Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
            <Link
              to="/register-school"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl text-white font-semibold transition-all duration-300 border border-white/20"
            >
              Register School
            </Link>
            <Link
              to="/register-student"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl text-white font-semibold transition-all duration-300 border border-white/20"
            >
              Register Student
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-slate-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Why Choose Syncademy?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:border-indigo-400 transition-all duration-300">
              <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Offline-First</h3>
              <p className="text-slate-400">Work seamlessly offline with automatic sync when connectivity returns</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:border-purple-400 transition-all duration-300">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Dual Portals</h3>
              <p className="text-slate-400">Separate interfaces for administrators and students with role-based access</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:border-green-400 transition-all duration-300">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Sync</h3>
              <p className="text-slate-400">Automatic synchronization of assignments, payments, and resources</p>
            </div>
          </div>
        </div>
      </section>

      {/* Login Modal */}
      {showLoginOptions && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-3xl p-8 max-w-md w-full border border-slate-700">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2">Welcome to Syncademy</h2>
              <p className="text-slate-400">Choose how you'd like to proceed</p>
            </div>
            <div className="space-y-4">
              <Link
                to="/login"
                className="block w-full px-6 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 text-center"
              >
                Sign In to Your Account
              </Link>
              <div className="grid grid-cols-1 gap-3">
                <Link
                  to="/register-school"
                  className="block px-6 py-4 border border-slate-600 hover:border-indigo-400 rounded-2xl text-lg font-semibold transition-all duration-300 text-center hover:bg-slate-800"
                >
                  Register as School Admin
                </Link>
                <Link
                  to="/register-student"
                  className="block px-6 py-4 border border-slate-600 hover:border-indigo-400 rounded-2xl text-lg font-semibold transition-all duration-300 text-center hover:bg-slate-800"
                >
                  Register as Student
                </Link>
              </div>
              <button
                onClick={() => setShowLoginOptions(false)}
                className="block w-full px-6 py-3 text-slate-400 hover:text-white transition-colors duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800 bg-slate-950">
        <div className="max-w-6xl mx-auto text-center text-slate-400">
          <p>&copy; 2024 Syncademy. Empowering education everywhere.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;