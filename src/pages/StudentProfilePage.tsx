import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { usePayments } from '@/hooks/queries/usePayments';
import { useModalities } from '@/hooks/queries/useModalities';
import { useGroups } from '@/hooks/queries/useGroups';
import { useProfile } from '@/hooks/queries/useProfile';
import { useAttendance } from '@/hooks/queries/useAttendance';
import { StudentForm } from '@/components/StudentForm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowLeft, Edit, MapPin, Phone, Mail, FileText, CalendarDays, 
  DollarSign, CheckCircle, XCircle, FileSignature, Activity, TrendingUp, User
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import { cn } from '@/lib/utils';
import { getDayName } from '@/data/mockData';

export default function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Data queries
  const { students, loadingStudents } = useStudents();
  const { plans } = usePlans();
  const { trainings } = useTrainings();
  const { payments } = usePayments();
  const { modalities } = useModalities();
  const { groups } = useGroups();
  const { profile } = useProfile();
  const { attendance } = useAttendance();

  const [activeTab, setActiveTab] = useState('overview');

  const student = students.find(s => s.id === id);
  const loading = loadingStudents;

  const plan = student?.planId ? plans.find(p => p.id === student.planId) : undefined;
  const modality = student?.modalityId ? modalities.find(m => m.id === student.modalityId) : undefined;
  const studentGroups = groups.filter(g => student?.groupIds?.includes(g.id));
  const studentPayments = payments.filter(p => p.studentId === student?.id).sort((a, b) => b.monthRef.localeCompare(a.monthRef));
  
  // Trainings & Attendance Logic
  const today = new Date().toISOString().split('T')[0];
  const studentTrainings = trainings
    .filter(t => t.studentIds.includes(student?.id || '') && t.date <= today)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const studentAttendance = attendance.filter(a => a.studentId === student?.id);
  
  const attendanceStats = useMemo(() => {
    if (studentAttendance.length === 0) return { rate: 0, present: 0, absent: 0 };
    const presentCount = studentAttendance.filter(a => a.present).length;
    const absentCount = studentAttendance.filter(a => !a.present).length;
    const total = presentCount + absentCount;
    const rate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
    
    return { rate, present: presentCount, absent: absentCount };
  }, [studentAttendance]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 text-center text-muted-foreground">Carregando perfil...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 text-center">
          <h2 className="text-xl font-bold mb-4">Aluno não encontrado</h2>
          <Button onClick={() => navigate('/alunos')} variant="outline">Voltar para Alunos</Button>
        </div>
      </div>
    );
  }

  const initials = student.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const handlePrintContract = () => {
    window.print(); // Simple print trigger. A real app might generate a PDF.
  };

  return (
    <div className="min-h-screen bg-background pb-12 print:bg-white print:pb-0">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="container py-6 md:py-8 space-y-6">
        {/* Back navigation */}
        <div className="flex items-center justify-between print:hidden">
          <Button variant="ghost" onClick={() => navigate('/alunos')} className="gap-2 -ml-3 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Voltar para lista
          </Button>
          <StudentForm student={student} trigger={
            <Button variant="outline" className="gap-2">
              <Edit className="h-4 w-4" /> Editar Aluno
            </Button>
          } />
        </div>

        {/* Header Profile Card */}
        <div className="card-elevated p-6 flex flex-col md:flex-row items-start md:items-center gap-6 print:shadow-none print:border-none print:p-0">
          <div className="h-24 w-24 md:h-32 md:w-32 rounded-2xl bg-gradient-hero text-white font-display font-bold text-3xl flex items-center justify-center shrink-0 shadow-lg overflow-hidden border-4 border-background">
            {student.photo ? (
              <img src={student.photo} alt={student.name} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-display font-bold truncate">{student.name}</h1>
              {!student.active && <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-destructive/10 text-destructive border border-destructive/20">Inativo</span>}
              {student.isTrial && <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">Experimental</span>}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {student.phone && <a href={`tel:${student.phone}`} className="flex items-center gap-1.5 hover:text-primary"><Phone className="h-4 w-4" />{student.phone}</a>}
              {student.email && <a href={`mailto:${student.email}`} className="flex items-center gap-1.5 hover:text-primary"><Mail className="h-4 w-4" />{student.email}</a>}
              {(student.city || student.state) && <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{[student.city, student.state].filter(Boolean).join(' - ')}</div>}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="px-3 py-1 rounded-md text-xs font-semibold bg-muted border">
                Nível: <span className="capitalize text-foreground">{student.level}</span>
              </span>
              {modality && (
                <span className="px-3 py-1 rounded-md text-xs font-semibold border flex items-center gap-1.5 bg-background">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: modality.color }} />
                  {modality.name}
                </span>
              )}
              {plan && (
                <span className="px-3 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  {plan.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:w-auto md:inline-flex h-auto p-1 bg-muted/50 gap-1 sm:gap-0">
            <TabsTrigger value="overview" className="gap-2 py-2.5"><User className="h-4 w-4 hidden sm:block" />Visão Geral</TabsTrigger>
            <TabsTrigger value="finance" className="gap-2 py-2.5"><DollarSign className="h-4 w-4 hidden sm:block" />Financeiro</TabsTrigger>
            <TabsTrigger value="attendance" className="gap-2 py-2.5"><Activity className="h-4 w-4 hidden sm:block" />Frequência</TabsTrigger>
            <TabsTrigger value="documents" className="gap-2 py-2.5"><FileSignature className="h-4 w-4 hidden sm:block" />Contratos</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Dados Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">CPF</p>
                      <p className="text-sm font-semibold">{student.cpf || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">RG</p>
                      <p className="text-sm font-semibold">{student.rg || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Data de Nascimento</p>
                      <p className="text-sm font-semibold">{student.birthDate ? new Date(student.birthDate).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Entrada no CT</p>
                      <p className="text-sm font-semibold">{new Date(student.joinDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Endereço Completo</p>
                    <p className="text-sm font-semibold">
                      {student.address ? `${student.address}${student.city ? `, ${student.city}` : ''}${student.state ? ` - ${student.state}` : ''}${student.zipCode ? ` (CEP: ${student.zipCode})` : ''}` : 'Não informado'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Turmas Vinculadas</CardTitle>
                </CardHeader>
                <CardContent>
                  {studentGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-lg">Este aluno não está em nenhuma turma.</p>
                  ) : (
                    <div className="space-y-3">
                      {studentGroups.map(group => (
                        <div key={group.id} className="flex flex-col p-3 rounded-lg border bg-muted/10">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                            <span className="font-semibold text-sm">{group.name}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {group.schedule.map((slot: any, i: number) => (
                              <span key={i} className="text-xs bg-background border px-2 py-1 rounded-md text-muted-foreground">
                                {getDayName(slot.dayOfWeek)} - {slot.time}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* FINANCE TAB */}
          <TabsContent value="finance" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Histórico Financeiro</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                      <p className="text-sm text-primary font-semibold mb-1">Plano Atual</p>
                      <p className="text-xl font-display font-bold">{plan?.name || 'Sem plano'}</p>
                      {plan && <p className="text-xs text-muted-foreground mt-1">{formatCurrency(plan.price)} {plan.billingType === 'monthly' ? 'por mês' : 'por sessão'}</p>}
                    </div>
                    <div className="bg-muted rounded-xl p-4">
                      <p className="text-sm text-muted-foreground font-semibold mb-1">Vencimento</p>
                      <p className="text-xl font-display font-bold">{student.paymentDueDay ? `Dia ${student.paymentDueDay}` : 'Não se aplica'}</p>
                    </div>
                    <div className="bg-muted rounded-xl p-4">
                      <p className="text-sm text-muted-foreground font-semibold mb-1">Total Pago Histórico</p>
                      <p className="text-xl font-display font-bold text-emerald-600">
                        {formatCurrency(studentPayments.filter(p => p.paid).reduce((acc, curr) => acc + curr.amount, 0))}
                      </p>
                    </div>
                  </div>

                  {studentPayments.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">Nenhum registro de pagamento encontrado.</p>
                  ) : (
                    <div className="rounded-md border overflow-x-auto custom-scrollbar">
                      <table className="w-full min-w-[500px] text-sm text-left">
                        <thead className="bg-muted/50 font-medium">
                          <tr>
                            <th className="px-4 py-3 border-b">Referência</th>
                            <th className="px-4 py-3 border-b">Valor</th>
                            <th className="px-4 py-3 border-b">Status</th>
                            <th className="px-4 py-3 border-b">Data Pagamento</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {studentPayments.map(payment => {
                            const [year, month] = payment.monthRef.split('-');
                            const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
                            return (
                              <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 capitalize font-medium">{monthName}</td>
                                <td className="px-4 py-3">{formatCurrency(payment.amount)}</td>
                                <td className="px-4 py-3">
                                  {payment.paid ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle className="h-3 w-3" /> Pago</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full"><XCircle className="h-3 w-3" /> Pendente</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('pt-BR') : '-'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
             </Card>
          </TabsContent>

          {/* ATTENDANCE TAB */}
          <TabsContent value="attendance" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Visão de Frequência</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                      <p className="text-sm text-primary font-semibold mb-1">Taxa de Frequência</p>
                      <p className="text-3xl font-display font-bold">{attendanceStats.rate}%</p>
                    </div>
                    <div className="bg-muted rounded-xl p-4">
                      <p className="text-sm text-muted-foreground font-semibold mb-1">Presenças</p>
                      <p className="text-3xl font-display font-bold text-emerald-600">{attendanceStats.present}</p>
                    </div>
                    <div className="bg-muted rounded-xl p-4">
                      <p className="text-sm text-muted-foreground font-semibold mb-1">Faltas</p>
                      <p className="text-3xl font-display font-bold text-destructive">{attendanceStats.absent}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-3">Últimas Aulas</h3>
                    {studentTrainings.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 border border-dashed rounded-lg text-center">Nenhum treino encontrado para este aluno.</p>
                    ) : (
                      <div className="space-y-3">
                        {studentTrainings.slice(0, 10).map(training => {
                          const record = studentAttendance.find(a => a.trainingId === training.id);
                          const trainingGroup = groups.find(g => g.id === training.groupId);
                          
                          return (
                            <div key={training.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border bg-muted/10">
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">{trainingGroup?.name || 'Treino'}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(training.date).toLocaleDateString('pt-BR')} às {training.time}
                                </span>
                              </div>
                              <div className="shrink-0">
                                {!record ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full"><Activity className="h-3 w-3" /> Sem chamada</span>
                                ) : record.present ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle className="h-3 w-3" /> Presente</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full"><XCircle className="h-3 w-3" /> Faltou</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
             </Card>
          </TabsContent>

          {/* DOCUMENTS/CONTRACTS TAB */}
          <TabsContent value="documents" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><FileSignature className="h-5 w-5 text-primary" /> Termo de Adesão</CardTitle>
                  <Button onClick={handlePrintContract} className="btn-primary-gradient gap-2">
                    <FileText className="h-4 w-4" /> Gerar Contrato
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 border rounded-lg p-6 font-serif text-sm leading-relaxed max-h-[500px] overflow-y-auto">
                    <div className="flex flex-col items-center justify-center mb-8 border-b pb-6">
                      {profile?.logo_url && (
                        <img src={profile.logo_url} alt="Logo" className="h-16 w-auto object-contain mb-4 grayscale" />
                      )}
                      <h2 className="text-xl font-bold text-center uppercase">CONTRATO DE PRESTAÇÃO DE SERVIÇOS ESPORTIVOS</h2>
                    </div>
                    
                    <p className="mb-4">
                      Pelo presente instrumento particular, de um lado, <strong>{profile?.ct_name || 'CENTRO DE TREINAMENTO ESPORTIZ'}</strong>, doravante denominado <strong>CONTRATADO</strong>, 
                      e de outro lado, <strong>{student.name.toUpperCase()}</strong>, portador(a) do CPF nº {student.cpf || '___________'}, 
                      RG nº {student.rg || '___________'}, residente e domiciliado(a) em {student.address ? `${student.address}, ${student.city || ''} - ${student.state || ''}` : '_________________________________________'}, 
                      doravante denominado(a) <strong>CONTRATANTE</strong>.
                    </p>

                    <h3 className="font-bold mt-6 mb-2">CLÁUSULA 1ª - DO OBJETO</h3>
                    <p className="mb-4">
                      O objeto do presente contrato é a prestação de serviços esportivos na modalidade de {modality?.name || '__________'}, 
                      no nível {student.level}, nas instalações do CONTRATADO.
                    </p>

                    <h3 className="font-bold mt-6 mb-2">CLÁUSULA 2ª - DOS VALORES E PLANO</h3>
                    <p className="mb-4">
                      O CONTRATANTE adere ao plano <strong>{plan?.name || '__________'}</strong>, comprometendo-se ao pagamento 
                      do valor de {plan ? `R$ ${plan.price.toFixed(2)}` : '__________'}, com vencimento todo dia {student.paymentDueDay || '__'} de cada mês.
                    </p>

                    <h3 className="font-bold mt-6 mb-2">CLÁUSULA 3ª - DAS REGRAS DO CT</h3>
                    <p className="mb-4">
                      É dever do CONTRATANTE zelar pelas instalações, equipamentos e respeitar os horários preestabelecidos para as aulas 
                      {studentGroups.length > 0 ? ` (Turmas: ${studentGroups.map(g => g.name).join(', ')})` : ''}.
                    </p>

                    <div className="mt-16 pt-8 border-t border-dashed grid grid-cols-2 gap-8 text-center">
                      <div>
                        <div className="w-full border-b border-black mb-2"></div>
                        <p className="font-bold">{student.name}</p>
                        <p className="text-xs text-muted-foreground">CONTRATANTE</p>
                      </div>
                      <div>
                        <div className="w-full border-b border-black mb-2"></div>
                        <p className="font-bold">{profile?.ct_name || 'Esportiz'}</p>
                        <p className="text-xs text-muted-foreground">CONTRATADO</p>
                      </div>
                    </div>
                    
                    <p className="text-right mt-8 text-xs text-muted-foreground">
                      {profile?.city || 'Cidade'}, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </CardContent>
             </Card>
          </TabsContent>
        </Tabs>

      </main>

      {/* Print-only layout for the contract */}
      <div className="hidden print:block font-serif text-black p-8">
        <div className="flex flex-col items-center justify-center mb-10 border-b-2 border-black pb-8">
          {profile?.logo_url && (
            <img src={profile.logo_url} alt="Logo" className="h-20 w-auto object-contain mb-6 grayscale" />
          )}
          <h2 className="text-2xl font-bold text-center uppercase">CONTRATO DE PRESTAÇÃO DE SERVIÇOS ESPORTIVOS</h2>
        </div>
        
        <p className="mb-6 text-justify">
          Pelo presente instrumento particular, de um lado, <strong>{profile?.ct_name || 'CENTRO DE TREINAMENTO ESPORTIZ'}</strong>, doravante denominado <strong>CONTRATADO</strong>, 
          e de outro lado, <strong>{student.name.toUpperCase()}</strong>, portador(a) do CPF nº {student.cpf || '___________'}, 
          RG nº {student.rg || '___________'}, residente e domiciliado(a) em {student.address ? `${student.address}, ${student.city || ''} - ${student.state || ''}` : '_________________________________________'}, 
          doravante denominado(a) <strong>CONTRATANTE</strong>.
        </p>

        <h3 className="font-bold mt-6 mb-2">CLÁUSULA 1ª - DO OBJETO</h3>
        <p className="mb-6 text-justify">
          O objeto do presente contrato é a prestação de serviços esportivos na modalidade de {modality?.name || '__________'}, 
          no nível {student.level}, nas instalações do CONTRATADO.
        </p>

        <h3 className="font-bold mt-6 mb-2">CLÁUSULA 2ª - DOS VALORES E PLANO</h3>
        <p className="mb-6 text-justify">
          O CONTRATANTE adere ao plano <strong>{plan?.name || '__________'}</strong>, comprometendo-se ao pagamento 
          do valor de {plan ? `R$ ${plan.price.toFixed(2)}` : '__________'}, com vencimento todo dia {student.paymentDueDay || '__'} de cada mês.
        </p>

        <h3 className="font-bold mt-6 mb-2">CLÁUSULA 3ª - DAS REGRAS GERAIS</h3>
        <p className="mb-6 text-justify">
          É dever do CONTRATANTE zelar pelas instalações, equipamentos e respeitar os horários preestabelecidos para as aulas 
          {studentGroups.length > 0 ? ` (Turmas: ${studentGroups.map(g => g.name).join(', ')})` : ''}.
        </p>

        <div className="mt-32 pt-8 grid grid-cols-2 gap-16 text-center">
          <div>
            <div className="w-full border-b border-black mb-2"></div>
            <p className="font-bold">{student.name}</p>
            <p className="text-xs">CONTRATANTE</p>
          </div>
          <div>
            <div className="w-full border-b border-black mb-2"></div>
            <p className="font-bold">{profile?.ct_name || 'Esportiz'}</p>
            <p className="text-xs">CONTRATADO</p>
          </div>
        </div>
        
        <p className="text-right mt-16 text-sm">
          {profile?.city || 'Cidade'}, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

    </div>
  );
}
