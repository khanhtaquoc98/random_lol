export type RoleId = "TOP" | "JG" | "MID" | "AD" | "SP";

export type DamageType = "AD" | "AP" | "MIXED" | "TANK";

export interface RoleInfo {
  id: RoleId;
  shortName: string;
  name: string;
  englishName: string;
  accentColor: string;
  badgeBg: string;
  description: string;
}

export interface Champion {
  id: string; // Data Dragon ID
  name: string;
  title: string;
  roles: RoleId[];
  damageType: DamageType;
  classes: string[];
  difficulty: 1 | 2 | 3;
}

export const ROLES: RoleInfo[] = [
  {
    id: "TOP",
    shortName: "TOP",
    name: "Đường Trên",
    englishName: "Top Lane",
    accentColor: "#F59E0B",
    badgeBg: "from-amber-500/20 to-amber-900/40",
    description: "Đấu sĩ, Đỡ đòn độc lập cánh trên",
  },
  {
    id: "JG",
    shortName: "JG",
    name: "Đi Rừng",
    englishName: "Jungle",
    accentColor: "#10B981",
    badgeBg: "from-emerald-500/20 to-emerald-900/40",
    description: "Kiểm soát mục tiêu lớn & Gank các đường",
  },
  {
    id: "MID",
    shortName: "MID",
    name: "Đường Giữa",
    englishName: "Mid Lane",
    accentColor: "#8B5CF6",
    badgeBg: "from-violet-500/20 to-violet-900/40",
    description: "Pháp sư & Sát thủ trung tâm bản đồ",
  },
  {
    id: "AD",
    shortName: "AD",
    name: "Xạ Thủ",
    englishName: "Bot Carry (ADC)",
    accentColor: "#EF4444",
    badgeBg: "from-rose-500/20 to-rose-900/40",
    description: "Nguồn sát thương chủ lực cuối trận",
  },
  {
    id: "SP",
    shortName: "SP",
    name: "Hỗ Trợ",
    englishName: "Support",
    accentColor: "#06B6D4",
    badgeBg: "from-cyan-500/20 to-cyan-900/40",
    description: "Bảo kê, Mở giao tranh & Kiểm soát tầm nhìn",
  },
];

export const DDRAGON_VERSION = "16.21.1";

const DDRAGON_ID_FIXES: Record<string, string> = {
  KaiSa: "Kaisa",
  kaisa: "Kaisa",
  ChoGath: "Chogath",
  chogath: "Chogath",
  KhaZix: "Khazix",
  khazix: "Khazix",
  VelKoz: "Velkoz",
  velkoz: "Velkoz",
  LeBlanc: "Leblanc",
  leblanc: "Leblanc",
  BelVeth: "Belveth",
  belveth: "Belveth",
  FiddleSticks: "Fiddlesticks",
  fiddlesticks: "Fiddlesticks",
  Wukong: "MonkeyKing",
};

export function normalizeDDragonId(id: string): string {
  const cleaned = (id || "Aatrox").trim();
  return DDRAGON_ID_FIXES[cleaned] || cleaned;
}

export function getChampionSquareUrl(id: string): string {
  const safeId = normalizeDDragonId(id);
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${safeId}.png`;
}

export function getChampionLoadingUrl(id: string): string {
  const safeId = normalizeDDragonId(id);
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${safeId}_0.jpg`;
}

