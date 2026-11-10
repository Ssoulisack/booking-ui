import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router"

import { ErrorAlert } from "@/components/global/form"
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
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export interface SettingsTab<K extends string> {
  key: K
  /** the words on the tab (already translated) */
  label: string
  /** this tab holds edits that are not saved */
  changed: boolean
  content: ReactNode
}

/**
 * The tabs of a settings page, with the Discard and Save buttons in the same row. Put it INSIDE the page's <form>: Save is
 * the form's submit button.
 *
 * - The open tab lives in the address (?tab=name): it is still there after a save reloads the form, and can be linked to.
 *   A missing or unknown name opens the first tab.
 * - Opening another tab while this one has unsaved edits asks first: Leave (the edits of this tab are thrown away, through
 *   onLeaveTab) or Keep editing. Leaving the page itself is asked by UnsavedGuard, which the page feeds with useUnsaved.
 * - Phone: Discard (30%) and Save (70%) are a bar pinned to the bottom of the screen; from sm up they sit at the end of the
 *   tab row. A failed save shows its message above the bar (phone) or under the row.
 */
export function SettingsTabs<K extends string>({
  tabs,
  dirty,
  saving,
  error,
  onLeaveTab,
  onDiscard,
}: {
  tabs: ReadonlyArray<SettingsTab<K>>
  /** anything on the page is changed: enables Save and Discard */
  dirty: boolean
  saving: boolean
  error: unknown
  /** throw away the edits of one tab (called when the person chooses Leave) */
  onLeaveTab: (key: K) => void
  /** back to what was loaded, on every tab (the Discard button) */
  onDiscard: () => void
}) {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const wanted = params.get("tab")
  const tab = tabs.find((x) => x.key === wanted) ?? tabs[0]
  const go = (next: K) => setParams({ tab: next }, { replace: true })
  // the tab the person asked for while this one has edits: waits for their answer in the popup
  const [target, setTarget] = useState<K | null>(null)
  const requestTab = (next: string) => {
    if (next === tab.key) return
    if (tab.changed) setTarget(next as K)
    else go(next as K)
  }
  const leave = () => {
    const next = target
    if (!next) return
    onLeaveTab(tab.key)
    setTarget(null)
    go(next)
  }

  return (
    <>
      <Tabs value={tab.key} onValueChange={requestTab}>
        {/* the tabs on the left, Discard and Save on the right: always in sight, no scrolling down to the end of a long tab */}
        <div className="flex items-center justify-between gap-3">
          {/* many tabs can be wider than a phone: this part scrolls sideways (min-w-0 lets it shrink). The padding keeps the focus ring of a tab from being cut by the scroll box */}
          <div className="-mx-1 min-w-0 flex-1 overflow-x-auto p-1">
            {/* the list is h-8 by default (a rule that only a same-named rule can replace): h-11 is taller than the h-9 tabs plus its padding, so no tab sticks out */}
            <TabsList className="w-max group-data-horizontal/tabs:h-11">
              {tabs.map((x) => (
                <TabsTrigger
                  key={x.key}
                  value={x.key}
                  // the open tab: candy yellow with black text (also while the mouse is over it); the others turn yellow, not white, on hover in dark mode
                  className="h-9 px-3 dark:hover:text-[#FBBF24] data-active:bg-[#FBBF24] data-active:text-black data-active:shadow-none data-active:hover:text-black dark:data-active:border-transparent dark:data-active:bg-[#FBBF24] dark:data-active:text-black dark:data-active:hover:text-black"
                >
                  {x.label}
                  {x.changed && (
                    <>
                      {/* the same colour as the text, so it shows on the yellow tab too */}
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full bg-current"
                      />
                      <span className="sr-only">{t("unsaved.title")}</span>
                    </>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {/* phone: a bar pinned to the bottom of the screen, Discard 30% and Save 70% of the row, minus half the 8px gap each (the error above them); from sm up both sit at the end of the tab row */}
          <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t bg-background p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:static sm:z-auto sm:shrink-0 sm:border-0 sm:bg-transparent sm:p-0">
            <div className="sm:hidden">
              <ErrorAlert error={error} />
            </div>
            <div className="flex gap-2">
              {/* back to what was loaded; disabled (not hidden) while nothing is changed, so the two widths never jump */}
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-none basis-[calc(30%-4px)] sm:basis-auto lg:h-9"
                disabled={!dirty || saving}
                onClick={onDiscard}
              >
                {t("settings.discard")}
              </Button>
              <Button
                type="submit"
                className="h-11 flex-none basis-[calc(70%-4px)] sm:basis-auto lg:h-9"
                disabled={saving || !dirty}
              >
                {saving && <Spinner />}
                {t("settings.save")}
              </Button>
            </div>
          </div>
        </div>
        {/* from sm up a failed save is shown here, under the button, not at the bottom of a long tab */}
        <div className="hidden sm:block">
          <ErrorAlert error={error} />
        </div>
        {tabs.map((x) => (
          <TabsContent key={x.key} value={x.key} className="mt-4">
            {x.content}
          </TabsContent>
        ))}
      </Tabs>
      {/* phone: room for the pinned bar, so it never covers the last field (taller while an error is shown in the bar) */}
      <div aria-hidden className={`sm:hidden ${error ? "h-44" : "h-24"}`} />
      {/* a tab with edits is being left for another: leave (the edits are lost) or keep editing */}
      <AlertDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unsaved.tabTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("unsaved.tabLead")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* side by side on every screen: leave on the left, keep editing on the right (the same as the page-leave popup) */}
          <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              className="h-11 lg:h-9"
              onClick={leave}
            >
              {t("unsaved.tabLeave")}
            </Button>
            <AlertDialogCancel className="h-11 lg:h-9">
              {t("unsaved.tabKeep")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
