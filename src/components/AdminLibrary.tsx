import React, { useState, useMemo } from 'react';
import { Search, Edit2, Trash2, BookOpen } from 'lucide-react';
import { Book } from '../types';
import { GlassCard } from '../App';

interface AdminLibraryProps {
  books: Book[];
  onEdit: (book: Book) => void;
  onDelete: (book: Book) => void;
}

export function AdminLibrary({ books, onEdit, onDelete }: AdminLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBooks = useMemo(() => {
    if (!searchTerm) return books;
    const lower = searchTerm.toLowerCase();
    return books.filter(b => 
      b.title.toLowerCase().includes(lower) || 
      b.author.toLowerCase().includes(lower) ||
      b.categories?.some(c => c.toLowerCase().includes(lower))
    );
  }, [books, searchTerm]);

  return (
    <GlassCard className="p-6 flex flex-col h-[800px]">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 shrink-0">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            Acervo da Biblioteca
          </h3>
          <p className="text-sm text-white/50">{books.length} livros cadastrados no total</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input 
            type="text"
            placeholder="Buscar por título, autor ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500/50 outline-none transition-all"
          />
        </div>
      </div>

      {/* Table/List */}
      <div className="flex-1 overflow-auto custom-scrollbar rounded-xl border border-white/10 bg-black/20">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-md shadow-sm">
            <tr>
              <th className="px-6 py-4 font-medium text-white/70">Título</th>
              <th className="px-6 py-4 font-medium text-white/70">Autor</th>
              <th className="px-6 py-4 font-medium text-white/70">Categorias</th>
              <th className="px-6 py-4 font-medium text-white/70 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredBooks.length > 0 ? (
              filteredBooks.map(book => (
                <tr key={book.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white max-w-[250px] md:max-w-[400px] truncate" title={book.title}>
                      {book.title}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white/80 max-w-[150px] md:max-w-[200px] truncate" title={book.author}>
                      {book.author}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5 flex-wrap max-w-[250px]">
                      {book.categories?.slice(0, 2).map(cat => (
                        <span key={cat} className="px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-medium text-white/80 tracking-wide">
                          {cat}
                        </span>
                      ))}
                      {(book.categories?.length || 0) > 2 && (
                        <span className="px-2.5 py-1 rounded-full bg-white/5 text-[10px] font-medium text-white/50 tracking-wide" title={book.categories?.slice(2).join(', ')}>
                          +{(book.categories?.length || 0) - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(book)}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(book)}
                        className="p-2 text-white/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-white/50">
                  {searchTerm ? 'Nenhum livro encontrado para esta busca.' : 'Nenhum livro na biblioteca.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
