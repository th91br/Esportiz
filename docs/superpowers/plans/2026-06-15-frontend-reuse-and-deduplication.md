# Frontend Reuse and Deduplication Implementation Plan

> **For Thiago:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Reduzir duplicacao e redundancias no frontend do Esportiz, consolidando apenas padroes comprovadamente repetidos, sem alterar regras de negocio, permissoes, rotas ou comportamento funcional.

**Architecture:** A limpeza sera incremental. Primeiro removemos codigo morto comprovado, depois criamos primitivas pequenas para estrutura de pagina e estados de interface, migramos paginas em lotes curtos e, por fim, centralizamos utilitarios e variantes semanticas. Cada lote preserva a composicao atual e passa por testes, typecheck, lint, build e verificacao visual responsiva antes do proximo.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Radix UI, class-variance-authority, Vitest, Testing Library.

---

## Escopo E Guardrails

Incluido:

- Remocao de codigo comprovadamente sem consumidores.
- Extracao de estrutura de pagina usada com a mesma intencao em tres ou mais telas.
- Extracao de estados reutilizaveis de carregamento e vazio.
- Centralizacao de datas locais e nomes de meses em portugues.
- Consolidacao limitada de badges semanticos recorrentes.
- Migracao em lotes pequenos com paridade visual e funcional.

Fora do escopo:

- Alterar `PRODUCT.md` ou `DESIGN.md`.
- Alterar hooks de dados, React Query, Supabase, RLS, permissoes ou regras financeiras.
- Criar um componente CRUD generico para formularios de Produtos e Despesas.
- Extrair o painel "Agenda de Hoje" enquanto houver apenas dois consumidores.
- Reestruturar de uma vez arquivos grandes como `SettingsPage.tsx`, `StudentPortalPage.tsx` e `ReportsPage.tsx`.
- Limpar os HTMLs legados em `public/`; eles exigem uma fase separada.
- Trocar Inter ou Montserrat: sao fontes deliberadamente definidas no design system atual.
- Remover primitivas shadcn/Radix apenas por parecerem nao utilizadas.

## Criterios De Seguranca

- O comportamento observado antes da mudanca deve continuar igual depois dela.
- Cada nova abstracao deve ter pelo menos tres usos com a mesma intencao.
- Nenhuma abstracao deve receber props ligadas a regras de negocio.
- Cada lote deve terminar com testes direcionados e `npm run check:regression`.
- Se um lote falhar visualmente ou funcionalmente, ele nao avanca para o proximo.
- Commits devem permanecer pequenos e reversiveis, um por tarefa concluida.

### Task 1: Congelar A Linha De Base

**Files:**

- Modify: `src/App.routeSmoke.test.tsx`
- Verify: `src/uiPolishContracts.test.ts`
- Verify: `src/designTokens.test.ts`

**Step 1: Executar a regressao completa antes de editar**

Run:

```bash
npm run check:regression
```

Expected: lint, typecheck, Vitest e build terminam com exit code 0.

**Step 2: Registrar verificacoes visuais de referencia**

No navegador local, verificar em desktop e mobile:

- `/dashboard`
- `/produtos`
- `/despesas`
- `/vendas`
- `/pagamentos`

Confirmar:

- Header e navegacao presentes.
- Titulos, descricoes e acoes mantem hierarquia.
- Dialogs abrem e fecham.
- Tabelas, cards e estados vazios nao transbordam horizontalmente.
- Nenhuma rota cai no `AppErrorBoundary`.

**Step 3: Ampliar o smoke test para as rotas piloto**

Adicionar mocks e casos para:

```tsx
["/produtos", "route-products"],
["/despesas", "route-expenses"],
["/vendas", "route-sales"],
```

**Step 4: Executar o teste e confirmar que passa**

Run:

```bash
npm test -- src/App.routeSmoke.test.tsx
```

Expected: todas as rotas criticas e piloto renderizam sem o fallback de erro.

**Step 5: Commit**

```bash
git add src/App.routeSmoke.test.tsx
git commit -m "test: expand frontend route smoke coverage"
```

### Task 2: Remover Codigo Morto Comprovado

**Files:**

- Modify: `src/App.tsx`
- Delete: `src/contexts/AppContext.tsx`
- Delete: `src/contexts/app.ts`
- Modify: `src/pages/ExpensesPage.tsx`
- Modify: `src/components/ArenaTodaySchedule.tsx`

