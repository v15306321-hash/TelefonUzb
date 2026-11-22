"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";
import { Button, Field, Input, Notice } from "@/components/admin/ui";

export default function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
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
