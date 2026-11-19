import { AuthSteps } from "./AuthSteps"

const STEPS = [
  "forgotSteps.choose",
  "forgotSteps.receive",
  "forgotSteps.confirm",
  "forgotSteps.password",
]

/** Forgot password by phone in 4 steps: choose phone → get the code → confirm it → new password */
export function ForgotSteps({ step }: { step: 1 | 2 | 3 | 4 }) {
  return <AuthSteps step={step} labels={STEPS} />
}