export const CHAMPIONS: Champion[] = [
  // --- TOP & MULTI-ROLE ---
  { id: "Aatrox", name: "Aatrox", title: "Quỷ Kiếm Darkin", roles: ["TOP"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 2 },
  { id: "Camille", name: "Camille", title: "Bóng Thép", roles: ["TOP", "SP"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 3 },
  { id: "ChoGath", name: "Cho'Gath", title: "Quái Vật Hư Không", roles: ["TOP", "MID"], damageType: "TANK", classes: ["Đỡ Đòn", "Pháp Sư"], difficulty: 1 },
  { id: "Darius", name: "Darius", title: "Đại Tướng Noxus", roles: ["TOP"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 2 },
  { id: "DrMundo", name: "Dr. Mundo", title: "Cuồng Nhân Xứ Zaun", roles: ["TOP", "JG"], damageType: "TANK", classes: ["Đỡ Đòn", "Đấu Sĩ"], difficulty: 1 },
  { id: "Fiora", name: "Fiora", title: "Nữ Kiếm Sư", roles: ["TOP"], damageType: "AD", classes: ["Đấu Sĩ", "Sát Thủ"], difficulty: 3 },
  { id: "Gangplank", name: "Gangplank", title: "Hiểm Họa Vùng Saltwater", roles: ["TOP", "MID"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 3 },
  { id: "Garen", name: "Garen", title: "Sức Mạnh Của Demacia", roles: ["TOP", "MID"], damageType: "AD", classes: ["Đấu Sĩ", "Đỡ Đòn"], difficulty: 1 },
  { id: "Gnar", name: "Gnar", title: "Mắt Xích Thượng Cổ", roles: ["TOP"], damageType: "AD", classes: ["Đấu Sĩ", "Đỡ Đòn"], difficulty: 3 },
  { id: "Gwen", name: "Gwen", title: "Búp Bê Ước Nguyện", roles: ["TOP", "JG"], damageType: "AP", classes: ["Đấu Sĩ"], difficulty: 2 },
  { id: "Illaoi", name: "Illaoi", title: "Nữ Tu Thủy Thần", roles: ["TOP"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 2 },
  { id: "Irelia", name: "Irelia", title: "Vũ Kiếm Sư", roles: ["TOP", "MID"], damageType: "AD", classes: ["Đấu Sĩ", "Sát Thủ"], difficulty: 3 },
  { id: "Jax", name: "Jax", title: "Bậc Thầy Vũ Khí", roles: ["TOP", "JG"], damageType: "MIXED", classes: ["Đấu Sĩ"], difficulty: 2 },
  { id: "Jayce", name: "Jayce", title: "Người Bảo Hộ Mai Sau", roles: ["TOP", "MID"], damageType: "AD", classes: ["Đấu Sĩ", "Xạ Thủ"], difficulty: 3 },
  { id: "KSante", name: "K'Sante", title: "Niềm Kiêu Hãnh Của Nazumah", roles: ["TOP"], damageType: "TANK", classes: ["Đỡ Đòn", "Đấu Sĩ"], difficulty: 3 },
  { id: "Kayle", name: "Kayle", title: "Thiên Thần Phán Quyết", roles: ["TOP", "MID"], damageType: "MIXED", classes: ["Đấu Sĩ", "Xạ Thủ"], difficulty: 2 },
  { id: "Kennen", name: "Kennen", title: "Trái Tim Sấm Sét", roles: ["TOP", "MID"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 2 },
  { id: "Kled", name: "Kled", title: "Kỵ Sĩ Cáu Kỉnh", roles: ["TOP"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 2 },
  { id: "Malphite", name: "Malphite", title: "Mảnh Vỡ Thiên Thạch", roles: ["TOP", "MID", "SP"], damageType: "TANK", classes: ["Đỡ Đòn"], difficulty: 1 },
  { id: "Mordekaiser", name: "Mordekaiser", title: "Ác Quỷ Thiết Giáp", roles: ["TOP", "JG"], damageType: "AP", classes: ["Đấu Sĩ"], difficulty: 1 },
  { id: "Nasus", name: "Nasus", title: "Nhà Thông Thái Sa Mạc", roles: ["TOP"], damageType: "AD", classes: ["Đấu Sĩ", "Đỡ Đòn"], difficulty: 1 },
  { id: "Olaf", name: "Olaf", title: "Chiến Binh Điên Cuồng", roles: ["TOP", "JG"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 2 },
  { id: "Ornn", name: "Ornn", title: "Ngọn Lửa Khởi Nguyên", roles: ["TOP"], damageType: "TANK", classes: ["Đỡ Đòn"], difficulty: 2 },
  { id: "Pantheon", name: "Pantheon", title: "Mũi Giáo Bất Diệt", roles: ["TOP", "JG", "MID", "SP"], damageType: "AD", classes: ["Đấu Sĩ", "Sát Thủ"], difficulty: 1 },
  { id: "Poppy", name: "Poppy", title: "Người Giữ Búa", roles: ["TOP", "JG", "SP"], damageType: "TANK", classes: ["Đỡ Đòn", "Đấu Sĩ"], difficulty: 2 },
  { id: "Quinn", name: "Quinn", title: "Đôi Cánh Demacia", roles: ["TOP", "MID"], damageType: "AD", classes: ["Xạ Thủ", "Sát Thủ"], difficulty: 2 },
  { id: "Renekton", name: "Renekton", title: "Đồ Tể Sa Mạc", roles: ["TOP", "MID"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 1 },
  { id: "Riven", name: "Riven", title: "Kẻ Lưu Đầy", roles: ["TOP"], damageType: "AD", classes: ["Đấu Sĩ", "Sát Thủ"], difficulty: 3 },
  { id: "Rumble", name: "Rumble", title: "Hiểm Họa Cơ Khí", roles: ["TOP", "MID"], damageType: "AP", classes: ["Đấu Sĩ", "Pháp Sư"], difficulty: 3 },
  { id: "Sett", name: "Sett", title: "Đại Ca", roles: ["TOP", "SP"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 1 },
  { id: "Shen", name: "Shen", title: "Mắt Hoàng Hôn", roles: ["TOP", "SP"], damageType: "TANK", classes: ["Đỡ Đòn"], difficulty: 2 },
  { id: "Singed", name: "Singed", title: "Dược Sĩ Điên", roles: ["TOP"], damageType: "AP", classes: ["Đỡ Đòn", "Pháp Sư"], difficulty: 2 },
  { id: "Sion", name: "Sion", title: "Chiến Binh Bất Tử", roles: ["TOP"], damageType: "TANK", classes: ["Đỡ Đòn"], difficulty: 2 },
  { id: "TahmKench", name: "Tahm Kench", title: "Thủy Quái Đại Vương", roles: ["TOP", "SP"], damageType: "TANK", classes: ["Đỡ Đòn", "Hỗ Trợ"], difficulty: 1 },
  { id: "Teemo", name: "Teemo", title: "Trinh Sát Nhanh Nhẹn", roles: ["TOP", "JG", "SP"], damageType: "AP", classes: ["Xạ Thủ", "Pháp Sư"], difficulty: 1 },
  { id: "Trundle", name: "Trundle", title: "Vua Quỷ Khổng Lồ", roles: ["TOP", "JG"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 1 },
  { id: "Tryndamere", name: "Tryndamere", title: "Bá Vương Man Di", roles: ["TOP", "MID"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 1 },
  { id: "Urgot", name: "Urgot", title: "Pháo Đài Di Động", roles: ["TOP"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 2 },
  { id: "Volibear", name: "Volibear", title: "Bão Tố Cuồng Nộ", roles: ["TOP", "JG"], damageType: "MIXED", classes: ["Đấu Sĩ", "Đỡ Đòn"], difficulty: 1 },
  { id: "Yorick", name: "Yorick", title: "Kẻ Dẫn Dắt Linh Hồn", roles: ["TOP"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 2 },
  { id: "Ambessa", name: "Ambessa", title: "Mẫu Thân Chiến Tranh", roles: ["TOP", "JG"], damageType: "AD", classes: ["Đấu Sĩ", "Sát Thủ"], difficulty: 3 },

  // --- JUNGLE & MULTI-ROLE ---
  { id: "Amumu", name: "Amumu", title: "Xác Ướp U Sầu", roles: ["JG", "SP"], damageType: "TANK", classes: ["Đỡ Đòn"], difficulty: 1 },
  { id: "BelVeth", name: "Bel'Veth", title: "Chân Chúa Hư Không", roles: ["JG"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 2 },
  { id: "Briar", name: "Briar", title: "Cơn Đói Khát Cấm Kỵ", roles: ["JG", "TOP"], damageType: "AD", classes: ["Đấu Sĩ", "Sát Thủ"], difficulty: 2 },
  { id: "Diana", name: "Diana", title: "Vầng Trăng Ai Oán", roles: ["JG", "MID"], damageType: "AP", classes: ["Đấu Sĩ", "Sát Thủ"], difficulty: 2 },
  { id: "Ekko", name: "Ekko", title: "Cậu Bé Đảo Lộn Thời Gian", roles: ["JG", "MID"], damageType: "AP", classes: ["Sát Thủ"], difficulty: 3 },
  { id: "Elise", name: "Elise", title: "Nữ Hoàng Nhền Nhện", roles: ["JG", "SP"], damageType: "AP", classes: ["Sát Thủ", "Pháp Sư"], difficulty: 3 },
  { id: "Evelynn", name: "Evelynn", title: "Nỗi Đau Bỏng Cháy", roles: ["JG"], damageType: "AP", classes: ["Sát Thủ"], difficulty: 2 },
  { id: "Fiddlesticks", name: "Fiddlesticks", title: "Nỗi Sợ Viễn Cổ", roles: ["JG", "SP"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 2 },
  { id: "Gragas", name: "Gragas", title: "Gã Bợm Rượu", roles: ["TOP", "JG", "MID"], damageType: "AP", classes: ["Đấu Sĩ", "Pháp Sư"], difficulty: 2 },
  { id: "Graves", name: "Graves", title: "Kẻ Ngoài Vòng Pháp Luật", roles: ["JG"], damageType: "AD", classes: ["Xạ Thủ", "Đấu Sĩ"], difficulty: 2 },
  { id: "Hecarim", name: "Hecarim", title: "Bóng Ma Chiến Tranh", roles: ["JG"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 2 },
  { id: "Ivern", name: "Ivern", title: "Thụ Thần Thân Thiện", roles: ["JG", "SP"], damageType: "AP", classes: ["Hỗ Trợ"], difficulty: 3 },
  { id: "JarvanIV", name: "Jarvan IV", title: "Biểu Tượng Của Demacia", roles: ["JG", "TOP"], damageType: "AD", classes: ["Đấu Sĩ", "Đỡ Đòn"], difficulty: 1 },
  { id: "Karthus", name: "Karthus", title: "Tiếng Ru Tử Thần", roles: ["JG", "AD"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 2 },
  { id: "Kayn", name: "Kayn", title: "Tử Thần Bóng Tối", roles: ["JG"], damageType: "AD", classes: ["Đấu Sĩ", "Sát Thủ"], difficulty: 2 },
  { id: "KhaZix", name: "Kha'Zix", title: "Sát Thủ Hư Không", roles: ["JG"], damageType: "AD", classes: ["Sát Thủ"], difficulty: 2 },
  { id: "Kindred", name: "Kindred", title: "Thợ Săn Vĩnh Hằng", roles: ["JG"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 3 },
  { id: "LeeSin", name: "Lee Sin", title: "Thầy Tu Mù", roles: ["JG", "TOP"], damageType: "AD", classes: ["Đấu Sĩ", "Sát Thủ"], difficulty: 3 },
  { id: "Lillia", name: "Lillia", title: "Nụ Hoa Bẽn Lẽn", roles: ["JG", "TOP"], damageType: "AP", classes: ["Đấu Sĩ", "Pháp Sư"], difficulty: 2 },
  { id: "MasterYi", name: "Master Yi", title: "Kiếm Sư Wuju", roles: ["JG"], damageType: "AD", classes: ["Sát Thủ", "Đấu Sĩ"], difficulty: 1 },
  { id: "MonkeyKing", name: "Wukong", title: "Hầu Vương", roles: ["JG", "TOP"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 1 },
  { id: "Nidalee", name: "Nidalee", title: "Nữ Thợ Săn Hóa Thú", roles: ["JG"], damageType: "AP", classes: ["Sát Thủ", "Pháp Sư"], difficulty: 3 },
  { id: "Nocturne", name: "Nocturne", title: "Ác Mộng Vĩnh Cửu", roles: ["JG"], damageType: "AD", classes: ["Sát Thủ", "Đấu Sĩ"], difficulty: 1 },
  { id: "Nunu", name: "Nunu & Willump", title: "Cậu Bé Và Người Tuyết", roles: ["JG"], damageType: "TANK", classes: ["Đỡ Đòn"], difficulty: 1 },
  { id: "Rammus", name: "Rammus", title: "Tê Tê Gai", roles: ["JG"], damageType: "TANK", classes: ["Đỡ Đòn"], difficulty: 1 },
  { id: "RekSai", name: "Rek'Sai", title: "Nấm Mồ Hư Không", roles: ["JG", "TOP"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 2 },
  { id: "Rengar", name: "Rengar", title: "Thú Săn Mồi Kiêu Hãnh", roles: ["JG", "TOP"], damageType: "AD", classes: ["Sát Thủ"], difficulty: 3 },
  { id: "Sejuani", name: "Sejuani", title: "Cơn Thịnh Nộ Phương Bắc", roles: ["JG", "TOP"], damageType: "TANK", classes: ["Đỡ Đòn"], difficulty: 2 },
  { id: "Shaco", name: "Shaco", title: "Tên Hề Quỷ Quyệt", roles: ["JG", "SP"], damageType: "MIXED", classes: ["Sát Thủ"], difficulty: 3 },
  { id: "Shyvana", name: "Shyvana", title: "Long Nữ", roles: ["JG"], damageType: "MIXED", classes: ["Đấu Sĩ", "Pháp Sư"], difficulty: 1 },
  { id: "Skarner", name: "Skarner", title: "Thủ Vệ Cổ Nguyên", roles: ["JG", "TOP"], damageType: "TANK", classes: ["Đỡ Đòn", "Đấu Sĩ"], difficulty: 2 },
  { id: "Taliyah", name: "Taliyah", title: "Phù Thủy Đá", roles: ["MID", "JG"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 3 },
  { id: "Udyr", name: "Udyr", title: "Lữ Khách Tinh Linh", roles: ["JG", "TOP"], damageType: "MIXED", classes: ["Đấu Sĩ", "Đỡ Đòn"], difficulty: 2 },
  { id: "Vi", name: "Vi", title: "Cảnh Binh Piltover", roles: ["JG"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 1 },
  { id: "Viego", name: "Viego", title: "Hắc Diệt Đế Vương", roles: ["JG", "MID"], damageType: "AD", classes: ["Sát Thủ", "Đấu Sĩ"], difficulty: 2 },
  { id: "Warwick", name: "Warwick", title: "Quái Thú Xổng Chuồng", roles: ["JG", "TOP"], damageType: "MIXED", classes: ["Đấu Sĩ"], difficulty: 1 },
  { id: "XinZhao", name: "Xin Zhao", title: "Tể Tướng Demacia", roles: ["JG"], damageType: "AD", classes: ["Đấu Sĩ"], difficulty: 1 },
  { id: "Zac", name: "Zac", title: "Vũ Khí Bí Mật", roles: ["JG", "TOP", "SP"], damageType: "TANK", classes: ["Đỡ Đòn"], difficulty: 2 },

  // --- MID & MULTI-ROLE ---
  { id: "Ahri", name: "Ahri", title: "Hồ Ly Chín Đuôi", roles: ["MID"], damageType: "AP", classes: ["Pháp Sư", "Sát Thủ"], difficulty: 2 },
  { id: "Akali", name: "Akali", title: "Sát Thủ Đơn Độc", roles: ["MID", "TOP"], damageType: "AP", classes: ["Sát Thủ"], difficulty: 3 },
  { id: "Akshan", name: "Akshan", title: "Vệ Binh Ruồng Bỏ", roles: ["MID", "TOP"], damageType: "AD", classes: ["Xạ Thủ", "Sát Thủ"], difficulty: 3 },
  { id: "Anivia", name: "Anivia", title: "Phượng Hoàng Băng", roles: ["MID", "SP"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 3 },
  { id: "Annie", name: "Annie", title: "Đứa Trẻ Bóng Tối", roles: ["MID", "SP"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 1 },
  { id: "AurelionSol", name: "Aurelion Sol", title: "Ác Long Thượng Giới", roles: ["MID"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 2 },
  { id: "Aurora", name: "Aurora", title: "Phù Thủy Giữa Hai Thế Giới", roles: ["MID", "TOP"], damageType: "AP", classes: ["Pháp Sư", "Sát Thủ"], difficulty: 2 },
  { id: "Azir", name: "Azir", title: "Hoàng Đế Sa Mạc", roles: ["MID"], damageType: "AP", classes: ["Pháp Sư", "Xạ Thủ"], difficulty: 3 },
  { id: "Cassiopeia", name: "Cassiopeia", title: "Xà Nữ", roles: ["MID", "TOP"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 3 },
  { id: "Corki", name: "Corki", title: "Phi Công Quả Cảm", roles: ["MID", "AD"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 2 },
  { id: "Fizz", name: "Fizz", title: "Chú Cá Tinh Nghịch", roles: ["MID"], damageType: "AP", classes: ["Sát Thủ"], difficulty: 2 },
  { id: "Galio", name: "Galio", title: "Vệ Thần Khổng Lồ", roles: ["MID", "SP", "TOP"], damageType: "TANK", classes: ["Đỡ Đòn", "Pháp Sư"], difficulty: 2 },
  { id: "Heimerdinger", name: "Heimerdinger", title: "Nhà Phát Minh Lỗi Lạc", roles: ["MID", "TOP", "SP"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 2 },
  { id: "Hwei", name: "Hwei", title: "Họa Sư U Sầu", roles: ["MID", "SP", "AD"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 3 },
  { id: "Kassadin", name: "Kassadin", title: "Lữ Khách Hư Không", roles: ["MID"], damageType: "AP", classes: ["Sát Thủ"], difficulty: 2 },
  { id: "Katarina", name: "Katarina", title: "Ác Kiếm", roles: ["MID"], damageType: "MIXED", classes: ["Sát Thủ"], difficulty: 3 },
  { id: "Leblanc", name: "LeBlanc", title: "Kẻ Lừa Đảo", roles: ["MID", "SP"], damageType: "AP", classes: ["Sát Thủ", "Pháp Sư"], difficulty: 3 },
  { id: "Lissandra", name: "Lissandra", title: "Mụ Phù Thủy Băng", roles: ["MID"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 2 },
  { id: "Lux", name: "Lux", title: "Tiểu Thư Ánh Sáng", roles: ["MID", "SP"], damageType: "AP", classes: ["Pháp Sư", "Hỗ Trợ"], difficulty: 1 },
  { id: "Malzahar", name: "Malzahar", title: "Tiên Tri Hư Không", roles: ["MID"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 1 },
  { id: "Naafiri", name: "Naafiri", title: "Chó Săn Bách Đoạn", roles: ["MID", "JG"], damageType: "AD", classes: ["Sát Thủ"], difficulty: 1 },
  { id: "Neeko", name: "Neeko", title: "Hóa Hình Sư Ham Học", roles: ["MID", "SP"], damageType: "AP", classes: ["Pháp Sư", "Hỗ Trợ"], difficulty: 2 },
  { id: "Orianna", name: "Orianna", title: "Quý Cô Dây Cót", roles: ["MID"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 2 },
  { id: "Qiyana", name: "Qiyana", title: "Nữ Hoàng Nguyên Tố", roles: ["MID", "JG"], damageType: "AD", classes: ["Sát Thủ"], difficulty: 3 },
  { id: "Ryze", name: "Ryze", title: "Pháp Sư Cổ Ngữ", roles: ["MID", "TOP"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 2 },
  { id: "Sylas", name: "Sylas", title: "Kẻ Phá Xiềng", roles: ["MID", "TOP", "JG"], damageType: "AP", classes: ["Đấu Sĩ", "Pháp Sư"], difficulty: 2 },
  { id: "Syndra", name: "Syndra", title: "Nữ Chúa Bóng Tối", roles: ["MID"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 2 },
  { id: "Talon", name: "Talon", title: "Sát Thủ Bóng Đêm", roles: ["MID", "JG"], damageType: "AD", classes: ["Sát Thủ"], difficulty: 2 },
  { id: "TwistedFate", name: "Twisted Fate", title: "Thần Bài", roles: ["MID", "AD"], damageType: "MIXED", classes: ["Pháp Sư", "Xạ Thủ"], difficulty: 2 },
  { id: "Veigar", name: "Veigar", title: "Bậc Thầy Tiểu Quỷ", roles: ["MID", "AD", "SP"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 1 },
  { id: "Vex", name: "Vex", title: "Pháp Sưao Ngán", roles: ["MID"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 1 },
  { id: "Viktor", name: "Viktor", title: "Sứ Giả Máy Móc", roles: ["MID"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 3 },
  { id: "Vladimir", name: "Vladimir", title: "Thần Chết Đỏ", roles: ["MID", "TOP"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 2 },
  { id: "Xerath", name: "Xerath", title: "Pháp Sư Thăng Hoa", roles: ["MID", "SP"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 2 },
  { id: "Yasuo", name: "Yasuo", title: "Kẻ Bất Dung Thứ", roles: ["MID", "TOP", "AD"], damageType: "AD", classes: ["Đấu Sĩ", "Sát Thủ"], difficulty: 3 },
  { id: "Yone", name: "Yone", title: "Kẻ Về Từ Cõi Chết", roles: ["MID", "TOP"], damageType: "MIXED", classes: ["Đấu Sĩ", "Sát Thủ"], difficulty: 3 },
  { id: "Zed", name: "Zed", title: "Chúa Tể Bóng Tối", roles: ["MID", "JG"], damageType: "AD", classes: ["Sát Thủ"], difficulty: 3 },
  { id: "Ziggs", name: "Ziggs", title: "Chuyên Gia Chất Nổ", roles: ["MID", "AD"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 2 },
  { id: "Zoe", name: "Zoe", title: "Bậc Thầy Biến Ảo", roles: ["MID", "SP"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 3 },

  // --- ADC (BOT CARRY) ---
  { id: "Aphelios", name: "Aphelios", title: "Song Nguyệt Chiến Binh", roles: ["AD"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 3 },
  { id: "Ashe", name: "Ashe", title: "Cung Băng", roles: ["AD", "SP"], damageType: "AD", classes: ["Xạ Thủ", "Hỗ Trợ"], difficulty: 1 },
  { id: "Caitlyn", name: "Caitlyn", title: "Cảnh Sát Trưởng Piltover", roles: ["AD"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 2 },
  { id: "Draven", name: "Draven", title: "Đao Phủ Kiêu Hùng", roles: ["AD"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 3 },
  { id: "Ezreal", name: "Ezreal", title: "Nhà Thám Hiểm", roles: ["AD", "MID"], damageType: "MIXED", classes: ["Xạ Thủ"], difficulty: 2 },
  { id: "Jhin", name: "Jhin", title: "Nghệ Sĩ Tử Thần", roles: ["AD"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 2 },
  { id: "Jinx", name: "Jinx", title: "Khẩu Pháo Nổi Loạn", roles: ["AD"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 2 },
  { id: "KaiSa", name: "Kai'Sa", title: "Ái Nữ Hư Không", roles: ["AD", "MID"], damageType: "MIXED", classes: ["Xạ Thủ"], difficulty: 2 },
  { id: "Kalista", name: "Kalista", title: "Mũi Giáo Phục Hận", roles: ["AD"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 3 },
  { id: "KogMaw", name: "Kog'Maw", title: "Miệng Vực Thẳm", roles: ["AD"], damageType: "MIXED", classes: ["Xạ Thủ"], difficulty: 2 },
  { id: "Lucian", name: "Lucian", title: "Kẻ Thanh Trừng", roles: ["AD", "MID"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 2 },
  { id: "MissFortune", name: "Miss Fortune", title: "Thợ Săn Tiền Thưởng", roles: ["AD"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 1 },
  { id: "Nilah", name: "Nilah", title: "Hiện Thân Của Hân Hoan", roles: ["AD"], damageType: "AD", classes: ["Đấu Sĩ", "Xạ Thủ"], difficulty: 3 },
  { id: "Samira", name: "Samira", title: "Hoa Hồng Sa Mạc", roles: ["AD"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 2 },
  { id: "Sivir", name: "Sivir", title: "Nữ Chúa Chiến Trường", roles: ["AD"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 1 },
  { id: "Smolder", name: "Smolder", title: "Tiểu Hỏa Long", roles: ["AD", "MID", "TOP"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 1 },
  { id: "Tristana", name: "Tristana", title: "Tay Súng Yordle", roles: ["AD", "MID"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 1 },
  { id: "Twitch", name: "Twitch", title: "Chuột Thành Tinh", roles: ["AD", "SP"], damageType: "MIXED", classes: ["Xạ Thủ", "Sát Thủ"], difficulty: 2 },
  { id: "Varus", name: "Varus", title: "Mũi Tên Báo Thù", roles: ["AD", "MID"], damageType: "MIXED", classes: ["Xạ Thủ"], difficulty: 2 },
  { id: "Vayne", name: "Vayne", title: "Thợ Săn Bóng Đêm", roles: ["AD", "TOP"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 3 },
  { id: "Xayah", name: "Xayah", title: "Cô Nàng Nổi Loạn", roles: ["AD"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 2 },
  { id: "Zeri", name: "Zeri", title: "Tia Chớp Thành Zaun", roles: ["AD"], damageType: "AD", classes: ["Xạ Thủ"], difficulty: 3 },

  // --- SUPPORT & MULTI-ROLE ---
  { id: "Alistar", name: "Alistar", title: "Quái Vật Đầu Bò", roles: ["SP"], damageType: "TANK", classes: ["Đỡ Đòn", "Hỗ Trợ"], difficulty: 1 },
  { id: "Bard", name: "Bard", title: "Ông Bụt Vũ Trụ", roles: ["SP"], damageType: "AP", classes: ["Hỗ Trợ"], difficulty: 3 },
  { id: "Blitzcrank", name: "Blitzcrank", title: "Người Máy Hơi Nước", roles: ["SP"], damageType: "TANK", classes: ["Đỡ Đòn", "Hỗ Trợ"], difficulty: 1 },
  { id: "Brand", name: "Brand", title: "Thần Lửa Phục Hận", roles: ["SP", "JG", "MID"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 1 },
  { id: "Braum", name: "Braum", title: "Trái Tim Của Freljord", roles: ["SP"], damageType: "TANK", classes: ["Đỡ Đòn", "Hỗ Trợ"], difficulty: 2 },
  { id: "Janna", name: "Janna", title: "Cơn Thịnh Nộ Của Bão Tố", roles: ["SP"], damageType: "AP", classes: ["Hỗ Trợ"], difficulty: 2 },
  { id: "Karma", name: "Karma", title: "Kẻ Được Khai Sáng", roles: ["SP", "MID", "TOP"], damageType: "AP", classes: ["Pháp Sư", "Hỗ Trợ"], difficulty: 1 },
  { id: "Leona", name: "Leona", title: "Bình Minh Rực Rỡ", roles: ["SP"], damageType: "TANK", classes: ["Đỡ Đòn", "Hỗ Trợ"], difficulty: 1 },
  { id: "Lulu", name: "Lulu", title: "Pháp Sư Tinh Linh", roles: ["SP"], damageType: "AP", classes: ["Hỗ Trợ"], difficulty: 2 },
  { id: "Maokai", name: "Maokai", title: "Ma Cây", roles: ["SP", "JG", "TOP"], damageType: "TANK", classes: ["Đỡ Đòn"], difficulty: 1 },
  { id: "Milio", name: "Milio", title: "Ngọn Lửa Êm Dịu", roles: ["SP"], damageType: "AP", classes: ["Hỗ Trợ"], difficulty: 1 },
  { id: "Morgana", name: "Morgana", title: "Thiên Thần Sa Ngã", roles: ["SP", "JG", "MID"], damageType: "AP", classes: ["Pháp Sư", "Hỗ Trợ"], difficulty: 1 },
  { id: "Nami", name: "Nami", title: "Nàng Tiên Cá", roles: ["SP"], damageType: "AP", classes: ["Hỗ Trợ"], difficulty: 2 },
  { id: "Nautilus", name: "Nautilus", title: "Khổng Lồ Biển Sâu", roles: ["SP"], damageType: "TANK", classes: ["Đỡ Đòn", "Hỗ Trợ"], difficulty: 1 },
  { id: "Pyke", name: "Pyke", title: "Sát Thủ Vùng Nước Đỏ", roles: ["SP"], damageType: "AD", classes: ["Sát Thủ", "Hỗ Trợ"], difficulty: 2 },
  { id: "Rakan", name: "Rakan", title: "Anh Chàng Quyến Rũ", roles: ["SP"], damageType: "TANK", classes: ["Hỗ Trợ"], difficulty: 2 },
  { id: "Rell", name: "Rell", title: "Chiến Nữ Thiết Giáp", roles: ["SP", "JG"], damageType: "TANK", classes: ["Đỡ Đòn", "Hỗ Trợ"], difficulty: 2 },
  { id: "Renata", name: "Renata Glasc", title: "Bà Trùm Hóa Kỹ", roles: ["SP"], damageType: "AP", classes: ["Hỗ Trợ"], difficulty: 2 },
  { id: "Senna", name: "Senna", title: "Người Cứu Chuộc", roles: ["SP", "AD"], damageType: "AD", classes: ["Xạ Thủ", "Hỗ Trợ"], difficulty: 2 },
  { id: "Seraphine", name: "Seraphine", title: "Ca Sĩ Mộng Mơ", roles: ["SP", "AD", "MID"], damageType: "AP", classes: ["Pháp Sư", "Hỗ Trợ"], difficulty: 1 },
  { id: "Sona", name: "Sona", title: "Đại Cầm Nữ", roles: ["SP"], damageType: "AP", classes: ["Hỗ Trợ"], difficulty: 1 },
  { id: "Soraka", name: "Soraka", title: "Tinh Nữ", roles: ["SP"], damageType: "AP", classes: ["Hỗ Trợ"], difficulty: 1 },
  { id: "Swain", name: "Swain", title: "Nguyên Soái Noxus", roles: ["SP", "MID", "AD"], damageType: "AP", classes: ["Pháp Sư", "Đỡ Đòn"], difficulty: 2 },
  { id: "Taric", name: "Taric", title: "Tấm Khiên Valoran", roles: ["SP"], damageType: "TANK", classes: ["Hỗ Trợ", "Đỡ Đòn"], difficulty: 2 },
  { id: "Thresh", name: "Thresh", title: "Cai Ngục Xiềng Xích", roles: ["SP"], damageType: "TANK", classes: ["Hỗ Trợ", "Đỡ Đòn"], difficulty: 3 },
  { id: "VelKoz", name: "Vel'Koz", title: "Con Mắt Hư Không", roles: ["SP", "MID"], damageType: "AP", classes: ["Pháp Sư"], difficulty: 2 },
  { id: "Yuumi", name: "Yuumi", title: "Cô Mèo Ma Thuật", roles: ["SP"], damageType: "AP", classes: ["Hỗ Trợ"], difficulty: 1 },
  { id: "Zilean", name: "Zilean", title: "Giám Hộ Thời Gian", roles: ["SP", "MID"], damageType: "AP", classes: ["Hỗ Trợ", "Pháp Sư"], difficulty: 2 },
  { id: "Zyra", name: "Zyra", title: "Nữ Hoàng Gai", roles: ["SP", "JG"], damageType: "AP", classes: ["Pháp Sư", "Hỗ Trợ"], difficulty: 2 },
];
