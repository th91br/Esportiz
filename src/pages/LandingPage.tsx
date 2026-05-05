import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * LandingPage — rota pública "/"
 * Solução definitiva de cache:
 * - Se logado → /dashboard
 * - Se não logado → redireciona para /landing-v2.html (fora do React bundle,
 *   portanto fora do controle do Service Worker de desenvolvimento)
 * 
 * Isso elimina o problema de cache do PWA Service Worker que impedia
 * atualizações de aparecer no navegador durante o desenvolvimento.
 */
export default function LandingPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user) {
      window.location.replace('/dashboard');
    } else {
      // Redireciona para a landing page estática totalmente fora do React
      // garantindo que não há interferência do Service Worker
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
