"use client";

import { useActionState } from "react";
import { confirmTotpAction, disableTotpAction } from "@/app/admin/actions";
import { Button, Field, Input, Notice } from "./ui";

const codeInput = (
  <Input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required placeholder="123 456" className="tracking-[0.25em]" />
);

export function TotpConfirmForm() {
  const [state, action, pending] = useActionState(confirmTotpAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      {state && <Notice tone={state.ok ? "ok" : "error"}>{state.ok ? state.message : state.error}</Notice>}
      <Field label="Код из приложения">{codeInput}</Field>
      <Button type="submit" variant="light" loading={pending} className="w-fit">
        Включить защиту
      </Button>
    </form>
  );
}

export function TotpDisableForm() {
  const [state, action, pending] = useActionState(disableTotpAction, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      {state && (
        <div className="sm:col-span-3">
          <Notice tone={state.ok ? "ok" : "error"}>{state.ok ? state.message : state.error}</Notice>
        </div>
      )}
      <Field label="Текущий пароль">
        <Input name="password" type="password" autoComplete="current-password" required maxLength={200} />
      </Field>
      <Field label="Код из приложения">{codeInput}</Field>
      <Button type="submit" variant="danger" loading={pending}>
        Выключить
      </Button>
    </form>
  );
}
