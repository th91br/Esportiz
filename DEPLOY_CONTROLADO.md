# Deploy Controlado e Rollback - Esportiz

Este guia define o processo profissional para publicar o Esportiz com evolucao controlada, validacao objetiva e plano de rollback. Ele complementa o roteiro de regressao em `REGRESSAO_PROFISSIONAL.md`.

## Principios

- Deploy nunca deve ser feito com validacao tecnica falhando.
- Dados reais nao devem ser usados para testes destrutivos.
- Migrations devem ser aplicadas com leitura cuidadosa, por blocos quando necessario.
- Mudancas de banco devem ser tratadas como operacao irreversivel ate que exista rollback SQL explicito.
- Frontend pode ser revertido rapidamente pela plataforma de hospedagem; banco exige plano proprio.
- A decisao de publicar precisa ter criterios de go/no-go claros.

## Antes de Publicar

1. Confirmar escopo:
   - quais fases entram neste deploy;
   - quais arquivos foram alterados;
   - se existe migration SQL pendente;
   - se existe mudanca em regras financeiras, agenda, reservas, estoque, portal publico ou autenticacao.

2. Confirmar ambiente:
   - Supabase correto;
   - projeto Vercel correto;
   - variaveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` corretas;
   - usuario de teste disponivel;
   - janela de deploy definida.

3. Rodar validacao tecnica:

```bash
npm run check:regression
```

4. Rodar validacao manual minima:
   - seguir `REGRESSAO_PROFISSIONAL.md`;
   - priorizar a modalidade alterada;
   - validar portais publicos quando houver alteracao de acesso, CPF, `ct`, login ou reset.

## Migrations SQL

Quando houver migration:

1. Ler o SQL completo antes de executar.
2. Conferir se cria ou altera:
   - tabelas;
   - colunas;
   - indices;
   - funcoes RPC;
   - triggers;
   - policies RLS;
   - views.
3. Executar em blocos quando houver `CREATE FUNCTION`, `DO $$`, triggers ou policies complexas.
4. No Supabase, se surgir alerta de RLS em tabela nova:
   - escolher `Run and enable RLS` quando a tabela for exposta ao schema publico;
   - conferir se a migration tambem cria policies adequadas;
   - se a tabela for somente interna/admin, ainda assim preferir RLS ativo e policy explicita.
5. Depois de executar:
   - confirmar que todas as funcoes foram criadas;
   - confirmar que policies existem;
   - testar somente com conta teste;
   - registrar no plano qual migration foi aplicada.

## Sequencia de Deploy

1. Garantir que `npm run check:regression` passou.
2. Garantir que o roteiro manual minimo passou.
3. Confirmar que nao ha dados teste ativos por engano.
4. Aplicar migrations, se existirem.
5. Rodar smoke test local:
   - `/dashboard`;
   - `/agenda` ou `/calendario`, conforme modalidade;
   - `/pagamentos`;
   - `/relatorios`;
   - `/portal-aluno`;
   - `/agendar`;
   - `/matricula`.
6. Publicar frontend pela plataforma de hospedagem.
7. Rodar smoke test em producao, somente leitura:
   - login;
   - dashboard;
   - tela financeira;
   - tela operacional principal;
   - portais publicos invalidos;
   - logout.
8. Monitorar por pelo menos 15 a 30 minutos:
   - erros no console;
   - falhas de login;
   - falhas de RPC;
   - tela em branco;
   - dados financeiros divergentes;
   - reservas ou pagamentos sem sincronizar.

## Go / No-Go

Deploy liberado quando:

- `npm run check:regression` passou;
- validacao manual minima passou;
- migrations, se houver, foram aplicadas com sucesso;
- smoke local passou;
- nao ha dados teste ativos por engano;
- nao ha erro critico em login, dashboard, pagamentos, agenda/reservas ou portais publicos;
- existe caminho claro de rollback.

Deploy bloqueado quando:

- `lint`, `typecheck`, testes ou build falham;
- link publico invalido carrega dados;
- rota protegida abre sem login;
- pagamento, reserva, estoque ou relatorio diverge;
- migration falha parcialmente;
- RLS fica ausente em tabela publica;
- nao existe usuario teste para validar;
- nao existe plano de rollback para uma mudanca de alto risco.

## Rollback de Frontend

Usar rollback de frontend quando:

- deploy quebrou layout;
- tela branca;
- erro de JavaScript;
- regressao visual;
- bug em fluxo que nao depende de schema novo de banco.

Procedimento:

1. Reverter para o deploy anterior na plataforma de hospedagem.
2. Confirmar que login e dashboard voltaram.
3. Confirmar que os portais publicos carregam.
4. Registrar horario do rollback e motivo.
5. Manter migrations aplicadas se o frontend anterior continuar compativel.

## Rollback de Banco

Banco deve ser tratado com mais cautela.

Usar rollback SQL somente quando:

- existe script de rollback revisado;
- a mudanca causou falha operacional real;
- o rollback nao apaga dados reais;
- a decisao foi registrada.

Preferir correcao forward quando:

- a migration ja criou dados ou estruturas usadas por producao;
- o problema e em policy, funcao, view ou trigger corrigivel com nova migration;
- ha risco de perda de dados no rollback.

Antes de rollback SQL:

1. Exportar/registrar evidencia do erro.
2. Conferir dependencias da tabela/funcao.
3. Executar em janela controlada.
4. Validar com conta teste.
5. Registrar resultado no plano.

## Smoke Test de Producao

Somente leitura, sem alterar dados reais:

- `/login`: carrega e autentica.
- `/dashboard`: cards principais carregam.
- `/pagamentos`: lista abre sem erro.
- `/relatorios`: indicadores carregam sem quebrar.
- `/agenda` ou `/calendario`: tela operacional carrega.
- `/portal-aluno?ct=invalid`: bloqueia link invalido.
- `/agendar?ct=invalid`: bloqueia link invalido.
- `/matricula`: exibe inscricao publica indisponivel.

## Comunicacao de Incidente

Se algo falhar apos deploy:

1. Pausar novas publicacoes.
2. Identificar se o problema e frontend, banco, auth ou dados.
3. Aplicar rollback frontend se resolver rapido e com baixo risco.
4. Se for banco, decidir entre rollback SQL e correcao forward.
5. Registrar:
   - horario;
   - usuario/ambiente;
   - acao que falhou;
   - erro observado;
   - decisao tomada;
   - validacao apos correcao.

## Status de Release

Use esta matriz:

| Item | Status |
| --- | --- |
| Regressao tecnica passou | Obrigatorio |
| Teste manual minimo passou | Obrigatorio |
| Migrations aplicadas | Quando houver |
| Smoke local passou | Obrigatorio |
| Smoke producao passou | Obrigatorio apos deploy |
| Rollback conhecido | Obrigatorio |
| Dados teste limpos | Obrigatorio |

## Decisao Final

- `GO`: todos os itens obrigatorios passaram.
- `NO-GO`: qualquer item obrigatorio falhou.
- `GO COM OBSERVACAO`: apenas avisos conhecidos e documentados permanecem, sem impacto operacional.
