import { reportError } from '@/lib/observability';
import { useState, useMemo } from 'react';
import { AppPage } from '@/components/layout/AppPage';
import { IconCardTitle } from '@/components/layout/IconCardTitle';
import { PageHeader } from '@/components/layout/PageHeader';
import { useProducts } from '@/hooks/queries/useProducts';
import { useSales, getPaymentMethodLabel, type PaymentMethod, type Sale } from '@/hooks/queries/useSales';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatCurrency';
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  CreditCard,
  Banknote,
  Smartphone,
  Clock,
  Search,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'pix', label: 'PIX', icon: Smartphone },
  { value: 'cartao_debito', label: 'Débito', icon: CreditCard },
  { value: 'cartao_credito', label: 'Crédito', icon: CreditCard },
];

type SalesHistoryPeriod = 'today' | 'week' | 'month' | 'all';
type SalesOriginFilter = 'all' | 'direct' | 'comanda';

const HISTORY_PERIOD_LABELS: Record<SalesHistoryPeriod, string> = {
  today: 'Hoje',
  week: 'Semana',
  month: 'Mês',
  all: 'Todos',
};

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getHistoryRange(period: SalesHistoryPeriod) {
  if (period === 'all') return null;

  const now = new Date();
  let start = new Date(now);
  const end = new Date(now);

  if (period === 'week') {
    const dow = start.getDay();
    start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));
  }

  if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return {
    start: getLocalDateString(start),
    end: getLocalDateString(end),
  };
}

function getSaleTransactionKey(sale: Sale) {
  if (sale.comandaId) return `comanda:${sale.comandaId}`;
  if (sale.checkoutId) return `checkout:${sale.checkoutId}`;
  return `sale:${sale.id}`;
}