**Step 1: Confirmar consumidores antes da remocao**

Run:

```bash
rg -n "AppProvider|useApp|DEFAULT_EXPENSE_CATEGORIES|periodIcons|PeriodIcon" src
```

Expected:

- `AppProvider` aparece apenas em `App.tsx` e em sua propria definicao.
- `useApp` aparece apenas em sua propria definicao.
- `DEFAULT_EXPENSE_CATEGORIES` nao possui leitura.
- Os icones de periodo em `ArenaTodaySchedule.tsx` sao calculados, mas nao renderizados.

**Step 2: Remover o provider pass-through**

Em `src/App.tsx`:

- Remover o import de `AppProvider`.
- Remover somente o wrapper `<AppProvider>`.
- Preservar a ordem de `Toaster`, `Sonner`, `PWABadge`, `AppErrorBoundary`, `BrowserRouter` e `Analytics`.

**Step 3: Apagar os modulos legados**

Excluir:

```text
src/contexts/AppContext.tsx
src/contexts/app.ts
```

**Step 4: Remover constantes e imports sem uso**

- Remover `DEFAULT_EXPENSE_CATEGORIES` de `ExpensesPage.tsx`.
- Remover `periodIcons`, `timePeriod`, `PeriodIcon` e imports Lucide sem uso de `ArenaTodaySchedule.tsx`.
- Nao alterar filtragem, ordenacao, valores ou status das reservas.

**Step 5: Verificar**

Run:

```bash
rg -n "AppProvider|useApp|DEFAULT_EXPENSE_CATEGORIES|periodIcons|PeriodIcon" src
npm test -- src/App.routeSmoke.test.tsx
npm run typecheck
npm run lint
```

Expected: a busca nao encontra os simbolos removidos e todos os comandos passam.

**Step 6: Commit**

```bash
git add src/App.tsx src/contexts/AppContext.tsx src/contexts/app.ts src/pages/ExpensesPage.tsx src/components/ArenaTodaySchedule.tsx
git commit -m "refactor: remove obsolete frontend context code"
```

### Task 3: Extrair Estrutura Reutilizavel De Pagina

**Files:**

- Create: `src/components/layout/AppPage.tsx`
- Create: `src/components/layout/AppPage.test.tsx`
- Create: `src/components/layout/PageHeader.tsx`
- Create: `src/components/layout/PageHeader.test.tsx`
- Modify pilot: `src/pages/ProductsPage.tsx`
- Modify pilot: `src/pages/ExpensesPage.tsx`
- Modify pilot: `src/pages/SalesPage.tsx`
- Modify batch 2: `src/pages/StudentsPage.tsx`
- Modify batch 2: `src/pages/PlansPage.tsx`
- Modify batch 2: `src/pages/ModalitiesPage.tsx`
- Modify batch 3: `src/pages/GroupsPage.tsx`
- Modify batch 3: `src/pages/CommunicationPage.tsx`
- Modify batch 3: `src/pages/CourtsPage.tsx`

**Step 1: Escrever testes que falham para `AppPage`**

Cobrir:

- Renderiza `Header`.
- Renderiza os filhos dentro de `<main>`.
- Aplica a base `min-h-screen bg-background`.
- Aceita `contentClassName` para `max-w-4xl`, `max-w-5xl` ou `max-w-6xl`.
- Mescla classes com `cn` sem substituir a base responsiva.

**Step 2: Implementar a menor API necessaria**

API proposta:

```tsx
interface AppPageProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}
```

Estrutura:

```tsx
<div className={cn("min-h-screen bg-background", className)}>
  <Header />
  <main className={cn("container py-6 md:py-8 space-y-6", contentClassName)}>
    {children}
  </main>
</div>
```

Nao incluir logica de rota, permissao, dados ou loading.

**Step 3: Escrever testes que falham para `PageHeader`**

Cobrir:

- Titulo acessivel como `h1`.
- Icone opcional marcado como decorativo.
- Descricao opcional.
- Area de acoes opcional.
- Acoes ocupam largura total no mobile e largura automatica a partir de `sm`.

**Step 4: Implementar a menor API necessaria**

API proposta:

```tsx
interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}
```

Preservar as classes atuais:

