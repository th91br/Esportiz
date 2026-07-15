import { useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardCheck, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { AppPage } from '@/components/layout/AppPage';
import { PageHeader } from '@/components/layout/PageHeader';
import { AttendanceList } from '@/components/AttendanceList';
import { Button } from '@/components/ui/button';
import { getDayName, formatDate } from '@/data/mockData';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { getLocalTodayDate } from '@/lib/dateUtils';

export default function AttendancePage() {
  const today = getLocalTodayDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const { labels } = useBusinessContext();

  const handlePrevDay = () => {
    const date = parseISO(selectedDate);
    setSelectedDate(format(subDays(date, 1), 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const date = parseISO(selectedDate);
    setSelectedDate(format(addDays(date, 1), 'yyyy-MM-dd'));
  };

  const handleSelectDate = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(format(date, 'yyyy-MM-dd'));
    }
  };

  const isToday = selectedDate === today;

  return (
    <AppPage className="pb-10">
      <PageHeader
        title={`Controle de ${labels.attendanceLabel}`}
        description={`Registre o(a) ${labels.attendanceLabel.toLowerCase()} dos(as) ${labels.studentLabel.toLowerCase()} em cada ${labels.trainingLabelSingular.toLowerCase()}`}
        icon={ClipboardCheck}
        actions={(
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
             {!isToday && (
               <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedDate(today)}
                className="hidden sm:flex gap-2 bg-background border-primary/20 text-primary hover:bg-primary/5"
               >
                 <RotateCcw className="h-4 w-4" /> Voltar para Hoje
               </Button>
             )}
             <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/50 bg-muted px-4 py-2 shadow-sm sm:w-auto">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">
                {getDayName(selectedDate)}, {formatDate(selectedDate)}
              </span>
            </div>
          </div>
        )}
      />

        {/* Improved Date Selector */}
        <div className="card-elevated p-4 md:p-6 bg-card">
          <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handlePrevDay}
              className="h-10 w-10 rounded-full border-primary/20 hover:bg-primary/5"
            >
              <ChevronLeft className="h-5 w-5 text-primary" />
            </Button>

            <div className="flex-1 flex flex-col items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex flex-col h-auto py-2 px-6 rounded-lg hover:bg-primary/5 group"
                  >
                    <span className="text-xs font-semibold text-muted-foreground/80 group-hover:text-primary transition-colors">
                      Data Selecionada
                    </span>
                    <span className="text-lg font-bold text-foreground flex items-center gap-2">
                      {format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR })}
                      <CalendarIcon className="h-4 w-4 text-primary" />
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden shadow-2xl border-primary/10" align="center">
                  <Calendar
                    mode="single"
                    selected={parseISO(selectedDate)}
                    onSelect={handleSelectDate}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleNextDay}
              className="h-10 w-10 rounded-full border-primary/20 hover:bg-primary/5"
            >
              <ChevronRight className="h-5 w-5 text-primary" />
            </Button>
          </div>

          {!isToday && (
            <div className="flex justify-center mt-4 sm:hidden">
               <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedDate(today)}
                className="text-primary text-xs gap-1"
               >
                 <RotateCcw className="h-3 w-3" /> Voltar para Hoje
               </Button>
            </div>
          )}
        </div>

        {/* Attendance List */}
        <div className="animate-fade-up">
          <AttendanceList selectedDate={selectedDate} />
        </div>
    </AppPage>
  );
}
