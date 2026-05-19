import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Check, User, Mail, FileText, Phone, Calendar as CalendarIcon, 
  ArrowRight, ShieldCheck, Landmark, Clock, RefreshCw, Sparkles
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatCurrency';
import {
  formatBrazilPhone,
  formatCpf,
  isTodayOrFutureDate,
  isValidBrazilPhone,
  isValidCpf,
  isValidPublicEmail,
  isValidUuid,
  normalizePublicEmail,
  normalizePublicName,
} from '@/lib/publicPortalSecurity';
import { getLocalTodayDate } from '@/lib/dateUtils';

interface Court {
  id: string;
  name: string;
  color: string;
  sportType: string;
  coverage: string;
  pricePerHour: number;
  openingTime: string;
  closingTime: string;
  daysOfWeek: number[];
  usePeakPricing?: boolean;
  peakPrice?: number;
  peakStart?: string;
  peakEnd?: string;
}

interface DBReservation {
  id: string;
  date: string;
  time: string;
  courtId: string;
  durationMinutes: number;
  status: string;
}

interface CourtMetadata {
  sportType: string;
  coverage: string;
  pricePerHour: number;
  openingTime: string;
  closingTime: string;
  daysOfWeek: number[];
  usePeakPricing: boolean;
  peakPrice: number;
  peakStart: string;
  peakEnd: string;
}

interface PublicCourtRecord {
  id: string;
  name: string;
  color: string | null;
  metadata: unknown;
}

interface BookingSuccessData {
  courtName?: string;
  date: string;
  time: string;
  price: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const getStringValue = (value: unknown, fallback: string) => (
  typeof value === 'string' && value.trim() ? value : fallback
);

const getNumberValue = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getBooleanValue = (value: unknown, fallback: boolean) => (
  typeof value === 'boolean' ? value : fallback
);

const getNumberArrayValue = (value: unknown, fallback: number[]) => (
  Array.isArray(value) ? value.filter((item): item is number => Number.isInteger(item)) : fallback
);

export default function OnlineBookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ownerId = searchParams.get('ct');
  const hasInvalidOwnerId = ownerId !== null && !isValidUuid(ownerId);
  const scopedOwnerId = isValidUuid(ownerId) ? ownerId : null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [arenaName, setArenaName] = useState('Esportiz Arena');
  const [courts, setCourts] = useState<Court[]>([]);
  const [reservations, setReservations] = useState<DBReservation[]>([]);
  const [successData, setSuccessData] = useState<BookingSuccessData | null>(null);

  // Booking Flow Steps: 1 = Court & Time Selection, 2 = Customer Registration
  const [step, setStep] = useState(1);

  // Selections
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(60); // minutes

