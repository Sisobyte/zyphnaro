// Turn on only after custom SMTP is set up and the Reset Password email template
// contains {{ .Token }}. With Supabase's default template the email has a link but
// no code, so the code box must stay hidden.
export const resetCodeEnabled = process.env.NEXT_PUBLIC_RESET_CODE_ENABLED === "true";
