# Plano de Evolucao Controlada - Sistema Esportiz

## Objetivo

Evoluir o Esportiz em fases pequenas, auditaveis e reversiveis, preservando funcionalidades existentes enquanto fortalecemos seguranca, consistencia operacional, sincronizacao de dados, responsividade e confiabilidade dos fluxos criticos.

## Principios de Trabalho

- Preservar comportamento existente sempre que possivel.
- Alterar uma area critica por vez.
- Evitar refatoracoes amplas sem necessidade direta.
- Manter regras financeiras, estoque, reservas e matriculas validadas no servidor/banco.
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
- Alternancia de tipo de negocio: escola esportiva, arena e outros.

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

- Matricula online.
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

- Link de matricula abre com `ct`.
- Link de matricula invalido mostra erro amigavel.
- Matricula cria aluno no tenant correto.
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
- Matricula publica chama geracao de pagamentos dependente de `auth.uid()`.
- Fechamento e reabertura de comandas fazem operacoes financeiras em multiplas chamadas client-side.
- Reserva online precisa de protecao transacional contra concorrencia.
- RBAC existe como base, mas ainda nao foi aplicado nas policies principais.
- Testes automatizados ainda nao cobrem fluxos criticos.

## Roadmap de Fases

Fase 1: Alinhar codigo, tipos e documentacao.

Fase 2: Fortalecer seguranca dos portais publicos.

Fase 3: Transacionar comandas, vendas e estoque.

Fase 4: Tornar reservas online seguras contra conflito real.

Fase 5: Profissionalizar matricula online.

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
- Portal de matricula passou a validar dados antes de chamar RPC e a enviar dados normalizados.
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
- A Fase 5 deve profissionalizar a matricula online, incluindo geracao financeira publica de forma especifica por aluno/tenant.
