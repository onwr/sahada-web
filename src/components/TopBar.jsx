import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Phone, Mail } from 'lucide-react';

const TopBar = () => {
  const { user } = useAuth();
  
  // Settings - Hardcoded for now as per request/current state
  const settings = {
    contactPhone: '+90 (850) 123 45 67',
    contactEmail: 'info@sahada.com'
  };

  return (
    <div className="hidden md:block bg-[#1a1a1a] text-white text-xs py-2">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex gap-6 opacity-80">
          <div className="flex items-center gap-2">
            <Phone size={12} />
            <span>{settings.contactPhone}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail size={12} />
            <span>{settings.contactEmail}</span>
          </div>
        </div>
        <div className="flex gap-6 font-medium">
          {!user && (
            <Link
              to="/saha-sahibi-login"
              // state={{ role: 'OWNER' }} // Using query param as per Header.jsx pattern
              className="hover:text-green-400 transition-colors"
            >
              Saha Sahibi Girişi
            </Link>
          )}

        </div>
      </div>
    </div>
  );
};

export default TopBar;
