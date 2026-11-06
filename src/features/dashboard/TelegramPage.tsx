import { CheckCircle2Icon, SendIcon, TriangleAlertIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { ErrorAlert } from "@/components/form"
import { PageError } from "@/components/page-state"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import type {
  TelegramGroups,
  TelegramInput,
  TelegramSettings,
} from "@/lib/api/types"
import { stampIn } from "@/lib/format"

import { manage, useChange, useSettings, useTelegram } from "./api"
import { ActiveSwitch, PageHeader, Panel } from "./ui"

/**
 * /dashboard/:id/telegram — owners and admins connect a Telegram bot and the team's group, then choose what the
 * group hears about. The bot token is typed here and kept encrypted by the server; it is never shown again.
 */
export function TelegramPage() {
  const { t } = useTranslation()
  const tg = useTelegram()
  return (
    <div className="space-y-5">
      <PageHeader title={t("telegram.title")} lead={t("telegram.lead")} />
      {tg.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : tg.isError ? (
        <PageError error={tg.error} onRetry={() => void tg.refetch()} />
      ) : (
        <>
          <Connection tg={tg.data} />
          <Messages tg={tg.data} />
        </>
      )}
    </div>
  )
}

function Connection({ tg }: { tg: TelegramSettings }) {
  const { t } = useTranslation()
  const tz = useSettings().data?.in_force.timezone ?? "Asia/Vientiane"
  const save = useChange(manage.saveTelegram, ["telegram"])
  const find = useChange(manage.findTelegramGroups, [])
  const test = useChange(manage.testTelegram, ["telegram"])
  const drop = useChange(manage.disconnectTelegram, ["telegram"])
  const [token, setToken] = useState("")
  const [changing, setChanging] = useState(false)
  const [chat, setChat] = useState("")
  // the groups the bot recently saw: the owner picks one
  const [groups, setGroups] = useState<TelegramGroups["groups"] | null>(null)
  const [confirming, setConfirming] = useState(false)
  const error = save.error ?? find.error ?? test.error ?? drop.error

  const connect = () =>
    save.mutate(
      { bot_token: token.trim() },
      {
        onSuccess: () => {
          setToken("")
          setChanging(false)
          toast.success(t("telegram.botSaved"))
        },
      },
    )

  return (
    <Panel title={t("telegram.connection")}>
      <ol className="mb-5 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        {[1, 2, 3, 4, 5].map((n) => (
          <li key={n}>{t(`telegram.step${n}`)}</li>
        ))}
      </ol>

      <div className="space-y-5">
        {/* 1. the bot */}
        <div className="space-y-2">
          <Label htmlFor="tg-token">{t("telegram.token")}</Label>
          {tg.has_bot && !changing ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 font-medium">
                <CheckCircle2Icon className="size-5 text-green-600" />
                {t("telegram.botConnected", { name: tg.bot_name })}
              </span>
              <Button
                variant="outline"
                className="h-11 lg:h-9"
                onClick={() => setChanging(true)}
              >
                {t("telegram.changeBot")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Input
                id="tg-token"
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder="123456789:AA…"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="h-11 max-w-md flex-1 text-base lg:h-9 lg:text-sm"
              />
              <Button
                className="h-11 lg:h-9"
                disabled={!token.trim() || save.isPending}
                onClick={connect}
              >
                {save.isPending && <Spinner />}
                {t("telegram.connectBot")}
              </Button>
              {changing && (
                <Button
                  variant="ghost"
                  className="h-11 lg:h-9"
                  onClick={() => {
                    setChanging(false)
                    setToken("")
                  }}
                >
                  {t("dash.cancel")}
                </Button>
              )}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {t("telegram.tokenHint")}
          </p>
        </div>

        {/* 2. the group */}
        {tg.has_bot && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("telegram.group")}</p>
            {tg.has_group ? (
              <p className="inline-flex items-center gap-2 font-medium">
                <CheckCircle2Icon className="size-5 text-green-600" />
                {t("telegram.groupConnected", { name: tg.chat_title })}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("telegram.noGroup")}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={tg.has_group ? "outline" : "default"}
                className="h-11 lg:h-9"
                disabled={find.isPending}
                onClick={() =>
                  find.mutate(undefined, {
                    onSuccess: (r) => setGroups(r.groups),
                    onError: () => setGroups(null),
                  })
                }
              >
                {find.isPending && <Spinner />}
                {tg.has_group
                  ? t("telegram.findAgain")
                  : t("telegram.findGroup")}
              </Button>
              {tg.has_group && (
                <Button
                  variant="outline"
                  className="h-11 lg:h-9"
                  disabled={test.isPending}
                  onClick={() =>
                    test.mutate(undefined, {
                      onSuccess: () => toast.success(t("telegram.testSent")),
                    })
                  }
                >
                  {test.isPending ? <Spinner /> : <SendIcon />}
                  {t("telegram.sendTest")}
                </Button>
              )}
            </div>
            {groups && (
              <div className="space-y-2 rounded-xl border p-3">
                <p className="text-sm font-medium">
                  {t("telegram.groupsFound")}
                </p>
                <ul className="divide-y">
                  {groups.map((g) => (
                    <li
                      key={g.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <span className="min-w-0 font-medium break-words">
                        {g.title || g.id}
                        {g.current && (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            {t("telegram.inUse")}
                          </span>
                        )}
                      </span>
                      <Button
                        variant={g.current ? "outline" : "default"}
                        className="h-11 lg:h-9"
                        disabled={g.current}
                        loading={save.isPending}
                        onClick={() =>
                          save.mutate(
                            { chat_id: g.id },
                            {
                              onSuccess: () => {
                                setGroups(null)
                                toast.success(t("telegram.groupSaved"))
                              },
                            },
                          )
                        }
                      >
                        {t("telegram.useGroup")}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <details className="text-sm">
              <summary className="min-h-9 cursor-pointer text-muted-foreground">
                {t("telegram.manualGroup")}
              </summary>
              <div className="mt-2 flex flex-wrap gap-2">
                <Input
                  aria-label={t("telegram.groupId")}
                  placeholder="-1001234567890"
                  value={chat}
                  onChange={(e) => setChat(e.target.value)}
                  className="h-11 max-w-xs text-base lg:h-9 lg:text-sm"
                />
                <Button
                  variant="outline"
                  className="h-11 lg:h-9"
                  disabled={!chat.trim()}
                  loading={save.isPending}
                  onClick={() =>
                    save.mutate(
                      { chat_id: chat.trim() },
                      {
                        onSuccess: () => {
                          setChat("")
                          toast.success(t("telegram.groupSaved"))
                        },
                      },
                    )
                  }
                >
                  {t("telegram.saveGroup")}
                </Button>
              </div>
            </details>
          </div>
        )}

        <ErrorAlert error={error} />

        {/* how the last message went */}
        {tg.has_group &&
          (tg.last_error ? (
            <p
              role="status"
              className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            >
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              {t("telegram.lastError", { error: tg.last_error })}
            </p>
          ) : tg.last_ok_at ? (
            <p className="text-sm text-muted-foreground">
              {t("telegram.lastOk", {
                time: stampIn(tg.last_ok_at, tz),
              })}
            </p>
          ) : null)}

        {tg.has_bot && (
          <div className="border-t pt-4">
            <Button
              variant="outline"
              className="h-11 lg:h-9"
              onClick={() => setConfirming(true)}
            >
              {t("telegram.disconnect")}
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("telegram.disconnectTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("telegram.disconnectLead")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 lg:h-9">
              {t("telegram.keep")}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              className="h-11 lg:h-9"
              disabled={drop.isPending}
              onClick={() =>
                drop.mutate(undefined, {
                  onSuccess: () => {
                    setConfirming(false)
                    toast.success(t("telegram.disconnected"))
                  },
                })
              }
            >
              {drop.isPending && <Spinner />}
              {t("telegram.disconnect")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  )
}

/** What the group hears about: each switch saves at once */
function Messages({ tg }: { tg: TelegramSettings }) {
  const { t } = useTranslation()
  const save = useChange(manage.saveTelegram, ["telegram"])
  const ready = tg.has_bot && tg.has_group
  const set = (patch: TelegramInput) => save.mutate(patch)
  const rows: Array<[keyof TelegramSettings & keyof TelegramInput, string]> = [
    ["on_booking", "booking"],
    ["on_event", "event"],
    ["on_payment", "payment"],
    ["on_cancel", "cancel"],
    ["hide_phone", "hidePhone"],
  ]
  return (
    <Panel title={t("telegram.messages")} lead={t("telegram.messagesLead")}>
      <div className="space-y-3">
        <ActiveSwitch
          id="tg-enabled"
          checked={tg.enabled}
          onChange={(v) => set({ enabled: v })}
          label={t("telegram.enabled")}
          hint={ready ? t("telegram.enabledHint") : t("telegram.notReady")}
        />
        {rows.map(([field, key]) => (
          <ActiveSwitch
            key={field}
            id={`tg-${field}`}
            checked={Boolean(tg[field])}
            onChange={(v) => set({ [field]: v })}
            label={t(`telegram.${key}`)}
            hint={t(`telegram.${key}Hint`)}
          />
        ))}
      </div>
      <div className="mt-3">
        <ErrorAlert error={save.error} />
      </div>
    </Panel>
  )
}
