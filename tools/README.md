
# Tools

## Scenes
```bash
pnpm dlx tsx tools/import_scenes_from_json.ts \
  --topic T_FARM \
  --json ./topics/T_FARM/scenes/scenes.farm.json \
  --mediaDir ./topics/T_FARM/images/src
```

## Vocab
```bash
pnpm dlx tsx tools/import_vocab_from_json.ts \
  --topic T_FARM \
  --json ./topics/T_FARM/vocab.json
```

## ENV required
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- FIREBASE_STORAGE_BUCKET
