# Módulo de Retenção e Reengajamento

Este módulo oferece ferramentas para analisar a retenção de clientes e identificar aqueles em risco de churn ou inativos. Ele segmenta clientes e fornece insights para campanhas de reengajamento.

## Funcionalidades

- **Segmentação de Clientes**: Classifica clientes em ativos, em risco e inativos com base na última interação.
- **Métricas de Retenção**: Calcula e exibe estatísticas sobre a base de clientes.
- **Identificação de Clientes em Risco**: Lista clientes que não interagem há um período específico, indicando potencial churn.

## Estrutura do Módulo

```
retention/
├── retention.controller.js    // Lógica de controle para as rotas da API
├── retention.routes.js        // Definição das rotas da API para o módulo
└── retention.service.js       // Lógica de negócio e interação com o banco de dados
```

## API Endpoints

Todos os endpoints são protegidos por autenticação JWT e middleware de autorização.

### Estatísticas de Retenção

- `GET /api/v1/retention/stats`
  - **Descrição**: Retorna estatísticas agregadas sobre a retenção de clientes e segmentação.
  - **Respostas**: `200 OK` com o objeto de estatísticas.

### Clientes em Risco

- `GET /api/v1/retention/at-risk`
  - **Descrição**: Lista clientes identificados como em risco de churn.
  - **Respostas**: `200 OK` com um array de clientes em risco.

## Tabelas do Banco de Dados

Este módulo utiliza dados das tabelas `feedback_responses` e outras tabelas de interação (a serem definidas em um contexto mais amplo) para calcular suas métricas.
