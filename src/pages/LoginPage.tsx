import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, LogIn, UserPlus, ArrowLeft, Mail } from "lucide-react";
import loginBg from "@/assets/login-bg.jpg";
import { Logo } from "@/components/Logo";
import { getErrorMessage } from "@/lib/errorUtils";

type View = "login" | "signup" | "forgot";

function getViewFromSearchParams(searchParams: URLSearchParams): View {
  const mode = searchParams.get("mode");

  if (mode === "signup" || mode === "forgot" || mode === "login") {
    return mode;
  }

  return "login";
}

const VIEW_COPY: Record<View, { title: string; description: string }> = {
  login: {
    title: "Entre na sua operação",
    description: "Acesse agenda, financeiro e alunos em um único painel responsivo.",
  },
  signup: {
    title: "Crie sua conta de teste",
    description: "Comece com 14 dias grátis, sem cartão e com onboarding guiado.",
  },
  forgot: {
    title: "Recupere seu acesso",
    description: "Envie um link seguro para redefinir sua senha e voltar ao sistema.",
  },
};

export default function LoginPage() {
  const { signIn, signUp, resendConfirmation } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<View>(() => getViewFromSearchParams(new URLSearchParams(window.location.search)));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    setView(getViewFromSearchParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timer = setInterval(() => {
      setResendCountdown((previousValue) => previousValue - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCountdown]);

  const syncMode = (nextView: View) => {
    const nextParams = new URLSearchParams(searchParams);

    if (nextView === "login") {
      nextParams.delete("mode");
    } else {
      nextParams.set("mode", nextView);
    }

    setSearchParams(nextParams, { replace: true });
  };

  const resetFields = () => {
    setName("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setForgotSent(false);
    setUnconfirmedEmail("");
  };

  const goTo = (nextView: View) => {
    resetFields();
    setView(nextView);
    syncMode(nextView);
  };

  const handleResendConfirmation = async () => {
    if (!unconfirmedEmail) return;

    setResending(true);

    try {
      const { error } = await resendConfirmation(unconfirmedEmail);

      if (error) throw error;

      toast({
        title: "E-mail reenviado",
        description: "Um novo link de confirmacao foi enviado para sua caixa de entrada.",
      });
      setResendCountdown(60);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      let description = message;

      if (message.includes("rate limit")) {
        description = "Muitas solicitacoes recentes. Aguarde um minuto antes de tentar novamente.";
      }

      toast({
        title: "Erro ao reenviar",
        description,
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email || !password) {
      toast({ title: "Preencha e-mail e senha", variant: "destructive" });
      return;
    }

    setLoading(true);
    setUnconfirmedEmail("");

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
    } catch (error: unknown) {
      let title = "Erro ao entrar";
      const message = getErrorMessage(error);
      let description = message;

      if (message === "Invalid login credentials") {
        description = "E-mail ou senha incorretos.";
      } else if (message === "Email not confirmed") {
        title = "Confirme seu e-mail";
        description = "Sua conta foi criada, mas o e-mail ainda não foi confirmado.";
        setUnconfirmedEmail(email);
      }

      toast({
        title,
        description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      toast({ title: "Informe seu nome", variant: "destructive" });
      return;
    }

    if (!email) {
      toast({ title: "Informe seu e-mail", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "A senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { error } = await signUp(email, password, name.trim());
      if (error) throw error;

      const createdEmail = email;

      toast({
        title: "Conta criada",
        description: "Confirme seu e-mail para liberar o teste de 14 dias.",
      });

      setName("");
      setPassword("");
      setShowPassword(false);
      setForgotSent(false);
      setView("login");
      syncMode("login");
      setUnconfirmedEmail(createdEmail);
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      let errorMessage = message;

      if (message === "User already registered") {
        errorMessage = "Este e-mail já está cadastrado.";
      } else if (message.includes("rate limit exceeded")) {
        errorMessage = "O limite momentâneo de cadastros foi atingido. Tente novamente em alguns minutos.";
      }

      toast({
        title: "Erro ao criar conta",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email) {
      toast({ title: "Informe seu e-mail", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setForgotSent(true);
    } catch (error: unknown) {
      toast({
        title: "Erro ao enviar e-mail",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copy = VIEW_COPY[view];

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-y-auto py-12 px-4">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat fixed"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222,47%,11%,0.9)] via-[hsl(222,47%,15%,0.8)] to-[hsl(24,95%,20%,0.65)] fixed" />

      <Link
        to="/"
        className="absolute top-4 left-4 sm:top-8 sm:left-8 z-50 flex items-center gap-2 px-3 py-2 sm:px-5 sm:py-2.5 text-sm font-medium text-white/90 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full border border-white/10 hover:border-white/20 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        <span className="hidden sm:inline">Voltar ao início</span>
        <span className="sm:hidden">Voltar</span>
      </Link>

      <div className="relative z-10 w-full max-w-md my-auto">
        <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/30 shadow-2xl overflow-hidden">
          <div className="px-5 sm:px-8 pt-8 pb-6 flex flex-col items-center border-b border-border/20">
            <div className="bg-background/50 p-5 rounded-2xl border border-border/30 shadow-lg mb-4 backdrop-blur-sm">
              <Logo size="lg" showTagline />
            </div>
          </div>

          <div className="flex border-b border-border/20">
            <button
              onClick={() => goTo("login")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                view === "login"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => goTo("signup")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                view === "signup"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Criar conta
            </button>
          </div>

          <div className="px-5 sm:px-8 py-7">
            <div className="mb-6 space-y-2 text-center">
              <h1 className="text-2xl font-display">{copy.title}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">{copy.description}</p>
              {view === "signup" && (
                <div className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mt-3 w-fit mx-auto shadow-sm">
                  14 dias grátis, sem cartão e com acesso completo
                </div>
              )}
            </div>

            {view === "login" && (
              <div className="space-y-5">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Senha</Label>
                      <button
                        type="button"
                        onClick={() => goTo("forgot")}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Sua senha"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full btn-primary-gradient h-11" disabled={loading}>
                    {loading ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        Entrar
                      </>
                    )}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground pt-1">
                    Não tem conta?{" "}
                    <button type="button" onClick={() => goTo("signup")} className="text-primary font-medium hover:underline">
                      Comece grátis
                    </button>
                  </p>
                </form>

                {unconfirmedEmail && (
                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500 backdrop-blur-md flex flex-col gap-3 animate-in fade-in slide-in-from-top-3 duration-300">
                    <div className="flex gap-3 items-start">
                      <Mail className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-amber-400">Confirme seu e-mail</h4>
                        <p className="text-xs text-white/70 leading-relaxed">
                          Enviamos um link para <strong className="text-white">{unconfirmedEmail}</strong>. Verifique tambem a pasta de spam.
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendConfirmation}
                      disabled={resending || resendCountdown > 0}
                      className="w-full bg-amber-500/5 hover:bg-amber-500/20 text-amber-400 border-amber-500/30 hover:border-amber-500/50 hover:text-amber-300 text-xs font-semibold h-9 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      {resending ? (
                        <div className="h-4 w-4 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
                      ) : resendCountdown > 0 ? (
                        `Reenviar link em ${resendCountdown}s`
                      ) : (
                        "Reenviar e-mail de confirmacao"
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {view === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Seu nome</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Joao Silva"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
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
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimo de 6 caracteres"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {[...Array(3)].map((_, index) => (
                        <div
                          key={index}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            password.length >= 10 && index <= 2
                              ? "bg-green-500"
                              : password.length >= 8 && index <= 1
                                ? "bg-yellow-500"
                                : password.length >= 6 && index === 0
                                  ? "bg-red-500"
                                  : "bg-muted"
                          }`}
                        />
                      ))}
                      <span className="text-xs text-muted-foreground ml-1">
                        {password.length < 6 ? "Muito curta" : password.length < 8 ? "Fraca" : password.length < 10 ? "Media" : "Forte"}
                      </span>
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full btn-primary-gradient h-11" disabled={loading}>
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Criar conta e comecar
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center pt-1">
                  Ao criar sua conta voce concorda com os{" "}
                  <a href="/termos.html" className="text-primary hover:underline">
                    Termos de uso
                  </a>
                  .
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  Ja tem conta?{" "}
                  <button type="button" onClick={() => goTo("login")} className="text-primary font-medium hover:underline">
                    Entrar
                  </button>
                </p>
              </form>
            )}

            {view === "forgot" && (
              <div>
                <button
                  type="button"
                  onClick={() => goTo("login")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
                >
                  <ArrowLeft className="h-4 w-4" /> Voltar ao login
                </button>

                {forgotSent ? (
                  <div className="text-center py-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Mail className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">E-mail enviado</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Enviamos as instrucoes de recuperacao para <strong className="text-foreground">{email}</strong>. Verifique sua caixa de entrada e o spam.
                    </p>
                    <Button type="button" variant="outline" className="w-full" onClick={() => goTo("login")}>
                      Voltar ao login
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgot} className="space-y-4">
                    <div className="mb-2">
                      <h3 className="font-semibold text-base">Recuperar senha</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Digite seu e-mail e enviaremos um link seguro para criar uma nova senha.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">E-mail</Label>
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                    <Button type="submit" className="w-full btn-primary-gradient h-11" disabled={loading}>
                      {loading ? (
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Enviar link de recuperacao
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-white/40 mt-5">
          {new Date().getFullYear()} Esportiz. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
