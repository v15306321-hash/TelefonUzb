import bcrypt from "bcryptjs";

const ROUNDS = 12;
export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/** Constant-ish time dummy compare to avoid user-enumeration timing differences. */
let dummyHash: Promise<string> | null = null;
export async function dummyVerify(plain: string) {
  dummyHash ??= bcrypt.hash("telefonuzb-dummy-password", ROUNDS);
  await bcrypt.compare(plain, await dummyHash);
  return false;
}

export function passwordProblems(pw: string): string | null {
  if (pw.length < 10) return "Пароль должен содержать не менее 10 символов";
  if (!/[a-zA-Zа-яА-Я]/.test(pw) || !/\d/.test(pw)) return "Пароль должен содержать буквы и цифры";
  return null;
}
