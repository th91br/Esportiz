import { useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardCheck } from 'lucide-react';
import { Header } from '@/components/Header';
import { AttendanceList } from '@/components/AttendanceList';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getDayName, formatDate, getWeekDatesArray } from '@/data/mockData';

export default function AttendancePage() {
  const weekDates = getWeekDatesArray();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="section-title text-2xl md:text-3xl">
              Controle de Presença
            </h1>
            <p className="text-muted-foreground mt-1">
              Registre a presença dos alunos em cada treino
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <span className="font-medium">
              {getDayName(selectedDate)}, {formatDate(selectedDate)}
            </span>
          </div>
        </div>

        {/* Date Selector */}
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="font-display font-semibold">Selecione o Dia</h2>
            <Button variant="ghost" size="icon">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {weekDates.map((date) => {
              const isToday = date === today;
              const isSelected = date === selectedDate;
              const isPast = date < today;

              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'p-2 md:p-3 rounded-xl text-center transition-all',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isToday
                      ? 'bg-primary/10 text-primary ring-2 ring-primary/30'
                      : isPast
                      ? 'bg-muted/50 text-muted-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <p className="text-xs font-medium opacity-70">
                    {getDayName(date).slice(0, 3)}
                  </p>
                  <p className="font-display font-bold text-lg md:text-xl">
                    {formatDate(date).split('/')[0]}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Attendance List */}
        <AttendanceList selectedDate={selectedDate} />
      </main>
    </div>
  );
}
