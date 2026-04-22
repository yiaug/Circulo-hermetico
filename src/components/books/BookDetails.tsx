import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, BookOpen } from 'lucide-react';
import { UserProfile, Book } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { PDFReader } from '../PDFReader';
import { useAuth } from '../../contexts/AuthContext';

export function BookDetails({ book, onBack }: { book: Book, onBack: () => void }) {
  const { user } = useAuth();
  const [isReading, setIsReading] = useState(false);

  if (isReading && book.pdfUrl) {
    return (
      <PDFReader 
        book={book} 
         
        onClose={() => setIsReading(false)} 
      />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      <div className="flex items-center gap-3 md:gap-4">
        <GlassButton variant="ghost" onClick={onBack} className="p-2 rounded-full shrink-0">
          <X className="w-5 h-5 md:w-6 md:h-6" />
        </GlassButton>
        <h2 className="text-xl md:text-2xl font-bold truncate">{book.title}</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 md:gap-8">
        <div className="space-y-4">
          <GlassCard className="aspect-[3/4] max-w-[240px] mx-auto md:max-w-none">
            <img src={book.coverUrl} alt={book.title} loading="lazy" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          </GlassCard>
          
          {book.pdfUrl ? (
            <GlassButton onClick={() => setIsReading(true)} className="w-full py-4 text-lg bg-red-600/80 hover:bg-red-500">
              <BookOpen className="w-5 h-5 mr-2" />
              Ler Livro Agora
            </GlassButton>
          ) : (
            <div className="w-full py-4 text-center text-sm text-white/50 bg-white/5 rounded-xl border border-white/10">
              PDF indisponível no momento
            </div>
          )}
        </div>
        <div className="space-y-6 text-center md:text-left">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{book.title}</h1>
            <p className="text-lg md:text-xl text-red-400">{book.author}</p>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold border-b border-white/10 pb-2">Sinopse</h3>
            <p className="text-white/70 text-sm md:text-base leading-relaxed whitespace-pre-wrap">{book.synopsis}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
