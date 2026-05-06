import { MapPin, Users, User, Clock, Sun, Sunset, Moon, ArrowRight, DollarSign, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useReservations } from '@/hooks/queries/useReservations';
import { useCourts, SPORT_LABELS } from '@/hooks/queries/useCourts';
import { useStudents } from '@/hooks/queries/useStudents';
import { getDayName, formatDate, getEndTime, getTimePeriod } from '@/data/mockData';
import { formatCurrency } from '@/lib/formatCurrency';

const periodIcons = { manhã: Sun, tarde: Sunset, noite: Moon };

export function ArenaTodaySchedule() {
  const { reservations, loadingReservations } = useReservations();
  const { courts, loadingCourts } = useCourts();
  const { students } = useStudents();
  
  const today = new Date().toISOString().split('T')[0];
  const todayReservations = reservations
    .filter(r => r.date === today && r.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time));

  if (loadingReservations || loadingCourts) {
    return <div className="card-elevated p-6 animate-pulse bg-muted/20 h-[300px] rounded-2xl"></div>;
  }

  return (
    <div className="card-elevated p-5 md:p-6 flex flex-col h-full bg-card/50 backdrop-blur-sm border-primary/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title text-xl mb-1">Agenda de Hoje</h2>
          <p className="text-sm text-muted-foreground capitalize">{getDayName(today)}, {formatDate(today)}</p>
        </div>
        <Button variant="outline" size="sm" asChild className="hidden sm:flex group bg-background">
          <a href="/agenda">
            Ver Agenda <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </Button>
      </div>

      <div className="space-y-4 flex-1">
        {todayReservations.length > 0 ? (
          todayReservations.map(reservation => {
            const timePeriod = getTimePeriod(reservation.time);
            const PeriodIcon = periodIcons[timePeriod];
            const reservantes = students.filter(s => reservation.reservanteIds.includes(s.id));
            const court = courts.find(c => c.id === reservation.courtId);

            return (
              <div key={reservation.id} className="relative overflow-hidden rounded-xl bg-background border border-border/50 hover:border-primary/40 shadow-sm transition-all group p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Decorative left accent */}
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: court?.color || '#cbd5e1' }} />
                
                <div className="flex flex-col space-y-2.5 pl-2">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("text-[11px] px-2 py-0.5 rounded-md flex items-center gap-1 font-bold uppercase tracking-wider", 
                      reservation.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                    )}>
                      {reservation.paymentStatus === 'paid' ? '💰 Pago' : '⏳ A Receber'}
                    </div>
                    <div className="flex items-center gap-1.5 text-base font-bold text-foreground">
                      <Clock className="h-4 w-4 text-primary" />
                      {reservation.time} - {getEndTime(reservation.time, reservation.durationMinutes)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {court ? (
                      <div className="flex items-center gap-1.5 font-medium">
                        <MapPin className="h-4 w-4" style={{ color: court.color }} />
                        <span>{court.name}</span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded ml-1 uppercase">{SPORT_LABELS[court.sportType]}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Quadra não informada</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-4 bg-muted/40 sm:bg-transparent px-3 py-2 sm:p-0 rounded-lg border sm:border-0 border-border/30 pl-2">
                  <div className="flex items-center gap-1.5 text-sm">
                     <User className="h-4 w-4 text-muted-foreground" /> 
                     <span className="font-semibold text-foreground truncate max-w-[120px]">
                        {reservantes.length > 0 ? reservantes[0].name : 'Sem nome'}
                     </span>
                  </div>
                  {reservation.finalPrice > 0 && (
                    <div className="flex items-center gap-1.5 pl-3 border-l border-border/50 text-sm">
                      <span className="font-bold text-primary">{formatCurrency(reservation.finalPrice)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6 border-2 border-dashed border-border/50 rounded-2xl bg-muted/10">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Calendar className="h-8 w-8 text-primary opacity-80" />
            </div>
            <p className="text-foreground font-semibold text-lg">Nenhuma reserva hoje</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">Os horários das quadras estão totalmente livres.</p>
          </div>
        )}
      </div>
      
      <Button variant="outline" className="w-full mt-6 sm:hidden bg-background" asChild>
        <a href="/agenda">Ver agenda completa</a>
      </Button>
    </div>
  );
}
