"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";
import { Button, Field, Input, Notice } from "@/components/admin/ui";

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  if (state?.step === "code") {
    return (
      <form action={action} className="flex flex-col gap-4 rounded-3xl bg-graphite-900 p-6 ring-1 ring-white/[0.07]">
        {state.error && <Notice tone="error">{state.error}</Notice>}
        <p className="text-sm text-white/60">
          Откройте приложение-аутентификатор (Google Authenticator, Authy и т.п.) и введите 6-значный код для <span className="text-white">{state.username}</span>.
        </p>
        <Field label="Код подтверждения">
          <Input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            required
            autoFocus
            placeholder="123 456"
            className="text-center text-lg tracking-[0.3em]"
          />
        </Field>
        <Button type="submit" variant="light" loading={pending} className="mt-2 h-11">
          Подтвердить
        </Button>
        <button type="button" onClick={() => window.location.assign("/admin/login")} className="text-center text-xs text-white/45 hover:text-white">
          Войти под другим логином
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4 rounded-3xl bg-graphite-900 p-6 ring-1 ring-white/[0.07]">
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="Логин">
        <Input name="username" autoComplete="username" required autoFocus maxLength={60} defaultValue={state?.username ?? ""} key={state?.username ?? ""} />
      </Field>
      <Field label="Пароль">
        <Input name="password" type="password" autoComplete="current-password" required maxLength={200} />
      </Field>
      <Button type="submit" variant="light" loading={pending} className="mt-2 h-11">
        Войти
      </Button>
    </form>
  );
}
