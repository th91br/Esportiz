# Comunicacao Assistida - Fase 11

Este documento organiza a evolucao de WhatsApp e comunicacao assistida no Esportiz. A diretriz e entregar valor rapido sem automacao agressiva, sem envio em massa automatico e sem risco de bloqueio de conta WhatsApp.

## Fase 11.1 - Mapeamento Profissional

Status: mapeada, sem mudanca de banco e sem automacao real.

Objetivo:

- Mapear os pontos atuais de comunicacao.
- Identificar eventos seguros por modalidade.
- Definir contratos de mensagem para as proximas subfases.
- Evitar duplicacao de logica ja existente.
- Preparar a Fase 11.2 com baixo risco.

## Pontos Atuais Encontrados

### Escola Esportiva / Sportiz Sport

- `src/pages/CommunicationPage.tsx`
  - Comunicacao em massa via WhatsApp assistido.
  - Publicos atuais:
    - todos ativos;
    - inadimplentes;
    - vencendo nos proximos 7 dias;
    - experimentais;
    - sem plano;
    - inativos.
  - Ja usa variaveis:
    - `{nome}`;
    - `{nome_completo}`;
    - `{escola}`;
    - `{chave_pix}`;
    - `{beneficiario_pix}`.
  - Ja salva modelos por nicho em `profile.niche_settings`.
  - Envio e manual, abrindo `wa.me`, o que e correto para evitar anti-spam.

- `src/pages/BirthdaysPage.tsx`
  - Lista aniversariantes de hoje, semana e mes.
  - Abre WhatsApp com mensagem pronta.
  - Hoje a mensagem e fixa e nao usa um contrato central.

- `src/components/StudentCard.tsx`
  - Copia link do portal do aluno.
  - Exibe telefone e e-mail acionaveis.

- `src/pages/StudentPortalPage.tsx`
  - Aluno/responsavel consulta frequencia, pagamentos e Pix.
  - Pode ser usado em mensagens futuras como link seguro de autoatendimento.

### Arena / CT Quadra: Esportiz Arena

- `src/pages/ArenaAgendaPage.tsx`
  - Copia link publico de agendamento.
  - Gera comprovante de reserva.
  - Compartilha comprovante via WhatsApp.
  - Gera cobranca de reserva pendente por WhatsApp.
  - Usa modelos de mensagem em `profile.niche_settings.arena.templates`.

- `src/pages/SettingsPage.tsx`
  - Configura modelos de WhatsApp para Arena:
    - `booking_confirmation`;
    - `payment_reminder`.
  - Usa variaveis:
    - `{nome}`;
    - `{escola}`;
    - `{quadra}`;
    - `{data}`;
    - `{hora}`;
    - `{valor}`;
    - `{chave_pix}`;
    - `{beneficiario_pix}`.

- `src/pages/OnlineBookingPage.tsx`
  - Coleta telefone do reservante no agendamento publico.
  - Informa que pagamento/Pix deve ser tratado via atendimento.

### Pontos Compartilhados

- `src/components/NotificationBell.tsx`
  - Notificacoes internas de horarios/treinos, pagamentos e aniversarios.
  - Nao envia mensagem externa.
  - Pode alimentar eventos futuros, mas nao deve disparar WhatsApp sozinho.

- `src/hooks/useBusinessContext.ts`
  - Define labels e modulos por modalidade.
  - Comunicacao aparece no menu da escola, mas nao no menu da Arena.

## Eventos Seguros Para Comunicacao Assistida

Eventos seguros significam: o sistema apenas monta a mensagem e abre/copia para WhatsApp, sem envio automatico.

### Sportiz Sport

Prioridade alta:

- mensalidade vencida;
- mensalidade vencendo;
- aniversariante;
- aluno experimental;
- aluno inativo;
- aluno sem plano;
- link do portal do aluno;
- lembrete de treino/aula.

Prioridade media:

