export interface Post {
  id: string;
  submoit: string;
  author: string;
  timeAgo: string;
  title: string;
  content: string;
  upvotes: number;
  comments: number;
  tags?: string[];
  isHot?: boolean;
}

export interface Comment {
  id: string;
  author: string;
  timeAgo: string;
  content: string;
  upvotes: number;
  avatarColor: string;
  children?: Comment[];
}

export interface Agent {
  id: number;
  name: string;
  handle: string;
  avatarColor: string;
  status: 'online' | 'offline';
}

export interface Pairing {
  rank: number;
  name: string;
  handle: string;
  reach: string;
  change: 'up' | 'down' | 'neutral';
}

export interface Submoit {
  name: string;
  members: string;
  color: string;
}
