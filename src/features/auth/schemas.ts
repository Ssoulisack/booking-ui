import { z } from "zod"

import { LAOS } from "@/lib/countries"
import { isLaoPhone } from "@/lib/phone"

// Messages are i18n keys, translated where they are shown (TextField)
const email = z
  .string()
  .trim()
  .min(1, "validation.required")
  .email("validation.email")
const password = z.string().min(8, "validation.passwordMin")
const name = z.string().trim().min(1, "validation.required")
const phone = z.string().trim().optional()

export const loginSchema = z.object({
  login: z.string().trim().min(1, "validation.required"),
  password: z.string().min(1, "validation.required"),
})

// Nationality decides what is needed: Lao → phone (email optional); others → email (phone optional)
const identityFields = {
  nationality: z.string().min(1, "identity.nationalityRequired"),
  phone: z.string().trim(),
  email: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || z.email().safeParse(v).success,
      "validation.email",
    ),
}

function identityRules(
  v: { nationality: string; phone: string; email: string },
  ctx: z.RefinementCtx,
) {
  const lao = v.nationality === LAOS
  // account phones are Lao mobiles only, for every nationality (a foreigner without one leaves it empty)
  if (v.phone && !isLaoPhone(v.phone)) {
    ctx.addIssue({
      code: "custom",
      path: ["phone"],
      message: "identity.phoneInvalid",
    })
  } else if (lao && !v.phone) {
    ctx.addIssue({
      code: "custom",
      path: ["phone"],
      message: "identity.phoneRequired",
    })
  }
  if (v.nationality && !lao && !v.email) {
    ctx.addIssue({
      code: "custom",
      path: ["email"],
      message: "identity.emailRequired",
    })
  }
}

export const registerSchema = z
  .object({ name, password, ...identityFields })
  .superRefine(identityRules)

export const profileSchema = z
  .object({ name, ...identityFields })
  .superRefine(identityRules)

export const forgotSchema = z.object({ email })

const passwordsMatch = {
  message: "validation.passwordsMatch",
  path: ["confirm"],
}

export const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, passwordsMatch)

export const acceptNewSchema = z
  .object({ name, phone, password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, passwordsMatch)

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
export type ProfileValues = z.infer<typeof profileSchema>
export type ForgotValues = z.infer<typeof forgotSchema>
export type ResetValues = z.infer<typeof resetSchema>
export type AcceptNewValues = z.infer<typeof acceptNewSchema>
