"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/admin/actions";
import { Button, Field, Input, Notice } from "./ui";

export default function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-3">
      {state && <div className="sm:col-span-3"><Notice tone={state.ok ? "ok" : "error"}>{state.ok ? state.message : state.error}</Notice></div>}
      <Field label="Текущий пароль">
        <Input name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Новый пароль" hint="Не менее 10 символов, буквы и цифры">
        <Input name="next" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <Field label="Повторите пароль">
        <Input name="confirm" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <div className="sm:col-span-3">
        <Button type="submit" variant="light" loading={pending}>Изменить пароль</Button>
      </div>
    </form>
  );
}
