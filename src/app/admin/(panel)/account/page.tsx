import { requireAdmin } from "@/lib/auth/server";
import { logoutEverywhereAction } from "@/app/admin/actions";
import { Card } from "@/components/admin/ui";
import ChangePasswordForm from "@/components/admin/ChangePasswordForm";

export const metadata = { title: "Аккаунт и данные" };

export default async function AccountPage() {
  const admin = await requireAdmin();
  const storage = process.env.STORAGE_DRIVER === "s3" ? "S3-совместимое объектное хранилище" : "PostgreSQL (вместе с базой данных)";
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Аккаунт и данные</h1>
      <div className="grid gap-6">
        <Card title="Смена пароля">
          <ChangePasswordForm />
        </Card>
        <Card title="Сессии">
          <p className="text-sm text-white/55">
            Пользователь: <span className="text-white">{admin.username}</span>
            {admin.lastLoginAt && <> · последний вход {admin.lastLoginAt.toLocaleString("ru-RU", { timeZone: "Asia/Tashkent" })}</>}
          </p>
          <form action={logoutEverywhereAction} className="mt-4">
            <button className="rounded-full border border-signal/40 px-4 py-2 text-sm text-signal-bright hover:bg-signal hover:text-white">Завершить все сессии</button>
          </form>
        </Card>
        <Card title="Резервное копирование">
          <div className="grid gap-3 text-sm text-white/55">
            <p>
              Файлы хранятся: <span className="text-white">{storage}</span>.
            </p>
            <p>
              Полная резервная копия базы данных создаётся командой <code className="rounded bg-white/10 px-1.5 py-0.5 text-white">npm run db:backup</code> (pg_dump) и
              автоматическими бэкапами хостинга PostgreSQL. Ниже — быстрый экспорт каталога и настроек в JSON.
            </p>
            <a href="/api/admin/backup" download className="mt-2 inline-flex w-fit rounded-full bg-white px-4 py-2 font-medium text-black hover:bg-white/85">
              Скачать JSON-экспорт
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}
