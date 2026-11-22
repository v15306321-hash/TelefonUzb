import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth/server";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Вход" };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/logo.webp" alt="TELEFON UZB" width={72} height={72} className="h-[72px] w-[72px] rounded-full" />
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">Админ-панель</h1>
          <p className="mt-1 text-sm text-white/45">TELEFON.UZB premium</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
