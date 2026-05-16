import { useMemo } from 'react';
import { useProfile, type BusinessType } from '@/hooks/queries/useProfile';

export interface BusinessLabels {
  studentLabel: string;
  studentLabelSingular: string;
  trainingLabel: string;
  trainingLabelSingular: string;
  planLabel: string;
  planLabelSingular: string;
  modalityLabel: string;
  modalityLabelSingular: string;
  groupLabel: string;
  groupLabelSingular: string;
  locationLabel: string;
  ctLabel: string;
  ctLabelShort: string;
  attendanceLabel: string;
}

export interface NavModule {
  label: string;
  path: string;
}

const LABELS: Record<BusinessType, BusinessLabels> = {
  sport_school: {
    studentLabel: 'Alunos',
    studentLabelSingular: 'Aluno',
    trainingLabel: 'Treinos',
    trainingLabelSingular: 'Treino',
    planLabel: 'Planos',
    planLabelSingular: 'Plano',
    modalityLabel: 'Modalidades',
    modalityLabelSingular: 'Modalidade',
    groupLabel: 'Turmas',
    groupLabelSingular: 'Turma',
    locationLabel: 'Local',
    ctLabel: 'Centro de Treinamento',
    ctLabelShort: 'CT',
    attendanceLabel: 'Presença',
  },
  arena: {
    studentLabel: 'Reservantes',
    studentLabelSingular: 'Reservante',
    trainingLabel: 'Reservas',
    trainingLabelSingular: 'Reserva',
    planLabel: 'Pacotes',
    planLabelSingular: 'Pacote',
    modalityLabel: 'Quadras',
    modalityLabelSingular: 'Quadra',
    groupLabel: 'Horários',
    groupLabelSingular: 'Horário',
    locationLabel: 'Quadra',
    ctLabel: 'Arena',
    ctLabelShort: 'Arena',
    attendanceLabel: 'Ocupação',
  },
};

function buildNavModules(type: BusinessType, labels: BusinessLabels): NavModule[] {
  const shared = {
    dashboard: { label: 'Dashboard', path: '/dashboard' },
    calendario: { label: 'Calendário', path: '/calendario' },
    pagamentos: { label: 'Pagamentos', path: '/pagamentos' },
    despesas: { label: 'Despesas', path: '/despesas' },
    relatorios: { label: 'Relatórios', path: '/relatorios' },
    comunicacao: { label: 'Comunicação', path: '/comunicacao' },
    contratos: { label: 'Contratos Digitais', path: '/contratos' },
    produtos: { label: 'Produtos', path: '/produtos' },
    vendas: { label: 'Vendas', path: '/vendas' },
  };

  switch (type) {
    case 'sport_school':
      return [
        shared.dashboard,
        shared.calendario,
        { label: labels.studentLabel, path: '/alunos' },
        { label: labels.modalityLabel, path: '/modalidades' },
        { label: labels.groupLabel, path: '/turmas' },
        { label: labels.attendanceLabel, path: '/presenca' },
        { label: labels.planLabel, path: '/planos' },
        shared.pagamentos,
        { label: 'Aniversários', path: '/aniversariantes' },
        shared.relatorios,
        shared.comunicacao,
        // Ocultos: Despesas, Produtos, Vendas
      ];

    case 'arena':
      return [
        shared.dashboard,
        { label: labels.modalityLabel, path: '/quadras' },        // Quadras
        { label: 'Agenda', path: '/agenda' },                     // Agenda de Reservas
        { label: labels.studentLabel, path: '/reservantes' },    // Reservantes
        shared.pagamentos,
        shared.despesas,
        shared.produtos,
        { label: 'Comandas', path: '/comandas' },
        shared.vendas,
        shared.relatorios,
      ];

  }
}

export function useBusinessContext() {
  const { profile } = useProfile();

  const rawBusinessType = profile?.business_type;
  const businessType: BusinessType = rawBusinessType === 'arena' ? 'arena' : 'sport_school';
  const labels = useMemo(() => LABELS[businessType], [businessType]);
  const navModules = useMemo(() => buildNavModules(businessType, labels), [businessType, labels]);

  return {
    businessType,
    labels,
    navModules,
    isSportSchool: businessType === 'sport_school',
    isArena: businessType === 'arena',
  };
}
