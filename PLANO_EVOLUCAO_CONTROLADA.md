# Plano de Evolucao Controlada - Sistema Esportiz

## Objetivo

Evoluir o Esportiz em fases pequenas, auditaveis e reversiveis, preservando funcionalidades existentes enquanto fortalecemos seguranca, consistencia operacional, sincronizacao de dados, responsividade e confiabilidade dos fluxos criticos.

## Principios de Trabalho

- Preservar comportamento existente sempre que possivel.
- Alterar uma area critica por vez.
- Evitar refatoracoes amplas sem necessidade direta.
- Manter regras financeiras, estoque, reservas e cadastros internos validados no servidor/banco.
- Validar manualmente os fluxos principais antes e depois de cada fase.
- Preferir mudancas pequenas, revisaveis e com criterio de aceite claro.
- Nao misturar ajustes cosmeticos com mudancas de regra de negocio.
- Registrar riscos conhecidos antes de aplicar correcoes.

## Fase 0 - Preparacao Segura

Status: concluida.

Branch de trabalho: `codex-evolucao-controlada-fase-0`.

Escopo desta fase:

- Criar branch isolada para trabalho.
- Documentar fluxos principais do sistema.
- Definir checklist manual de validacao.
- Definir ordem de evolucao das fases 1 a 10.
- Nao alterar regras de negocio nesta fase.
- Nao alterar migrations nesta fase.
- Nao alterar telas nesta fase.

## Inventario de Fluxos Principais

Fluxos administrativos:

- Login e recuperacao de senha.
- Onboarding inicial.
- Dashboard por tipo de negocio.
- Configuracoes de perfil, marca, Pix e integracoes.
- Alternancia de tipo de negocio: escola esportiva e arena.

Fluxos de escola esportiva:

- Cadastro e edicao de alunos.
- Planos e vencimentos.
- Turmas e modalidades.
- Calendario de treinos.
- Presenca.
- Pagamentos e pagamentos parciais.
- Comunicacao.
- Aniversariantes.
- Relatorios.
- Contratos digitais.

Fluxos de arena:

- Quadras.
- Agenda de reservas.
- Reservantes.
- Produtos.
- Vendas.
- Comandas.
- Despesas.
- Relatorios.

Fluxos publicos:

- Reserva online.
- Portal do aluno.

Fluxos de integracao:

- Google Agenda.
- Google Sheets.
- PWA/service worker.
- Assets publicos e logos por tenant.

## Checklist Manual de Regressao

Autenticacao e entrada:

- Usuario consegue entrar.
- Usuario autenticado vai para a pagina correta.
- Usuario sem onboarding vai para onboarding.
- Usuario sem login nao acessa rotas protegidas.
- Reset de senha abre sem exigir sessao autenticada.

Perfil e configuracoes:

- Nome do CT/arena aparece corretamente.
- Logo atual aparece corretamente.
- Pix configurado fica salvo.
- Tipo de negocio altera navegacao e labels.
- Integracao Google mostra estado coerente.

Escola esportiva:

- Criar aluno.
- Editar aluno.
- Desativar/remover aluno conforme regra atual.
- Criar plano.
- Editar plano.
- Criar turma.
- Vincular aluno em turma.
- Criar treino.
- Marcar presenca.
- Gerar/visualizar pagamentos.
- Marcar pagamento como pago.
- Registrar pagamento parcial.

Arena:

- Criar quadra.
- Criar reserva interna.
- Editar reserva.
- Criar produto.
- Editar estoque de produto.
- Registrar venda direta.
- Abrir comanda.
- Adicionar item na comanda.
- Alterar quantidade de item.
- Fechar comanda.
- Reabrir comanda.

Portais publicos:

- Rota legada `/matricula` nao executa cadastro publico.
- Link de reserva abre com `ct`.
- Reserva bloqueia horario ocupado.
- Portal do aluno autentica e mostra dados corretos.
- Portal do aluno nao mostra Pix fixo incorreto.

PWA e responsividade:

- App abre em mobile.
- Menus principais funcionam em mobile.
- Modais principais nao cortam conteudo.
- Tabelas/listas continuam utilizaveis.
- Service worker nao prende versao quebrada apos atualizacao.

## Riscos Mapeados Para Tratar Nas Proximas Fases

- Tipos Supabase desatualizados em relacao a tabelas, campos e RPCs atuais.
- Documentacao menciona variavel de ambiente diferente da usada no client.
- Rota documentada de reserva publica diverge da rota real.
- Tela de contratos existe, mas nao esta registrada nas rotas protegidas.
- Perfil usa campos de integracao Google no front sem tipagem/hook alinhado.
- Portal do aluno usa autenticacao fraca por CPF e data de nascimento.
- Portal do aluno tem Pix fixo de exemplo.
- Fluxo publico legado de matricula ainda existia no codigo mesmo fora do produto atual.
- Fechamento e reabertura de comandas fazem operacoes financeiras em multiplas chamadas client-side.
- Reserva online precisa de protecao transacional contra concorrencia.
- RBAC existe como base, mas ainda nao foi aplicado nas policies principais.
- Testes automatizados ainda nao cobrem fluxos criticos.

## Roadmap de Fases

Fase 1: Alinhar codigo, tipos e documentacao.

Fase 2: Fortalecer seguranca dos portais publicos.

Fase 3: Transacionar comandas, vendas e estoque.

Fase 4: Tornar reservas online seguras contra conflito real.

Fase 5: Remover superficie publica legada de matricula online.

Fase 6: Endurecer pagamentos e financeiro.

Fase 7: Padronizar sincronia do frontend.

Fase 8: Revisar responsividade operacional.

Fase 9: Adicionar testes profissionais dos fluxos criticos.

Fase 10: Evoluir RBAC e equipe de forma gradual.

## Criterio de Aceite da Fase 0

- Branch isolada criada.
- Plano de evolucao documentado.
- Fluxos principais inventariados.
- Checklist manual criado.
- Riscos priorizados registrados.
- Nenhuma regra de negocio alterada.
- Nenhuma migration alterada.
- Nenhuma tela alterada.

## Proxima Fase

Ao concluir a Fase 0, iniciar a Fase 1 com foco em alinhamento de tipos, documentacao, rotas e contrato entre frontend e Supabase.

## Registro da Fase 1

Status: concluida.

Escopo executado:

