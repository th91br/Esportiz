# Roteiro de Regressao Profissional - Esportiz

Este roteiro deve ser executado antes de deploy, depois de migrations aplicadas, ou sempre que houver mudancas em fluxos financeiros, agenda, reservas, alunos/reservantes, produtos/comandas, portais publicos ou autenticacao.

## Regra de Ouro

- Nunca validar em producao criando, editando, baixando, estornando ou excluindo dados reais.
- Quando precisar criar dados, usar conta teste e prefixo claro: `TESTE REGRESSAO`.
- Ao final do teste, remover ou desfazer tudo pelo fluxo oficial do sistema.
- Se um teste manual falhar, parar o deploy e registrar a tela, acao, usuario e horario.

## Validacao Tecnica Obrigatoria

Execute:

```bash
npm run check:regression
```

Este comando roda:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

Situacao aceita:

- todos os comandos precisam terminar com sucesso;
- avisos conhecidos de Fast Refresh em componentes de UI podem aparecer no `lint`, desde que nao existam erros;
- avisos conhecidos do build sobre chunk grande e import dinamico/estatico do Supabase podem aparecer, desde que o build finalize com sucesso.

## Validacao Manual - Base

1. Login e seguranca:
   - acessar `/login`;
   - confirmar entrada com conta teste;
   - confirmar redirecionamento para `/dashboard`;
   - acessar uma rota protegida logado;
   - confirmar que logout retorna para login.

2. Dashboard:
   - abrir `/dashboard`;
   - conferir se cards carregam sem quebrar layout;
   - confirmar que notificacoes e resumos respeitam a modalidade atual.

3. Responsividade:
   - validar largura mobile aproximada de 390px;
   - validar desktop;
   - conferir que botoes, cards, modais e textos nao se sobrepoem.

## Validacao Manual - Sportiz Sport

Executar em conta teste da modalidade Escola Esportiva / Sportiz Sport:

- Alunos:
  - criar aluno `TESTE REGRESSAO Aluno`;
  - editar telefone ou observacao;
  - vincular/desvincular turma quando aplicavel;
  - excluir/desativar pelo fluxo oficial.

- Turmas e agenda:
  - criar ou validar turma teste;
  - confirmar exibicao no calendario;
  - registrar presenca de teste quando aplicavel;
  - desfazer/remover os dados teste.

- Pagamentos:
  - gerar ou localizar pagamento teste;
  - dar baixa;
  - reabrir ou estornar pelo fluxo oficial;
  - confirmar reflexo em relatorios.

- Portal do aluno:
  - validar `/portal-aluno` manual;
  - validar `/portal-aluno?ct=invalid` bloqueando link invalido;
  - validar CPF/data apenas com aluno teste.

## Validacao Manual - Esportiz Arena

Executar em conta teste da modalidade Arena / CT Quadra:

- Quadras:
  - criar quadra `TESTE REGRESSAO Quadra`;
  - editar preco, horario ou cor;
  - confirmar exibicao na agenda;
  - remover/desativar ao final.

- Reservantes:
  - criar reservante `TESTE REGRESSAO Reservante`;
  - editar telefone;
  - confirmar listagem;
  - remover ao final.

- Agenda e reservas:
  - criar reserva `TESTE REGRESSAO Reserva`;
  - confirmar recebimento pela Agenda;
  - reabrir/pendenciar pela tela de Pagamentos;
  - editar reserva sem alterar pagamento e confirmar persistencia;
  - cancelar/remover reserva teste ao final.

- Produtos, vendas e comandas:
  - criar produto `TESTE REGRESSAO Produto`;
  - vender uma unidade;
  - cancelar venda e conferir restauracao de estoque;
  - abrir comanda, adicionar/remover item e cancelar comanda;
  - desativar produto teste.

- Agendamento publico:
  - validar `/agendar` sem `ct` exibindo link invalido;
  - validar `/agendar?ct=invalid` exibindo link invalido;
  - validar link real somente com conta teste;
  - nao criar reserva publica em producao.

## Validacao Publica e Institucional

- `/`: landing page abre sem erro.
- `/matricula`: mostra inscricao publica indisponivel.
- `/reset-password`: mostra fluxo apropriado para link invalido/expirado.
- Links publicos invalidos nunca devem carregar dados de tenant.

## Criterios Para Deploy

Deploy liberado somente se:

- `npm run check:regression` passou;
- testes manuais criticos da modalidade alterada passaram;
- nenhum dado teste ficou ativo por engano;
- nenhum dado real foi alterado durante a validacao;
- plano de evolucao foi atualizado com o resultado da fase;
- migrations, quando existirem, foram aplicadas no Supabase e registradas.

## Criterios Para Bloqueio

Bloquear deploy se ocorrer qualquer item abaixo:

- erro em `typecheck`, testes ou build;
- erro de `lint`;
- tela protegida acessivel sem login;
- link publico invalido carregando dados;
- pagamento, reserva ou estoque divergente depois de editar/estornar/cancelar;
- layout mobile com sobreposicao relevante;
- dado teste impossivel de remover pelo fluxo oficial.
