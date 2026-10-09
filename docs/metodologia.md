# Metodologia

## Séries

- IBrX-50: fechamento oficial do índice agregado IBXL, consultado por ano na B3 (`indexStatisticsProxy/IndexCall/GetPortfolioDay`). Não há seleção de ações ou substituição pelo Ibovespa.
- USD/BRL: taxa de venda BCB SGS 1. Alternativa: cotação de venda PTAX do serviço OLINDA. Não representa fluxo de capital estrangeiro. A PTAX e o fechamento da bolsa possuem horários de formação diferentes.
- DI: contratos DI1 do Price Report da B3, disponíveis no espelho público [PYield](https://github.com/crdcj/pyield-data/releases/latest). A coluna `AdjstdQtTax` é a taxa anual em porcentagem. O PU (`AdjstdQt`) não é tratado como taxa.

## DI de prazo constante

Para cada data, calculamos os dias úteis até o vencimento dos contratos DI1. O vencimento é o primeiro dia útil do mês indicado pelo código. Utilizamos os calendários ANBIMA distribuídos pelo PYield: versão anterior para datas de referência anteriores a 26/12/2023 e versão atual a partir dessa data, incluindo a mudança relativa ao feriado de 20 de novembro.

A maturidade alvo é 252 dias úteis. Os vértices imediatamente abaixo e acima são usados, independentemente do volume negociado, desde que tenham taxa de ajuste válida. Para dias úteis d1 ≤ 252 ≤ d2, taxas anuais decimais r1 e r2, e w = (252 − d1)/(d2 − d1):

```text
logF = (1 − w) × d1/252 × log(1 + r1) + w × d2/252 × log(1 + r2)
r252 = exp(logF) − 1
```

Se houver vértice exato de 252 dias, usamos sua taxa. Sem dois vértices que cerquem o prazo, a data fica ausente. Não extrapolamos. Essa curva não é um contrato negociável e sua variação não é retorno de uma estratégia de futuros.

A exportação conserva os dois contratos, taxas de ajuste, vencimentos, dias úteis e peso da interpolação. O arquivo de origem é identificado por URL, data de consulta e SHA-256.

## Amostras e estatísticas

O índice e o dólar são alinhados por data, sem duplicatas. Os retornos são calculados após esse alinhamento para cobrir os mesmos intervalos. Variação percentual = 100 × (valor atual / valor anterior − 1). A variação DI em pontos-base é 100 × (taxa percentual atual − taxa percentual anterior). Uma mudança de 10,00% para 10,10% equivale a +10 pb.

O DI é anexado às datas comuns de bolsa/câmbio. Não há preenchimento de valores ausentes; a mudança DI exige taxa nos dois extremos do intervalo. Cada par usa somente valores finitos e informa tamanho e datas da amostra. As amostras dos três pares podem diferir.

Pearson mede associação linear; Spearman usa postos com média para empates. A regressão simples de Y sobre X apresenta beta e R². Séries constantes ou amostras insuficientes não produzem uma correlação artificial igual a zero.

D−k compara X na observação t−k com Y em t. As defasagens usam a grade original de datas comuns, preservando lacunas DI, e exigem ao menos 10 pares. São intervalos entre observações, não necessariamente dias corridos. O maior valor absoluto entre D−1 e D−10 é descritivo e sujeito à seleção entre múltiplas comparações; não é evidência de previsibilidade fora da amostra.

As correlações móveis exigem janelas completas de 30, 60 ou 90 observações. Não são testes de causalidade. A análise é descritiva, sem backtest, simulação de patrimônio ou recomendação de operação.

## Cobertura verificada em 09/10/2026

O histórico B3 do índice começa em 04/01/2010 para o período solicitado. A base DI integrada começa em 02/01/2018 e termina em 08/10/2026; foram calculadas 2.180 curvas diárias de prazo constante. A interseção com índice e dólar pode conter menos datas.

**2010–2017 ainda não foi obtido para DI1.** A API pública BDI consultada cobre apenas pregões recentes. Os endereços legados de boletins/FTP não permitiram recuperar os arquivos antigos nesta execução. A base atual PYield começa em 2018. Nenhum CDI, Selic ou curva soberana foi usado para encobrir essa lacuna.
