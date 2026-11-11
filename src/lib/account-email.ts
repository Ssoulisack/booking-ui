import type { User } from "@/types/auth"

/**
 * The account cannot reset its password alone: no real email, or one not verified yet (the reset link only goes to a
 * verified email). The customer menus show a red dot on My account until it is done.
 */
export const needsEmail = (user: User | null | undefined) =>
  !!user && (user.email_generated || user.email_verified === false)