  // Form State
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Set today's date as default
  useEffect(() => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setSelectedDate(formattedDate);
  }, []);

  // Fetch Arena data publicly using RPC
  useEffect(() => {
    if (!scopedOwnerId) {
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const { data, error } = await supabase.rpc('get_public_arena_data', {
          p_user_id: scopedOwnerId
        });

        if (error) throw error;

        if (data) {
          setArenaName(data.arena_name || 'Esportiz Arena');
          
          // Map DB Modalities into Court objects
          const mappedCourts = (data.courts || []).map((c: PublicCourtRecord) => {
            let meta: CourtMetadata = {
              sportType: 'futevolei',
              coverage: 'open',
              pricePerHour: 80,
              openingTime: '07:00',
              closingTime: '23:00',
              daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
              usePeakPricing: false,
              peakPrice: 0,
              peakStart: '18:00',
              peakEnd: '22:00'
            };
            try {
              if (c.metadata) {
                const parsed = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata;
                if (isRecord(parsed)) {
                  meta = {
                    sportType: getStringValue(parsed.sportType, meta.sportType),
                    coverage: getStringValue(parsed.coverage, meta.coverage),
                    pricePerHour: getNumberValue(parsed.pricePerHour, meta.pricePerHour),
                    openingTime: getStringValue(parsed.openingTime, meta.openingTime),
                    closingTime: getStringValue(parsed.closingTime, meta.closingTime),
                    daysOfWeek: getNumberArrayValue(parsed.daysOfWeek, meta.daysOfWeek),
                    usePeakPricing: getBooleanValue(parsed.usePeakPricing, meta.usePeakPricing),
                    peakPrice: getNumberValue(parsed.peakPrice, meta.peakPrice),
                    peakStart: getStringValue(parsed.peakStart, meta.peakStart),
                    peakEnd: getStringValue(parsed.peakEnd, meta.peakEnd),
                  };
                }
              }
            } catch (e) {
              console.error('Error parsing court metadata:', e);
            }

            return {
              id: c.id,
              name: c.name,
              color: c.color || '#1DB874',
              sportType: meta.sportType,
              coverage: meta.coverage,
              pricePerHour: Number(meta.pricePerHour || 80),
              openingTime: meta.openingTime || '07:00',
              closingTime: meta.closingTime || '23:00',
              daysOfWeek: meta.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
              usePeakPricing: meta.usePeakPricing || false,
              peakPrice: Number(meta.peakPrice || 0),
              peakStart: meta.peakStart || '18:00',
              peakEnd: meta.peakEnd || '22:00'
            };
          });

          setCourts(mappedCourts);
          if (mappedCourts.length > 0) {
            setSelectedCourtId(mappedCourts[0].id);
          }

          setReservations(data.reservations || []);
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Erro ao buscar dados da arena:', error);
        toast.error('Erro ao carregar dados do CT.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [scopedOwnerId]);

  // Mask CPF (999.999.999-99)
  const handleCpfChange = (val: string) => {
    setCpf(formatCpf(val));
  };

  // Mask Phone ((99) 99999-9999)
  const handlePhoneChange = (val: string) => {
    setPhone(formatBrazilPhone(val));
  };

  // Helper: check time intervals overlaps
  const parseTimeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };

  const isSlotBusy = (courtId: string, date: string, slotTime: string, duration: number) => {
    const slotStart = parseTimeToMinutes(slotTime);
    const slotEnd = slotStart + duration;

    return reservations.some((res) => {
      if (res.courtId !== courtId) return false;
      if (res.date !== date) return false;
      if (res.status === 'cancelled') return false;

      const resStart = parseTimeToMinutes(res.time);
      const resEnd = resStart + (res.durationMinutes || 60);

      // Overlap formula: (start1 < end2) AND (end1 > start2)
      return resStart < slotEnd && resEnd > slotStart;
    });
  };

  // Generate dynamic hourly slots for the selected court
  const getAvailableSlots = () => {
    const court = courts.find((c) => c.id === selectedCourtId);
    if (!court) return [];

    const slots = [];
    const startMinutes = parseTimeToMinutes(court.openingTime);
    const endMinutes = parseTimeToMinutes(court.closingTime);

    // Increment every 60 minutes
    for (let m = startMinutes; m < endMinutes; m += 60) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const slotTimeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
      
      let busy = isSlotBusy(selectedCourtId, selectedDate, slotTimeStr, selectedDuration);

      // Strict Block for past hours if the selected date is today
      if (!busy && selectedDate === getLocalTodayDate()) {
        const currentHour = new Date().getHours();
        if (h <= currentHour) {
          busy = true;
        }
      }

      slots.push({
        time: slotTimeStr,
        busy
      });
    }

    return slots;
  };

  const selectedCourt = courts.find((c) => c.id === selectedCourtId);

  const getCalculatedPrice = (court: Court | undefined, timeSlot: string) => {
    if (!court) return 80;
    let price = court.pricePerHour;
    if (court.usePeakPricing && court.peakPrice && court.peakStart && court.peakEnd) {
      if (timeSlot >= court.peakStart && timeSlot < court.peakEnd) {
        price = court.peakPrice;
      }
    }
    return price;
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourtId || !selectedDate || !selectedTimeSlot) {
      toast.error('Por favor, escolha uma quadra, data e horário livre.');
      return;
    }

    if (!isTodayOrFutureDate(selectedDate)) {
      toast.error('Escolha uma data valida para a reserva.');
      return;
    }

    if (isSlotBusy(selectedCourtId, selectedDate, selectedTimeSlot, selectedDuration)) {
      toast.error('Este horario acabou de ficar indisponivel. Escolha outro horario.');
      setSelectedTimeSlot('');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scopedOwnerId) {
      toast.error('Link de agendamento incompleto ou inválido.');
      return;
    }

    const safeName = normalizePublicName(name);
    const safeCpf = formatCpf(cpf);
    const safeEmail = normalizePublicEmail(email);
    const safePhone = formatBrazilPhone(phone);

    if (!safeName || !safeCpf || !safeEmail || !safePhone) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (!isTodayOrFutureDate(selectedDate)) {
      toast.error('Escolha uma data valida para a reserva.');
      return;
    }

    if (!isValidCpf(safeCpf)) {
      toast.error('CPF invalido. Confira os numeros digitados.');
      return;
    }

    if (!isValidPublicEmail(safeEmail)) {
      toast.error('E-mail invalido.');
      return;
    }

    if (!isValidBrazilPhone(safePhone)) {
      toast.error('Celular invalido.');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.rpc('submit_public_reservation', {
        p_user_id: scopedOwnerId,
        p_court_id: selectedCourtId,
        p_date: selectedDate,
        p_time: selectedTimeSlot,
        p_duration_minutes: selectedDuration,
        p_client_name: safeName,
        p_client_phone: safePhone,
        p_client_email: safeEmail,
        p_client_cpf: safeCpf,
      });

      if (error) throw error;

      if (data && !data.success) {
        if (data.conflict) {
          setSelectedTimeSlot('');
          setStep(1);
        }
        toast.error(data.error || 'Erro ao realizar agendamento.');
        return;
      }

      toast.success('Agendamento online concluído com sucesso!');
      setSuccessData({
        courtName: selectedCourt?.name,
        date: selectedDate,
        time: selectedTimeSlot,
        price: (getCalculatedPrice(selectedCourt, selectedTimeSlot) * selectedDuration) / 60,
      });
    } catch (err: unknown) {
      console.error('Erro ao submeter agendamento:', err);
      toast.error('Ocorreu um erro ao processar sua reserva.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="h-10 w-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground font-medium animate-pulse">Carregando painel de agendamento...</p>
      </div>
    );
  }

  if (!ownerId || hasInvalidOwnerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full border-border/80 card-elevated">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-2">
              <Landmark className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold font-display text-foreground">Link Inválido</CardTitle>
            <CardDescription className="text-sm">
              Este link de agendamento online não possui o identificador da Arena Esportiva parceira. Solicite o link correto de agendamento na recepção.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full btn-primary-gradient" onClick={() => navigate('/')}>
              Ir para o Esportiz
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (successData) {
    const [year, month, day] = successData.date.split('-');
    const formattedSuccessDate = `${day}/${month}/${year}`;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background p-4 sm:p-6">
        <Card className="max-w-lg w-full border-border/60 card-elevated shadow-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardHeader className="text-center pb-4 space-y-3">
            <div className="mx-auto w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center scale-110 shadow-inner">
              <Check className="h-8 w-8 stroke-[3px]" />
            </div>
            <CardTitle className="text-2xl font-bold font-display text-foreground mt-4">Agendamento Confirmado!</CardTitle>
            <CardDescription className="text-sm text-muted-foreground max-w-sm mx-auto">
              Sua quadra foi reservada com sucesso na <strong className="text-foreground">{arenaName}</strong>. Esperamos você no CT para o jogo!
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 px-6">
            <div className="bg-muted/40 rounded-2xl p-4 border border-border/50 text-sm space-y-3">
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">Jogador/Responsável:</span>
                <span className="font-semibold text-foreground">{name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">Quadra Reservada:</span>
                <Badge variant="outline" className="font-semibold bg-primary/5 text-primary border-primary/20">
                  {successData.courtName}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">Data da Partida:</span>
                <span className="font-semibold text-foreground">{formattedSuccessDate}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">Horário / Duração:</span>
                <span className="font-semibold text-foreground">{successData.time} ({selectedDuration} min)</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">Valor Estimado:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(successData.price)}</span>
              </div>
            </div>

            <div className="text-center p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium leading-relaxed">
                Pagamentos de taxa ou Pix de reserva devem ser tratados diretamente com a administração da Arena no local ou via WhatsApp de atendimento.
              </p>
            </div>
          </CardContent>

          <CardFooter className="p-6 pt-2">
            <Button 
              className="w-full btn-primary-gradient py-6 font-semibold"
              onClick={() => {
                // Clear state to allow another booking
                setSuccessData(null);
                setStep(1);
                setSelectedTimeSlot('');
              }}
            >
              Fazer Outro Agendamento <Sparkles className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold font-display uppercase tracking-wider mb-2">
            <Landmark className="h-3.5 w-3.5 animate-pulse" /> Agendamento de Quadras Online
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-display text-foreground tracking-tight">{arenaName}</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Reserve o seu horário e garanta o seu play em tempo real com toda a comodidade.
          </p>
        </div>

        <Card className="border-border/60 shadow-xl overflow-hidden card-elevated">
          <div className="h-1.5 bg-gradient-to-r from-primary to-orange-500" />
          
          {step === 1 ? (
            <form onSubmit={handleNextStep}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> 1. Escolha Data, Quadra & Horário
                </CardTitle>
                <CardDescription>Selecione onde e quando deseja jogar.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Date Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5 text-primary" /> Escolha o Dia da Partida
                  </label>
                  <Input 
                    required 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setSelectedTimeSlot('');
                    }}
                    className="bg-background max-w-sm"
                  />
                </div>

                {/* Court Select */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Selecione a Quadra</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {courts.map((court) => {
                      const isSelected = selectedCourtId === court.id;
                      return (
                        <button
                          key={court.id}
                          type="button"
                          onClick={() => {
                            setSelectedCourtId(court.id);
                            setSelectedTimeSlot('');
                          }}
                          className={`p-4 rounded-xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                            isSelected 
                              ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20' 
                              : 'border-border/60 bg-background/50 hover:border-border hover:bg-muted/10'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 mb-2">
                            <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: court.color }} />
                            <span className="font-bold text-foreground text-sm">{court.name}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="capitalize font-medium bg-muted/40 px-2 py-0.5 rounded-md border border-border/30">{court.sportType.replace('_', ' ')}</span>
                            <span className="bg-muted/40 px-2 py-0.5 rounded-md border border-border/30">{court.coverage === 'covered' ? 'Coberta' : 'Aberta'}</span>
                            <span className="ml-auto font-bold text-foreground">
                              {court.usePeakPricing && court.peakPrice
                                ? `${formatCurrency(court.pricePerHour)} ~ ${formatCurrency(court.peakPrice)}/h`
                                : `${formatCurrency(court.pricePerHour)}/h`
                              }
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Duration select */}
                <div className="space-y-1.5 max-w-sm">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Duração da Reserva</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[60, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setSelectedDuration(mins);
                          setSelectedTimeSlot('');
                        }}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                          selectedDuration === mins 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'bg-background hover:bg-muted'
                        }`}
                      >
                        {mins} min
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border/40 my-2 pt-4" />

                {/* Available Hours Slots */}
                {selectedCourtId && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Horários Disponíveis (Iniciados na Hora)</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                      {getAvailableSlots().map((slot) => {
                        const isSelected = selectedTimeSlot === slot.time;
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={slot.busy}
                            onClick={() => setSelectedTimeSlot(slot.time)}
                            className={`py-3 px-2 text-center rounded-lg border font-display text-sm font-bold transition-all relative ${
                              slot.busy
                                ? 'bg-muted/20 text-muted-foreground border-dashed border-border/50 cursor-not-allowed opacity-50 line-through'
                                : isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-500/20'
                                : 'bg-background hover:border-emerald-600/30 hover:bg-emerald-500/5 hover:text-emerald-600'
                            }`}
                          >
                            {slot.time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="bg-muted/10 border-t border-border/40 p-6 flex items-center justify-end">
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto btn-primary-gradient px-8 py-5 font-bold gap-2"
                  disabled={!selectedTimeSlot}
                >
                  Continuar Cadastro <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" /> 2. Ficha do Jogador
                  </CardTitle>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    className="text-xs font-bold" 
                    onClick={() => setStep(1)}
                  >
                    Voltar e Alterar Horário
                  </Button>
                </div>
                <CardDescription>Insira os seus dados de identificação para registrar o seu horário.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Resumo */}
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 text-xs grid grid-cols-3 gap-2 items-center mb-4">
                  <div>
                    <span className="text-muted-foreground uppercase block font-semibold text-[9px] tracking-wider">Quadra</span>
                    <span className="font-bold text-foreground text-sm">{selectedCourt?.name}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-muted-foreground uppercase block font-semibold text-[9px] tracking-wider">Data & Horário</span>
                    <span className="font-bold text-foreground text-sm">{selectedDate.split('-').reverse().join('/')} às {selectedTimeSlot} ({selectedDuration}m)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground uppercase block font-semibold text-[9px] tracking-wider">Valor do Play</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatCurrency((getCalculatedPrice(selectedCourt, selectedTimeSlot) * selectedDuration) / 60)}
                    </span>
                  </div>
                </div>

                {/* Nome Completo */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      required 
                      placeholder="Nome e sobrenome" 
                      className="pl-9"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                {/* CPF e Telefone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">CPF</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        required 
                        placeholder="000.000.000-00" 
                        className="pl-9"
                        value={cpf}
                        onChange={(e) => handleCpfChange(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">WhatsApp (Celular)</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        required 
                        placeholder="(00) 00000-0000" 
                        className="pl-9"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* E-mail */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      required 
                      type="email" 
                      placeholder="nome@email.com" 
                      className="pl-9"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>

              <CardFooter className="bg-muted/10 border-t border-border/40 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-[11px] text-muted-foreground text-center sm:text-left leading-normal flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" /> Seus dados pessoais estão protegidos de acordo com as leis LGPD vigentes.
                </span>
                <Button 
                  type="submit" 
                  className="w-full sm:w-auto btn-primary-gradient px-8 py-5 font-bold"
                  disabled={submitting}
                >
                  {submitting ? 'Reservando Horário...' : 'Finalizar Agendamento'}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
