import { useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardCheck, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { Header } from '@/components/Header';
import { AttendanceList } from '@/components/AttendanceList';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
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

export default function AttendancePage() {
  const today = new Date().toISOString().split('T')[0];
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
    <div className="min-h-screen bg-background pb-10">
      <Header />

      <main className="container py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="section-title text-2xl md:text-3xl">
              Controle de {labels.attendanceLabel}
            </h1>
            <p className="text-muted-foreground mt-1">
              Registre o(a) {labels.attendanceLabel.toLowerCase()} dos(as) {labels.studentLabel.toLowerCase()} em cada {labels.trainingLabelSingular.toLowerCase()}
            </p>
          </div>

          <div className="flex items-center gap-2">
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
             <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border/50 shadow-sm">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <span className="font-semibold text-foreground">
                {getDayName(selectedDate)}, {formatDate(selectedDate)}
              </span>
            </div>
          </div>
        </div>

        {/* Improved Date Selector */}
        <div className="card-elevated p-4 md:p-6 bg-card/50 backdrop-blur-sm">
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
                    className="flex flex-col h-auto py-2 px-6 rounded-2xl hover:bg-primary/5 group"
                  >
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider group-hover:text-primary transition-colors">
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
      </main>
    </div>
  );
}
