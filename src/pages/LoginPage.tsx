import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, LogIn, UserPlus, ArrowLeft, Mail } from 'lucide-react';
import loginBg from '@/assets/login-bg.jpg';
import { Logo } from '@/components/Logo';

type View = 'login' | 'signup' | 'forgot';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [view, setView] = useState<View>('login');

  // Campos
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const resetFields = () => {
    setName(''); setEmail(''); setPassword('');
    setShowPassword(false); setForgotSent(false);
  };

  const goTo = (v: View) => { resetFields(); setView(v); };

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Preencha e-mail e senha', variant: 'destructive' }); return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
    } catch (err: any) {
      toast({
        title: 'Erro ao entrar',
        description: err.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.' : err.message,
        variant: 'destructive',
      });
    } finally { setLoading(false); }
  };

  // ── CADASTRO ──────────────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Informe seu nome', variant: 'destructive' }); return;
    }
    if (!email) {
      toast({ title: 'Informe seu e-mail', variant: 'destructive' }); return;
    }
    if (password.length < 6) {
      toast({ title: 'Senha deve ter pelo menos 6 caracteres', variant: 'destructive' }); return;
    }
    setLoading(true);
    try {
      const { error } = await signUp(email, password, name.trim());
      if (error) throw error;
      toast({
        title: 'Conta criada! 🎉',
        description: 'Verifique seu e-mail para confirmar o cadastro.',
      });
      goTo('login');
    } catch (err: any) {
      let errorMessage = err.message;
      
      if (err.message === 'User already registered') {
        errorMessage = 'Este e-mail já está cadastrado.';
      } else if (err.message.includes('rate limit exceeded')) {
        errorMessage = 'O limite de cadastros momentâneo foi atingido. Por favor, tente novamente em alguns minutos ou entre em contato com nosso suporte.';
      }

      toast({
        title: 'Erro ao criar conta',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally { setLoading(false); }
  };

  // ── RECUPERAR SENHA ────────────────────────────────────────────────────────
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: 'Informe seu e-mail', variant: 'destructive' }); return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
    } catch (err: any) {
      toast({ title: 'Erro ao enviar e-mail', description: err.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222,47%,11%,0.9)] via-[hsl(222,47%,15%,0.8)] to-[hsl(24,95%,20%,0.65)]" />

      {/* Botão de Voltar */}
      <Link
        to="/"
        className="absolute top-4 left-4 sm:top-8 sm:left-8 z-50 flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 text-sm font-medium text-white/90 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:border-white/20 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        <span className="hidden sm:inline">Voltar ao Início</span>
        <span className="sm:hidden">Voltar</span>
      </Link>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/30 shadow-2xl overflow-hidden">

          {/* Header do card */}
          <div className="px-8 pt-8 pb-6 flex flex-col items-center border-b border-border/20">
            <div className="bg-background/50 p-5 rounded-2xl border border-border/30 shadow-lg mb-4 backdrop-blur-sm">
              <Logo size="lg" showTagline />
            </div>
          </div>

          {/* Tabs de navegação */}
          <div className="flex border-b border-border/20">
            <button
              onClick={() => goTo('login')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                view === 'login'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => goTo('signup')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                view === 'signup'
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Criar conta
            </button>
          </div>

          <div className="px-8 py-7">

            {/* ── VIEW: LOGIN ─────────────────────────────────────────────── */}
            {view === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => goTo('forgot')}
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full btn-primary-gradient h-11" disabled={loading}>
                  {loading
                    ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><LogIn className="h-4 w-4 mr-2" />Entrar</>
                  }
                </Button>
                <p className="text-center text-sm text-muted-foreground pt-1">
                  Não tem conta?{' '}
                  <button type="button" onClick={() => goTo('signup')} className="text-primary font-medium hover:underline">
                    Crie grátis
                  </button>
                </p>
              </form>
            )}

            {/* ── VIEW: CADASTRO ──────────────────────────────────────────── */}
            {view === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Seu nome</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="João Silva"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Indicador de força */}
                  {password.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            password.length >= 6 && i === 0 ? 'bg-red-500' :
                            password.length >= 8 && i <= 1 ? 'bg-yellow-500' :
                            password.length >= 10 && i <= 2 ? 'bg-green-500' :
                            password.length >= 6 && i < 1 ? 'bg-red-500' :
                            'bg-muted'
                          }`}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">
                        {password.length < 6 ? 'Muito curta' : password.length < 8 ? 'Fraca' : password.length < 10 ? 'Média' : 'Forte'}
                      </span>
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full btn-primary-gradient h-11" disabled={loading}>
                  {loading
                    ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><UserPlus className="h-4 w-4 mr-2" />Criar conta grátis</>
                  }
                </Button>
                <p className="text-xs text-muted-foreground text-center pt-1">
                  Ao criar sua conta você concorda com os{' '}
                  <a href="#" className="text-primary hover:underline">Termos de uso</a>.
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  Já tem conta?{' '}
                  <button type="button" onClick={() => goTo('login')} className="text-primary font-medium hover:underline">
                    Entrar
                  </button>
                </p>
              </form>
            )}

            {/* ── VIEW: RECUPERAR SENHA ────────────────────────────────────── */}
            {view === 'forgot' && (
              <div>
                <button
                  type="button"
                  onClick={() => goTo('login')}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar ao login
                </button>

                {forgotSent ? (
                  /* Estado: e-mail enviado */
                  <div className="text-center py-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Mail className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">E-mail enviado!</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Enviamos as instruções de recuperação para <strong className="text-foreground">{email}</strong>.
                      Verifique sua caixa de entrada (e o spam).
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => goTo('login')}
                    >
                      Voltar ao login
                    </Button>
                  </div>
                ) : (
                  /* Estado: formulário de recuperação */
                  <form onSubmit={handleForgot} className="space-y-4">
                    <div className="mb-2">
                      <h3 className="font-semibold text-base">Recuperar senha</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Digite seu e-mail e enviaremos um link para criar uma nova senha.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">E-mail</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                    <Button type="submit" className="w-full btn-primary-gradient h-11" disabled={loading}>
                      {loading
                        ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <><Mail className="h-4 w-4 mr-2" />Enviar link de recuperação</>
                      }
                    </Button>
                  </form>
                )}
              </div>
            )}

          </div>
        </div>

        <p className="text-center text-xs text-white/40 mt-5">
          © {new Date().getFullYear()} Esportiz. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
