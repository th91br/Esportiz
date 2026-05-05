import { useState } from 'react';
import { Header } from '@/components/Header';
import { useProducts } from '@/hooks/queries/useProducts';
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
import { Plus, Package, Pencil, Power, PowerOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRODUCT_CATEGORIES = ['Bebidas', 'Alimentação', 'Material Esportivo', 'Acessórios', 'Geral'];

export default function ProductsPage() {
  const { products, loadingProducts, addProduct, updateProduct, deleteProduct, isAddingProduct } = useProducts();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState('Geral');

  const resetForm = () => {
    setFormName('');
    setFormPrice('');
    setFormCategory('Geral');
    setEditingId(null);
  };

  const openEdit = (p: typeof products[0]) => {
    setEditingId(p.id);
    setFormName(p.name);
    setFormPrice(String(p.price));
    setFormCategory(p.category);
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) { toast.error('Informe o nome do produto.'); return; }
    const price = parseFloat(formPrice);
    if (isNaN(price) || price <= 0) { toast.error('Informe um preço válido.'); return; }

    try {
      if (editingId) {
        await updateProduct({ id: editingId, name: formName, price, category: formCategory });
      } else {
        await addProduct({ name: formName, price, category: formCategory });
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
            <p className="text-muted-foreground mt-1">Cadastre os itens disponíveis para venda no seu negócio.</p>
          </div>

          <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="btn-primary-gradient w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
                <DialogDescription>
                  {editingId ? 'Atualize as informações do produto.' : 'Cadastre um novo item para venda.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input placeholder="Ex: Água Mineral 500ml" value={formName} onChange={e => setFormName(e.target.value)} autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço (R$) *</Label>
                    <Input type="number" step="0.01" min="0" placeholder="0,00" value={formPrice} onChange={e => setFormPrice(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
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
        </div>

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
              <p className="text-sm mt-1">Clique em "Novo Produto" para começar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayProducts.map(product => (
              <Card key={product.id} className={cn('transition-all hover:shadow-md', !product.active && 'opacity-50')}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.category}</p>
                    </div>
                    <span className="text-lg font-bold text-primary shrink-0 ml-2">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-4 pt-3 border-t">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => openEdit(product)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {product.active ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive hover:text-destructive" onClick={() => deleteProduct(product.id)} title="Desativar">
                        <PowerOff className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-green-600 hover:text-green-600" onClick={() => updateProduct({ id: product.id, active: true })} title="Reativar">
                        <Power className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
