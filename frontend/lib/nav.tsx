import type { Role } from "./access";
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
  ShoppingBag,
  Siren,
  Store,
  Target,
  Users,
  Workflow,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  roles?: Role[];
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    title: "Vận hành",
    items: [
      { label: "Trung tâm chỉ huy", href: "/dashboard", icon: Gauge, roles: ["admin", "analyst", "hunter", "viewer"] },
      { label: "Săn tìm mối đe dọa", href: "/hunting", icon: Target, roles: ["admin", "analyst", "hunter"] },
      { label: "Cảnh báo", href: "/alerts", icon: ShieldAlert, badge: "live", roles: ["admin", "analyst", "hunter", "viewer"] },
      { label: "Sự cố", href: "/incidents", icon: Siren, roles: ["admin", "analyst", "hunter", "viewer"] },
    ],
  },
  {
    title: "Tình báo mối đe dọa",
    items: [
      { label: "Bối cảnh mối đe dọa", href: "/threats", icon: Radar, roles: ["admin", "analyst", "hunter"] },
      { label: "Tình báo đe dọa", href: "/threat-intel", icon: Fingerprint, roles: ["admin", "analyst", "hunter"] },
      { label: "Lỗ hổng", href: "/vulnerabilities", icon: Bug, roles: ["admin", "analyst", "hunter"] },
    ],
  },
  {
    title: "Phơi nhiễm & Ứng phó",
    items: [
      { label: "Kiểm kê tài sản", href: "/assets", icon: HardDrive, roles: ["admin", "analyst", "hunter"] },
      { label: "Chính sách tường lửa", href: "/firewall", icon: Flame, roles: ["admin", "analyst"] },
      { label: "Playbook", href: "/playbooks", icon: ListTree, roles: ["admin", "analyst"] },
      { label: "Tự động hóa", href: "/automation", icon: Workflow, badge: "n8n", roles: ["admin", "analyst"] },
    ],
  },
  {
    title: "Tình báo & Báo cáo",
    items: [
      { label: "Chuyên viên AI", href: "/ai", icon: Bot, badge: "AI", roles: ["admin", "analyst", "hunter", "viewer"] },
      { label: "Báo cáo", href: "/reports", icon: FileText, roles: ["admin", "analyst", "hunter", "viewer"] },
      { label: "Nhật ký hoạt động", href: "/logs", icon: Activity, roles: ["admin", "analyst", "hunter"] },
    ],
  },
  {
    title: "Thương mại điện tử",
    items: [
      { label: "Medicare Store", href: "/store", icon: ShoppingBag, roles: ["admin", "analyst", "hunter", "viewer"] },
      { label: "Quản trị cửa hàng", href: "/store/admin", icon: Store, roles: ["admin", "analyst"] },
    ],
  },
  {
    title: "Quản trị",
    items: [
      { label: "Người dùng & Vai trò", href: "/users", icon: Users, roles: ["admin", "analyst"] },
      { label: "Cài đặt", href: "/settings", icon: LockKeyhole, roles: ["admin"] },
    ],
  },
];

export const pageTitles: Record<string, { title: string; subtitle: string; icon: LucideIcon }> = {
  "/dashboard": { title: "Trung tâm chỉ huy", subtitle: "Tình trạng bảo mật trực tiếp trên nền tảng Medicare", icon: Gauge },
  "/hunting": { title: "Săn tìm mối đe dọa", subtitle: "Giả thuyết, tín hiệu và điều tra chuyên sâu cho threat hunter", icon: Target },
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
  { label: "Mở hàng đợi cảnh báo", href: "/alerts", icon: ShieldAlert, roles: ["admin", "analyst", "hunter", "viewer"] },
  { label: "Mở chuyên viên AI", href: "/ai", icon: Bot, roles: ["admin", "analyst", "hunter", "viewer"] },
  { label: "Xem xét sự cố", href: "/incidents", icon: Siren, roles: ["admin", "analyst", "hunter", "viewer"] },
  { label: "Xuất báo cáo bảo mật", href: "/reports", icon: BarChart3, roles: ["admin", "analyst", "hunter", "viewer"] },
  { label: "Chính sách tường lửa", href: "/firewall", icon: Network, roles: ["admin", "analyst"] },
  { label: "Kiểm kê tài sản", href: "/assets", icon: HardDrive, roles: ["admin", "analyst", "hunter"] },
  { label: "Thông tin về mối đe dọa", href: "/threat-intel", icon: AlertTriangle, roles: ["admin", "analyst", "hunter"] },
  { label: "Tự động hóa quy trình làm việc", href: "/automation", icon: Workflow, roles: ["admin", "analyst"] },
];

export { ChevronRight };
