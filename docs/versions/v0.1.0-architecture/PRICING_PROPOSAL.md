# Proposta comercial — NÃO APROVADA

A vertical Eventos 77 NÃO POSSUI preços, limites ou trial aprovados. Nenhum preço deve aparecer como definitivo na UI antes de decisão do usuário. O contrato lógico Essencial/Pro/Premium (Pro recomendado) vem do ecossistema global, não do mercado de eventos.

## Métricas candidatas que devem ser validadas com clientes
- eventos ativos simultâneos (não confundir com edições históricas);
- organizadores/membros internos;
- domínios próprios ativos;
- número de formulários simultâneos;
- espaço/transferência R2 monitorada;
- publicação de múltiplas marcas.

## Modelos a comparar
1. Assinatura mensal/anual por organizadora: bom para eventos recorrentes, risco sazonalidade.
2. Por edição publicada + suporte anual: aderente a produtoras com intervalo longo, receita irregular.
3. Implantação/branding + manutenção: simples para primeira venda, necessidade de escopo contratual.
4. Híbrido: assinatura reduzida + eventos ativos, exige medição clara.

## Política técnica futura
ManualPlanAssignment pelo Platform Owner, `subscriptionStatus`, `entitlementOverrides`, `limitOverrides`, downgrade sem exclusão, nunca vender segurança como Premium. Sem billing automático no GOAL inicial. Quando limites forem aprovados, enforce servidor sob transação que resista concorrência.

## Hipóteses a testar
No mínimo 5 conversas manuais (após autorização), 2 propostas com escopo real e 1 intenção de piloto validada; investigar meses entre edições, domínio/SSL existente, equipe e orçamento. Evitar usar empresa famosa como ICP só porque o site é bonito.
