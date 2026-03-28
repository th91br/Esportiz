# Resenha's - Escola de Futevôlei

Sistema de gestão profissional para a **Escola de Futevôlei Resenha's**. Desenvolvido para facilitar o controle de alunos, frequências, pagamentos e datas importantes como aniversários.

## 🚀 Funcionalidades

- **Dashboard Inteligente**: Visão geral de alunos, pagamentos pendentes e aniversariantes do dia.
- **Gestão de Alunos**: Cadastro completo com informações de contato e data de nascimento.
- **Calendário de Treinos**: Agendamento e controle de frequência.
- **Módulo Financeiro**: Controle de mensalidades, pagamentos e inadimplência.
- **Aniversariantes**: Painel dedicado para monitorar aniversários do dia, semana ou mês, com integração para parabéns via WhatsApp.
- **Interface Premium**: Design moderno, responsivo e com suporte a modo escuro/claro.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React.js com TypeScript
- **Estilização**: Tailwind CSS & Shadcn/UI
- **Backend & Database**: Supabase
- **Build Tool**: Vite
- **Deploy**: Vercel

## ⚙️ Configuração para Deploy na Vercel

Para hospedar este projeto na Vercel, siga estes passos:

1.  **Conecte seu Repositório**: Importe o repositório `resenha-s-ftv-main` no painel da Vercel.
2.  **Variáveis de Ambiente**: Configure as seguintes chaves no painel da Vercel (Environment Variables):
    *   `VITE_SUPABASE_URL`
    *   `VITE_SUPABASE_ANON_KEY`
    *   `VITE_SUPABASE_PROJECT_ID`
3.  **Framework Preset**: Selecione **Vite**.
4.  **Root Directory**: Deixe na raiz (`./`).

## 👨‍💻 Desenvolvimento Local

```sh
# Instalar dependências
npm install

# Rodar em modo de desenvolvimento
npm run dev

# Gerar build de produção
npm run build
```

---
Desenvolvido por **Resenha's Escola de Futevôlei**
