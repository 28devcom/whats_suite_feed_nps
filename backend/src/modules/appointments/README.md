# Módulo de Agendamento e Lembretes

Este módulo permite o gerenciamento de agendamentos e o envio automático de lembretes via WhatsApp. Ele é ideal para clínicas, academias e estúdios que precisam organizar compromissos com seus clientes.

## Funcionalidades

- **Criação e Gerenciamento de Agendamentos**: Permite criar, visualizar, atualizar o status e excluir agendamentos.
- **Lembretes Automáticos**: Agenda e envia lembretes via WhatsApp antes do agendamento (ex: 24h e 1h antes).
- **Integração com Conversas**: Agendamentos podem ser vinculados a conversas existentes no WhatsApp.

## Estrutura do Módulo

```
appointments/
├── appointments.controller.js    // Lógica de controle para as rotas da API
├── appointments.routes.js        // Definição das rotas da API para o módulo
└── appointments.service.js       // Lógica de negócio e interação com o banco de dados
```

## API Endpoints

Todos os endpoints são protegidos por autenticação JWT e middleware de autorização.

### Agendamentos

- `POST /api/v1/appointments`
  - **Descrição**: Cria um novo agendamento e agenda lembretes automáticos.
  - **Corpo da Requisição**: 
    ```json
    {
      "customer_phone": "+5511987654321",
      "customer_name": "João Silva",
      "start_at": "2026-03-15T10:00:00Z",
      "end_at": "2026-03-15T11:00:00Z",
      "description": "Consulta de rotina",
      "location": "Clínica Central"
    }
    ```
  - **Respostas**: `201 Created` com o objeto do agendamento criado.

- `GET /api/v1/appointments`
  - **Descrição**: Lista todos os agendamentos para o tenant atual.
  - **Query Params**: `startDate`, `endDate` (opcionais para filtrar por período).
  - **Respostas**: `200 OK` com um array de agendamentos.

- `PATCH /api/v1/appointments/:id/status`
  - **Descrição**: Atualiza o status de um agendamento (ex: CONFIRMED, CANCELLED).
  - **Corpo da Requisição**: 
    ```json
    {
      "status": "CONFIRMED"
    }
    ```
  - **Respostas**: `200 OK` com o objeto do agendamento atualizado.

- `DELETE /api/v1/appointments/:id`
  - **Descrição**: Exclui um agendamento específico.
  - **Respostas**: `204 No Content`.

## Tabelas do Banco de Dados

- `appointments`
- `appointment_reminders`

As migrações SQL para estas tabelas estão localizadas em `backend/migrations/059_appointments_module.sql`.
