
'use client'

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

interface ConfettiContextType {
  showConfetti: (options?: ConfettiOptions) => void;
}

interface ConfettiOptions {
  particleCount?: number;
  duration?: number;
  recycle?: boolean;
  spread?: number;
  startVelocity?: number;
  scalar?: number;
}

const ConfettiContext = createContext<ConfettiContextType | undefined>(undefined);

export default function ConfettiProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [confettiConfig, setConfettiConfig] = useState<ConfettiOptions>({});
  const { width, height } = useWindowSize();

  const showConfetti = useCallback((options: ConfettiOptions = {}) => {
    const { 
      particleCount = 200, 
      duration = 5000, 
      recycle = false,
      spread = 70,
      startVelocity = 40,
      scalar = 1, // Increased from a likely smaller default
     } = options;

    setConfettiConfig({ particleCount, duration, recycle, spread, startVelocity, scalar });
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
    }, duration);
  }, []);

  return (
    <ConfettiContext.Provider value={{ showConfetti }}>
      {children}
      {isRunning && (
        <Confetti
          width={width}
          height={height}
          numberOfPieces={confettiConfig.particleCount}
          recycle={confettiConfig.recycle}
          run={isRunning}
          onConfettiComplete={() => setIsRunning(false)}
          className="!z-[9999]"
          spread={confettiConfig.spread}
          startVelocity={confettiConfig.startVelocity}
          scalar={confettiConfig.scalar}
          gravity={0.15} // Makes particles fall a bit slower
        />
      )}
    </ConfettiContext.Provider>
  );
};

export const useConfetti = () => {
  const context = useContext(ConfettiContext);
  if (context === undefined) {
    throw new Error('useConfetti must be used within a ConfettiProvider');
  }
  return context;
};
