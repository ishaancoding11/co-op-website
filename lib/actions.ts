'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { sendEmail, emailShell } from './email';
import type { CreativeCategory } from './types';

async function db() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user, cookieStore };
}

async function emailUser(supabase: Awaited<ReturnType<typeof db>>['supabase'], userId: string, subject: string, title: string, body: string, href?: string) {
  const { data } = await supabase.from('users').select('email').eq('id', userId).maybeSingle();
  if (data?.email && !data.email.endsWith('.local') && !data.email.endsWith('.demo')) {
    await sendEmail(data.email, subject, emailShell(title, body, href));
  }
}

export async function setRole(role: 'creative' | 'business') {
  const cookieStore = await cookies();
  cookieStore.set('coop_role', role, { path: '/', maxAge: 60 * 60 * 24 * 365 });
}

export async function chooseRole(role: 'creative' | 'business') {
  const { user, supabase } = await db();
  if (!user) { await setRole(role); redirect(`/login?role=${role}`); }
  const [{ data: creative }, { data: business }] = await Promise.all([
    supabase.from('creative_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
    supabase.from('business_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
  ]);
  // Roles are locked at signup — an existing profile decides the account's side for good.
  if (creative) { await setRole('creative'); redirect('/jobs'); }
  if (business) { await setRole('business'); redirect('/browse'); }
  await setRole(role);
  redirect(`/onboarding/${role}`);
}

// ===== Profiles =====
async function uploadProfilePhoto(supabase: Awaited<ReturnType<typeof db>>['supabase'], userId: string, file: File | null): Promise<string | undefined> {
  if (!file || file.size === 0) return undefined;
  const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

export async function saveCreativeProfile(formData: FormData) {
  const { supabase, user } = await db();
  if (!user) redirect('/login?role=creative');
  const categories = formData.getAll('categories') as CreativeCategory[];
  const avatarUrl = await uploadProfilePhoto(supabase, user.id, formData.get('avatar') as File | null);
  const row: Record<string, unknown> = {
    user_id: user.id,
    ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    bio: (formData.get('bio') as string) || null,
    neighborhood: (formData.get('neighborhood') as string) || null,
    categories,
    rate_min: formData.get('rate_min') ? Number(formData.get('rate_min')) : null,
    rate_max: formData.get('rate_max') ? Number(formData.get('rate_max')) : null,
    availability: (formData.get('availability') as string) || null,
    available_days: formData.getAll('available_days') as string[],
    latitude: formData.get('latitude') ? Number(formData.get('latitude')) : null,
    longitude: formData.get('longitude') ? Number(formData.get('longitude')) : null,
    is_public: formData.get('is_public') !== 'false',
  };
  let { error } = await supabase.from('creative_profiles').upsert(row);
  if (error?.code === 'PGRST204') {
    // A newer column's migration hasn't been applied yet — save everything else
    delete row.available_days; delete row.latitude; delete row.longitude;
    ({ error } = await supabase.from('creative_profiles').upsert(row));
  }
  if (error) throw new Error(error.message);
  if (categories.includes('musician')) {
    const venues = ((formData.get('venues') as string) || '').split('\n').map(s => s.trim()).filter(Boolean).map(name => ({ name }));
    const audio = ((formData.get('audio_links') as string) || '').split('\n').map(s => s.trim()).filter(Boolean);
    const video = ((formData.get('video_links') as string) || '').split('\n').map(s => s.trim()).filter(Boolean);
    await supabase.from('musician_details').upsert({ creative_id: user.id, venues, audio_links: audio, video_links: video });
  }
  await setRole('creative');
  redirect('/jobs');
}

export async function saveBusinessProfile(formData: FormData) {
  const { supabase, user } = await db();
  if (!user) redirect('/login?role=business');
  const budgetMin = formData.get('budget_min') ? Number(formData.get('budget_min')) : null;
  const budgetMax = formData.get('budget_max') ? Number(formData.get('budget_max')) : null;
  // Derive the legacy $/$$/$$$ band from the numeric range for older display spots.
  const budgetBand = budgetMax == null ? null : budgetMax <= 250 ? '$' : budgetMax <= 1000 ? '$$' : '$$$';
  const logoUrl = await uploadProfilePhoto(supabase, user.id, formData.get('logo') as File | null);
  const row: Record<string, unknown> = {
    user_id: user.id,
    ...(logoUrl ? { logo_url: logoUrl } : {}),
    business_name: (formData.get('business_name') as string) || 'My business',
    category: (formData.get('category') as string) || null,
    neighborhood: (formData.get('neighborhood') as string) || null,
    needs_description: (formData.get('needs_description') as string) || null,
    budget_min: budgetMin, budget_max: budgetMax, budget_band: budgetBand,
    latitude: formData.get('latitude') ? Number(formData.get('latitude')) : null,
    longitude: formData.get('longitude') ? Number(formData.get('longitude')) : null,
    brand_vibe_tags: ((formData.get('brand_vibe_tags') as string) || '').split(',').map(s => s.trim()).filter(Boolean),
  };
  let { error } = await supabase.from('business_profiles').upsert(row);
  if (error?.code === 'PGRST204') {
    // A newer column's migration hasn't been applied yet — fall back to base columns
    delete row.budget_min; delete row.budget_max; delete row.needs_description;
    delete row.latitude; delete row.longitude;
    ({ error } = await supabase.from('business_profiles').upsert(row));
  }
  if (error) throw new Error(error.message);
  await setRole('business');
  const { data: current } = await supabase.from('business_profiles').select('is_verified').eq('user_id', user.id).maybeSingle();
  redirect(current?.is_verified ? `/business/${user.id}` : '/onboarding/business/verify');
}

export async function startVerification(prev: unknown, formData: FormData): Promise<{ error?: string; sent?: boolean }> {
  const { supabase, user } = await db();
  if (!user) return { error: 'Not signed in.' };
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  if (!email?.includes('@')) return { error: 'Enter a valid email.' };
  const { data: token, error } = await supabase.rpc('start_business_verification', { p_email: email });
  if (error) {
    if (error.message.includes('freemail')) return { error: 'Please use your business email — free providers like Gmail or Yahoo aren’t accepted for verification.' };
    return { error: 'Could not start verification: ' + error.message };
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  await sendEmail(email, 'Verify your business on Co-op',
    emailShell('Verify your business', 'Click below to confirm this email belongs to your business. The link expires in 24 hours.', `${site}/verify/${token}`, 'Confirm my business'));
  if (!process.env.RESEND_API_KEY) console.log(`[dev] verification link: ${site}/verify/${token}`);
  return { sent: true };
}

// ===== Jobs =====
export async function postJob(prev: unknown, formData: FormData): Promise<{ error?: string }> {
  const { supabase, user } = await db();
  if (!user) redirect('/login?role=business');
  const { data: job, error } = await supabase.from('jobs').insert({
    business_id: user.id,
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    category: formData.get('category') as CreativeCategory,
    budget_min: formData.get('budget_min') ? Number(formData.get('budget_min')) : null,
    budget_max: formData.get('budget_max') ? Number(formData.get('budget_max')) : null,
    deadline: (formData.get('deadline') as string) || null,
    location: (formData.get('location') as string) || null,
  }).select('id').single();
  if (error) {
    if (error.code === '42501') return { error: 'Your business must be verified before posting jobs.' };
    if (error.message.includes('BUSINESS_QUOTA_EXCEEDED')) {
      return { error: 'You’ve reached your job-post limit. Subscribe or free up a slot to post more.' };
    }
    if (error.message.includes('ACCOUNT_SUSPENDED')) {
      return { error: 'Your account is suspended and can’t post new jobs. Contact support if you think this is a mistake.' };
    }
    return { error: error.message };
  }
  redirect(`/jobs/${job.id}`);
}

export async function setJobStatus(jobId: string, status: 'open' | 'closed') {
  const { supabase } = await db();
  await supabase.from('jobs').update({ status }).eq('id', jobId);
  revalidatePath(`/jobs/${jobId}`);
}

// ===== Matching =====
async function findPairMatch(supabase: Awaited<ReturnType<typeof db>>['supabase'], businessId: string, creativeId: string, jobId: string | null) {
  let q = supabase.from('matches').select('*').eq('business_id', businessId).eq('creative_id', creativeId);
  q = jobId ? q.eq('job_id', jobId) : q.is('job_id', null);
  const { data } = await q.maybeSingle();
  return data;
}

// Business swipes/reaches out on a creative
export async function businessAct(creativeId: string, action: 'liked' | 'passed', source: 'swipe' | 'direct' = 'swipe') {
  const { supabase, user } = await db();
  if (!user) redirect('/login?role=business');
  const existing = await findPairMatch(supabase, user.id, creativeId, null);
  let matched = false;
  if (existing) {
    const { data } = await supabase.from('matches').update({ business_action: action }).eq('id', existing.id).select('is_matched').single();
    matched = !!data?.is_matched && !existing.is_matched;
  } else {
    const { data } = await supabase.from('matches').insert({ business_id: user.id, creative_id: creativeId, source, business_action: action }).select('is_matched').single();
    matched = !!data?.is_matched;
  }
  if (matched) await emailUser(supabase, creativeId, "It's a match on Co-op!", "It's a match!", 'A local business wants to work with you. Open Co-op to say hi.', '/matches');
  revalidatePath('/discover');
  return { matched };
}

// Creative swipes a job right (apply) or left (pass), or likes a business directly
export async function applyToJob(prev: unknown, formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, user } = await db();
  if (!user) redirect('/login?role=creative');
  const jobId = formData.get('job_id') as string;
  const businessId = formData.get('business_id') as string;
  const pitch = (formData.get('pitch') as string) || null; // optional short note
  const portfolioIds = formData.getAll('portfolio_ids') as string[];
  const existing = await findPairMatch(supabase, businessId, user.id, jobId);
  if (existing) {
    const { error } = await supabase.from('matches').update({
      creative_action: 'liked', pitch: pitch ?? existing.pitch,
      pitch_portfolio_ids: portfolioIds.length ? portfolioIds : existing.pitch_portfolio_ids,
    }).eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('matches').insert({
      business_id: businessId, creative_id: user.id, job_id: jobId,
      source: 'job_apply', pitch, pitch_portfolio_ids: portfolioIds,
      creative_action: 'liked', application_status: 'applied',
    });
    if (error) return { error: error.message };
    await emailUser(supabase, businessId, 'New application on Co-op', 'New application', 'A creative applied to your job. Compare applicants on Co-op.', `/jobs/${jobId}/applicants`);
  }
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

export async function creativePassJob(jobId: string, businessId: string) {
  const { supabase, user } = await db();
  if (!user) redirect('/login?role=creative');
  const existing = await findPairMatch(supabase, businessId, user.id, jobId);
  if (existing) await supabase.from('matches').update({ creative_action: 'passed' }).eq('id', existing.id);
  else await supabase.from('matches').insert({ business_id: businessId, creative_id: user.id, job_id: jobId, source: 'swipe', creative_action: 'passed' });
  revalidatePath('/jobs');
}

export async function creativeLikeBusiness(businessId: string) {
  const { supabase, user } = await db();
  if (!user) redirect('/login?role=creative');
  const existing = await findPairMatch(supabase, businessId, user.id, null);
  let matched = false;
  if (existing) {
    const { data } = await supabase.from('matches').update({ creative_action: 'liked' }).eq('id', existing.id).select('is_matched').single();
    matched = !!data?.is_matched && !existing.is_matched;
  } else {
    await supabase.from('matches').insert({ business_id: businessId, creative_id: user.id, source: 'direct', creative_action: 'liked' });
  }
  if (matched) await emailUser(supabase, businessId, "It's a match on Co-op!", "It's a match!", 'A creative you liked wants to work with you too.', '/matches');
  revalidatePath('/matches');
}

export async function setApplicationStatus(matchId: string, status: 'shortlisted' | 'accepted' | 'declined') {
  const { supabase, user } = await db();
  if (!user) return;
  const { data } = await supabase.from('matches').update({ application_status: status }).eq('id', matchId).select('creative_id, job_id').single();
  if (status === 'accepted' && data) {
    await emailUser(supabase, data.creative_id, 'Your application was accepted!', 'Application accepted', 'The business accepted your application — you can now message each other.', '/matches');
  }
  if (data?.job_id) revalidatePath(`/jobs/${data.job_id}/applicants`);
}

// ===== Messaging =====
export async function sendMessage(matchId: string, body: string) {
  const { supabase, user } = await db();
  if (!user || !body.trim()) return { error: 'empty' };
  const { error } = await supabase.from('messages').insert({ match_id: matchId, sender_id: user.id, body: body.trim() });
  if (error) {
    if (error.message.includes('ACCOUNT_SUSPENDED')) {
      return { error: 'Your account is suspended and can’t send new messages.' };
    }
    return { error: error.message };
  }
  const { data: m } = await supabase.from('matches').select('business_id, creative_id').eq('id', matchId).single();
  if (m) {
    const recipient = m.business_id === user.id ? m.creative_id : m.business_id;
    await emailUser(supabase, recipient, 'New message on Co-op', 'New message', 'You have a new message waiting on Co-op.', `/messages/${matchId}`);
  }
  return { ok: true };
}

// ===== Agreements =====
export async function createAgreement(prev: unknown, formData: FormData): Promise<{ error?: string }> {
  const { supabase, user } = await db();
  if (!user) redirect('/login');
  const matchId = formData.get('match_id') as string;
  const { data: m } = await supabase.from('matches').select('*').eq('id', matchId).single();
  if (!m) return { error: 'Match not found' };
  const { data, error } = await supabase.from('agreements').insert({
    match_id: matchId, business_id: m.business_id, creative_id: m.creative_id, job_id: m.job_id,
    package_id: (formData.get('package_id') as string) || null,
    scope: (formData.get('scope') as string) || null,
    agreed_price: formData.get('agreed_price') ? Number(formData.get('agreed_price')) : null,
  }).select('id').single();
  if (error) {
    if (error.message.includes('CREATIVE_QUOTA_EXCEEDED')) {
      return { error: 'You’ve reached your monthly limit for accepted jobs. Subscribe to take on more.' };
    }
    if (error.message.includes('ACCOUNT_SUSPENDED')) {
      return { error: 'One of the accounts on this agreement is suspended, so it can’t be created. Contact support if you think this is a mistake.' };
    }
    return { error: error.message };
  }
  redirect(`/agreements/${data.id}`);
}

export async function updateAgreementStatus(id: string, status: 'accepted' | 'in_progress' | 'cancelled') {
  const { supabase } = await db();
  await supabase.from('agreements').update({ status }).eq('id', id);
  revalidatePath(`/agreements/${id}`);
}

export async function markComplete(id: string) {
  const { supabase, user } = await db();
  if (!user) return;
  const { data: a } = await supabase.from('agreements').select('*').eq('id', id).single();
  if (!a) return;
  const patch = a.business_id === user.id
    ? { completed_by_business_at: new Date().toISOString() }
    : { completed_by_creative_at: new Date().toISOString() };
  await supabase.from('agreements').update(patch).eq('id', id);
  const { data: after } = await supabase.from('agreements').select('status').eq('id', id).single();
  if (after?.status === 'completed') {
    await emailUser(supabase, a.business_id, 'How did it go?', 'Leave a review', 'Your project is complete — leave a review for your creative.', `/agreements/${id}`);
    await emailUser(supabase, a.creative_id, 'How did it go?', 'Leave a review', 'Your project is complete — leave a review for the business.', `/agreements/${id}`);
  }
  revalidatePath(`/agreements/${id}`);
}

export async function submitReview(prev: unknown, formData: FormData): Promise<{ error?: string }> {
  const { supabase, user } = await db();
  if (!user) redirect('/login');
  const { error } = await supabase.from('reviews').insert({
    agreement_id: formData.get('agreement_id') as string,
    reviewer_id: user.id,
    reviewee_id: formData.get('reviewee_id') as string,
    stars: Number(formData.get('stars')),
    body: (formData.get('body') as string) || null,
  });
  if (error) return { error: error.code === '23505' ? 'You already reviewed this project.' : error.message };
  revalidatePath(`/agreements/${formData.get('agreement_id')}`);
  return {};
}

// ===== Portfolio =====
export async function setPortfolioHidden(id: string, hidden: boolean) {
  const { supabase } = await db();
  await supabase.from('portfolio_items').update({ is_hidden: hidden }).eq('id', id);
  revalidatePath('/portfolio');
}
export async function setPortfolioFavorite(id: string, favorite: boolean) {
  const { supabase } = await db();
  await supabase.from('portfolio_items').update({ is_favorite: favorite }).eq('id', id);
  revalidatePath('/portfolio');
}
export async function deletePortfolioItem(id: string) {
  const { supabase } = await db();
  await supabase.from('portfolio_items').delete().eq('id', id);
  revalidatePath('/portfolio');
}
export async function addPortfolioItem(formData: FormData) {
  const { supabase, user } = await db();
  if (!user) redirect('/login?role=creative');
  const file = formData.get('file') as File | null;
  let media_url: string | null = null;
  let media_type: 'image' | 'video' | 'audio' | 'link' = 'link';
  if (file && file.size > 0) {
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
    const { error } = await supabase.storage.from('portfolio').upload(path, file);
    if (error) throw new Error(error.message);
    media_url = supabase.storage.from('portfolio').getPublicUrl(path).data.publicUrl;
    media_type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image';
  } else if (formData.get('url')) {
    media_url = formData.get('url') as string;
  }
  await supabase.from('portfolio_items').insert({ creative_id: user.id, media_url, media_type, caption: (formData.get('caption') as string) || null });
  revalidatePath('/portfolio');
}

// ===== Favorites, notifications, T&S =====
export async function toggleFavorite(target: 'creative' | 'job', id: string, path: string) {
  const { supabase, user } = await db();
  if (!user) redirect('/login');
  const col = target === 'creative' ? 'saved_creative_id' : 'saved_job_id';
  const { data } = await supabase.from('favorites').select('id').eq('user_id', user.id).eq(col, id).maybeSingle();
  if (data) await supabase.from('favorites').delete().eq('id', data.id);
  else await supabase.from('favorites').insert({ user_id: user.id, [col]: id });
  revalidatePath(path);
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await db();
  if (!user) return;
  await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
  revalidatePath('/notifications');
}

export async function reportUser(prev: unknown, formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const { supabase, user } = await db();
  if (!user) redirect('/login');
  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    reported_user_id: formData.get('reported_user_id') as string,
    reason: formData.get('reason') as string,
    details: (formData.get('details') as string) || null,
  });
  return error ? { error: error.message } : { ok: true };
}

export async function blockUser(blockedUserId: string, path: string) {
  const { supabase, user } = await db();
  if (!user) redirect('/login');
  await supabase.from('blocked_users').insert({ user_id: user.id, blocked_user_id: blockedUserId });
  revalidatePath(path);
}

export async function signOut() {
  const { supabase } = await db();
  await supabase.auth.signOut();
  redirect('/');
}

export async function deleteAccount(prev: unknown, formData: FormData): Promise<{ error?: string }> {
  const { supabase, user } = await db();
  if (!user) redirect('/login');
  if ((formData.get('confirmation') as string)?.trim().toUpperCase() !== 'DELETE') {
    return { error: 'Type DELETE to confirm.' };
  }
  const { error } = await supabase.rpc('delete_account');
  if (error) return { error: 'Could not delete account: ' + error.message };
  await supabase.auth.signOut();
  redirect('/');
}
