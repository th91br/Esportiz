import { useState } from 'react';
import { Plus, Pencil, Trash2, Tag, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useModalities, Modality } from '@/hooks/queries/useModalities';
import { cn } from '@/lib/utils';
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

const PRESET_COLORS = [
  '#4285F4', // Google Blue
  '#EA4335', // Google Red
  '#FBBC05', // Google Yellow
  '#34A853', // Google Green
  '#8E44AD', // Purple
  '#F39C12', // Orange
  '#2C3E50', // Dark Blue
  '#16A085', // Teal
  '#D35400', // Pumpkin
  '#27AE60', // Emerald
];

export function ModalityManager() {
  const { modalities, addModality, updateModality, deleteModality, loadingModalities } = useModalities();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await addModality({ name: newName, color: newColor });
      setNewName('');
      setIsAdding(false);
    } catch (error) {}
  };

  const handleStartEdit = (modality: Modality) => {
    setEditingId(modality.id);
    setEditName(modality.name);
    setEditColor(modality.color);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateModality(id, { name: editName, color: editColor });
      setEditingId(null);
    } catch (error) {}
  };

  return (
    <Card className="border-primary/10 shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary/50 to-primary" />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg font-display">
            <Tag className="h-5 w-5 text-primary" />
            Modalidades Esportivas
          </CardTitle>
          <CardDescription>Gerencie as modalidades oferecidas pelo CT.</CardDescription>
        </div>
        {!isAdding && (
          <Button size="sm" className="h-8 gap-1" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4" /> Nova
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex gap-2">
              <Input
                placeholder="Nome da modalidade (ex: Futevôlei)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-1 items-center">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="w-10 h-10 p-1 rounded cursor-pointer border-none bg-transparent"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                    newColor === color ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleAdd}>Salvar Modalidade</Button>
            </div>
          </div>
        )}

        <div className="grid gap-2">
          {loadingModalities ? (
            <div className="py-4 text-center text-sm text-muted-foreground">Carregando modalidades...</div>
          ) : modalities.length === 0 && !isAdding ? (
            <div className="py-8 text-center border-2 border-dashed border-muted rounded-xl">
              <Tag className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma modalidade cadastrada.</p>
              <Button variant="link" size="sm" onClick={() => setIsAdding(true)}>Criar a primeira</Button>
            </div>
          ) : (
            modalities.map((modality) => (
              <div key={modality.id} className="group flex items-center justify-between p-2.5 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors">
                {editingId === modality.id ? (
                  <div className="flex-1 flex gap-2 animate-in fade-in">
                    <Input
                      size={1}
                      className="h-8 flex-1"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                    />
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-8 h-8 p-0 rounded cursor-pointer border-none bg-transparent"
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleUpdate(modality.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: modality.color }} />
                      <span className="text-sm font-medium">{modality.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartEdit(modality)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover modalidade?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Deseja remover a modalidade "{modality.name}"? Esta ação não poderá ser desfeita e só é permitida se não houver alunos ou treinos vinculados.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteModality(modality.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
