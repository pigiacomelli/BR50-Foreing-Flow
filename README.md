# 💱 IBrX-50 vs Fluxo de Dólar (BR50-Foreign-Flow)

![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Chart.js](https://img.shields.io/badge/chart.js-F5788D.svg?style=for-the-badge&logo=chart.js&logoColor=white)

Um estudo visual interativo para analisar o impacto do fluxo cambial (entrada e saída de dólares) no mercado brasileiro de ações, especificamente o índice **IBrX-50**, e na política monetária nacional (Taxa Selic).

O projeto consome dados reais da API do **Banco Central do Brasil (SGS e OLINDA)** e do **Yahoo Finance** para traçar correlações matemáticas e até mesmo um simulador interativo de carteira baseado em *Market Timing*.

---

## 🎯 Objetivo do Projeto

A hipótese principal testada por esta aplicação é: 
**A variação da cotação do Dólar (BRL/USD) impacta diretamente o IBrX-50 e vice-versa?**

Para testar isso, a aplicação conta com três painéis analíticos:
1. **Visualização Histórica:** Gráficos interativos mostrando a variação diária do câmbio e a evolução do IBrX-50 ao longo do tempo.
2. **Estatísticas & Backtest:** 
    - Painel com estatísticas estatísticas profundas como *Correlação de Pearson/Spearman*, Regressão (Beta e R²), Lag Correlation (D-1 a D-10) e Rolling Correlation (30 a 90 dias).
    - **Simulador Interativo:** Testa um cenário onde você investe 100% de um capital (R$ 10.000) no índice apenas nos momentos de grande queda do Dólar (proxy de forte fluxo estrangeiro) e compara o resultado final contra o clássico *Buy & Hold*.
3. **Juros (Selic):** Uma aba focada na comparação entre os ciclos de alta e baixa de juros e a reação do mercado de capitais no longo prazo.

---

## 🛠️ Tecnologias e Arquitetura

- **Vanilla JavaScript & HTML/CSS**: Nenhuma UI library (React/Vue) foi utilizada, extraindo o máximo de performance e modularidade nativa usando módulos ES6.
- **Vite**: Usado para servir a aplicação durante o desenvolvimento e orquestrar proxies (evitando erros de CORS ao consumir APIs do BCB/Yahoo).
- **Chart.js**: Renderização dos gráficos de linha, dispersão (scatter) e barras com altíssimo desempenho.
- **Banco Central do Brasil (BCB) API**: Puxa a série 11 (Selic) e a PTAX (Câmbio) de forma fatiada.
- **Yahoo Finance API**: Puxa a série histórica do `^IBX50` ou proxies disponíveis via proxy local.

### Estrutura de Diretórios
```bash
/src
 ├── /analysis     # Lógica matemática (Regressões, Pearson, Motor de Backtest)
 ├── /api          # Clientes para o Yahoo Finance e BCB (OLINDA/SGS)
 ├── /charts       # Instâncias do Chart.js para cada painel
 ├── /utils        # Helpers (Formatações e merge de dados em O(n))
 └── main.js       # Orquestrador da aplicação
```

---

## 🚀 Como Rodar Localmente

Certifique-se de ter o **Node.js** instalado na sua máquina (v16+).

1. Clone o repositório:
```bash
git clone https://github.com/pigiacomelli/BR50-Foreing-Flow.git
cd BR50-Foreing-Flow
```

2. Instale as dependências (apenas Vite e Chart.js):
```bash
npm install
```

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

4. Abra `http://localhost:3000` no seu navegador!

---

## 📈 Preview do Backtest (Market Timing)
No simulador (aba *Estatísticas & Backtest*), você pode estipular uma regra como: **"Comprar sempre que o Dólar cair -1.5% em um único dia"**. A aplicação fará a varredura nos últimos 15 anos, fará a compra teórica e plotará na sua tela um gráfico comparativo (*Equity Curve*) de como o seu dinheiro teria se saído contra o mercado.

---

> Desenvolvido com ☕ e muito Vanilla JS.
