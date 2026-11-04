const { resources } = require("./config/resources");

const TAG_DESCRIPTIONS = {
  auth: "Đăng nhập, đăng ký, phiên làm việc và khôi phục mật khẩu.",
  users: "Quản lý người dùng, quyền hạn, phiên và hoạt động.",
  roles: "Vai trò RBAC và ma trận quyền.",
  alerts: "Cảnh báo an ninh, bình luận, dòng thời gian và quy trình xử lý.",
  threats: "Mối đe dọa, IOC, làm giàu tình báo và chặn chỉ dấu.",
  assets: "Tài sản CNTT, lỗ hổng, sự cố, rủi ro và quét bảo mật.",
  incidents: "Sự cố, SLA, bình luận, leo thang và điều tra.",
  "firewall-rules": "Quy tắc tường lửa, kiểm thử và áp dụng.",
  logs: "Nhật ký hệ thống, kiểm toán và xuất dữ liệu.",
  stats: "Số liệu SOC, bản đồ tấn công, xu hướng và sức khỏe hệ thống.",
  reports: "Mẫu báo cáo, lịch gửi, tạo và tải báo cáo PDF/CSV/JSON.",
  ai: "Trợ lý AI, hội thoại, phân tích, tóm tắt và đề xuất khắc phục.",
  automation: "Workflow n8n, phiên thực thi và mô phỏng hành động SOAR.",
  demo: "Mô phỏng bệnh nhân và tấn công phục vụ trình diễn.",
  system: "Sức khỏe, chỉ số, tìm kiếm và siêu dữ liệu API.",
  vulnerabilities: "Lỗ hổng CVE và trạng thái khắc phục.",
  playbooks: "Cẩm nang SOAR và các bước thực thi.",
  "detection-rules": "Quy tắc phát hiện Sigma / YARA / KQL.",
  "threat-intel": "Chỉ dấu tình báo mối đe dọa và quy kết tác nhân.",
  cases: "Hồ sơ điều tra liên kết sự cố.",
  remediations: "Nhiệm vụ khắc phục và theo dõi SLA.",
  scans: "Lần quét lỗ hổng và trạng thái thực thi.",
  findings: "Phát hiện đã chuẩn hóa từ máy quét.",
  "audit-logs": "Dấu vết kiểm toán bất biến.",
  notifications: "Thông báo trong ứng dụng.",
  sessions: "Phiên xác thực và dấu vân tay thiết bị.",
  "api-keys": "Khóa API cho tích hợp máy với máy.",
  departments: "Phòng ban và chủ sở hữu tài sản.",
  policies: "Chính sách an ninh và vòng đời phê duyệt.",
  integrations: "Trình kết nối SIEM, EDR, phiếu hỗ trợ và đám mây.",
  comments: "Bình luận cộng tác trên mọi đối tượng.",
  tags: "Thẻ phân loại dùng chung.",
  settings: "Cài đặt nền tảng theo phạm vi.",
  agents: "Tác nhân thu thập dữ liệu và trạng thái kết nối.",
};

const PUBLIC_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/health",
  "/api/health/db",
  "/api/demo/patients",
  "/api/demo/feed",
  "/api/demo/attack",
]);

const resourceBySegment = new Map(resources.map((resource) => [resource.name, resource]));

const toOpenApiPath = (path) => path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");

const tagForPath = (path) => {
  const segments = path.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const first = segments[0] || "system";
  if (first === "firewall-rules") return "firewall-rules";
  if (resourceBySegment.has(first)) return first;
  if (TAG_DESCRIPTIONS[first]) return first;
  if (["login", "logout", "register", "password", "forgot-password", "reset-password", "me"].includes(first)) return "auth";
  return first;
};

const pathParameters = (path) => {
  const names = [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1]);
  return names.map((name) => ({
    name,
    in: "path",
    required: true,
    schema: { type: "string", format: name === "id" ? "uuid" : undefined },
    description: name === "id" ? "Mã định danh UUID" : `Tham số ${name}`,
  }));
};

const queryParameters = (path, method) => {
  if (method !== "get" || path.endsWith("/export")) return [];
  if (path.includes(":id")) return [];
  return [
    { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 }, description: "Trang hiện tại" },
    { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200, default: 25 }, description: "Số bản ghi mỗi trang" },
    { name: "search", in: "query", schema: { type: "string" }, description: "Tìm kiếm toàn văn" },
    { name: "sort", in: "query", schema: { type: "string" }, description: "Cột sắp xếp" },
    { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" }, description: "Chiều sắp xếp" },
    { name: "severity", in: "query", schema: { type: "string", enum: ["critical", "high", "medium", "low", "info"] }, description: "Lọc theo mức độ" },
    { name: "status", in: "query", schema: { type: "string" }, description: "Lọc theo trạng thái" },
    { name: "from", in: "query", schema: { type: "string", format: "date-time" }, description: "Từ thời điểm" },
    { name: "to", in: "query", schema: { type: "string", format: "date-time" }, description: "Đến thời điểm" },
  ];
};

