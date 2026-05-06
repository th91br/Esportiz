import { useState, useEffect } from 'react';
import { UserPlus, UploadCloud, MapPin, FileText, Beaker, UsersRound, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
import { usePayments } from '@/hooks/queries/usePayments';
import { useModalities } from '@/hooks/queries/useModalities';
import { useGroups } from '@/hooks/queries/useGroups';
import type { Student } from '@/data/mockData';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { useAuth } from '@/contexts/AuthContext';
import { getDayName } from '@/data/mockData';
import { useBusinessContext } from '@/hooks/useBusinessContext';

const studentSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  phone: z.string().min(10, "Telefone inválido (mínimo 10 dígitos)"),
  email: z.string().email("E-mail inválido").optional().or(z.literal('')),
  level: z.string().optional().or(z.literal('')),
  birthDate: z.string().optional(),
  planId: z.string().optional(),
  paymentDueDay: z.string().optional(),
  modalityId: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

interface StudentFormProps {
  student?: Student;
  trigger?: React.ReactNode;
}

export function StudentForm({ student, trigger }: StudentFormProps) {
  const { addStudent, updateStudent } = useStudents();
  const { plans } = usePlans();
  const { modalities } = useModalities();
  const { trainings, addTraining, updateTraining } = useTrainings();
  const { user } = useAuth();
  const isEditing = !!student;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(student?.photo || null);
  const [isTrial, setIsTrial] = useState(student?.isTrial ?? false);
  const { generateMonthlyPayments, syncStudentPayments } = usePayments();
  const [billingStartMonth, setBillingStartMonth] = useState(new Date().toLocaleDateString('en-CA').slice(0, 7));
  const { groups } = useGroups();
  const [selectedGroups, setSelectedGroups] = useState<string[]>(student?.groupIds || []);
  const { labels, isOther, isArena } = useBusinessContext();

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
      birthDate: student?.birthDate || '',
      modalityId: student?.modalityId || 'none',
      cpf: student?.cpf || '',
      rg: student?.rg || '',
      address: student?.address || '',
      city: student?.city || '',
      state: student?.state || '',
      zipCode: student?.zipCode || '',
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
          birthDate: student.birthDate || '',
          modalityId: student.modalityId || 'none',
          cpf: student.cpf || '',
          rg: student.rg || '',
          address: student.address || '',
          city: student.city || '',
          state: student.state || '',
          zipCode: student.zipCode || '',
        });
        setPhotoPreview(student.photo || null);
        setIsTrial(student.isTrial ?? false);
        setSelectedGroups(student.groupIds || []);
      } else {
        form.reset({
          name: '', phone: '', email: '', level: '', planId: 'none', paymentDueDay: '', birthDate: '', modalityId: 'none',
          cpf: '', rg: '', address: '', city: '', state: '', zipCode: ''
        });
        setPhotoPreview(null);
        setIsTrial(false);
        setSelectedGroups([]);
      }
      setPhotoFile(null);
    }
  }, [open, student, form]);

  const planIdWatch = form.watch('planId');
  const selectedPlan = plans.find(p => p.id === planIdWatch);
  const isMonthly = selectedPlan && selectedPlan.billingType === 'monthly';

  const onSubmit = async (formData: StudentFormValues) => {
    setSaving(true);
    try {
      let derivedDueDay = formData.paymentDueDay ? Number(formData.paymentDueDay) : undefined;

      if (!isMonthly) {
        derivedDueDay = undefined;
      }

      // Handle photo upload
      let photoUrl = student?.photo || undefined;
      if (photoFile) {
        const { supabase } = await import('@/integrations/supabase/client');
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${user?.id || 'anon'}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('student-photos').upload(fileName, photoFile, { upsert: true });
        if (uploadError) throw new Error('Erro no upload da foto: ' + uploadError.message);
        const { data: urlData } = supabase.storage.from('student-photos').getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      }

      const data = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        level: (isArena ? 'iniciante' : (
          formData.level === 'fluente' || formData.level === 'avançado' ? 'avançado' :
          formData.level === 'pré-intermediário' || formData.level === 'intermediário' || formData.level === 'intermediário avançado' ? 'intermediário' : 'iniciante'
        )) as Student['level'],
        planId: formData.planId && formData.planId !== 'none' && formData.planId !== 'no_plan' ? formData.planId : null,
        paymentDueDay: derivedDueDay || null,
        birthDate: formData.birthDate || null,
        modalityId: formData.modalityId && formData.modalityId !== 'none' ? formData.modalityId : null,
        photo: photoUrl || null,
        cpf: formData.cpf || null,
        rg: formData.rg || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zipCode: formData.zipCode || null,
        isTrial,
        trialStartedAt: isTrial && !student?.trialStartedAt ? new Date().toISOString() : student?.trialStartedAt || null,
        trialConvertedAt: !isTrial && student?.isTrial ? new Date().toISOString() : student?.trialConvertedAt || null,
        groupIds: selectedGroups,
      };

      if (isEditing) {
        const result = await updateStudent(student.id, data);
        const updatedStudentId = student.id;
        toast({ title: `${labels.studentLabelSingular} atualizado(a)!`, description: `${formData.name} foi atualizado(a) com sucesso.` });

        // Sync payments if it's or was a monthly plan
        const oldPlan = plans.find(p => p.id === student.planId);
        const newPlan = plans.find(p => p.id === data.planId);
        const wasMonthly = oldPlan?.billingType === 'monthly';
        const isMonthlyNow = newPlan?.billingType === 'monthly';

        if (wasMonthly || isMonthlyNow) {
          // 1. If it's monthly now, ensure the record for the start month exists
          if (isMonthlyNow) {
            await generateMonthlyPayments(billingStartMonth);
          }
          
          // 2. Sync (update or delete unpaid)
          await syncStudentPayments({
            studentId: updatedStudentId,
            planChanged: student.planId !== data.planId,
            newPlanId: data.planId,
            newDueDay: data.paymentDueDay
          });
        }

        // Check if frequency changed for training schedule
        const oldFreq = oldPlan?.billingType === 'monthly' ? oldPlan.sessionsPerWeek : 0;
        const newFreq = newPlan?.billingType === 'monthly' ? newPlan.sessionsPerWeek : 0;

        if (oldFreq !== newFreq && newFreq > 0) {
          setSchedulePromptData({ studentId: student.id, name: formData.name, oldFreq, newFreq });
          setSchedulePromptOpen(true);
        }
      } else {
        const result = await addStudent(data);
        toast({ title: `${labels.studentLabelSingular} cadastrado(a)!`, description: `${formData.name} foi adicionado(a) com sucesso.` });
        
        // Generate initial payment if monthly
        if (data.planId) {
          const planObj = plans.find(p => p.id === data.planId);
          if (planObj?.billingType === 'monthly') {
            await generateMonthlyPayments(billingStartMonth);
          }
        }
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

      toast({ title: 'Agenda configurada!', description: `${labels.trainingLabel} gerados para os próximos 3 meses.` });
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
      Novo {labels.studentLabelSingular}
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
          <DialogTitle className="font-display">{isEditing ? `Editar ${labels.studentLabelSingular}` : `Cadastrar Novo ${labels.studentLabelSingular}`}</DialogTitle>
          <DialogDescription>{isEditing ? `Atualize os dados do ${labels.studentLabelSingular.toLowerCase()}.` : `Preencha os dados básicos do ${labels.studentLabelSingular.toLowerCase()}.`}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            {/* Trial Student Toggle */}
            {!isArena && (
              <button type="button" onClick={() => setIsTrial(!isTrial)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left",
                  isTrial 
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300" 
                    : "border-border/50 bg-muted/20 text-muted-foreground hover:border-border"
                )}>
                <Beaker className="h-5 w-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block">{labels.trainingLabelSingular} Experimental</span>
                  <span className="text-[11px] opacity-70">
                    {isTrial ? `Este ${labels.studentLabelSingular.toLowerCase()} está em período de teste` : `Marcar como ${labels.studentLabelSingular.toLowerCase()} experimental`}
                  </span>
                </div>
                <div className={cn(
                  "h-6 w-11 rounded-full transition-colors relative shrink-0",
                  isTrial ? "bg-amber-500" : "bg-border"
                )}>
                  <div className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    isTrial ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </div>
              </button>
            )}
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

            {/* Foto do Aluno */}
            <div className="space-y-2">
              <FormLabel>Foto do {labels.studentLabelSingular}</FormLabel>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-xl border-2 border-dashed border-border overflow-hidden flex items-center justify-center bg-muted/30 shrink-0">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <UploadCloud className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <UploadCloud className="h-3.5 w-3.5" />
                    {photoPreview ? 'Trocar foto' : 'Escolher foto'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                          toast({ title: 'Foto muito grande', description: 'O limite é 2MB.', variant: 'destructive' });
                          return;
                        }
                        setPhotoFile(file);
                        setPhotoPreview(URL.createObjectURL(file));
                      }
                    }} />
                  </label>
                  <p className="text-[10px] text-muted-foreground">JPG, PNG ou WebP. Máx 2MB.</p>
                </div>
              </div>
            </div>

            {/* Seção: Documentos */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Documentos</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="cpf" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="rg" render={({ field }) => (
                  <FormItem>
                    <FormLabel>RG</FormLabel>
                    <FormControl><Input placeholder="00.000.000-0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Seção: Endereço */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Endereço</span>
              </div>
              <div className="space-y-3">
                <FormField control={form.control} name="address" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl><Input placeholder="Rua, número, complemento" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl><Input placeholder="Ex: São Paulo" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl><Input placeholder="Ex: SP" maxLength={2} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="zipCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl><Input placeholder="00000-000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {!isArena && (
              <>
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
                          {isOther ? (
                            <>
                              <SelectItem value="sem_nível">Sem nível definido</SelectItem>
                              <SelectItem value="básico 1">Básico 1</SelectItem>
                              <SelectItem value="básico 2">Básico 2</SelectItem>
                              <SelectItem value="pré-intermediário">Pré-Intermediário</SelectItem>
                              <SelectItem value="intermediário">Intermediário</SelectItem>
                              <SelectItem value="intermediário avançado">Intermediário Avançado</SelectItem>
                              <SelectItem value="avançado">Avançado</SelectItem>
                              <SelectItem value="fluente">Fluente / Concluinte</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="iniciante">Iniciante</SelectItem>
                              <SelectItem value="intermediário">Intermediário</SelectItem>
                              <SelectItem value="avançado">Avançado</SelectItem>
                            </>
                          )}
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
                      <FormLabel>{labels.planLabelSingular}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'none'}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder={`Selecione o(a) ${labels.planLabelSingular.toLowerCase()}`} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">🧪 {labels.trainingLabelSingular} Experimental</SelectItem>
                          <SelectItem value="no_plan">📋 Sem {labels.planLabelSingular} (Avulso eventual)</SelectItem>
                          {plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - R$ {plan.price.toFixed(2)}{plan.billingType === 'per_session' ? `/${labels.trainingLabelSingular.toLowerCase()}` : '/mês'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="modalityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{labels.modalityLabelSingular}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'none'}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder={`Selecione o(a) ${labels.modalityLabelSingular.toLowerCase()}`} /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem {labels.modalityLabelSingular.toLowerCase()} definido</SelectItem>
                          {modalities.map((mod) => (
                            <SelectItem key={mod.id} value={mod.id}>
                              {mod.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3 pt-2">
                  <FormLabel className="flex items-center gap-2 text-foreground">
                    <UsersRound className="h-4 w-4 text-primary" />
                    {labels.groupLabel} (Opcional)
                  </FormLabel>
                  {groups.length === 0 ? (
                    <div className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg border border-dashed text-center">
                      Nenhuma {labels.groupLabelSingular.toLowerCase()} cadastrada. Você pode criar em "{labels.groupLabel}".
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {[...groups].sort((a, b) => {
                        const getFirstSlot = (g: any) => {
                          if (!g.schedule || g.schedule.length === 0) return { day: 8, time: '24:00' };
                          const sortedSlots = [...g.schedule].sort((sa, sb) => {
                            const sortDay = (day: number) => day === 0 ? 7 : day;
                            return sortDay(sa.dayOfWeek) - sortDay(sb.dayOfWeek) || sa.time.localeCompare(sb.time);
                          });
                          const first = sortedSlots[0];
                          return { day: first.dayOfWeek === 0 ? 7 : first.dayOfWeek, time: first.time };
                        };
                        const slotA = getFirstSlot(a);
                        const slotB = getFirstSlot(b);
                        if (slotA.day !== slotB.day) return slotA.day - slotB.day;
                        if (slotA.time !== slotB.time) return slotA.time.localeCompare(slotB.time);
                        return a.name.localeCompare(b.name, 'pt-BR', { numeric: true, sensitivity: 'base' });
                      }).map(group => {
                        const isSelected = selectedGroups.includes(group.id);
                        
                        // Descobrir o primeiro horário para mostrar no botão
                        let timeLabel = '';
                        if (group.schedule && group.schedule.length > 0) {
                          const sortedSlots = [...group.schedule].sort((sa, sb) => {
                            const sortDay = (day: number) => day === 0 ? 7 : day;
                            return sortDay(sa.dayOfWeek) - sortDay(sb.dayOfWeek) || sa.time.localeCompare(sb.time);
                          });
                          timeLabel = ` - ${sortedSlots[0].time}`;
                        }

                        return (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => {
                              setSelectedGroups(prev => 
                                isSelected ? prev.filter(id => id !== group.id) : [...prev, group.id]
                              );
                            }}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                              isSelected 
                                ? "bg-primary/10 border-primary text-primary" 
                                : "bg-background border-border text-muted-foreground hover:border-primary/50"
                            )}
                          >
                            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                            {group.name}{timeLabel}
                            {isSelected && <Check className="h-3 w-3 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {isMonthly && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <FormField
                  control={form.control}
                  name="paymentDueDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dia de Vencimento</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" max="31" placeholder="Ex: 10" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Iniciar Cobrança em</FormLabel>
                  <Select value={billingStartMonth} onValueChange={setBillingStartMonth}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o mês" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: 6 }).map((_, i) => {
                        const d = new Date();
                        d.setMonth(d.getMonth() + i);
                        const val = d.toLocaleDateString('en-CA').slice(0, 7);
                        const label = d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
                        return (
                          <SelectItem key={val} value={val} className="capitalize">
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </FormItem>
              </div>
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
              Quais dias e horários o {labels.studentLabelSingular.toLowerCase()} irá treinar?
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
