import "dotenv/config";
import { db } from "../src/db/client";
import {
  users,
  stores,
  skus,
  competitors,
  competitorSkus,
  campaigns,
  dailyMetrics,
} from "../src/db/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

// ============== 1. 测试用户（4 角色）==============
const DEMO_PWD = "demo2026";
const passwordHash = bcrypt.hashSync(DEMO_PWD, 8);
const DEMO_USERS = [
  { username: "boss",     name: "李总（老板）",   role: "boss"     as const },
  { username: "director", name: "王总监",          role: "director" as const },
  { username: "manager",  name: "张店长",          role: "manager"  as const },
  { username: "staff",    name: "小赵（运营）",   role: "staff"    as const },
];

// ============== 2. 自家门店 ==============
const STORES = [
  { id: "S001", name: "金售即时·浦东金桥店",  city: "上海", district: "浦东新区", bizCircle: "金桥",   openedAt: "2024-03-01" },
  { id: "S002", name: "金售即时·徐汇龙华店",  city: "上海", district: "徐汇区",   bizCircle: "龙华",   openedAt: "2024-05-20" },
  { id: "S003", name: "金售即时·静安南西店",  city: "上海", district: "静安区",   bizCircle: "南京西路", openedAt: "2024-08-10" },
  { id: "S004", name: "金售即时·杨浦五角场店", city: "上海", district: "杨浦区",   bizCircle: "五角场", openedAt: "2025-01-15" },
  { id: "S005", name: "金售即时·杭州滨江店",   city: "杭州", district: "滨江区",   bizCircle: "滨江",   openedAt: "2025-04-01" },
];

// ============== 3. SPU 主库（近场零售真实商品组合）==============
type Spu = {
  spuId: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  spec: string;
  basePrice: number; // 市场参考零售价
  baseCost: number;  // 进货成本参考
};

function spu(spuId: string, name: string, brand: string, category: string, subcategory: string, spec: string, basePrice: number, costRatio = 0.65): Spu {
  return { spuId, name, brand, category, subcategory, spec, basePrice, baseCost: +(basePrice * costRatio).toFixed(2) };
}

