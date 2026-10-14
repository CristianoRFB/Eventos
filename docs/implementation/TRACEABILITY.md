# Como ler a rastreabilidade

As matrizes são um inventário verificável do escopo original. Não são prova de implementação. `target_files_planned`, `tests_planned` e `evidence_required` apontam o trabalho e a prova esperados; `evidence_actual`, `status` e `implementation_sha` registram o que de fato existe e passou.

`REQUIREMENTS_TRACEABILITY.csv` preserva cada objetivo, item numerado, contrato, artefato, aceite, teste, bloqueio e rollback das 13 fases. `GLOBAL_REQUIREMENTS_TRACEABILITY.csv` preserva as cláusulas antes/depois das fases, incluindo invariantes, G0–G8, endpoints de referência, permissões e exit report. `requirement_id` usa fase e primeira linha da fonte; o intervalo de linhas e `source_sha256` permite conferir o texto exato, sem resumir requisitos menores para fazê-los desaparecer.

`FEATURE_TRACEABILITY.csv` conserva as 38 linhas e todos os campos originais de `FEATURE_INVENTORY.csv`. `SCREEN_TRACEABILITY.csv` conserva as 60 linhas e todos os campos originais de `SCREENS_INVENTORY.csv`; rotas finais podem adaptar o modelo, mas cada tela NOW exige loader/action/persistência e provas de estado/role/responsividade. `DIAGRAM_STATUS.csv` conserva fonte/hash dos 16 Mermaid e identifica os SVGs de design como Graphviz auxiliar até renderização Mermaid efetiva. Não alterar `source_sha256` para ocultar alteração da fonte: registrar reconciliação explícita se houver revisão autorizada do escopo.

Atualizar status somente após conferir a evidência atual: teste específico com log/código de saída, comportamento/DB/SSR conforme o requisito e commit/branch correspondentes. `NOT_STARTED` em feature/tela significa aceite funcional ainda não iniciado/comprovado; código parcial não implica PASS. Manter falhas e provas insuficientes visíveis. Um arquivo ou teste genérico não cobre automaticamente todos os requisitos da fase.

Não converter NEXT/DEFERRED em requisito NOW nem ignorar deveres explícitos de uma fase porque o inventário prioriza NEXT. Exemplo: F6 exige exportação mínima autorizada conforme privacidade; exportação bulk e relatório geral continuam NEXT. F8 exige mecânica TEST_ONLY após F2, sem aprovar UI comercial ou política de produção.

Os SVGs que o script `docs:diagrams` gerar em `docs/implementation/diagrams/` continuam classificados como **design planejado**, com fonte, versão do renderer e hashes; gerar SVG não reconcilia o diagrama com runtime. Screenshots reais precisam de manifesto com URL/local, commit, viewport e data depois de existir app verificável. Imagem conceitual permanece separada.
