import React from 'react';
import { toast as hotToast } from 'react-hot-toast';

const playSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Hafif ve kısa bir "dıt" sesi
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.05, ctx.currentTime); // Çok düşük ses seviyesi
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (error) {
    // Sessizce başarısız ol
  }
};

const toast = {
  success: (message, options) => {
    playSound();
    return hotToast.success((t) => (
      React.createElement('div', { className: 'flex items-center justify-between w-full gap-2 min-w-[200px]' },
        React.createElement('span', null, message),
        React.createElement('button', {
          onClick: (e) => { e.stopPropagation(); hotToast.dismiss(t.id); },
          className: 'p-1 hover:bg-black/10 rounded-full transition-colors shrink-0'
        },
          React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
            React.createElement('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
            React.createElement('line', { x1: '6', y1: '6', x2: '18', y2: '18' })
          )
        )
      )
    ), { duration: 4000, position: 'bottom-right', ...options });
  },
  error: (message, options) => {
    playSound();
    return hotToast.error((t) => (
      React.createElement('div', { className: 'flex items-center justify-between w-full gap-2 min-w-[200px]' },
        React.createElement('span', null, message),
        React.createElement('button', {
          onClick: (e) => { e.stopPropagation(); hotToast.dismiss(t.id); },
          className: 'p-1 hover:bg-black/10 rounded-full transition-colors shrink-0'
        },
          React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
            React.createElement('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
            React.createElement('line', { x1: '6', y1: '6', x2: '18', y2: '18' })
          )
        )
      )
    ), { duration: 4000, position: 'bottom-right', ...options });
  },
  loading: (message, options) => {
    playSound(); 
    return hotToast.loading((t) => (
      React.createElement('div', { className: 'flex items-center justify-between w-full gap-2 min-w-[200px]' },
        React.createElement('span', null, message),
        React.createElement('button', {
          onClick: (e) => { e.stopPropagation(); hotToast.dismiss(t.id); },
          className: 'p-1 hover:bg-black/10 rounded-full transition-colors shrink-0'
        },
          React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
            React.createElement('line', { x1: '18', y1: '6', x2: '6', y2: '18' }),
            React.createElement('line', { x1: '6', y1: '6', x2: '18', y2: '18' })
          )
        )
      )
    ), options);
  },
  dismiss: (toastId) => {
    return hotToast.dismiss(toastId);
  },
  custom: (jsx, options) => {
    playSound();
    return hotToast.custom(jsx, options);
  },
  // Pass through other properties/methods if any
  promise: (promise, msgs, opts) => {
      // Promise toast has distinct stages.
      // We might want sound on success/error logic.
      // hotToast.promise returns the promise result.
      const p = hotToast.promise(promise, msgs, opts);
      // We can't easily hook into the internal success/error of .promise() without wrapping the promise.
      // Let's wrap the promise to play sound on resolution/rejection.
      promise.then(() => playSound()).catch(() => playSound());
      return p;
  }
};

export default toast;
export { hotToast as originalToast };
