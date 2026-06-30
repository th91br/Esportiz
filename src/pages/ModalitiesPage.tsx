import { AppPage } from '@/components/layout/AppPage';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/StatCard';
import { ModalityManager } from '@/components/ModalityManager';
import { useModalities } from '@/hooks/queries/useModalities';
import { useStudents } from '@/hooks/queries/useStudents';
import { useTrainings } from '@/hooks/queries/useTrainings';
import { Tag, Users, Calendar, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useBusinessContext } from '@/hooks/useBusinessContext';

export default function ModalitiesPage() {
  const { modalities, loadingModalities } = useModalities();
  const { students } = useStudents();
  const { trainings } = useTrainings();
  const navigate = useNavigate();
  const { labels } = useBusinessContext();

  const totalModalities = modalities.length;
  const totalStudentsWithModality = students.filter(s => s.modalityId).length;
  
  // Calculate top modality
  const modalityStats = modalities.map(mod => {
    const studentCount = students.filter(s => s.modalityId === mod.id).length;
    const trainingCount = trainings.filter(t => t.modalityId === mod.id).length;
    return { ...mod, studentCount, trainingCount };
  });

  const topModality = [...modalityStats].sort((a, b) => b.studentCount - a.studentCount)[0];

  return (
    <AppPage>
      <PageHeader
        title={labels.modalityLabel}
        description={`Gerencie o cadastro de ${labels.modalityLabel.toLowerCase()} do seu ${labels.ctLabel}`}
        icon={Tag}
      />

      {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-up">
          <StatCard 
            title={`Total de ${labels.modalityLabel}`} 
            value={loadingModalities ? '...' : totalModalities} 
            icon={Tag} 
            description="Ativas no sistema"
          />
          <StatCard 
            title={`${labels.studentLabel} Vinculados`} 
            value={totalStudentsWithModality} 
            icon={Users} 
            variant="primary"
            description={`Vinculados a uma ${labels.modalityLabelSingular.toLowerCase()}`}
          />
          <StatCard 
            title="Destaque" 
            value={topModality?.name || '---'} 
            icon={Award} 
            description={topModality ? `${topModality.studentCount} ${labels.studentLabel.toLowerCase()} ativos` : "Nenhum dado disponível"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <ModalityManager />
          </div>
          
          <div className="lg:col-span-2">
            <Card className="h-full border border-border/50 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 pb-4">
                <div className="space-y-1">
                  <h2 className="flex items-center gap-2 text-lg font-display font-semibold">
                    <Calendar className="h-5 w-5 text-primary" />
                    Visão Geral por Unidade
                  </h2>
                  <p className="text-sm text-muted-foreground">Estatísticas de {labels.studentLabel.toLowerCase()} e {labels.trainingLabel.toLowerCase()} por {labels.modalityLabelSingular.toLowerCase()}.</p>
                </div>
              </div>
              
              <CardContent className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modalityStats.map((mod) => (
                    <div key={mod.id} className="rounded-xl overflow-hidden border border-border/60 hover:border-primary/30 bg-background shadow-sm hover:shadow-md transition-all group">
                      <div className="h-1.5 w-full" style={{ backgroundColor: mod.color }} />
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-display font-bold text-lg">{mod.name}</h3>
                            <p className="text-xs text-muted-foreground">{labels.modalityLabelSingular}</p>
                          </div>
                          <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                            <Tag className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-4 mb-6">
                          <div className="space-y-1">
                            <p className="text-2xl font-display font-bold">{mod.studentCount}</p>
                            <p className="text-xs font-semibold text-muted-foreground">{labels.studentLabel}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-2xl font-display font-bold">{mod.trainingCount}</p>
                            <p className="text-xs font-semibold text-muted-foreground">{labels.trainingLabel}</p>
                          </div>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          className="w-full text-xs font-semibold group-hover:bg-primary group-hover:text-white transition-colors duration-200"
                          onClick={() => navigate('/alunos')}
                        >
                          Gerenciar {labels.studentLabel}
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {modalities.length === 0 && (
                    <EmptyState
                      title={`Cadastre sua primeira ${labels.modalityLabelSingular.toLowerCase()} para ver as estatísticas.`}
                      variant="outlined"
                      className="col-span-full py-12"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
    </AppPage>
  );
}
