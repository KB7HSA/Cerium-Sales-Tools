# SQL Migration Audit

Migrations in `db/migrations/` are applied in **alphabetical filename order** by `deploy/init-database.sh`. Fresh Ubuntu deploys can fail when:

1. An `ALTER TABLE` runs before the target table is created
2. `mssql-schema.sql` did not fully apply (partial deploy)
3. Bash `sort` order differs from intuitive date/name ordering (e.g. `types_file` before `types.sql`)

## Naming conventions

| Pattern | Purpose | Example |
|---------|---------|---------|
| `YYYY-MM-DD_00_*.sql` | Ensure base tables exist first | `2026-02-20_00_core_tables.sql` |
| `YYYY-MM-DD_*_00_create.sql` | Feature table CREATE before ALTERs | `2026-02-24_sow_types_00_create.sql` |
| `YYYY-MM-DD_<feature>_schema_columns.sql` | Column ALTERs after CREATE | `2026-02-26_labor_budget_schema_columns.sql` |

Use `_00_` prefix so bash `sort` places CREATE scripts before same-prefix ALTER scripts.

## Ensure-table migrations

| Migration | Tables ensured |
|-----------|----------------|
| `2026-02-20_00_core_tables.sql` | Customers, Quotes, AdminUsers |
| `2026-02-20_assessments.sql` | Assessment* tables |
| `2026-02-20_quote_workitems.sql` | QuoteWorkItems |
| `2026-02-21_erate_form470.sql` | ERateForm470 |
| `2026-02-24_sow_types_00_create.sql` | SOWTypes |
| `2026-02-26_labor_budget_00_schema.sql` | Labor budget tables |
| `2026-03-02_document_conversion_types_00_create.sql` | DocumentConversionTypes |
| `2026-05-06_00_msp_offerings.sql` | MspOfferings |

## Required guards for ALTER migrations

Every migration that alters or DMLs a table must include:

```sql
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'TableName' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    -- ALTER / INSERT / DELETE
END
```

Column-only checks (`IF NOT EXISTS ... sys.columns`) are **not sufficient** when the table itself may be missing.

## Audit script

```bash
./deploy/audit-migrations.sh
```

Reports sorted execution order and flags migrations that `ALTER` or `DELETE`/`INSERT` without table existence guards.

## Re-deploy after migration fixes

```bash
git pull
./deploy/init-database.sh --force
./deploy/deploy.sh --skip-db-init
```
