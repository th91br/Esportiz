import { UserPlus, CreditCard, Activity, CalendarCheck, CalendarPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBusinessContext } from '@/hooks/useBusinessContext';

export function QuickActions() {
  const { isArena, labels } = useBusinessContext();

  const actions = isArena ? [
    { label: 'Nova Reserva', icon: CalendarPlus, href: '/agenda', color: 'text-emerald-500', bg: 'bg-emerald-500/10 hover:bg-emerald-500/20' },
    { label: 'Receber Pgto', icon: CreditCard, href: '/pagamentos', color: 'text-blue-500', bg: 'bg-blue-500/10 hover:bg-blue-500/20' },
    { label: `Novo ${labels.studentLabelSingular}`, icon: UserPlus, href: '/reservantes', color: 'text-violet-500', bg: 'bg-violet-500/10 hover:bg-violet-500/20' },
    { label: 'Visão Geral', icon: Activity, href: '/relatorios', color: 'text-amber-500', bg: 'bg-amber-500/10 hover:bg-amber-500/20' },
  ] : [
    { label: 'Fazer Chamada', icon: CalendarCheck, href: '/presenca', color: 'text-emerald-500', bg: 'bg-emerald-500/10 hover:bg-emerald-500/20' },
    { label: 'Receber Pgto', icon: CreditCard, href: '/pagamentos', color: 'text-blue-500', bg: 'bg-blue-500/10 hover:bg-blue-500/20' },
    { label: `Novo ${labels.studentLabelSingular}`, icon: UserPlus, href: '/alunos', color: 'text-violet-500', bg: 'bg-violet-500/10 hover:bg-violet-500/20' },
    { label: 'Visão Geral', icon: Activity, href: '/relatorios', color: 'text-amber-500', bg: 'bg-amber-500/10 hover:bg-amber-500/20' },
  ];

  return (
    <Card className="shadow-lg border-primary/10 h-full flex flex-col">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 flex-1 px-4 pb-6">
        {actions.map((action, idx) => (
          <Button key={idx} variant="outline" className="h-full min-h-[90px] flex-col items-center justify-center p-3 gap-2 bg-background hover:bg-muted/30 border-border/50 hover:border-primary/30 transition-all duration-300 group" asChild>
            <a href={action.href}>
              <div className={`p-2.5 rounded-xl ${action.bg} transition-colors duration-300`}>
                <action.icon className={`h-5 w-5 ${action.color}`} />
              </div>
              <span className="text-xs font-semibold text-foreground/80">{action.label}</span>
            </a>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
