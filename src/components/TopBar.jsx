import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Phone, Mail } from 'lucide-react';
import { getPlatformSettings } from '../services/firestoreService';

const TopBar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [settings, setSettings] = useState({
    contactPhone: '+90 (850) 123 45 67',
    contactEmail: 'info@sahada.com'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const result = await getPlatformSettings();
        if (result.success && result.data) {
           setSettings(prev => ({
             ...prev,
             // Map backend settings field names if different, or assume valid
             contactPhone: result.data.contactPhone || prev.contactPhone, 
             contactEmail: result.data.contactEmail || prev.contactEmail,
             // Add logo logic if it were in TopBar, but it's in Header usually. 
             // Wait, user specifically asked 'Logo' and showed index.html context, but TopBar has hardcoded settings too.
             // I'll stick to updating phone/email here as that's what's visible.
           }));
        }
      } catch (err) {
        console.error('TopBar settings error:', err);
      }
    };
    fetchSettings();
  }, []);
  
  // Show only on homepage
  if (location.pathname !== '/') {
    return null;
  }

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
