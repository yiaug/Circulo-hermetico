import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, setDoc, serverTimestamp, updateDoc, doc, deleteDoc, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { UserProfile, ChatMessage, ChatRoom, ShadowEntry, DailyRitual, InitiationLevel, Transmutation, Analogy } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { GlassCard } from './ui/GlassCard';
import { GlassButton } from './ui/GlassButton';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OperationType, handleFirestoreError } from '../lib/errorHandling';
import { Book as BookIcon, AlertCircle, Info, MessageSquare, Users, Search, Plus, LogOut, ChevronRight, Heart, Send, Library, BookOpen, Shield, X, FileText, Moon, Sun, Type, Sparkles, Lock, CreditCard, Mic, MicOff, Volume2, Activity, Flame, Zap, History, Calendar, CheckCircle2, Circle, PenTool, Compass, Star, Link2, ArrowRight, Eye, Copy, MessageCircle, Download, ChevronDown, Edit2, Trash2, Hexagon, Radio, FlaskConical, ScrollText, Gem, Upload } from 'lucide-react';

export function BuyAccess() {
  const { user, logout, updatePreferences } = useAuth();
  const { showNotification, showConfirm, closeConfirm } = useUI();

  const [loading, setLoading] = useState(false);

  const handleContactSupport = () => {
    window.open('https://wa.me/5541995647137', '_blank'); // Atualizado para o WhatsApp de suporte
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center p-4 relative overflow-hidden text-white">
      {/* Mystical Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="max-w-md w-full z-10"
      >
        <GlassCard className="p-8 text-center space-y-8 border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.1)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent animate-pulse" />
          
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
          >
            <Flame className="w-10 h-10 text-amber-500" />
          </motion.div>
          
          <div className="space-y-4">
            <h2 className="text-3xl font-black tracking-tight uppercase italic text-white">Acesso Restrito</h2>
            <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-sm text-amber-100/90 leading-relaxed shadow-inner">
              <p className="font-bold text-lg mb-2">Atenção, <span className="text-white">{user.displayName}</span>!</p>
              <p className="text-left">
                O conhecimento hermético não é para todos. Apenas os que demonstram <span className="text-white font-bold underline">comprometimento real</span> podem cruzar este portal.
              </p>
              <p className="mt-4 text-left font-bold text-white">
                Como você já realizou o seu pagamento, clique no botão abaixo para verificar sua honra e liberar seu acesso.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <GlassButton onClick={() => {
              showNotification("Sua solicitação está em análise. Por favor, aguarde a liberação do seu acesso pela administração.", "info");
              setTimeout(() => window.location.reload(), 4000);
            }} className="w-full py-4 text-lg bg-amber-600 hover:bg-amber-500 text-black font-black uppercase tracking-widest shadow-lg shadow-amber-600/20">
              Verificar Minha Honra
            </GlassButton>

            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={handleContactSupport}
                className="w-full py-3 text-sm font-bold text-green-400 hover:text-green-300 transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar Comprovante via WhatsApp
              </button>

              <button 
                onClick={logout}
                className="w-full py-3 text-sm font-bold text-white/40 hover:text-white/60 transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Trocar de conta
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-bold mb-4">A Grande Obra exige manutenção</p>
            <p className="text-xs text-white/40 italic">
              "O que não tem preço, exige valor."
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 text-white/40 text-[10px] uppercase tracking-widest font-bold mt-4">
            <div className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> Seguro</div>
            <div className="flex items-center gap-1"><Shield className="w-3 h-3" /> Verificado</div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}


const ANCESTRAL_INSIGHTS = [
  "O silêncio é o útero onde a verdadeira sabedoria é concebida.",
  "Como acima, tal como abaixo; o macrocosmo reflete-se no teu próprio ser.",
  "A paciência é o fogo lento que transmuta o chumbo da alma no ouro do espírito.",
  "Tua vontade é o cinzel; a realidade é o mármore esperando tua forma.",
  "O universo não fala por palavras, mas por sincronicidades e símbolos.",
  "A morte não é um fim, mas a sublimação da forma para uma nova essência.",
  "Onde o pensamento se aquieta, a voz dos ancestrais se faz ouvir.",
  "Não busques a Pedra Filosofal fora de ti; tu és o Atanor e a Matéria.",
  "A verdade é um espelho quebrado; cada fragmento reflete uma parte do Todo.",
  "O tempo é a imagem móvel da eternidade imóvel; vive o agora.",
  "A dualidade é a ilusão que esconde a Unidade primordial.",
  "Teu corpo é o templo; tua mente é o altar; tua alma é a chama.",
  "O conhecimento sem prática é como uma semente em solo estéril.",
  "A verdadeira magia é a arte de causar mudanças na consciência conforme a vontade.",
  "Ouve o vento, pois ele traz os sussurros daqueles que vieram antes.",
  "A escuridão da Nigredo é necessária para que a luz da Albedo se revele.",
  "O equilíbrio é a chave que abre os portais dos sete céus.",
  "Toda causa tem seu efeito; toda ação é uma semente de destino.",
  "O amor é a força de coesão que mantém as estrelas em seus cursos.",
  "Sê como o mercúrio: fluido, adaptável, mas sempre fiel à sua natureza.",
  "A sabedoria é o sal da terra; sem ela, a vida perde seu sabor sagrado.",
  "O mestre aparece quando o discípulo está pronto para ouvir o silêncio.",
  "As estrelas inclinam, mas não obrigam; tu és o capitão da tua nau.",
  "A Grande Obra começa com um único suspiro de intenção pura.",
  "O que está oculto aos olhos da carne é visível aos olhos do espírito.",
  "A natureza é o livro aberto onde a divindade escreve suas leis.",
  "O medo é a sombra que desaparece quando a luz da consciência brilha.",
  "Cada obstáculo é um degrau na escada de Jacob rumo à ascensão.",
  "A palavra é prata, o silêncio é ouro, mas a ação é o diamante.",
  "Não temas o fogo da provação; ele apenas queima o que não é eterno.",
  "O destino é o mapa, mas a jornada é escrita pelos teus passos.",
  "A intuição é o fio de Ariadne no labirinto da existência.",
  "O Todo é Mente; o Universo é Mental. Pensa com pureza.",
  "A harmonia é o ritmo do cosmos; dança conforme a música das esferas.",
  "O segredo dos segredos reside na simplicidade do coração.",
  "A alma viaja através de muitas vestes antes de retornar à fonte.",
  "O poder sem sabedoria é uma espada sem punho; fere quem a empunha.",
  "A gratidão é o selo que atrai as bênçãos do plano invisível.",
  "Sê firme como a terra, fluido como a água, leve como o ar e ardente como o fogo.",
  "O mistério não é algo a ser resolvido, mas algo a ser vivido.",
  "A luz que buscas está nos olhos de quem vê a divindade em tudo.",
  "O passado é memória, o futuro é sonho; o presente é o único portal.",
  "A humildade é a base sobre a qual se constrói a pirâmide da ascensão.",
  "Ouve a batida do teu coração; é o tambor da eternidade em ti.",
  "A vida é um sonho de Deus; acorda dentro do sonho.",
  "Onde há vontade, há um caminho; onde há fé, há uma ponte.",
  "A beleza é o esplendor da verdade manifestada na forma.",
  "O buscador que olha para fora sonha; o que olha para dentro desperta.",
  "A unidade é o destino final de todos os caminhos divergentes.",
  "Tu és o universo experimentando a si mesmo em forma humana.",
  "A verdadeira alquimia não transforma metais, mas a própria alma em luz.",
  "O que está dentro de ti é o que projeta o universo ao teu redor.",
  "O silêncio absoluto é a linguagem mais alta da Egrégora.",
  "A magia é a ciência de compreender a si mesmo e ao Todo.",
  "Cada pensamento é um feitiço sussurrado ao cosmos.",
  "O fogo purifica, a água molda, o ar eleva e a terra estabiliza.",
  "A ilusão da separação é a única barreira entre ti e a divindade.",
  "O tempo é um círculo; o fim de uma jornada é o início de outra.",
  "A sabedoria não é acumulada, é lembrada pela alma desperta.",
  "O caos é apenas a ordem que ainda não compreendeste.",
  "A tua intenção é a bússola que guia a energia universal.",
  "O verdadeiro mestre é aquele que reconhece o mestre em todos os seres.",
  "A escuridão não é o mal, é o útero onde a luz se prepara para nascer.",
  "O microcosmo do teu corpo contém os segredos do macrocosmo estelar.",
  "A vibração que emites é a realidade que atrais.",
  "O desapego não é não possuir nada, é não ser possuído por nada.",
  "A palavra falada tem o poder de criar mundos ou destruí-los.",
  "O equilíbrio entre o masculino e o feminino internos gera a pedra filosofal.",
  "A dor é o fogo da forja que tempera o aço do teu espírito.",
  "A gratidão transforma o que tens em suficiente e o suficiente em abundância.",
  "O medo é uma sombra; a luz da consciência o faz desaparecer.",
  "A intuição é a voz da tua alma sussurrando verdades ancestrais.",
  "O universo é um espelho que reflete o teu estado interior.",
  "A paciência é a virtude dos que compreendem o ritmo da natureza.",
  "A verdadeira força reside na vulnerabilidade de ser autêntico.",
  "O perdão é a alquimia que transforma o veneno do ressentimento em paz.",
  "A mente é um jardim; os pensamentos são as sementes que escolhes plantar.",
  "A sincronicidade é o universo piscando o olho para ti.",
  "O amor incondicional é a frequência mais alta da criação.",
  "A morte do ego é o nascimento do verdadeiro Eu.",
  "A jornada interior é a única viagem que realmente importa.",
  "O conhecimento é poder, mas a sabedoria é a aplicação amorosa desse poder.",
  "A beleza da vida está na impermanência de todas as coisas.",
  "O silêncio entre as palavras é onde reside o verdadeiro significado.",
  "A tua respiração é a ponte entre o corpo físico e o corpo espiritual.",
  "O universo conspira a favor daqueles que estão alinhados com o seu propósito.",
  "A verdadeira liberdade é a libertação das correntes da própria mente.",
  "O sofrimento nasce da resistência ao fluxo natural da vida.",
  "A alegria é a assinatura da alma em harmonia com o Todo.",
  "O mistério da existência não é um problema a ser resolvido, mas uma realidade a ser experimentada.",
  "A tua presença é o maior presente que podes oferecer ao mundo.",
  "O passado não te define; é apenas o solo onde a tua flor desabrocha hoje.",
  "A compaixão é a chave que abre os corações mais fechados.",
  "O universo é uma sinfonia; encontra a tua nota e toca-a com paixão.",
  "A verdadeira riqueza é a abundância de paz no coração.",
  "O caminho do meio é a trilha que leva à iluminação.",
  "A tua luz interior é a única bússola que precisas na escuridão.",
  "O amor é a resposta, não importa qual seja a pergunta.",
  "A vida é uma dança; não te preocupes com os passos, apenas sente a música.",
  "O Todo está em ti, e tu estás no Todo. Sois um só."
];
