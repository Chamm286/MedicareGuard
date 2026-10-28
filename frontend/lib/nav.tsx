import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Bug,
  ChevronRight,
  FileText,
  Fingerprint,
  Flame,
  Gauge,
  HardDrive,
  ListTree,
  LockKeyhole,
  type LucideIcon,
  Network,
  Radar,
  Shield,
  ShieldAlert,
  Siren,
  Users,
  Workflow,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    title: "Vận hành",
    items: [
      { label: "Trung tâm chỉ huy", href: "/dashboard", icon: Gauge },
      { label: "Cảnh báo", href: "/alerts", icon: ShieldAlert, badge: "live" },
      { label: "Sự cố", href: "/incidents", icon: Siren },
    ],
  },
  {
    title: "Tình báo mối đe dọa",
    items: [
      { label: "Bối cảnh mối đe dọa", href: "/threats", icon: Radar },
      { label: "Tình báo đe dọa", href: "/threat-intel", icon: Fingerprint },
      { label: "Lỗ hổng", href: "/vulnerabilities", icon: Bug },
    ],
  },
  {
    title: "Phơi nhiễm & Ứng phó",
    items: [
      { label: "Kiểm kê tài sản", href: "/assets", icon: HardDrive },
      { label: "Chính sách tường lửa", href: "/firewall", icon: Flame },
      { label: "Playbook", href: "/playbooks", icon: ListTree },
      { label: "Tự động hóa", href: "/automation", icon: Workflow, badge: "n8n" },
    ],
  },
  {
    title: "Tình báo & Báo cáo",
    items: [
      { label: "Chuyên viên AI", href: "/ai", icon: Bot, badge: "AI" },
      { label: "Báo cáo", href: "/reports", icon: FileText },
      { label: "Nhật ký hoạt động", href: "/logs", icon: Activity },
    ],
  },
  {
    title: "Quản trị",
    items: [
      { label: "Người dùng & Vai trò", href: "/users", icon: Users },
      { label: "Cài đặt", href: "/settings", icon: LockKeyhole },
    ],
  },
];

export const pageTitles: Record<string, { title: string; subtitle: string; icon: LucideIcon }> = {
  "/dashboard": { title: "Trung tâm chỉ huy", subtitle: "Tình trạng bảo mật trực tiếp trên nền tảng Medicare", icon: Gauge },
  "/alerts": { title: "Hàng đợi cảnh báo", subtitle: "Phân loại và phản hồi các phát hiện trong thời gian thực", icon: ShieldAlert },
  "/incidents": { title: "Ứng phó sự cố", subtitle: "Cô lập, loại bỏ và phục hồi sau các sự cố bảo mật", icon: Siren },
  "/threats": { title: "Bối cảnh mối đe dọa", subtitle: "Nguồn gốc tấn công, tác nhân và kỹ thuật MITRE", icon: Radar },
  "/threat-intel": { title: "Tình báo mối đe dọa", subtitle: "Chỉ số tình báo và phân bổ tác nhân", icon: Fingerprint },
  "/vulnerabilities": { title: "Quản lý lỗ hổng", subtitle: "Mức độ tiếp xúc với CVE trên toàn bộ tài sản", icon: Bug },
  "/assets": { title: "Kiểm kê tài sản", subtitle: "Mức độ quan trọng, quyền sở hữu và mức độ rủi ro", icon: HardDrive },
  "/firewall": { title: "Chính sách tường lửa", subtitle: "Thực thi mạng và chặn tự động", icon: Flame },
  "/playbooks": { title: "Playbook ứng phó", subtitle: "Các thủ tục lặp lại cho nhóm SOC", icon: ListTree },
  "/automation": { title: "Tự động hóa SOAR", subtitle: "Quy trình n8n được kết nối với cơ sở dữ liệu SOC", icon: Workflow },
  "/ai": { title: "Chuyên viên AI", subtitle: "Điều tra dựa trên dữ liệu an ninh trực tiếp", icon: Bot },
  "/reports": { title: "Báo cáo & Phân tích", subtitle: "Báo cáo an ninh điều hành và vận hành", icon: FileText },
  "/logs": { title: "Nhật ký hoạt động", subtitle: "Dòng bất biến của các sự kiện nền tảng và bảo mật", icon: Activity },
  "/users": { title: "Người dùng & Vai trò", subtitle: "Vòng đời nhận dạng và kiểm soát truy cập dựa trên vai trò", icon: Users },
  "/settings": { title: "Cài đặt nền tảng", subtitle: "Cấu hình, tích hợp và cấu hình nền tảng", icon: LockKeyhole },
};

export const quickCommands: NavItem[] = [
  { label: "Mở hàng đợi cảnh báo", href: "/alerts", icon: ShieldAlert },
  { label: "Mở chuyên viên AI", href: "/ai", icon: Bot },
  { label: "Xem xét sự cố", href: "/incidents", icon: Siren },
  { label: "Xuất báo cáo bảo mật", href: "/reports", icon: BarChart3 },
  { label: "Chính sách tường lửa", href: "/firewall", icon: Network },
  { label: "Kiểm kê tài sản", href: "/assets", icon: HardDrive },
  { label: "Thông tin về mối đe dọa", href: "/threat-intel", icon: AlertTriangle },
  { label: "Tự động hóa quy trình làm việc", href: "/automation", icon: Workflow },
];

export { ChevronRight };
