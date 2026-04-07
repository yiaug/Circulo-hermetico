import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { GlassCard } from '../App';
import { Activity, HardDrive, TrendingUp } from 'lucide-react';

interface BandwidthStat {
  id: string;
  date: string;
  totalBytes: number;
  reads: number;
}

export function BandwidthMonitor() {
  const [stats, setStats] = useState<BandwidthStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const q = query(collection(db, 'bandwidthStats'), orderBy('date', 'desc'), limit(30));
        const snap = await getDocs(q);
        setStats(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BandwidthStat)));
      } catch (error) {
        console.error("Error fetching bandwidth stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalBytes30Days = stats.reduce((acc, curr) => acc + curr.totalBytes, 0);
  const totalReads30Days = stats.reduce((acc, curr) => acc + curr.reads, 0);

  // Firebase Free Tier Limit is 1GB/day
  const dailyLimitBytes = 1024 * 1024 * 1024; 
  const todayStat = stats.length > 0 && stats[0].date === new Date().toISOString().split('T')[0] ? stats[0] : null;
  const todayBytes = todayStat?.totalBytes || 0;
  const percentageUsed = Math.min(100, (todayBytes / dailyLimitBytes) * 100);

  return (
    <GlassCard className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Monitor de Banda (PDFs)</h3>
          <p className="text-xs text-white/50">Uso estimado de download do Firebase Storage</p>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-white/10 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-white/10 rounded"></div>
              <div className="h-4 bg-white/10 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-white/50 mb-2">
                <HardDrive className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Hoje</span>
              </div>
              <p className="text-2xl font-bold">{formatBytes(todayBytes)}</p>
              
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-[10px] text-white/40">
                  <span>Cota Gratuita (1GB)</span>
                  <span>{percentageUsed.toFixed(1)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${percentageUsed > 80 ? 'bg-red-500' : percentageUsed > 50 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                    style={{ width: `${percentageUsed}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-white/50 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Últimos 30 Dias</span>
              </div>
              <p className="text-2xl font-bold">{formatBytes(totalBytes30Days)}</p>
              <p className="text-xs text-white/40 mt-1">Estimativa de tráfego total</p>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 text-white/50 mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Aberturas (30d)</span>
              </div>
              <p className="text-2xl font-bold">{totalReads30Days}</p>
              <p className="text-xs text-white/40 mt-1">Vezes que PDFs foram abertos</p>
            </div>
          </div>

          {percentageUsed > 80 && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              <strong>Atenção:</strong> O uso de banda de hoje está próximo do limite gratuito do Firebase (1GB/dia). Considere migrar os PDFs mais pesados para a Cloudflare R2 se o tráfego continuar aumentando.
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
}
