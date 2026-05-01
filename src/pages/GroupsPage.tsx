import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { StatCard } from '@/components/StatCard';
import { useGroups, type Group, type GroupScheduleSlot } from '@/hooks/queries/useGroups';
import { useStudents } from '@/hooks/queries/useStudents';
import { useModalities } from '@/hooks/queries/useModalities';
import { 
  Users, Plus, Pencil, Trash2, Calendar, MapPin, Clock, Search,
  UsersRound, UserPlus, UserMinus, ChevronDown, ChevronUp, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { getEndTime } from '@/data/mockData';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_NAMES_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const COLORS = ['#6366f1', '#f43f5e', '#f97316', '#22c55e', '#06b6d4', '#8b5cf6', '#ec4899', '#eab308'];

function GroupFormDialog({
  open, onOpenChange, group
}: {
  open: boolean; onOpenChange: (o: boolean) => void; group?: Group;
}) {
  const { addGroup, updateGroup } = useGroups();
  const { students } = useStudents();
  const { modalities } = useModalities();
  const activeStudents = students.filter(s => s.active).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const isEditing = !!group;

  const [name, setName] = useState(group?.name || '');
  const [location, setLocation] = useState(group?.location || '');
  const [modalityId, setModalityId] = useState(group?.modalityId || 'none');
  const [maxStudents, setMaxStudents] = useState(group?.maxStudents?.toString() || '');
  const [duration, setDuration] = useState(group?.durationMinutes?.toString() || '60');
  const [color, setColor] = useState(group?.color || '#6366f1');
  const [schedule, setSchedule] = useState<GroupScheduleSlot[]>(group?.schedule || []);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(group?.studentIds || []);
  const [saving, setSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // Schedule helpers
  const addSlot = () => setSchedule([...schedule, { dayOfWeek: 1, time: '18:00' }]);
  const removeSlot = (i: number) => setSchedule(schedule.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, field: keyof GroupScheduleSlot, value: any) => {
    const updated = [...schedule];
    updated[i] = { ...updated[i], [field]: field === 'dayOfWeek' ? parseInt(value) : value };
    setSchedule(updated);
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || schedule.length === 0) return;
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        location: location.trim(),
        modalityId: modalityId !== 'none' ? modalityId : undefined,
        maxStudents: maxStudents ? parseInt(maxStudents) : undefined,
        durationMinutes: parseInt(duration) || 60,
        color,
        schedule,
        active: true,
        studentIds: selectedStudentIds,
      };
      if (isEditing) {
        await updateGroup(group.id, data);
      } else {
        await addGroup(data as any);
      }
      onOpenChange(false);
    } catch (err) {
      // error handled by hook
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = activeStudents.filter(s =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
          <DialogDescription>Configure os horários, local e alunos da turma.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nome + Cor */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-2">
              <Label>Nome da Turma *</Label>
              <Input placeholder="Ex: Sub-15 Noturno" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={cn("h-7 w-7 rounded-lg transition-all border-2", color === c ? 'border-foreground scale-110' : 'border-transparent')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>

          {/* Local + Duração */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Local</Label>
              <Input placeholder="Ex: Arena Principal" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duração</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1h30</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                  <SelectItem value="180">3 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Modalidade + Vagas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Select value={modalityId} onValueChange={setModalityId}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {modalities.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Máx. Alunos</Label>
              <Input type="number" min="1" placeholder="Ilimitado" value={maxStudents} onChange={e => setMaxStudents(e.target.value)} />
            </div>
          </div>

          {/* Horários */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Horários da Turma *</Label>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addSlot} className="gap-1.5 text-xs">
                <Plus className="h-3 w-3" />Adicionar
              </Button>
            </div>
            {schedule.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg bg-muted/20">
                Adicione pelo menos um horário para a turma.
              </p>
            )}
            {schedule.map((slot, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/10">
                <Select value={String(slot.dayOfWeek)} onValueChange={v => updateSlot(i, 'dayOfWeek', v)}>
                  <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES_FULL.map((d, idx) => (
                      <SelectItem key={idx} value={String(idx)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={slot.time} onValueChange={v => updateSlot(i, 'time', v)}>
                  <SelectTrigger className="w-[100px] h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Array.from({ length: 18 }, (_, h) => h + 6).map(h => {
                      const t = `${h.toString().padStart(2, '0')}:00`;
                      return <SelectItem key={t} value={t}>{t} - {getEndTime(t, parseInt(duration) || 60)}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {getEndTime(slot.time, parseInt(duration) || 60)}
                </span>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 ml-auto text-destructive" onClick={() => removeSlot(i)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Alunos */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <Label className="text-sm font-semibold">Alunos ({selectedStudentIds.length})</Label>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar aluno..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="pl-8 h-9 text-sm" />
            </div>
            <div className="max-h-[180px] overflow-y-auto space-y-1 border rounded-lg p-2 bg-muted/10">
              {filteredStudents.map(s => {
                const selected = selectedStudentIds.includes(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => toggleStudent(s.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all text-left",
                      selected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                    )}>
                    <div className={cn(
                      "h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                      selected ? "bg-primary border-primary" : "border-border"
                    )}>
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="truncate">{s.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto capitalize">{s.level}</span>
                  </button>
                );
              })}
              {filteredStudents.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhum aluno encontrado.</p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full btn-primary-gradient" disabled={saving || !name.trim() || schedule.length === 0}>
            {saving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Turma'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function GroupsPage() {
  const { groups, loadingGroups, deleteGroup } = useGroups();
  const { students } = useStudents();
  const { modalities } = useModalities();
  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | undefined>();
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const activeGroups = groups.filter(g => g.active);
  const totalStudentsInGroups = useMemo(() => {
    const ids = new Set(groups.flatMap(g => g.studentIds));
    return ids.size;
  }, [groups]);

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setFormOpen(true);
  };

  const handleDelete = async (group: Group) => {
    if (!confirm(`Remover a turma "${group.name}"? Os alunos não serão excluídos.`)) return;
    await deleteGroup(group.id);
  };

  const handleNewGroup = () => {
    setEditingGroup(undefined);
    setFormOpen(true);
  };

  const getModality = (id?: string | null) => modalities.find(m => m.id === id);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 md:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="section-title text-2xl md:text-3xl">Turmas & Grupos</h1>
            <p className="text-muted-foreground mt-1">Organize seus alunos em turmas com horários fixos</p>
          </div>
          <Button onClick={handleNewGroup} className="btn-primary-gradient gap-2">
            <Plus className="h-4 w-4" />Nova Turma
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up">
          <StatCard title="Total de Turmas" value={loadingGroups ? '...' : groups.length} icon={UsersRound} />
          <StatCard title="Turmas Ativas" value={loadingGroups ? '...' : activeGroups.length} icon={Calendar} variant="primary" />
          <StatCard title="Alunos Enturmados" value={totalStudentsInGroups} icon={UserPlus} description="Alunos únicos em turmas" />
          <StatCard title="Sem Turma" value={students.filter(s => s.active).length - totalStudentsInGroups} icon={UserMinus} description="Alunos ativos soltos" />
        </div>

        {/* Search */}
        <div className="card-elevated p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar turma..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </div>

        {/* Groups Grid */}
        {loadingGroups ? (
          <div className="text-center py-12 text-muted-foreground">Carregando turmas...</div>
        ) : filteredGroups.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <UsersRound className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-lg font-medium text-muted-foreground">
              {searchQuery ? 'Nenhuma turma encontrada' : 'Nenhuma turma cadastrada'}
            </p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {searchQuery ? 'Tente outro termo de busca' : 'Crie sua primeira turma para organizar seus alunos'}
            </p>
            {!searchQuery && (
              <Button onClick={handleNewGroup} className="mt-4 btn-primary-gradient gap-2">
                <Plus className="h-4 w-4" />Criar Turma
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredGroups.map((group, index) => {
              const mod = getModality(group.modalityId);
              const groupStudents = students.filter(s => group.studentIds.includes(s.id));
              const isExpanded = expandedGroup === group.id;
              const isFull = group.maxStudents ? groupStudents.length >= group.maxStudents : false;

              return (
                <Card key={group.id}
                  className={cn(
                    "overflow-hidden transition-all animate-fade-up opacity-0 border-2",
                    !group.active && "opacity-60",
                    isFull ? "border-amber-500/30" : "border-transparent hover:border-primary/20"
                  )}
                  style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}>
                  {/* Color bar */}
                  <div className="h-1.5 w-full" style={{ backgroundColor: group.color }} />
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-bold text-lg truncate">{group.name}</h3>
                          {!group.active && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">INATIVA</span>
                          )}
                        </div>
                        {mod && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: mod.color }} />
                            <span className="text-xs text-muted-foreground">{mod.name}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(group)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(group)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{group.location || 'Sem local definido'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{group.durationMinutes} min por aula</span>
                      </div>
                    </div>

                    {/* Schedule pills */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {group.schedule.map((slot, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-semibold">
                          {DAY_NAMES[slot.dayOfWeek]} {slot.time}
                        </span>
                      ))}
                    </div>

                    {/* Students count + capacity */}
                    <div className="flex items-center justify-between">
                      <button onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                        className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
                        <Users className="h-4 w-4" />
                        <span>
                          {groupStudents.length} aluno{groupStudents.length !== 1 ? 's' : ''}
                          {group.maxStudents && <span className="text-muted-foreground"> / {group.maxStudents}</span>}
                        </span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      {isFull && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold uppercase">Lotada</span>
                      )}
                    </div>

                    {/* Expanded students list */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                        {groupStudents.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-2">Nenhum aluno nesta turma</p>
                        ) : (
                          groupStudents.map(s => (
                            <div key={s.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-muted/30 text-sm">
                              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden">
                                {s.photo ? (
                                  <img src={s.photo} alt={s.name} className="h-full w-full object-cover" />
                                ) : (
                                  s.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <span className="truncate font-medium">{s.name}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto capitalize">{s.level}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <GroupFormDialog open={formOpen} onOpenChange={setFormOpen} group={editingGroup} />
    </div>
  );
}
