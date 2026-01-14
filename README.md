# Nota_Test

## Password reset flow
Password recovery emails from Supabase should redirect back to the app using `#reset`. When the app loads with `#reset` or `type=recovery` in the URL hash, it opens the **Set new password** screen, establishes a session from the recovery URL, and lets the user set a new password before returning to the normal login screen.
