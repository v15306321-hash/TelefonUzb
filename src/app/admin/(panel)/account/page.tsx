import QRCode from "qrcode";
import { requireAdmin } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { otpauthUri } from "@/lib/auth/totp";
import { cancelTotpSetupAction, logoutEverywhereAction, startTotpSetupAction } from "@/app/admin/actions";
import { Card } from "@/components/admin/ui";
import ChangePasswordForm from "@/components/admin/ChangePasswordForm";
import { TotpConfirmForm, TotpDisableForm } from "@/components/admin/TwoFactorForms";

export const metadata = { title: "Аккаунт и данные" };

export default async function AccountPage() {
  const admin = await requireAdmin();
  const totp = await prisma.adminUser.findUniqueOrThrow({ where: { id: admin.id }, select: { totpSecret: true, totpEnabledAt: true } });
  const pending = !totp.totpEnabledAt && totp.totpSecret ? totp.totpSecret : null;
  const qr = pending ? await QRCode.toString(otpauthUri(pending, admin.username), { type: "svg", margin: 1, width: 200, color: { dark: "#000000", light: "#ffffff" } }) : null;
  const storage = process.env.STORAGE_DRIVER === "s3" ? "S3-совместимое объектное хранилище" : "PostgreSQL (вместе с базой данных)";
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Аккаунт и данные</h1>
      <div className="grid gap-6">
        <Card title="Смена пароля">
          <ChangePasswordForm />
        </Card>
        <Card title="Двухфакторная защита входа">
          {totp.totpEnabledAt ? (
            <div className="grid gap-4">
              <p className="text-sm text-ok">
                ● Включена с {totp.totpEnabledAt.toLocaleDateString("ru-RU", { timeZone: "Asia/Tashkent" })}. Для входа нужен пароль и код из приложения.
              </p>
              <p className="text-xs text-white/40">Чтобы выключить — введите пароль и текущий код.</p>
              <TotpDisableForm />
            </div>
          ) : pending && qr ? (
            <div className="grid gap-5 md:grid-cols-[200px_1fr]">
              <div className="h-[200px] w-[200px] overflow-hidden rounded-2xl bg-white" dangerouslySetInnerHTML={{ __html: qr }} />
              <div className="grid content-start gap-3 text-sm text-white/60">
                <p>
                  1. Установите на телефон <span className="text-white">Google Authenticator</span>, Microsoft Authenticator или Authy.
                </p>
                <p>2. Отсканируйте QR-код или введите ключ вручную:</p>
                <code className="w-fit select-all break-all rounded-lg bg-white/10 px-2.5 py-1.5 font-mono text-xs text-white">{pending.replace(/(.{4})/g, "$1 ").trim()}</code>
                <p>3. Введите 6-значный код, который покажет приложение.</p>
                <TotpConfirmForm />
                <form action={cancelTotpSetupAction}>
                  <button className="text-xs text-white/40 hover:text-white">Отменить настройку</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 text-sm text-white/55">
              <p>
                Выключена. С защитой для входа кроме пароля нужен одноразовый код из приложения на вашем телефоне — даже узнав пароль, посторонний не
                войдёт.
              </p>
              <form action={startTotpSetupAction}>
                <button className="rounded-full bg-white px-4 py-2 font-medium text-black hover:bg-white/85">Настроить</button>
              </form>
            </div>
          )}
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
              Полная копия базы (вместе с фото) автоматически создаётся каждую ночь в GitHub Actions — зашифрованный файл хранится 30 дней во вкладке
              «Actions» репозитория. Ниже — быстрый экспорт каталога и настроек в JSON.
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
