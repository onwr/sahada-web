import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AppLoader = ({ onLoadingComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onLoadingComplete) onLoadingComplete();
    }, 1500); // 1.5 seconds minimum show time

    return () => clearTimeout(timer);
  }, [onLoadingComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            {/* Logo */}
            <div className="w-64 h-auto mb-6">
                <img 
                   src={localStorage.getItem('platform_logo') || "/images/logo.png"} 
                   alt="Sahada Logo" 
                   className="w-full h-full object-contain"
                />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppLoader;
