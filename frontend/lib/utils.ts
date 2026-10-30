import clsx, { type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const formatNumber = (value: number | string | null | undefined) => {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return "0";
  return new Intl.NumberFormat("vi-VN", { notation: number >= 100000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(number);
};

export const formatDate = (value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", options || { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const formatDateShort = (value: string | Date | null | undefined) => formatDate(value, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export const relativeTime = (value: string | Date | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 1) return "vừa xong";
  if (Math.abs(minutes) < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return `${days} ngày trước`;
  return formatDate(date, { day: "2-digit", month: "short" });
};

export const timeUntil = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  if (Number.isNaN(diff)) return null;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.max(0, Math.floor((diff % 3600000) / 60000));
  if (diff < 0) return `Quá hạn ${Math.abs(hours)}g ${minutes}p`;
  return `Còn ${hours}g ${minutes}p`;
};

export const initials = (name?: string | null, email?: string | null) => {
  if (name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "MG";
};

export const firstName = (name?: string | null) => (name ? name.split(/\s+/)[0] : "Chuyên viên");

export const countryFlag = (code?: string | null) => {
  if (!code || code.length !== 2 || code === "UN") return "🌐";
  return String.fromCodePoint(...code.toUpperCase().split("").map((char) => 127397 + char.charCodeAt(0)));
};

export const severityStyles: Record<string, string> = {
  critical: "border-critical/30 bg-critical/10 text-critical",
  high: "border-high/30 bg-high/10 text-high",
  medium: "border-medium/30 bg-medium/10 text-medium",
  low: "border-low/30 bg-low/10 text-low",
  info: "border-brand-400/30 bg-brand-400/10 text-brand-300",
};

export const severityDot: Record<string, string> = {
  critical: "bg-critical",
  high: "bg-high",
  medium: "bg-medium",
  low: "bg-low",
  info: "bg-brand-400",
};

export const statusStyles: Record<string, string> = {
  open: "border-critical/30 bg-critical/10 text-red-300",
  investigating: "border-medium/30 bg-medium/10 text-amber-200",
  contained: "border-brand-400/30 bg-brand-400/10 text-brand-300",
  eradicated: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  recovered: "border-low/30 bg-low/10 text-emerald-300",
  resolved: "border-low/30 bg-low/10 text-emerald-300",
  closed: "border-white/10 bg-white/5 text-slate-400",
  false_positive: "border-white/10 bg-white/5 text-slate-400",
  active: "border-critical/30 bg-critical/10 text-red-300",
  blocked: "border-white/10 bg-white/5 text-slate-400",
  monitoring: "border-medium/30 bg-medium/10 text-amber-200",
  online: "border-low/30 bg-low/10 text-emerald-300",
  offline: "border-white/10 bg-white/5 text-slate-400",
  maintenance: "border-medium/30 bg-medium/10 text-amber-200",
  disabled: "border-white/10 bg-white/5 text-slate-500",
  pending: "border-medium/30 bg-medium/10 text-amber-200",
  in_progress: "border-brand-400/30 bg-brand-400/10 text-brand-300",
  compliant: "border-low/30 bg-low/10 text-emerald-300",
  completed: "border-low/30 bg-low/10 text-emerald-300",
  ready: "border-low/30 bg-low/10 text-emerald-300",
  connected: "border-low/30 bg-low/10 text-emerald-300",
  degraded: "border-medium/30 bg-medium/10 text-amber-200",
};

export const riskColor = (score: number) => {
  if (score >= 80) return "text-critical";
  if (score >= 60) return "text-high";
  if (score >= 40) return "text-medium";
  return "text-low";
};

export const riskBar = (score: number) => {
  if (score >= 80) return "from-red-500 to-rose-400";
  if (score >= 60) return "from-orange-500 to-amber-400";
  if (score >= 40) return "from-yellow-500 to-amber-300";
  return "from-emerald-500 to-teal-400";
};

const viLabels: Record<string, string> = {
  critical: "Nghiêm trọng", high: "Cao", medium: "Trung bình", low: "Thấp", info: "Thông tin",
  open: "Mở", investigating: "Đang điều tra", contained: "Đã cô lập", eradicated: "Đã loại bỏ",
  recovered: "Đã phục hồi", resolved: "Đã xử lý", closed: "Đã đóng", false_positive: "Dương tính giả",
  active: "Đang hoạt động", blocked: "Bị chặn", monitoring: "Đang giám sát", online: "Trực tuyến",
  offline: "Ngoại tuyến", maintenance: "Bảo trì", disabled: "Tắt", enabled: "Bật", pending: "Chờ xử lý",
  in_progress: "Đang thực hiện", compliant: "Tuân thủ", completed: "Hoàn thành", ready: "Sẵn sàng",
  connected: "Đã kết nối", degraded: "Suy giảm", unknown: "Không rõ",
  administrator: "Quản trị viên", admin: "Quản trị viên", analyst: "Chuyên viên phân tích",
  viewer: "Người xem", member: "Thành viên", hunter: "Chuyên viên săn tìm", "soc analyst": "Chuyên viên SOC", "soc_analyst": "Chuyên viên SOC",
  malware: "Mã độc", ransomware: "Ransomware", phishing: "Phishing", "data-breach": "Vi phạm dữ liệu",
  "data breach": "Vi phạm dữ liệu", "brute force": "Dò mật khẩu", "data exfiltration": "Rò rỉ dữ liệu", "web attack": "Tấn công web", "supply chain": "Chuỗi cung ứng", cryptojacking: "Đào tiền mã hóa", "insider threat": "Mối đe dọa nội bộ", "zero-day": "Zero-day", ddos: "DDoS", vulnerability: "Lỗ hổng", availability: "Tính sẵn sàng",
  insider: "Nội gián", generic: "Chung", dos: "Từ chối dịch vụ", other: "Khác",
  global: "Toàn cầu", security: "Bảo mật", reporting: "Báo cáo", automation: "Tự động hóa",
  notifications: "Thông báo", executive: "Điều hành", weekly: "Hàng tuần", daily: "Hàng ngày",
  monthly: "Hàng tháng", quarterly: "Hàng quý", pass: "Đạt", fail: "Không đạt",
  malicious: "Độc hại", suspicious: "Đáng ngờ", benign: "Lành tính",
  escalation: "Leo thang", resolution: "Giải quyết", event: "Sự kiện", audit: "Kiểm toán",
  inbound: "Vào", outbound: "Ra", allow: "Cho phép", deny: "Từ chối", block: "Chặn",
  server: "Máy chủ", web_server: "Máy chủ web", api_gateway: "Cổng API", vpn: "VPN", identity: "Danh tính", kubernetes: "Kubernetes", workstation: "Máy trạm", database: "Cơ sở dữ liệu", storage: "Lưu trữ", medical_device: "Thiết bị y tế", siem: "SIEM", dns: "DNS", email: "Email", ci_cd: "CI/CD", gateway: "Cổng mạng", network: "Mạng",
  cloud: "Đám mây", endpoint: "Điểm cuối", mobile: "Di động", iot: "IoT", printer: "Máy in",
  production: "Sản xuất", staging: "Thử nghiệm", development: "Phát triển",
  internal: "Nội bộ", external: "Bên ngoài", public: "Công khai", private: "Riêng tư",
  tcp: "TCP", udp: "UDP", icmp: "ICMP", any: "Bất kỳ", none: "Không",
  manual: "Thủ công", auth: "Xác thực", alert: "Cảnh báo", user: "Người dùng", login: "Đăng nhập", logout: "Đăng xuất", create: "Tạo", update: "Cập nhật", delete: "Xóa", run: "Chạy", purge: "Dọn dẹp", write: "Ghi",
  source_ip: "IP nguồn", destination_ip: "IP đích", destination_port: "Cổng đích", source_port: "Cổng nguồn", resource_id: "ID tài nguyên", event_type: "Loại sự kiện", user_agent: "Tác nhân người dùng",
  "credential-access": "Truy cập thông tin xác thực", "data-exfiltration": "Rò rỉ dữ liệu",
  "insider-threat": "Mối đe dọa nội bộ", "pending_evidence": "Chờ bằng chứng", "at_risk": "Có rủi ro",
  "non_compliant": "Không tuân thủ", "in_review": "Đang rà soát", "under_review": "Đang rà soát",
  approved: "Đã phê duyệt", expired: "Hết hạn", "accepted_risk": "Chấp nhận rủi ro",
  queued: "Đang chờ", running: "Đang chạy", generating: "Đang tạo", archived: "Đã lưu trữ",
  draft: "Bản nháp", published: "Đã phát hành", scheduled: "Đã lên lịch", testing: "Đang kiểm thử",
  waiting: "Đang chờ", triage: "Phân loại", containment: "Cô lập", detection: "Phát hiện",
  system: "Hệ thống", revoked: "Đã thu hồi", spam: "Thư rác", clean: "Sạch", quarantined: "Cách ly",
  delivered: "Đã gửi", reported: "Đã báo cáo", success: "Thành công", failed: "Thất bại",
  dispatched: "Đã gửi đi", backup: "Sao lưu", finance: "Tài chính", "clinical systems": "Hệ thống lâm sàng",
  "cdn/waf": "CDN/WAF", ehr: "EHR", edr: "EDR", "medical_iot": "IoT y tế", laptop: "Máy tính xách tay",
  tablet: "Máy tính bảng", reconnaissance: "Trinh sát", weaponization: "Vũ khí hóa",
  delivery: "Phân phối", exploitation: "Khai thác", "command-and-control": "Chỉ huy và điều khiển",
  "actions-on-objective": "Hành động mục tiêu",
};

const countryLabels: Record<string, string> = {
  China: "Trung Quốc", Russia: "Nga", "United States": "Hoa Kỳ", Brazil: "Brazil", India: "Ấn Độ",
  Iran: "Iran", "North Korea": "Triều Tiên", Vietnam: "Việt Nam", Germany: "Đức", Netherlands: "Hà Lan",
  Ukraine: "Ukraine", Romania: "Romania", Nigeria: "Nigeria", Indonesia: "Indonesia", "South Korea": "Hàn Quốc",
  Turkey: "Thổ Nhĩ Kỳ", "United Kingdom": "Vương quốc Anh", France: "Pháp", Singapore: "Singapore", Japan: "Nhật Bản",
};

const countryCodes: Record<string, string> = {
  China: "CN", Russia: "RU", "United States": "US", Brazil: "BR", India: "IN", Iran: "IR", "North Korea": "KP",
  Vietnam: "VN", Germany: "DE", Netherlands: "NL", Ukraine: "UA", Romania: "RO", Nigeria: "NG", Indonesia: "ID",
  "South Korea": "KR", Turkey: "TR", "United Kingdom": "GB", France: "FR", Singapore: "SG", Japan: "JP",
};

export const countryName = (value?: string | null) => {
  if (!value) return value || "";
  return countryLabels[value] || value;
};

export const countryCode = (value?: string | null) => {
  if (!value) return "";
  return countryCodes[value] || "";
};

export const titleCase = (value?: string | null) => {
  const raw = (value || "").trim();
  const key = raw.toLowerCase();
  if (viLabels[key]) return viLabels[key];
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const percentage = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);
