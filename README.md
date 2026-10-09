# IBrX-50, dólar e DI de 1 ano

Painel local de estatísticas entre o índice agregado IBrX-50, o câmbio USD/BRL e a taxa DI de prazo constante de 1 ano. Não seleciona ações individuais e não realiza backtest ou simulação de patrimônio.

## Executar

Node.js 20.19+ (ou 22.12+).

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:3000. O período inicial é 01/01/2010 até ontem. A primeira consulta baixa o histórico; as seguintes reutilizam arquivos locais. O painel mostra Pearson, Spearman, regressão linear, defasagens e correlações móveis para cada um dos três pares.

## Cobertura e fontes

| Série | Fonte | Histórico integrado |
| --- | --- | --- |
| IBrX-50 | B3, histórico diário IBXL | Desde 2010 |
| USD/BRL venda | BCB SGS 1, com PTAX OLINDA como alternativa | Desde 2010 |
| Contratos DI1 | Price Report da B3, distribuído pelo projeto PYield | Desde 02/01/2018 |

**Pendente: obter contratos DI1 de 2010–2017.** A base pública integrada não contém esses anos. O painel informa a limitação e calcula cada correlação somente nas datas disponíveis. Selecionar 2010 não cria taxas DI para os anos ausentes.

O DI de 1 ano é calculado por interpolação flat-forward entre os dois vencimentos que cercam **252 dias úteis**, usando as taxas anuais de ajuste (`AdjstdQtTax`). Não há extrapolação. Os registros conservam os contratos, taxas, vencimentos, dias úteis e peso usados em cada data. A ANBIMA participa apenas como fonte do calendário de feriados, distribuído pelo PYield; sua curva soberana não é usada como DI futuro.

Fontes: [DI1 B3](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/juros/futuro-de-taxa-media-de-depositos-interfinanceiros-de-um-dia.htm), [base PYield](https://github.com/crdcj/pyield-data), [metodologia e limitações](docs/metodologia.md).

## Organização

```text
src/api/         Clientes das séries no servidor local
src/analysis/    Estatísticas
src/charts/      Gráficos das séries e das estatísticas
src/utils/       Alinhamento de datas e formatação
server/          Coleta B3/BCB, leitura Parquet, curva DI e cache
scripts/         Exportação das observações e estatísticas
tests/          Testes de dados, calendário e cálculos
data/calendars/ Feriados históricos e atuais, com atribuição
data/cache/     Dados baixados automaticamente (não versionados)
docs/           Metodologia e cobertura
```

O cache DI é revalidado após 24 horas ao consultar o painel. Anos encerrados de índice e câmbio são reutilizados; o ano atual é revalidado após uma hora. Não há tarefa agendada. Em falha de atualização DI, o painel pode mostrar a cópia anterior com aviso. Índice/câmbio falham explicitamente se um ano não puder ser obtido.

## Verificar e exportar

```sh
npm test
npm run build
npm run preview
```

O painel precisa do servidor local: abrir apenas `dist/index.html` não fornece as APIs.

Com `npm run dev` em execução:

```sh
npm run export:data -- 2010-01-01 2026-10-08
```

A exportação JSON em `exports/` contém observações, curvas DI com os contratos de origem, cobertura, hash do arquivo baixado e estatísticas por par. Ajuste a data final conforme necessário.
