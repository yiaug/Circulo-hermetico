import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Heart, Sparkles, BookOpen } from 'lucide-react';
import { BookCard } from '../components/books/BookCard';
import { GlassButton } from '../components/ui/GlassButton';
import { cn } from '../lib/utils';
import { Book } from '../types';
import { useAuth } from '../contexts/AuthContext';

export function LibraryView({ books, categories, fetchBooks, hasMoreBooks, fetchingMoreBooks, recommendations }: any) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6 md:space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Biblioteca Digital</h2>
          <p className="text-white/50">Explore o conhecimento ancestral em PDF.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative group w-full md:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-red-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar livro ou autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
            />
          </div>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('Meus Favoritos')}
          className={cn(
            "px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border flex items-center gap-2",
            selectedCategory === 'Meus Favoritos' 
              ? "bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/20" 
              : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
          )}
        >
          <Heart className="w-4 h-4" />
          Meus Favoritos
        </button>
        {categories.map((cat: string) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border",
              selectedCategory === cat 
                ? "bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/20" 
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recommendations Section */}
      {recommendations.length > 0 && selectedCategory === 'Todos' && !searchQuery && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-xl font-bold">Recomendações para Você</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
            {recommendations.map((book: Book) => (
              <BookCard 
                key={`rec-${book.id}`} 
                book={book}
                onClick={() => {}} // onClick is handled natively by link if we wanted, but BookCard takes onClick right now.
                // Wait, BookCard currently doesn't use Link. Let's make it navigate.
              />
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
        {books
          .filter((b: Book) => {
            if (selectedCategory === 'Meus Favoritos') {
              return user?.favoriteBooks?.includes(b.id);
            }
            return (selectedCategory === 'Todos' || (b.categories && b.categories.includes(selectedCategory)));
          })
          .filter((b: Book) => b.title.toLowerCase().includes(searchQuery.toLowerCase()) || b.author.toLowerCase().includes(searchQuery.toLowerCase()))
          .map((book: Book) => (
            <BookCard key={book.id} book={book} onClick={() => {}} />
          ))}
        {books.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <BookOpen className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-white/40">Nenhum livro encontrado nesta categoria.</p>
          </div>
        )}
      </div>
      
      {hasMoreBooks && (
        <div className="flex justify-center mt-8">
          <GlassButton 
            onClick={() => fetchBooks(true)}
            disabled={fetchingMoreBooks}
            className="bg-white/5 hover:bg-white/10"
          >
            {fetchingMoreBooks ? 'Carregando...' : 'Carregar mais livros'}
          </GlassButton>
        </div>
      )}
    </motion.div>
  );
}
