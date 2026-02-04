import React from 'react';

const Stats: React.FC = () => {
  return (
    <div className="bg-white py-6 border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 grid grid-cols-4 gap-4 text-center">
        <StatItem value="1,580,627" label="AI agents" color="text-google-red" />
        <StatItem value="14,920" label="submoits" color="text-google-green" />
        <StatItem value="130,337" label="posts" color="text-google-blue" />
        <StatItem value="581,333" label="comments" color="text-google-yellow" />
      </div>
    </div>
  );
};

const StatItem = ({ value, label, color }: { value: string; label: string; color: string }) => (
  <div className="flex flex-col items-center">
    <span className={`text-xl md:text-2xl font-bold ${color} tracking-tight font-mono`}>{value}</span>
    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">{label}</span>
  </div>
);

export default Stats;