- Contrato TypeScript do Supabase atualizado para campos recentes usados pelo frontend.
- RPCs usadas pelo frontend registradas em `src/integrations/supabase/types.ts`.
- Hook de perfil alinhado para campos de Google, Sheets e Pix ja usados na tela de configuracoes.
- Rota protegida `/contratos` registrada.
- Alias publico `/agendamento` adicionado sem remover `/agendar`.
- Documentacao alinhada para `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Documentacao alinhada para rota publica de reservas.
- Referencias a `profile.city`, que nao existe no contrato atual de `profiles`, removidas das telas de contrato.

Validacoes executadas:

- `npm run build`: passou.
- `npm test`: passou.
- `npx eslint src/integrations/supabase/types.ts`: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: ainda falha por dividas globais de tipagem preexistentes fora do escopo desta fase.

Observacoes para fases futuras:

- O lint global ainda falha por uso amplo de `any` em arquivos existentes.
- O TypeScript global ainda aponta incompatibilidades antigas entre tipos de `mockData`, hooks reais e alguns componentes.
- A Fase 2 deve priorizar seguranca dos portais publicos sem expandir refatoracoes globais.

## Registro da Fase 2

Status: concluida.

Escopo executado:

- Validacao compartilhada adicionada para entradas de portais publicos: CPF, telefone, e-mail, datas e UUID de tenant.
- Portal de matricula legado passou a validar dados antes de chamar RPC e a enviar dados normalizados, enquanto ainda existia no produto.
- Portal de reserva passou a validar dados antes de chamar RPC, impedir datas passadas e reconferir horario ocupado antes do envio.
- Portal do aluno passou a aceitar escopo por `ct`, preservando acesso manual sem `ct` para compatibilidade.
- Link copiado no card do aluno deixou de expor `student.id` como token e passou a usar o tenant `ct`.
- Pix fixo de exemplo removido do portal do aluno; a chave Pix agora vem da configuracao real do tenant somente apos autenticacao.
- Migration `20260516090000_phase2_public_portal_security.sql` criada para remover a assinatura antiga por `student_id`, validar entradas no servidor e endurecer RPCs publicas.
- Retorno do portal do aluno reduzido para nao devolver CPF, telefone, e-mail ou `owner_id` ao cliente publico.
- Tipos Supabase atualizados para a nova assinatura segura de `get_student_portal_data` e retorno de Pix autenticado.

Validacoes executadas:

- `npm run build`: passou.
- `npm test`: passou.
- `npx eslint` focado nos arquivos alterados da Fase 2: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: ainda falha por dividas globais preexistentes fora do escopo desta fase.

Observacoes para fases futuras:

- A Fase 3 deve seguir para transacao de comandas, vendas e estoque.
- A Fase 4 ainda deve tratar concorrencia forte de reservas online em nivel transacional.
- A Fase 5 deve alinhar o produto aos dois modelos atuais, removendo a superficie publica legada de matricula online.

## Registro da Fase 3

Status: concluida.

Escopo executado:

- Fechamento de comanda deixou de inserir vendas, baixar estoque e fechar status em chamadas client-side separadas.
- Reabertura de comanda deixou de restaurar estoque, apagar vendas e reabrir status em chamadas client-side separadas.
- Migration `20260516093000_phase3_atomic_comandas.sql` criada com as RPCs `close_comanda_atomic` e `reopen_comanda_atomic`.
- RPC de fechamento valida usuario autenticado, forma de pagamento, comanda aberta, itens existentes e estoque suficiente antes de confirmar.
- RPC de fechamento cria vendas vinculadas a `comanda_id`, baixa estoque rastreado e fecha a comanda na mesma transacao.
- RPC de reabertura restaura estoque rastreado, remove vendas vinculadas e reabre a comanda na mesma transacao.
- Hook `useComandas` atualizado para usar as RPCs atomicas, reduzindo risco de caixa, estoque e status ficarem fora de sincronia.
- Tipos Supabase atualizados para as novas RPCs.

Validacoes executadas:

- `npm run build`: passou.
- `npm test`: passou.
- `npx eslint` focado em `useComandas` e tipos Supabase: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: ainda falha por dividas globais preexistentes fora do escopo desta fase.

Observacoes para fases futuras:

- A venda direta ja usava RPC atomica antes desta fase e foi preservada.
- A Fase 4 deve tratar reservas online com protecao transacional mais forte contra concorrencia simultanea.
- Ainda falta aplicar as migrations novas no ambiente Supabase antes de validar os fluxos em banco real.

## Registro da Fase 4

Status: concluida.

Escopo executado:

- Migration `20260516150000_phase4_reservation_concurrency.sql` criada para endurecer a reserva publica online.
- RPC `submit_public_reservation` substituida preservando assinatura atual do frontend.
- Criado indice parcial para acelerar a checagem de conflito de reservas de arena.
- Adicionado lock transacional por `quadra + data` antes da checagem final de disponibilidade e do insert da reserva.
- Mantidas as validacoes da Fase 2: tenant, CPF, e-mail, telefone, data, duracao, horario e funcionamento da quadra.
- Adicionada validacao server-side de dias da semana quando a quadra possui `daysOfWeek` no metadata.
- Retorno de conflito passou a incluir `conflict: true` para diferenciar horario tomado por concorrencia real.
- Tela de reserva online volta para a selecao de horario quando o banco retorna conflito de concorrencia.
- Tipos Supabase atualizados para o novo campo opcional `conflict`.

Validacoes executadas:

- `npm run build`: passou.
- `npm test`: passou.
- `npx eslint` focado em `OnlineBookingPage` e tipos Supabase: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: ainda falha por dividas globais preexistentes fora do escopo desta fase.

Observacoes para fases futuras:

- A protecao desta fase cobre o fluxo publico online. Reservas internas administrativas ainda usam fluxo proprio e podem ser evoluidas em fase posterior se quisermos padronizar tudo em RPC.
- A Fase 5 deve remover a superficie publica legada de matricula online e manter apenas Sportiz Sport e Esportiz Arena.

## Registro da Fase 5

Status: concluida.

Escopo executado:

- Fase 5 revisada apos confirmacao de produto: o Esportiz trabalha apenas com Sportiz Sport e Esportiz Arena.
- Rota publica `/matricula` deixou de carregar formulario operacional e passou a exibir pagina informativa sem chamada ao Supabase.
- Pagina antiga `EnrollmentPage` removida do grafo de compilacao para impedir uso acidental do fluxo legado.
- Botao/link de matricula publica removido da tela de alunos/reservantes.
- `BusinessType` do frontend passou a aceitar somente `sport_school` e `arena`.
- Valores antigos `business_type = 'other'` sao normalizados para `sport_school` no frontend e na migration.
- Labels, placeholders e graficos deixaram de usar linguagem de escola/curso/disciplina.
- Migration `20260516170000_phase5_disable_legacy_public_enrollment.sql` criada para converter dados `other`, restringir o check de `profiles.business_type` e desativar as RPCs publicas de matricula sem apagar dados.
- Tipos Supabase atualizados para refletir que as RPCs legadas de matricula publica retornam indisponibilidade controlada.
- Documentacao funcional ajustada para remover promessa de matricula online publica e manter Portal do Aluno + Reserva Online.

Validacoes executadas:

- `npm run build`: passou.
- `npm test`: passou.
- `npx eslint` focado nos arquivos alterados da Fase 5: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: ainda falha por dividas globais preexistentes fora do escopo desta fase.

Observacoes para fases futuras:

- A Fase 6 deve seguir para endurecimento financeiro e pagamentos.
- A rota `/matricula` foi mantida apenas como pagina amigavel para links antigos, sem escrever dados.

## Registro da Fase 6.1

Status: concluida.

Escopo executado:

- Mapeado o fluxo atual de geracao de pagamentos no frontend e no banco.
- Mantida a assinatura existente da RPC `generate_monthly_payments(p_month_ref TEXT)` para nao quebrar chamadas atuais.
- Migration `20260516183000_phase6_1_harden_payment_generation.sql` criada para endurecer a geracao mensal.
- Validacao server-side adicionada para `p_month_ref` no formato `YYYY-MM`.
- Geracao mensal passou a ser serializada por tenant, tipo de negocio ativo e mes, reduzindo risco de corrida concorrente.
- RPC passou a filtrar explicitamente o tipo de negocio ativo do perfil: `sport_school` ou `arena`.
- Join entre aluno e plano passou a exigir mesmo tenant e mesmo `business_type`.
- Geracao passou a ignorar vencimentos invalidos fora de `1..31`, planos negativos e tipos fora do escopo.
- Insert passou a usar `ON CONFLICT (user_id, student_id, month_ref) DO NOTHING` para proteger contra duplicidade mesmo sob concorrencia.
- Logica de desconto ficou mais defensiva contra `discount_start_month` invalido.
- Hook `usePayments` passou a aguardar o perfil antes de consultar/gerar pagamentos, evitando gerar no nicho errado durante carregamento.
- Autogeracao do mes corrente passou a controlar chaves por `business_type + mes`, permitindo alternancia segura entre Sportiz Sport e Arena.

Validacoes executadas:

- `npm run build`: passou.
- `npm test`: passou.
- `npx eslint` focado nos arquivos alterados da Fase 6.1: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: ainda falha por dividas globais preexistentes fora do escopo desta fase.

Observacoes para fases futuras:

- A Fase 6.2 deve revisar baixa, estorno e pagamentos parciais com a mesma abordagem transacional.

## Registro da Fase 6.2

Status: concluida.

Escopo executado:

- Mapeado o fluxo de baixa individual, baixa em lote, estorno, cancelamento de mensalidade e cancelamento de cobrancas ao desativar aluno.
- Criada a migration `20260517100000_phase6_2_payment_state_transitions.sql`.
- Adicionadas RPCs transacionais para:
  - `receive_payment_atomic`: baixa total ou parcial com travamento da linha.
  - `reopen_payment_atomic`: estorno/retorno para aberto com limpeza de `paid_amount` e `paid_at`.
  - `cancel_payment_atomic`: cancelamento seguro para impedir regeneracao automatica.
  - `receive_payments_batch_atomic`: baixa em lote em uma unica operacao no banco.
  - `reopen_payments_batch_atomic`: estorno em lote em uma unica operacao no banco.
  - `cancel_student_open_payments_atomic`: cancelamento de cobrancas abertas na desativacao do aluno.
- Baixas parciais passaram a ser protegidas contra reducao acidental por cliente com estado antigo.
- Valor recebido acima do valor da mensalidade passou a ser limitado ao valor da fatura, evitando inflar relatorios.
- Desativacao de aluno passou a preservar recebimentos parciais como receita realizada e cancelar somente o saldo em aberto.
- Hook `usePayments` deixou de fazer updates diretos em `payments` para baixa, estorno, lote e cancelamento.
- `StudentCard` passou a usar RPC transacional para cancelar cobrancas abertas ao desativar aluno.
- Tipos locais do Supabase foram atualizados para as novas RPCs.

Validacoes executadas:

- `npx eslint` focado nos arquivos alterados da Fase 6.2: passou.
- `npm run build`: passou.
- `npm test`: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: ainda falha por dividas globais preexistentes fora do escopo desta fase.

Observacoes para fases futuras:

- A Fase 6.3 deve revisar sincronizacao de pagamentos pendentes quando plano, preco ou vencimento mudam.
- Em uma etapa futura, avaliar endurecimento adicional de permissoes diretas de update na tabela `payments`, depois que todos os fluxos legados estiverem em RPC.

## Registro da Fase 6.3

Status: concluida e aplicada no Supabase.

Escopo executado:

- Mapeadas as RPCs antigas `sync_student_unpaid_payments` e `sync_all_unpaid_payments_for_plan`.
- Criada a migration `20260517113000_phase6_3_harden_payment_sync.sql`.
- `sync_student_unpaid_payments` passou a:
  - validar usuario autenticado, aluno, plano, tenant e `business_type`;
  - recalcular mensalidades pendentes usando preco atual, pro-rata, descontos e vencimento;
  - preservar recebimentos parciais e limitar `paid_amount` ao novo valor da fatura;
  - marcar como quitada a cobranca que ficar totalmente coberta apos ajuste de preco/desconto;
  - cancelar com seguranca cobrancas abertas se o aluno ficar sem plano mensal ou sem vencimento valido.
- `sync_all_unpaid_payments_for_plan` passou a:
  - recalcular todas as cobrancas abertas de um plano mensal apos mudanca de preco;
  - respeitar descontos individuais de cada aluno;
  - preservar parcial recebido;
  - cancelar com seguranca cobrancas abertas se o plano deixar de ser mensal.
- Hook `usePlans` passou a sincronizar pagamentos abertos quando houver mudanca de preco ou tipo de cobranca do plano.

Validacoes executadas:

- `npx eslint` focado nos arquivos alterados da Fase 6.3: passou.
- `npm run build`: passou.
- `npm test`: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: ainda falha por dividas globais preexistentes fora do escopo desta fase.

Observacoes para fases futuras:

- A Fase 6.4 deve revisar permissao direta de escrita na tabela `payments` e separar o que deve ficar apenas via RPC.

## Registro da Fase 6.4

Status: concluida e aplicada no Supabase.

Escopo executado:

- Confirmado que o front-end atual faz apenas leitura direta em `payments`; escritas financeiras passam pelas RPCs das fases 6.1, 6.2 e 6.3.
- Criada a migration `20260517130000_phase6_4_lock_down_payment_writes.sql`.
- RPCs financeiras criticas passaram para `SECURITY DEFINER` com `search_path = public`, mantendo validacao explicita por `auth.uid()`.
- Execucao das RPCs financeiras foi removida de `PUBLIC` e concedida explicitamente a `authenticated`.
- Politicas antigas de escrita direta em `payments` foram removidas:
  - `Users can create their own payments`;
  - `Users can update their own payments`;
  - `Users can delete their own payments`;
  - `Isolamento Payments`.
- Politica de leitura direta foi recriada somente como `SELECT`, permitindo que o usuario autenticado veja apenas seus proprios pagamentos.
- A partir desta fase, insert/update/delete em `payments` devem acontecer por RPC controlada, nao por chamada direta do cliente.

Validacoes executadas:

- Mapeamento com `rg`: nenhuma escrita direta restante em `payments` no front-end; apenas leitura em `usePayments`.
- `npm run build`: passou.
- `npm test`: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: ainda falha por dividas globais preexistentes fora do escopo desta fase.

Observacoes para fases futuras:

- A Fase 6.5 deve revisar regras equivalentes para reservas/faturamento de arena ou registrar auditoria financeira, conforme prioridade operacional.

## Registro da Fase 6.5

Status: concluida e aplicada no Supabase.

Escopo executado:

- Mapeado o fluxo financeiro das reservas de arena dentro de `trainings.metadata`.
- Criada a migration `20260517143000_phase6_5_arena_reservation_payment_control.sql`.
- Adicionada RPC `set_arena_reservation_payment_status_atomic` para baixa/estorno de reservas com validacao de usuario, tenant, tipo `arena`, reserva cancelada e bloqueio de quadra.
- Adicionado trigger `guard_arena_reservation_payment_fields_trigger` para impedir mudanca direta de `paymentStatus`, `paymentMethod`, `paymentPaidAt` e `paymentUpdatedAt` fora da RPC controlada.
- Hook `useReservations` passou a expor `setReservationPaymentStatus` e deixou de serializar metadata manualmente como string.
- Edicao de reservas preserva campos financeiros existentes e envia mudancas de pagamento pela RPC.
- Opcao `Experimental (Gratis)` removida da Arena; aula experimental fica restrita ao produto Sportiz Sport.
- Migration normaliza reservas antigas de Arena com `reservationType = experimental` para `avulsa`, sem apagar dados.
- Tela de Pagamentos da Arena passou a confirmar/estornar reservas pela RPC.
- Agenda da Arena passou a dar baixa de recebimentos pela RPC.
- Resumo da agenda agora mostra valor recebido, nao valor apenas previsto.
- Relatorios da Arena passaram a calcular receita por quadra e top reservantes usando apenas reservas pagas.

Validacoes executadas:

- `npx eslint` focado nos arquivos alterados da Fase 6.5: passou.
- `npm run build`: passou.
- `npm test`: passou.
- Checagem da migration para evitar `AS $$`, `CREATE TABLE` e `SELECT ... INTO`: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: ainda falha por dividas globais preexistentes fora do escopo desta fase.

Observacoes para fases futuras:

- Validacao manual concluida com sucesso: criar reserva, confirmar pagamento, estornar em Pagamentos, editar sem alterar pagamento, conferir Relatorios e confirmar remocao da opcao Experimental/Gratis na Arena.
- A Fase 6.6 segue para auditoria/rastreabilidade financeira.

## Registro da Fase 6.6

Status: concluida; migration executada no Supabase pelo usuario.

Escopo executado:

- Criada a migration `20260517160000_phase6_6_financial_audit_logs.sql`.
- Adicionada a tabela `financial_audit_logs` para trilha de auditoria financeira por tenant.
- RLS configurado para permitir leitura apenas dos logs do proprio usuario.
- Escrita direta na tabela de auditoria nao foi concedida ao cliente; os logs sao gravados por RPC controlada.
- Adicionada funcao interna `record_financial_audit_log` para padronizar registros de auditoria.
- RPCs de pagamentos passaram a registrar estado anterior e novo em:
  - baixa total;
  - baixa parcial;
  - estorno/reabertura;
  - cancelamento;
  - cancelamento de saldo em aberto ao desativar aluno;
  - baixa/estorno em lote.
- RPC de pagamento de reserva da Arena passou a auditar confirmacao e retorno para pendente.
- Tipos locais do Supabase foram atualizados para conhecer `financial_audit_logs`.

Validacoes executadas:

- Checagem da migration: sem `AS $$`; tabela nova criada com RLS, policy de leitura e sem permissao direta de escrita ao cliente.
- `npx eslint src/integrations/supabase/types.ts`: passou.
- `npm run build`: passou.
- `npm test`: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: ainda falha por dividas globais preexistentes fora do escopo desta fase.

Observacoes para fases futuras:

- A Fase 6.6 cria a trilha de auditoria no banco; uma fase posterior pode exibir esses logs em tela administrativa.

## Registro da Fase 7.1

Status: concluida localmente.

Escopo executado:

- Criada a camada `querySync` para padronizar invalidacao de cache do frontend por dominio operacional.
- Pagamentos passaram a sincronizar tambem a futura trilha visual de auditoria financeira.
- Reservas da Arena passaram a sincronizar reservas, agenda/treinos e auditoria financeira pelo mesmo ponto central.
- Alteracoes em alunos passaram a sincronizar alunos, pagamentos, turmas, agenda e presencas.
- Alteracoes em planos passaram a sincronizar planos, pagamentos e alunos.
- Alteracoes em agenda/treinos e presencas passaram a sincronizar calendario, presencas e reservas.
- Alteracoes em quadras passaram a sincronizar `courts`, `modalities`, reservas e agenda, pois Arena usa a mesma tabela base de modalidades.
- Alteracoes em turmas passaram a sincronizar turmas e alunos, evitando vinculos antigos na interface.
- Vendas, produtos, despesas e comandas passaram a usar a camada central de sincronizacao.
- A geracao de agenda do aluno via RPC agora atualiza calendario/notificacoes imediatamente apos concluir.
- O sino de notificacoes deixou de invalidar todo o cache global e passou a sincronizar apenas dados de agenda.

Validacoes executadas:

- `npx eslint` nos arquivos novos/sem dividas antigas de `any`: passou.
- `npm run build`: passou.
- `npm test`: passou.

Observacoes para fases futuras:

- O lint amplo nos hooks tambem encontrou dividas antigas de `any` em arquivos ja existentes. Elas nao foram tratadas nesta fase para manter o escopo controlado.
- Uma proxima etapa pode tipar gradualmente esses hooks sem alterar comportamento.

## Registro da Fase 7.2

Status: concluida localmente.

Escopo executado:

- Removidos usos de `any` dos hooks criticos de dados:
  - `useStudents`;
  - `useTrainings`;
  - `useAttendance`;
  - `useCourts`;
  - `useGroups`;
  - `useExpenses`;
  - `useSales`.
- Substituidos casts genericos por tipos do Supabase (`Tables`, `TablesInsert`, `TablesUpdate`, `Json`) onde aplicavel.
- Adicionados tipos auxiliares para relacionamentos carregados por `select`, como alunos em turmas, alunos em treinos e turmas do aluno.
- Normalizada a leitura de `discount_type` do aluno para aceitar apenas `percentage`, `fixed` ou `null`.
- Tipados updates parciais de `trainings`, `expenses`, `groups` e `modalities`.
- Tipado o parser de metadata de quadras sem alterar o formato gravado.
- Reduzida a inferencia profunda do Supabase em `useGroups`, mantendo o mesmo select e evitando o erro de instanciacao excessiva nesse hook.
- Mantida a camada `querySync` criada na Fase 7.1 como ponto unico de sincronizacao.

Validacoes executadas:

- `rg` nos hooks tratados confirmou ausencia de `any`, `as any`, `: any` e `Record<string, any>`.
- `npx eslint` focado nos hooks tratados: passou.
- `npm run build`: passou.
- `npm test`: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: melhorou removendo o erro de instanciacao profunda em `useGroups`, mas ainda falha por dividas globais preexistentes em componentes/telas fora do escopo desta fase.

Observacoes para fases futuras:

- A proxima etapa pode alinhar os tipos de `Student` entre `useStudents` e `mockData`, que hoje ainda geram erros globais em telas como alunos, comunicacao, planos e relatorios.
- Tambem permanecem dividas globais em `Logo`, PWA e `StudentProfilePage`, a serem tratadas em fases pequenas.

## Registro da Fase 7.3

Status: concluida localmente.

Escopo executado:

- Alinhado o contrato `Student` usado pelo frontend em `mockData`, que continua sendo o arquivo de tipos compartilhados do app.
- `Student` passou a refletir com mais fidelidade os dados reais vindos do Supabase:
  - campos opcionais que podem vir nulos;
  - `groupIds`;
  - `paymentStartDate`;
  - `discountType` nullable;
  - `StudentLevel` e `StudentDiscountType` como tipos explicitos.
- `useStudents` deixou de declarar um tipo proprio de aluno e passou a retornar o mesmo `Student` compartilhado pelas telas.
- Normalizada a leitura de `level`, `discountType`, `email`, `paymentStartDate` e vinculos de turmas no hook `useStudents`.
- O submit do `StudentForm` passou a tipar explicitamente o payload como `Partial<Student>`, evitando que strings genericas do formulario vazem para o dominio.
- Eliminados os erros globais de tipagem relacionados a incompatibilidade entre `useStudents.Student` e `mockData.Student` em telas como alunos, comunicacao, planos, relatorios e dashboard.

Validacoes executadas:

- `npx eslint` focado em `mockData`, `useStudents`, `StudentForm`, `StudentCard`, `StudentsPage` e `studentHelpers`: passou.
- `npm run build`: passou.
- `npm test`: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: melhorou e nao aponta mais incompatibilidades do tipo `Student`; ainda falha por dividas globais restantes em ArenaTodaySchedule, Logo/PWA e StudentProfilePage.

Observacoes para fases futuras:

- A proxima etapa pode atacar os erros restantes do `tsc` em blocos pequenos:
  - `ArenaTodaySchedule` e `TimeSlot`;
  - props de `Logo`/PWA;
  - inconsistencias antigas em `StudentProfilePage`.

## Registro da Fase 7.4.1

Status: concluida localmente.

Escopo executado:

- Corrigido o contrato de horario usado por `ArenaTodaySchedule`, permitindo que `getTimePeriod` aceite strings vindas das reservas da Arena sem cast inseguro.
- `Logo` e `EsportizIcon` passaram a aceitar `variant`, alinhando os usos existentes no dashboard e no botao de instalacao do app.
- Adicionada variacao visual segura para logo/icone em fundo escuro ou botao, preservando a identidade atual.
- `InstallPWAButton` teve o prompt de instalacao tipado com `BeforeInstallPromptEvent`, removendo casts genericos para `any`.
- Adicionado suporte de tipos do `vite-plugin-pwa` em `vite-env.d.ts`, resolvendo o modulo virtual `virtual:pwa-register/react`.

Validacoes executadas:

- `npx eslint` focado em `ArenaTodaySchedule`, `Logo`, `InstallPWAButton`, `PWABadge`, `mockData` e `vite-env`: passou.
- `npm run build`: passou.
- `npm test`: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: melhorou; os erros de ArenaTodaySchedule, Logo e PWA foram removidos. Restam apenas inconsistencias antigas em `StudentProfilePage`.

Observacoes para fases futuras:

- A Fase 7.4.2 pode tratar exclusivamente `StudentProfilePage`, que concentra os erros finais de TypeScript conhecidos.

## Registro da Fase 7.4.2

Status: concluida localmente.

Escopo executado:

- Corrigida a tela `StudentProfilePage` para respeitar os contratos atuais de dados do frontend.
- A exibicao dos horarios das turmas deixou de tratar `dayOfWeek` numerico como data completa.
- O historico financeiro do aluno passou a usar `paidAt`, que e o campo real do tipo `Payment`, no lugar do campo inexistente `paymentDate`.
- O historico de frequencia deixou de depender de `groupId` em `Training`, pois os treinos atuais carregam alunos por `studentIds` e nao mantem vinculo direto de turma.
- A identificacao visual dos ultimos treinos agora tenta resolver a turma pelo horario do aluno; se nao houver correspondencia, usa modalidade, local ou o rotulo padrao do negocio.

Validacoes executadas:

- `npx eslint src/pages/StudentProfilePage.tsx`: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npm run build`: passou.
- `npm test`: passou.