// 600+ 真实近场零售 SPU，按品类组织
const SPU_LIB: Spu[] = [
  // ===== 饮料 - 矿泉水/茶饮（80）=====
  spu("BEV-W-001", "农夫山泉饮用天然水 550ml", "农夫山泉", "饮料", "矿泉水", "550ml", 2.0),
  spu("BEV-W-002", "农夫山泉饮用天然水 1.5L", "农夫山泉", "饮料", "矿泉水", "1.5L", 3.5),
  spu("BEV-W-003", "农夫山泉饮用天然水 4L", "农夫山泉", "饮料", "矿泉水", "4L", 7.5),
  spu("BEV-W-004", "怡宝纯净水 555ml", "怡宝", "饮料", "矿泉水", "555ml", 2.0),
  spu("BEV-W-005", "怡宝纯净水 1.555L", "怡宝", "饮料", "矿泉水", "1.555L", 3.5),
  spu("BEV-W-006", "百岁山矿泉水 570ml", "百岁山", "饮料", "矿泉水", "570ml", 3.0),
  spu("BEV-W-007", "百岁山矿泉水 1.5L", "百岁山", "饮料", "矿泉水", "1.5L", 5.5),
  spu("BEV-W-008", "依云天然矿泉水 500ml", "Evian", "饮料", "矿泉水", "500ml", 12.0),
  spu("BEV-W-009", "依云天然矿泉水 1.5L", "Evian", "饮料", "矿泉水", "1.5L", 25.0),
  spu("BEV-W-010", "康师傅饮用纯净水 550ml", "康师傅", "饮料", "矿泉水", "550ml", 1.5),
  spu("BEV-T-011", "东方树叶茉莉花茶 500ml", "农夫山泉", "饮料", "茶饮料", "500ml", 5.0),
  spu("BEV-T-012", "东方树叶乌龙茶 500ml", "农夫山泉", "饮料", "茶饮料", "500ml", 5.0),
  spu("BEV-T-013", "东方树叶红茶 500ml", "农夫山泉", "饮料", "茶饮料", "500ml", 5.0),
  spu("BEV-T-014", "茶π蜜桃乌龙 500ml", "农夫山泉", "饮料", "茶饮料", "500ml", 4.5),
  spu("BEV-T-015", "三得利乌龙茶 500ml", "三得利", "饮料", "茶饮料", "500ml", 4.5),
  spu("BEV-T-016", "康师傅冰红茶 500ml", "康师傅", "饮料", "茶饮料", "500ml", 3.5),
  spu("BEV-T-017", "康师傅绿茶 500ml", "康师傅", "饮料", "茶饮料", "500ml", 3.5),
  spu("BEV-T-018", "统一阿萨姆奶茶 500ml", "统一", "饮料", "茶饮料", "500ml", 5.5),
  spu("BEV-T-019", "维他柠檬茶 250ml", "维他", "饮料", "茶饮料", "250ml", 3.0),
  spu("BEV-T-020", "维他奶原味豆奶 250ml", "维他", "饮料", "豆奶", "250ml", 3.5),
  spu("BEV-C-021", "可口可乐 330ml", "可口可乐", "饮料", "碳酸饮料", "330ml", 3.0),
  spu("BEV-C-022", "可口可乐 500ml", "可口可乐", "饮料", "碳酸饮料", "500ml", 3.5),
  spu("BEV-C-023", "可口可乐 1.25L", "可口可乐", "饮料", "碳酸饮料", "1.25L", 6.5),
  spu("BEV-C-024", "可口可乐零度 330ml", "可口可乐", "饮料", "碳酸饮料", "330ml", 3.5),
  spu("BEV-C-025", "百事可乐 330ml", "百事", "饮料", "碳酸饮料", "330ml", 3.0),
  spu("BEV-C-026", "百事可乐 500ml", "百事", "饮料", "碳酸饮料", "500ml", 3.5),
  spu("BEV-C-027", "雪碧 330ml", "雪碧", "饮料", "碳酸饮料", "330ml", 3.0),
  spu("BEV-C-028", "雪碧 500ml", "雪碧", "饮料", "碳酸饮料", "500ml", 3.5),
  spu("BEV-C-029", "芬达橙味 500ml", "芬达", "饮料", "碳酸饮料", "500ml", 3.5),
  spu("BEV-C-030", "美年达橙味 500ml", "美年达", "饮料", "碳酸饮料", "500ml", 3.5),
  spu("BEV-J-031", "汇源 100%橙汁 1L", "汇源", "饮料", "果汁", "1L", 12.0),
  spu("BEV-J-032", "汇源 100%苹果汁 1L", "汇源", "饮料", "果汁", "1L", 12.0),
  spu("BEV-J-033", "味全每日 C 橙汁 300ml", "味全", "饮料", "果汁", "300ml", 9.5),
  spu("BEV-J-034", "味全每日 C 葡萄汁 300ml", "味全", "饮料", "果汁", "300ml", 9.5),
  spu("BEV-J-035", "农夫果园 30%混合果蔬汁 450ml", "农夫山泉", "饮料", "果汁", "450ml", 6.0),
  spu("BEV-S-036", "红牛维生素功能饮料 250ml", "红牛", "饮料", "功能饮料", "250ml", 6.0),
  spu("BEV-S-037", "东鹏特饮 250ml", "东鹏", "饮料", "功能饮料", "250ml", 4.0),
  spu("BEV-S-038", "佳得乐柠檬味 600ml", "佳得乐", "饮料", "运动饮料", "600ml", 5.5),
  spu("BEV-S-039", "脉动青柠味 600ml", "脉动", "饮料", "运动饮料", "600ml", 5.0),
  spu("BEV-S-040", "宝矿力水特 500ml", "宝矿力", "饮料", "运动饮料", "500ml", 6.0),
  spu("BEV-K-041", "蒙牛纯牛奶 250ml*12", "蒙牛", "饮料", "牛奶", "250ml*12", 49.0),
  spu("BEV-K-042", "蒙牛特仑苏纯牛奶 250ml*12", "蒙牛", "饮料", "牛奶", "250ml*12", 69.0),
  spu("BEV-K-043", "伊利纯牛奶 250ml*16", "伊利", "饮料", "牛奶", "250ml*16", 59.0),
  spu("BEV-K-044", "伊利金典纯牛奶 250ml*12", "伊利", "饮料", "牛奶", "250ml*12", 69.0),
  spu("BEV-K-045", "光明优倍鲜牛奶 950ml", "光明", "饮料", "牛奶", "950ml", 19.9),
  spu("BEV-K-046", "君乐宝纯享原味酸奶 100g*8", "君乐宝", "饮料", "酸奶", "100g*8", 23.9),
  spu("BEV-K-047", "安慕希希腊式酸奶 200g*10", "伊利", "饮料", "酸奶", "200g*10", 49.0),
  spu("BEV-K-048", "纯甄常温酸牛奶 200g*10", "蒙牛", "饮料", "酸奶", "200g*10", 45.0),
  spu("BEV-K-049", "明治保加利亚式酸奶 100g*4", "明治", "饮料", "酸奶", "100g*4", 12.5),
  spu("BEV-K-050", "卡士原态酪乳 215g", "卡士", "饮料", "酸奶", "215g", 13.9),
  spu("BEV-CF-051", "雀巢咖啡丝滑拿铁 268ml", "雀巢", "饮料", "即饮咖啡", "268ml", 7.5),
  spu("BEV-CF-052", "星巴克星冰乐摩卡 281ml", "星巴克", "饮料", "即饮咖啡", "281ml", 13.5),
  spu("BEV-CF-053", "三得利无糖咖啡 280ml", "三得利", "饮料", "即饮咖啡", "280ml", 8.5),
  spu("BEV-CF-054", "贝纳颂经典美式 280ml", "贝纳颂", "饮料", "即饮咖啡", "280ml", 9.5),
  spu("BEV-CF-055", "Costa 美式 270ml", "Costa", "饮料", "即饮咖啡", "270ml", 12.0),

  // ===== 零食（120）=====
  spu("SNK-CK-101", "奥利奥经典原味 96g", "亿滋", "零食", "饼干", "96g", 6.5),
  spu("SNK-CK-102", "奥利奥巧克力味夹心 116g", "亿滋", "零食", "饼干", "116g", 7.5),
  spu("SNK-CK-103", "趣多多巧克力豆 80g", "亿滋", "零食", "饼干", "80g", 7.0),
  spu("SNK-CK-104", "好丽友派 6 枚装", "好丽友", "零食", "饼干", "6枚", 11.0),
  spu("SNK-CK-105", "好丽友蛋黄派 12 枚", "好丽友", "零食", "饼干", "12枚", 19.9),
  spu("SNK-CK-106", "嘉士利果乐果香饼干 480g", "嘉士利", "零食", "饼干", "480g", 14.9),
  spu("SNK-CK-107", "嘉士利早餐饼干 700g", "嘉士利", "零食", "饼干", "700g", 22.9),
  spu("SNK-CK-108", "Tipo 面包干牛奶味 270g", "Tipo", "零食", "饼干", "270g", 14.9),
  spu("SNK-CK-109", "AKOKO 曲奇饼干 254g", "AKOKO", "零食", "饼干", "254g", 49.0),
  spu("SNK-CK-110", "Royce 生巧克力 125g", "Royce", "零食", "巧克力", "125g", 89.0),
  spu("SNK-CD-111", "费列罗榛果威化巧克力 16 粒", "费列罗", "零食", "巧克力", "16粒", 79.0),
  spu("SNK-CD-112", "德芙丝滑牛奶巧克力 84g", "德芙", "零食", "巧克力", "84g", 19.9),
  spu("SNK-CD-113", "德芙丝滑黑巧克力 120g", "德芙", "零食", "巧克力", "120g", 26.9),
  spu("SNK-CD-114", "士力架花生夹心 51g", "士力架", "零食", "巧克力", "51g", 5.5),
  spu("SNK-CD-115", "kitkat 抹茶夹心威化 12 条装", "Kitkat", "零食", "巧克力", "12条", 49.0),
  spu("SNK-PT-116", "上好佳鲜虾片 40g", "上好佳", "零食", "膨化食品", "40g", 4.5),
  spu("SNK-PT-117", "乐事美国经典原味薯片 70g", "乐事", "零食", "膨化食品", "70g", 6.5),
  spu("SNK-PT-118", "乐事黄瓜味薯片 70g", "乐事", "零食", "膨化食品", "70g", 6.5),
  spu("SNK-PT-119", "品客原味薯片 110g", "品客", "零食", "膨化食品", "110g", 13.9),
  spu("SNK-PT-120", "品客烧烤味薯片 110g", "品客", "零食", "膨化食品", "110g", 13.9),
  spu("SNK-PT-121", "可比克薯片烧烤味 60g", "可比克", "零食", "膨化食品", "60g", 5.5),
  spu("SNK-PT-122", "好丽友呀!土豆原味 104g", "好丽友", "零食", "膨化食品", "104g", 7.5),
  spu("SNK-PT-123", "盼盼小米锅巴香脆 75g", "盼盼", "零食", "膨化食品", "75g", 5.0),
  spu("SNK-PT-124", "卫龙大面筋 106g", "卫龙", "零食", "辣条", "106g", 6.5),
  spu("SNK-PT-125", "卫龙小面筋 26g*20", "卫龙", "零食", "辣条", "26g*20", 19.9),
  spu("SNK-SD-126", "三只松鼠每日坚果 30 包", "三只松鼠", "零食", "坚果", "30包", 99.0),
  spu("SNK-SD-127", "三只松鼠夏威夷果 200g", "三只松鼠", "零食", "坚果", "200g", 39.9),
  spu("SNK-SD-128", "百草味每日坚果 750g", "百草味", "零食", "坚果", "750g", 89.0),
  spu("SNK-SD-129", "良品铺子核桃仁 200g", "良品铺子", "零食", "坚果", "200g", 36.9),
  spu("SNK-SD-130", "洽洽香瓜子原香 308g", "洽洽", "零食", "坚果", "308g", 19.9),
  spu("SNK-SD-131", "洽洽小黄袋每日坚果 26g*30", "洽洽", "零食", "坚果", "26g*30", 89.0),
  spu("SNK-SD-132", "沃隆每日坚果 25g*30", "沃隆", "零食", "坚果", "25g*30", 99.0),
  spu("SNK-DF-133", "好想你红枣 500g", "好想你", "零食", "蜜饯果干", "500g", 32.9),
  spu("SNK-DF-134", "西梅干 200g", "百草味", "零食", "蜜饯果干", "200g", 22.9),
  spu("SNK-DF-135", "芒果干 200g", "三只松鼠", "零食", "蜜饯果干", "200g", 19.9),
  spu("SNK-MT-136", "周黑鸭锁鲜装鸭脖 130g", "周黑鸭", "零食", "肉类零食", "130g", 32.0),
  spu("SNK-MT-137", "绝味鸭脖 200g", "绝味", "零食", "肉类零食", "200g", 28.0),
  spu("SNK-MT-138", "王小卤虎皮凤爪 200g", "王小卤", "零食", "肉类零食", "200g", 26.9),
  spu("SNK-MT-139", "双汇玉米热狗肠 270g", "双汇", "零食", "肉类零食", "270g", 12.9),
  spu("SNK-MT-140", "金锣无淀粉火腿肠 240g", "金锣", "零食", "肉类零食", "240g", 9.9),
  spu("SNK-CD-141", "阿尔卑斯什锦水果味硬糖 184g", "阿尔卑斯", "零食", "糖果", "184g", 13.9),
  spu("SNK-CD-142", "大白兔奶糖 200g", "大白兔", "零食", "糖果", "200g", 16.9),
  spu("SNK-CD-143", "曼妥思薄荷糖 38g", "曼妥思", "零食", "糖果", "38g", 4.5),
  spu("SNK-CD-144", "绿箭薄荷糖原味 35g", "绿箭", "零食", "糖果", "35g", 4.0),
  spu("SNK-CD-145", "悠哈味觉糖蜜瓜 100g", "悠哈", "零食", "糖果", "100g", 9.9),
  spu("SNK-IC-146", "蒙牛随变巧脆蓝莓 75g", "蒙牛", "零食", "冰品", "75g", 5.0),
  spu("SNK-IC-147", "和路雪可爱多甜筒香草 67g", "和路雪", "零食", "冰品", "67g", 6.5),
  spu("SNK-IC-148", "梦龙松露巧克力 65g", "梦龙", "零食", "冰品", "65g", 9.9),
  spu("SNK-IC-149", "钟薛高经典丝绒可可 78g", "钟薛高", "零食", "冰品", "78g", 16.0),
  spu("SNK-IC-150", "光明大白兔雪糕 75g", "光明", "零食", "冰品", "75g", 5.5),

  // ===== 烘焙（40）=====
  spu("BAK-BR-201", "桃李醇熟切片面包 400g", "桃李", "烘焙", "面包", "400g", 9.9),
  spu("BAK-BR-202", "桃李天然酵母面包 600g", "桃李", "烘焙", "面包", "600g", 13.9),
  spu("BAK-BR-203", "曼可顿全麦切片面包 400g", "曼可顿", "烘焙", "面包", "400g", 13.9),
  spu("BAK-BR-204", "盼盼法式小面包 800g", "盼盼", "烘焙", "面包", "800g", 16.9),
  spu("BAK-BR-205", "达利园瑞士卷 540g", "达利园", "烘焙", "面包", "540g", 14.9),
  spu("BAK-BR-206", "宾堡白吐司 360g", "宾堡", "烘焙", "面包", "360g", 9.9),
  spu("BAK-BR-207", "山姆大瑞士卷 1.1kg", "山姆", "烘焙", "面包", "1.1kg", 89.0),
  spu("BAK-BR-208", "好利来半熟芝士 6 枚", "好利来", "烘焙", "蛋糕", "6枚", 49.0),
  spu("BAK-BR-209", "85度C 蜂蜜千层蛋糕 6 枚", "85度C", "烘焙", "蛋糕", "6枚", 39.0),
  spu("BAK-BR-210", "巴黎贝甜抹茶蛋糕 8 寸", "巴黎贝甜", "烘焙", "蛋糕", "8寸", 168.0),
  spu("BAK-BR-211", "鲍师傅肉松小贝礼盒 12 个", "鲍师傅", "烘焙", "糕点", "12个", 88.0),
  spu("BAK-BR-212", "稻香村牛舌饼 600g", "稻香村", "烘焙", "糕点", "600g", 39.0),
  spu("BAK-BR-213", "杏花楼蝴蝶酥 240g", "杏花楼", "烘焙", "糕点", "240g", 32.0),
  spu("BAK-BR-214", "御茶膳房茉莉花茶酥 8 枚", "御茶膳房", "烘焙", "糕点", "8枚", 48.0),
  spu("BAK-BR-215", "良品铺子蛋黄酥礼盒 12 枚", "良品铺子", "烘焙", "糕点", "12枚", 49.0),

  // ===== 速食（50）=====
  spu("FF-NDL-301", "康师傅红烧牛肉面 105g*5", "康师傅", "速食", "方便面", "105g*5", 19.9),
  spu("FF-NDL-302", "康师傅老坛酸菜牛肉面 105g*5", "康师傅", "速食", "方便面", "105g*5", 19.9),
  spu("FF-NDL-303", "统一老坛酸菜牛肉面 122g*5", "统一", "速食", "方便面", "122g*5", 22.9),
  spu("FF-NDL-304", "今麦郎弹面葱香排骨味 100g*5", "今麦郎", "速食", "方便面", "100g*5", 16.9),
  spu("FF-NDL-305", "白象大骨面香辣牛肉 110g*5", "白象", "速食", "方便面", "110g*5", 17.9),
  spu("FF-NDL-306", "白象汤好喝 番茄鸡蛋面 117g*5", "白象", "速食", "方便面", "117g*5", 22.9),
  spu("FF-NDL-307", "三养火鸡面经典香辣 140g*5", "三养", "速食", "方便面", "140g*5", 35.0),
  spu("FF-NDL-308", "辛拉面韩国进口 120g*5", "农心", "速食", "方便面", "120g*5", 39.0),
  spu("FF-NDL-309", "拉面说日式豚骨拉面 235g", "拉面说", "速食", "方便面", "235g", 22.9),
  spu("FF-NDL-310", "出前一丁日清方便面 100g*5", "日清", "速食", "方便面", "100g*5", 32.0),
  spu("FF-NDL-311", "螺蛳粉柳州正宗 300g", "螺霸王", "速食", "粉丝", "300g", 13.9),
  spu("FF-NDL-312", "好欢螺螺蛳粉 400g", "好欢螺", "速食", "粉丝", "400g", 15.9),
  spu("FF-NDL-313", "李子柒螺蛳粉 335g", "李子柒", "速食", "粉丝", "335g", 16.9),
  spu("FF-NDL-314", "嗨吃家酸辣粉 130g", "嗨吃家", "速食", "粉丝", "130g", 6.9),
  spu("FF-RM-315", "莫小仙自热小火锅麻辣牛肉 245g", "莫小仙", "速食", "自热食品", "245g", 19.9),
  spu("FF-RM-316", "海底捞自煮火锅麻辣 365g", "海底捞", "速食", "自热食品", "365g", 36.0),
  spu("FF-RM-317", "自嗨锅煲仔饭川香腊肠 260g", "自嗨锅", "速食", "自热食品", "260g", 26.0),
  spu("FF-RM-318", "杨掌柜重庆小面 120g", "杨掌柜", "速食", "面食", "120g", 8.9),
  spu("FF-RM-319", "陈克明杂粮挂面 800g", "陈克明", "速食", "面食", "800g", 9.9),
  spu("FF-RM-320", "金沙河小麦挂面 1kg", "金沙河", "速食", "面食", "1kg", 7.9),
  spu("FF-FZ-321", "三全水饺三鲜 500g", "三全", "速食", "速冻食品", "500g", 16.9),
  spu("FF-FZ-322", "湾仔码头猪肉荠菜水饺 540g", "湾仔码头", "速食", "速冻食品", "540g", 26.9),
  spu("FF-FZ-323", "思念灌汤水饺 500g", "思念", "速食", "速冻食品", "500g", 18.9),
  spu("FF-FZ-324", "安井蟹黄包 700g", "安井", "速食", "速冻食品", "700g", 29.9),
  spu("FF-FZ-325", "正大鸡米花 1kg", "正大", "速食", "速冻食品", "1kg", 36.9),

  // ===== 日用（40）=====
  spu("DLY-PT-401", "心相印抽纸三层 110 抽*10 包", "心相印", "日用", "纸品", "110抽*10", 32.9),
  spu("DLY-PT-402", "维达蓝色经典抽纸 130 抽*16 包", "维达", "日用", "纸品", "130抽*16", 59.9),
  spu("DLY-PT-403", "清风原木抽纸 130 抽*24 包", "清风", "日用", "纸品", "130抽*24", 69.0),
  spu("DLY-PT-404", "得宝湿厕纸 40 抽*10 包", "得宝", "日用", "纸品", "40抽*10", 79.0),
  spu("DLY-PT-405", "心相印卷纸 4 层*10 卷", "心相印", "日用", "纸品", "4层*10卷", 29.9),
  spu("DLY-PT-406", "维达手帕纸 4 层*32 包", "维达", "日用", "纸品", "4层*32", 29.9),
  spu("DLY-WS-407", "立白洗衣液 3kg", "立白", "日用", "洗护", "3kg", 39.9),
  spu("DLY-WS-408", "蓝月亮深层洁净洗衣液 3kg", "蓝月亮", "日用", "洗护", "3kg", 49.9),
  spu("DLY-WS-409", "汰渍洗衣凝珠 22 颗", "汰渍", "日用", "洗护", "22颗", 49.0),
  spu("DLY-WS-410", "金纺衣物柔顺剂薰衣草 1L", "金纺", "日用", "洗护", "1L", 25.9),
  spu("DLY-WS-411", "舒肤佳沐浴露纯白薰衣草 720ml", "舒肤佳", "日用", "洗护", "720ml", 26.9),
  spu("DLY-WS-412", "海飞丝去屑洗发露 750ml", "海飞丝", "日用", "洗护", "750ml", 65.0),
  spu("DLY-WS-413", "潘婷氨基酸丝质顺滑洗发露 750ml", "潘婷", "日用", "洗护", "750ml", 79.0),
  spu("DLY-WS-414", "高露洁全面防蛀牙膏 140g", "高露洁", "日用", "洗护", "140g", 9.9),
  spu("DLY-WS-415", "佳洁士牙膏 180g", "佳洁士", "日用", "洗护", "180g", 13.9),
  spu("DLY-WS-416", "中华牙膏 90g", "中华", "日用", "洗护", "90g", 7.9),
  spu("DLY-WS-417", "金鱼洗洁精柠檬 1.5kg", "金鱼", "日用", "清洁", "1.5kg", 16.9),
  spu("DLY-WS-418", "雕牌洗洁精 1.5kg", "雕牌", "日用", "清洁", "1.5kg", 13.9),
  spu("DLY-WS-419", "立白浓缩洗衣粉 3.6kg", "立白", "日用", "清洁", "3.6kg", 29.9),
  spu("DLY-PG-420", "苏菲日用卫生巾 24 片", "苏菲", "日用", "个人护理", "24片", 32.9),

  // ===== 生鲜（30）=====
  spu("FRH-FT-501", "新疆库尔勒香梨 5 斤", "原产地", "生鲜", "水果", "5斤", 39.9),
  spu("FRH-FT-502", "海南金都红芒 3 斤", "原产地", "生鲜", "水果", "3斤", 36.9),
  spu("FRH-FT-503", "广西武鸣沃柑 5 斤", "原产地", "生鲜", "水果", "5斤", 29.9),
  spu("FRH-FT-504", "智利车厘子 J 级 1kg", "进口", "生鲜", "水果", "1kg", 89.0),
  spu("FRH-FT-505", "山东烟台苹果 5 斤", "原产地", "生鲜", "水果", "5斤", 32.9),
  spu("FRH-FT-506", "海南香蕉 3 斤", "原产地", "生鲜", "水果", "3斤", 19.9),
  spu("FRH-FT-507", "陕西阎良甜瓜 4 斤", "原产地", "生鲜", "水果", "4斤", 26.9),
  spu("FRH-FT-508", "新疆吊干杏 1 斤", "原产地", "生鲜", "水果", "1斤", 19.9),
  spu("FRH-FT-509", "云南蓝莓鲜果 125g*4 盒", "原产地", "生鲜", "水果", "125g*4", 49.0),
  spu("FRH-FT-510", "新疆哈密瓜 1 个约 4 斤", "原产地", "生鲜", "水果", "约4斤", 36.9),
  spu("FRH-VG-511", "山东黄瓜 1kg", "原产地", "生鲜", "蔬菜", "1kg", 6.9),
  spu("FRH-VG-512", "云南小番茄 500g", "原产地", "生鲜", "蔬菜", "500g", 9.9),
  spu("FRH-VG-513", "湖北莲藕 1kg", "原产地", "生鲜", "蔬菜", "1kg", 12.9),
  spu("FRH-EG-514", "正大鲜鸡蛋 30 枚", "正大", "生鲜", "蛋类", "30枚", 26.9),
  spu("FRH-EG-515", "黄天鹅可生食鸡蛋 20 枚", "黄天鹅", "生鲜", "蛋类", "20枚", 49.9),
  spu("FRH-MT-516", "雨润冷鲜猪里脊 500g", "雨润", "生鲜", "肉类", "500g", 39.9),
  spu("FRH-MT-517", "国产 A2 牛腱子肉 500g", "国产", "生鲜", "肉类", "500g", 49.9),
  spu("FRH-MT-518", "凤翔鸡胸肉 1kg", "凤翔", "生鲜", "肉类", "1kg", 35.9),
  spu("FRH-AQ-519", "鲜活基围虾 500g", "原产地", "生鲜", "水产", "500g", 79.0),
  spu("FRH-AQ-520", "三文鱼刺身段 200g", "进口", "生鲜", "水产", "200g", 79.0),
];

