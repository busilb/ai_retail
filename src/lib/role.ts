export type Role = "boss" | "director" | "manager" | "staff";

export const ROLE_LABEL: Record<Role, string> = {
  boss: "老板",
  director: "总监",
  manager: "店长",
  staff: "运营",
};

export const ROLE_DESC: Record<Role, string> = {
  boss: "全局视角 · 利润 / GMV / 异常 / 竞对",
  director: "品类视角 · 品类 ROI / 补货 / 跨店对比",
  manager: "门店视角 · 单店运营 / 报名进度 / 履约",
  staff: "执行视角 · 今日待办 / 报名清单 / 补货执行",
};

export const ROLES: Role[] = ["boss", "director", "manager", "staff"];
