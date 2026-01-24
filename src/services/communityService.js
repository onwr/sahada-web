import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp,
  runTransaction,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../config/firebase';

// --- POSTS ---

// Get posts with pagination (simplified for now)
export const getPosts = async (limitCount = 20) => {
  try {
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const posts = [];
    
    querySnapshot.forEach((doc) => {
      posts.push({
        id: doc.id,
        ...doc.data(),
        // Convert timestamp to date if needed, or handle in component
        timestamp: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
      });
    });
    
    return { success: true, data: posts };
  } catch (error) {
    console.error('Error fetching posts:', error);
    return { success: false, error: error.message };
  }
};

// Create a new post
export const createPost = async (postData) => {
  try {
    const postsRef = collection(db, 'posts');
    const docRef = await addDoc(postsRef, {
      ...postData,
      likes: 0,
      comments: 0,
      createdAt: serverTimestamp()
    });
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating post:', error);
    return { success: false, error: error.message };
  }
};

// Update Post
export const updatePost = async (postId, postData) => {
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      ...postData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating post:', error);
    return { success: false, error: error.message };
  }
};

// Delete Post
export const deletePost = async (postId) => {
  try {
    await deleteDoc(doc(db, 'posts', postId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting post:', error);
    return { success: false, error: error.message };
  }
};

// Toggle Like
export const toggleLikePost = async (postId, userId) => {
  try {
    const postRef = doc(db, 'posts', postId);
    const likeRef = doc(db, 'posts', postId, 'likes', userId);
    
    await runTransaction(db, async (transaction) => {
      const likeDoc = await transaction.get(likeRef);
      
      if (likeDoc.exists()) {
        // Unlike
        transaction.delete(likeRef);
        transaction.update(postRef, {
          likes: increment(-1)
        });
      } else {
        // Like
        transaction.set(likeRef, {
          userId,
          createdAt: serverTimestamp()
        });
        transaction.update(postRef, {
          likes: increment(1)
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error toggling like:', error);
    return { success: false, error: error.message };
  }
};

// Check if user liked post
export const checkUserLike = async (postId, userId) => {
    try {
        const likeRef = doc(db, 'posts', postId, 'likes', userId);
        const likeDoc = await getDoc(likeRef);
        return { success: true, liked: likeDoc.exists() };
    } catch (error) {
        console.error('Error checking like:', error);
        return { success: false, error: error.message };
    }
};


// --- COMMENTS ---

// Add Comment
export const addComment = async (postId, commentData) => {
  try {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const docRef = await addDoc(commentsRef, {
      ...commentData,
      createdAt: serverTimestamp()
    });
    
    // Update comment count on post
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      comments: increment(1)
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding comment:', error);
    return { success: false, error: error.message };
  }
};

// Delete Comment
export const deleteComment = async (postId, commentId) => {
  try {
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    await deleteDoc(commentRef);

    // Decrement comment count on post
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      comments: increment(-1)
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return { success: false, error: error.message };
  }
};

// Get Comments
export const getComments = async (postId) => {
  try {
    const commentsRef = collection(db, 'posts', postId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc')); // Newest first
    const querySnapshot = await getDocs(q);
    
    const comments = [];
    querySnapshot.forEach((doc) => {
      comments.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date()
      });
    });
    
    return { success: true, data: comments };
  } catch (error) {
     console.error('Error getting comments:', error);
     return { success: false, error: error.message };
  }
};

// --- POLLS ---

// Vote locally and on server
export const votePoll = async (postId, optionIndex, userId) => {
    try {
        const postRef = doc(db, 'posts', postId);
        const voteRef = doc(db, 'posts', postId, 'poll_votes', userId);

        await runTransaction(db, async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists()) throw new Error("Post does not exist!");
            
            const voteDoc = await transaction.get(voteRef);
            if (voteDoc.exists()) throw new Error("User already voted!");

            const postData = postDoc.data();
            const newPollOptions = [...postData.pollOptions];
            
            // Increment vote count
            newPollOptions[optionIndex].votes = (newPollOptions[optionIndex].votes || 0) + 1;
            
            // Recalculate percentages
            const totalVotes = newPollOptions.reduce((acc, curr) => acc + (curr.votes || 0), 0);
            newPollOptions.forEach(opt => {
                opt.percentage = totalVotes === 0 ? 0 : Math.round(((opt.votes || 0) / totalVotes) * 100);
            });

            // Update Post
            transaction.update(postRef, { pollOptions: newPollOptions });
            
            // Record Vote
            transaction.set(voteRef, {
                optionIndex,
                userId,
                createdAt: serverTimestamp()
            });
        });

        return { success: true };
    } catch (error) {
        console.error('Error voting poll:', error);
        return { success: false, error: error.message };
    }
};

// Check if user voted
export const checkUserVote = async (postId, userId) => {
    try {
        const voteRef = doc(db, 'posts', postId, 'poll_votes', userId);
        const voteDoc = await getDoc(voteRef);
        if (voteDoc.exists()) {
            return { success: true, hasVoted: true, optionIndex: voteDoc.data().optionIndex };
        }
        return { success: true, hasVoted: false };
    } catch (error) {
        console.error('Error checking vote:', error);
         return { success: false, error: error.message };
    }
};

