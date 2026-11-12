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
const choosingTables = () =>
  useUnsavedStore.getState().entries.some((e) => e.kind === "tables")
const pickedTime = () =>
  useUnsavedStore.getState().entries.some((e) => e.kind === "booking")
const stepOf = (search: string) => new URLSearchParams(search).get("step")
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
  const tables = useUnsavedStore(
    (s) => s.entries.length > 0 && s.entries.every((e) => e.kind === "tables"),
  )
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      anyUnsaved() &&
      (currentLocation.pathname !== nextLocation.pathname ||
        // the table step of a restaurant booking (?step=table), left for the step before (in-page Back or the
        // browser's). An event page keeps its tables without a step: choosing them there never asks.
        (choosingTables() &&
          stepOf(currentLocation.search) === "table" &&
          !new URLSearchParams(nextLocation.search).has("step")) ||
        // the time step with a start picked, left for the step before (Back): the time is lost
        (pickedTime() &&
          stepOf(currentLocation.search) === "time" &&
          stepOf(nextLocation.search) !== "time")),
  )
  // the blocked move stays on this page: going back a booking step, not leaving it
  const stepBack =
    blocker.state === "blocked" &&
    blocker.location.pathname === window.location.pathname
  // the words follow what would be lost
  const words = tables
    ? {
        title: "unsaved.tablesTitle",
        lead: "unsaved.tablesLead",
        stay: "unsaved.tablesStay",
        leave: "unsaved.tablesLeave",
      }
    : booking && stepBack
      ? {
          title: "unsaved.timeTitle",
          lead: "unsaved.timeLead",
          stay: "unsaved.timeStay",
          leave: "unsaved.timeLeave",
        }
      : booking
        ? {
            title: "unsaved.bookingTitle",
            lead: "unsaved.bookingLead",
            stay: "unsaved.bookingStay",
            leave: "unsaved.bookingLeave",
          }
        : {
            title: "unsaved.title",
            lead: "unsaved.lead",
            stay: "unsaved.stay",
            leave: "unsaved.leave",
          }

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
          <AlertDialogTitle>{t(words.title)}</AlertDialogTitle>
          <AlertDialogDescription>{t(words.lead)}</AlertDialogDescription>
        </AlertDialogHeader>
        {/* side by side on every screen: leave on the left, stay on the right */}
        <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:justify-between">
          <Button
            variant="destructive"
            className="h-11 lg:h-9"
            onClick={() => blocker.state === "blocked" && blocker.proceed()}
          >
            {t(words.leave)}
          </Button>
          <AlertDialogCancel
            className="h-11 lg:h-9"
            onClick={() => blocker.state === "blocked" && blocker.reset()}
          >
            {t(words.stay)}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
