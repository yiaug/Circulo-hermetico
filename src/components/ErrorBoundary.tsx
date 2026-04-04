import React from 'react';
import { Shield } from 'lucide-react';
import { cn } from '../lib/utils';

const GlassButton = ({ children, className, variant = 'primary', ...props }: any) => {
  const variants = {
    primary: "bg-red-600/80 hover:bg-red-500 text-white",
    secondary: "bg-white/10 hover:bg-white/20 text-white border border-white/20",
    ghost: "hover:bg-white/10 text-white/80 hover:text-white",
    danger: "bg-red-500/80 hover:bg-red-400 text-white"
  };
  
  return (
    <button 
      className={cn(
        "px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 font-medium backdrop-blur-sm disabled:opacity-50",
        variants[variant as keyof typeof variants],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        if (parsedError.error && parsedError.error.includes('permission-denied')) {
          errorMessage = "Você não tem permissão para acessar este recurso. Por favor, verifique se seu acesso foi autorizado.";
        }
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center text-white p-4 text-center space-y-6">
          <div className="w-24 h-24 bg-red-500/20 rounded-3xl flex items-center justify-center border border-red-500/30">
            <Shield className="w-12 h-12 text-red-400" />
          </div>
          <div className="space-y-2 max-w-sm">
            <h2 className="text-3xl font-bold">Ops! Algo deu errado</h2>
            <p className="text-white/50">{errorMessage}</p>
          </div>
          <GlassButton onClick={() => window.location.reload()}>Recarregar Aplicativo</GlassButton>
        </div>
      );
    }

    return this.props.children;
  }
}