```text
flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4
text-3xl font-display font-bold
text-muted-foreground mt-1
```

**Step 5: Executar os testes dos componentes**

Run:

```bash
npm test -- src/components/layout/AppPage.test.tsx src/components/layout/PageHeader.test.tsx
```

Expected: testes passam sem snapshots frageis.

**Step 6: Migrar o lote piloto**

Migrar apenas o shell e o cabecalho em:

- `ProductsPage.tsx`
- `ExpensesPage.tsx`
- `SalesPage.tsx`

Preservar integralmente:

- Dialogs e seus estados.
- Checagens `canCreate`, `canUpdate` e `canDelete`.
- Larguras maximas atuais.
- Ordem dos elementos abaixo do cabecalho.
- Textos condicionais de arena e escola.

**Step 7: Verificar o lote piloto**

Run:

```bash
npm test -- src/components/layout/AppPage.test.tsx src/components/layout/PageHeader.test.tsx src/App.routeSmoke.test.tsx
npm run typecheck
npm run lint
npm run build
```

Depois, verificar as tres rotas em 1440 px e 390 px.

**Step 8: Migrar os lotes secundarios**

Lote 2:

- `StudentsPage.tsx`
- `PlansPage.tsx`
- `ModalitiesPage.tsx`

Lote 3:

- `GroupsPage.tsx`
- `CommunicationPage.tsx`
- `CourtsPage.tsx`

Executar `npm run check:regression` e verificacao responsiva depois de cada lote.

Nao migrar nesta tarefa paginas com impressao, animacao de entrada, padding especial ou composicao muito especifica.

**Step 9: Commit por lote**

```bash
git add src/components/layout src/pages/ProductsPage.tsx src/pages/ExpensesPage.tsx src/pages/SalesPage.tsx
git commit -m "refactor: extract shared application page layout"
```

Criar commits separados para os lotes 2 e 3.

### Task 4: Extrair Estados De Carregamento E Vazio

**Files:**

- Create: `src/components/ui/loading-state.tsx`
- Create: `src/components/ui/loading-state.test.tsx`
- Create: `src/components/ui/empty-state.tsx`
- Create: `src/components/ui/empty-state.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/ProductsPage.tsx`
- Modify: `src/pages/ExpensesPage.tsx`
- Modify: `src/pages/SalesPage.tsx`
- Modify: `src/pages/StudentPortalPage.tsx`
- Modify selectively: `src/pages/StudentsPage.tsx`
- Modify selectively: `src/pages/PlansPage.tsx`
- Modify selectively: `src/pages/GroupsPage.tsx`
- Modify selectively: `src/pages/CourtsPage.tsx`

**Step 1: Escrever testes que falham para `LoadingState`**

Cobrir:

- `role="status"`.
- Nome acessivel configuravel, como "Carregando produtos".
- Indicador visual decorativo.
- `className` para controlar o espaco do consumidor.
- Respeito a `prefers-reduced-motion` ja garantido pelo CSS global.

API proposta:

```tsx
interface LoadingStateProps {
  label?: string;
  className?: string;
}
```

Manter o anel visual atual para evitar mudanca perceptivel:

```text
h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin
```

**Step 2: Escrever testes que falham para `EmptyState`**

Cobrir:

- Icone opcional.
- Titulo obrigatorio.
- Descricao e acao opcionais.
- Variantes `plain` e `outlined`.
- Sem impor `Card`, para o consumidor continuar controlando sua superficie.

API proposta:

```tsx
interface EmptyStateProps {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "plain" | "outlined";
  className?: string;
}
```

**Step 3: Implementar e testar**

Run:

```bash
npm test -- src/components/ui/loading-state.test.tsx src/components/ui/empty-state.test.tsx
```

Expected: acessibilidade e composicao passam.

**Step 4: Migrar somente os spinners identicos**

Substituir a classe repetida em:

- `App.tsx`
- `ProductsPage.tsx`
- `ExpensesPage.tsx`
- `SalesPage.tsx`
- `StudentPortalPage.tsx`

Cada uso deve fornecer um rotulo contextual. Nao substituir Skeletons, pois comunicam uma intencao diferente.

**Step 5: Migrar somente estados vazios de secao completa**

Primeiro migrar:

