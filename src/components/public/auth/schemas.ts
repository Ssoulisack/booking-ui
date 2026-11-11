import { z } from "zod"

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

// A new account always has a Lao mobile phone (20xxxxxxxx); the email is optional. There is no nationality.
const emailField = z
  .string()
  .trim()
  .refine((v) => v === "" || z.email().safeParse(v).success, "validation.email")

const phoneRequired = z
  .string()
  .trim()
  .superRefine((v, ctx) => {
    if (!v) ctx.addIssue({ code: "custom", message: "identity.phoneRequired" })
    else if (!isLaoPhone(v))
      ctx.addIssue({ code: "custom", message: "identity.phoneInvalid" })
  })

export const registerSchema = z
  .object({
    name,
    password,
    confirm: z.string(),
    phone: phoneRequired,
    email: emailField,
  })
  .refine((v) => v.password === v.confirm, {
    message: "validation.passwordsMatch",
    path: ["confirm"],
  })

// My account: an older account may have no phone yet; it then needs an email, so there is always a way to reach it
export const profileSchema = z
  .object({
    name,
    phone: z
      .string()
      .trim()
      .refine((v) => v === "" || isLaoPhone(v), "identity.phoneInvalid"),
    email: emailField,
  })
  .superRefine((v, ctx) => {
    if (!v.phone && !v.email) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: "identity.phoneRequired",
      })
    }
  })

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