- comunicado para turma;
- aviso de alteracao de horario;
- confirmacao de plano;
- lembrete de Pix.

### Esportiz Arena

Prioridade alta:

- comprovante de reserva;
- cobranca de reserva pendente;
- link de agendamento online;
- lembrete de reserva do dia;
- reserva cancelada;
- pos-jogo com convite para nova reserva.

Prioridade media:

- horarios vagos do dia;
- campanha para clientes recorrentes;
- aviso de pagamento parcial;
- comprovante de comanda/venda.

## Riscos Mapeados

- Envio automatico pode gerar bloqueio no WhatsApp.
- Mensagens espalhadas em varias telas podem ficar inconsistentes.
- Links publicos precisam manter `ct` seguro e nunca expor outro tenant.
- Telefone precisa ser normalizado de forma unica.
- Mensagem financeira precisa evitar divergencia de valor, Pix e status.
- Arena e Escola nao devem compartilhar textos sem considerar o contexto da modalidade.

## Decisao de Arquitetura Recomendada

Criar na Fase 11.2 um contrato puro, testavel, sem banco:

- `src/lib/communicationContracts.ts`

Responsabilidades:

- normalizar telefone para WhatsApp;
- montar URL `wa.me`;
- definir variaveis aceitas por template;
- aplicar template com fallback seguro;
- gerar mensagens padrao por evento e modalidade;
- impedir mensagem vazia;
- impedir telefone invalido;
- manter todo envio como assistido/manual.

Testes recomendados:

- `src/lib/communicationContracts.test.ts`

Coberturas:

- telefone com/sem DDI 55;
- telefone invalido;
- substituicao de variaveis;
- fallback por evento;
- mensagens de pagamento com Pix;
- mensagens de reserva com quadra/data/hora/valor;
- mensagens de aniversario;
- URL `wa.me` codificada corretamente.

## Subfases Recomendadas

### Fase 11.2 - Contratos de Comunicacao

- Criar `communicationContracts`.
- Cobrir com testes.
- Nao alterar UI ainda.
- Nao criar migration.

### Fase 11.3 - Padronizar WhatsApp Existente

- Usar contratos em:
  - `CommunicationPage`;
  - `BirthdaysPage`;
  - `ArenaAgendaPage`.
- Manter experiencia atual.
- Remover duplicacao de formatacao de telefone e URL.

### Fase 11.4 - Melhorar UX de Comunicacao Assistida

- Adicionar preview da mensagem.
- Adicionar copiar mensagem.
- Adicionar botao abrir WhatsApp.
- Exibir telefone invalido com clareza.
- Melhorar estados mobile.

### Fase 11.5 - Eventos Contextuais Sem Automacao

- Adicionar botoes em pontos naturais:
  - Pagamentos;
  - Portal do aluno;
  - Reservas da Arena;
  - Alunos/reservantes.
- Sempre assistido/manual.

### Fase 11.6 - Preparar Automacoes Futuras

- Apenas desenho tecnico.
- Sem disparo automatico ate existir opt-in, logs, configuracao de horario e integracao oficial aprovada.

### Fase 11.7 - Checklist Final de Aceite

- Formalizar checklist de aceite por modalidade.
- Confirmar GO/NO-GO antes de deploy.
- Registrar validacoes tecnicas obrigatorias.
- Garantir que comunicacao continua assistida, manual e revisavel.
- Documento criado: `COMUNICACAO_ASSISTIDA_ACEITE_FASE_11_7.md`.

## Criterios de Sucesso

- Nenhum envio automatico real.
- Nenhuma migration na Fase 11.1.
- Nenhuma alteracao em dados reais.
- Mensagens mapeadas por modalidade.
- Proxima fase pronta para implementacao pequena e testavel.

## Recomendacao

Avancar para a Fase 11.2 antes de mexer em telas. O ganho sera criar uma base unica e testada para WhatsApp, reduzindo risco e preparando melhorias visuais com mais seguranca.
