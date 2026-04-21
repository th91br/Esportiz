import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import loginBg from '@/assets/login-bg.jpg';
import { Logo } from '@/components/Logo';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Senha deve ter no mínimo 6 caracteres', variant: 'destructive' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Senha atualizada com sucesso!' });
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar senha', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${loginBg})` }} />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222,47%,11%,0.85)] via-[hsl(222,47%,15%,0.75)] to-[hsl(24,95%,20%,0.6)]" />
        <div className="relative z-10 w-full max-w-md mx-4">
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/30 shadow-2xl p-8 text-center flex flex-col items-center">
            <div className="mb-6"><Logo size="md" /></div>
            <h1 className="font-display text-xl font-bold text-foreground mb-2">Link inválido</h1>
            <p className="text-muted-foreground text-sm mb-6">Este link de recuperação é inválido ou expirou.</p>
            <Button onClick={() => navigate('/login')} className="btn-primary-gradient">Voltar ao Login</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${loginBg})` }} />
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222,47%,11%,0.85)] via-[hsl(222,47%,15%,0.75)] to-[hsl(24,95%,20%,0.6)]" />
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/30 shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="mb-6"><Logo size="md" /></div>
            <h1 className="font-display text-2xl font-extrabold text-foreground">Nova Senha</h1>
            <p className="text-muted-foreground text-sm mt-1">Digite sua nova senha abaixo</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <Button type="submit" className="w-full btn-primary-gradient h-11" disabled={loading}>
              {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><KeyRound className="h-4 w-4 mr-2" />Atualizar Senha</>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
