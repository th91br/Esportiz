import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import type { Student } from '@/data/mockData';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { getDayName } from '@/data/mockData';

const studentSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  phone: z.string().min(10, "Telefone inválido (mínimo 10 dígitos)"),
  email: z.string().email("E-mail inválido").optional().or(z.literal('')),
  level: z.string().min(1, "Selecione o nível"),
  birthDate: z.string().optional(),
  planId: z.string().optional(),
  paymentDueDay: z.string().optional(),
  paymentStartDate: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentFormProps {
  student?: Student;
  trigger?: React.ReactNode;
}

export function StudentForm({ student, trigger }: StudentFormProps) {
  const { addStudent, updateStudent } = useStudents();
  const { plans } = usePlans();
  const { trainings, addTraining, updateTraining } = useTrainings();
  const isEditing = !!student;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Freq adjustment state
  const [schedulePromptOpen, setSchedulePromptOpen] = useState(false);
  const [schedulePromptData, setSchedulePromptData] = useState<{ studentId: string, name: string, oldFreq: number, newFreq: number } | null>(null);
  const [selectedSchedules, setSelectedSchedules] = useState<{ dayOfWeek: number, time: string }[]>([]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: student?.name || '',
      phone: student?.phone || '',
      email: student?.email || '',
      level: student?.level || '',
      planId: student?.planId || 'none',
      paymentDueDay: student?.paymentDueDay ? String(student.paymentDueDay) : '',
      paymentStartDate: student?.paymentStartDate || '',
      birthDate: student?.birthDate || '',
    },
  });

  useEffect(() => {
    if (open) {
      if (student) {
        form.reset({
          name: student.name,
          phone: student.phone,
          email: student.email || '',
          level: student.level,
          planId: student.planId || 'none',
          paymentDueDay: student.paymentDueDay ? String(student.paymentDueDay) : '',
          paymentStartDate: student.paymentStartDate || '',
          birthDate: student.birthDate || '',
        });
      } else {
        form.reset({
          name: '', phone: '', email: '', level: '', planId: 'none', paymentDueDay: '', paymentStartDate: '', birthDate: ''
        });
      }
    }
  }, [open, student, form]);

  const planIdWatch = form.watch('planId');
  const selectedPlan = plans.find(p => p.id === planIdWatch);
  const isMonthly = selectedPlan && selectedPlan.billingType === 'monthly';

  const onSubmit = async (formData: StudentFormValues) => {
    setSaving(true);
    try {
      let derivedDueDay = formData.paymentDueDay ? Number(formData.paymentDueDay) : undefined;
      let safeStartDate = formData.paymentStartDate || undefined;

      if (isMonthly && formData.paymentStartDate) {
        const [year, month, day] = formData.paymentStartDate.split('-');
        derivedDueDay = Number(day);
      } else if (isMonthly && formData.paymentDueDay && !formData.paymentStartDate) {
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

        // Check if frequency changed
        const oldPlan = plans.find(p => p.id === student.planId);
        const newPlan = plans.find(p => p.id === data.planId);
        const oldFreq = oldPlan?.billingType === 'monthly' ? oldPlan.sessionsPerWeek : 0;
        const newFreq = newPlan?.billingType === 'monthly' ? newPlan.sessionsPerWeek : 0;

        if (oldFreq !== newFreq && newFreq > 0) {
          setSchedulePromptData({ studentId: student.id, name: formData.name, oldFreq, newFreq });
          setSchedulePromptOpen(true);
        }
      } else {
        const result = await addStudent(data);
        toast({ title: 'Aluno cadastrado!', description: `${formData.name} foi adicionado com sucesso.` });
      }
      form.reset();
      setOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!schedulePromptData) return;
    if (selectedSchedules.length !== schedulePromptData.newFreq) {
      toast({ title: 'Erro', description: `Selecione exatamente ${schedulePromptData.newFreq} horário(s).`, variant: 'destructive' });
      return;
    }

    setSavingSchedule(true);
    try {
      // 1. Clean up old future trainings
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.rpc('cleanup_student_future_trainings', { p_student_id: schedulePromptData.studentId });

      // 2. Generate future dates for the next 3 months for the selected days of week
      const todayStr = new Date().toISOString().split('T')[0];
      
      const getFutureDatesForDayOfWeek = (dayOfWeek: number, monthsAhead: number): string[] => {
        const date = new Date(todayStr + 'T12:00:00');
        const startYear = date.getFullYear();
        const startMonth = date.getMonth();
        const endDate = new Date(startYear, startMonth + monthsAhead, date.getDate()); 
        const dates: string[] = [];
        
        const currentIterDate = new Date(startYear, startMonth, date.getDate());
        while (currentIterDate <= endDate) {
          if (currentIterDate.getDay() === dayOfWeek) {
            dates.push(currentIterDate.toISOString().split('T')[0]);
          }
          currentIterDate.setDate(currentIterDate.getDate() + 1);
        }
        return dates;
      };

      for (const schedule of selectedSchedules) {
        const dates = getFutureDatesForDayOfWeek(schedule.dayOfWeek, 3);
        for (const date of dates) {
          const existing = trainings.find(t => t.date === date && t.time === schedule.time);
          if (existing) {
            if (!existing.studentIds.includes(schedulePromptData.studentId)) {
              await updateTraining(existing.id, {
                studentIds: [...existing.studentIds, schedulePromptData.studentId]
              });
            }
          } else {
            await addTraining({
              date,
              time: schedule.time as any,
              location: "Esportiz",
              studentIds: [schedulePromptData.studentId]
            });
          }
        }
      }

      toast({ title: 'Agenda configurada!', description: 'Treinos gerados para os próximos 3 meses.' });
      setSchedulePromptOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro ao configurar agenda', description: err.message, variant: 'destructive' });
    } finally {
      setSavingSchedule(false);
    }
  };

  const defaultTrigger = (
    <Button className="btn-primary-gradient">
      <UserPlus className="h-4 w-4 mr-2" />
      Novo Aluno
    </Button>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{isEditing ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Atualize os dados do aluno.' : 'Preencha os dados básicos do aluno.'}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(21) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Nascimento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecione o nível" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="iniciante">Iniciante</SelectItem>
                      <SelectItem value="intermediário">Intermediário</SelectItem>
                      <SelectItem value="avançado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="planId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plano</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                    </FormControl>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {isMonthly && (
              <FormField
                control={form.control}
                name="paymentStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Primeiro Pagamento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>
                      O dia selecionado será o vencimento de todos os meses.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="flex-1 btn-primary-gradient" disabled={saving}>
                {saving ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isEditing ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {schedulePromptData && (
      <Dialog open={schedulePromptOpen} onOpenChange={setSchedulePromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Ajustar Calendário</DialogTitle>
            <DialogDescription>
              A frequência de {schedulePromptData.name} mudou de {schedulePromptData.oldFreq}x para {schedulePromptData.newFreq}x na semana.
              Quais dias e horários o aluno irá treinar?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {Array.from({ length: schedulePromptData.newFreq }).map((_, index) => {
              const currentVal = selectedSchedules[index] || { dayOfWeek: 1, time: '18:00' };
              return (
                <div key={index} className="flex gap-2">
                  <Select 
                    value={currentVal.dayOfWeek.toString()} 
                    onValueChange={(v) => {
                      const newSchedules = [...selectedSchedules];
                      newSchedules[index] = { ...currentVal, dayOfWeek: parseInt(v) };
                      setSelectedSchedules(newSchedules);
                    }}
                  >
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Dia" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Segunda-feira</SelectItem>
                      <SelectItem value="2">Terça-feira</SelectItem>
                      <SelectItem value="3">Quarta-feira</SelectItem>
                      <SelectItem value="4">Quinta-feira</SelectItem>
                      <SelectItem value="5">Sexta-feira</SelectItem>
                      <SelectItem value="6">Sábado</SelectItem>
                      <SelectItem value="0">Domingo</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input 
                    type="time" 
                    className="w-32" 
                    value={currentVal.time} 
                    onChange={(e) => {
                      const newSchedules = [...selectedSchedules];
                      newSchedules[index] = { ...currentVal, time: e.target.value };
                      setSelectedSchedules(newSchedules);
                    }}
                  />
                </div>
              );
            })}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setSchedulePromptOpen(false)}>Depois</Button>
              <Button type="button" onClick={handleSaveSchedule} className="flex-1 btn-primary-gradient" disabled={savingSchedule}>
                {savingSchedule ? 'Ajustando...' : 'Aplicar Agenda'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}
