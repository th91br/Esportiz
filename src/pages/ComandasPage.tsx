import { useState, useMemo, useEffect, type KeyboardEvent } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useComandas, Comanda, ComandaItem } from '@/hooks/queries/useComandas';
import { useProducts, Product } from '@/hooks/queries/useProducts';
import { formatCurrency } from '@/lib/formatCurrency';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { toast } from 'sonner';
import { 
  Plus, Search, ShoppingBag, CreditCard, DollarSign, X, Check, Trash2, Clock, Calendar, 
  ChevronRight, ArrowRight, User, Hash, Utensils, Beer, RefreshCw, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRolePermissions } from '@/hooks/useRolePermissions';

export default function ComandasPage() {
  const { comandas, loadingComandas, openComanda, addComandaItem, updateItemQuantity, deleteComandaItem, closeComanda, reopenComanda, deleteComanda } = useComandas();
  const { activeProducts, loadingProducts } = useProducts();
  const [privacyMode] = usePrivacyMode();
  const rolePermissions = useRolePermissions();
  const canCreateComandas = rolePermissions.can('comandas', 'create');
  const canUpdateComandas = rolePermissions.can('comandas', 'update');
  const canDeleteComandas = rolePermissions.can('comandas', 'delete');
  const canCloseComandas = rolePermissions.can('comandas', 'close_comanda');
  const canReopenComandas = rolePermissions.can('comandas', 'reopen_payment');

  // Navigation and UI states
  const [activeTab, setActiveTab] = useState<'open' | 'closed'>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [newComandaName, setNewComandaName] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Selected comanda details modal
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [modalTab, setModalTab] = useState<'items' | 'catalog'>('items');
  
  // Closing/Payment states
  const [closingComanda, setClosingComanda] = useState<Comanda | null>(null);
  const [comandaToCancel, setComandaToCancel] = useState<Comanda | null>(null);
  const [comandaToReopen, setComandaToReopen] = useState<Comanda | null>(null);
  const [itemToRemove, setItemToRemove] = useState<ComandaItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito'>('pix');
  const [isClosingSubmitting, setIsClosingSubmitting] = useState(false);

  // Reset modal tab to consumed items when opening a new comanda
  useEffect(() => {
    if (selectedComanda) {
      setModalTab('items');
    }
  }, [selectedComanda]);

  // Update selectedComanda state in real-time when the lists refresh
  useEffect(() => {
    if (selectedComanda) {
      const updated = comandas.find(c => c.id === selectedComanda.id);
      if (updated) {
        setSelectedComanda(updated);
      } else {
        setSelectedComanda(null);
      }
    }
  }, [comandas, selectedComanda]);

  // Categories of products
  const categories = useMemo(() => {
    const cats = new Set(activeProducts.map(p => p.category));
    return ['all', ...Array.from(cats)];
  }, [activeProducts]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return activeProducts.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
      const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [activeProducts, productSearch, selectedCategory]);

  // Filtered comandas list
  const filteredComandas = useMemo(() => {
    return comandas.filter(c => {
      const matchTab = c.status === activeTab;
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [comandas, activeTab, searchQuery]);

  const handleOpenComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateComandas) {
      toast.error('Seu cargo nao permite abrir comandas.');
      return;
    }
    if (!newComandaName.trim()) {
      toast.warning('Digite um nome ou número para a comanda.');
      return;
    }

    setIsSubmittingNew(true);
    try {
      await openComanda(newComandaName);
      setNewComandaName('');
      setOpenModalOpen(false);
    } catch {
      // toast is already handled inside the hook
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleAddProduct = async (product: Product) => {
    if (!selectedComanda) return;
    if (!canUpdateComandas) {
      toast.error('Seu cargo nao permite alterar comandas.');
      return;
    }
    try {
      await addComandaItem({
        comandaId: selectedComanda.id,
        productId: product.id,
        productName: product.name,
        unitPrice: product.price,
        quantity: 1,
      });
      toast.success(`+1 ${product.name} adicionado!`);
    } catch {
      // handled inside hook
    }
  };

  const handleQuantityChange = async (item: ComandaItem, delta: number) => {
    if (!canUpdateComandas) {
      toast.error('Seu cargo nao permite alterar comandas.');
      return;
    }
    const newQty = item.quantity + delta;
    try {
      await updateItemQuantity({
        itemId: item.id,
        quantity: newQty,
      });
    } catch {
      // handled inside hook
    }
  };

  const handleCloseComandaSubmit = async () => {
    if (!closingComanda || isClosingSubmitting) return;
    if (!canCloseComandas) {
      toast.error('Seu cargo nao permite fechar comandas.');
      return;
    }
    setIsClosingSubmitting(true);
    try {
      await closeComanda({
        comandaId: closingComanda.id,
        paymentMethod,
      });
      setClosingComanda(null);
      setSelectedComanda(null);
    } catch {
      // handled inside hook
    } finally {
      setIsClosingSubmitting(false);
    }
  };

  // Helper to calculate time spent open
  const getOpenedDuration = (createdAtStr: string) => {
    const start = new Date(createdAtStr);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `Aberta há ${diffMins} min`;
    } else {
      const hours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      return `Aberta há ${hours}h ${remainingMins}m`;
    }
  };

  const pv = (val: string | number) => (privacyMode ? '••••' : val);

  const handleComandaCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, comanda: Comanda) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedComanda(comanda);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 md:py-8 space-y-6">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
          <div>
            <h1 className="section-title text-2xl md:text-3xl flex items-center gap-2">
              <ShoppingBag className="h-7 w-7 text-primary" />
              Controle de Comandas
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie o consumo de mesas e clientes no bar ou cantina da Arena.
            </p>
          </div>
          {canCreateComandas && (
            <Button 
              onClick={() => setOpenModalOpen(true)} 
              className="btn-primary-gradient w-full sm:w-auto shrink-0 shadow-lg shadow-primary/20"
            >
              <Plus className="h-5 w-5 mr-1" />
              Abrir Nova Comanda
            </Button>
          )}
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-center gap-4 bg-muted/25 p-3 rounded-2xl border border-border/40 animate-fade-up" style={{ animationDelay: '0.05s' }}>
          {/* Tabs */}
          <div className="flex rounded-xl bg-background p-1 border border-border shadow-sm w-full md:w-auto">
            <button
              onClick={() => setActiveTab('open')}
              className={cn(
                'flex-1 md:flex-none px-5 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2',
                activeTab === 'open' 
                  ? 'bg-success text-success-foreground shadow-md shadow-success/10'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Clock className="h-4 w-4" />
              Abertas
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-bold ml-1 transition-all',
                activeTab === 'open' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              )}>
                {comandas.filter(c => c.status === 'open').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('closed')}
              className={cn(
                'flex-1 md:flex-none px-5 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2',
                activeTab === 'closed' 
                  ? 'bg-secondary text-secondary-foreground shadow-md shadow-secondary/10'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Check className="h-4 w-4" />
              Fechadas
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full font-bold ml-1 transition-all',
                activeTab === 'closed' ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
              )}>
                {comandas.filter(c => c.status === 'closed').length}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar comanda por nome da mesa, cliente ou número..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 w-full bg-background"
            />
          </div>
        </div>

        {/* Main Grid List */}
        {loadingComandas ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 animate-pulse">
            <RefreshCw className="h-10 w-10 text-primary animate-spin" />
            <p className="text-muted-foreground font-semibold">Buscando comandas no banco...</p>
          </div>
        ) : filteredComandas.length === 0 ? (
          <Card className="border-dashed border-2 py-16 text-center shadow-none animate-fade-up">
            <CardHeader className="flex items-center justify-center">
              <div className="bg-primary/5 p-4 rounded-full">
                <ShoppingBag className="h-12 w-12 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <h3 className="font-display font-bold text-lg text-foreground">
                Nenhuma comanda encontrada
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                {searchQuery 
                  ? 'Nenhum resultado corresponde à sua pesquisa de filtro.'
                  : activeTab === 'open' 
                  ? 'Não há comandas abertas no momento. Abra uma para começar o consumo.'
                  : 'Histórico de comandas fechadas está vazio.'}
              </p>
              {!searchQuery && activeTab === 'open' && canCreateComandas && (
                <Button onClick={() => setOpenModalOpen(true)} className="mt-4 btn-primary-gradient shadow-md">
                  <Plus className="h-4 w-4 mr-1" />
                  Abrir Primeira Comanda
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-up">
            {filteredComandas.map((comanda) => (
              <div
                key={comanda.id}
                onClick={() => setSelectedComanda(comanda)}
                onKeyDown={(event) => handleComandaCardKeyDown(event, comanda)}
                role="button"
                tabIndex={0}
                aria-label={`Abrir comanda ${comanda.name}`}
                className={cn(
                  'card-interactive p-5 flex flex-col justify-between border transition-all cursor-pointer bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  comanda.status === 'open'
                    ? 'border-success/25 bg-success/[0.03] hover:border-success/40'
                    : 'border-secondary/10 hover:border-secondary/25 dark:border-primary/20 dark:hover:border-primary/35'
                )}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        {comanda.name.match(/^\d+$/) ? <Hash className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
                      </div>
                      <h3 className="font-display font-bold text-base truncate max-w-[140px] text-card-foreground">
                        {comanda.name}
                      </h3>
                    </div>
                    {comanda.status === 'open' ? (
                      <span className="text-[10px] bg-success/10 text-success border border-success/20 px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wider flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-success" />
                        Ativa
                      </span>
                    ) : (
                      <span className="text-[10px] bg-secondary/10 text-secondary border border-secondary/10 dark:bg-primary/10 dark:text-primary dark:border-primary/20 px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wider flex items-center gap-1">
                        Pago
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{getOpenedDuration(comanda.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>
                        {comanda.items.reduce((acc, i) => acc + i.quantity, 0)} itens consumidos
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Valor Total:</span>
                    <span className="font-display font-extrabold text-base text-primary">
                      {pv(formatCurrency(comanda.totalAmount))}
                    </span>
                  </div>
                  {comanda.status === 'open' && comanda.items.length > 0 && canCloseComandas && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClosingComanda(comanda);
                      }}
                      className="h-8 px-3 bg-success hover:bg-success/90 text-success-foreground font-bold text-xs rounded-lg gap-1 shadow-sm shrink-0"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      Finalizar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* dialog to open comanda */}
      <Dialog open={openModalOpen} onOpenChange={setOpenModalOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">Abrir Nova Comanda</DialogTitle>
            <DialogDescription>
              Crie uma comanda rápida para um cliente ou mesa para iniciar o consumo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOpenComanda} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Identificação da Comanda</label>
              <Input
                type="text"
                placeholder="Ex: Mesa 12 ou Thiago Silva"
                value={newComandaName}
                onChange={(e) => setNewComandaName(e.target.value)}
                autoFocus
                className="h-11"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpenModalOpen(false)} 
                className="flex-1 h-11"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmittingNew}
                className="flex-1 h-11 btn-primary-gradient shadow-md"
              >
                {isSubmittingNew ? <RefreshCw className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Abrir Comanda
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* POS/PDV Details Modal */}
      <Dialog open={!!selectedComanda} onOpenChange={(open) => { if (!open) setSelectedComanda(null); }}>
        <DialogContent className="max-w-5xl w-[calc(100vw-1rem)] sm:w-[95vw] h-[92dvh] max-h-[92dvh] md:h-[80vh] flex flex-col p-0 overflow-hidden rounded-xl sm:rounded-2xl">
          {selectedComanda && (
            <>
              {/* Header */}
              <div className="bg-primary/5 p-4 md:p-6 border-b border-border/50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="bg-primary text-primary-foreground p-2.5 rounded-xl">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display font-bold text-lg md:text-xl text-foreground flex flex-wrap items-center gap-2">
                      <span className="min-w-0 truncate">{selectedComanda.name}</span>
                      {selectedComanda.status === 'open' ? (
                        <span className="text-[10px] bg-success/10 text-success border border-success/20 px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wider">
                          Aberta
                        </span>
                      ) : (
                        <span className="text-[10px] bg-secondary/10 text-secondary border border-secondary/10 dark:bg-primary/10 dark:text-primary dark:border-primary/20 px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wider">
                          Fechada
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{getOpenedDuration(selectedComanda.createdAt)}</span>
                    </p>
                  </div>
                </div>
                
                {/* Cancel Comanda (Only if open and empty) */}
                {selectedComanda.status === 'open' && selectedComanda.items.length === 0 && canDeleteComandas && (
                  <Button 
                    variant="ghost" 
                    onClick={() => setComandaToCancel(selectedComanda)}
                    className="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-destructive/5 text-xs font-semibold gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" /> Cancelar Comanda
                  </Button>
                )}

                {/* Reopen Comanda (Only if closed) */}
                {selectedComanda.status === 'closed' && canReopenComandas && (
                  <Button 
                    variant="outline" 
                    onClick={() => setComandaToReopen(selectedComanda)}
                    className="w-full sm:w-auto text-primary border-primary/20 hover:bg-primary/5 text-xs font-bold gap-1.5"
                  >
                    <RefreshCw className="h-4 w-4" /> Reabrir Comanda
                  </Button>
                )}
              </div>

              {/* Mobile Tab Switcher */}
              {selectedComanda.status === 'open' && (
                <div className="flex border-b border-border bg-muted/15 md:hidden flex-shrink-0">
                  <button
                    onClick={() => setModalTab('items')}
                    className={cn(
                      "flex-1 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-1.5",
                      modalTab === 'items' 
                        ? "border-primary text-primary bg-primary/5" 
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Consumo ({selectedComanda.items.reduce((sum, item) => sum + item.quantity, 0)})
                  </button>
                  <button
                    onClick={() => setModalTab('catalog')}
                    className={cn(
                      "flex-1 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-1.5",
                      modalTab === 'catalog' 
                        ? "border-primary text-primary bg-primary/5" 
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Utensils className="h-4 w-4" />
                    Cardápio
                  </button>
                </div>
              )}

              {/* Body POS Split View */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                
                {/* LEFT COLUMN: Consumption details list */}
                <div className={cn(
                  "flex-1 flex flex-col p-4 md:p-5 border-r border-border/50 overflow-y-auto min-h-0",
                  selectedComanda.status === 'open' && modalTab !== 'items' && 'hidden md:flex'
                )}>
                  <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>Itens Consumidos</span>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold">
                      {selectedComanda.items.reduce((sum, item) => sum + item.quantity, 0)} no total
                    </span>
                  </h3>

                  {selectedComanda.items.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
                      <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-2" />
                      <p className="text-sm font-semibold">Comanda vazia</p>
                      <p className="text-xs text-muted-foreground/75 mt-0.5">
                        Adicione produtos do cardápio ao lado.
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                      {selectedComanda.items.map((item) => (
                        <div key={item.id} className="flex flex-col gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/40 transition-colors sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1 pr-3">
                            <p className="font-bold text-sm truncate text-foreground">{item.productName}</p>
                            <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                              {formatCurrency(item.unitPrice)} cada
                            </p>
                          </div>
                          
                          {/* Item Quantity Modifier (Only if comanda is open) */}
                          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                            {selectedComanda.status === 'open' && canUpdateComandas ? (
                              <div className="flex items-center rounded-lg border border-border/80 bg-background overflow-hidden shrink-0 shadow-sm">
                                <button 
                                  onClick={() => handleQuantityChange(item, -1)}
                                  className="px-2.5 py-1 hover:bg-muted text-muted-foreground hover:text-foreground font-bold transition-colors"
                                >
                                  -
                                </button>
                                <span className="px-2 font-display font-extrabold text-sm text-foreground">
                                  {item.quantity}
                                </span>
                                <button 
                                  onClick={() => handleQuantityChange(item, 1)}
                                  className="px-2.5 py-1 hover:bg-muted text-muted-foreground hover:text-foreground font-bold transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <span className="font-bold text-sm bg-muted px-2.5 py-1 rounded-md">
                                Qtd: {item.quantity}
                              </span>
                            )}

                            <span className="font-display font-extrabold text-sm min-w-[70px] text-right text-foreground">
                              {pv(formatCurrency(item.total))}
                            </span>

                            {/* Direct delete button */}
                            {selectedComanda.status === 'open' && canUpdateComandas && (
                              <button 
                                onClick={() => setItemToRemove(item)}
                                className="text-muted-foreground/60 hover:text-destructive p-1 rounded hover:bg-destructive/5 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pricing Total block & Checkout Actions */}
                  <div className="border-t border-border/50 pt-4 mt-4 flex-shrink-0 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold uppercase text-muted-foreground tracking-wide">Valor Consumido:</span>
                      <span className="font-display font-extrabold text-2xl text-primary">
                        {pv(formatCurrency(selectedComanda.totalAmount))}
                      </span>
                    </div>

                    {selectedComanda.status === 'open' && canCloseComandas && (
                      <Button
                        onClick={() => setClosingComanda(selectedComanda)}
                        disabled={selectedComanda.items.length === 0}
                        className="w-full h-12 text-base font-bold btn-primary-gradient flex items-center justify-center gap-2 shadow-lg shadow-primary/10"
                      >
                        <CreditCard className="h-5 w-5" />
                        Fechar Conta e Receber Pagamento
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Product Catalog (Disabled if closed) */}
                {selectedComanda.status === 'open' && canUpdateComandas ? (
                  <div className={cn(
                    "w-full md:w-[45%] flex flex-col p-4 md:p-5 bg-muted/15 overflow-y-auto min-h-0",
                    modalTab !== 'catalog' && 'hidden md:flex'
                  )}>
                    <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider mb-3">
                      Cardápio / Produtos
                    </h3>

                    {/* Product Search & Category filters */}
                    <div className="space-y-3 mb-4 flex-shrink-0">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Pesquisar produto pelo nome..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="pl-9 h-9 text-xs bg-background"
                        />
                      </div>

                      {/* Horizontal categories list */}
                      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                        {categories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                              'px-3 py-1 text-xs font-semibold rounded-lg capitalize shrink-0 transition-colors border',
                              selectedCategory === cat 
                                ? 'bg-primary border-primary text-white font-bold' 
                                : 'bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            {cat === 'all' ? 'Tudo' : cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Catalog Listing */}
                    {loadingProducts ? (
                      <div className="flex-1 flex items-center justify-center py-12">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
                        <Utensils className="h-10 w-10 text-muted-foreground/20 mb-2" />
                        <p className="text-xs font-semibold">Nenhum produto cadastrado</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          Cadastre os produtos na aba "Produtos".
                        </p>
                      </div>
                    ) : (
                      <div className="flex-1 grid grid-cols-2 gap-2 overflow-y-auto pr-1">
                        {filteredProducts.map((product) => (
                          <div
                            key={product.id}
                            onClick={() => handleAddProduct(product)}
                            className="bg-background border border-border/60 hover:border-primary/30 p-3 rounded-xl flex flex-col justify-between text-left cursor-pointer transition-all hover:shadow-sm active:scale-95 group"
                          >
                            <div>
                              <div className="flex items-center gap-1.5 mb-1 text-[10px] text-primary/80 font-bold uppercase tracking-wider">
                                {product.category.toLowerCase().startsWith('beb') ? <Beer className="h-3 w-3" /> : <Utensils className="h-3 w-3" />}
                                <span>{product.category}</span>
                              </div>
                              <p className="font-bold text-xs text-foreground leading-tight group-hover:text-primary transition-colors">
                                {product.name}
                              </p>
                            </div>
                            <div className="mt-3 flex items-center justify-between flex-shrink-0">
                              <span className="font-display font-extrabold text-xs text-foreground/90">
                                {pv(formatCurrency(product.price))}
                              </span>
                              <div className="bg-primary/5 group-hover:bg-primary group-hover:text-primary-foreground p-1 rounded-lg text-primary transition-colors">
                                <Plus className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full md:w-[45%] flex flex-col items-center justify-center text-center p-8 bg-muted/10">
                    <Lock className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="font-bold text-sm text-muted-foreground">Consumo Bloqueado</p>
                    <p className="text-xs text-muted-foreground/70 max-w-xs mt-0.5 mb-4">
                      {selectedComanda.status === 'closed'
                        ? 'Esta comanda ja foi fechada e paga. Nao e possivel adicionar novos itens.'
                        : 'Seu cargo permite visualizar a comanda, mas nao alterar o consumo.'}
                    </p>
                    {selectedComanda.status === 'closed' && canReopenComandas && (
                    <Button 
                      variant="outline" 
                      onClick={() => setComandaToReopen(selectedComanda)}
                      className="text-primary border-primary/20 hover:bg-primary/5 text-xs font-bold gap-1.5"
                    >
                      <RefreshCw className="h-4 w-4" /> Reabrir Comanda
                    </Button>
                    )}
                  </div>
                )}

              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Checkout / Payment details confirmation Dialog */}
      <Dialog open={!!closingComanda} onOpenChange={(open) => { if (!open) setClosingComanda(null); }}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Fechamento de Conta
            </DialogTitle>
            <DialogDescription>
              Selecione o método de pagamento recebido para finalizar a comanda de R$ {closingComanda && pv(closingComanda.totalAmount.toFixed(2))}.
            </DialogDescription>
          </DialogHeader>

          {closingComanda && (
            <div className="space-y-5 mt-4">
              {/* Receipt Summary */}
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold">Total a Receber</p>
                  <p className="font-display font-black text-2xl text-primary mt-0.5">
                    {pv(formatCurrency(closingComanda.totalAmount))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-foreground">{closingComanda.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 uppercase font-semibold">
                    {closingComanda.items.reduce((sum, item) => sum + item.quantity, 0)} itens de consumo
                  </p>
                </div>
              </div>

              {/* Payment Selectors */}
              <div className="space-y-2.5">
                <label className="text-sm font-extrabold text-foreground uppercase tracking-wider">
                  Forma de Pagamento
                </label>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={cn(
                      'p-3.5 border rounded-xl font-bold text-xs flex flex-col items-center gap-1.5 transition-all',
                      paymentMethod === 'pix' 
                        ? 'border-primary bg-primary/5 text-primary shadow-sm shadow-primary/5' 
                        : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <div className="text-base">⚡</div>
                    PIX Instantâneo
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('dinheiro')}
                    className={cn(
                      'p-3.5 border rounded-xl font-bold text-xs flex flex-col items-center gap-1.5 transition-all',
                      paymentMethod === 'dinheiro' 
                        ? 'border-primary bg-primary/5 text-primary shadow-sm shadow-primary/5' 
                        : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <DollarSign className="h-4 w-4" />
                    Dinheiro físico
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cartao_credito')}
                    className={cn(
                      'p-3.5 border rounded-xl font-bold text-xs flex flex-col items-center gap-1.5 transition-all',
                      paymentMethod === 'cartao_credito' 
                        ? 'border-primary bg-primary/5 text-primary shadow-sm shadow-primary/5' 
                        : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <CreditCard className="h-4 w-4" />
                    Cartão de Crédito
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cartao_debito')}
                    className={cn(
                      'p-3.5 border rounded-xl font-bold text-xs flex flex-col items-center gap-1.5 transition-all',
                      paymentMethod === 'cartao_debito' 
                        ? 'border-primary bg-primary/5 text-primary shadow-sm shadow-primary/5' 
                        : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <CreditCard className="h-4 w-4" />
                    Cartão de Débito
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setClosingComanda(null)} 
                  className="w-full sm:flex-1 h-11"
                >
                  Voltar
                </Button>
                <Button 
                  type="button" 
                  onClick={handleCloseComandaSubmit}
                  disabled={isClosingSubmitting || !canCloseComandas}
                  className="w-full sm:flex-1 h-11 bg-success text-success-foreground hover:bg-success/95 font-bold shadow-md shadow-success/10 flex items-center justify-center gap-1.5"
                >
                  {isClosingSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Confirmar e Baixar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!comandaToCancel} onOpenChange={(open) => { if (!open) setComandaToCancel(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar comanda?</AlertDialogTitle>
            <AlertDialogDescription>
              A comanda "{comandaToCancel?.name}" será removida. Use esta ação somente para comandas abertas e sem consumo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!comandaToCancel) return;
                if (!canDeleteComandas) return;
                await deleteComanda(comandaToCancel.id);
                setSelectedComanda(null);
                setComandaToCancel(null);
              }}
            >
              Cancelar Comanda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!itemToRemove} onOpenChange={(open) => { if (!open) setItemToRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover item?</AlertDialogTitle>
            <AlertDialogDescription>
              O item "{itemToRemove?.productName}" será removido da comanda aberta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!itemToRemove) return;
                if (!canUpdateComandas) return;
                await deleteComandaItem(itemToRemove.id);
                setItemToRemove(null);
              }}
            >
              Remover Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!comandaToReopen} onOpenChange={(open) => { if (!open) setComandaToReopen(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir comanda?</AlertDialogTitle>
            <AlertDialogDescription>
              O faturamento anterior registrado no caixa será estornado automaticamente e a comanda voltará para aberta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter fechada</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!comandaToReopen) return;
                if (!canReopenComandas) return;
                await reopenComanda(comandaToReopen.id);
                setSelectedComanda(null);
                setComandaToReopen(null);
              }}
            >
              Reabrir Comanda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