Observacoes para fases futuras:

- A base TypeScript do app agora compila sem erros conhecidos nesta etapa, abrindo espaco para a proxima fase evolutiva com risco menor.

## Registro da Fase 8.1

Status: concluida localmente.

Escopo executado:

- Fortalecida a base responsiva dos componentes globais `Dialog`, `AlertDialog` e `Sheet`.
- Modais agora respeitam margem lateral em telas pequenas, altura maxima com `100dvh` e rolagem interna segura.
- Sheets laterais passam a abrir com largura operacional em mobile, sem ficarem estreitos demais por padrao.
- Ajustada a tela de alunos para filtros em grade responsiva, evitando compressao e overflow em celulares.
- Ajustada a Agenda da Arena para manter largura minima por quadra e permitir rolagem horizontal controlada quando houver muitas quadras.
- O painel de detalhes da reserva passa a ocupar largura utilizavel em mobile e manter limite profissional em telas maiores.
- Ajustado o modal de comandas/PDV para altura mobile mais confortavel, cabecalho adaptavel e itens de consumo sem esmagar quantidade, valor e acoes.
- Formularios criticos de aluno, reserva, quadra, turma, produto e despesa passaram a usar uma coluna em telas pequenas e duas/mais colunas apenas quando houver espaco.
- Relatorios ganharam controle de periodo com rolagem horizontal segura no mobile.
- Removidos casts `any` antigos em `CourtsPage` tocados nesta fase, substituindo por tipos reais de quadra e reserva.

