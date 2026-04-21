import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * LandingPage — rota pública "/"
 * Se o usuário já estiver autenticado, redireciona para o dashboard.
 * Caso contrário, redireciona para a landing page estática (HTML puro)
 * que está em /public/landing.html — sem overhead do React bundle.
 */
export default function LandingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifySelf: 'center', background: '#0A1628' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(29,184,116,0.2)', borderTopColor: '#1DB874', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  // Renderiza a landing page estática dentro de um frame de alta performance
  // Isso resolve conflitos de Service Worker/Cache e mantém a URL como "/"
  return (
    <div className="fixed inset-0 w-full h-full bg-[#0A1628] overflow-hidden">
      <iframe 
        src="/landing.html" 
        className="w-full h-full border-none"
        title="Esportiz — Gestão que joga junto"
      />
    </div>
  );
}
