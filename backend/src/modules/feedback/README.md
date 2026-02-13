# Módulo de Feedback Pós-Atendimento

Este módulo é responsável por gerenciar pesquisas de feedback pós-atendimento, como NPS (Net Promoter Score), CSAT (Customer Satisfaction Score) e CES (Customer Effort Score). Ele permite a criação de templates de pesquisa, configuração de triggers de envio via WhatsApp e coleta e análise das respostas dos clientes.

## Funcionalidades

- **Gerenciamento de Templates**: Crie, edite e exclua templates de pesquisa de feedback com diferentes tipos (NPS, CSAT, CES, Feedback Aberto).
- **Configurações de Disparo**: Defina o tempo de espera antes do envio da pesquisa após a conclusão de um atendimento e o template padrão a ser utilizado.
- **Coleta de Respostas**: Recebe e armazena as respostas dos clientes no banco de dados.
- **Dashboard de Métricas**: Exibe o score NPS, distribuição de promotores, passivos e detratores, e a evolução temporal do feedback.
- **Visualização de Respostas**: Permite visualizar respostas individuais com filtros.

## Estrutura do Módulo

```
feedback/
├── feedback.controller.js    // Lógica de controle para as rotas da API
├── feedback.routes.js        // Definição das rotas da API para o módulo
└── feedback.service.js       // Lógica de negócio e interação com o banco de dados
```

## API Endpoints

Todos os endpoints são protegidos por autenticação JWT e middleware de autorização.

### Templates

- `POST /api/v1/feedback/templates`
  - **Descrição**: Cria um novo template de feedback.
  - **Corpo da Requisição**: 
    ```json
    {
      "name": "Pesquisa NPS Pós-Atendimento",
      "type": "NPS",
      "message_text": "Olá {{customer_name}}, em uma escala de 0 a 10, qual a probabilidade de você nos recomendar a um amigo?",
      "options": null
    }
    ```
  - **Respostas**: `201 Created` com o objeto do template criado.

- `GET /api/v1/feedback/templates`
  - **Descrição**: Lista todos os templates de feedback ativos.
  - **Respostas**: `200 OK` com um array de templates.

- `DELETE /api/v1/feedback/templates/:id`
  - **Descrição**: Desativa (soft delete) um template de feedback específico.
  - **Respostas**: `204 No Content`.

### Configurações

- `GET /api/v1/feedback/settings`
  - **Descrição**: Retorna as configurações de feedback para o tenant atual.
  - **Respostas**: `200 OK` com o objeto de configurações.

- `PUT /api/v1/feedback/settings`
  - **Descrição**: Atualiza as configurações de feedback para o tenant atual.
  - **Corpo da Requisição**: 
    ```json
    {
      "enabled": true,
      "wait_time_hours": 24,
      "trigger_event": "CHAT_CLOSED",
      "template_id": 1
    }
    ```
  - **Respostas**: `200 OK` com o objeto de configurações atualizado.

### Respostas e Estatísticas

- `GET /api/v1/feedback/stats`
  - **Descrição**: Retorna estatísticas agregadas de feedback (NPS, promotores, detratores, etc.).
  - **Query Params**: `startDate`, `endDate` (opcionais para filtrar por período).
  - **Respostas**: `200 OK` com o objeto de estatísticas.

- `GET /api/v1/feedback/responses`
  - **Descrição**: Lista as respostas de feedback recentes.
  - **Query Params**: `template_id` (opcional para filtrar por template).
  - **Respostas**: `200 OK` com um array de respostas.

- `POST /api/v1/feedback/webhook`
  - **Descrição**: Endpoint para receber respostas de feedback via webhook (uso interno/integração WhatsApp).
  - **Corpo da Requisição**: 
    ```json
    {
      "tenantId": 1,
      "customer_phone": "+5511999999999",
      "conversation_id": 123,
      "template_id": 1,
      "score": 9,
      "comment": "Ótimo atendimento!"
    }
    ```
  - **Respostas**: `200 OK` com o objeto de resposta registrado.

## Tabelas do Banco de Dados

- `feedback_templates`
- `feedback_settings`
- `feedback_responses`

As migrações SQL para estas tabelas estão localizadas em `backend/migrations/058_feedback_module.sql`.