Validacoes executadas:

- `npx eslint` focado nos arquivos alterados nesta fase: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npm run build`: passou.
- `npm test`: passou.
- Servidor local iniciado em `http://127.0.0.1:5173/`.
- Verificacao visual mobile no navegador interno em 390px: landing publica abriu sem overflow horizontal. Telas autenticadas ficaram cobertas por validacao estatica/build nesta etapa porque a sessao logada do usuario nao e compartilhada com o navegador interno.

Observacoes para fases futuras:

- A Fase 8.2 pode fazer uma revisao visual autenticada, com o usuario logado, nas telas de Arena, Alunos, Comandas e Relatorios para refinamentos finos de UI.

## Registro da Fase 8.2

Status: concluida localmente.

Escopo executado:

- Revisada a experiencia mobile das rotas privadas possiveis nesta sessao, sem contornar autenticacao.
- Confirmado que as rotas privadas redirecionam corretamente para `/login?mode=login` quando nao ha sessao autenticada.
- A tela de login foi verificada no navegador interno em 390px sem overflow horizontal.
- Ajustado o resumo de pagamentos para uma coluna em mobile e duas colunas apenas a partir de telas maiores.
- O modal de recebimento de pagamentos agora evita duas colunas apertadas no celular e usa acoes empilhadas com largura total em telas pequenas.
- Cards de modalidades e quadras receberam grades internas mais tolerantes para labels e valores longos.
- Rodapes de acao dos modais de reserva, quadra e fechamento de comanda passaram a empilhar no mobile, preservando botoes grandes e confortaveis.
- Horarios no formulario de turmas passaram a ocupar a largura disponivel no celular, evitando selects fixos comprimidos.

Validacoes executadas:

- `npx eslint` focado nos arquivos alterados na Fase 8.2: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npm run build`: passou.
- `npm test`: passou.
- Navegador interno em 390px confirmou login sem overflow horizontal; as telas autenticadas exigem sessao real do usuario para uma auditoria visual completa.

Observacoes para fases futuras:

- Uma revisao 8.3 pode ser feita com o usuario logado no navegador, validando visualmente Agenda, Alunos, Comandas, Pagamentos e Relatorios com dados reais.

## Registro da Fase 8.3

Status: concluida localmente; validacao visual autenticada executada com dados reais em modo somente leitura.

Escopo executado:

- Validada a experiencia autenticada com o usuario logado, sem criar, editar, excluir, cancelar, confirmar pagamento, dar baixa ou alterar dados reais.
- Auditadas em viewport mobile as telas:
  - Dashboard;
  - Agenda;
  - Quadras;
  - Reservantes/Alunos;
  - Comandas;
  - Pagamentos;
  - Relatorios.
- Auditadas em viewport desktop as mesmas telas criticas, confirmando ausencia de overflow horizontal de pagina.
- Validado que a Agenda usa rolagem horizontal interna controlada para filtros de quadra e grade de horarios, sem estourar a largura global da pagina.
- Abertos apenas modais seguros, sem salvar:
  - Nova Reserva;
  - Novo Aluno;
  - Abrir Nova Comanda.
- Confirmado que os modais seguros abrem em largura mobile adequada, com altura controlada e sem overflow horizontal.
- Conferidos logs do navegador interno: nenhum erro de console encontrado durante a auditoria.
- Ao finalizar, a navegacao retornou para `/dashboard` e o viewport temporario foi restaurado.

Validacoes executadas:

- Auditoria visual mobile autenticada em 390px: passou.
- Auditoria visual desktop autenticada em 1366px: passou.
- Verificacao automatica de overflow horizontal por rota critica: passou.
- Verificacao de erros de console no navegador interno: passou.

Observacoes para fases futuras:

- A Fase 8 pode ser considerada consolidada do ponto de vista responsivo operacional. Proxima fase natural: Fase 9, adicionando testes profissionais dos fluxos criticos.

## Registro da Fase 9.1

Status: concluida localmente.

Objetivo:

- Mapear a base atual de testes, definir a estrategia profissional da Fase 9 e auditar a conta teste antes de criar testes automatizados ou executar fluxos destrutivos controlados.

Inventario tecnico encontrado:

- O projeto ja usa Vitest com ambiente `jsdom`.
- Existe setup global em `src/test/setup.ts`, hoje cobrindo `matchMedia`.
- Existe apenas um teste placeholder em `src/test/example.test.ts`.
- Nao ha ainda testes reais dos fluxos criticos de negocio.
- Nao ha Playwright/Cypress instalado no projeto neste momento.
- `npm test` ja esta disponivel como rotina base de validacao.
- `npm run build` e `npx tsc -p tsconfig.app.json --noEmit` seguem como validacoes obrigatorias por fase.

Auditoria da conta teste:

- Conta teste autenticada validada no navegador interno.
- Perfil detectado como Arena/CT.
- Base teste esta praticamente limpa:
  - 0 quadras;
  - 0 reservantes;
  - 0 comandas;
  - 0 pagamentos;
  - 0 produtos/despesas relevantes.
- Isso e adequado para a Fase 9, porque permite criar dados controlados com prefixo de teste e remover ao final dos fluxos.

Estrategia profissional definida:

- Camada 1: testes unitarios puros com Vitest.
  - Validar utilitarios de data, moeda, roteamento autenticado e helpers de dominio.
  - Nao dependem de Supabase real.
  - Devem ser rapidos e rodar em toda validacao.

- Camada 2: testes de contrato e integracao leve com mocks.
  - Validar hooks e funcoes que montam payloads para Supabase.
  - Mockar cliente Supabase e QueryClient.
  - Garantir que sincronizacao de cache, normalizacao de dados e regras de payload nao regressem.

- Camada 3: testes operacionais E2E em conta teste.
  - Executar no navegador contra `http://127.0.0.1:5173/`.
  - Usar somente dados ficticios com prefixo identificavel, por exemplo `TESTE F9`.
  - Criar, editar, validar e excluir dados quando o fluxo permitir.
  - Nunca misturar com conta real ou dados reais.

- Camada 4: checklist manual de liberacao.
  - Usar quando o fluxo depender de integracoes externas, storage, WhatsApp, Google ou confirmacoes humanas.
  - Registrar resultado no plano antes de avancar.

Ordem segura proposta para as proximas subfases:

- Fase 9.2: criar primeiros testes unitarios reais e substituir o teste placeholder.
- Fase 9.3: testar utilitarios e contratos de pagamentos/financeiro.
- Fase 9.4: testar reservas/agenda da Arena com conta teste, criando e removendo dados controlados.
- Fase 9.5: testar reservantes/alunos, turmas e vinculos relevantes.
- Fase 9.6: testar comandas, produtos, vendas e estoque.
- Fase 9.7: testar portais publicos e protecoes de acesso.
- Fase 9.8: consolidar rotina de regressao profissional.

Validacoes executadas:

- Auditoria do setup de testes: concluida.
- Auditoria autenticada da conta teste em rotas criticas: concluida.
- Rotas auditadas no navegador interno:
  - Dashboard;
  - Agenda;
  - Quadras;
  - Reservantes;
  - Comandas;
  - Pagamentos;
  - Relatorios;
  - Produtos;
  - Despesas.
- Nenhuma acao de criacao, edicao ou exclusao foi executada nesta subfase, porque a Fase 9.1 e de inventario e estrategia. As operacoes controladas com dados teste ficam liberadas a partir das proximas subfases.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npm test`: passou.
- `npm run build`: passou.

Observacoes para fases futuras:

- A Fase 9.2 deve comecar por testes sem dependencia de banco real, para fortalecer a base automatizada antes dos fluxos E2E com criacao/exclusao de dados.

## Registro da Fase 9.2

Status: concluida localmente.

Objetivo:

- Substituir o teste placeholder por testes unitarios reais, rapidos e sem dependencia de Supabase ou dados reais.

Escopo executado:

- Removido o teste ficticio `src/test/example.test.ts`.
- Criados testes unitarios reais para utilitarios e regras pequenas usadas em varias telas:
  - `src/lib/dateUtils.test.ts`;
  - `src/lib/formatCurrency.test.ts`;
  - `src/lib/authRouting.test.ts`;
  - `src/lib/studentHelpers.test.ts`.
- `dateUtils` passou a ter cobertura para:
  - formatacao local `YYYY-MM-DD`;
  - protecao contra uso de ISO/UTC em datas locais.
- `formatCurrency` passou a ter cobertura para:
  - valores inteiros;
  - centavos;
  - valor zero em BRL.
- `authRouting` passou a ter cobertura para:
  - metas validas de onboarding;
  - redirecionamento de perfis existentes para dashboard;
  - redirecionamento de novos perfis para onboarding;
  - leitura segura de meta salva por tipo de negocio;
  - caminhos de onboarding para Escola Esportiva e Arena/CT.
- `studentHelpers` passou a ter cobertura para:
  - definicao real de aluno/reservante ativo mensal;
  - exclusao de planos avulsos, inativos, sem plano e plano inexistente;
  - totais, inativos e ativos sem plano.

Validacoes executadas:

- `npm test`: passou com 4 arquivos de teste e 13 testes reais.
- `npx eslint` focado nos novos arquivos de teste: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npm run build`: passou.

