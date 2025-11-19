import React from 'react';
import { useChainStore } from '../store/useChainStore';
import { CameraMode } from '../types';
import { X, ExternalLink, Activity, Cuboid, Flame } from 'lucide-react';

const MANTRA_SCAN_URL = "https://mantrascan.io/mainnet";

const UI: React.FC = () => {
  const { 
    latestKnownHeight, 
    cameraMode, 
    setCameraMode, 
    selectedObject, 
    selectObject,
    sessionGasBurned
  } = useChainStore();

  const toggleMode = () => {
    setCameraMode(cameraMode === CameraMode.LIVE ? CameraMode.FREE : CameraMode.LIVE);
  };

  const handleLink = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 flex flex-col justify-between p-6">
      
      {/* Header */}
      <div className="pointer-events-auto flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold text-white tracking-wider drop-shadow-md">
                MANTRA <span className="text-[#e8327e]">VOXEL</span>
            </h1>
            <div className="flex items-center gap-2 text-gray-400 text-sm mt-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span>Mainnet Live</span>
                <span className="mx-2">|</span>
                <span>Height: {latestKnownHeight}</span>
            </div>
        </div>
        
        <button 
            onClick={toggleMode}
            className={`
                px-4 py-2 rounded font-semibold transition-all border border-[#e8327e]
                ${cameraMode === CameraMode.LIVE 
                    ? 'bg-[#e8327e] text-white shadow-[0_0_15px_#e8327e]' 
                    : 'bg-transparent text-[#e8327e] hover:bg-[#e8327e] hover:text-white'}
            `}
        >
            {cameraMode === CameraMode.LIVE ? 'LIVE FEED' : 'FREE ROAM'}
        </button>
      </div>

      {/* Session Gas Burned Panel */}
      <div className="pointer-events-auto absolute top-24 right-6 bg-[#1a1a20]/80 backdrop-blur-md border border-[#e8327e]/50 rounded-lg p-4 shadow-[0_0_20px_rgba(232,50,126,0.15)] flex items-center gap-4 min-w-[240px] transition-transform hover:scale-105">
         <div className="bg-[#e8327e]/20 p-3 rounded-full shadow-[0_0_10px_#e8327e]">
            <Flame className="text-[#e8327e] animate-pulse" size={24} />
         </div>
         <div>
            <div className="text-gray-400 text-[10px] uppercase tracking-widest font-bold mb-1">Session Gas Burned</div>
            <div className="text-2xl font-bold text-white font-mono leading-none drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
                {new Intl.NumberFormat('en-US').format(sessionGasBurned)} 
                <span className="text-xs text-[#e8327e] ml-1">uOM</span>
            </div>
         </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-6 left-6 text-gray-500 text-xs pointer-events-auto bg-black/50 p-2 rounded border border-gray-800">
        <p>Scroll / Drag to move camera manually</p>
        <p>Click Blocks/Tx to view details</p>
        <p>Auto-loads older blocks when scrolling left</p>
      </div>

      {/* Detail Panel */}
      {selectedObject && (
        <div className="pointer-events-auto absolute top-1/2 right-6 transform -translate-y-1/2 w-80 bg-[#1a1a20]/90 backdrop-blur-md border border-[#333] rounded-lg p-4 shadow-2xl text-white">
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    {selectedObject.type === 'block' ? <Cuboid size={18} /> : <Activity size={18} />}
                    {selectedObject.type === 'block' ? 'Block Details' : 'Transaction'}
                </h2>
                <button onClick={() => selectObject(null)} className="text-gray-400 hover:text-white">
                    <X size={20} />
                </button>
            </div>
            
            <div className="space-y-3 text-sm">
                {selectedObject.type === 'block' ? (
                    <>
                        <div>
                            <span className="text-gray-400 block">Height</span>
                            <span className="font-mono text-lg">{selectedObject.data.height}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Hash</span>
                            <span className="font-mono text-xs break-all text-gray-300">{selectedObject.data.hash}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Time</span>
                            <span>{new Date(selectedObject.data.time).toLocaleString()}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Transactions</span>
                            <span className="text-[#e8327e] font-bold">{selectedObject.data.txCount}</span>
                        </div>
                        <button 
                            onClick={() => handleLink(`${MANTRA_SCAN_URL}/block/${selectedObject.data.height}`)}
                            className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-500 rounded flex items-center justify-center gap-2 transition-colors"
                        >
                            View on MantraScan <ExternalLink size={14} />
                        </button>
                    </>
                ) : (
                    <>
                         <div>
                            <span className="text-gray-400 block">Tx Hash</span>
                            <span className="font-mono text-xs break-all text-gray-300">{selectedObject.data.hash}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Block Height</span>
                            <span className="font-mono">{selectedObject.data.height}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-gray-400 block">Gas Used</span>
                                <span className="font-mono text-[#e8327e]">{selectedObject.data.gasUsed.toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 block">Gas Wanted</span>
                                <span className="font-mono text-gray-300">{selectedObject.data.gasWanted.toLocaleString()}</span>
                            </div>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Status</span>
                            <span className={`font-bold ${selectedObject.data.success ? 'text-green-400' : 'text-red-400'}`}>
                                {selectedObject.data.success ? 'SUCCESS' : 'FAILED'}
                            </span>
                        </div>
                        <button 
                            onClick={() => handleLink(`${MANTRA_SCAN_URL}/tx/${selectedObject.data.hash}`)}
                            className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-500 rounded flex items-center justify-center gap-2 transition-colors"
                        >
                            View on MantraScan <ExternalLink size={14} />
                        </button>
                    </>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default UI;