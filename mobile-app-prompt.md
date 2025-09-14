
# Prompt para Criação de Aplicativo Móvel - Agenda Alego

## Visão Geral do Projeto

**Nome do Aplicativo:** Agenda Alego

**Objetivo:** Criar um aplicativo móvel nativo para iOS e Android que espelhe e aprimore as funcionalidades do sistema web existente "Agenda Alego". O aplicativo deve ser rápido, intuitivo e compartilhar o mesmo banco de dados Firebase para garantir a sincronização de dados em tempo real entre as plataformas. A interface deve ser moderna, limpa e otimizada para dispositivos móveis.

**Público-Alvo:**
1.  **Administradores/Gerentes de Pauta:** Responsáveis por adicionar, editar e gerenciar os eventos.
2.  **Operadores de Câmera/Técnicos:** Precisam visualizar suas agendas e receber notificações.
3.  **Público Geral/Imprensa:** Desejam consultar a agenda pública de eventos da Alego.

**Tecnologias:**
*   **Framework:** React Native com Expo
*   **Banco de Dados:** Firebase Firestore (utilizar a mesma configuração do projeto web existente)
*   **Autenticação:** Firebase Authentication
*   **Design System:** Utilizar componentes nativos e uma biblioteca como `react-native-paper` ou `react-native-elements` para um visual consistente. O design deve ser minimalista, seguindo as cores da marca.
*   **Navegação:** `React Navigation`

## Estrutura de Navegação e Telas

O aplicativo será dividido em duas seções principais, acessíveis após o login: **Dashboard Administrativo** e **Agenda Pública**. O login é obrigatório para todas as funcionalidades.

### 1. Autenticação
*   **Tela de Login:**
    *   Campos para E-mail e Senha.
    *   Botão "Entrar".
    *   Interface limpa com o logo "Agenda Alego".
    *   Deve usar o Firebase Authentication, conectando-se aos mesmos usuários do sistema web.

### 2. Navegação Principal (Após Login)
*   Utilizar uma navegação por abas (Tab Navigator) na parte inferior da tela com os seguintes ícones e seções:
    *   **Dashboard** (Ícone: `home`): Tela principal de gerenciamento de eventos.
    *   **Pauta do Dia** (Ícone: `list`): Ferramenta para gerar a pauta diária.
    *   **Relatórios** (Ícone: `bar-chart`): Visualização de dados e estatísticas.
    *   **Agenda Pública** (Ícone: `calendar`): Visualização do calendário público.

---

## Detalhamento das Telas e Funcionalidades

### Aba 1: Dashboard (Gerenciamento de Eventos)

*   **Componente de Calendário:**
    *   Exibir um calendário mensal compacto no topo da tela.
    *   Os dias com eventos devem ser marcados com um ponto colorido.
    *   Ao selecionar um dia, a lista de eventos abaixo é atualizada.
*   **Lista de Eventos do Dia Selecionado:**
    *   Abaixo do calendário, exibir os eventos do dia em formato de cards.
    *   Cada card de evento deve mostrar:
        *   Nome do evento.
        *   Horário.
        *   Local.
        *   Operador responsável.
        *   Ícones indicando a transmissão (YouTube, TV Aberta ou ambos).
        *   Uma barra colorida na lateral, correspondente à cor do evento no banco de dados.
    *   Deve ser possível "arrastar para o lado" em um card para revelar botões de **Editar** e **Excluir**.
*   **Botões Flutuantes (FAB - Floating Action Button):**
    *   Um FAB principal com ícone de `+`.
    *   Ao tocar, ele se expande para mostrar duas opções:
        1.  **Adicionar Manualmente** (Ícone: `pencil`): Abre o formulário de adição de evento.
        2.  **Adicionar com IA** (Ícone: `sparkles`): Abre a câmera ou a galeria para adicionar um evento a partir de uma imagem.
