class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const parsePagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
};

const buildListQuery = ({
  table,
  columns,
  searchColumns = [],
  filterColumns = [],
  query,
  orderBy = "created_at",
  extraWhere = [],
  extraParams = [],
}) => {
  const values = [...extraParams];
  const conditions = [...extraWhere];

  if (query.q && searchColumns.length) {
    values.push(`%${query.q}%`);
    conditions.push(
      `(${searchColumns.map((column) => `${column}::text ILIKE $${values.length}`).join(" OR ")})`,
    );
  }

  const sortable = new Set([...columns, "id", "created_at", "updated_at", orderBy]);
  const sort = sortable.has(query.sort) ? query.sort : orderBy;
  const order = String(query.order || "desc").toUpperCase() === "ASC" ? "ASC" : "DESC";

  filterColumns.forEach((column) => {
    if (query[column] !== undefined && query[column] !== "") {
      values.push(query[column]);
      conditions.push(`${column}::text = $${values.length}`);
    }
  });

  if (query.from) {
    values.push(query.from);
    conditions.push(`created_at >= $${values.length}`);
  }
  if (query.to) {
    values.push(query.to);
    conditions.push(`created_at <= $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const selectColumns = Array.isArray(columns) && columns.length
    ? ["id", ...columns, "created_at", "updated_at"].filter((column, index, arr) => arr.indexOf(column) === index).join(", ")
    : "*";
  return { where, values, sort, order, selectColumns };
};

const serializeValue = (column, value, jsonColumns = []) => {
  if (value === undefined) return undefined;
  if (jsonColumns.includes(column)) {
    return typeof value === "string" ? value : JSON.stringify(value);
  }
  return value;
};

module.exports = { HttpError, asyncHandler, parsePagination, buildListQuery, serializeValue };
