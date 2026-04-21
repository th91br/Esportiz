const fs = require('fs');

let html = fs.readFileSync('public/landing.html', 'utf8');

// Inject Zebra CSS
const zebraCSS = `
/* ZEBRA LAYOUT CSS */
.zebra-section { padding: 80px 0; }
.zebra-row { display: flex; align-items: center; gap: 60px; margin-bottom: 100px; }
.zebra-row:nth-child(even) { flex-direction: row-reverse; }
.zebra-text { flex: 1; }
.zebra-img-wrap { flex: 1.2; position: relative; }
.zebra-title { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; margin-bottom: 16px; letter-spacing: -0.5px; }
.zebra-desc { font-size: 16px; color: rgba(255,255,255,0.7); line-height: 1.6; margin-bottom: 24px; }
.zebra-list { list-style: none; padding: 0; margin: 0; }
.zebra-list li { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; font-size: 15px; color: rgba(255,255,255,0.85); }
.zebra-icon { color: #1DB874; flex-shrink: 0; margin-top: 2px; }
.zebra-mockup { background: linear-gradient(180deg, rgba(10,22,40,0.95) 0%, rgba(13,26,48,0.98) 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04); }
.zebra-mockup-bar { background: rgba(255,255,255,0.03); padding: 14px 18px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); }
@media(max-width: 992px) { .zebra-row { flex-direction: column !important; gap: 40px; margin-bottom: 80px; } .zebra-title { font-size: 28px; } }
`;

if(!html.includes('.zebra-section')) {
    html = html.replace('</style>', zebraCSS + '\n</style>');
}

// Generate the Zebra sections HTML
const generateRow = (title, desc, items, imgSrc) => `
    <div class="zebra-row reveal">
      <div class="zebra-text">
        <h3 class="zebra-title">${title}</h3>
        <p class="zebra-desc">${desc}</p>
        <ul class="zebra-list">
          ${items.map(i => `<li><svg class="zebra-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>${i}</li>`).join('')}
        </ul>
      </div>
      <div class="zebra-img-wrap">
        <div class="zebra-mockup">
          <div class="zebra-mockup-bar">
            <span class="dot-r"></span><span class="dot-y"></span><span class="dot-g"></span>
          </div>
          <img src="${imgSrc}" alt="${title}" style="width: 100%; display: block;" loading="lazy" />
        </div>
      </div>
    </div>
`;

const newSectionHtml = `
<!-- FUNCIONALIDADES ZEBRA -->
<section class="section zebra-section" id="funcionalidades">
  <div class="container">
    <div class="section-header" style="margin-bottom: 80px;">
      <div class="badge reveal">Produto Real</div>
      <h2 class="reveal">Conheça o sistema <span class="grad">por dentro.</span></h2>
    </div>

    ${generateRow(
        'Dashboard Inteligente',
        'Tenha a visão completa do seu Centro de Treinamento em uma única tela, com métricas que importam atualizadas em tempo real.',
        ['Acompanhe alunos ativos e taxas de presença.', 'Monitore a receita mensal e pagamentos pendentes.', 'Visualize treinos do dia e aniversariantes.'],
        '/screens/dashboard.png'
    )}
    
    ${generateRow(
        'Agenda Esportiva',
        'Nunca mais perca o controle das suas turmas. Um calendário visual e intuitivo feito sob medida para escolas esportivas.',
        ['Visualização flexível: dia, semana ou mês.', 'Gerencie modalidades, turmas e horários facilmente.', 'Limites de vagas e acompanhamento de lotação.'],
        '/screens/calendario.png'
    )}
    
    ${generateRow(
        'Gestão de Alunos',
        'Todos os dados dos seus alunos organizados, acessíveis e seguros. Fim das fichas de papel e planilhas confusas.',
        ['Perfil completo com foto, nível e dados de contato.', 'Vínculo fácil com planos e datas de vencimento.', 'Histórico detalhado de presença e pagamentos.'],
        '/screens/alunos.png'
    )}
    
    ${generateRow(
        'Chamada Rápida',
        'Registre a presença dos alunos diretamente pelo celular ou tablet, na quadra ou na areia, em poucos segundos.',
        ['Lista de alunos por treino gerada automaticamente.', 'Marcação de presença com apenas um toque.', 'Estatísticas precisas de assiduidade.'],
        '/screens/presenca.png'
    )}
    
    ${generateRow(
        'Planos e Pagamentos',
        'Controle financeiro automatizado para acabar com a inadimplência e o constrangimento das cobranças manuais.',
        ['Crie planos mensais, trimestrais ou avulsos.', 'Acompanhe quem pagou, atrasados e pendentes.', 'Renovação e faturamento automatizados.'],
        '/screens/pagamentos.png'
    )}
    
    ${generateRow(
        'Relatórios Analíticos',
        'Dados claros e objetivos que transformam a gestão da sua escola e ajudam nas decisões de negócio.',
        ['Métricas de faturamento e engajamento.', 'Comparativo de receitas e assiduidade.', 'Filtros rápidos: hoje, semana, mês e ano.'],
        '/screens/relatorios.png'
    )}

  </div>
</section>
`;

const regex = /<!-- COMO FUNCIONA -->[\s\S]*?<!-- PARA QUEM -->/;
html = html.replace(regex, newSectionHtml + '\n\n<!-- PARA QUEM -->');

fs.writeFileSync('public/landing.html', html, 'utf8');
console.log("Features updated!");
