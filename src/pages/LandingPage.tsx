import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * LandingPage — rota pública "/"
 * Solução definitiva de cache e PWA:
 * - Se logado → /dashboard
 * - Se não logado → redireciona para /landing-v2.html (Escapa do Service Worker antigo)
 * 
 * Correção Crítica (Loop Infinito): Redirecionar para um arquivo físico
 * garante a fuga do loop do Service Worker. A limpeza da URL (para '/') 
 * ocorrerá de forma invisível via history.replaceState dentro da própria landing page!
 */
export default function LandingPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user) {
      window.location.replace('/dashboard');
    } else {
      // Usamos o caminho físico para forçar a saída do controle do PWA antigo
      window.location.replace('/landing-v2.html');
    }
  }, [user, loading]);

  // Tela de loading enquanto verifica autenticação
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0A1628'
    }}>
      <div style={{
        width: 36,
        height: 36,
        border: '3px solid rgba(29,184,116,0.2)',
        borderTopColor: '#1DB874',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