- Catalogo e estoque em `ProductsPage.tsx`.
- Lista mensal em `ExpensesPage.tsx`.
- Produtos e vendas filtradas em `SalesPage.tsx`.

Depois migrar estados equivalentes em Students, Plans, Groups e Courts.

Nao migrar:

- Mensagens pequenas dentro de selects.
- Linhas vazias de tabela.
- Alertas de permissao.
- Estados de erro.
- O painel "Agenda de Hoje".

**Step 6: Verificar**

Run:

```bash
rg -n "h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" src
npm run check:regression
```

Expected: a classe do spinner existe apenas dentro de `loading-state.tsx`; toda a regressao passa.

**Step 7: Commit**

```bash
git add src/components/ui/loading-state.tsx src/components/ui/loading-state.test.tsx src/components/ui/empty-state.tsx src/components/ui/empty-state.test.tsx src/App.tsx src/pages
git commit -m "refactor: standardize frontend loading and empty states"
```

Antes do commit, revisar `git diff --stat` para garantir que apenas os consumidores aprovados entraram.

### Task 5: Centralizar Datas Locais E Nomes De Mes

**Files:**

- Modify: `src/lib/dateUtils.ts`
- Modify: `src/lib/dateUtils.test.ts`
- Modify: `src/data/mockData.ts`
- Modify: `src/components/TodaySchedule.tsx`
- Modify: `src/components/ArenaTodaySchedule.tsx`
- Modify: `src/pages/ExpensesPage.tsx`
- Modify: `src/pages/PaymentsPage.tsx`
- Modify: `src/pages/ReportsPage.tsx`

**Step 1: Escrever testes que falham**

Adicionar cobertura para:

```ts
getMonthNamePtBr(0) === "Janeiro"
getMonthNamePtBr(11) === "Dezembro"
getMonthNamePtBr(-1) === ""
getMonthNamePtBr(12) === ""
```

Manter os testes existentes que protegem datas locais em UTC-3.

**Step 2: Implementar o helper canonico**

Em `dateUtils.ts`:

```ts
const MONTH_NAMES_PT_BR = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export function getMonthNamePtBr(monthIndex: number): string {
  return MONTH_NAMES_PT_BR[monthIndex] ?? "";
}
```

Na implementacao real, preservar a grafia portuguesa correta em UTF-8.

**Step 3: Preservar compatibilidade em `mockData.ts`**

Fazer `getMonthName` delegar para `getMonthNamePtBr`, evitando uma migracao ampla e arriscada dos consumidores atuais de calendario.

**Step 4: Remover montagens de data duplicadas**

- `TodaySchedule.tsx`: usar `getLocalTodayDate()`.
- `ArenaTodaySchedule.tsx`: usar `getLocalTodayDate()`.
- `ReportsPage.tsx`: substituir `formatLocalDate` por `toLocalDateString`.

Nao usar `toISOString()` para datas civis locais.

**Step 5: Remover arrays locais de meses**

- `ExpensesPage.tsx`: usar `getMonthNamePtBr(currentDate.getMonth())`.
- `PaymentsPage.tsx`: usar `getMonthNamePtBr(selectedMonth - 1)`.

**Step 6: Verificar**

Run:

```bash
npm test -- src/lib/dateUtils.test.ts
npm run typecheck
npm run lint
npm run build
```

Verificar manualmente junho/dezembro e navegacao entre anos em Despesas e Pagamentos.

**Step 7: Commit**

```bash
git add src/lib/dateUtils.ts src/lib/dateUtils.test.ts src/data/mockData.ts src/components/TodaySchedule.tsx src/components/ArenaTodaySchedule.tsx src/pages/ExpensesPage.tsx src/pages/PaymentsPage.tsx src/pages/ReportsPage.tsx
git commit -m "refactor: centralize local date display helpers"
```

### Task 6: Consolidar Variantes Semanticas De Status

**Files:**

- Modify: `src/components/ui/badge.tsx`
- Create: `src/components/ui/badge.test.tsx`
- Modify selectively: `src/pages/ProductsPage.tsx`
- Modify selectively: `src/pages/PaymentsPage.tsx`

**Step 1: Escrever testes que falham**

Adicionar variantes:

- `success`
- `warning`
- Reutilizar `destructive` para atraso ou falha.
- Manter `default`, `secondary` e `outline` sem mudancas.

