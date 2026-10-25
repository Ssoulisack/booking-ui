import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useBlocker } from "react-router"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useUnsavedStore } from "@/stores/unsaved"

const anyUnsaved = () => useUnsavedStore.getState().entries.length > 0
const unsavedChanges = () =>
  useUnsavedStore.getState().entries.some((e) => e.kind === "changes")

/**
 * Warns before the page is left with changes that are not saved, or a picked time that is not
 * booked yet: a click on the menu, a link or the back button asks first (Stay / Leave). Closing
 * or reloading the tab with unsaved edits uses the browser's own question.
 */
export function UnsavedGuard() {
  const { t } = useTranslation()
  // the words follow what is unfinished: edits in a form, or a time not booked yet
  const booking = useUnsavedStore(
    (s) => s.entries.length > 0 && s.entries.every((e) => e.kind === "booking"),
  )
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      anyUnsaved() && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (unsavedChanges()) e.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [])

  return (
    <AlertDialog open={blocker.state === "blocked"}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t(booking ? "unsaved.bookingTitle" : "unsaved.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t(booking ? "unsaved.bookingLead" : "unsaved.lead")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className="h-11 lg:h-9"
            onClick={() => blocker.state === "blocked" && blocker.reset()}
          >
            {t(booking ? "unsaved.bookingStay" : "unsaved.stay")}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            className="h-11 lg:h-9"
            onClick={() => blocker.state === "blocked" && blocker.proceed()}
          >
            {t(booking ? "unsaved.bookingLeave" : "unsaved.leave")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
