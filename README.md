# 🚀 Esportiz - Gestão Esportiva Inteligente

![Esportiz Banner](https://img.shields.io/badge/Esportiz-SaaS-blueviolet?style=for-the-badge&logo=react)
![Status](https://img.shields.io/badge/Status-Beta%20Ativo-green?style=for-the-badge)
![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)

O **Esportiz** é uma plataforma SaaS (Software as a Service) de alta performance, desenvolvida para transformar a gestão de escolas e arenas de esportes de areia (Beach Tennis, Futevôlei, Vôlei de Praia). Unindo design premium e funcionalidades robustas, o sistema centraliza o controle operacional e financeiro em uma única interface PWA.

---

## 💎 Diferenciais do Sistema

*   **Experiência Premium:** UI/UX moderna com suporte a *Dark Mode*, micro-animações e foco em usabilidade mobile.
*   **Segurança Multi-tenant:** Isolamento de dados garantido por políticas de *Row Level Security* (RLS) do Supabase.
*   **Offline Ready (PWA):** Instalável em dispositivos móveis para acesso rápido na beira da quadra.
*   **Automação:** Sincronização inteligente com Google Calendar e gestão automatizada de cobranças.

---

## 🛠️ Stack Tecnológica

### Frontend
- **Framework:** [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Componentes:** [Shadcn/UI](https://ui.shadcn.com/) (baseado em Radix UI)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Gerenciamento de Dados:** [TanStack Query (React Query) v5](https://tanstack.com/query/latest)

### Backend & Infra
- **BaaS:** [Supabase](https://supabase.com/) (PostgreSQL, Auth, Edge Functions)
- **Hospedagem:** [Vercel](https://vercel.com/)
- **PWA:** [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)

---

## 📦 Módulos e Funcionalidades

### 1. 📊 Dashboard & Analytics
- Visão geral de faturamento mensal e recebimentos.
- Métricas de alunos ativos, inativos e sem plano.
- Alertas de aniversariantes e pendências financeiras.

### 2. 👥 Gestão de Alunos (CRM)
- Cadastro completo com controle de status.
- Histórico de frequências e evolução.
- Painel de aniversariantes com integração para WhatsApp.

### 3. 📅 Calendário & Presença
- Agendamento dinâmico de treinos.
- Controle de chamadas em tempo real.
- **Integração Google Calendar:** Sincronização de sessões de treino.

### 4. 💰 Módulo Financeiro
- Gestão de planos customizáveis (Mensal, Trimestral, etc.).
- Controle de pagamentos e fluxo de caixa.
- Relatórios detalhados de receitas.

### 5. ⚙️ Configurações & Branding (White Label)
- Customização de logo e nome da escola.
- Gestão de chaves de integração e permissões.

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js (v18+)
- Conta no Supabase

### Passo a Passo

1.  **Clonar o Repositório**
    ```bash
    git clone https://github.com/th91br/Esportiz.git
    cd esportiz
    ```

2.  **Instalar Dependências**
    ```bash
    npm install
    # ou
    bun install
    ```

3.  **Configurar Variáveis de Ambiente**
    Crie um arquivo `.env` na raiz do projeto com as chaves:
    ```env
    VITE_SUPABASE_URL=seu_url_do_supabase
    VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
    ```

4.  **Iniciar o Servidor de Desenvolvimento**
    ```bash
    npm run dev
    ```

---

## 🔒 Segurança e Dados
O sistema utiliza o **Supabase Auth** para gestão de identidade e o **Postgres RLS** para garantir que cada gestor tenha acesso exclusivo aos seus dados, impedindo vazamentos de informações entre diferentes escolas/arenas.

---

## 📄 Licença
Este é um software proprietário desenvolvido pela **Esportiz**. Todos os direitos reservados.

---
Developed with ❤️ by **Esportiz Team**
