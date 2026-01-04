import React, { useState, useEffect } from 'react';
import {
  MessageSquare, ThumbsUp, UserPlus, MapPin, Calendar, Activity,
  TrendingUp, Rocket, Trophy, Share2, ImageIcon, BarChart2, Star,
  Send, MoreHorizontal, Heart
} from 'lucide-react';
import { X, Plus, Trash2 } from 'lucide-react';
import { uploadImage } from '../services/cdnService';
import { PostType } from '../utils/communityTypes';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';

// Simple notification sound (Trink) generated with Web Audio API
const playNotificationSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // "Trink" sound parameters (high pitch sine wave with decay)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, ctx.currentTime); 
        
        // Volume envelope
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02); // Attack
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5); // Decay

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.6);
    } catch (e) {
        console.error('Audio play failed', e);
    }
}; 
import { 
  getPosts, 
  createPost, 
  toggleLikePost, 
  checkUserLike, 
  addComment, 
  getComments,
  votePoll,
  checkUserVote,
  deletePost,
  deleteComment
} from '../services/communityService';

// Helper for timestamp formatting
const formatTimestamp = (date) => {
  if (!date) return '';
  const now = new Date();
  const postDate = new Date(date);
  const diff = now.getTime() - postDate.getTime(); // Use getTime() for milliseconds
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} gün önce`;
  if (hours > 0) return `${hours} saat önce`;
  if (minutes > 0) return `${minutes} dk önce`;
  return 'Az önce';
};

// --- MOCK DATA ---

// Helper to extract trends locally from posts
const extractTrends = (posts) => {
  const hashtagCounts = {};
  posts.forEach(post => {
    // Regex to find #hashtags (simple version)
    const matches = post.content?.match(/#[a-zA-Z0-9_ğüşıöçĞÜŞİÖÇ]+/g);
    if (matches) {
      matches.forEach(tag => {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      });
    }
    // Also count type-based trends if desired, e.g. "Anket"
  });

  const sortedTrends = Object.entries(hashtagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([tag, count], index) => ({
      id: index,
      tag,
      count: count // or format like '12k' if huge
    }));
  
  if (sortedTrends.length === 0) {
      // Fallbacks if no tags found
      return [
        { id: 1, tag: '#Sahada', count: 'Pinned' },
        { id: 2, tag: '#Futbol', count: 'Pinned' },
        { id: 3, tag: '#MaçSonucu', count: 'Pinned' }
      ];
  }
  return sortedTrends;
};

// ... WEEKLY_MVPS (Keep static for now as it requires complex match data) ...

const WEEKLY_MVPS = [
  { id: 1, name: 'Burak Yılmaz', team: 'FC Kadıköy', goals: 12, matches: 8, avatar: 'https://ui-avatars.com/api/?name=Burak+Y&background=0D8ABC&color=fff' },
  { id: 2, name: 'Volkan Demirel', team: 'Fenerbahçe', goals: 0, matches: 8, avatar: 'https://ui-avatars.com/api/?name=Volkan+D&background=FF6B35&color=fff' },
  { id: 3, name: 'Alex de Souza', team: 'Efsaneler', goals: 15, matches: 6, avatar: 'https://ui-avatars.com/api/?name=Alex+D&background=FCB900&color=fff' },
];

// --- COMPONENT: POST CARD ---
// --- COMPONENT: POST CARD ---
const PostCard = ({ post, isLiked, commentsOpen, toggleLike, toggleComments, handleShare, currentUser, commentInputs, setCommentInputs, handleCreateComment, postComments, votedPolls, handleVote, handleDeletePost, handleDeleteComment }) => {
    const isAuthor = currentUser?.uid === post.author.id;

    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5 hover:shadow-md transition-shadow relative">
        {/* Author Header */}
        <div className="flex justify-between items-start mb-4">
          <Link to={`/profile/${post.author.id}`} className="flex gap-3 group">
            <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full border border-gray-100" />
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-gray-900 group-hover:text-green-600 transition-colors">{post.author.name}</h4>
                {post.author.badges?.map((badge, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase">
                    {badge}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500">{formatTimestamp(post.createdAt)}</p>
            </div>
          </Link>

          {/* Post Type Badge & Options */}
          <div className="flex items-center gap-2">
            {post.type === PostType.POLL && <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">ANKET</span>}
            {post.type === PostType.PLAYER_SEARCH && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">OYUNCU ARANIYOR</span>}
            {post.type === PostType.REVIEW && <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-1 rounded">İNCELEME</span>}
            {post.type === PostType.GENERAL && <span className="text-xs font-bold text-gray-600 bg-gray-50 px-2 py-1 rounded">PAYLAŞIM</span>}
            
            {isAuthor && (
                <button 
                    onClick={() => handleDeletePost(post.id)} 
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Paylaşımı Sil"
                >
                    <Trash2 size={18} />
                </button>
            )}
            {!isAuthor && (
                 <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal size={20} /></button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h3>

          {post.content && (
            <p className="text-gray-700 leading-relaxed mb-3 whitespace-pre-wrap">{post.content}</p>
          )}

          {post.type === PostType.POLL && post.pollOptions && (
            <div className="space-y-2 mt-3">
              {post.pollOptions.map((option, idx) => {
                 const userVotedThis = votedPolls?.[post.id] === idx;
                 const anyVoted = votedPolls?.[post.id] !== undefined;
                 
                 return (
                <div 
                    key={idx} 
                    onClick={() => !anyVoted && handleVote(post.id, idx)}
                    className={`relative cursor-pointer group ${!anyVoted ? 'hover:opacity-90' : ''}`}
                >
                  <div className="flex justify-between text-sm font-medium mb-1 z-10 relative">
                    <span className={`transition-colors ${userVotedThis ? 'text-green-700 font-bold' : 'text-gray-700'}`}>
                        {option.label} {userVotedThis && '(Senin Oyun)'}
                    </span>
                    <span>{option.percentage}%</span>
                  </div>
                  <div className={`w-full bg-gray-100 rounded-lg h-8 overflow-hidden relative border ${userVotedThis ? 'border-green-500' : 'border-transparent'}`}>
                    <div
                      className={`h-full opacity-80 transition-all duration-500 ${userVotedThis ? 'bg-green-500' : 'bg-gray-300'}`}
                      style={{ width: `${option.percentage}%` }}
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-600 z-20">
                      {option.votes} oy
                    </span>
                  </div>
                </div>
              )})}
            </div>
          )}

          {post.image && (
            <div className="mb-3">
              <img src={post.image} alt="Post content" className="rounded-xl w-full object-cover max-h-96 border border-gray-100" />
            </div>
          )}
          
          {post.location && (
               <div className="flex items-center gap-1.5 text-blue-600 text-xs font-bold mb-2 bg-blue-50 w-fit px-2 py-1 rounded">
                   <MapPin size={12} /> {post.location}
               </div>
          )}

          {/* PLAYER SEARCH RENDER */}
          {post.type === PostType.PLAYER_SEARCH && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mt-3">
              <div className="flex items-center gap-2 mb-3 text-red-700 font-bold">
                <Activity size={18} />
                <span>Acil Oyuncu Lazım! <span className="text-2xl">⚡</span></span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div className="flex flex-col">
                  <span className="text-gray-500 mb-1">Pozisyon</span>
                  <span className="font-bold text-gray-900">{post.positionNeeded}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 mb-1">Mekan</span>
                  <span className="font-bold text-gray-900 flex items-center gap-1">
                    <MapPin size={14} /> {post.location}
                  </span>
                </div>
                <div className="flex flex-col col-span-2">
                  <span className="text-gray-500 mb-1">Zaman</span>
                  <span className="font-bold text-gray-900 flex items-center gap-1">
                    <Calendar size={14} /> {post.matchDate}
                  </span>
                </div>
              </div>

              <Link to="/find-player" className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-lg shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all flex items-center justify-center gap-2">
                <Rocket size={18} fill="currentColor" /> Ben Gelirim!
              </Link>
            </div>
          )}

          {/* SCOREBOARD RENDER */}
          {post.type === PostType.SCOREBOARD && post.homeTeam && (
            <div className="bg-black text-white rounded-xl overflow-hidden mt-3 relative">
              {post.image && (
                <div className="absolute inset-0 opacity-40">
                  <img src={post.image} className="w-full h-full object-cover" alt="Match bg" />
                </div>
              )}
              <div className="relative z-10 p-6 text-center">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-xl">{post.homeTeam}</span>
                  <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20">
                    <span className="text-3xl font-black text-green-400 tracking-widest">{post.score}</span>
                  </div>
                  <span className="font-bold text-xl">{post.awayTeam}</span>
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-xs font-bold border border-yellow-500/30">
                    <Trophy size={12} /> MVP: {post.mvp}
                  </div>
                  <p className="text-xs text-gray-400 mt-2 flex items-center justify-center gap-1">
                    <MapPin size={10} /> {post.facilityName}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex gap-4">
            <button
              onClick={() => toggleLike(post.id)}
              className={`flex items-center gap-1.5 transition-colors text-sm font-medium ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
            >
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} /> <span>{post.likes}</span>
            </button>
            <button
              onClick={() => toggleComments(post.id)}
              className={`flex items-center gap-1.5 transition-colors text-sm font-medium ${commentsOpen ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'}`}
            >
              <MessageSquare size={18} /> <span>{post.comments} Yorum</span>
            </button>
          </div>
          <button
            onClick={() => handleShare(post.id)}
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors text-sm font-medium"
          >
            <Share2 size={18} /> <span>Paylaş</span>
          </button>
        </div>

        {/* Comment Section (Collapsible) */}
        {commentsOpen && (
          <div className="mt-4 pt-4 border-t border-gray-50 bg-gray-50/50 rounded-b-xl -mx-5 -mb-5 px-5 pb-5">
            <div className="flex gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} className="w-full h-full object-cover" />
                ) : (<UserPlus className="p-1.5" />)}
              </div>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-green-500 outline-none"
                  placeholder="Bir yorum yaz..."
                  value={commentInputs[post.id] || ''}
                  onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateComment(post.id)}
                />
                <button
                  onClick={() => handleCreateComment(post.id)}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
            {/* Real Comments */}
            <div className="space-y-3 pl-11">
              {postComments[post.id]?.slice(0, 10).map(comment => {
                  const canDelete = currentUser?.uid === comment.authorId || currentUser?.uid === post.author.id;
                  return (
                <div key={comment.id} className="flex items-start justify-between group/comment text-sm">
                  <div className="flex items-start gap-2">
                      <img src={comment.authorAvatar || `https://ui-avatars.com/api/?name=${comment.authorName}&background=random`} alt={comment.authorName} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                      <div>
                        <span className="font-bold text-gray-900 mr-2">{comment.authorName}</span>
                        <span className="text-gray-600">{comment.text}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{formatTimestamp(comment.createdAt)}</p>
                      </div>
                  </div>
                  {canDelete && (
                    <button 
                        onClick={() => handleDeleteComment(post.id, comment.id)} 
                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover/comment:opacity-100 transition-opacity p-1"
                        title="Yorumu sil"
                    >
                        <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )})}
              {postComments[post.id]?.length > 10 && (
                  <Link to={`/post/${post.id}`} className="block text-center text-sm text-green-600 font-bold mt-2 hover:underline">
                      Tüm {postComments[post.id].length} yorumu gör...
                  </Link>
              )}
              {postComments[post.id]?.length === 0 && (
                <p className="text-sm text-gray-500 text-center">Henüz yorum yok. İlk yorumu sen yap!</p>
              )}
          </div>
        </div>
      )}
    </div>
    );
};

