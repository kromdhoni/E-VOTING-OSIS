import { supabase } from './supabase.js';
import { deviceFingerprint } from './utils.js';

const attempts={};
export function checkRateLimit(ip) {
  const now=Date.now(); attempts[ip]=attempts[ip]?.filter(t=>now-t<60000)||[];
  if (attempts[ip].length>=5) return false;
  attempts[ip].push(now); return true;
}

export async function loginVoter(nis, token) {
  if (!checkRateLimit('client')) return { ok:false, msg:'Terlalu banyak percobaan, tunggu 1 menit' };
  // Fetch voter
  const { data, error } = await supabase.from('voters').select('nis,token_hash,has_voted').eq('nis', nis).single();
  if (error || !data) return { ok:false, msg:'NIS tidak ditemukan' };
  if (data.has_voted) return { ok:false, msg:'Anda sudah memilih. Tidak bisa vote lagi.' };
  // Check is_open
  const { data: cfg } = await supabase.from('election_config').select('is_open').eq('id',1).single();
  if (!cfg?.is_open) return { ok:false, msg:'Voting belum dibuka panitia' };
  // Token check: skip if empty (onsite voting monitored by OSIS)
  if (token && data.token_hash !== token) return { ok:false, msg:'Token salah' };
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('voter_nis', nis);
    sessionStorage.setItem('voter_fp', deviceFingerprint());
  }
  // Audit
  await supabase.from('audit_log').insert({ action:'login_success', voter_nis: nis, meta:{ fp: deviceFingerprint() } });
  // Auto-logout 2 menit (device bergantian)
  setTimeout(()=>logout(), 2*60*1000);
  return { ok:true };
}
export async function checkHasVoted(nis) {
  const { data } = await supabase.from('voters').select('has_voted').eq('nis', nis).single();
  return !!data?.has_voted;
}
export function logout() {
  if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
  if (typeof location !== 'undefined') location.href = 'index.html';
}
export function requireLogin() {
  if (typeof sessionStorage === 'undefined') return;
  if (!sessionStorage.getItem('voter_nis') && typeof location !== 'undefined') location.href = 'index.html';
}
// Wire form (guard for non-browser env like vitest)
if (typeof document !== 'undefined') {
  document.getElementById('login-form')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const nis = document.getElementById('nis').value.trim();
    const token = document.getElementById('token').value.trim();
    const res = await loginVoter(nis, token);
    const err = document.getElementById('error');
    if (!res.ok) { err.textContent=res.msg; err.classList.remove('hidden'); }
    else { location.href = 'vote.html'; }
  });
}
