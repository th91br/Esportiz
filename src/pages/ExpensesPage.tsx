import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { useExpenses } from '@/hooks/queries/useExpenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatCurrency';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Receipt,
  CheckCircle2,
  Clock,
  Trash2,
  Pencil,
  TrendingDown,
  Repeat,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const EXPENSE_CATEGORIES = [
  'Aluguel',
  'Energia/Água',
  'Salários',
  'Material Esportivo',
  'Marketing',
  'Manutenção',
  'Alimentação',
  'Transporte',
  'Geral',
];

const getMonthName = (month: number): string => {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return months[month];
};

export default function ExpensesPage() {
  const { expenses, loadingExpenses, addExpense, updateExpense, deleteExpense, markExpensePaid, markExpenseUnpaid, isAddingExpense } = useExpenses();
  const [monthOffset, setMonthOffset] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);

  // Form state
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formCategory, setFormCategory] = useState('Geral');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formRecurrence, setFormRecurrence] = useState('none');
  const [formNotes, setFormNotes] = useState('');

  const currentDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const currentMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => exp.date.startsWith(currentMonthStr));
  }, [expenses, currentMonthStr]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const paidExpenses = filteredExpenses.filter(e => e.paid).reduce((sum, e) => sum + e.amount, 0);
  const pendingExpenses = totalExpenses - paidExpenses;

  const resetForm = () => {
    setFormDescription('');
    setFormAmount('');
    setFormCategory('Geral');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormRecurrence('none');
    setFormNotes('');
    setEditingExpense(null);
  };

  const openEditForm = (expense: typeof expenses[0]) => {
    setEditingExpense(expense.id);
    setFormDescription(expense.description);
    setFormAmount(String(expense.amount));
    setFormCategory(expense.category);
    setFormDate(expense.date);
    setFormRecurrence(expense.recurrence);
    setFormNotes(expense.notes || '');
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formDescription.trim()) {
      toast.error('Informe a descrição da despesa.');
      return;
    }
    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }

    try {
      if (editingExpense) {
        await updateExpense({
          id: editingExpense,
          description: formDescription,
          amount,
          category: formCategory,
          date: formDate,
          recurrence: formRecurrence as any,
          notes: formNotes || undefined,
        });
        toast.success('Despesa atualizada!');
      } else {
        await addExpense({
          description: formDescription,
          amount,
          category: formCategory,
          date: formDate,
          recurrence: formRecurrence,
          notes: formNotes || undefined,
        });
      }
      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 md:py-8 space-y-6 max-w-5xl">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Receipt className="h-7 w-7 text-primary" />
              Despesas
            </h1>
            <p className="text-muted-foreground mt-1">Controle de custos e despesas do seu negócio.</p>
          </div>

          <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="btn-primary-gradient w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nova Despesa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
                <DialogDescription>
                  {editingExpense ? 'Atualize as informações da despesa.' : 'Registre uma nova despesa do seu negócio.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="exp-description">Descrição *</Label>
                  <Input
                    id="exp-description"
                    placeholder="Ex: Aluguel da quadra, Energia..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="exp-amount">Valor (R$) *</Label>
                    <Input
                      id="exp-amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exp-date">Data</Label>
                    <Input
                      id="exp-date"
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recorrência</Label>
                    <Select value={formRecurrence} onValueChange={setFormRecurrence}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Única</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp-notes">Observações</Label>
                  <Textarea
                    id="exp-notes"
                    placeholder="Observações opcionais..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSubmit} className="btn-primary-gradient" disabled={isAddingExpense}>
                  {isAddingExpense ? 'Salvando...' : editingExpense ? 'Salvar' : 'Registrar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setMonthOffset(monthOffset - 1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-display font-bold min-w-[180px] text-center">
            {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setMonthOffset(monthOffset + 1)}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-destructive/10">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Total de Despesas</p>
                  <p className="text-2xl font-bold font-display">{formatCurrency(totalExpenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Pagas</p>
                  <p className="text-2xl font-bold font-display text-green-600">{formatCurrency(paidExpenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Pendentes</p>
                  <p className="text-2xl font-bold font-display text-amber-600">{formatCurrency(pendingExpenses)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expenses List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lançamentos do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingExpenses ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma despesa neste mês</p>
                <p className="text-sm mt-1">Clique em "Nova Despesa" para começar.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm',
                      expense.paid
                        ? 'bg-green-50/50 border-green-200/50 dark:bg-green-950/20 dark:border-green-900/30'
                        : 'bg-background border-border/50'
                    )}
                  >
                    {/* Status Toggle */}
                    <button
                      onClick={() => expense.paid ? markExpenseUnpaid(expense.id) : markExpensePaid(expense.id)}
                      className={cn(
                        'h-8 w-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                        expense.paid
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-muted-foreground/30 hover:border-primary'
                      )}
                    >
                      {expense.paid && <CheckCircle2 className="h-4 w-4" />}
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn('font-medium text-sm truncate', expense.paid && 'line-through text-muted-foreground')}>
                          {expense.description}
                        </p>
                        {expense.recurrence === 'monthly' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                            <Repeat className="h-2.5 w-2.5" /> Mensal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{expense.category}</span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(expense.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <span className={cn('font-bold text-sm shrink-0', expense.paid ? 'text-green-600' : 'text-foreground')}>
                      {formatCurrency(expense.amount)}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => openEditForm(expense)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover despesa?</AlertDialogTitle>
                            <AlertDialogDescription>
                              A despesa "{expense.description}" será removida permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteExpense(expense.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
