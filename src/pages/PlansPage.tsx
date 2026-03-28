import { useState } from 'react';
import { DollarSign, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { usePlans } from '@/hooks/queries/usePlans';
import { useStudents } from '@/hooks/queries/useStudents';
import type { Plan } from '@/data/mockData';

export default function PlansPage() {
  const { plans, addPlan, updatePlan, deletePlan } = usePlans();
  const { students } = useStudents();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | undefined>();
  const [formName, setFormName] = useState('');
  const [formSessions, setFormSessions] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formBillingType, setFormBillingType] = useState<'monthly' | 'per_session'>('monthly');
  const [saving, setSaving] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem('privacyMode') === 'true');

  const openNew = () => { setEditingPlan(undefined); setFormName(''); setFormSessions(''); setFormPrice(''); setFormBillingType('monthly'); setDialogOpen(true); };
  const openEdit = (plan: Plan) => { setEditingPlan(plan); setFormName(plan.name); setFormSessions(plan.sessionsPerWeek.toString()); setFormPrice(plan.price.toString()); setFormBillingType(plan.billingType); setDialogOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formSessions || !formPrice) { toast({ title: 'Preencha todos os campos', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const data = { name: formName, sessionsPerWeek: parseInt(formSessions), price: parseFloat(formPrice), billingType: formBillingType };
      if (editingPlan) {
        await updatePlan(editingPlan.id, data);
        toast({ title: 'Plano atualizado!' });
      } else {
        await addPlan(data);
        toast({ title: 'Plano criado!' });
      }
      setDialogOpen(false);
    } finally { setSaving(false); }
  };

  const handleDelete = async (plan: Plan) => {
    await deletePlan(plan.id);
    toast({ title: 'Plano removido' });
  };

  const getStudentsOnPlan = (planId: string) => students.filter((s) => s.planId === planId && s.active);
  const totalRevenue = plans.reduce((sum, plan) => {
    if (plan.billingType === 'per_session') return sum; // avulso não conta como receita fixa mensal
    return sum + getStudentsOnPlan(plan.id).length * plan.price;
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 md:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="section-title text-2xl md:text-3xl">Planos e Preços</h1>
            <p className="text-muted-foreground mt-1">Gerencie os planos de treino e valores</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => { const next = !privacyMode; setPrivacyMode(next); localStorage.setItem('privacyMode', String(next)); }} title={privacyMode ? 'Mostrar dados' : 'Ocultar dados'}>
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button className="btn-primary-gradient" onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Plano</Button>
          </div>
        </div>

        <div className="card-elevated p-6 bg-gradient-hero text-white">
          <div className="flex items-center gap-3 mb-2"><DollarSign className="h-6 w-6" /><h2 className="font-display font-bold text-xl">Receita Mensal Estimada</h2></div>
          <p className="font-display text-4xl font-extrabold">{privacyMode ? '••••' : `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</p>
          <p className="text-white/70 text-sm mt-1">Baseado em {students.filter((s) => s.active && s.planId).length} aluno(s) com plano ativo (excluindo avulsos e experimentais)</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const planStudents = getStudentsOnPlan(plan.id);
            const isPerSession = plan.billingType === 'per_session';
            return (
              <div key={plan.id} className="card-elevated p-6 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-lg">{plan.name}</h3>
                      {isPerSession && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 text-[10px] font-semibold uppercase tracking-wide">Avulso</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{isPerSession ? 'Por treino' : `${plan.sessionsPerWeek}x por semana`}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(plan)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Remover plano?</AlertDialogTitle>
                          <AlertDialogDescription>{planStudents.length > 0 ? `${planStudents.length} aluno(s) serão desvinculados.` : 'Nenhum aluno vinculado.'}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(plan)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="text-3xl font-display font-extrabold text-primary mb-4">
                  R$ {plan.price.toFixed(2)}
                  <span className="text-sm font-normal text-muted-foreground">{isPerSession ? '/treino' : '/mês'}</span>
                </div>
                <div className="mt-auto pt-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">{planStudents.length} aluno(s) neste plano</p>
                  {planStudents.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {planStudents.map((s) => (<span key={s.id} className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium">{s.name.split(' ')[0]}</span>))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {plans.length === 0 && (
            <div className="col-span-full card-elevated p-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-lg font-medium text-muted-foreground">Nenhum plano cadastrado</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Crie seu primeiro plano de treino</p>
            </div>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
              <DialogDescription>Configure o nome, frequência e valor.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2"><Label>Nome do plano</Label><Input placeholder="Ex: 2x na semana" value={formName} onChange={(e) => setFormName(e.target.value)} /></div>
              <div className="space-y-2">
                <Label>Tipo de cobrança</Label>
                <Select value={formBillingType} onValueChange={(v) => setFormBillingType(v as 'monthly' | 'per_session')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="per_session">Avulso (por treino)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formBillingType === 'monthly' && (
                <div className="space-y-2"><Label>Vezes por semana</Label><Input type="number" min="1" max="7" placeholder="2" value={formSessions} onChange={(e) => setFormSessions(e.target.value)} /></div>
              )}
              <div className="space-y-2"><Label>{formBillingType === 'per_session' ? 'Preço por treino (R$)' : 'Preço mensal (R$)'}</Label><Input type="number" min="0" step="0.01" placeholder={formBillingType === 'per_session' ? '45.00' : '250.00'} value={formPrice} onChange={(e) => setFormPrice(e.target.value)} /></div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1 btn-primary-gradient" disabled={saving}>
                  {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : editingPlan ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
