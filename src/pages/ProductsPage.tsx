import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { StatCard } from '@/components/StatCard';
import { Switch } from '@/components/ui/switch';
import { useProducts } from '@/hooks/queries/useProducts';
import { useBusinessContext } from '@/hooks/useBusinessContext';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatCurrency';
import { Plus, Package, Pencil, Power, PowerOff, TrendingUp, AlertTriangle, Coins, PlusCircle, MinusCircle, Search, RefreshCw, BarChart4 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRolePermissions } from '@/hooks/useRolePermissions';

export default function ProductsPage() {
  const { products, loadingProducts, addProduct, updateProduct, deleteProduct, isAddingProduct } = useProducts();
  const { isArena } = useBusinessContext();

  const categories = useMemo(() => {
    if (isArena) {
      return ['Bebidas', 'Alimentação', 'Material Esportivo', 'Acessórios', 'Geral'];
    }
    // sport_school
    return ['Uniformes', 'Equipamentos', 'Acessórios', 'Geral'];
  }, [isArena]);
  const rolePermissions = useRolePermissions();
  const canCreateProducts = rolePermissions.can('products', 'create');
  const canUpdateProducts = rolePermissions.can('products', 'update');
  const canDeleteProducts = rolePermissions.can('products', 'delete');
  const canManageStock = rolePermissions.can('products', 'manage_stock');
  const [activeTab, setActiveTab] = useState<'catalog' | 'inventory'>('catalog');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [onlyAlertsFilter, setOnlyAlertsFilter] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('Geral');
  const [formTrackStock, setFormTrackStock] = useState(false);
  const [formStockQuantity, setFormStockQuantity] = useState('0');
  const [formMinStock, setFormMinStock] = useState('0');

  // Inventory/Stock analytical calculations
  const stockProducts = useMemo(() => {
    return products.filter(p => p.active && p.trackStock);
  }, [products]);

  const filteredStockProducts = useMemo(() => {
    return stockProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(stockSearchQuery.toLowerCase());
      const matchesAlert = !onlyAlertsFilter || p.stockQuantity <= p.minStock;
      return matchesSearch && matchesAlert;
    });
  }, [stockProducts, stockSearchQuery, onlyAlertsFilter]);

  const stockStats = useMemo(() => {
    let totalItems = 0;
    let totalValue = 0;
    let alertCount = 0;

    stockProducts.forEach(p => {
      totalItems += p.stockQuantity;
      totalValue += p.stockQuantity * p.price;
      if (p.stockQuantity <= p.minStock) {
        alertCount++;
      }
    });

    return { totalItems, totalValue, alertCount };
  }, [stockProducts]);

  const resetForm = () => {
    setFormName('');
    setFormPrice('');
    setFormCategory('Geral');
    setFormTrackStock(false);
    setFormStockQuantity('0');
    setFormMinStock('0');
    setEditingId(null);
  };

  const openEdit = (p: typeof products[0]) => {
    if (!canUpdateProducts) return;
    setEditingId(p.id);
    setFormName(p.name);
    setFormPrice(String(p.price));
    setFormCategory(p.category);
    setFormTrackStock(p.trackStock);
    setFormStockQuantity(String(p.stockQuantity));
    setFormMinStock(String(p.minStock));
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (editingId && !canUpdateProducts) return;
    if (!editingId && !canCreateProducts) return;

    if (!formName.trim()) { toast.error('Informe o nome do produto.'); return; }
    const price = parseFloat(formPrice);
    if (isNaN(price) || price <= 0) { toast.error('Informe um preço válido.'); return; }

    const stockQuantity = parseInt(formStockQuantity);
    const minStock = parseInt(formMinStock);

    if (formTrackStock) {
      if (isNaN(stockQuantity) || stockQuantity < 0) { toast.error('Informe uma quantidade de estoque válida.'); return; }
      if (isNaN(minStock) || minStock < 0) { toast.error('Informe um limite de estoque mínimo válido.'); return; }
    }

    try {
      const productPayload = {
        name: formName,
        price,
        category: formCategory,
        trackStock: formTrackStock,
        stockQuantity: formTrackStock ? stockQuantity : 0,
        minStock: formTrackStock ? minStock : 0,
      };

      if (editingId) {
        await updateProduct({ id: editingId, ...productPayload });
      } else {
        await addProduct(productPayload);
      }
      setIsFormOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  const displayProducts = showInactive ? products : products.filter(p => p.active);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 md:py-8 space-y-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <Package className="h-7 w-7 text-primary" />
              Produtos
            </h1>
            <p className="text-muted-foreground mt-1">
              {isArena
                ? 'Cadastre os itens disponíveis para venda na arena (bebidas, alimentos, etc).'
                : 'Cadastre os uniformes, materiais e artigos esportivos disponíveis para os alunos.'}
            </p>
          </div>

          {(canCreateProducts || canUpdateProducts) && (
          <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) resetForm(); }}>
            {canCreateProducts && (
              <DialogTrigger asChild>
                <Button className="btn-primary-gradient w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Produto
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
                <DialogDescription>
                  {editingId
                    ? 'Atualize as informações do produto.'
                    : isArena
                      ? 'Cadastre um novo item para venda (cantina/bar/comanda).'
                      : 'Cadastre um novo item ou uniforme da escola.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    placeholder={isArena ? "Ex: Água Mineral 500ml" : "Ex: Uniforme Oficial, Squeeze, Caneleira..."}
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço (R$) *</Label>
                    <Input type="number" step="0.01" min="0" placeholder="0,00" value={formPrice} onChange={e => setFormPrice(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Stock Control Toggle and Inputs */}
                <div className="pt-2 border-t border-border/40 space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-muted/30 border border-border/40">
                    <div className="space-y-0.5">
                      <Label htmlFor="track-stock" className="text-sm font-bold cursor-pointer">Controlar Estoque de Segurança</Label>
                      <p className="text-[10px] text-muted-foreground font-medium leading-normal">
                        Monitore saldos e ative alertas para este produto.
                      </p>
                    </div>
                    <Switch
                      id="track-stock"
                      checked={formTrackStock}
                      onCheckedChange={setFormTrackStock}
                      className={cn(
                        isArena 
                          ? "data-[state=unchecked]:bg-rose-600 data-[state=checked]:bg-emerald-600 border-none shadow-sm" 
                          : ""
                      )}
                    />
                  </div>

                  {formTrackStock && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                      <div className="space-y-2">
                        <Label>Estoque Atual *</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Ex: 50"
                          value={formStockQuantity}
                          onChange={e => setFormStockQuantity(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estoque Mínimo *</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Ex: 5"
                          value={formMinStock}
                          onChange={e => setFormMinStock(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleSubmit} className="btn-primary-gradient" disabled={isAddingProduct}>
                  {isAddingProduct ? 'Salvando...' : editingId ? 'Salvar' : 'Cadastrar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Tab Switcher - Exclusivo Arena */}
        {isArena && (
          <div className="flex border-b border-border/60 gap-1.5 pt-2">
            <button
              onClick={() => setActiveTab('catalog')}
              className={cn(
                "pb-3 px-4 font-display font-bold text-sm transition-all relative border-b-2 -mb-[2px]",
                activeTab === 'catalog'
                  ? "text-primary border-primary font-extrabold"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Catálogo de Produtos
              </span>
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={cn(
                "pb-3 px-4 font-display font-bold text-sm transition-all relative border-b-2 -mb-[2px]",
                activeTab === 'inventory'
                  ? "text-primary border-primary font-extrabold"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2">
                <BarChart4 className="h-4 w-4" />
                Controle de Estoque & Análise
              </span>
            </button>
          </div>
        )}

        {/* TAB 1: CATÁLOGO DE PRODUTOS */}
        {(!isArena || activeTab === 'catalog') && (
          <div className="space-y-6">
            {/* Toggle inactive */}
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowInactive(!showInactive)} className="text-xs">
                {showInactive ? 'Ocultar Inativos' : 'Mostrar Inativos'}
              </Button>
            </div>

            {/* Products Grid */}
            {loadingProducts ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : displayProducts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhum produto cadastrado</p>
                  {canCreateProducts && (
                    <p className="text-sm mt-1">Clique em "Novo Produto" para começar.</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayProducts.map(product => (
                  <Card key={product.id} className={cn('border border-border/50', !product.active && 'opacity-50')}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.category}</p>
                          {product.trackStock && (
                            <div className="mt-2">
                              {product.stockQuantity === 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-destructive/10 text-destructive border border-destructive/20 uppercase tracking-wide">
                                  <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                                  Sem Estoque
                                </span>
                              ) : product.stockQuantity <= product.minStock ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-wide">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Estoque Baixo ({product.stockQuantity})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-success/15 text-success border border-success/20 uppercase tracking-wide">
                                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                                  {product.stockQuantity} un
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-lg font-bold text-primary shrink-0 ml-2">
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                      {(canUpdateProducts || canDeleteProducts) && (
                        <div className="flex items-center gap-1 mt-4 pt-3 border-t">
                          {canUpdateProducts && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => openEdit(product)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                          {product.active ? (
                            canDeleteProducts && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:text-destructive" onClick={() => deleteProduct(product.id)} title="Desativar">
                                <PowerOff className="h-3 w-3" />
                              </Button>
                            )
                          ) : (
                            canUpdateProducts && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-green-600 hover:text-green-600" onClick={() => updateProduct({ id: product.id, active: true })} title="Reativar">
                                <Power className="h-3 w-3" />
                              </Button>
                            )
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CONTROLE DE ESTOQUE ANALÍTICO (Exclusivo Arena) */}
        {isArena && activeTab === 'inventory' && (
          <div className="space-y-6 animate-fade-in">
            {/* 1. Header Cards Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                title="Valor Estimado do Estoque"
                value={formatCurrency(stockStats.totalValue)}
                icon={Coins}
                variant="success"
              />
              <StatCard
                title="Total de Unidades Físicas"
                value={`${stockStats.totalItems} un`}
                icon={Package}
              />
              <StatCard
                title="Itens Abaixo do Mínimo"
                value={`${stockStats.alertCount} item(ns)`}
                icon={AlertTriangle}
                variant={stockStats.alertCount > 0 ? "warning" : "default"}
              />
            </div>

            {/* 2. Analytical Filtering Controls */}
            <Card className="border-border/50 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  {/* Search box */}
                  <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar produto no estoque..."
                      value={stockSearchQuery}
                      onChange={(e) => setStockSearchQuery(e.target.value)}
                      className="pl-9 h-9 text-xs rounded-xl"
                    />
                  </div>

                  {/* Filter switches */}
                  <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                    <Button
                      variant={onlyAlertsFilter ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setOnlyAlertsFilter(!onlyAlertsFilter)}
                      className="h-9 text-xs rounded-xl font-bold flex items-center gap-2"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {onlyAlertsFilter ? "Mostrando Apenas Alertas" : "Filtrar por Estoque Baixo"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setStockSearchQuery(''); setOnlyAlertsFilter(false); }}
                      className="h-9 text-xs rounded-xl font-bold flex items-center justify-center w-9 p-0"
                      title="Resetar Filtros"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. High Density Stock Table */}
            {loadingProducts ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : filteredStockProducts.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-bold text-sm">Nenhum produto em estoque encontrado</p>
                  <p className="text-xs mt-1">Certifique-se de cadastrar produtos com "Controlar Estoque" ativo.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border/40 text-muted-foreground font-semibold">
                        <th className="p-4">Produto</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4 text-center">Qtd Atual</th>
                        <th className="p-4 text-center">Mínimo</th>
                        <th className="p-4 text-right">Valor Unitário</th>
                        <th className="p-4 text-right">Total Estocado</th>
                        <th className="p-4 text-center">Status</th>
                        {canManageStock && <th className="p-4 text-center">Ajuste Rápido</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredStockProducts.map((p) => {
                        const isLow = p.stockQuantity <= p.minStock;
                        const isZero = p.stockQuantity === 0;
                        const stockValue = p.stockQuantity * p.price;

                        return (
                          <tr key={p.id} className="hover:bg-muted/10 transition-all">
                            <td className="p-4 font-bold text-foreground">{p.name}</td>
                            <td className="p-4 text-muted-foreground">{p.category}</td>
                            <td className="p-4 text-center font-extrabold">{p.stockQuantity} un</td>
                            <td className="p-4 text-center text-muted-foreground">{p.minStock} un</td>
                            <td className="p-4 text-right font-medium">{formatCurrency(p.price)}</td>
                            <td className="p-4 text-right font-bold text-foreground">{formatCurrency(stockValue)}</td>
                            <td className="p-4 text-center">
                              {isZero ? (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-destructive/10 text-destructive border border-destructive/20 uppercase">
                                  Zerarado
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase animate-pulse">
                                  Baixo
                                </span>
                              ) : (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-success/15 text-success border border-success/20 uppercase">
                                  Ok
                                </span>
                              )}
                            </td>
                            {canManageStock && (
                              <td className="p-4">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => updateProduct({ id: p.id, stockQuantity: Math.max(0, p.stockQuantity - 1) })}
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                    title="Subtrair 1"
                                  >
                                    <MinusCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => updateProduct({ id: p.id, stockQuantity: p.stockQuantity + 1 })}
                                    className="h-7 w-7 text-muted-foreground hover:text-success hover:bg-success/10 rounded-lg"
                                    title="Adicionar 1"
                                  >
                                    <PlusCircle className="h-4 w-4" />
                                  </Button>
                                  {canUpdateProducts && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEdit(p)}
                                      className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                                      title="Editar Produto"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
