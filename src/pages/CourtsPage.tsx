import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { useCourts, type Court, SPORT_LABELS, type CourtMetadata } from '@/hooks/queries/useCourts';
import { useReservations } from '@/hooks/queries/useReservations';
import { ReservationModal } from '@/components/ReservationModal';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import {
  Plus, Pencil, Trash2, Calendar, DollarSign, Users, Shield,
  CheckCircle, Clock, TrendingUp, Layers, Sun, Umbrella,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatCurrency';

const SPORT_TYPES = [
  'beach_tennis', 'futevolei', 'volei_praia', 'society',
  'padel', 'basquete', 'poliesportiva', 'outro',
] as const;

const COLORS = ['#f97316', '#6366f1', '#22c55e', '#06b6d4', '#ec4899', '#eab308', '#8b5cf6', '#f43f5e'];

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface CourtFormProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  court?: Court;
}

function CourtFormDialog({ open, onOpenChange, court }: CourtFormProps) {
  const { addCourt, updateCourt } = useCourts();
  const isEditing = !!court;

  const [name, setName] = useState(court?.name || '');
  const [color, setColor] = useState(court?.color || '#f97316');
  const [sportType, setSportType] = useState<CourtMetadata['sportType']>(court?.sportType || 'poliesportiva');
  const [coverage, setCoverage] = useState<CourtMetadata['coverage']>(court?.coverage || 'open');
  const [capacity, setCapacity] = useState(court?.capacity || 4);
  const [pricePerHour, setPricePerHour] = useState(court?.pricePerHour || 0);
  const [extraHourPrice, setExtraHourPrice] = useState(court?.extraHourPrice || 0);
  const [openingTime, setOpeningTime] = useState(court?.openingTime || '07:00');
  const [closingTime, setClosingTime] = useState(court?.closingTime || '22:00');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(court?.daysOfWeek || [1, 2, 3, 4, 5, 6]);
  const [observations, setObservations] = useState(court?.observations || '');
  const [isActive, setIsActive] = useState(court?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(court?.name || '');
      setColor(court?.color || '#f97316');
      setSportType(court?.sportType || 'poliesportiva');
      setCoverage(court?.coverage || 'open');
      setCapacity(court?.capacity || 4);
      setPricePerHour(court?.pricePerHour || 0);
      setExtraHourPrice(court?.extraHourPrice || 0);
      setOpeningTime(court?.openingTime || '07:00');
      setClosingTime(court?.closingTime || '22:00');
      setDaysOfWeek(court?.daysOfWeek || [1, 2, 3, 4, 5, 6]);
      setObservations(court?.observations || '');
      setIsActive(court?.isActive ?? true);
    }
  }, [court, open]);

  const toggleDay = (d: number) => {
    setDaysOfWeek(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const meta: CourtMetadata = {
        sportType, coverage, capacity, pricePerHour, extraHourPrice,
        openingTime, closingTime, daysOfWeek, observations, isActive,
      };
      if (isEditing && court) {
        await updateCourt({ id: court.id, name, color, metadata: meta });
      } else {
        await addCourt({ name, color, metadata: meta });
      }
      onOpenChange(false);
    } catch {
      /* toast shown in hook */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{isEditing ? 'Editar Quadra' : 'Nova Quadra'}</DialogTitle>
          <DialogDescription>Configure os dados da quadra.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label>Nome da Quadra *</Label>
            <Input placeholder="Ex: Quadra 1, Court Central" value={name} onChange={e => setName(e.target.value)} />
          </div>

          {/* Cor */}
          <div className="space-y-1.5">
            <Label>Cor de Identificação</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-8 w-8 rounded-full border-2 transition-all',
                    color === c ? 'border-foreground scale-110 shadow-md' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo de Esporte</Label>
              <Select value={sportType} onValueChange={v => setSportType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPORT_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{SPORT_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cobertura</Label>
              <Select value={coverage} onValueChange={v => setCoverage(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="covered">🏠 Coberta</SelectItem>
                  <SelectItem value="open">☀️ Descoberta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Capacidade e Preço */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Capacidade (jogadores)</Label>
              <Input type="number" min={1} max={50} value={capacity} onChange={e => setCapacity(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Valor por Hora (R$) *</Label>
              <Input type="number" min={0} step={0.5} value={pricePerHour} onChange={e => setPricePerHour(Number(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Valor Hora Extra (R$)</Label>
            <Input type="number" min={0} step={0.5} value={extraHourPrice} onChange={e => setExtraHourPrice(Number(e.target.value))} />
          </div>

          {/* Horário de Funcionamento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Abre às</Label>
              <Input type="time" value={openingTime} onChange={e => setOpeningTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha às</Label>
              <Input type="time" value={closingTime} onChange={e => setClosingTime(e.target.value)} />
            </div>
          </div>

          {/* Dias da Semana */}
          <div className="space-y-1.5">
            <Label>Dias de Funcionamento</Label>
            <div className="flex gap-1.5 flex-wrap">
              {DAY_LABELS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={cn(
                    'h-9 w-9 rounded-lg text-xs font-bold border transition-all',
                    daysOfWeek.includes(i)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Informações adicionais sobre a quadra..."
              rows={2}
            />
          </div>

          {/* Ativa */}
          <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
            <div>
              <p className="font-semibold text-sm">Quadra Ativa</p>
              <p className="text-xs text-muted-foreground">Quadras inativas não aparecem na agenda</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button className="flex-1 btn-primary-gradient" onClick={handleSave} disabled={saving || !name.trim()}>
              {saving
                ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : isEditing ? 'Salvar' : 'Criar Quadra'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CourtStatusBadge({ court, reservations }: { court: Court; reservations: any[] }) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const isOccupied = reservations.some(r => {
    if (r.courtId !== court.id || r.date !== todayStr || r.status === 'cancelled') return false;
    const endMin = parseInt(r.time.split(':')[0]) * 60 + parseInt(r.time.split(':')[1]) + r.durationMinutes;
    const startMin = parseInt(r.time.split(':')[0]) * 60 + parseInt(r.time.split(':')[1]);
    const nowMin = parseInt(currentTime.split(':')[0]) * 60 + parseInt(currentTime.split(':')[1]);
    return nowMin >= startMin && nowMin < endMin;
  });

  const hasUpcoming = reservations.some(r =>
    r.courtId === court.id && r.date === todayStr && r.status !== 'cancelled' && r.time > currentTime
  );

  if (!court.isActive) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-muted text-muted-foreground">Inativa</span>;
  if (isOccupied) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">🔴 Ocupada</span>;
  if (hasUpcoming) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">🟡 Reservada</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">🟢 Livre</span>;
}

export default function CourtsPage() {
  const { courts, loadingCourts, deleteCourt } = useCourts();
  const { reservations } = useReservations();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCourt, setEditingCourt] = useState<Court | undefined>();
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [selectedCourtForReservation, setSelectedCourtForReservation] = useState<string | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentTime = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
  const currentMonthStr = new Date().toISOString().slice(0, 7);

  const activeCourts = courts.filter(c => c.isActive);

  const occupiedCount = courts.filter(c => {
    return reservations.some(r => {
      if (r.courtId !== c.id || r.date !== todayStr || r.status === 'cancelled') return false;
      const endMin = parseInt(r.time.split(':')[0]) * 60 + parseInt(r.time.split(':')[1]) + r.durationMinutes;
      const startMin = parseInt(r.time.split(':')[0]) * 60 + parseInt(r.time.split(':')[1]);
      const nowMin = parseInt(currentTime.split(':')[0]) * 60 + parseInt(currentTime.split(':')[1]);
      return nowMin >= startMin && nowMin < endMin;
    });
  }).length;

  const monthReservations = reservations.filter(r => r.date.startsWith(currentMonthStr) && r.status !== 'cancelled');
  const totalHoursAvailable = activeCourts.length * 15 * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const totalHoursBooked = monthReservations.reduce((acc, r) => acc + r.durationMinutes / 60, 0);
  const occupancyRate = totalHoursAvailable > 0 ? Math.round((totalHoursBooked / totalHoursAvailable) * 100) : 0;

  const openForm = (court?: Court) => {
    setEditingCourt(court);
    setFormOpen(true);
  };

  const getNextReservation = (courtId: string) => {
    const todayReservations = reservations
      .filter(r => r.courtId === courtId && r.date >= todayStr && r.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    return todayReservations[0] || null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 md:py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight">Quadras</h1>
            <p className="text-muted-foreground mt-1">Gerencie as quadras físicas da sua arena</p>
          </div>
          <Button className="btn-primary-gradient gap-2 w-full sm:w-auto" onClick={() => openForm()}>
            <Plus className="h-4 w-4" /> Nova Quadra
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard title="Total de Quadras" value={loadingCourts ? '...' : courts.length} icon={Layers} description="Cadastradas no sistema" />
          <StatCard title="Disponíveis Agora" value={loadingCourts ? '...' : activeCourts.length - occupiedCount} icon={CheckCircle} variant="primary" description="Quadras livres agora" />
          <StatCard title="Ocupadas Agora" value={loadingCourts ? '...' : occupiedCount} icon={Users} description="Em uso neste momento" />
          <StatCard title="Taxa de Ocupação" value={loadingCourts ? '...' : `${occupancyRate}%`} icon={TrendingUp} description="Média mensal" />
        </div>

        {/* Courts Grid */}
        {courts.length === 0 && !loadingCourts ? (
          <div className="card-elevated p-16 text-center space-y-4">
            <div className="h-20 w-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
              <Layers className="h-10 w-10 text-primary/60" />
            </div>
            <div>
              <h3 className="font-display font-bold text-xl">Nenhuma quadra cadastrada</h3>
              <p className="text-muted-foreground mt-1">Cadastre sua primeira quadra para começar a gerenciar reservas.</p>
            </div>
            <Button className="btn-primary-gradient gap-2" onClick={() => openForm()}>
              <Plus className="h-4 w-4" /> Cadastrar Primeira Quadra
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
            {courts.map(court => {
              const nextRes = getNextReservation(court.id);
              return (
                <div key={court.id} className="card-interactive p-0 overflow-hidden flex flex-col">
                  {/* Top color bar */}
                  <div className="h-1.5" style={{ backgroundColor: court.color }} />

                  <div className="p-5 flex-1 flex flex-col gap-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: court.color + '20' }}>
                          <div className="h-4 w-4 rounded-full" style={{ backgroundColor: court.color }} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-display font-bold text-lg truncate">{court.name}</h3>
                          <p className="text-xs text-muted-foreground">{SPORT_LABELS[court.sportType]}</p>
                        </div>
                      </div>
                      <CourtStatusBadge court={court} reservations={reservations} />
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                          {court.coverage === 'covered' ? <Umbrella className="h-3 w-3 text-blue-500" /> : <Sun className="h-3 w-3 text-yellow-500" />}
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {court.coverage === 'covered' ? 'Coberta' : 'Descoberta'}
                          </p>
                        </div>
                        <p className="text-sm font-bold">{court.capacity} jogadores</p>
                      </div>
                      <div className="bg-primary/5 border border-primary/10 rounded-lg p-2.5 text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary/70 mb-0.5">Por hora</p>
                        <p className="text-sm font-bold text-primary">{formatCurrency(court.pricePerHour)}</p>
                      </div>
                    </div>

                    {/* Horário */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{court.openingTime} – {court.closingTime}</span>
                      <span className="ml-1">·</span>
                      <span>{court.daysOfWeek.map(d => DAY_LABELS[d]).join(', ')}</span>
                    </div>

                    {/* Next reservation */}
                    {nextRes && (
                      <div className="text-xs bg-muted/40 rounded-lg p-2 border border-border/50">
                        <span className="text-muted-foreground">Próxima: </span>
                        <span className="font-semibold">
                          {nextRes.date === todayStr ? 'Hoje' : new Date(nextRes.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          {' às '}{nextRes.time} ({nextRes.durationMinutes / 60}h)
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1 text-xs"
                        onClick={() => { setSelectedCourtForReservation(court.id); setReservationModalOpen(true); }}
                      >
                        <Calendar className="h-3.5 w-3.5" /> Ver Agenda
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openForm(court)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(court.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FAB Mobile */}
      <button
        className="fixed bottom-6 right-6 md:hidden h-14 w-14 rounded-full btn-primary-gradient shadow-xl flex items-center justify-center z-50"
        onClick={() => openForm()}
      >
        <Plus className="h-6 w-6 text-white" />
      </button>

      <CourtFormDialog open={formOpen} onOpenChange={setFormOpen} court={editingCourt} />

      <ReservationModal
        open={reservationModalOpen}
        onOpenChange={setReservationModalOpen}
        prefilledCourtId={selectedCourtForReservation}
      />

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover quadra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Reservas vinculadas podem ser afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => { deleteCourt(deleteId!); setDeleteId(null); }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