import Header from '../components/Header';
import Footer from '../components/Footer';

// ... (existing imports and mock data)

const Community = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('ALL');
  const [posts, setPosts] = useState([]); // Dynamic posts
  const [loading, setLoading] = useState(true);

  // Create Post State
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  // Attachment State
  const [selectedImage, setSelectedImage] = useState(null);
  const [isPollMode, setIsPollMode] = useState(false);
  const [pollOptions, setPollOptions] = useState([{ text: '' }, { text: '' }]);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationText, setLocationText] = useState('');

  // Interaction State
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [openComments, setOpenComments] = useState(new Set());
  const [commentInputs, setCommentInputs] = useState({});
  const [postComments, setPostComments] = useState({}); // Store comments for each post: { [postId]: [comments] }
  const [votedPolls, setVotedPolls] = useState({}); // { [postId]: optionIndex }

  const [trendingTopics, setTrendingTopics] = useState([]);

  // Load Posts
  useEffect(() => {
    fetchPosts();
  }, [currentUser]); // Re-fetch if currentUser changes to update like status

  const fetchPosts = async () => {
    setLoading(true);
    const result = await getPosts(50); // Fetch last 50 posts
    if (result.success) {
      const sortedPosts = result.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPosts(sortedPosts);
      
      // Calculate Trends
      setTrendingTopics(extractTrends(sortedPosts));

      if (currentUser) {
        const newLikedPosts = new Set();
        const newVotedPolls = {};

        // Parallel check for likes and votes
        const checks = sortedPosts.map(async post => {
             // Check Like
             const likeCheck = await checkUserLike(post.id, currentUser.uid);
             if (likeCheck.success && likeCheck.liked) {
                 newLikedPosts.add(post.id);
             }
             
             // Check Vote (if POLL)
             if (post.type === PostType.POLL) {
                 const voteCheck = await checkUserVote(post.id, currentUser.uid);
                 if (voteCheck.success && voteCheck.hasVoted) {
                     newVotedPolls[post.id] = voteCheck.optionIndex;
                 }
             }
        });

        await Promise.all(checks);

        setLikedPosts(newLikedPosts);
        setVotedPolls(newVotedPolls);
      } else {
        setLikedPosts(new Set()); // Clear likes if no user
        setVotedPolls({});
      }
    }
    setLoading(false);
  };

  // Filter Logic
  const filteredPosts = React.useMemo(() => {
    if (activeTab === 'ALL') return posts;
    if (activeTab === 'RESULTS') return posts.filter(p => p.type === PostType.SCOREBOARD);
    if (activeTab === 'POLLS') return posts.filter(p => p.type === PostType.POLL);
    if (activeTab === 'REVIEWS') return posts.filter(p => p.type === PostType.REVIEW);
    return posts;
  }, [posts, activeTab]);

  // --- ACTIONS ---

  const handleImageSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
        setSelectedImage(e.target.files[0]);
    }
  };

  const handlePollOptionChange = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index].text = value;
    setPollOptions(newOptions);
  };

  const addPollOption = () => {
    if (pollOptions.length < 5) {
        setPollOptions([...pollOptions, { text: '' }]);
    }
  };

  const removePollOption = (index) => {
      if (pollOptions.length > 2) {
          const newOptions = pollOptions.filter((_, i) => i !== index);
          setPollOptions(newOptions);
      }
  };

  const handlePostSubmit = async () => {
    if (!newPostContent.trim() && !selectedImage && !isPollMode) return;

    if (!currentUser) {
        toast.error('Paylaşım yapmak için giriş yapmalısınız.');
        playNotificationSound();
        return;
    }

    setIsPosting(true);
    let imageUrl = null;
    let finalPostType = PostType.GENERAL;
    let finalPollOptions = null;

    // 1. Upload Image
    if (selectedImage) {
        try {
            const uploadResult = await uploadImage(selectedImage, 'community', currentUser.uid); 
            if (uploadResult.success) {
                imageUrl = uploadResult.data?.url || uploadResult.data; 
            } else {
                 console.error('Image upload failed:', uploadResult.error);
                 imageUrl = URL.createObjectURL(selectedImage);
            }
        } catch (error) {
            console.error('Upload Error', error);
        }
    }

    // 2. Prepare Poll Data
    if (isPollMode) {
        const validOptions = pollOptions.filter(o => o.text.trim() !== '');
        if (validOptions.length < 2) {
            toast.error('Anket için en az 2 seçenek girmelisiniz.');
            playNotificationSound();
            setIsPosting(false);
            return;
        }
        finalPostType = PostType.POLL;
        finalPollOptions = validOptions.map(o => ({ 
            label: o.text, 
            votes: 0, 
            percentage: 0 
        }));
    }

    // 3. Construct Post Object
    const newPostData = {
        type: finalPostType,
        author: {
            id: currentUser.uid,
            name: currentUser.displayName || 'Kullanıcı',
            avatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.email}&background=random`,
            badges: ['Üye'] 
        },
        title: isPollMode ? 'Anket: ' + newPostContent : (newPostContent.length > 20 ? newPostContent.substring(0, 20) + '...' : 'Yeni Paylaşım'),
        content: newPostContent,
        image: imageUrl,
        pollOptions: finalPollOptions,
        location: showLocationInput ? locationText : null,
    };

    const result = await createPost(newPostData);

    if (result.success) {
        setNewPostContent('');
        setSelectedImage(null);
        setIsPollMode(false);
        setPollOptions([{ text: '' }, { text: '' }]);
        setShowLocationInput(false);
        setLocationText('');
        
        // Refresh posts or prepend locally
        fetchPosts(); 
        setActiveTab('ALL');
        toast.success('Paylaşım gönderildi! 🚀');
        playNotificationSound();
    } else {
        toast.error('Paylaşım yapılamadı: ' + result.error);
        playNotificationSound();
    }
    setIsPosting(false);
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Bu paylaşımı silmek istediğinize emin misiniz?')) return;

    // Optimistic Update
    setPosts(prev => prev.filter(p => p.id !== postId));

    const result = await deletePost(postId);
    if (result.success) {
         toast.success('Paylaşım silindi 🗑️');
         playNotificationSound();
    } else {
         toast.error('Silme işlemi başarısız oldu: ' + result.error);
         playNotificationSound(); // Error sound? keeping same for now or could differ
         fetchPosts(); // Revert
    }
  };

  const toggleLike = async (postId) => {
    if (!currentUser) {
        toast.error('Beğenmek için giriş yapmalısınız.');
        playNotificationSound();
        return;
    }

    // Optimistic UI Update
    const isLiked = likedPosts.has(postId);
    setLikedPosts(prev => {
      const newSet = new Set(prev);
      if (isLiked) newSet.delete(postId);
      else newSet.add(postId);
      return newSet;
    });

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, likes: isLiked ? p.likes - 1 : p.likes + 1 };
      }
      return p;
    }));

    // Server Update
    const result = await toggleLikePost(postId, currentUser.uid);
    if (!result.success) {
        // Revert on failure
        // For simplicity, we'll just log the error. A more robust solution would revert the UI.
        console.error('Like failed', result.error);
        // Revert optimistic update if server call fails
        setLikedPosts(prev => {
            const newSet = new Set(prev);
            if (isLiked) newSet.add(postId); // If it was liked, add it back
            else newSet.delete(postId); // If it was not liked, remove it
            return newSet;
        });
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                return { ...p, likes: isLiked ? p.likes + 1 : p.likes - 1 };
            }
            return p;
        }));
    }
  };

  const toggleComments = async (postId) => {
    const isOpen = openComments.has(postId);
    
    setOpenComments(prev => {
      const newSet = new Set(prev);
      if (isOpen) newSet.delete(postId);
      else newSet.add(postId);
      return newSet;
    });

    if (!isOpen) { // If opening
        // Fetch comments
        const result = await getComments(postId);
        if (result.success) {
            setPostComments(prev => ({ ...prev, [postId]: result.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) }));
        }
    }
  };

  const handleShare = (postId) => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url).then(() => {
        toast.success('Link kopyalandı 📋');
        playNotificationSound();
    }).catch(() => {
        toast.error('Link kopyalanamadı ❌');
    });
  };

  const handleVote = async (postId, optionIndex) => {
    if (!currentUser) {
        toast.error('Oy kullanmak için giriş yapmalısınız.');
        playNotificationSound();
        return;
    }
    if (votedPolls[postId] !== undefined) {
        toast.error('Zaten oy kullandınız.');
        return;
    }
    
    // Optimistic Update
    setVotedPolls(prev => ({ ...prev, [postId]: optionIndex }));
    const oldPosts = [...posts];
    
    setPosts(prev => prev.map(p => {
        if (p.id === postId) {
            const newOptions = p.pollOptions.map(o => ({...o})); // deep copy options
            newOptions[optionIndex].votes = (newOptions[optionIndex].votes || 0) + 1;
            
            // Recalculate percentages
            const total = newOptions.reduce((acc, c) => acc + (c.votes || 0), 0);
            newOptions.forEach(o => o.percentage = total === 0 ? 0 : Math.round((o.votes / total) * 100));
            return { ...p, pollOptions: newOptions };
        }
        return p;
    }));

    const result = await votePoll(postId, optionIndex, currentUser.uid);
    if (!result.success) {
        toast.error('Oy kullanılamadı: ' + result.error);
        // Revert
        setVotedPolls(prev => {
            const copy = { ...prev };
            delete copy[postId];
            return copy;
        });
        setPosts(oldPosts);
    }
  };

  const handleCreateComment = async (postId) => {
    if (!currentUser) {
        toast.error('Yorum yapmak için giriş yapmalısınız.');
        playNotificationSound();
        return;
    }
    
    const text = commentInputs[postId];
    if (!text?.trim()) return;

    // Optimistic Update
    const newComment = {
        id: 'temp-' + Date.now(), // Temporary ID
        text: text,
        authorName: currentUser.displayName || 'Kullanıcı',
        authorAvatar: currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.email}&background=random`,
        createdAt: new Date().toISOString() // Use ISO string for consistency
    };
    
    setPostComments(prev => ({
        ...prev,
        [postId]: [newComment, ...(prev[postId] || [])]
    }));
    
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: p.comments + 1 } : p));
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));

    // Server Update
    const commentData = {
        text: text,
        authorId: currentUser.uid,
        authorName: currentUser.displayName || 'Kullanıcı',
        authorAvatar: currentUser.photoURL 
    };
    
    const result = await addComment(postId, commentData);
    if (!result.success) {
        console.error('Comment failed', result.error);
        // Revert optimistic update if server call fails
        setPostComments(prev => ({
            ...prev,
            [postId]: (prev[postId] || []).filter(c => c.id !== newComment.id)
        }));
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: p.comments - 1 } : p));
    } else {
        // Replace temporary comment with actual one from server
        setPostComments(prev => ({
            ...prev,
            [postId]: (prev[postId] || []).map(c => c.id === newComment.id ? { ...c, id: result.id, createdAt: result.createdAt || c.createdAt } : c)
        }));
    }
  }

  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm('Yorumu silmek istediğinize emin misiniz?')) return;

    // Optimistic Update
    const oldComments = postComments[postId];
    setPostComments(prev => ({
        ...prev,
        [postId]: prev[postId].filter(c => c.id !== commentId)
    }));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: p.comments - 1 } : p));

    const result = await deleteComment(postId, commentId);
    if (result.success) {
         toast.success('Yorum silindi 🗑️');
         playNotificationSound();
    } else {
         toast.error('Yorum silinemedi: ' + result.error);
         playNotificationSound();
         // Revert
         setPostComments(prev => ({ ...prev, [postId]: oldComments }));
         setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: p.comments + 1 } : p));
    }
  };

  // Dynamic Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'Tünaydın';
    if (hour < 22) return 'İyi Akşamlar';
    return 'İyi Geceler';
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <Toaster position="top-center" reverseOrder={false} />
      <Header />
      
      {/* EXCLUSIVE COMMUNITY HERO HEADER */}
      <div className="bg-[#0f172a] text-white relative overflow-hidden">
         {/* Dynamic Background Elements */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-green-900/40 to-transparent pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
        
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 mb-4 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full text-green-400 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Sporun Kalbi Burada Atıyor
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight">
                {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">{currentUser?.displayName?.split(' ')[0] || 'Sporcu'}</span> 👋
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed">
                Meydan'da maç sonuçlarını paylaş, anketlere katıl, kendine rakip veya takım arkadaşı bul. Spor dünyasının nabzını tutan 
                <span className="text-white font-bold mx-1">15.000+</span> 
                sporcu ile etkileşime geç.
              </p>
            </div>

            {/* Live Stats Cards within Header */}
            <div className="flex gap-4">
               <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center min-w-[120px] hover:bg-white/10 transition-colors cursor-default">
                  <span className="text-3xl font-black text-white mb-1">142</span>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">Yeni İlan</span>
               </div>
               <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center min-w-[120px] hover:bg-white/10 transition-colors cursor-default">
                  <span className="text-3xl font-black text-green-400 mb-1">28</span>
                  <span className="text-xs text-green-400/80 font-bold uppercase tracking-wide">Canlı Maç</span>
               </div>
               <div className="bg-white/5 backdrop-blur-lg border border-white/10 p-4 rounded-2xl flex flex-col items-center justify-center min-w-[120px] hover:bg-white/10 transition-colors cursor-default">
                   <div className="flex -space-x-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-red-500 border-2 border-[#0f172a]"></div>
                      <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-[#0f172a]"></div>
                      <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-[#0f172a]"></div>
                   </div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wide">850 Online</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 flex-grow">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* --- LEFT SIDEBAR (FILTERS) --- */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-24">
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab('ALL')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'ALL' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${activeTab === 'ALL' ? 'bg-green-500' : 'bg-gray-300'}`} />
                  Hepsi
                </button>
                <button
                  onClick={() => setActiveTab('RESULTS')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'RESULTS' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Trophy size={18} className={activeTab === 'RESULTS' ? 'text-green-600' : 'text-gray-400'} />
                  Maç Sonuçları
                </button>
                <button
                  onClick={() => setActiveTab('POLLS')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'POLLS' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <BarChart2 size={18} className={activeTab === 'POLLS' ? 'text-green-600' : 'text-gray-400'} />
                  Tahmin & Anketler
                </button>
                <button
                  onClick={() => setActiveTab('REVIEWS')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'REVIEWS' ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Star size={18} className={activeTab === 'REVIEWS' ? 'text-green-600' : 'text-gray-400'} />
                  Saha İncelemeleri
                </button>
              </nav>
            </div>
          </div>

          {/* --- CENTER FEED --- */}
          <div className="col-span-1 lg:col-span-6">
            {/* Create Post Box */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
              <div className="flex gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <UserPlus className="w-full h-full p-2 text-gray-500" />
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <textarea
                    placeholder="Meydan'da neler oluyor? Bir şeyler paylaş..."
                    className="w-full bg-gray-50 hover:bg-white focus:bg-white border border-transparent focus:border-green-500 rounded-lg px-4 py-2.5 text-sm transition-all outline-none resize-none min-h-[60px]"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                  />
                  
                  {/* ATTACHMENT PREVIEWS */}
                  
                  {/* 1. Image Preview */}
                  {selectedImage && (
                      <div className="relative inline-block mt-2">
                          <img src={URL.createObjectURL(selectedImage)} alt="Preview" className="h-32 rounded-lg object-cover border border-gray-200" />
                          <button 
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
                          >
                              <X size={12} />
                          </button>
                      </div>
                  )}

                  {/* 2. Poll Creator */}
                  {isPollMode && (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 mt-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">Anket Seçenekleri</span>
                            <button onClick={() => setIsPollMode(false)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
                          </div>
                          {pollOptions.map((option, idx) => (
                              <div key={idx} className="flex gap-2">
                                  <input 
                                    type="text" 
                                    placeholder={`Seçenek ${idx + 1}`}
                                    className="flex-1 bg-white border border-gray-200 rounded px-3 py-1.5 text-sm focus:border-green-500 outline-none"
                                    value={option.text}
                                    onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                                  />
                                  {pollOptions.length > 2 && (
                                    <button onClick={() => removePollOption(idx)} className="text-gray-400 hover:text-red-500">
                                        <Trash2 size={16} />
                                    </button>
                                  )}
                              </div>
                          ))}
                          {pollOptions.length < 5 && (
                              <button onClick={addPollOption} className="text-xs font-bold text-green-600 flex items-center gap-1 hover:underline">
                                  <Plus size={14} /> Seçenek Ekle
                              </button>
                          )}
                      </div>
                  )}

                  {/* 3. Location Input */}
                  {showLocationInput && (
                      <div className="flex gap-2 items-center bg-blue-50 p-2 rounded-lg border border-blue-100 mt-2">
                          <MapPin size={16} className="text-blue-500" />
                          <input 
                            type="text" 
                            placeholder="Konum ekle..."
                            className="bg-transparent text-sm w-full outline-none text-blue-900 placeholder:text-blue-300"
                            value={locationText}
                            onChange={(e) => setLocationText(e.target.value)}
                          />
                          <button onClick={() => { setShowLocationInput(false); setLocationText(''); }} className="text-blue-400 hover:text-blue-700">
                              <X size={14} />
                          </button>
                      </div>
                  )}

                </div>
              </div>
              
              <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                <div className="flex gap-2">
                  <label className={`p-2 rounded-lg transition-colors cursor-pointer group relative ${selectedImage ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                    <ImageIcon size={20} />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Fotoğraf Ekle</span>
                  </label>
                  
                  <button 
                    onClick={() => setIsPollMode(!isPollMode)}
                    className={`p-2 rounded-lg transition-colors group relative ${isPollMode ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}
                  >
                    <BarChart2 size={20} />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Anket Oluştur</span>
                  </button>

                  <button 
                    onClick={() => setShowLocationInput(!showLocationInput)}
                    className={`p-2 rounded-lg transition-colors group relative ${showLocationInput ? 'text-green-600 bg-green-50' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}
                  >
                    <MapPin size={20} />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Konum</span>
                  </button>
                </div>
                <button
                  onClick={handlePostSubmit}
                  disabled={(!newPostContent.trim() && !selectedImage && !isPollMode) || isPosting}
                  className={`bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-lg shadow-green-600/20 flex items-center gap-2 ${((!newPostContent.trim() && !selectedImage && !isPollMode) || isPosting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isPosting ? 'Paylaşılıyor...' : 'Paylaş'} <Send size={14} />
                </button>
              </div>
            </div>

            {/* Posts Feed */}
            <div className="space-y-6">
              {filteredPosts.map(post => (
                    <PostCard
                        key={post.id}
                        post={post}
                        isLiked={likedPosts.has(post.id)}
                        commentsOpen={openComments.has(post.id)}
                        toggleLike={toggleLike}
                        toggleComments={toggleComments}
                        handleShare={handleShare}
                        currentUser={currentUser}
                        commentInputs={commentInputs}
                        setCommentInputs={setCommentInputs}
                        handleCreateComment={handleCreateComment}
                        postComments={postComments}
                        votedPolls={votedPolls}
                        handleVote={handleVote}
                        handleDeletePost={handleDeletePost}
                        handleDeleteComment={handleDeleteComment}
                    />
              ))}
            </div>
          </div>

          {/* --- RIGHT SIDEBAR (WIDGETS) --- */}
          <div className="hidden lg:block lg:col-span-3 space-y-6">

            {/* 1. Admin/Sports Bulletin */}
            <div className="bg-gradient-to-br from-indigo-900 to-blue-900 rounded-xl p-5 text-white shadow-lg relative overflow-hidden group cursor-pointer hover:shadow-xl transition-shadow">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-all pointer-events-none"></div>
              <h3 className="font-black text-lg mb-1 flex items-center gap-2">
                <Activity size={20} className="text-blue-400" />
                Spor Bülteni
              </h3>
              <p className="text-blue-100 text-xs mb-4">Admin duyuruları ve haftalık özetler.</p>
              <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm border border-white/10 text-sm">
                🏆 Yaz Turnuvası kayıtları başladı! Son gün 1 Temmuz.
              </div>
            </div>

            {/* 2. Agenda / Trending */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-orange-500" />
                Gündem (#)
              </h3>
              <div className="flex flex-wrap gap-2">
                {trendingTopics.map(topic => (
                  <span key={topic.id} className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-lg cursor-pointer transition-colors border border-gray-200">
                    {topic.tag} {(topic.count !== 'Pinned') && <span className="opacity-50 ml-1">({topic.count})</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* 3. Weekly MVPs */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Trophy size={18} className="text-yellow-500" />
                Haftanın MVP'leri 👑
              </h3>
              <div className="space-y-4">
                {WEEKLY_MVPS.map((player, idx) => (
                  <Link to={`/profile/${player.id}`} key={player.id} className="flex items-center gap-3 group">
                    <div className="relative font-mono font-bold text-gray-300 w-4 text-center">{idx + 1}</div>
                    <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm group-hover:border-green-400 transition-colors" />
                    <div className="flex-1">
                      <h4 className="font-bold text-sm text-gray-900 group-hover:text-green-600 transition-colors">{player.name}</h4>
                      <p className="text-[10px] text-gray-500 font-medium bg-gray-100 inline-block px-1.5 rounded mt-0.5">
                        {player.goals} Maç / {player.goals} Gol
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Community;

