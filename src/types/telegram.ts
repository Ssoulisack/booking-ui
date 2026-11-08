/** A branch's Telegram connection. The bot token and the group id are secret: they are never in an answer. */
export interface TelegramSettings {
  has_bot: boolean
  /** "@my_bot" */
  bot_name: string
  has_group: boolean
  chat_title: string
  /** the master switch (on only once a bot and a group are connected) */
  enabled: boolean
  on_booking: boolean
  on_event: boolean
  on_payment: boolean
  on_cancel: boolean
  /** a booking cancelled by the team */
  on_staff_cancel: boolean
  /** a group that did not come (marked by the team, or not there by its time) */
  on_no_show: boolean
  hide_phone: boolean
  /** what Telegram said when the last message failed; "" = fine */
  last_error: string
  last_ok_at?: string
}

/** A group the bot recently saw; pick one to send to */
export interface TelegramGroups {
  groups: Array<{ id: string; title: string; current: boolean }>
}

export interface TelegramInput {
  bot_token?: string
  chat_id?: string
  enabled?: boolean
  on_booking?: boolean
  on_event?: boolean
  on_payment?: boolean
  on_cancel?: boolean
  on_staff_cancel?: boolean
  on_no_show?: boolean
  hide_phone?: boolean
}
