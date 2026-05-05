import { useState, useMemo } from 'react';
import { Header } from '@/components/Header';
import { useProducts } from '@/hooks/queries/useProducts';
import { useSales, getPaymentMethodLabel, type PaymentMethod } from '@/hooks/queries/useSales';
import { Button } from '@/components/ui/button';
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
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

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

export default function SalesPage() {
  const { activeProducts, loadingProducts } = useProducts();
  const { sales, loadingSales, addSale, deleteSale, isAddingSale } = useSales();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');

  // Today's sales
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySales = useMemo(() => {
    return sales.filter(s => s.soldAt.startsWith(todayStr));
  }, [sales, todayStr]);
  const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

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
      for (const item of cart) {
        await addSale({
          productId: item.productId,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          paymentMethod,
        });
      }
      clearCart();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6 md:py-8 space-y-6 max-w-6xl">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold flex items-center gap-2">
              <ShoppingCart className="h-7 w-7 text-primary" />
              Vendas
            </h1>
            <p className="text-muted-foreground mt-1">Registre vendas rápidas de produtos.</p>
          </div>
          <Link to="/produtos">
            <Button variant="outline" size="sm">
              <Package className="mr-2 h-4 w-4" />
              Gerenciar Produtos
            </Button>
          </Link>
        </div>

        {/* Today Summary */}
        <Card className="border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Vendas de Hoje</p>
                <p className="text-3xl font-bold font-display text-primary">{formatCurrency(todayTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{todaySales.length} venda(s)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Products Grid — Left side */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selecione os Produtos</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingProducts ? (
                  <div className="flex justify-center py-12">
                    <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : activeProducts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Nenhum produto cadastrado</p>
                    <p className="text-sm mt-1">
                      <Link to="/produtos" className="text-primary underline">Cadastre seus produtos</Link> para começar a vender.
                    </p>
                  </div>
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrinho
                  {cart.length > 0 && (
                    <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                      {cart.reduce((s, i) => s + i.quantity, 0)}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Toque em um produto para adicionar
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
                        disabled={isAddingSale}
                      >
                        {isAddingSale ? 'Registrando...' : 'Finalizar Venda'}
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

        {/* Today's Sales History */}
        {todaySales.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Vendas de Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {todaySales.map(sale => (
                  <div key={sale.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{sale.productName} {sale.quantity > 1 ? `(x${sale.quantity})` : ''}</p>
                      <p className="text-xs text-muted-foreground">
                        {getPaymentMethodLabel(sale.paymentMethod)} • {new Date(sale.soldAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="font-bold text-sm text-primary">{formatCurrency(sale.total)}</span>
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
                            A venda de "{sale.productName}" será removida permanentemente.
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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
