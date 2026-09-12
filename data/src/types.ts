export type TelegramRole = "student" | "teacher";

export interface TelegramIdentity {
  role: TelegramRole;
  id: string;
  firstName: string;
}
