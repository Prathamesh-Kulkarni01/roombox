import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { CommunityPost } from '../types';

export const createCommunityPost = async (
  ownerId: string, 
  data: Omit<CommunityPost, 'id' | 'ownerId' | 'createdAt' | 'updatedAt' | 'date'>
): Promise<string> => {
  if (!ownerId) throw new Error('Owner ID is required');

  const postRef = doc(collection(db!, `users/${ownerId}/community_posts`));
  const newPost: CommunityPost = {
    ...data,
    id: postRef.id,
    ownerId,
    date: new Date().toISOString(),
  };

  await setDoc(postRef, {
    ...newPost,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return postRef.id;
};

export const fetchCommunityPosts = async (ownerId: string, pgId: string, type?: 'notice' | 'event' | 'marketplace'): Promise<CommunityPost[]> => {
  if (!ownerId) return [];
  const postsRef = collection(db!, `users/${ownerId}/community_posts`);
  
  let q;
  if (type) {
    q = query(postsRef, where('pgId', '==', pgId), where('type', '==', type), orderBy('date', 'desc'));
  } else {
    q = query(postsRef, where('pgId', '==', pgId), orderBy('date', 'desc'));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CommunityPost));
};

export const deleteCommunityPost = async (ownerId: string, postId: string): Promise<void> => {
  if (!ownerId || !postId) throw new Error('Owner ID and Post ID required');
  const postRef = doc(db!, `users/${ownerId}/community_posts`, postId);
  await deleteDoc(postRef);
};

export const togglePinCommunityPost = async (ownerId: string, postId: string, isPinned: boolean): Promise<void> => {
  if (!ownerId || !postId) throw new Error('Owner ID and Post ID required');
  const postRef = doc(db!, `users/${ownerId}/community_posts`, postId);
  await updateDoc(postRef, { 
    isPinned,
    updatedAt: serverTimestamp() 
  });
};