// 仅在松鼠便利/快送熊有的"缺口品"（关键：用来演示补货建议）
const COMPETITOR_ONLY_SPU: Spu[] = [
  // 自家完全没有的「酒类」品类
  spu("LIQ-BR-601", "百威啤酒 330ml*24 罐", "百威", "酒水", "啤酒", "330ml*24", 99.0),
  spu("LIQ-BR-602", "青岛纯生啤酒 500ml*12 罐", "青岛", "酒水", "啤酒", "500ml*12", 69.0),
  spu("LIQ-BR-603", "雪花勇闯天涯啤酒 500ml*12", "雪花", "酒水", "啤酒", "500ml*12", 65.0),
  spu("LIQ-BR-604", "科罗娜啤酒 330ml*24 瓶", "科罗娜", "酒水", "啤酒", "330ml*24", 199.0),
  spu("LIQ-BR-605", "1664 白啤 330ml*24 罐", "1664", "酒水", "啤酒", "330ml*24", 159.0),
  spu("LIQ-WN-606", "长城干红 750ml", "长城", "酒水", "葡萄酒", "750ml", 79.0),
  spu("LIQ-WN-607", "张裕赤霞珠干红 750ml", "张裕", "酒水", "葡萄酒", "750ml", 88.0),
  spu("LIQ-WN-608", "奔富洛神山庄赤霞珠 750ml", "奔富", "酒水", "葡萄酒", "750ml", 168.0),
  spu("LIQ-WN-609", "智利红魔鬼赤霞珠 750ml", "智利", "酒水", "葡萄酒", "750ml", 75.0),
  spu("LIQ-WN-610", "法国波尔多干红 750ml", "波尔多", "酒水", "葡萄酒", "750ml", 99.0),
  // 自家烘焙缺口（中高价位）
  spu("BAK-BR-216", "山姆牛角面包 500g", "山姆", "烘焙", "面包", "500g", 39.9),
  spu("BAK-BR-217", "金枕榴莲千层 8 寸", "山姆", "烘焙", "蛋糕", "8寸", 198.0),
  spu("BAK-BR-218", "好利来半熟芝士盒 8 枚", "好利来", "烘焙", "蛋糕", "8枚", 79.0),
  spu("BAK-BR-219", "鲍师傅海苔肉松小贝 12 枚", "鲍师傅", "烘焙", "糕点", "12枚", 79.0),
  spu("BAK-BR-220", "原麦山丘软欧包 4 个", "原麦山丘", "烘焙", "面包", "4个", 49.0),
  // 自家进口零食缺口
  spu("SNK-IM-151", "Lotte 巧克力派 12 枚", "Lotte", "零食", "进口零食", "12枚", 25.9),
  spu("SNK-IM-152", "Kasugai 春日井果汁软糖 107g", "春日井", "零食", "进口零食", "107g", 19.9),
  spu("SNK-IM-153", "明治雪吻巧克力 132g", "明治", "零食", "进口零食", "132g", 36.0),
  spu("SNK-IM-154", "Lay's 美国进口薯片烧烤味 184g", "Lay's", "零食", "进口零食", "184g", 19.9),
  spu("SNK-IM-155", "宝路香酥饼干马来西亚进口 432g", "宝路", "零食", "进口零食", "432g", 29.9),
  spu("SNK-IM-156", "卡乐 B 北海道薯条三兄弟 90g", "Calbee", "零食", "进口零食", "90g", 26.9),
  spu("SNK-IM-157", "韩国海太蜂蜜黄油薯条 60g", "海太", "零食", "进口零食", "60g", 12.9),
  spu("SNK-IM-158", "土耳其黑啤巧克力 100g", "土耳其", "零食", "进口零食", "100g", 19.9),
  // 自家母婴缺口
  spu("BBY-MK-701", "美素佳儿婴幼儿奶粉 3 段 800g", "美素佳儿", "母婴", "奶粉", "800g", 268.0),
  spu("BBY-MK-702", "爱他美卓萃 3 段 800g", "爱他美", "母婴", "奶粉", "800g", 308.0),
  spu("BBY-DP-703", "好奇金装纸尿裤 L 号 64 片", "好奇", "母婴", "纸尿裤", "L*64", 99.0),
  spu("BBY-DP-704", "帮宝适超薄干爽 M 号 76 片", "帮宝适", "母婴", "纸尿裤", "M*76", 99.0),
  spu("BBY-WP-705", "强生婴儿沐浴露 200ml", "强生", "母婴", "洗护", "200ml", 26.9),
];

