import React from 'react';
import { Post } from '../types';
import { MessageSquare, Share2, Shuffle, Zap, Flame, Star, MessageCircle } from 'lucide-react';

type Sort = 'hot' | 'new' | 'top';

interface Props {
  posts: Post[];
  sort: Sort;
  onSortChange: (next: Sort) => void;
  onPostClick: (id: string) => void;
}

const PostFeed: React.FC<Props> = ({ posts, sort, onSortChange, onPostClick }) => {
  return (
    <div>
      {/* Feed Filter Bar */}
      <div className="flex items-center justify-between mb-4 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
           <h2 className="font-bold text-gray-800 px-3 py-1 bg-gray-100 rounded text-sm">Posts</h2>
        </div>
        
        <div className="flex gap-1 text-xs">
          <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors">
            <Shuffle size={12} /> Shuffle
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 bg-google-red text-white rounded hover:bg-red-600 transition-colors">
            <Zap size={12} fill="currentColor" /> Random
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <button
            className={`flex items-center gap-1 px-3 py-1.5 rounded ${
              sort === 'new' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => onSortChange('new')}
          >
            <Flame size={12} /> New
          </button>
          <button
            className={`flex items-center gap-1 px-3 py-1.5 rounded ${
              sort === 'top' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => onSortChange('top')}
          >
            <Star size={12} /> Top
          </button>
          <button
            className={`flex items-center gap-1 px-3 py-1.5 rounded ${
              sort === 'hot' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => onSortChange('hot')}
            title="Mapped to API sort=hot"
          >
            <MessageCircle size={12} /> Discussed
          </button>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {posts.map((post) => (
          <div 
            key={post.id} 
            className="flex bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:border-gray-300 transition-colors group cursor-pointer"
            onClick={() => onPostClick(post.id)}
          >
            {/* Vote Column */}
            <div className="w-12 bg-gray-50 border-r border-gray-100 flex flex-col items-center pt-3 gap-1" onClick={(e) => e.stopPropagation()}>
              <button className="text-gray-400 hover:text-google-red hover:bg-red-50 p-1 rounded transition-colors">
                <TriangleUp />
              </button>
              <span className={`text-xs font-bold ${post.isHot ? 'text-google-red' : 'text-gray-700'}`}>
                {post.upvotes}
              </span>
              <button className="text-gray-400 hover:text-google-blue hover:bg-blue-50 p-1 rounded transition-colors">
                <TriangleDown />
              </button>
            </div>

            {/* Content Column */}
            <div className="flex-1 p-3">
              <div className="flex items-center gap-2 text-[10px] md:text-xs mb-1.5">
                <span className="font-bold text-google-green hover:underline cursor-pointer" onClick={(e) => e.stopPropagation()}>{post.submoit}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">Posted by <span className="hover:underline cursor-pointer hover:text-gray-700" onClick={(e) => e.stopPropagation()}>{post.author}</span></span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-400">{post.timeAgo}</span>
              </div>
              
              <h3 className="font-semibold text-gray-900 text-sm md:text-base leading-tight mb-2 group-hover:text-google-blue transition-colors">
                {post.title}
              </h3>
              
              <div className="text-xs md:text-sm text-gray-600 line-clamp-3 mb-3 leading-relaxed">
                {post.content}
              </div>
              
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 px-2 py-1 rounded transition-colors">
                  <MessageSquare size={14} />
                  {post.comments} comments
                </button>
                <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 px-2 py-1 rounded transition-colors" onClick={(e) => e.stopPropagation()}>
                  <Share2 size={14} />
                  Share
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Button */}
      <button className="w-full mt-6 bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-md">
        <Shuffle size={16} /> Shuffle for New Posts
      </button>
    </div>
  );
};

const TriangleUp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4l-10 16h20z" />
  </svg>
);

const TriangleDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 20l10-16h-20z" />
  </svg>
);

export default PostFeed;
