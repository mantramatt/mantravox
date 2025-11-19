import React, { useEffect } from 'react';
import Scene from './components/Scene';
import UI from './components/UI';
import { useChainStore } from './store/useChainStore';

const POLL_INTERVAL = 3500; // ~3.5s

const App: React.FC = () => {
  const { init, poll } = useChainStore();

  useEffect(() => {
    init();
    const interval = setInterval(() => {
      poll();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [init, poll]);

  return (
    <div className="w-full h-screen relative bg-[#0f0f13]">
      <Scene />
      <UI />
    </div>
  );
};

export default App;