// ============== 4. 采样生成三方 SKU ==============

function jitter(base: number, range: number) {
  return +(base * (1 + (Math.random() * 2 - 1) * range)).toFixed(2);
}
function jitterPriceRound(base: number, range: number) {
  const p = jitter(base, range);
  return Math.round(p * 10) / 10;
}

const ALL_SPU = [...SPU_LIB, ...COMPETITOR_ONLY_SPU];

// 自家：抽样 200，主要来自 SPU_LIB，少量来自竞品独有（演示"自家也有几个特色品"）
function pickSelfSkus() {
  const selfSkus = SPU_LIB.slice(); // 全要 SPU_LIB
  // 不要太多酒类、母婴（自家是个缺口）
  return selfSkus.map((s) => ({
    id: `SKU-${s.spuId}`,
    spuId: s.spuId,
    name: s.name,
    brand: s.brand,
    category: s.category,
    subcategory: s.subcategory,
    spec: s.spec,
    cost: jitter(s.baseCost, 0.05),
    price: jitterPriceRound(s.basePrice, 0.05),
    stock: Math.floor(Math.random() * 200) + 20,
    status: "active" as const,
    source: "self" as const,
  }));
}

// 竞品：松鼠便利 = SPU_LIB 全要 + 全部 COMPETITOR_ONLY_SPU + 价格略高/低
function pickCompetitorSkus(competitorId: string, priceBias: number) {
  return ALL_SPU.map((s) => ({
    id: randomUUID(),
    competitorId,
    spuId: s.spuId,
    name: s.name,
    brand: s.brand,
    category: s.category,
    subcategory: s.subcategory,
    spec: s.spec,
    price: jitterPriceRound(s.basePrice * (1 + priceBias), 0.08),
    monthlySales: Math.floor(Math.random() * 3000) + 50,
    source: "apify_demo",
  }));
}

