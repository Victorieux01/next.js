'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import supabase from './supabase';
import { auth, signIn, signOut, unstable_update } from '@/auth';
import { AuthError } from 'next-auth';
import bcrypt from 'bcrypt';

import { formatCurrency } from './utils';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({ invalid_type_error: 'Please select a customer.' }),
  amount: z.coerce.number().gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], { invalid_type_error: 'Please select an invoice status.' }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function deleteInvoice(id: string) {
  await supabase.from('invoices').delete().eq('id', id);
  revalidatePath('/dashboard/invoices');
}

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  try {
    const { error } = await supabase.from('invoices').insert({
      customer_id: customerId,
      amount: amountInCents,
      status,
      date,
    });
    if (error) throw error;
  } catch (error) {
    console.error(error);
    return { message: 'Database Error: Failed to Create Invoice.' };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  try {
    const { error } = await supabase.from('invoices').update({
      customer_id: customerId,
      amount: amountInCents,
      status,
    }).eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error(error);
    return { message: 'Database Error: Failed to Update Invoice.' };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function logout() {
  await signOut({ redirectTo: '/login' });
}

export async function authenticate(prevState: string | undefined, formData: FormData) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

export async function requestInvoiceDeletion(id: string) {
  try {
    const { data: invoiceData, error } = await supabase
      .from('invoices')
      .select('id, amount, customers(name, email)')
      .eq('id', id)
      .single();

    if (error || !invoiceData) return { error: 'Invoice not found' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = invoiceData.customers as any;

    await supabase.from('invoices').update({ status: 'pending_deletion' }).eq('id', id);

    const { sendInvoiceDeletionEmail } = await import('./sendgrid');
    await sendInvoiceDeletionEmail(
      customer.email,
      customer.name,
      formatCurrency(invoiceData.amount),
      id,
    );

    revalidatePath('/dashboard/invoices');
    return { success: true };
  } catch (error) {
    console.error('Error:', error);
    return { error: 'Failed to request invoice deletion' };
  }
}

// ─── Registration ────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export type RegisterState = {
  errors?: { name?: string[]; email?: string[]; password?: string[] };
  message?: string | null;
};

export async function registerUser(
  prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const validated = RegisterSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      message: 'Invalid fields. Please check your details.',
    };
  }

  const { name, email, password } = validated.data;

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    return { errors: { email: ['An account with this email already exists.'] } };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const { generateSecret } = await import('./totp');
  const totpSecret = generateSecret();

  const { error } = await supabase.from('users').insert({
    name,
    email,
    password: hashedPassword,
    totp_secret: totpSecret,
    totp_enabled: false,
  });

  if (error) {
    console.error('Registration DB error:', error);
    return { message: 'Database error: could not create account.' };
  }

  try {
    await signIn('credentials', { email, password, redirectTo: '/register/2fa-setup' });
  } catch (error) {
    if (error instanceof AuthError) {
      return { message: 'Account created but sign-in failed. Please log in.' };
    }
    throw error;
  }

  return { message: null };
}

// ─── 2FA Setup (after registration) ─────────────────────────────────────────

export type Setup2FAState = { error?: string | null };

export async function verify2FASetup(
  prevState: Setup2FAState,
  formData: FormData,
): Promise<Setup2FAState> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'You must be logged in.' };

  const code = (formData.get('code') as string)?.trim();
  if (!code || !/^\d{6}$/.test(code)) {
    return { error: 'Please enter a valid 6-digit code.' };
  }

  const { data: user } = await supabase
    .from('users')
    .select('totp_secret')
    .eq('id', session.user.id)
    .single();

  if (!user?.totp_secret) return { error: '2FA secret not found. Please register again.' };

  const { verifyTotpCode } = await import('./totp');
  if (!(await verifyTotpCode(code, user.totp_secret))) {
    return { error: 'Invalid code. Please try again.' };
  }

  const { error: updateError } = await supabase
    .from('users')
    .update({ totp_enabled: true })
    .eq('id', session.user.id);

  if (updateError) return { error: 'Failed to enable 2FA. Please try again.' };

  redirect('/dashboard');
}

// ─── 2FA Login Verification ──────────────────────────────────────────────────

export type Verify2FAState = { error?: string | null };

export async function verifyTwoFactor(
  prevState: Verify2FAState,
  formData: FormData,
): Promise<Verify2FAState> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Session expired. Please log in again.' };

  const code = (formData.get('code') as string)?.trim();
  if (!code || !/^\d{6}$/.test(code)) {
    return { error: 'Please enter a valid 6-digit code.' };
  }

  const { data: user } = await supabase
    .from('users')
    .select('totp_secret, totp_enabled')
    .eq('id', session.user.id)
    .single();

  if (!user?.totp_secret || !user.totp_enabled) {
    return { error: '2FA is not configured for this account.' };
  }

  const { verifyTotpCode } = await import('./totp');
  if (!(await verifyTotpCode(code, user.totp_secret))) {
    return { error: 'Invalid code. Please check your authenticator app and try again.' };
  }

  await unstable_update({ twoFactorPending: false });
  redirect('/dashboard');
}
