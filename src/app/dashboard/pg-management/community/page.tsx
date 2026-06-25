'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { fetchCommunityPosts, createCommunityPost, deleteCommunityPost, togglePinCommunityPost } from '@/lib/actions/communityActions';
import { CommunityPost } from '@/lib/types';
import { useAppSelector } from '@/lib/hooks';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Trash2, Pin, Calendar, Tag, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function DashboardCommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { currentUser } = useAppSelector(state => state.user);
  const { pgs } = useAppSelector(state => state.pgs);
  const { toast } = useToast();

  const [selectedPgId, setSelectedPgId] = useState<string>('');
  
  // Form State
  const [postType, setPostType] = useState<'notice' | 'event' | 'marketplace'>('notice');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (pgs.length > 0 && !selectedPgId) {
      setSelectedPgId(pgs[0].id);
    }
  }, [pgs]);

  useEffect(() => {
    if (currentUser?.id && selectedPgId) {
      loadPosts();
    }
  }, [currentUser?.id, selectedPgId]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const fetched = await fetchCommunityPosts(currentUser!.id, selectedPgId);
      setPosts(fetched);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to load posts', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedPgId) return;

    setSubmitting(true);
    try {
      await createCommunityPost(currentUser.id, {
        pgId: selectedPgId,
        authorId: currentUser.id,
        authorName: currentUser.name || 'Owner',
        authorRole: 'owner',
        type: postType,
        title,
        content,
        price: postType === 'marketplace' ? Number(price) : undefined,
        status: 'active',
        isPinned: postType === 'notice' ? isPinned : false,
      });

      toast({ title: 'Success', description: 'Post created successfully.' });
      setIsModalOpen(false);
      setTitle('');
      setContent('');
      setPrice('');
      setIsPinned(false);
      loadPosts();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create post', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!currentUser) return;
    if (confirm('Are you sure you want to delete this post?')) {
      try {
        await deleteCommunityPost(currentUser.id, postId);
        setPosts(posts.filter(p => p.id !== postId));
        toast({ title: 'Success', description: 'Post deleted' });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete post', variant: 'destructive' });
      }
    }
  };

  const handleTogglePin = async (post: CommunityPost) => {
    if (!currentUser) return;
    try {
      await togglePinCommunityPost(currentUser.id, post.id, !post.isPinned);
      setPosts(posts.map(p => p.id === post.id ? { ...p, isPinned: !p.isPinned } : p));
      toast({ title: 'Success', description: post.isPinned ? 'Unpinned' : 'Pinned' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update pin status', variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Community & Notices</h1>
          <p className="text-muted-foreground mt-1">
            Manage notice board, events, and moderate tenant marketplace posts.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={selectedPgId} onValueChange={setSelectedPgId}>
            <SelectTrigger className="flex-1 sm:w-[200px]">
              <SelectValue placeholder="Select Property" />
            </SelectTrigger>
            <SelectContent>
              {pgs.map(pg => (
                <SelectItem key={pg.id} value={pg.id}>{pg.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsModalOpen(true)} className="flex-1 sm:flex-none">
            <Megaphone className="w-4 h-4 mr-2" /> New Post
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No posts found. Create a notice to announce something to your tenants!
          </div>
        ) : (
          posts.map(post => (
            <Card key={post.id} className={`flex flex-col ${post.isPinned ? 'border-primary shadow-sm' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <Badge variant={post.type === 'notice' ? 'destructive' : post.type === 'event' ? 'default' : 'secondary'} className="uppercase text-[10px]">
                    {post.type}
                  </Badge>
                  {post.isPinned && <Pin className="w-4 h-4 text-primary fill-primary" />}
                </div>
                <CardTitle className="text-lg mt-2 line-clamp-1">{post.title}</CardTitle>
                <CardDescription className="flex items-center gap-1 text-xs">
                  {post.authorRole === 'owner' ? <Badge variant="outline" className="text-[10px]">Owner</Badge> : <span className="font-medium text-foreground">{post.authorName}</span>}
                  <span>•</span>
                  <span>{format(new Date(post.date), 'dd MMM yyyy')}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{post.content}</p>
                {post.type === 'marketplace' && post.price && (
                  <div className="mt-3 font-bold text-lg text-green-600 flex items-center">
                    <Tag className="w-4 h-4 mr-1" /> ₹{post.price}
                  </div>
                )}
              </CardContent>
              <div className="px-6 pb-4 pt-2 border-t flex justify-end gap-2 mt-auto">
                {post.type === 'notice' && (
                  <Button variant="ghost" size="sm" onClick={() => handleTogglePin(post)}>
                    {post.isPinned ? 'Unpin' : 'Pin'}
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(post.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Post Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Community Post</DialogTitle>
            <DialogDescription>Broadcast to all tenants in the selected property.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePost} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Post Type</Label>
                <Select value={postType} onValueChange={(v: any) => setPostType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="notice">Official Notice</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {postType === 'notice' && (
                <div className="space-y-2">
                  <Label>Pin to top?</Label>
                  <Select value={isPinned ? 'yes' : 'no'} onValueChange={(v) => setIsPinned(v === 'yes')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g., Water supply interruption" />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                required 
                placeholder="Details of the notice..."
                className="min-h-[100px]"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Posting...' : 'Publish Post'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