// ============== 5. 30 天 daily_metrics ==============
function genDailyMetrics() {
  const rows = [];
  const today = new Date();
  for (const store of STORES) {
    const baseGmv = 8000 + Math.random() * 12000;
    const baseUv = 2000 + Math.random() * 3000;
    for (let i = 30; i >= 1; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().slice(0, 10);
      const dayOfWeek = date.getDay();
      const weekendBoost = dayOfWeek === 0 || dayOfWeek === 6 ? 1.25 : 1.0;
      const trend = 1 + i * 0.003; // 略上升趋势
      const noise = 1 + (Math.random() * 0.2 - 0.1);
      const gmv = +(baseGmv * weekendBoost * trend * noise).toFixed(2);
      const orderCnt = Math.floor((gmv / (50 + Math.random() * 15)) * (0.9 + Math.random() * 0.2));
      const uv = Math.floor(baseUv * weekendBoost * noise);
      const pv = Math.floor(uv * (2.2 + Math.random()));
      const cvr = +(orderCnt / uv).toFixed(4);
      const aov = +(gmv / orderCnt).toFixed(2);
      rows.push({
        storeId: store.id,
        date: dateStr,
        gmv,
        orderCnt,
        uv,
        pv,
        cvr,
        aov,
        refundRate: +(0.005 + Math.random() * 0.025).toFixed(4),
        riderMin: +(22 + Math.random() * 16).toFixed(1),
        repurchaseRate30d: +(0.15 + Math.random() * 0.15).toFixed(4),
      });
    }
  }
  return rows;
}

