
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
      spread = 90,
      startVelocity = 40,
      scalar = 1.2,
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
        <div className="fixed inset-0 w-full h-full pointer-events-none z-[9999]">
            <Confetti
              width={width}
              height={height}
              numberOfPieces={confettiConfig.particleCount}
              recycle={confettiConfig.recycle}
              run={isRunning}
              onConfettiComplete={() => setIsRunning(false)}
              spread={confettiConfig.spread}
              initialVelocityY={-20}
              gravity={0.1}
              scalar={confettiConfig.scalar}
            />
        </div>
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
