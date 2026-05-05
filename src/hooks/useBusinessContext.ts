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
    studentLabel: 'Clientes',
    studentLabelSingular: 'Cliente',
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
    attendanceLabel: 'Check-in',
  },
  other: {
    studentLabel: 'Alunos',
    studentLabelSingular: 'Aluno',
    trainingLabel: 'Aulas',
    trainingLabelSingular: 'Aula',
    planLabel: 'Planos',
    planLabelSingular: 'Plano',
    modalityLabel: 'Cursos',
    modalityLabelSingular: 'Curso',
    groupLabel: 'Turmas',
    groupLabelSingular: 'Turma',
    locationLabel: 'Sala',
    ctLabel: 'Escola',
    ctLabelShort: 'Escola',
    attendanceLabel: 'Presença',
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
        shared.despesas,
        shared.produtos,
        shared.vendas,
        { label: 'Aniversários', path: '/aniversariantes' },
        shared.relatorios,
        shared.comunicacao,
      ];

    case 'arena':
      return [
        shared.dashboard,
        shared.calendario,
        { label: labels.studentLabel, path: '/alunos' },      // Clientes
        { label: labels.modalityLabel, path: '/modalidades' }, // Quadras
        { label: labels.groupLabel, path: '/turmas' },         // Horários
        shared.pagamentos,
        shared.despesas,
        shared.produtos,
        shared.vendas,
        shared.relatorios,
        shared.comunicacao,
        // Ocultos: Presença, Planos, Aniversários
      ];

    case 'other':
      return [
        shared.dashboard,
        shared.calendario,
        { label: labels.studentLabel, path: '/alunos' },
        { label: labels.groupLabel, path: '/turmas' },
        { label: labels.attendanceLabel, path: '/presenca' },
        { label: labels.planLabel, path: '/planos' },
        shared.pagamentos,
        shared.despesas,
        shared.relatorios,
        shared.comunicacao,
        // Ocultos: Modalidades, Produtos, Vendas, Aniversários
      ];
  }
}

export function useBusinessContext() {
  const { profile } = useProfile();

  const businessType: BusinessType = profile?.business_type ?? 'sport_school';
  const labels = useMemo(() => LABELS[businessType], [businessType]);
  const navModules = useMemo(() => buildNavModules(businessType, labels), [businessType, labels]);

  return {
    businessType,
    labels,
    navModules,
    isSportSchool: businessType === 'sport_school',
    isArena: businessType === 'arena',
    isOther: businessType === 'other',
  };
}