// ============== 6. 活动 ==============
function genCampaigns() {
  const today = Date.now();
  const D = 86400 * 1000;
  return [
    { platform: "meituan" as const, type: "神券节", name: "618 神券节品类专场", offsetSignup: -2, signupDays: 7, offsetEvent: 8, eventDays: 3, discountType: "满减", discountValue: 30 },
    { platform: "meituan" as const, type: "限时折扣", name: "饮料 7 折限时折扣", offsetSignup: -1, signupDays: 3, offsetEvent: 3, eventDays: 2, discountType: "折扣", discountValue: 0.7 },
    { platform: "meituan" as const, type: "品类日", name: "零食品类日 加价购", offsetSignup: 0, signupDays: 5, offsetEvent: 6, eventDays: 1, discountType: "加价购", discountValue: 9.9 },
    { platform: "meituan" as const, type: "团购节", name: "便利店团购爆款", offsetSignup: 1, signupDays: 5, offsetEvent: 7, eventDays: 3, discountType: "团购", discountValue: 0.8 },
    { platform: "eleme"   as const, type: "特价团", name: "饿了么特价团 夏日清凉", offsetSignup: 0, signupDays: 4, offsetEvent: 5, eventDays: 5, discountType: "满减", discountValue: 20 },
    { platform: "eleme"   as const, type: "新人券", name: "饿了么新客 15 减 10", offsetSignup: -3, signupDays: 14, offsetEvent: 0, eventDays: 30, discountType: "新人券", discountValue: 10 },
    { platform: "eleme"   as const, type: "品牌日", name: "可口可乐品牌日联合", offsetSignup: 2, signupDays: 4, offsetEvent: 7, eventDays: 2, discountType: "折扣", discountValue: 0.75 },
    { platform: "douyin"  as const, type: "团购券", name: "抖音本地团购券·下午茶", offsetSignup: -1, signupDays: 5, offsetEvent: 4, eventDays: 7, discountType: "团购", discountValue: 0.65 },
    { platform: "douyin"  as const, type: "直播专享", name: "抖音直播间专享 满 39 减 10", offsetSignup: 1, signupDays: 3, offsetEvent: 5, eventDays: 1, discountType: "满减", discountValue: 10 },
    { platform: "jd"      as const, type: "京东到家", name: "京东到家 9.9 元包邮", offsetSignup: 0, signupDays: 6, offsetEvent: 7, eventDays: 4, discountType: "包邮", discountValue: 9.9 },
    { platform: "jd"      as const, type: "PLUS日",  name: "京东 PLUS 日 95 折", offsetSignup: 3, signupDays: 4, offsetEvent: 9, eventDays: 2, discountType: "折扣", discountValue: 0.95 },
    { platform: "meituan" as const, type: "夜宵节", name: "美团夜宵节 22 点后立减", offsetSignup: -2, signupDays: 6, offsetEvent: 6, eventDays: 5, discountType: "满减", discountValue: 5 },
  ].map((c, i) => ({
    id: `CMP-${String(i + 1).padStart(3, "0")}`,
    platform: c.platform,
    type: c.type,
    name: c.name,
    signupStart: new Date(today + c.offsetSignup * D),
    signupEnd: new Date(today + (c.offsetSignup + c.signupDays) * D),
    eventStart: new Date(today + c.offsetEvent * D),
    eventEnd: new Date(today + (c.offsetEvent + c.eventDays) * D),
    discountType: c.discountType,
    discountValue: c.discountValue,
    budgetLimit: Math.floor(Math.random() * 5000) + 1000,
    status: (["draft", "pending", "approved", "running"] as const)[Math.floor(Math.random() * 4)],
    aiRecommendation: null,
    aiScore: null,
  }));
}

