import type { SupabaseClient, User } from '@supabase/supabase-js';

// Optional accounts on top of the existing anonymous guest session (Supabase Auth, email links; no passwords).
// * Create account = UPGRADE the current guest: updateUser({ email }) attaches an email to the SAME user id, so every
//   flight and plan saved as a guest stays with it once the email link is confirmed.
// * Sign in = switch to an EXISTING account (magic link). The current guest's records are NOT merged into it; they
//   remain with the guest identity, which this browser stops using. The UI warns before doing this.
// * Sign out ends the session; the next save starts a new guest.

export type AccountStatus = 'none' | 'guest' | 'guest-pending' | 'registered';
export interface Account { status: AccountStatus; email?: string; pendingEmail?: string; userId?: string; name?: string; avatarPath?: string }

const redirect = () => (typeof window === 'undefined' ? undefined : `${window.location.origin}/`);

export function describe(user: User | null | undefined): Account {
  if (!user) return { status: 'none' };
  const pending = (user as User & { new_email?: string }).new_email || undefined;
  const meta = (user.user_metadata ?? {}) as { display_name?: string; avatar_path?: string };
  const extra = { name: meta.display_name || undefined, avatarPath: meta.avatar_path || undefined };
  if (user.is_anonymous) return { status: pending ? 'guest-pending' : 'guest', pendingEmail: pending, userId: user.id, ...extra };
  return { status: 'registered', email: user.email ?? undefined, userId: user.id, ...extra };
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

/** Display name, kept in the user's own Supabase Auth metadata. */
export async function updateName(sb: SupabaseClient, name: string): Promise<void> {
  const n = name.trim().slice(0, 60);
  const { error } = await sb.auth.updateUser({ data: { display_name: n || null } });
  if (error) throw new Error(error.message);
}

/** Resizes a picture in the browser to a 256 px square JPEG (centre crop). */
export async function squareJpeg(file: File, size = 256): Promise<Blob> {
  if (!/^image\//.test(file.type)) throw new Error('Choose an image file.');
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement('canvas'); c.width = c.height = size;
  c.getContext('2d')!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  return await new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('Could not read this image.'))), 'image/jpeg', 0.85));
}

/** Uploads the picture to the private 'avatars' bucket under the user's own folder and records its path. */
export async function uploadAvatar(sb: SupabaseClient, uid: string, file: File): Promise<string> {
  const blob = await squareJpeg(file);
  const path = `${uid}/avatar.jpg`;
  const { error } = await sb.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
  if (error) throw new Error(`Could not upload the picture: ${error.message}`);
  const versioned = `${path}?v=${Date.now()}`;
  const { error: e2 } = await sb.auth.updateUser({ data: { avatar_path: versioned } });
  if (e2) throw new Error(e2.message);
  return versioned;
}

/** Short-lived link to the user's own picture (the bucket is private). */
export async function avatarUrl(sb: SupabaseClient, versionedPath: string): Promise<string | null> {
  const [path] = versionedPath.split('?');
  const { data, error } = await sb.storage.from('avatars').createSignedUrl(path, 3600);
  return error || !data ? null : data.signedUrl;
}

export async function removeAvatar(sb: SupabaseClient, uid: string): Promise<void> {
  await sb.storage.from('avatars').remove([`${uid}/avatar.jpg`]);
  const { error } = await sb.auth.updateUser({ data: { avatar_path: null } });
  if (error) throw new Error(error.message);
}
