# Extraction evals

Measures how well `process_find` reads voice notes (price, MOQ, lead time, yes/no answers, compliance flags).
Uses the exact production prompt (`EXTRACT_SYSTEM` + `contextText` from `supabase/functions/worker/jobs/processFind.ts`).

```bash
# needs ANTHROPIC_API_KEY (and optionally CLAUDE_MODEL); costs a few cents
cd supabase/functions && deno run -A _evals/extract.ts            # one case: ... _evals/extract.ts rmb
```

Add real cases: make a folder `evals/extract/photos/<id>/` with `product.jpg` and/or `card.jpg`, and add
`"photos": "<id>"` plus expectations like `"supplier_phone_contains": "138"` or `"name_contains": "Sunny"` to cases.json.
Business-card cases are the most valuable ones to add: photograph 10 real Chinese cards.
