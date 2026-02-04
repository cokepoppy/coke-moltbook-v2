import React, { useMemo, useState } from 'react';
import { Post, Comment } from '../types';
import { ArrowLeft, MessageSquare, Share2, MoreHorizontal, Filter, ArrowBigUp, ArrowBigDown, Flag, Bookmark } from 'lucide-react';
import { initialFromLabel } from '../lib';

interface Props {
  post: Post;
  onBack: () => void;
  comments: Comment[];
  commentsLoading: boolean;
  commentsError: string | null;
  onSubmitComment: (content: string) => Promise<void>;
}

const PostDetail: React.FC<Props> = ({ post, onBack, comments, commentsLoading, commentsError, onSubmitComment }) => {
  const [commentDraft, setCommentDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentSubmitError, setCommentSubmitError] = useState<string | null>(null);
  const canSubmit = useMemo(() => commentDraft.trim().length > 0, [commentDraft]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Back Header */}
      <div className="flex items-center gap-2 mb-4 text-gray-500 hover:text-gray-800 cursor-pointer w-fit transition-colors" onClick={onBack}>
        <ArrowLeft size={20} />
        <span className="font-medium text-sm">Back to feed</span>
      </div>

      {/* Main Post Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="flex">
          {/* Vote Sidebar */}
          <div className="w-14 bg-gray-50 border-r border-gray-100 flex flex-col items-center pt-4 gap-2">
            <button className="text-gray-400 hover:text-google-red hover:bg-red-50 p-1.5 rounded transition-colors">
              <TriangleUp size={24} />
            </button>
            <span className={`font-bold ${post.isHot ? 'text-google-red' : 'text-gray-800'}`}>
              {post.upvotes}
            </span>
            <button className="text-gray-400 hover:text-google-blue hover:bg-blue-50 p-1.5 rounded transition-colors">
              <TriangleDown size={24} />
            </button>
          </div>

          {/* Post Content */}
          <div className="flex-1 p-4 md:p-6">
            <div className="flex items-center gap-2 text-xs mb-3">
              <div className="w-5 h-5 bg-google-green rounded-full flex items-center justify-center text-white font-bold text-[10px]">m/</div>
              <span className="font-bold text-gray-900 hover:underline cursor-pointer">{post.submoit}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">Posted by <span className="hover:underline cursor-pointer font-medium text-gray-700">{post.author}</span></span>
              <span className="text-gray-400">{post.timeAgo}</span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 leading-tight">
              {post.title}
            </h1>

            <div className="text-gray-800 text-sm md:text-base leading-relaxed whitespace-pre-line mb-6 font-light">
              {post.content || <span className="text-gray-500">No content</span>}
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
              <button className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:bg-gray-100 px-3 py-2 rounded transition-colors">
                <MessageSquare size={16} />
                {post.comments} Comments
              </button>
              <button className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:bg-gray-100 px-3 py-2 rounded transition-colors">
                <Share2 size={16} />
                Share
              </button>
              <button className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:bg-gray-100 px-3 py-2 rounded transition-colors">
                <Bookmark size={16} />
                Save
              </button>
              <div className="flex-1"></div>
              <button className="text-gray-400 hover:bg-gray-100 p-2 rounded">
                 <MoreHorizontal size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comment Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-4 md:p-6">
        
        {/* Sort / Filter */}
        <div className="flex items-center justify-between mb-6">
           <span className="font-bold text-gray-800 text-sm">{post.comments} Comments</span>
           <button className="flex items-center gap-1 text-xs font-medium text-google-blue hover:text-blue-700">
             Sort by: Best <Filter size={12} />
           </button>
        </div>

        {/* Add Comment Input */}
        <div className="flex gap-3 mb-8">
           <div className="w-8 h-8 rounded-full bg-google-gray flex-shrink-0"></div>
           <div className="flex-1">
             <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-google-blue/20 focus-within:border-google-blue transition-all">
               <textarea 
                  className="w-full p-3 text-sm focus:outline-none min-h-[80px] resize-y bg-gray-50 focus:bg-white"
                  placeholder="What are your thoughts?"
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
               ></textarea>
               <div className="bg-gray-50 px-3 py-2 flex justify-between items-center border-t border-gray-100">
                  <div className="flex gap-2 text-gray-400">
                     <span className="text-xs font-bold cursor-pointer hover:text-gray-600">B</span>
                     <span className="text-xs font-italic cursor-pointer hover:text-gray-600 italic">i</span>
                     <span className="text-xs cursor-pointer hover:text-gray-600 underline">u</span>
                  </div>
                  <button
                    className={`text-white text-xs font-bold px-4 py-1.5 rounded-full transition-colors ${
                      canSubmit && !commentBusy ? "bg-google-blue hover:bg-blue-700" : "bg-gray-300 cursor-not-allowed"
                    }`}
                    onClick={async () => {
                      if (!canSubmit || commentBusy) return;
                      const c = commentDraft.trim();
                      setCommentSubmitError(null);
                      setCommentBusy(true);
                      setCommentDraft("");
                      try {
                        await onSubmitComment(c);
                      } catch (e: any) {
                        setCommentDraft(c);
                        setCommentSubmitError(String(e?.message ?? e));
                      } finally {
                        setCommentBusy(false);
                      }
                    }}
                    disabled={!canSubmit || commentBusy}
                  >
                    {commentBusy ? "Posting…" : "Comment"}
                  </button>
               </div>
             </div>
             {commentSubmitError && <div className="text-xs text-google-red mt-2">{commentSubmitError}</div>}
           </div>
        </div>

        <div className="h-px bg-gray-100 mb-6"></div>

        {/* Comment List */}
        <div className="space-y-6">
          {commentsError && <div className="text-xs text-google-red">{commentsError}</div>}
          {commentsLoading && <div className="text-xs text-gray-500">Loading comments…</div>}
          {!commentsLoading && !commentsError && comments.length === 0 && (
            <div className="text-xs text-gray-500">No comments yet.</div>
          )}
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      </div>
    </div>
  );
};

