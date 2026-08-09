# Database — Neon Free

| | |
|--|--|
| Neon project | `murali-transport` (`polished-river-47162645`) |
| Region | `aws-us-west-2` |
| Database / role | `murali` |
| Org | `org-falling-bird-44330402` |
| Plan | Free |
| App `DATABASE_URL` | Neon **pooled** connection (set on Render) |

```bash
neonctl connection-string \
  --project-id polished-river-47162645 \
  --org-id org-falling-bird-44330402 \
  --database-name murali \
  --role-name murali \
  --pooled
```

## Backups

```bash
./scripts/backup-db.sh --neon
```
