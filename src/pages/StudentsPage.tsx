import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Header } from '@/components/Header';
import { StudentCard } from '@/components/StudentCard';
import { StudentForm } from '@/components/StudentForm';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useStudents } from '@/hooks/queries/useStudents';
import { usePlans } from '@/hooks/queries/usePlans';
import { getActiveMonthlyStudents } from '@/lib/studentHelpers';

export default function StudentsPage() {
  const { students } = useStudents();
  const { plans } = usePlans();
  const activeMonthlyCount = getActiveMonthlyStudents(students, plans).length;
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === 'all' || student.level === levelFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' && student.active) || (statusFilter === 'inactive' && !student.active);
    return matchesSearch && matchesLevel && matchesStatus;
  }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 md:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="section-title text-2xl md:text-3xl">Meus Alunos</h1>
            <p className="text-muted-foreground mt-1">
              {activeMonthlyCount} alunos ativos com plano mensal
            </p>
          </div>
          <StudentForm />
        </div>

        <div className="card-elevated p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar aluno..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Nível" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  <SelectItem value="iniciante">Iniciante</SelectItem>
                  <SelectItem value="intermediário">Intermediário</SelectItem>
                  <SelectItem value="avançado">Avançado</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {filteredStudents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
            {filteredStudents.map((student, index) => (
              <div key={student.id} className="animate-fade-up opacity-0 h-full" style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'forwards' }}>
                <StudentCard student={student} />
              </div>
            ))}
          </div>
        ) : (
          <div className="card-elevated p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum aluno encontrado</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Tente ajustar os filtros ou adicione um novo aluno</p>
          </div>
        )}
      </main>
    </div>
  );
}