// ============== 7. 主流程 ==============
async function main() {
  console.log("🌱 开始灌种子数据...");

  // 清表（开发用）
  await db.delete(dailyMetrics);
  await db.delete(campaigns);
  await db.delete(competitorSkus);
  await db.delete(competitors);
  await db.delete(skus);
  await db.delete(stores);
  await db.delete(users);

  // 用户
  await db.insert(users).values(
    DEMO_USERS.map((u) => ({
      id: randomUUID(),
      username: u.username,
      passwordHash,
      name: u.name,
      role: u.role,
    }))
  );
  console.log(`  ✓ ${DEMO_USERS.length} 用户 (密码统一: ${DEMO_PWD})`);

  // 门店
  await db.insert(stores).values(STORES);
  console.log(`  ✓ ${STORES.length} 门店`);

  // 自家 SKU
  const selfSkus = pickSelfSkus();
  await db.insert(skus).values(selfSkus);
  console.log(`  ✓ ${selfSkus.length} 自家 SKU`);

  // 竞品
  const competitorRows = [
    { id: "CMP-songshu",  name: "松鼠便利",   type: "近场零售/即时零售", region: "全国" },
    { id: "CMP-kuaisong", name: "快送熊",     type: "近场零售/即时零售", region: "华东" },
  ];
  await db.insert(competitors).values(competitorRows);

  const songshuSkus = pickCompetitorSkus("CMP-songshu", -0.03);   // 松鼠略低价
  const kuaisongSkus = pickCompetitorSkus("CMP-kuaisong", +0.02); // 快送熊略高价
  // 分批插入避免 SQLite 参数上限
  const all = [...songshuSkus, ...kuaisongSkus];
  for (let i = 0; i < all.length; i += 200) {
    await db.insert(competitorSkus).values(all.slice(i, i + 200));
  }
  console.log(`  ✓ 松鼠 ${songshuSkus.length} SKU + 快送熊 ${kuaisongSkus.length} SKU`);

  // 30 天经营数据
  const metrics = genDailyMetrics();
  for (let i = 0; i < metrics.length; i += 200) {
    await db.insert(dailyMetrics).values(metrics.slice(i, i + 200));
  }
  console.log(`  ✓ ${metrics.length} 条 daily_metrics`);

  // 活动
  const camps = genCampaigns();
  await db.insert(campaigns).values(camps);
  console.log(`  ✓ ${camps.length} 个活动`);

  console.log("\n✅ 种子数据完成");
  console.log(`登录地址：http://localhost:3000/login`);
  console.log(`账号：boss / director / manager / staff   密码：${DEMO_PWD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