Testar que as variantes usam tokens semanticos e continuam aceitando `className`.

**Step 2: Implementar variantes no CVA**

Exemplo de intencao:

```ts
success: "border-success/20 bg-success/10 text-success",
warning: "border-warning/30 bg-warning/15 text-warning-foreground",
```

Validar contraste nos temas claro e escuro antes de migrar consumidores.

**Step 3: Migrar apenas pills de status equivalentes**

Produtos:

- Estoque baixo -> `warning`.
- Sem estoque -> `destructive`.

Pagamentos:

- Pago -> `success`.
- Pendente/parcial -> `warning`.
- Atrasado -> `destructive`.

Nao converter cores de graficos, cards financeiros, icones de categoria ou destaques de arena; eles possuem outra intencao visual.

**Step 4: Verificar contratos de contraste**

Run:

```bash
npm test -- src/components/ui/badge.test.tsx src/designTokens.test.ts src/uiPolishContracts.test.ts
npm run check:regression
```

Expected: sem regressao de contraste, status continuam distinguiveis por texto e nao apenas por cor.

**Step 5: Commit**

```bash
git add src/components/ui/badge.tsx src/components/ui/badge.test.tsx src/pages/ProductsPage.tsx src/pages/PaymentsPage.tsx
git commit -m "refactor: use semantic badge variants for statuses"
```

### Task 7: Auditoria Final E Aceite Visual

**Files:**

- Verify: all files changed by Tasks 1-6
- Do not modify: `PRODUCT.md`
- Do not modify: `DESIGN.md`
- Do not modify: `public/**`

**Step 1: Executar a regressao completa**

Run:

```bash
npm run check:regression
```

Expected: exit code 0.

**Step 2: Executar buscas de redundancia**

Run:

```bash
rg -n "AppProvider|useApp|DEFAULT_EXPENSE_CATEGORIES" src
rg -n "h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" src
rg -n "const monthNames|const getMonthName" src/pages src/components
```

Expected:

- Nenhum simbolo legado.
- Spinner bruto apenas no componente compartilhado.
- Nenhum array local de nomes completos de meses nos consumidores migrados.

**Step 3: Verificar diff e escopo**

Run:

```bash
git diff --check
git status --short
git diff -- PRODUCT.md DESIGN.md public
```

Expected:

- Sem erros de whitespace.
- Nenhuma alteracao nos documentos ou HTMLs legados.
- Nenhum arquivo de dados ou seguranca alterado incidentalmente.

**Step 4: Verificar no navegador**

Desktop: 1440 x 900.

Mobile: 390 x 844.

Rotas:

- `/dashboard`
- `/produtos`
- `/despesas`
- `/vendas`
- `/pagamentos`
- `/alunos` ou `/reservantes`, conforme o tipo de negocio
- `/planos`
- `/turmas`
- `/quadras`

Checklist:

- Sem tela branca ou fallback de importacao dinamica.
- Header e conteudo mantem alinhamento.
- Acoes principais continuam visiveis e clicaveis.
- Dialogs preservam foco, cancelamento e submissao.
- Loading possui nome acessivel.
- Empty states nao alteram permissoes nem exibem CTA indevido.
- Status possuem texto, contraste e significado preservados.
- Nenhum scroll horizontal em 390 px.

**Step 5: Revisar o tamanho da abstracao**

Rejeitar ou simplificar qualquer componente que:

- Tenha props especificas de Produtos, Despesas ou Pagamentos.
- Exija muitos booleanos para reproduzir telas diferentes.
- Seja usado por menos de tres consumidores.
- Oculte logica de permissao ou de dominio.

**Step 6: Commit final de correcoes de verificacao, se necessario**

Somente correcoes diretamente relacionadas ao plano devem entrar. Refactors novos devem virar uma fase separada.

## Resultado Esperado

Ao final:

- O shell e o cabecalho das paginas simples terao uma fonte unica.
- Carregamentos e estados vazios terao acessibilidade e aparencia consistentes.
- Datas locais e meses nao serao reconstruidos em varios arquivos.
- Status recorrentes consumirao tokens semanticos do Esportiz.
- Codigo morto sera removido sem afetar rotas ou dados.
- Paginas complexas permanecerao estaveis e poderao ser decompostas em fases futuras, com risco controlado.