Observacoes para fases futuras:

- A Fase 9.3 pode avancar para testes de contratos financeiros/pagamentos, ainda com mocks e sem banco real.
- A Fase 9.4 deve usar a conta teste para os primeiros fluxos E2E controlados de Arena/Agenda.

## Registro da Fase 9.3

Status: concluida localmente.

Objetivo:

- Fortalecer os contratos financeiros e de pagamentos com regras puras testaveis, usando mocks locais e sem tocar em dados reais.

Escopo executado:

- Criado o modulo `src/lib/financialContracts.ts` para centralizar regras financeiras pequenas e criticas.
- A tela de Pagamentos passou a usar contratos centralizados para:
  - status financeiro do pagamento: pago, pendente ou atrasado;
  - totais de mensalidades/pacotes;
  - totais de recebimentos de reservas da Arena;
  - quantidade de itens em atraso;
  - protecao para reservas canceladas nao entrarem em recebiveis ativos.
- Criado `src/lib/financialContracts.test.ts` com cobertura para:
  - vencimento local sem tratar o dia atual como atraso;
  - pagamentos parciais e saldo restante;
  - reservas da Arena pagas, pendentes, atrasadas e canceladas;
  - resumo financeiro por competencia;
  - resumo financeiro por caixa com vencimento e pagamento em datas diferentes;
  - vendas recebidas no ato;
  - despesas pagas entrando no lucro liquido.

Validacoes executadas:

- `npm test`: passou com 5 arquivos de teste e 18 testes reais.
- `npx eslint src/lib/financialContracts.ts src/lib/financialContracts.test.ts src/pages/PaymentsPage.tsx src/pages/ReportsPage.tsx`: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npm run build`: passou.

Observacoes:

- Nenhum dado real foi criado, editado, excluido, baixado ou estornado nesta fase.
- Nenhuma migration SQL foi criada ou executada nesta fase.
- O build manteve apenas os avisos ja conhecidos de chunk grande e import dinamico/estatico do cliente Supabase.

Proxima etapa recomendada:

- Fase 9.4: iniciar testes E2E controlados da Arena/Agenda com a conta teste, criando e removendo dados com prefixo identificavel de teste.

## Registro da Fase 9.4

Status: concluida com seguranca; nucleo automatizado e E2E visual local finalizados.

Objetivo:

- Fortalecer reservas/agenda da Arena antes de executar testes destrutivos controlados em conta teste.

Decisao de seguranca:

- Preferencia definida e executada: fluxo destrutivo primeiro no ambiente local, nao em producao.
- A validacao visual foi feita em `http://127.0.0.1:5173/`, com login de teste autorizado.
- A aba de producao `www.esportiz.com.br` nao foi usada para criacao, edicao, baixa ou exclusao de dados.

Escopo executado:

- Criado o modulo `src/lib/reservationContracts.ts` para centralizar contratos de reserva/agenda da Arena.
- `useReservations` passou a reutilizar os contratos centralizados sem alterar a assinatura publica usada por Agenda, Quadras, Pagamentos e Relatorios.
- Criado `src/lib/reservationContracts.test.ts` com cobertura para:
  - metadata vazia ou invalida;
  - normalizacao de metadata vinda como JSON string;
  - bloqueio de quadra como evento financeiramente neutro;
  - fallback seguro para valores negativos e enums invalidos;
  - mapeamento de linhas de `trainings` para reservas operacionais da Arena;
  - exclusao de vinculos nulos de reservantes;
  - duracao padrao de 60 minutos quando o banco nao informar duracao.
- Executado E2E visual local da Arena/Agenda com dados controlados `TESTE F9.4`:
  - criacao de quadra;
  - criacao de reservante;
  - criacao de reserva avulsa;
  - baixa de recebimento pela Agenda;
  - validacao em Pagamentos;
  - salvamento da reserva sem perda do status pago;
  - validacao em Relatorios;
  - remocao da reserva, da quadra e do reservante criados para o teste.

Validacoes executadas:

- `npm test`: passou com 6 arquivos de teste e 23 testes reais.
- `npx eslint src/lib/reservationContracts.ts src/lib/reservationContracts.test.ts src/hooks/queries/useReservations.ts`: passou.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npm run build`: passou.

Validacoes E2E locais:

- Agenda voltou a `0 reservas`, `R$ 0,00 recebido` e `0h ocupadas`.
- Quadras voltou a `0` quadras cadastradas.
- Reservantes voltou a `0` reservantes cadastrados.
- Pagamentos voltou a `R$ 0,00` total, recebido e pendente, com `Locacoes Avulsas (Agenda) 0`.
- Relatorios voltou a `R$ 0,00` em faturamento, caixa, despesas e resultado liquido, sem `Recebido por Quadra` para dados teste.
- Dashboard voltou a `0` reservas, `0` quadras ativas, `R$ 0,00` de faturamento e sem dados `TESTE F9.4`.

Observacoes:

- Nenhum dado real foi criado, editado, excluido, baixado ou estornado nesta fase.
- Os dados ficticios `TESTE F9.4` foram criados somente na conta teste local e removidos ao final.
- Nenhuma migration SQL foi criada ou executada nesta fase.
- O build manteve apenas os avisos ja conhecidos de chunk grande e import dinamico/estatico do cliente Supabase.

## Registro da Fase 9.5

Status: concluida com seguranca; contratos de alunos/reservantes e vinculos fortalecidos, com E2E local controlado.

Objetivo:

- Fortalecer alunos/reservantes, turmas e vinculos `group_students` sem quebrar os fluxos solidos existentes.

Decisao de seguranca:

- As regras de vinculo foram primeiro cobertas por testes locais, sem depender de banco real.
- O E2E visual foi executado somente na conta teste local em `http://127.0.0.1:5173/`.
- A conta teste atual esta na modalidade Arena/CT; por isso o E2E visual cobriu Reservantes. Turmas e vinculos ficaram cobertos por contratos locais porque nao fazem parte do menu operacional dessa modalidade.

Escopo executado:

- Criado o modulo `src/lib/studentGroupContracts.ts` para centralizar regras sensiveis de vinculos:
  - normalizacao de ids vinculados;
  - remocao de ids vazios;
  - deduplicacao estavel de vinculos;
  - leitura segura dos grupos de um aluno/reservante;
  - leitura de alunos ativos dentro de uma turma;
  - montagem segura dos inserts em `group_students`;
  - validacao de horarios semanais de turmas;
  - fallback profissional de duracao de turma para 60 minutos.
- `useStudents` passou a usar os contratos ao ler e gravar `group_students`.
- `useGroups` passou a usar os contratos ao ler horarios, duracao e alunos vinculados, alem de montar inserts de vinculos sem duplicidade.
- Criado `src/lib/studentGroupContracts.test.ts` com cobertura para:
  - ids duplicados, vazios ou com espacos;
  - leitura de grupos do aluno sem vazamentos;
  - exclusao de aluno inativo da lista operacional da turma;
  - inserts seguros pelo lado do aluno/reservante;
  - inserts seguros pelo lado da turma;
  - descarte de horarios semanais invalidos;
  - fallback de duracao.

Validacoes executadas:

- `npm test -- --run src/lib/studentGroupContracts.test.ts`: passou com 7 testes.
- `npx eslint src/lib/studentGroupContracts.ts src/lib/studentGroupContracts.test.ts src/hooks/queries/useStudents.ts src/hooks/queries/useGroups.ts`: passou.
- `npm test`: passou com 7 arquivos de teste e 30 testes reais.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npm run build`: passou.

Validacoes E2E locais:

- Criado reservante `TESTE F9.5 Reservante` na conta teste Arena/CT.
- Confirmado total de reservantes `1`, com status `Sem Pacote`.
- Editado o telefone do reservante de teste de `(54) 99999-9500` para `(54) 99999-9511`.
- Confirmado que o telefone atualizado apareceu na listagem.
- Removido o reservante de teste.
- Recarregada a tela de Reservantes e confirmado retorno para `0` reservantes, sem dados `TESTE F9.5`.

Observacoes:

- Nenhum dado real foi criado, editado, excluido, baixado ou estornado nesta fase.
- Os dados ficticios `TESTE F9.5` foram criados somente na conta teste local e removidos ao final.
- Nenhuma migration SQL foi criada ou executada nesta fase.
- O build manteve apenas os avisos ja conhecidos de chunk grande e import dinamico/estatico do cliente Supabase.

Proxima etapa recomendada:

- Fase 9.6: testar comandas, produtos, vendas e estoque com o mesmo padrao de dados controlados e limpeza ao final.

## Registro da Fase 9.6

Status: concluida com seguranca; contratos de comercio fortalecidos, fluxo de Comandas profissionalizado e E2E local controlado.

Objetivo:

- Fortalecer comandas, produtos, vendas e estoque sem quebrar os fluxos financeiros ja consolidados.

Decisao de seguranca:

- As regras de comercio foram primeiro cobertas por testes locais, sem depender de banco real.
- O E2E visual foi executado somente na conta teste local em `http://127.0.0.1:5173/`.
- Todos os dados criados no E2E usaram o prefixo `TESTE F9.6`.
- A venda teste foi cancelada pelo fluxo oficial, restaurando o estoque.
- A comanda teste foi esvaziada e removida pelo fluxo oficial.
- O produto teste foi desativado pelo fluxo oficial da tela de Produtos, que usa exclusao logica para preservar historico.

Escopo executado:

- Criado o modulo `src/lib/commerceContracts.ts` para centralizar regras sensiveis de comercio:
  - normalizacao de valores monetarios;
  - normalizacao de quantidades;
  - calculo seguro de totais de linha;
  - normalizacao e rotulo de metodo de pagamento;
  - mapeamento seguro de produtos, vendas, comandas e itens de comanda;
  - status de estoque: nao controlado, zerado, baixo ou ok;
  - estatisticas de inventario;
  - payloads seguros para insert/update de produtos;
  - payload seguro para itens de comanda.
- `useProducts` passou a usar contratos centralizados para mapear produtos e montar payloads de insert/update.
- `useSales` passou a usar contratos centralizados para mapear vendas, rotular metodos de pagamento e calcular total.
- `useComandas` passou a usar contratos centralizados para mapear comandas, itens e totais.
- `ComandasPage` deixou de usar `window.confirm` para cancelar comanda, remover item e reabrir comanda, passando a usar `AlertDialog` interno do sistema.
- Criado `src/lib/commerceContracts.test.ts` com cobertura para:
  - produtos com valores seguros;
  - payloads de produto com estoque ligado/desligado;
  - status e estatisticas de estoque;
  - metodos de pagamento;
  - vendas e totais com centavos;
  - totalizacao de comandas;
  - inserts e updates de itens de comanda.

