<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Session reminder cron calls the existing Edge Function hourly using a key in an RLS-locked scheduler credential table verified through a service-role-only RPC; public callers must never trigger notifications.
- Confirmation reminders cover sessions scheduled one to two hours before execution; mark delivery only after a push provider accepts a notification.
- Patient session reminders are sent by the professional from their own WhatsApp (wa.me links on the Agenda day view); patients answer at the public /c/$token page through token-scoped SECURITY DEFINER RPCs. The 18h (Brasília) run of send-session-reminders also pushes a day-before digest to the professional, deduplicated by patient_reminder_digests.
- Online booking: anyone can request a slot at the public /agendar/$slug page (get_booking_page / request_booking RPCs, re-validated in SQL with an advisory lock); every request stays 'pendente' until the professional accepts (accept_booking_request creates or reuses the patient by phone_key and creates the session) or declines in the Agenda. notify-booking-request (verify_jwt off) pushes the professional right away; send-session-reminders resends any request still not notified.
