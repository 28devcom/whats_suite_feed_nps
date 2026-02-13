# Módulo de Análise Pós-Venda

Este módulo fornece um dashboard analítico focado em métricas de pós-venda, utilizando dados de feedback e interações com clientes para apresentar KPIs relevantes para pequenos negócios.

## Funcionalidades

- **KPIs de Pós-Venda**: Agrega e exibe métricas chave como NPS, taxa de retenção, score médio de feedback e total de respostas.
- **Composição do NPS**: Detalha a distribuição de promotores, passivos e detratores.
- **Evolução Temporal**: (A ser implementado no frontend) Gráficos de evolução de métricas ao longo do tempo.

## Estrutura do Módulo

```
analytics/
├── analytics.controller.js    // Lógica de controle para as rotas da API
├── analytics.routes.js        // Definição das rotas da API para o módulo
└── analytics.service.js       // Lógica de negócio e interação com o banco de dados
```

## API Endpoints

Todos os endpoints são protegidos por autenticação JWT e middleware de autorização.

### KPIs

- `GET /api/v1/post-sales-analytics/kpis`
  - **Descrição**: Retorna os principais KPIs de pós-venda.
  - **Query Params**: `startDate`, `endDate` (opcionais para filtrar por período).
  - **Respostas**: `200 OK` com o objeto de KPIs.

### Evolução

- `GET /api/v1/post-sales-analytics/evolution`
  - **Descrição**: Retorna dados de evolução de métricas ao longo do tempo.
  - **Query Params**: `months` (número de meses para retroceder, padrão 6).
  - **Respostas**: `200 OK` com um array de objetos contendo mês, score médio e total.

## Tabelas do Banco de Dados

Este módulo utiliza dados das tabelas `feedback_responses` para calcular suas métricas.
