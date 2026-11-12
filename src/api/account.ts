import type { SupabaseClient, User } from '@supabase/supabase-js';

// Optional accounts on top of the existing anonymous guest session (Supabase Auth, email links; no passwords).
// * Create account = UPGRADE the current guest: updateUser({ email }) attaches an email to the SAME user id, so every
//   flight and plan saved as a guest stays with it once the email link is confirmed.
// * Sign in = switch to an EXISTING account (magic link). The current guest's records are NOT merged into it; they
//   remain with the guest identity, which this browser stops using. The UI warns before doing this.
// * Sign out ends the session; the next save starts a new guest.

export type AccountStatus = 'none' | 'guest' | 'guest-pending' | 'registered';
export interface Account { status: AccountStatus; email?: string; pendingEmail?: string; userId?: string }

const redirect = () => (typeof window === 'undefined' ? undefined : `${window.location.origin}/`);

export function describe(user: User | null | undefined): Account {
  if (!user) return { status: 'none' };
  const pending = (user as User & { new_email?: string }).new_email || undefined;
  if (user.is_anonymous) return { status: pending ? 'guest-pending' : 'guest', pendingEmail: pending, userId: user.id };
  return { status: 'registered', email: user.email ?? undefined, userId: user.id };
}

export async function getAccount(sb: SupabaseClient): Promise<Account> {
  const { data } = await sb.auth.getSession();
  if (!data.session) return { status: 'none' };
  const { data: u } = await sb.auth.getUser();
  return describe(u.user ?? data.session.user);
}

const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
const friendly = (m: string) =>
  /rate limit/i.test(m) ? 'Too many emails were sent recently. Please try again later.'
    : /not authorized|not allowed/i.test(m) ? 'This email address cannot receive sign-in emails from SkyStop yet.'
    : /already|registered|exists/i.test(m) ? 'An account with this email already exists. Use “Sign in” instead.'
    : m;

/** Guest → account: keeps the same user id (and therefore all saved flights and plans) once the email is confirmed. */
export async function createAccount(sb: SupabaseClient, email: string): Promise<void> {
  const e = email.trim().toLowerCase();
  if (!isEmail(e)) throw new Error('Enter a valid email address.');
  const { data } = await sb.auth.getSession();
  if (data.session?.user.is_anonymous) {
    const { error } = await sb.auth.updateUser({ email: e }, { emailRedirectTo: redirect() });
    if (error) throw new Error(friendly(error.message));
    return;
  }
  const { error } = await sb.auth.signInWithOtp({ email: e, options: { shouldCreateUser: true, emailRedirectTo: redirect() } });
  if (error) throw new Error(friendly(error.message));
}

/** Sign in to an existing account by email link. Does not merge the current guest's records. */
export async function signIn(sb: SupabaseClient, email: string): Promise<void> {
  const e = email.trim().toLowerCase();
  if (!isEmail(e)) throw new Error('Enter a valid email address.');
  const { error } = await sb.auth.signInWithOtp({ email: e, options: { shouldCreateUser: false, emailRedirectTo: redirect() } });
  if (error) throw new Error(/signups not allowed|not found/i.test(error.message) ? 'No account uses this email. Create an account instead.' : friendly(error.message));
}

export async function signOut(sb: SupabaseClient): Promise<void> {
  const { error } = await sb.auth.signOut();
  if (error) throw new Error(error.message);
}
