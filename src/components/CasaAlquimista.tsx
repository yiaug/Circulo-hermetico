import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Flame, Droplets, Wind, Mountain, Sparkles, Eye, Zap, Waves, Compass } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';

export function CasaAlquimista() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col gap-8 max-w-5xl mx-auto pb-20">
      <header className="space-y-4 text-center">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-block p-3 rounded-full bg-amber-500/10 border border-amber-500/20 mb-2"
        >
          <Sparkles className="w-10 h-10 text-amber-400" />
        </motion.div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent">
          A Casa do Alquimista
        </h2>
        <p className="text-white/60 text-lg max-w-2xl mx-auto italic">
          "Visita Interiora Terrae Rectificando Invenies Occultum Lapidem"
          <br />
          <span className="text-sm not-italic opacity-50 mt-2 block">(Visita o interior da terra e, retificando, encontrarás a pedra oculta)</span>
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Fundamentals Section */}
        <GlassCard className="p-8 border-purple-500/20 bg-purple-500/5 md:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <Compass className="w-8 h-8 text-purple-400" />
            <h3 className="text-2xl font-bold text-purple-100 italic">Fundamentos da Grande Obra</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <h4 className="text-purple-300 font-bold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                Solve et Coagula
              </h4>
              <p className="text-sm text-white/70 leading-relaxed">
                Dissolver e Coagular. O processo de desconstruir o ego e as velhas formas (Solve) para reconstruir uma nova identidade espiritual mais pura (Coagula).
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-purple-300 font-bold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                A Transmutação
              </h4>
              <p className="text-sm text-white/70 leading-relaxed">
                Não é apenas mudar a forma, mas a essência. Na alquimia interna, transmutamos o medo em coragem, o ódio em amor e a ignorância em sabedoria.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-purple-300 font-bold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                O Laboratório
              </h4>
              <p className="text-sm text-white/70 leading-relaxed">
                O teu corpo e a tua mente são o Atanor (o forno). A vida quotidiana é a matéria-prima sobre a qual o alquimista opera as suas transformações.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Laws Section */}
        <GlassCard className="p-8 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="w-7 h-7 text-amber-400" />
            <h3 className="text-2xl font-bold text-amber-100 italic">As Leis Universais</h3>
          </div>
          <div className="space-y-5 text-white/70 text-sm leading-relaxed">
            <div className="group">
              <strong className="text-amber-200 block mb-1 group-hover:text-amber-400 transition-colors">1. Mentalismo</strong>
              <p>O Todo é Mente; o Universo é Mental. Tudo o que vês começou como um pensamento.</p>
            </div>
            <div className="group">
              <strong className="text-amber-200 block mb-1 group-hover:text-amber-400 transition-colors">2. Correspondência</strong>
              <p>O que está em cima é como o que está embaixo. Conhece-te a ti mesmo e conhecerás o Universo.</p>
            </div>
            <div className="group">
              <strong className="text-amber-200 block mb-1 group-hover:text-amber-400 transition-colors">3. Vibração</strong>
              <p>Nada está parado; tudo vibra. A diferença entre a matéria e o espírito é apenas a frequência.</p>
            </div>
            <div className="group">
              <strong className="text-amber-200 block mb-1 group-hover:text-amber-400 transition-colors">4. Polaridade</strong>
              <p>Tudo é duplo. Os opostos são apenas extremos da mesma coisa. O alquimista equilibra os polos.</p>
            </div>
          </div>
        </GlassCard>

        {/* Nature of Self Section */}
        <GlassCard className="p-8 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center gap-3 mb-6">
            <Eye className="w-7 h-7 text-blue-400" />
            <h3 className="text-2xl font-bold text-blue-100 italic">A Natureza Real do Eu</h3>
          </div>
          <div className="space-y-6 text-white/70 text-sm leading-relaxed">
            <p>
              Tu não és os teus pensamentos, nem as tuas emoções, nem o teu corpo físico. Estes são apenas <strong className="text-blue-200">veículos de experiência</strong>.
            </p>
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="italic text-blue-100">
                "O Eu Real é a Consciência Pura, o Observador que permanece quando todas as máscaras caem."
              </p>
            </div>
            <p>
              A jornada espiritual é o processo de desidentificação com o ego (a identidade construída) e a fusão com a <strong className="text-blue-200">Essência</strong> (a identidade espiritual).
            </p>
            <p>
              Ao reconheceres-te como o Observador, ganhas o poder de moldar a tua realidade em vez de seres moldado por ela.
            </p>
          </div>
        </GlassCard>

        {/* Elements Section */}
        <GlassCard className="p-8 border-emerald-500/20 bg-emerald-500/5 md:col-span-2">
          <div className="flex items-center gap-3 mb-8">
            <Waves className="w-8 h-8 text-emerald-400" />
            <h3 className="text-2xl font-bold text-emerald-100 italic">A Quintaessência e os Elementos</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="space-y-3 p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors">
              <div className="flex items-center gap-2 text-red-400">
                <Flame className="w-6 h-6" />
                <h4 className="font-bold">Fogo</h4>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">Vontade Criadora. O fogo que transmuta e eleva. A paixão que impulsiona a busca pela verdade.</p>
            </div>
            <div className="space-y-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors">
              <div className="flex items-center gap-2 text-blue-400">
                <Droplets className="w-6 h-6" />
                <h4 className="font-bold">Água</h4>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">Fluidez Emocional. O subconsciente e a intuição. A capacidade de purificar e acolher.</p>
            </div>
            <div className="space-y-3 p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 hover:bg-yellow-500/10 transition-colors">
              <div className="flex items-center gap-2 text-yellow-400">
                <Wind className="w-6 h-6" />
                <h4 className="font-bold">Ar</h4>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">Clareza Mental. O intelecto e a comunicação. A respiração que conecta o interno ao externo.</p>
            </div>
            <div className="space-y-3 p-4 rounded-2xl bg-green-500/5 border border-green-500/10 hover:bg-green-500/10 transition-colors">
              <div className="flex items-center gap-2 text-green-400">
                <Mountain className="w-6 h-6" />
                <h4 className="font-bold">Terra</h4>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">Manifestação Física. A estabilidade e a paciência. O corpo que ancora a experiência espiritual.</p>
            </div>
            <div className="space-y-3 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-colors">
              <div className="flex items-center gap-2 text-purple-400">
                <Zap className="w-6 h-6" />
                <h4 className="font-bold italic">Éter</h4>
              </div>
              <p className="text-xs text-white/100 leading-relaxed font-medium">A Quintaessência. O elemento espiritual que permeia todos os outros. A conexão direta com a Fonte.</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </motion.div>
  );
}
