'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fetchCommunityPosts, createCommunityPost, deleteCommunityPost } from '@/lib/actions/communityActions';
import { CommunityPost } from '@/lib/types';
import { useAppSelector } from '@/lib/hooks';
import { useToast } from '@/hooks/use-toast';
import { Megaphone, Trash2, Pin, Tag, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function TenantCommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { currentUser } = useAppSelector(state => state.user);
  const { guests } = useAppSelector(state => state.guests);
  const { toast } = useToast();

  const currentGuest = guests.find(g => g.id === currentUser?.guestId);
  const pgId = currentGuest?.pgId;
  const ownerId = currentUser?.ownerId; // We need ownerId to fetch posts, which usually sits on currentUser or currentGuest. Assuming currentUser.ownerId exists based on standard tenant model.
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ownerId && pgId) {
      loadPosts();
    }
  }, [ownerId, pgId]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const fetched = await fetchCommunityPosts(ownerId!, pgId!);
      setPosts(fetched);
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to load community feeds', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMarketplacePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentGuest || !ownerId || !pgId) return;

    setSubmitting(true);
    try {
      await createCommunityPost(ownerId, {
        pgId,
        authorId: currentGuest.id,
        authorName: currentGuest.name,
        authorRole: 'tenant',
        type: 'marketplace',
        title,
        content,
        price: Number(price),
        status: 'active',
        isPinned: false,
      });

      toast({ title: 'Success', description: 'Your item has been posted.' });
      setIsModalOpen(false);
      setTitle('');
      setContent('');
      setPrice('');
      loadPosts();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create post', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!ownerId) return;
    if (confirm('Delete this post?')) {
      try {
        await deleteCommunityPost(ownerId, postId);
        setPosts(posts.filter(p => p.id !== postId));
        toast({ title: 'Deleted', description: 'Your post was removed.' });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
      }
    }
  };

  const noticesAndEvents = posts.filter(p => p.type === 'notice' || p.type === 'event');
  const marketplace = posts.filter(p => p.type === 'marketplace');

  if (!ownerId || !pgId) return <div className="p-4 text-center">Loading community...</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Community</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Stay updated with notices and buy/sell items with your neighbors.
        </p>
      </div>

      <Tabs defaultValue="notices">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notices">Notices & Events</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
        </TabsList>
        
        <TabsContent value="notices" className="mt-6 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading notices...</div>
          ) : noticesAndEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
              No recent notices or events.
            </div>
          ) : (
            noticesAndEvents.map(post => (
              <Card key={post.id} className={post.isPinned ? 'border-primary shadow-sm' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Badge variant={post.type === 'notice' ? 'destructive' : 'default'} className="uppercase text-[10px]">
                        {post.type}
                      </Badge>
                      {post.isPinned && <Pin className="w-3 h-3 text-primary fill-primary" />}
                    </div>
                    <span className="text-xs text-muted-foreground">{format(new Date(post.date), 'dd MMM yyyy')}</span>
                  </div>
                  <CardTitle className="text-base mt-2">{post.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="marketplace" className="mt-6 space-y-4 pb-20">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Buy and sell within your PG.</p>
            <Button size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Sell Item
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading marketplace...</div>
          ) : marketplace.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
              No items for sale right now.
            </div>
          ) : (
            marketplace.map(post => (
              <Card key={post.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{post.title}</CardTitle>
                    {post.price && (
                      <span className="font-bold text-green-600 bg-green-50 px-2 py-1 rounded-md text-sm">
                        ₹{post.price}
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    Posted by {post.authorName} on {format(new Date(post.date), 'dd MMM yyyy')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{post.content}</p>
                  
                  {post.authorId === currentGuest?.id && (
                    <div className="mt-4 flex justify-end">
                      <Button variant="ghost" size="sm" className="text-destructive h-8 px-2" onClick={() => handleDelete(post.id)}>
                        <Trash2 className="w-3 h-3 mr-1" /> Remove
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Sell Item Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sell an Item</DialogTitle>
            <DialogDescription>List an item for sale to other tenants in your PG.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMarketplacePost} className="space-y-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g., Study Table, Cooler" />
            </div>
            
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input type="number" value={price} onChange={e => setPrice(e.target.value)} required placeholder="e.g., 500" />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={content} 
                onChange={e => setContent(e.target.value)} 
                required 
                placeholder="Condition of the item, contact info, etc..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Posting...' : 'Post Item'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
