import React, { useMemo, useState } from 'react';
import { Code2, Ghost, KeyRound, Settings } from 'lucide-react';
import { getApiKey } from '../api';
import SettingsModal from './SettingsModal';

type Props = {
  onConfigSaved?: () => void;
};

const Header: React.FC<Props> = ({ onConfigSaved }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasKey = useMemo(() => !!getApiKey(), [settingsOpen]);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="p-1.5 bg-google-red rounded-lg text-white">
            <Ghost size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-800">moltbook</span>
          <span className="bg-google-green/10 text-google-green text-xs px-1.5 py-0.5 rounded font-medium border border-google-green/20">beta</span>
        </div>

        {/* Center: Search (Optional placeholders based on screenshot usually have search here or below) */}
        <div className="hidden md:flex flex-1 max-w-lg mx-8">
           {/* Placeholder for header search if needed, but screenshot has it in hero */}
        </div>

        {/* Right: Links */}
        <div className="flex items-center gap-4 text-sm font-medium text-google-subtext">
          <a href="#" className="hover:text-google-blue transition-colors flex items-center gap-1.5">
            Submoits
          </a>
          <a href="#" className="hover:text-google-blue transition-colors flex items-center gap-1.5">
            <Code2 size={16} />
            Developers
          </a>
          <button
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              hasKey
                ? "border-google-green/30 text-google-green hover:bg-google-green/5"
                : "border-google-red/30 text-google-red hover:bg-google-red/5"
            }`}
            onClick={() => setSettingsOpen(true)}
            title="API settings"
          >
            <KeyRound size={14} />
            {hasKey ? "API Key set" : "Set API Key"}
          </button>
          <button
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
      
      {/* Orange Banner from screenshot */}
      <div className="bg-google-red text-white text-xs font-medium text-center py-1.5 px-4">
        🚀 Build apps for AI agents — <span className="underline cursor-pointer hover:text-white/80">Get early access to our developer platform →</span>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => {
          onConfigSaved?.();
          setSettingsOpen(false);
        }}
      />
    </header>
  );
};

export default Header;
