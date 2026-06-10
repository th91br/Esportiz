import { useMemo } from 'react';
import { 
  Cake, 
  CalendarDays, 
  CalendarRange, 
  Gift,
  Phone,
  Copy
} from 'lucide-react';
import { format, isToday, isThisMonth, isThisWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Header } from '@/components/Header';
import { useStudents } from '@/hooks/queries/useStudents';
import { useProfile } from '@/hooks/queries/useProfile';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import type { Student } from '@/data/mockData';
import {
  buildCommunicationMessage,
  buildCommunicationWhatsAppAction,
} from '@/lib/communicationContracts';
import { toast } from 'sonner';

export default function BirthdaysPage() {
  const { students, loadingStudents } = useStudents();
  const { profile } = useProfile();

  const businessName = profile?.ct_name || 'Sportiz Sport';

  const buildBirthdayMessage = (student: Student) => buildCommunicationMessage({
    businessType: 'sport_school',
    event: 'birthday',
    variables: {
      nome: student.name.split(' ')[0],
      nome_completo: student.name,
      escola: businessName,
    },
  });

  const handleCopyBirthdayMessage = (student: Student) => {
    const message = buildBirthdayMessage(student);
    if (!message) {
      toast.error('Mensagem vazia para este contato.');
      return;
    }

    void navigator.clipboard.writeText(message);
    toast.success('Mensagem copiada com sucesso!');
  };

  const handleBirthdayWhatsApp = (student: Student) => {
    const action = buildCommunicationWhatsAppAction(student.phone, {
      businessType: 'sport_school',
      event: 'birthday',
      variables: {
        nome: student.name.split(' ')[0],
        nome_completo: student.name,
        escola: businessName,
      },
    });

    if (!action.ok) {
      toast.error('Telefone inválido para envio via WhatsApp.');
      return;
    }

    window.open(action.url, '_blank');
  };

  const { birthdaysToday, birthdaysThisWeek, birthdaysThisMonth } = useMemo(() => {
    if (!students) return { birthdaysToday: [], birthdaysThisWeek: [], birthdaysThisMonth: [] };

    const activeStudents = students.filter(s => s.active && s.birthDate);
    
    // In order to correctly check 'isToday', 'isThisWeek', 'isThisMonth',
    // We should treat the birthDate as occurring in the current year.
    const currentYear = new Date().getFullYear();

    const studentsWithCurrentYearBirthday = activeStudents.map(student => {
      // birthDate format is yyyy-MM-dd
      const dateParts = student.birthDate!.split('-');
      if (dateParts.length !== 3) return null;
      
      const [_, month, day] = dateParts;
      // Reconstruct the date as if it happens this year
      const birthdayThisYear = new Date(currentYear, parseInt(month) - 1, parseInt(day));
      
      return {
        ...student,
        birthdayThisYear
      };
    }).filter(Boolean) as (Student & { birthdayThisYear: Date })[];

    const today = studentsWithCurrentYearBirthday.filter(s => isToday(s.birthdayThisYear));
    
    // For this week, we want people whose birthday is this week but not necessarily today (though today is included too)
    const thisWeek = studentsWithCurrentYearBirthday.filter(s => isThisWeek(s.birthdayThisYear, { weekStartsOn: 1 }));
    
    // For this month
    const thisMonth = studentsWithCurrentYearBirthday.filter(s => isThisMonth(s.birthdayThisYear));

    // Sort by day of month
    thisMonth.sort((a, b) => a.birthdayThisYear.getDate() - b.birthdayThisYear.getDate());
    thisWeek.sort((a, b) => a.birthdayThisYear.getDate() - b.birthdayThisYear.getDate());

    return {
      birthdaysToday: today,
      birthdaysThisWeek: thisWeek,
      birthdaysThisMonth: thisMonth
    };
  }, [students]);

  const BirthdayCard = ({ student }: { student: Student & { birthdayThisYear: Date } }) => (
    <Card className="overflow-hidden border border-border/50 hover:border-primary/30 transition-all duration-300 card-elevated flex flex-col justify-between h-full hover:shadow-md">
      <CardContent className="p-5 flex flex-col justify-between h-full">
        {/* Top Info section */}
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-inner">
            <Gift className="h-7 w-7 animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base font-bold text-foreground truncate" title={student.name}>
              {student.name}
            </h3>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">
              {format(student.birthdayThisYear, "dd 'de' MMMM", { locale: ptBR })}
            </p>
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="bg-muted px-2 py-0.5 rounded border border-border/40 font-medium capitalize text-foreground">
                {student.level}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Actions section */}
        <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-border/40">
          <Button
            variant="outline"
            className="w-full text-xs py-2 h-9 gap-1.5 border-border/80 hover:bg-muted font-semibold transition-all duration-200"
            onClick={() => handleCopyBirthdayMessage(student)}
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar
          </Button>

          <Button
            className="w-full text-xs py-2 h-9 gap-1.5 btn-primary-gradient font-bold transition-all duration-200"
            onClick={() => handleBirthdayWhatsApp(student)}
          >
            <Phone className="h-3.5 w-3.5" />
            Parabenizar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="container py-6 md:py-8 space-y-6 md:space-y-8 animate-fade-up">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 p-3 rounded-xl text-primary">
            <Cake className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">Aniversariantes</h1>
            <p className="text-muted-foreground text-sm">Acompanhe os aniversariantes de hoje, da semana e do mês.</p>
          </div>
        </div>

        {loadingStudents ? (
          <div className="text-center text-muted-foreground py-8">Carregando aniversariantes...</div>
        ) : (
          <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="today" className="gap-2">
                <Gift className="h-4 w-4 hidden sm:block" />
                <span className="truncate">Hoje</span>
                {birthdaysToday.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {birthdaysToday.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="week" className="gap-2">
                <CalendarDays className="h-4 w-4 hidden sm:block" />
                <span className="truncate">Semana</span>
              </TabsTrigger>
              <TabsTrigger value="month" className="gap-2">
                <CalendarRange className="h-4 w-4 hidden sm:block" />
                <span className="truncate">Mês</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="space-y-4">
              {birthdaysToday.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
                  <Gift className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-muted-foreground">Nenhum aniversariante hoje</h3>
                  <p className="text-sm text-muted-foreground/70">As celebrações retornam em breve!</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {birthdaysToday.map(student => (
                    <BirthdayCard key={student.id} student={student} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="week" className="space-y-4">
              {birthdaysThisWeek.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
                  <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-lg font-medium text-muted-foreground">Nenhum aniversariante nesta semana</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {birthdaysThisWeek.map(student => (
                    <BirthdayCard key={student.id} student={student} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="month" className="space-y-4">
              {birthdaysThisMonth.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
                  <CalendarRange className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-lg font-medium text-muted-foreground">Nenhum aniversariante neste mês</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {birthdaysThisMonth.map(student => (
                    <BirthdayCard key={student.id} student={student} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
