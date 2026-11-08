import { AlertCircleIcon } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"
import type {
  FieldError as RhfFieldError,
  UseFormRegisterReturn,
} from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { errorMessage } from "@/lib/errors"

interface TextFieldProps extends Omit<ComponentProps<typeof Input>, "name"> {
  label: string
  registration: UseFormRegisterReturn
  // RHF error whose message is an i18n key such as "validation.email"
  error?: RhfFieldError
}

/** Label + input + translated validation message, sized for fingers on phones */
export function TextField({
  label,
  registration,
  error,
  id,
  ...input
}: TextFieldProps) {
  const { t } = useTranslation()
  const inputId = id ?? registration.name
  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <Input
        id={inputId}
        aria-invalid={!!error || undefined}
        className="h-11 text-base lg:h-9 lg:text-sm"
        {...registration}
        {...input}
      />
      {error?.message && <FieldError>{t(error.message)}</FieldError>}
    </Field>
  )
}

/** Full-width submit button that shows a spinner and blocks double clicks */
export function SubmitButton({
  pending,
  children,
}: {
  pending: boolean
  children: ReactNode
}) {
  return (
    <Button
      type="submit"
      size="lg"
      className="h-11 w-full text-base lg:h-9 lg:text-sm"
      disabled={pending}
    >
      {pending && <Spinner />}
      {children}
    </Button>
  )
}

/** The API error of a failed request, as a readable sentence */
export function ErrorAlert({
  error,
  title,
}: {
  error: unknown
  title?: string
}) {
  const { t } = useTranslation()
  if (!error) return null
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{errorMessage(error, t)}</AlertDescription>
    </Alert>
  )
}
