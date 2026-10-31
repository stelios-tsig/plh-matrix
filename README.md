# PLH//MATRIX

Προσωπικός δάσκαλος για ΠΛΗ10 και ΠΛΗ11 του ΕΑΠ, ως PWA για κινητό.

- `content/*.txt`: θεωρία, παραδείγματα, ερωτήσεις (μορφή `@lesson`, `@theory`, `@example`, `@q`)
- `public/`: η εφαρμογή (app.js, gens.js με τις γεννήτριες, sw.js)
- `tools/build.py`: φτιάχνει `public/content.json` και τον φάκελο `dist/` που σερβίρεται
- `api/notify.js`: αποστολή web push (καλείται από Supabase pg_cron)

Μετά από αλλαγές: `python3 tools/build.py` και commit μαζί με το `dist/`.