const CommentItem: React.FC<{ comment: Comment; isChild?: boolean }> = ({ comment, isChild = false }) => {
  return (
    <div className={`flex gap-3 ${isChild ? 'mt-4' : ''}`}>
      <div className="flex flex-col items-center gap-1">
        <div className={`w-8 h-8 rounded-full ${comment.avatarColor} text-white flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0`}>
          {initialFromLabel(comment.author)}
        </div>
        {!isChild && <div className="w-0.5 flex-1 bg-gray-100 my-2 group-hover:bg-gray-200 transition-colors"></div>}
      </div>
      
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-gray-900 cursor-pointer hover:underline">{comment.author}</span>
          <span className="text-[10px] text-gray-500">{comment.timeAgo}</span>
        </div>
        
        <div className="text-sm text-gray-800 leading-relaxed mb-2">
          {comment.content}
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-1 text-gray-500">
              <button className="hover:text-google-red hover:bg-red-50 p-1 rounded"><ArrowBigUp size={16} /></button>
              <span className="text-xs font-bold">{comment.upvotes}</span>
              <button className="hover:text-google-blue hover:bg-blue-50 p-1 rounded"><ArrowBigDown size={16} /></button>
           </div>
           <button className="text-xs font-medium text-gray-500 hover:bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
             <MessageSquare size={12} /> Reply
           </button>
           <button className="text-xs font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1">
             Share
           </button>
           <button className="text-xs font-medium text-gray-400 hover:text-gray-600 flex items-center gap-1">
             <Flag size={12} />
           </button>
        </div>

        {comment.children && comment.children.length > 0 && (
          <div className="mt-2">
            {comment.children.map(child => (
              <CommentItem key={child.id} comment={child} isChild={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TriangleUp = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4l-10 16h20z" />
  </svg>
);

const TriangleDown = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 20l10-16h-20z" />
  </svg>
);

export default PostDetail;
