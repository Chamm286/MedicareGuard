# Backup và restore PostgreSQL

Áp dụng cho stack demo chạy container `medicareguard-postgres`.

## Backup

```bash
./scripts/backup-db.sh
```

Mặc định file được ghi vào `backups/medicareguard-YYYYMMDD-HHMMSS.dump`.
Có thể đổi bằng biến môi trường:

```bash
PG_CONTAINER=medicareguard-postgres \
PG_DATABASE=medicareguard \
PG_USER=medicare \
BACKUP_DIR=/tmp/backups \
./scripts/backup-db.sh
```

## Restore

```bash
./scripts/restore-db.sh backups/medicareguard-YYYYMMDD-HHMMSS.dump
```

Script sẽ hỏi xác nhận bằng chữ `RESTORE`. Restore dùng `--clean --if-exists` nên dữ liệu hiện tại trong database sẽ bị thay thế.

## Kiểm tra nhanh sau restore

```bash
curl -sS http://localhost:4000/api/health
curl -sS http://localhost:4000/api/store/products | head -c 300
```

## Lưu ý

- Không commit thư mục `backups/` lên Git.
- Trước khi restore, nên backup lại database hiện tại.
- Với production, dùng `pg_dump` từ managed provider hoặc snapshot của Neon/Supabase/RDS thay vì container local.
