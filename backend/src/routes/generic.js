const express = require("express");
const { query, withTransaction } = require("../config/db");
const { resources } = require("../config/resources");
const { asyncHandler, HttpError, parsePagination, buildListQuery, serializeValue } = require("../utils/http");
const { authenticate, authorize, requirePermission } = require("../middleware/auth");
const { recordAudit } = require("../services/audit");

const CSV_ESCAPE = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const createCrudRouter = (resource) => {
  const router = express.Router();
  const {
    table,
    label,
    columns,
    jsonColumns = [],
    searchColumns = [],
    filterColumns = [],
    requiredColumns = [],
    defaultOrder = "created_at",
    readRoles,
    writePermission,
  } = resource;

  const readGuard = readRoles?.length ? authorize(...readRoles) : (_req, _res, next) => next();
  const writeGuard = requirePermission(writePermission || "write");

  router.get(
    "/",
    readGuard,
    asyncHandler(async (req, res) => {
      const { page, limit, offset } = parsePagination(req.query);
      const { where, values, sort, order, selectColumns } = buildListQuery({
        table,
        columns,
        searchColumns,
        filterColumns,
        query: req.query,
        orderBy: defaultOrder,
      });

      const countResult = await query(`SELECT count(*)::int AS total FROM ${table} ${where}`, values);
      const dataValues = [...values, limit, offset];
      const dataResult = await query(
        `SELECT ${selectColumns} FROM ${table} ${where} ORDER BY ${sort} ${order} LIMIT $${dataValues.length - 1} OFFSET $${dataValues.length}`,
        dataValues,
      );

      const total = countResult.rows[0].total;
      res.json({
        data: dataResult.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
        resource: { name: resource.name, label, columns },
      });
    }),
  );

  router.get(
    "/export",
    readGuard,
    asyncHandler(async (req, res) => {
      const result = await query(
        `SELECT ${["id", ...columns, "created_at", "updated_at"].filter((v, i, a) => a.indexOf(v) === i).join(", ")} FROM ${table} ORDER BY ${defaultOrder} DESC LIMIT 5000`,
      );
      const header = Object.keys(result.rows[0] || { id: "" });
      const lines = [header.join(",")];
      result.rows.forEach((row) => lines.push(header.map((key) => CSV_ESCAPE(row[key])).join(",")));
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${resource.name}-${Date.now()}.csv"`);
      res.send(lines.join("\n"));
    }),
  );

  router.get(
    "/:id",
    readGuard,
    asyncHandler(async (req, res) => {
      const result = await query(`SELECT * FROM ${table} WHERE id = $1`, [req.params.id]);
      if (!result.rows.length) throw new HttpError(404, `Không tìm thấy ${label}`);
      res.json({ data: result.rows[0] });
    }),
  );

  router.get(
    "/:id/comments",
    readGuard,
    asyncHandler(async (req, res) => {
      const result = await query(
        `SELECT c.*, u.full_name AS author_name, u.email AS author_email
         FROM comments c LEFT JOIN users u ON u.id = c.author_id
         WHERE c.resource = $1 AND c.resource_id = $2 ORDER BY c.created_at ASC`,
        [resource.name, req.params.id],
      );
      res.json({ data: result.rows });
    }),
  );

  router.post(
    "/:id/comments",
    writeGuard,
    asyncHandler(async (req, res) => {
      if (!req.body.body) throw new HttpError(400, "Nội dung bình luận là bắt buộc");
      const result = await query(
        `INSERT INTO comments (resource, resource_id, author_id, body, metadata)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [resource.name, req.params.id, req.user.id, req.body.body, JSON.stringify(req.body.metadata || {})],
      );
      await recordAudit({
        req,
        action: "create",
        resource: "comments",
        resourceId: result.rows[0].id,
        details: { target: resource.name, targetId: req.params.id },
      });
      res.status(201).json({ data: result.rows[0] });
    }),
  );

  router.post(
    "/bulk",
    writeGuard,
    asyncHandler(async (req, res) => {
      const items = Array.isArray(req.body.items) ? req.body.items : [];
      if (!items.length) throw new HttpError(400, "Mảng items là bắt buộc");
      if (items.length > 100) throw new HttpError(400, "Tối đa 100 mục mỗi yêu cầu hàng loạt");
      const created = await withTransaction(async (client) => {
        const rows = [];
        for (const item of items) {
          const fields = columns.filter((column) => item[column] !== undefined);
          if (!fields.length) continue;
          const placeholders = fields.map((_, index) => `$${index + 1}`);
          const values = fields.map((column) => serializeValue(column, item[column], jsonColumns));
          const result = await client.query(
            `INSERT INTO ${table} (${fields.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
            values,
          );
          rows.push(result.rows[0]);
        }
        return rows;
      });
      res.status(201).json({ data: created, count: created.length });
    }),
  );

  router.delete(
    "/bulk",
    writeGuard,
    asyncHandler(async (req, res) => {
      const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
      if (!ids.length) throw new HttpError(400, "Mảng ids là bắt buộc");
      const result = await query(`DELETE FROM ${table} WHERE id = ANY($1::uuid[]) RETURNING id`, [ids]);
      await recordAudit({ req, action: "bulk_delete", resource: resource.name, details: { ids } });
      res.json({ deleted: result.rowCount, ids: result.rows.map((row) => row.id) });
    }),
  );

  router.post(
    "/",
    writeGuard,
    asyncHandler(async (req, res) => {
      const missing = requiredColumns.filter((column) => req.body[column] === undefined || req.body[column] === "");
      if (missing.length) throw new HttpError(400, `Missing required fields: ${missing.join(", ")}`);

      const fields = columns.filter((column) => req.body[column] !== undefined);
      if (!fields.length) throw new HttpError(400, "Không có trường hợp lệ nào được cung cấp");
      const placeholders = fields.map((_, index) => `$${index + 1}`);
      const values = fields.map((column) => serializeValue(column, req.body[column], jsonColumns));

      const result = await query(
        `INSERT INTO ${table} (${fields.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`,
        values,
      );
      await recordAudit({
        req,
        action: "create",
        resource: resource.name,
        resourceId: result.rows[0].id,
        details: { fields },
      });
      res.status(201).json({ data: result.rows[0] });
    }),
  );

  const updateHandler = asyncHandler(async (req, res) => {
    const fields = columns.filter((column) => req.body[column] !== undefined);
    if (!fields.length) throw new HttpError(400, "Không có trường hợp lệ nào được cung cấp");
    const values = fields.map((column) => serializeValue(column, req.body[column], jsonColumns));
    const sets = fields.map((column, index) => `${column} = $${index + 1}`);
    values.push(req.params.id);
    const result = await query(
      `UPDATE ${table} SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values,
    );
    if (!result.rows.length) throw new HttpError(404, `Không tìm thấy ${label}`);
    await recordAudit({
      req,
      action: "update",
      resource: resource.name,
      resourceId: req.params.id,
      details: { fields },
    });
    res.json({ data: result.rows[0] });
  });

  router.put("/:id", writeGuard, updateHandler);
  router.patch("/:id", writeGuard, updateHandler);

  router.delete(
    "/:id",
    writeGuard,
    asyncHandler(async (req, res) => {
      const result = await query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [req.params.id]);
      if (!result.rows.length) throw new HttpError(404, `Không tìm thấy ${label}`);
      await recordAudit({ req, action: "delete", resource: resource.name, resourceId: req.params.id });
      res.json({ deleted: true, id: req.params.id });
    }),
  );

  return router;
};

const buildGenericRouter = () => {
  const router = express.Router();
  router.use((req, res, next) => {
    if (req.path === "/openapi.json" || req.path.startsWith("/docs") || req.path.startsWith("/swagger-ui")) return next();
    return authenticate(req, res, next);
  });
  resources.forEach((resource) => {
    router.use(`/${resource.name}`, createCrudRouter(resource));
  });
  return router;
};

module.exports = { buildGenericRouter, createCrudRouter };
