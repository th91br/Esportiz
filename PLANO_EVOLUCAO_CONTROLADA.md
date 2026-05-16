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