export default function SalesPage() {
  const { activeProducts, loadingProducts } = useProducts();
  const { sales, loadingSales, checkoutCartSale, deleteSale, isCheckingOutCart } = useSales();
  const { isArena } = useBusinessContext();
  const rolePermissions = useRolePermissions();
  const canCreateSales = rolePermissions.can('sales', 'create');
  const canDeleteSales = rolePermissions.can('sales', 'delete');
  const canViewProducts = rolePermissions.can('products', 'view');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [historyPeriod, setHistoryPeriod] = useState<SalesHistoryPeriod>('today');
  const [historyPaymentMethod, setHistoryPaymentMethod] = useState<PaymentMethod | 'all'>('all');
  const [historyOrigin, setHistoryOrigin] = useState<SalesOriginFilter>('all');
  const [historySearch, setHistorySearch] = useState('');

  // Today's sales (Sincronia com data local)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todaySales = useMemo(() => {
    return sales.filter(s => s.soldAt.startsWith(todayStr));
  }, [sales, todayStr]);
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
  const todayTransactionCount = new Set(todaySales.map(getSaleTransactionKey)).size;

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const historyRange = useMemo(() => getHistoryRange(historyPeriod), [historyPeriod]);
  const filteredHistorySales = useMemo(() => {
    const term = historySearch.trim().toLowerCase();

    return sales.filter((sale) => {
      const soldDate = sale.soldAt.slice(0, 10);
      const inRange = !historyRange || (soldDate >= historyRange.start && soldDate <= historyRange.end);
      const matchesPayment = historyPaymentMethod === 'all' || sale.paymentMethod === historyPaymentMethod;
      const matchesOrigin = historyOrigin === 'all'
        || (historyOrigin === 'comanda' ? Boolean(sale.comandaId) : !sale.comandaId);
      const originLabel = sale.comandaId ? 'comanda' : 'venda direta';
      const matchesSearch = !term
        || sale.productName.toLowerCase().includes(term)
        || getPaymentMethodLabel(sale.paymentMethod).toLowerCase().includes(term)
        || originLabel.includes(term);

      return inRange && matchesPayment && matchesOrigin && matchesSearch;
    });
  }, [historyOrigin, historyPaymentMethod, historyRange, historySearch, sales]);
  const historyTotal = filteredHistorySales.reduce((sum, sale) => sum + sale.total, 0);
  const historyTransactionCount = new Set(filteredHistorySales.map(getSaleTransactionKey)).size;

  const addToCart = (product: typeof activeProducts[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => item.productId === productId ? { ...item, quantity: item.quantity + delta } : item)
        .filter(item => item.quantity > 0);
    });
  };

  const clearCart = () => setCart([]);

  const handleFinalizeSale = async () => {
    if (cart.length === 0) { toast.error('Adicione produtos ao carrinho.'); return; }

    try {
      await checkoutCartSale({
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod,
      });
      clearCart();
    } catch (error) {
      reportError('sales.checkout_failed', error);
    }
  };

  return (
    <AppPage contentClassName="max-w-6xl">
      <PageHeader
        title="Vendas"
        icon={ShoppingCart}
        description={isArena ? 'Registre vendas rápidas de produtos da cantina ou arena.' : 'Registre a venda de uniformes, materiais e acessórios esportivos.'}
        actions={canViewProducts && (
            <Link to="/produtos">
              <Button variant="outline" size="sm">
                <Package className="mr-2 h-4 w-4" />
                Gerenciar Produtos
              </Button>
            </Link>
        )}
      />

        {/* Today Summary */}
        <Card className="border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Vendas de Hoje</p>
                <p className="text-3xl font-bold font-display text-primary">{formatCurrency(todayTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{todayTransactionCount} atendimento(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {canCreateSales ? (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Products Grid — Left side */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-display">
                  {isArena ? 'Selecione os Produtos' : 'Uniformes e Materiais Esportivos'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingProducts ? (
                  <LoadingState label="Carregando produtos para venda" className="py-12" />
                ) : activeProducts.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Nenhum produto cadastrado"
                    description={(
                      <>
                        <Link to="/produtos" className="text-primary underline">Cadastre seus produtos</Link> para começar a vender.
                      </>
                    )}
                    className="py-12"
                  />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {activeProducts.map(product => {
                      const inCart = cart.find(i => i.productId === product.id);
                      return (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className={cn(
                            'relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all text-center min-h-[100px]',
                            'hover:border-primary/40 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]',
                            inCart ? 'border-primary bg-primary/5 shadow-sm' : 'border-border'
                          )}
                        >
                          {inCart && (
                            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center shadow-md">
                              {inCart.quantity}
                            </span>
                          )}
                          <p className="font-bold text-sm">{product.name}</p>
                          <p className="text-primary font-bold text-lg mt-1">{formatCurrency(product.price)}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">{product.category}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cart — Right side */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader>
                <IconCardTitle icon={ShoppingCart} iconClassName="text-foreground">
                  Carrinho
                  {cart.length > 0 && (
                    <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </IconCardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {isArena ? 'Toque em um produto para adicionar' : 'Toque em um item para adicionar ao carrinho'}
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {cart.map(item => (
                        <div key={item.productId} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} un.</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateCartQuantity(item.productId, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6 rounded-full" onClick={() => updateCartQuantity(item.productId, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-sm font-bold shrink-0 w-16 text-right">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Forma de Pagamento</p>
                      <div className="grid grid-cols-2 gap-2">
                        {PAYMENT_METHODS.map(method => {
                          const Icon = method.icon;
                          return (
                            <button
                              key={method.value}
                              onClick={() => setPaymentMethod(method.value)}
                              className={cn(
                                'flex items-center gap-2 p-2 rounded-lg border text-xs font-medium transition-all',
                                paymentMethod === method.value
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border hover:border-primary/40'
                              )}
                            >
                              <Icon className="h-3.5 w-3.5" />
                              {method.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Total and Actions */}
                    <div className="pt-3 border-t space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-lg">Total</span>
                        <span className="font-bold text-2xl text-primary">{formatCurrency(cartTotal)}</span>
                      </div>
                      <Button
                        className="w-full h-12 text-base btn-primary-gradient"
                        onClick={handleFinalizeSale}
                        disabled={isCheckingOutCart}
                      >
                        {isCheckingOutCart ? 'Registrando...' : 'Finalizar Venda'}
                      </Button>
                      <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={clearCart}>
                        Limpar carrinho
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        ) : (
          <Card className="border-dashed border-border/70 bg-muted/10">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Seu cargo permite consultar o histórico de vendas, mas não registrar novas vendas diretas.
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <IconCardTitle icon={Clock} iconClassName="text-muted-foreground">
                  Histórico de Vendas
                </IconCardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {historyTransactionCount} atendimento(s) • {filteredHistorySales.length} item(ns) • {formatCurrency(historyTotal)}
                </p>
              </div>
            </div>

            <div className={cn(
              "grid gap-2",
              isArena ? "md:grid-cols-[1.5fr_1fr_1fr_1fr]" : "md:grid-cols-[2fr_1fr_1fr]"
            )}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={historySearch}
                  onChange={(event) => setHistorySearch(event.target.value)}
                  placeholder={isArena ? "Buscar produto, origem ou pagamento..." : "Buscar produto ou pagamento..."}
                  className="pl-9"
                />
              </div>

              <Select value={historyPeriod} onValueChange={(value) => setHistoryPeriod(value as SalesHistoryPeriod)}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(HISTORY_PERIOD_LABELS) as SalesHistoryPeriod[]).map((period) => (
                    <SelectItem key={period} value={period}>{HISTORY_PERIOD_LABELS[period]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={historyPaymentMethod} onValueChange={(value) => setHistoryPaymentMethod(value as PaymentMethod | 'all')}>
                <SelectTrigger>
                  <SelectValue placeholder="Pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos pagamentos</SelectItem>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isArena && (
                <Select value={historyOrigin} onValueChange={(value) => setHistoryOrigin(value as SalesOriginFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas origens</SelectItem>
                    <SelectItem value="direct">Venda direta</SelectItem>
                    <SelectItem value="comanda">Comandas</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {loadingSales ? (
              <LoadingState label="Carregando histórico de vendas" className="py-10" />
            ) : filteredHistorySales.length === 0 ? (
              <EmptyState
                title="Nenhuma venda encontrada para os filtros selecionados."
                variant="outlined"
                className="p-8"
              />
            ) : (
              <div className="space-y-2">
                {filteredHistorySales.map(sale => {
                  const isComandaSale = Boolean(sale.comandaId);
                  const originLabel = isComandaSale ? 'Comanda' : 'Venda direta';

                  return (
                    <div key={sale.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/5">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{sale.productName} {sale.quantity > 1 ? `(x${sale.quantity})` : ''}</p>
                          {isArena && (
                            <span className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                              isComandaSale ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
                            )}>
                              {originLabel}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {getPaymentMethodLabel(sale.paymentMethod)} • {new Date(sale.soldAt).toLocaleDateString('pt-BR')} às {new Date(sale.soldAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          {sale.checkoutId && !isComandaSale ? ` • Checkout ${sale.checkoutId.slice(0, 8)}` : ''}
                        </p>
                      </div>
                      <span className="font-bold text-sm text-primary">{formatCurrency(sale.total)}</span>
                      {isComandaSale ? (
                        <span className="text-[10px] font-semibold text-muted-foreground text-right max-w-[90px]">
                          Estorne pela comanda
                        </span>
                      ) : canDeleteSales ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancelar esta venda?</AlertDialogTitle>
                              <AlertDialogDescription>
                                A venda de "{sale.productName}" será removida e o estoque será restaurado quando aplicável.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Manter</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSale(sale.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Cancelar Venda
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <span className="text-[10px] font-semibold text-muted-foreground text-right max-w-[90px]">
                          Sem permissao para cancelar
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
    </AppPage>
  );
}
