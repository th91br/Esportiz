import { useState, useMemo } from 'react';
import { AppPage } from '@/components/layout/AppPage';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSignature, FileText, Search, User, Printer } from 'lucide-react';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { useModalities } from '@/hooks/queries/useModalities';
import { useGroups } from '@/hooks/queries/useGroups';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useProfile } from '@/hooks/queries/useProfile';

export default function ContractsPage() {
  const { students, loadingStudents } = useStudents();
  const { plans, loadingPlans } = usePlans();
  const { modalities } = useModalities();
  const { groups } = useGroups();
  const { labels } = useBusinessContext();
  const { profile } = useProfile();

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const activeStudents = useMemo(() => {
    return students.filter(s => s.active);
  }, [students]);

  const filteredStudents = useMemo(() => {
    return activeStudents.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.cpf && s.cpf.includes(searchTerm))
    );
  }, [activeStudents, searchTerm]);

  const student = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [students, selectedStudentId]);

  const plan = useMemo(() => {
    if (!student?.planId) return null;
    return plans.find(p => p.id === student.planId);
  }, [plans, student]);

  const modality = useMemo(() => {
    if (!student?.modalityId) return null;
    return modalities.find(m => m.id === student.modalityId);
  }, [modalities, student]);

  const studentGroups = useMemo(() => {
    if (!student?.groupIds) return [];
    return groups.filter(g => student.groupIds?.includes(g.id));
  }, [groups, student]);

  const handlePrintContract = () => {
    window.print();
  };

  const loading = loadingStudents || loadingPlans;

  return (
    <>
      <AppPage className="pb-12 print:hidden">
        <PageHeader
          title="Contratos Digitais"
          description={`Selecione um(a) ${labels.studentLabelSingular.toLowerCase()} para visualizar, gerar ou imprimir o termo de adesão / contrato de prestação de serviços.`}
          icon={FileSignature}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seletor de Aluno */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-6 space-y-4 border-primary/20">
              <div className="space-y-2">
                <label className="text-base font-bold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> 1. Buscar {labels.studentLabelSingular}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nome ou CPF..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-base font-bold">2. Selecionar {labels.studentLabelSingular}</label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={loading}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder={`Selecione o(a) ${labels.studentLabelSingular.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {filteredStudents.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.cpf ? `(${s.cpf})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {student && (
                <div className="pt-4 border-t space-y-3">
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground font-semibold">Plano:</span> {plan?.name || 'Nenhum plano associado'}</p>
                    <p><span className="text-muted-foreground font-semibold">Modalidade:</span> {modality?.name || 'Não informada'}</p>
                    <p><span className="text-muted-foreground font-semibold">Dia de Venc.:</span> Todo dia {student.paymentDueDay || '--'}</p>
                  </div>
                  <Button onClick={handlePrintContract} className="w-full btn-primary-gradient gap-2 font-bold">
                    <Printer className="h-4 w-4" /> Imprimir Contrato
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Visualização do Contrato */}
          <div className="lg:col-span-2">
            {!student ? (
              <div className="card-elevated p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-xl font-bold font-display text-foreground">Nenhum contrato selecionado</h3>
                <p className="text-sm text-muted-foreground max-w-md mt-2">
                  Selecione um(a) {labels.studentLabelSingular.toLowerCase()} no painel ao lado para gerar o contrato digital com todas as cláusulas e valores preenchidos.
                </p>
              </div>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileSignature className="h-5 w-5 text-primary" /> Visualização Prévia do Contrato
                  </CardTitle>
                  <Button onClick={handlePrintContract} variant="outline" size="sm" className="gap-2">
                    <Printer className="h-4 w-4" /> Imprimir
                  </Button>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="bg-muted/30 border rounded-lg p-6 font-serif text-sm leading-relaxed max-h-[600px] overflow-y-auto">
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

                    <h3 className="font-bold mt-6 mb-2">CLÁUSULA 2ª - DOS VALORES E {labels.planLabelSingular.toUpperCase()}</h3>
                    <p className="mb-4">
                      O CONTRATANTE adere ao {labels.planLabelSingular.toLowerCase()} <strong>{plan?.name || '__________'}</strong>, comprometendo-se ao pagamento 
                      do valor de {plan ? `R$ ${plan.price.toFixed(2)}` : '__________'}, com vencimento todo dia {student.paymentDueDay || '__'} de cada mês.
                    </p>

                    <h3 className="font-bold mt-6 mb-2">CLÁUSULA 3ª - DAS REGRAS DO CT</h3>
                    <p className="mb-4">
                      É dever do CONTRATANTE zelar pelas instalações, equipamentos e respeitar os horários preestabelecidos para os(as) {labels.trainingLabel.toLowerCase()} 
                      {studentGroups.length > 0 ? ` (${labels.groupLabel}: ${studentGroups.map(g => g.name).join(', ')})` : ''}.
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
                      {student.city || 'Cidade'}, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </AppPage>

      {/* Print-only layout for the contract */}
      {student && (
        <div className="hidden print:block print:bg-white font-serif text-black p-8">
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

          <h3 className="font-bold mt-6 mb-2">CLÁUSULA 2ª - DOS VALORES E {labels.planLabelSingular.toUpperCase()}</h3>
          <p className="mb-6 text-justify">
            O CONTRATANTE adere ao {labels.planLabelSingular.toLowerCase()} <strong>{plan?.name || '__________'}</strong>, comprometendo-se ao pagamento 
            do valor de {plan ? `R$ ${plan.price.toFixed(2)}` : '__________'}, com vencimento todo dia {student.paymentDueDay || '__'} de cada mês.
          </p>

          <h3 className="font-bold mt-6 mb-2">CLÁUSULA 3ª - DAS REGRAS GERAIS</h3>
          <p className="mb-6 text-justify">
            É dever do CONTRATANTE zelar pelas instalações, equipamentos e respeitar os horários preestabelecidos para os(as) {labels.trainingLabel.toLowerCase()} 
            {studentGroups.length > 0 ? ` (${labels.groupLabel}: ${studentGroups.map(g => g.name).join(', ')})` : ''}.
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
            {student.city || 'Cidade'}, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
      )}
    </>
  );
}