const operationSummary = (path, method) => {
  const clean = path.replace(/^\/api\/?/, "");
  const parts = clean.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "";
  const isAction = parts.length > 1 && !last.startsWith(":") && !["export", "stats", "bulk", "comments"].includes(last);
  if (method === "get" && last.startsWith(":")) return `Lấy chi tiết ${clean}`;
  if (method === "get" && last === "export") return `Xuất CSV ${parts[0] || "dữ liệu"}`;
  if (method === "get" && last === "stats") return `Thống kê ${parts[0] || "dữ liệu"}`;
  if (method === "get") return `Danh sách ${clean}`;
  if (method === "post" && isAction) return `Thực hiện hành động ${last}`;
  if (method === "post" && last === "bulk") return `Tạo hàng loạt ${parts[0] || "bản ghi"}`;
  if (method === "post") return `Tạo ${clean}`;
  if (method === "put") return `Cập nhật toàn bộ ${clean}`;
  if (method === "patch") return `Cập nhật một phần ${clean}`;
  if (method === "delete") return `Xóa ${clean}`;
  return `${method.toUpperCase()} ${clean}`;
};

const requestBody = (path, method) => {
  if (!["post", "put", "patch"].includes(method)) return undefined;
  if (path.endsWith("/export") || path.endsWith("/complete")) return undefined;
  const tag = tagForPath(path);
  const resource = resourceBySegment.get(tag);
  const schema = resource
    ? {
        type: "object",
        properties: Object.fromEntries(resource.columns.map((column) => [column, { description: `Trường ${column}` }])),
        required: method === "post" ? resource.requiredColumns : undefined,
      }
    : { type: "object", additionalProperties: true, description: "Nội dung yêu cầu theo đặc tả của endpoint." };
  return {
    required: true,
    content: { "application/json": { schema } },
  };
};

const buildOpenApi = (routes, config) => {
  const paths = {};
  for (const route of routes) {
    const path = toOpenApiPath(route.path);
    const method = route.method.toLowerCase();
    if (!paths[path]) paths[path] = {};
    const tag = tagForPath(route.path);
    const publicRoute = PUBLIC_PATHS.has(route.path);
    const operation = {
      tags: [tag],
      summary: operationSummary(route.path, method),
      operationId: `${method}_${route.path.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
      parameters: [...pathParameters(route.path), ...queryParameters(route.path, method)],
      responses: {
        200: { description: "Thành công", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
        201: { description: "Đã tạo", content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } } },
        400: { description: "Yêu cầu không hợp lệ", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        401: { description: "Chưa xác thực", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        403: { description: "Không đủ quyền", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        404: { description: "Không tìm thấy", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        500: { description: "Lỗi máy chủ", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
      },
    };
    if (!publicRoute) operation.security = [{ bearerAuth: [] }];
    const body = requestBody(route.path, method);
    if (body) operation.requestBody = body;
    paths[path][method] = operation;
  }

  const tags = Object.entries(TAG_DESCRIPTIONS).map(([name, description]) => ({ name, description }));
  return {
    openapi: "3.0.3",
    info: {
      title: "MedicareGuard SOC API",
      version: "1.0.0",
      description: [
        "API REST đầy đủ cho nền tảng MedicareGuard SOC.",
        "",
        "**Xác thực:** gửi `Authorization: Bearer <JWT>` cho mọi endpoint được bảo vệ.",
        "Lấy token qua `POST /api/auth/login` với tài khoản demo `admin@medicareguard.io` / `Admin@123`.",
        "",
        `Tổng số endpoint được ghi nhận: **${routes.length}**.`,
      ].join("\n"),
      contact: { name: "MedicareGuard SOC", url: "https://github.com/Chamm286/MedicareGuard" },
    },
    servers: [
      { url: `http://localhost:${config.port}`, description: "Môi trường phát triển" },
      { url: "/", description: "Máy chủ hiện tại" },
    ],
    tags,
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "JWT lấy từ /api/auth/login" },
      },
      schemas: {
        SuccessResponse: {
          type: "object",
          properties: {
            data: { description: "Dữ liệu trả về (đối tượng, mảng hoặc giá trị tổng hợp)." },
            pagination: { $ref: "#/components/schemas/Pagination" },
            message: { type: "string", description: "Thông điệp thành công." },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string", example: "Không tìm thấy cảnh báo" },
            message: { type: "string", example: "Không tìm thấy cảnh báo" },
            details: { type: "object", additionalProperties: true },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 25 },
            total: { type: "integer", example: 140 },
            pages: { type: "integer", example: 6 },
          },
        },
      },
    },
  };
};

module.exports = { buildOpenApi };
