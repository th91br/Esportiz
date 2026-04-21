const fs = require('fs');

let html = fs.readFileSync('public/landing.html', 'utf8');

const newCss = `
/* HERO REBUILT DASHBOARD MOCKUP */
.hero-mockup-wrapper {
  position: relative;
  width: 100%;
  max-width: 900px;
  animation: float 6s ease-in-out infinite;
  will-change: transform;
}
.hero-mockup {
  background: #0D1F3C;
  border-radius: 20px;
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 40px 100px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.hm-bar {
  background: rgba(255,255,255,0.03);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  position: relative;
}
.hm-dots { display: flex; gap: 8px; }
.hm-dots span { width: 12px; height: 12px; border-radius: 50%; }
.hm-dots .r { background: #FF5F57; }
.hm-dots .y { background: #FEBC2E; }
.hm-dots .g { background: #28C840; }
.hm-url {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255,255,255,0.05);
  padding: 4px 16px;
  border-radius: 6px;
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  letter-spacing: 0.5px;
}
.hm-body {
  display: flex;
  height: 520px;
  background: #0A1628;
}
.hm-sidebar {
  width: 60px;
  border-right: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  gap: 16px;
}
.hm-logo {
  width: 32px;
  height: 32px;
  background: #1DB874;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  color: #0A1628;
  font-size: 18px;
  margin-bottom: 12px;
}
.hm-nav-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.4);
}
.hm-nav-icon.active {
  background: rgba(29,184,116,0.15);
  color: #1DB874;
}
.hm-main {
  flex: 1;
  padding: 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.hm-header { display: flex; flex-direction: column; gap: 4px; }
.hm-welcome { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: #fff; }
.hm-date { font-size: 12px; color: rgba(255,255,255,0.35); }

.hm-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.hm-stat-card {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 16px;
}
.hm-stat-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  margin-bottom: 8px;
}
.hm-stat-icon { font-size: 14px; }
.hm-stat-val { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; line-height: 1; margin-bottom: 4px; }
.hm-stat-desc { font-size: 10px; color: rgba(255,255,255,0.35); }

.hm-2cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.hm-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 16px;
}
.hm-card-title {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  margin-bottom: 12px;
}
.hm-pr-row { margin-bottom: 10px; }
.hm-pr-top { display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px; }
.hm-pr-bar { height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; }
.hm-pr-fill { height: 100%; border-radius: 3px; }

.hm-student-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.hm-student-row:last-child { border-bottom: none; padding-bottom: 0; }
.hm-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: 13px;
}
.hm-s-info { flex: 1; }
.hm-s-name { font-size: 13px; font-weight: 600; color: #fff; }
.hm-s-plan { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }
.hm-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 100px;
}

@media(max-width: 768px) {
  .hero-mockup-wrapper { display: none; /* Might want to show a simplified version or just image on mobile, but let's keep it responsive */ }
}
`;

if(!html.includes('.hero-mockup-wrapper')) {
  html = html.replace('</style>', newCss + '\n</style>');
}