*   **Formulário de Adição/Edição de Evento (Modal):**
    *   Deve abrir como um modal sobre a tela.
    *   Campos: Nome do Evento, Local (seletor), Operador (seletor), Data, Hora, Tipo de Transmissão (Radio buttons) e Opções de Repetição (semanal, mensal, etc.).
    *   **Sugestão de Operador com IA:** Ao preencher data, hora e local, o sistema deve sugerir automaticamente o operador mais adequado, preenchendo o campo.
*   **Funcionalidade de Importação:**
    *   Adicionar um botão com ícone de "nuvem/download" no cabeçalho da tela do Dashboard.
    *   Ao ser pressionado, ele executa o fluxo `importAlegoAgenda` para buscar e salvar novos eventos do site oficial, mostrando um feedback de "Carregando..." e "Importação Concluída".

### Aba 2: Pauta do Dia

*   **Interface Simples:**
    *   Um seletor de data no topo.
    *   Uma área de texto grande (não editável) para exibir a mensagem da pauta gerada pela IA.
    *   Botão **"Gerar Pauta com IA"**: Aciona o fluxo `generateDailyAgenda` e preenche a área de texto.
    *   Botão **"Compartilhar no WhatsApp"**: Pega o texto gerado e abre o WhatsApp para compartilhamento.

### Aba 3: Relatórios

*   **Filtros:** Seletores de Mês e Ano no topo.
*   **Cards de Resumo:**
    *   Exibir cards com os principais KPIs: Total de Eventos, Eventos Noturnos, Transmissões (YouTube vs. TV).
*   **Resumo com IA:**
    *   Um card destacado com um botão "Gerar Resumo com IA".
    *   Ao tocar, ele aciona o fluxo `summarizeReports` e exibe o parágrafo de resumo.
*   **Gráficos e Tabelas:**
    *   Um gráfico de barras mostrando "Eventos por Operador".
    *   Uma lista/tabela mostrando "Eventos por Local".
    *   Os dados devem ser apresentados de forma clara e legível para telas pequenas.

### Aba 4: Agenda Pública

*   **Visualização de Calendário:**
    *   Um calendário mensal grande e interativo.
    *   Os dias com eventos devem ter indicadores visuais.
    *   Ao tocar em um dia, uma lista de eventos aparece abaixo ou em um modal.
*   **Detalhes do Evento Público:**
    *   A lista deve mostrar os cards de evento de forma semelhante à da web, com nome, hora, local e tipo de transmissão. Não exibir o nome do operador.

## Requisitos Não-Funcionais

*   **Desempenho:** O aplicativo deve ser rápido e responsivo. As consultas ao Firebase devem ser otimizadas.
*   **Feedback Visual:** Utilize indicadores de carregamento (spinners) para todas as operações assíncronas (busca de dados, chamadas de IA, etc.).
*   **Notificações:** Em uma versão futura (V2), planejar a implementação de notificações push via Firebase Cloud Messaging para alertar os operadores sobre novos eventos em suas agendas.
*   **Segurança:** As regras de segurança do Firebase Firestore devem ser as mesmas do projeto web, garantindo que apenas usuários autenticados possam escrever dados.
*   **Layout Intuitivo:** A navegação deve ser natural para usuários de iOS e Android, seguindo as diretrizes de design de cada plataforma.

## Configuração do Firebase (Ação Imediata)

**Instrução:** No início do projeto, conecte-se ao Firebase usando as mesmas credenciais do projeto web "Agenda Alego". O arquivo de configuração `firebase.ts` deve ser criado e populado com o objeto `firebaseConfig` existente para garantir o acesso ao mesmo banco de dados Firestore e sistema de Autenticação.

**Exemplo do objeto `firebaseConfig` a ser utilizado:**
```javascript
const firebaseConfig = {
  "projectId": "agenda-alego-v3-72653978-39fba",
  "appId": "1:814315709282:web:fbc64b7c698c68cde6823b",
  "storageBucket": "agenda-alego-v3-72653978-39fba.firebasestorage.app",
  "apiKey": "AIzaSyDGkB7kxb8oK39K-G_1J4weRoqxMQYKRhA",
  "authDomain": "agenda-alego-v3-72653978-39fba.firebaseapp.com",
  "messagingSenderId": "814315709282"
};
```
