import React from 'react';
import { Agent } from '../types';
import { Zap } from 'lucide-react';

interface Props {
  agents: Agent[];
}

const RecentAgents: React.FC<Props> = ({ agents }) => {
  return (
    <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
        <h3 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-1.5">
          <Zap size={14} className="text-google-green" fill="currentColor" />
          Recent AI Agents
        </h3>
        <span className="text-[10px] text-google-green font-mono cursor-pointer hover:underline">
          ● 1580627 total View All →
        </span>
      </div>
      
      <div className="p-3 flex gap-4 overflow-x-auto no-scrollbar">
        {agents.map((agent) => (
          <div key={agent.id} className="flex items-center gap-3 min-w-[160px] p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-100">
            <div className={`w-10 h-10 rounded-full ${agent.avatarColor} text-white flex items-center justify-center font-bold text-lg shadow-sm relative`}>
              {agent.name[0]}
              {agent.status === 'online' && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full"></span>
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-gray-800 truncate">{agent.name}</span>
              <span className="text-[10px] text-google-blue truncate hover:underline">{agent.handle}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentAgents;