# Checklist de Aceite - Comunicacao Assistida Fase 11.7

Este checklist deve ser usado antes de liberar para producao qualquer alteracao relacionada a comunicacao assistida, WhatsApp, templates, copiar mensagem, comprovantes ou cobrancas manuais.

Diretriz principal:

- O sistema monta, mostra, copia ou abre a mensagem no WhatsApp.
- O envio continua manual, feito pelo operador.
- Nenhum disparo automatico deve acontecer sem uma fase futura especifica, opt-in claro, logs e aprovacao tecnica.

## Criterios Gerais de Aceite

- Nao existe envio automatico de WhatsApp.
- Nao existe job, timer, cron ou trigger disparando mensagem externa.
- Telefone invalido ou ausente nao deve abrir WhatsApp.
- Mensagem vazia nao deve abrir WhatsApp.
- O operador consegue revisar a mensagem antes de enviar.
- Botoes de copiar nao alteram dados do sistema.
- Templates respeitam a modalidade ativa.
- Arena nao deve exibir texto de aula, treino, mensalidade ou aluno.
- Escola Esportiva nao deve exibir texto de quadra/reserva quando o fluxo for de aluno.
- Pix aparece somente quando configurado e quando o template/evento permite.
- Nenhum dado real deve ser criado, alterado ou excluido durante o teste de aceite, exceto em usuario teste.

## Sportiz Sport - Escola Esportiva

Validar em perfil teste de Escola Esportiva:

- A tela de Comunicacao abre corretamente.
- Publicos esperados aparecem:
  - todos ativos;
  - inadimplentes;
  - vencendo nos proximos 7 dias;
  - experimentais;
  - sem plano;
  - inativos.
- Preview usa linguagem de aluno/aula/treino.
- Botao copiar preview funciona quando ha contato.
- Botao copiar por contato funciona quando ha contato.
- Botao enviar abre WhatsApp somente com telefone valido.
- Contato sem telefone ou telefone invalido aparece com bloqueio visual.
- Aniversariantes exibem botao copiar e parabenizar.
- Mensagem de aniversario usa linguagem de Escola Esportiva.
- Nenhuma mensagem de Escola fala de quadra/reserva como fluxo principal.

## Esportiz Arena - Arena / CT Quadra

Validar em perfil teste de Arena:

- A tela de Comunicacao abre corretamente.
- Publicos esperados aparecem somente:
  - reservantes ativos;
  - reservantes inativos.
- Publicos indevidos nao aparecem:
  - mensalidade atrasada;
  - vencendo nos proximos 7 dias;
  - experimental;
  - sem plano/pacote.
- Preview usa linguagem de horarios e reservas.
- Botao copiar preview funciona quando ha contato.
- Botao copiar por contato funciona quando ha contato.
- Botao enviar abre WhatsApp somente com telefone valido.
- Agenda exibe Link de Agendamento, Recebimentos, Bloquear Dia e Nova Reserva.
- Comprovante de reserva mostra preview quando existe reserva selecionada.
- Comprovante de reserva fala em quadra, data, horario, valor e pagamento.
- Cobranca de reserva pendente usa linguagem de reserva, nao de mensalidade escolar.
- Configuracoes exibem placeholders profissionais para:
  - confirmacao de horario;
  - lembrete de cobranca/recebimentos.

## Smoke Test Sem Dados Reais

Executar antes de deploy:

- Abrir `/comunicacao`.
- Conferir publico e texto conforme modalidade.
- Abrir seletor de publico e verificar opcoes corretas.
- Conferir preview.
- Conferir botao copiar em estado habilitado ou desabilitado conforme dados.
- Abrir `/agenda` em Arena.
- Conferir botoes principais.
- Abrir `/configuracoes` em Arena.
- Conferir placeholders de WhatsApp.
- Abrir `/aniversariantes` em Escola Esportiva quando houver usuario teste adequado.

## Validacoes Tecnicas

Obrigatorias antes de deploy:

- `npx eslint src/lib/communicationContracts.ts src/lib/communicationContracts.test.ts src/pages/CommunicationPage.tsx src/pages/BirthdaysPage.tsx src/pages/ArenaAgendaPage.tsx src/pages/SettingsPage.tsx`
- `npx tsc -p tsconfig.app.json --noEmit`
- `npm test`
- `npm run build`

Aceitavel:

- Aviso conhecido de import dinamico/estatico do Supabase no build.
- Aviso conhecido de chunk acima de 500 kB no build.

Bloqueia deploy:

- Erro de TypeScript.
- Erro de ESLint nos arquivos tocados.
- Teste quebrado.
- Build quebrado.
- Qualquer tela de Arena exibindo aula/mensalidade como fluxo principal.
- Qualquer tela de Escola exibindo reserva/quadra como fluxo principal de aluno.
- Qualquer envio automatico real.

## Decisao GO / NO-GO

GO quando:

- Checklist visual passou em perfil teste.
- Validacoes tecnicas passaram.
- Nao houve migration pendente.
- Nao houve alteracao de dados reais.
- O operador continua revisando a mensagem antes do envio.

NO-GO quando:

- Existe qualquer duvida sobre envio automatico.
- Existe mistura de linguagem entre Arena e Escola.
- Existe erro de build, teste, lint ou typecheck.
- Existe comportamento diferente entre local e producao que nao foi explicado.

## Observacao Final

A comunicacao assistida da Fase 11 esta pronta para evoluir com seguranca enquanto permanecer manual, revisavel e separada por modalidade. Automacoes futuras devem ser tratadas em outra fase, com desenho especifico de consentimento, logs, limites, opt-in e integracao oficial.
