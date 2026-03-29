import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import type { Student } from '@/data/mockData';

interface StudentFormProps {
  student?: Student;
  trigger?: React.ReactNode;
}

export function StudentForm({ student, trigger }: StudentFormProps) {
  const { addStudent, updateStudent } = useStudents();
  const { plans } = usePlans();
  const isEditing = !!student;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: student?.name || '',
    phone: student?.phone || '',
    email: student?.email || '',
    level: student?.level || '',
    planId: student?.planId || '',
    paymentDueDay: student?.paymentDueDay ? String(student.paymentDueDay) : '',
    paymentStartDate: student?.paymentStartDate || '',
    birthDate: student?.birthDate || '',
  });

  const resetForm = () => {
    if (student) {
      setFormData({ name: student.name, phone: student.phone, email: student.email, level: student.level, planId: student.planId || '', paymentDueDay: student.paymentDueDay ? String(student.paymentDueDay) : '', paymentStartDate: student.paymentStartDate || '', birthDate: student.birthDate || '' });
    } else {
      setFormData({ name: '', phone: '', email: '', level: '', planId: '', paymentDueDay: '', paymentStartDate: '', birthDate: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.email || !formData.level) {
      toast({ title: 'Campos obrigatórios', description: 'Por favor, preencha todos os campos.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const selectedPlan = plans.find(p => p.id === formData.planId);
      const isMonthly = selectedPlan && selectedPlan.billingType === 'monthly';

      let derivedDueDay = formData.paymentDueDay ? Number(formData.paymentDueDay) : undefined;
      let safeStartDate = formData.paymentStartDate || undefined;

      if (isMonthly && formData.paymentStartDate) {
        // Extrai o dia da data selecionada para manter o ciclo de vencimento consistente
        const [year, month, day] = formData.paymentStartDate.split('-');
        derivedDueDay = Number(day);
      } else if (isMonthly && formData.paymentDueDay && !formData.paymentStartDate) {
        // Fallback em caso de falha ou manipulação manual
        derivedDueDay = Number(formData.paymentDueDay);
      } else if (!isMonthly) {
        derivedDueDay = undefined;
        safeStartDate = undefined;
      }

      const data = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        level: formData.level as Student['level'],
        planId: formData.planId && formData.planId !== 'none' && formData.planId !== 'no_plan' ? formData.planId : undefined,
        paymentDueDay: derivedDueDay,
        paymentStartDate: safeStartDate,
        birthDate: formData.birthDate || undefined,
      };

      if (isEditing) {
        await updateStudent(student.id, data);
        toast({ title: 'Aluno atualizado!', description: `${formData.name} foi atualizado com sucesso.` });
      } else {
        await addStudent(data);
        toast({ title: 'Aluno cadastrado!', description: `${formData.name} foi adicionado com sucesso.` });
      }
      resetForm();
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const defaultTrigger = (
    <Button className="btn-primary-gradient">
      <UserPlus className="h-4 w-4 mr-2" />
      Novo Aluno
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{isEditing ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Atualize os dados do aluno.' : 'Preencha os dados básicos do aluno.'}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" placeholder="Ex: João Silva" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" placeholder="(21) 99999-9999" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="email@exemplo.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <Input id="birthDate" type="date" value={formData.birthDate} onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Nível</Label>
            <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
              <SelectTrigger><SelectValue placeholder="Selecione o nível" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="iniciante">Iniciante</SelectItem>
                <SelectItem value="intermediário">Intermediário</SelectItem>
                <SelectItem value="avançado">Avançado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Plano</Label>
            <Select value={formData.planId} onValueChange={(value) => setFormData({ ...formData, planId: value })}>
              <SelectTrigger><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">🧪 Aula Experimental</SelectItem>
                <SelectItem value="no_plan">📋 Sem Plano (Avulso eventual)</SelectItem>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - R$ {plan.price.toFixed(2)}{plan.billingType === 'per_session' ? '/treino' : '/mês'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Start Date - only for monthly plans */}
          {(() => {
            const selectedPlan = plans.find(p => p.id === formData.planId);
            const isMonthly = selectedPlan && selectedPlan.billingType === 'monthly';
            if (!isMonthly) return null;
            return (
              <div className="space-y-2">
                <Label htmlFor="paymentStartDate">Data do Primeiro Pagamento</Label>
                <div className="flex flex-col gap-1">
                  <Input 
                    id="paymentStartDate" 
                    type="date" 
                    value={formData.paymentStartDate} 
                    onChange={(e) => setFormData({ ...formData, paymentStartDate: e.target.value })} 
                  />
                  <span className="text-xs text-muted-foreground">O dia selecionado será o vencimento de todos os meses.</span>
                </div>
              </div>
            );
          })()}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" className="flex-1 btn-primary-gradient" disabled={saving}>
              {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isEditing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
