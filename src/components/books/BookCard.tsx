import { useNavigate } from 'react-router-dom';
import React from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserProfile, Book } from '../../types';
import { cn } from '../../lib/utils';
import { GlassCard } from '../ui/GlassCard';
import { useAuth } from '../../contexts/AuthContext';

export function BookCard({ book, onClick }: { book: Book, onClick?: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isFavorite = user?.favoriteBooks?.includes(book.id);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    const currentFavorites = user.favoriteBooks || [];
    const newFavorites = isFavorite 
      ? currentFavorites.filter((id: string) => id !== book.id)
      : [...currentFavorites, book.id];
      
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        favoriteBooks: newFavorites
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      onClick={() => { if (onClick) onClick(); else navigate(`/book/${book.id}`); }}
      className="cursor-pointer group"
    >
      <GlassCard className="h-full flex flex-col relative">
        <div className="aspect-[3/4] overflow-hidden relative">
          <img 
            src={book.coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=400'} 
            alt={book.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <button 
            onClick={handleToggleFavorite}
            className="absolute top-2 right-2 p-2 rounded-full bg-black/50 backdrop-blur-md text-white/70 hover:text-red-400 transition-colors z-10"
          >
            <Heart className={cn("w-5 h-5", isFavorite ? "fill-red-500 text-red-500" : "")} />
          </button>
        </div>
        <div className="p-4 space-y-1 flex-1">
          <h3 className="font-bold text-lg leading-tight line-clamp-2 group-hover:text-red-400 transition-colors">{book.title}</h3>
        </div>
      </GlassCard>
    </motion.div>
  );
}