const newMockupHtml = `
    <div class="hero-mockup-wrapper reveal">
      <div class="hero-mockup">
        <!-- Window bar -->
        <div class="hm-bar">
          <div class="hm-dots">
            <span class="r"></span><span class="y"></span><span class="g"></span>
          </div>
          <div class="hm-url">esportiz.com.br</div>
        </div>
        
        <div class="hm-body">
          <!-- Sidebar -->
          <div class="hm-sidebar">
            <div class="hm-logo">E</div>
            <div class="hm-nav-icon active">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
            </div>
            <div class="hm-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div class="hm-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div class="hm-nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
          </div>
          
          <!-- Main Content -->
          <div class="hm-main">
            <!-- Header -->
            <div class="hm-header">
              <div class="hm-welcome">Bom dia, Professor 👋</div>
              <div class="hm-date">Segunda-feira, 14 de abril de 2025</div>
            </div>
            
            <!-- Stats -->
            <div class="hm-stats-grid">
              <div class="hm-stat-card">
                <div class="hm-stat-top"><span>Alunos Ativos</span><span class="hm-stat-icon">👤</span></div>
                <div class="hm-stat-val" style="color:#1DB874;">48</div>
                <div class="hm-stat-desc">alunos matriculados</div>
              </div>
              <div class="hm-stat-card">
                <div class="hm-stat-top"><span>Receita do Mês</span><span class="hm-stat-icon">💰</span></div>
                <div class="hm-stat-val" style="color:#fff;">R$ 6.240</div>
                <div class="hm-stat-desc">abril 2025</div>
              </div>
              <div class="hm-stat-card">
                <div class="hm-stat-top"><span>Presença Média</span><span class="hm-stat-icon">✅</span></div>
                <div class="hm-stat-val" style="color:#5BA3F5;">94%</div>
                <div class="hm-stat-desc">últimos 30 dias</div>
              </div>
              <div class="hm-stat-card">
                <div class="hm-stat-top"><span>Inadimplentes</span><span class="hm-stat-icon">⚠️</span></div>
                <div class="hm-stat-val" style="color:#FEBC2E;">3</div>
                <div class="hm-stat-desc">pagamentos em atraso</div>
              </div>
            </div>
            
            <!-- 2 Cols -->
            <div class="hm-2cols">
              <div class="hm-card">
                <div class="hm-card-title">PRESENÇA POR TURMA</div>
                
                <div class="hm-pr-row">
                  <div class="hm-pr-top"><span>Futevôlei Iniciante</span><span>92%</span></div>
                  <div class="hm-pr-bar"><div class="hm-pr-fill" style="width:92%; background:#1DB874;"></div></div>
                </div>
                <div class="hm-pr-row">
                  <div class="hm-pr-top"><span>Beach Tennis Avançado</span><span>87%</span></div>
                  <div class="hm-pr-bar"><div class="hm-pr-fill" style="width:87%; background:#378ADD;"></div></div>
                </div>
                <div class="hm-pr-row">
                  <div class="hm-pr-top"><span>Kids & Teens</span><span>100%</span></div>
                  <div class="hm-pr-bar"><div class="hm-pr-fill" style="width:100%; background:#1DB874;"></div></div>
                </div>
                <div class="hm-pr-row" style="margin-bottom:0;">
                  <div class="hm-pr-top"><span>Weekend Warriors</span><span>71%</span></div>
                  <div class="hm-pr-bar"><div class="hm-pr-fill" style="width:71%; background:#5BA3F5;"></div></div>
                </div>
              </div>
              
              <div class="hm-card">
                <div class="hm-card-title" style="text-transform:none; color:rgba(255,255,255,0.7); margin-bottom:4px;">Receita Mensal</div>
                <div style="font-family:'Syne',sans-serif; font-size:24px; font-weight:700; color:#fff; margin-bottom:2px;">R$ 6.240</div>
                <div style="font-size:11px; color:#1DB874; margin-bottom:12px;">+12% vs março</div>
                
                <!-- Mini Chart -->
                <div style="height:50px; position:relative; overflow:hidden;">
                  <svg viewBox="0 0 200 50" preserveAspectRatio="none" style="width:100%; height:100%;">
                    <path d="M0,50 L0,40 C50,40 50,30 100,20 C150,10 150,5 200,0 L200,50 Z" fill="rgba(29,184,116,0.1)"></path>
                    <path d="M0,40 C50,40 50,30 100,20 C150,10 150,5 200,0" fill="none" stroke="#1DB874" stroke-width="2"></path>
                  </svg>
                </div>
              </div>
            </div>
            
            <!-- Alunos Recentes -->
            <div class="hm-card">
              <div class="hm-card-title" style="text-transform:none; color:#fff; font-size:13px;">Alunos Recentes</div>
              
              <div class="hm-student-row">
                <div class="hm-avatar" style="background:rgba(29,184,116,0.2); color:#1DB874;">L</div>
                <div class="hm-s-info">
                  <div class="hm-s-name">Lucas Andrade</div>
                  <div class="hm-s-plan">Plano Mensal · R$ 130</div>
                </div>
                <div class="hm-badge" style="color:#1DB874; background:rgba(29,184,116,0.15);">Pago</div>
              </div>
              
              <div class="hm-student-row">
                <div class="hm-avatar" style="background:rgba(55,138,221,0.2); color:#5BA3F5;">M</div>
                <div class="hm-s-info">
                  <div class="hm-s-name">Marina Costa</div>
                  <div class="hm-s-plan">Plano Trimestral · R$ 350</div>
                </div>
                <div class="hm-badge" style="color:#1DB874; background:rgba(29,184,116,0.15);">Pago</div>
              </div>
              
              <div class="hm-student-row">
                <div class="hm-avatar" style="background:rgba(254,188,46,0.2); color:#FEBC2E;">P</div>
                <div class="hm-s-info">
                  <div class="hm-s-name">Pedro Souza</div>
                  <div class="hm-s-plan">Plano Mensal · R$ 130</div>
                </div>
                <div class="hm-badge" style="color:#FEBC2E; background:rgba(254,188,46,0.15);">Pendente</div>
              </div>
              
            </div>
            
          </div>
        </div>
      </div>
    </div>`;

const regex = /<div class="mockup-wrap reveal">[\s\S]*?<\/div>\s*<\/div>/;
html = html.replace(regex, newMockupHtml);

fs.writeFileSync('public/landing.html', html, 'utf8');
console.log("Hero Dashboard Mockup replaced successfully!");