Validacoes executadas:

- `npm test -- --run src/lib/commerceContracts.test.ts`: passou com 7 testes.
- `npx eslint src/lib/commerceContracts.ts src/lib/commerceContracts.test.ts src/hooks/queries/useProducts.ts src/hooks/queries/useSales.ts src/hooks/queries/useComandas.ts src/pages/ComandasPage.tsx`: passou.
- `rg -n "confirm\(" src/pages/ComandasPage.tsx`: sem ocorrencias.
- `npm test`: passou com 8 arquivos de teste e 37 testes reais.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npm run build`: passou.

Validacoes E2E locais:

- Criado produto `TESTE F9.6 Produto` com estoque controlado: 3 unidades, minimo 1, preco R$ 10,00.
- Registrada venda direta de 1 unidade via PIX.
- Confirmado que o estoque caiu de 3 para 2 apos a venda.
- Cancelada a venda pelo fluxo oficial.
- Confirmado que o estoque voltou de 2 para 3 apos o cancelamento.
- Criada comanda `TESTE F9.6 Comanda`.
- Adicionado o produto `TESTE F9.6 Produto` na comanda e confirmado total de R$ 10,00.
- Removido o item da comanda, retornando total para R$ 0,00.
- Removida a comanda vazia pelo fluxo oficial.
- Desativado o produto teste pelo fluxo oficial da tela de Produtos.
- Confirmado estado final:
  - Produtos ativos sem `TESTE F9.6`;
  - Vendas em `R$ 0,00` e `0 venda(s)`;
  - Comandas abertas/fechadas em `0`;
  - Dashboard com `Vendas de Hoje` em `R$ 0,00`;
  - nenhuma tela operacional validada exibindo `TESTE F9.6`.

Observacoes:

- Nenhum dado real foi criado, editado, excluido, baixado ou estornado nesta fase.
- Nenhuma migration SQL foi criada ou executada nesta fase.
- Produto usa exclusao logica no sistema; por isso o dado teste foi desativado, nao apagado fisicamente pelo UI.
- O build manteve apenas os avisos ja conhecidos de chunk grande e import dinamico/estatico do cliente Supabase.

Proxima etapa recomendada:

- Fase 9.7: testar portais publicos e protecoes de acesso com o mesmo padrao de seguranca.

## Registro da Fase 9.7

Status: concluida com seguranca; portais publicos e protecoes de acesso fortalecidos com contratos locais, validacoes automatizadas e navegacao visual sem dados reais.

Objetivo:

- Fortalecer os pontos publicos do sistema sem abrir superficie indevida:
  - Landing page;
  - matricula publica desativada;
  - agendamento online da Arena;
  - portal do aluno;
  - login;
  - reset de senha;
  - protecao das rotas administrativas.

Decisao de seguranca:

- Nenhum dado real foi criado, editado, excluido, baixado ou estornado nesta fase.
- A validacao visual foi somente de leitura e navegacao local.
- As regras sensiveis foram extraidas para contratos puros antes da validacao, reduzindo risco de regressao nas telas existentes.
- Os fluxos publicos com `ct` invalido continuam bloqueados de forma explicita.
- O portal do aluno continua permitindo acesso manual sem `ct`, mas rejeitando `ct` invalido.
- O agendamento online da Arena continua exigindo `ct` valido.

Escopo executado:

- Criado `src/lib/publicAccessContracts.ts` para centralizar:
  - classificacao de rotas publicas, protegidas e desconhecidas;
  - validacao do escopo publico por `ct`;
  - retorno padronizado de `scopedOwnerId` e `hasInvalidOwnerId`.
- Criado `src/lib/publicBookingContracts.ts` para centralizar:
  - normalizacao segura de metadados publicos de quadra;
  - fallback de cor, preco, horarios e dias de funcionamento;
  - calculo de conflitos por sobreposicao de horarios;
  - bloqueio defensivo de pedidos publicos invalidos;
  - calculo de preco normal e preco de pico;
  - suporte seguro a janela de preco de pico que atravessa a meia-noite.
- `OnlineBookingPage` passou a usar os contratos de acesso e agendamento publico.
- `StudentPortalPage` passou a usar o contrato central de escopo publico por `ct`.
- `PaymentsPage` teve um import orfao removido para manter a compilacao limpa.
- `src/integrations/supabase/types.ts` recebeu a assinatura da RPC `add_arena_partial_payment_atomic`, alinhando os tipos ao banco ja migrado.

Testes automatizados criados:

- `src/lib/publicAccessContracts.test.ts`:
  - rotas publicas seguem publicas;
  - rotas administrativas seguem protegidas;
  - caminhos desconhecidos nao sao expostos por engano;
  - `ct` ausente, invalido e valido sao classificados corretamente.
- `src/lib/publicBookingContracts.test.ts`:
  - metadados vazios ou invalidos caem em defaults seguros;
  - metadados JSON sao normalizados;
  - valores quebrados de quadra nao contaminam a tela publica;
  - reservas canceladas nao bloqueiam horario;
  - conflitos reais bloqueiam horario;
  - pedidos invalidos ficam indisponiveis por padrao;
  - preco de pico e faixa noturna funcionam;
  - parsing de horario e contrato de sobreposicao ficam explicitos.
- `src/lib/publicPortalSecurity.test.ts`:
  - CPF;
  - telefone;
  - nome;
  - e-mail;
  - datas publicas;
  - UUID de tenant.

Validacoes executadas:

- `npm test -- publicAccessContracts publicBookingContracts publicPortalSecurity`: passou com 3 arquivos e 15 testes.
- `npx eslint src/pages/OnlineBookingPage.tsx src/pages/StudentPortalPage.tsx src/pages/PaymentsPage.tsx src/lib/publicAccessContracts.ts src/lib/publicBookingContracts.ts src/lib/publicAccessContracts.test.ts src/lib/publicBookingContracts.test.ts src/lib/publicPortalSecurity.test.ts`: passou.
- `npm test`: passou com 11 arquivos e 52 testes reais.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npm run build`: passou.

Validacoes visuais locais:

- `http://127.0.0.1:5173/portal-aluno`: exibiu o formulario manual do Portal do Aluno sem redirecionar indevidamente.
- `http://127.0.0.1:5173/portal-aluno?ct=abc`: exibiu bloqueio de link invalido.
- `http://127.0.0.1:5173/agendar`: exibiu bloqueio de link de agendamento sem identificador da Arena.
- `http://127.0.0.1:5173/agendar?ct=abc`: exibiu bloqueio de link invalido.
- `http://127.0.0.1:5173/matricula`: exibiu inscricao publica indisponivel, conforme decisao de remover a modalidade antiga.
- O navegador foi devolvido para `http://127.0.0.1:5173/dashboard`.

Observacoes:

- Nenhuma migration SQL foi criada ou executada nesta fase.
- O build manteve apenas os avisos ja conhecidos de chunk grande e import dinamico/estatico do cliente Supabase.
- A Fase 9.7 aumentou a seguranca dos portais sem alterar a experiencia principal dos usuarios autenticados.

Proxima etapa recomendada:

- Fase 9.8: consolidar rotina de regressao profissional, criando um roteiro final de validacao recorrente para antes de deploy.

## Registro da Fase 9.8

Status: concluida com seguranca; rotina profissional de regressao consolidada, documentada e validada de ponta a ponta.

Objetivo:

- Criar uma rotina repetivel para validar o Esportiz antes de deploy, sem depender de memoria e sem expor dados reais.
- Consolidar em um unico comando as validacoes tecnicas obrigatorias.
- Documentar o roteiro manual minimo para Sportiz Sport, Esportiz Arena, portais publicos e protecoes de acesso.

Decisao de seguranca:

- Nenhum dado real foi criado, editado, excluido, baixado ou estornado nesta fase.
- Nenhuma navegacao operacional com criacao de dados foi necessaria, porque o escopo foi rotina de validacao e saneamento tecnico.
- O comando de regressao foi criado usando apenas ferramentas ja existentes no projeto.
- Antes de aceitar a rotina, o `lint` completo foi saneado para nao retornar erros.

Escopo executado:

- Criado `REGRESSAO_PROFISSIONAL.md` com:
  - regra de ouro para nao testar em dados reais;
  - padrao de prefixo `TESTE REGRESSAO`;
  - validacao tecnica obrigatoria;
  - checklist manual base;
  - checklist de Escola Esportiva / Sportiz Sport;
  - checklist de Arena / CT Quadra;
  - checklist de portais publicos;
  - criterios de liberacao e bloqueio de deploy.
- Adicionado `typecheck` ao `package.json`:
  - `tsc -p tsconfig.app.json --noEmit`.
- Adicionado `check:regression` ao `package.json`:
  - `npm run lint && npm run typecheck && npm test && npm run build`.
- Criado `src/lib/errorUtils.ts` para padronizar leitura segura de mensagens de erro.
- Corrigidas dividas de lint que impediam rotina profissional:
  - `src/lib/exportUtils.ts`: removido `any[]` no export CSV;
  - `src/lib/reservationContracts.ts`: removido `any` em pagamentos parciais;
  - `src/pages/LoginPage.tsx`: catches convertidos para `unknown`;
  - `src/pages/ResetPasswordPage.tsx`: catch convertido para `unknown`;
  - `src/pages/SettingsPage.tsx`: catches convertidos para `unknown`;
  - `supabase/functions/google-sync/index.ts`: tipos basicos adicionados para eventos/participantes do Google;
  - `tailwind.config.ts`: substituido `require("tailwindcss-animate")` por import tipado.

Validacoes executadas:

- `npm run lint`: passou sem erros; restam 10 avisos conhecidos de Fast Refresh/estrutura de componentes UI.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npm test`: passou com 11 arquivos e 52 testes reais.
- `npm run build`: passou.
- `npm run check:regression`: passou de ponta a ponta.

Observacoes:

- A primeira execucao do `npm run check:regression` dentro do sandbox falhou no `vitest` com `spawn EPERM`, erro de permissao do ambiente ao iniciar o esbuild.
- A rotina foi repetida com permissao adequada e passou completamente.
- O build manteve apenas os avisos ja conhecidos de chunk grande e import dinamico/estatico do cliente Supabase.
- Os avisos de Fast Refresh no `lint` nao bloqueiam a regressao, mas ficam mapeados para uma futura fase de limpeza estetica/arquitetural de componentes UI.

Proxima etapa recomendada:

- Fase 10: fechamento do ciclo com revisao final de release, checklist de deploy controlado e decisao de publicacao/rollback.

## Registro da Fase 10

Status: concluida com seguranca; ciclo de evolucao controlada fechado com guia de deploy, rollback e validacao final.

Objetivo:

- Consolidar o caminho profissional para publicar o Esportiz sem improviso.
- Definir criterios objetivos de `GO`, `NO-GO` e `GO COM OBSERVACAO`.
- Separar claramente validacao local, migrations, deploy de frontend, smoke test de producao e rollback.
- Garantir que a evolucao das fases anteriores esteja acompanhada de um processo operacional seguro.

Decisao de seguranca:

- Nenhum deploy foi executado nesta fase.
- Nenhuma migration SQL foi criada ou executada nesta fase.
- Nenhum dado real foi criado, editado, excluido, baixado ou estornado.
- A validacao foi tecnica e documental, usando a rotina de regressao consolidada na Fase 9.8.

Escopo executado:

- Criado `DEPLOY_CONTROLADO.md` com:
  - principios de publicacao segura;
  - checklist antes de publicar;
  - cuidados com migrations SQL;
  - sequencia de deploy;
  - criterios de `GO` e `NO-GO`;
  - rollback de frontend;
  - rollback de banco;
  - smoke test de producao somente leitura;
  - comunicacao de incidente;
  - matriz de status de release.
- Confirmado que `REGRESSAO_PROFISSIONAL.md` segue como roteiro de validacao manual antes de deploy.
- Confirmado que `npm run check:regression` segue como comando tecnico unico de liberacao.

Validacoes executadas:

- `npm run check:regression`: passou de ponta a ponta.
- `npm run lint`: passou sem erros; restam 10 avisos conhecidos de Fast Refresh/estrutura de componentes UI.
- `npm run typecheck`: passou sem erros.
- `npm test`: passou com 11 arquivos e 52 testes reais.
- `npm run build`: passou.

Observacoes:

- O build manteve apenas os avisos ja conhecidos de chunk grande e import dinamico/estatico do cliente Supabase.
- Os avisos de Fast Refresh no lint nao bloqueiam deploy, mas seguem mapeados para futura limpeza tecnica de componentes UI.
- O arquivo `public/landing-v2.html` ja estava modificado no worktree antes desta fase e nao foi alterado durante a Fase 10.

Conclusao do ciclo:

- O sistema ficou com:
  - contratos de negocio mais testaveis;
  - portais publicos mais protegidos;
  - financeiro, reservas, comercio e vinculos com testes automatizados;
  - rotina profissional de regressao;
  - guia formal de deploy e rollback.
- A partir daqui, qualquer publicacao deve seguir:
  - `REGRESSAO_PROFISSIONAL.md`;
  - `DEPLOY_CONTROLADO.md`;
  - `npm run check:regression`.

Proxima etapa recomendada:

- Antes de publicar: revisar o diff final, separar alteracoes que devem entrar no release, confirmar migrations ja aplicadas no Supabase e decidir `GO/NO-GO` para deploy.

## Registro da Fase 11.1

Status: concluida com seguranca; comunicacao assistida mapeada sem mudanca de banco, sem automacao real e sem alteracao em dados.

Objetivo:

- Iniciar a evolucao de WhatsApp/comunicacao assistida de forma profissional.
- Mapear os pontos existentes antes de implementar novas funcionalidades.
- Separar Escola Esportiva / Sportiz Sport e Arena / CT Quadra: Esportiz Arena.
- Identificar eventos seguros para mensagens manuais.
- Preparar a Fase 11.2 com contratos testaveis.

Escopo executado:

- Criado `COMUNICACAO_ASSISTIDA_FASE_11.md`.
- Mapeada `CommunicationPage`:
  - comunicacao em massa assistida;
  - publicos por status do aluno/reservante;
  - templates salvos em `niche_settings`;
  - envio manual por `wa.me`.
- Mapeada `BirthdaysPage`:
  - aniversariantes de hoje, semana e mes;
  - mensagem de parabens por WhatsApp.
- Mapeada `ArenaAgendaPage`:
  - comprovante de reserva;
  - cobranca de reserva pendente;
  - link publico de agendamento;
  - modelos customizados de Arena.
- Mapeada `SettingsPage`:
  - templates `booking_confirmation` e `payment_reminder` para Arena.
- Mapeado `StudentPortalPage` como destino seguro para autoatendimento futuro.
- Mapeado `NotificationBell` como fonte interna de eventos, sem envio externo.

Eventos priorizados:

- Sportiz Sport:
  - mensalidade vencida;
  - mensalidade vencendo;
  - aniversariante;
  - experimental;
  - inativo;
  - sem plano;
  - link do portal do aluno;
  - lembrete de treino/aula.
- Esportiz Arena:
  - comprovante de reserva;
  - cobranca de reserva pendente;
  - link de agendamento online;
  - lembrete de reserva do dia;
  - reserva cancelada;
  - pos-jogo com convite para nova reserva.

Riscos mapeados:

- Envio automatico pode gerar bloqueio no WhatsApp.
- Mensagens hoje estao espalhadas em telas diferentes.
- Telefone precisa de normalizacao unica.
- Mensagens financeiras precisam usar valores/status consistentes.
- Links publicos precisam manter escopo seguro por tenant.
- Arena e Escola precisam de textos diferentes por contexto.

Decisao de seguranca:

- A Fase 11.1 nao criou migration.
- A Fase 11.1 nao alterou telas operacionais.
- A Fase 11.1 nao enviou mensagens.
- A Fase 11.1 nao mexeu em dados reais.
- Automacao real fica fora do escopo ate existir opt-in, logs e integracao oficial aprovada.

Proxima etapa recomendada:

- Fase 11.2: criar `src/lib/communicationContracts.ts` e testes, centralizando telefone, URL `wa.me`, templates, variaveis e fallbacks de mensagem antes de mexer na UI.

## Registro da Fase 11.2

Status: concluida com seguranca; contratos puros de comunicacao assistida criados e testados, sem mudanca de banco e sem alteracao de UI.

Objetivo:

- Criar a base tecnica para WhatsApp assistido antes de mexer nas telas.
- Centralizar normalizacao de telefone, template, eventos e URL `wa.me`.
- Separar eventos da Escola Esportiva / Sportiz Sport e Arena / CT Quadra: Esportiz Arena.
- Manter tudo sem efeitos colaterais: sem `window.open`, sem Supabase, sem envio real.

Escopo executado:

- Criado `src/lib/communicationContracts.ts`.
- Criado `src/lib/communicationContracts.test.ts`.
- Contratos implementados:
  - `normalizeWhatsAppPhone`;
  - `isSupportedCommunicationEvent`;
  - `getFirstName`;
  - `buildPixDetails`;
  - `applyCommunicationTemplate`;
  - `getDefaultCommunicationTemplate`;
  - `buildCommunicationMessage`;
  - `buildWhatsAppUrl`;
  - `buildWhatsAppAction`;
  - `buildCommunicationWhatsAppAction`.
- Eventos Sportiz Sport cobertos:
  - `payment_overdue`;
  - `payment_due_soon`;
  - `birthday`;
  - `trial_follow_up`;
  - `inactive_recovery`;
  - `without_plan`;
  - `student_portal_link`;
  - `class_reminder`.
- Eventos Esportiz Arena cobertos:
  - `booking_confirmation`;
  - `payment_reminder`;
  - `booking_link`;
  - `reservation_reminder`;
  - `reservation_cancelled`;
  - `post_game_rebook`.

Validacoes executadas:

- `npm test -- communicationContracts`: passou com 10 testes.
- `npx eslint src/lib/communicationContracts.ts src/lib/communicationContracts.test.ts`: passou sem erros.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.

Decisoes de seguranca:

- Nenhuma migration foi criada.
- Nenhuma tela operacional foi alterada.
- Nenhum dado real foi alterado.
- Nenhuma mensagem foi enviada.
- Automacao real continua fora do escopo.

Proxima etapa recomendada:

- Fase 11.3: padronizar o WhatsApp existente usando `communicationContracts` em `CommunicationPage`, `BirthdaysPage` e `ArenaAgendaPage`, mantendo a experiencia atual e reduzindo duplicacao.

## Registro da Fase 11.3

Status: concluida com seguranca; WhatsApp existente padronizado para usar os contratos de comunicacao assistida, sem migration, sem alteracao de banco e sem envio automatico.

Objetivo:

- Reduzir duplicacao de telefone, URL `wa.me` e substituicao de variaveis nas telas existentes.
- Manter a experiencia atual: o sistema continua apenas abrindo o WhatsApp para o usuario revisar e enviar manualmente.
- Preservar os fluxos ja solidos da Escola Esportiva / Sportiz Sport e Arena / CT Quadra: Esportiz Arena.
- Preparar uma base mais segura para melhorias futuras de UX, como preview, copiar mensagem e validacao visual de telefone.

Escopo executado:

- `src/pages/CommunicationPage.tsx` passou a usar `applyCommunicationTemplate`, `getFirstName` e `buildWhatsAppAction`.
- `src/pages/BirthdaysPage.tsx` passou a usar `buildCommunicationWhatsAppAction` para mensagens de aniversario.
- `src/pages/ArenaAgendaPage.tsx` passou a usar `buildCommunicationMessage` em templates personalizados de confirmacao de reserva e lembrete de pagamento.
- `src/pages/ArenaAgendaPage.tsx` tambem passou a usar `buildWhatsAppAction` para montar a URL do WhatsApp com validacao centralizada.
- Nenhum fluxo foi convertido para envio automatico.
- Nenhuma regra de pagamento, reserva, aluno, plano ou relatorio foi alterada.

Validacoes executadas:

- `npm test -- communicationContracts`: passou com 10 testes.
- `npx eslint src/lib/communicationContracts.ts src/lib/communicationContracts.test.ts src/pages/CommunicationPage.tsx src/pages/BirthdaysPage.tsx src/pages/ArenaAgendaPage.tsx`: passou sem erros.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npm test`: passou com 12 arquivos e 62 testes.
- `npm run build`: passou com build de producao e geracao do PWA.

Observacoes:

- O build manteve apenas os avisos ja conhecidos de import dinamico/estatico do Supabase e tamanho de chunk acima de 500 kB.
- A Fase 11.3 nao exige SQL no Supabase.
- Nao houve alteracao nem exclusao de dados reais.

Proxima etapa recomendada:

- Fase 11.4: melhorar a experiencia operacional da comunicacao assistida com preview de mensagem, botao de copiar, estados de telefone invalido e acabamento responsivo, ainda mantendo envio manual pelo WhatsApp.

## Registro da Fase 11.4

Status: concluida com seguranca; experiencia operacional da comunicacao assistida melhorada, sem migration, sem envio automatico e sem alteracao de dados reais.

Objetivo:

- Dar mais controle antes de abrir o WhatsApp.
- Permitir copiar mensagens prontas sem depender do envio imediato.
- Mostrar quando um telefone esta ausente ou invalido antes da tentativa de envio.
- Melhorar a leitura da mensagem final em telas operacionais.

Escopo executado:

- `src/pages/CommunicationPage.tsx` ganhou preview da mensagem personalizada para o primeiro contato do publico selecionado.
- `src/pages/CommunicationPage.tsx` ganhou botao de copiar preview e botao de copiar por contato.
- `src/pages/CommunicationPage.tsx` passou a destacar contatos sem telefone valido e bloquear o botao de envio nesses casos.
- `src/pages/BirthdaysPage.tsx` ganhou botao de copiar a mensagem de aniversario antes de abrir o WhatsApp.
- `src/pages/ArenaAgendaPage.tsx` ganhou preview do comprovante de reserva dentro do painel de detalhes.
- `src/pages/ArenaAgendaPage.tsx` passou a bloquear visualmente o envio do comprovante quando o reservante nao tem telefone valido.

Validacoes executadas:

- `npx eslint src/lib/communicationContracts.ts src/lib/communicationContracts.test.ts src/pages/CommunicationPage.tsx src/pages/BirthdaysPage.tsx src/pages/ArenaAgendaPage.tsx`: passou sem erros.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npm test`: passou com 12 arquivos e 62 testes.
- `npm run build`: passou com build de producao e geracao do PWA.

Observacoes:

- A Fase 11.4 nao exige SQL no Supabase.
- Nenhum envio real foi automatizado.
- Nenhum dado real foi criado, editado ou excluido.
- A tentativa de conferencia visual no navegador interno foi bloqueada pelo proprio navegador com `ERR_BLOCKED_BY_CLIENT`; as validacoes tecnicas passaram normalmente.
- O build manteve apenas os avisos ja conhecidos de import dinamico/estatico do Supabase e tamanho de chunk acima de 500 kB.

Proxima etapa recomendada:

- Fase 11.5: revisar textos, templates padrao e microcopy operacional por modalidade, mantendo mensagens assistidas e revisaveis antes do envio.

## Registro da Fase 11.5

Status: concluida com seguranca; templates padrao e microcopy operacional revisados por modalidade, sem migration, sem automacao de envio e sem alteracao de dados reais.

Objetivo:

- Melhorar a qualidade dos textos padrao usados na comunicacao assistida.
- Separar melhor a linguagem de Escola Esportiva / Sportiz Sport e Arena / CT Quadra: Esportiz Arena.
- Reduzir mensagens locais duplicadas nas telas.
- Manter todos os envios como assistidos, revisaveis e manuais pelo WhatsApp.

Escopo executado:

- `src/lib/communicationContracts.ts` recebeu templates padrao mais profissionais para Sportiz Sport e Esportiz Arena.
- Adicionado o evento `general_announcement` para comunicacao geral da Escola Esportiva.
- `src/pages/CommunicationPage.tsx` passou a carregar os fallbacks de mensagem diretamente dos contratos centrais.
- `src/pages/BirthdaysPage.tsx` passou a usar o template padrao de aniversario vindo dos contratos.
- `src/pages/SettingsPage.tsx` passou a usar os templates padrao da Arena como placeholders nos modelos de WhatsApp.
- `src/lib/communicationContracts.test.ts` recebeu cobertura para validar linguagem por modalidade e evitar mistura de conceitos, como Arena usando texto de aula.

Validacoes executadas:

- `npm test -- communicationContracts`: passou com 11 testes.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npx eslint src/lib/communicationContracts.ts src/lib/communicationContracts.test.ts src/pages/CommunicationPage.tsx src/pages/BirthdaysPage.tsx src/pages/ArenaAgendaPage.tsx src/pages/SettingsPage.tsx`: passou sem erros.
- `npm test`: passou com 12 arquivos e 63 testes.
- `npm run build`: passou com build de producao e geracao do PWA.

Observacoes:

- A Fase 11.5 nao exige SQL no Supabase.
- Nenhum envio real foi executado.
- Nenhum dado real foi criado, editado ou excluido.
- O build manteve apenas os avisos ja conhecidos de import dinamico/estatico do Supabase e tamanho de chunk acima de 500 kB.

Proxima etapa recomendada:

- Fase 11.6: revisar visualmente as telas de comunicacao e configuracoes com usuario teste, confirmando clareza dos textos, responsividade e comportamento de copiar/abrir WhatsApp.

## Registro da Fase 11.6

Status: concluida com seguranca; revisao visual e operacional realizada com usuario teste, sem criar, editar ou excluir dados reais.

Objetivo:

- Conferir as telas internas afetadas pela comunicacao assistida.
- Validar clareza dos textos, comportamento responsivo e consistencia por modalidade.
- Corrigir inconsistencias visuais/operacionais pequenas encontradas durante a revisao.
- Manter o fluxo de WhatsApp assistido e manual.

Revisao visual executada:

- `src/pages/CommunicationPage.tsx`: conferido preview, copiar, mensagem padrao e lista de disparo.
- `src/pages/BirthdaysPage.tsx`: conferida tela de aniversariantes em perfil teste; carregamento ficou dependente dos dados do ambiente, sem erros no console.
- `src/pages/ArenaAgendaPage.tsx`: conferida tela de agenda em Arena, com botoes de link, recebimentos, bloquear dia e nova reserva.
- `src/pages/SettingsPage.tsx`: conferidos placeholders dos modelos WhatsApp da Arena, com linguagem de reserva/quadra e sem mistura com aula.

Ajuste executado durante a fase:

- Em perfil Arena, `src/pages/CommunicationPage.tsx` passou a esconder publicos especificos da Escola Esportiva, como mensalidade, vencimento, experimental e plano.
- Em perfil Arena, a Comunicacao em Massa passou a exibir apenas publicos compativeis: reservantes ativos e reservantes inativos.
- Em perfil Arena, o fallback da mensagem geral passou a falar de horarios e reservas, nao de aulas ou treinos.

Validacoes executadas:

- `npx eslint src/lib/communicationContracts.ts src/lib/communicationContracts.test.ts src/pages/CommunicationPage.tsx src/pages/BirthdaysPage.tsx src/pages/ArenaAgendaPage.tsx src/pages/SettingsPage.tsx`: passou sem erros.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npm test`: passou com 12 arquivos e 63 testes.
- `npm run build`: passou com build de producao e geracao do PWA.

Observacoes:

- A Fase 11.6 nao exige SQL no Supabase.
- Nenhum envio real foi executado.
- Nenhum dado real foi criado, editado ou excluido.
- O build manteve apenas os avisos ja conhecidos de import dinamico/estatico do Supabase e tamanho de chunk acima de 500 kB.

Proxima etapa recomendada:

- Fase 11.7: preparar checklist final de aceite da comunicacao assistida por modalidade antes de deploy, incluindo testes manuais com usuario teste.

## Registro da Fase 11.7

Status: concluida com seguranca; checklist final de aceite da comunicacao assistida criado e registrado, sem alteracao de banco, sem envio real e sem alteracao de dados reais.

Objetivo:

- Transformar a revisao da Fase 11 em um roteiro repetivel de aceite.
- Separar criterios de aceite para Sportiz Sport e Esportiz Arena.
- Definir claramente o que libera e o que bloqueia deploy.
- Preservar a regra de comunicacao assistida, manual e revisavel.

Escopo executado:

- Criado `COMUNICACAO_ASSISTIDA_ACEITE_FASE_11_7.md`.
- Atualizado `COMUNICACAO_ASSISTIDA_FASE_11.md` com a subfase 11.7.
- Documentado checklist geral de aceite.
- Documentado checklist especifico para Escola Esportiva / Sportiz Sport.
- Documentado checklist especifico para Arena / CT Quadra: Esportiz Arena.
- Documentado smoke test sem dados reais.
- Documentados criterios GO/NO-GO antes de deploy.

Validacoes executadas:

- Mudanca documental, sem necessidade de migration.
- Nenhum envio real foi executado.
- Nenhum dado real foi criado, editado ou excluido.

Proxima etapa recomendada:

- Rodar o checklist de aceite com usuario teste e, se tudo passar, decidir GO/NO-GO para deploy controlado.

## Registro da Fase 11.8

Status: concluida com seguranca; pacote final de deploy da comunicacao assistida revisado com smoke test, validacoes tecnicas completas e decisao GO.

Objetivo:

- Executar o checklist final da Fase 11 com usuario teste logado.
- Validar os fluxos principais sem criar, editar ou excluir dados reais.
- Rodar as validacoes tecnicas completas antes de liberar deploy.
- Revisar diff e riscos conhecidos.
- Emitir uma decisao objetiva de GO/NO-GO.

Smoke test executado:

- `/comunicacao` em perfil Arena:
  - preview visivel;
  - botao copiar em estado correto sem contatos;
  - texto padrao falando de horarios e reservas;
  - seletor exibindo apenas reservantes ativos e inativos;
  - opcoes de Escola, como mensalidade, experimentais e pacotes, ausentes.
- `/agenda` em perfil Arena:
  - Agenda carregou;
  - Link de Agendamento visivel;
  - Recebimentos visivel;
  - Bloquear Dia visivel;
  - Nova Reserva visivel.
- `/configuracoes` em perfil Arena:
  - Modelos de Mensagem do WhatsApp visiveis;
  - placeholder de confirmacao de reserva com quadra/data/horario/valor;
  - placeholder de cobranca falando de reserva;
  - sem linguagem de aula nos modelos da Arena.
- Console do navegador:
  - sem erros registrados durante o smoke test.

Validacoes tecnicas executadas:

- `npx eslint src/lib/communicationContracts.ts src/lib/communicationContracts.test.ts src/pages/CommunicationPage.tsx src/pages/BirthdaysPage.tsx src/pages/ArenaAgendaPage.tsx src/pages/SettingsPage.tsx`: passou sem erros.
- `npx tsc -p tsconfig.app.json --noEmit`: passou sem erros.
- `npm test`: passou com 12 arquivos e 63 testes.
- `npm run build`: passou com build de producao e geracao do PWA.
- `git diff --check`: passou sem erros de whitespace.

Riscos conhecidos:

- O build ainda mostra os avisos ja conhecidos de import dinamico/estatico do Supabase e tamanho de chunk acima de 500 kB.
- Estes avisos ja estavam mapeados e nao bloqueiam este deploy.
- Nao ha migration pendente nesta fase.

Decisao:

- GO para deploy controlado da Fase 11.
- Condicao: apos deploy, executar smoke test rapido em producao nas rotas `/comunicacao`, `/agenda` e `/configuracoes` com usuario teste, sem criar dados reais.

Proxima etapa recomendada:

- Executar deploy controlado e validar producao com o mesmo roteiro de smoke test.
