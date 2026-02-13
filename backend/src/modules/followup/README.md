# Módulo de Follow-up Inteligente

Este módulo é projetado para automatizar o processo de follow-up com clientes, identificando aqueles que não respondem ou não interagem por um determinado período e enviando lembretes ou mensagens de reengajamento via WhatsApp. É configurável para diferentes regras de negócio e tipos de inatividade.

## Funcionalidades

- **Gerenciamento de Regras**: Crie e gerencie regras de follow-up baseadas em dias de inatividade e templates de mensagem.
- **Identificação de Clientes Inativos**: (Lógica a ser expandida com worker) Identifica clientes que não interagem por um período configurável.
- **Envio Automático de Lembretes**: Envia mensagens de follow-up personalizadas via WhatsApp.
- **Registro de Logs**: Mantém um histórico de todos os follow-ups enviados.

## Estrutura do Módulo

```
followup/
├── followup.controller.js    // Lógica de controle para as rotas da API
├── followup.routes.js        // Definição das rotas da API para o módulo
└── followup.service.js       // Lógica de negócio e interação com o banco de dados
```

## API Endpoints

Todos os endpoints são protegidos por autenticação JWT e middleware de autorização.

### Regras de Follow-up

- `POST /api/v1/followup/rules`
  - **Descrição**: Cria uma nova regra de follow-up.
  - **Corpo da Requisição**: 
    ```json
    {
      "name": "Reengajamento 7 dias",
      "days_inactive": 7,
      "message_template": "Olá {{customer_name}}, sentimos sua falta! Tem alguma dúvida ou precisa de ajuda?"
    }
    ```
  - **Respostas**: `201 Created` com o objeto da regra criada.

- `GET /api/v1/followup/rules`
  - **Descrição**: Lista todas as regras de follow-up ativas.
  - **Respostas**: `200 OK` com um array de regras.

- `DELETE /api/v1/followup/rules/:id`
  - **Descrição**: Desativa (soft delete) uma regra de follow-up específica.
  - **Respostas**: `204 No Content`.

### Logs de Follow-up

- `GET /api/v1/followup/logs`
  - **Descrição**: Retorna o histórico de follow-ups enviados.
  - **Respostas**: `200 OK` com um array de logs.

## Tabelas do Banco de Dados

- `followup_rules`
- `followup_logs`

As migrações SQL para estas tabelas estão localizadas em `backend/migrations/060_followup_module.sql`.
