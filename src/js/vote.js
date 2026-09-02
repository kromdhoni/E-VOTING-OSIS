import { supabase } from './supabase.js';
import { deviceFingerprint } from './utils.js';
import { requireLogin } from './auth.js';

if (typeof document !== 'undefined' && document.getElementById('candidates')) {
  try { requireLogin?.(); } catch {}
}

export async function loadCandidates() {
  const query = supabase.from('candidates').select('*');
  // support both real supabase builder (with .order) and mocked select that resolves directly
  let result;
  if (query && typeof query.order === 'function') {
    result = await query.order('nomor_urut');
  } else {
    result = await query;
  }
  const { data, error } = result;
  if (error) throw error;
  return data;
}
export async function castVote(nis, fingerprint, candidateId) {
  const { data, error } = await supabase.rpc('cast_vote', {
    p_nis: nis, p_token: 'verified', p_candidate_id: candidateId, p_fingerprint: fingerprint
  });
  if (error) return { ok:false, msg: error.message };
  return data;
}

// UI rendering
const grid = typeof document !== 'undefined' ? document.getElementById('candidates') : null;
if (grid) {
  const nis = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('voter_nis') : null;
  // Guard: if has_voted, redirect
  supabase.from('voters').select('has_voted').eq('nis', nis).single().then(({data})=>{
    if (data?.has_voted) { document.body.innerHTML='<p class="p-8 text-center">Anda sudah memilih. Terima kasih.</p><a href="index.html" class="block text-center text-blue-600">Logout</a>'; return; }
  });
  loadCandidates().then(cands=>{
    grid.innerHTML = cands.map(c=>`
      <div class="bg-white rounded shadow p-4">
        <img src="${c.foto_url||'/src/assets/placeholder.webp'}" class="w-full h-40 object-cover rounded" loading="lazy"/>
        <div class="text-3xl font-bold text-center mt-2">0${c.nomor_urut}</div>
        <div class="text-center font-semibold">${c.nama_ketua} & ${c.nama_wakil}</div>
        <p class="text-sm text-slate-600 line-clamp-2">${c.visi||''}</p>
        <button data-candidate="${c.id}" class="choose mt-2 bg-blue-600 text-white w-full py-2 rounded">Pilih</button>
      </div>
    `).join('');
    let chosen=null;
    grid.addEventListener('click', e=>{
      if (!e.target.classList.contains('choose')) return;
      chosen = Number(e.target.dataset.candidate);
      document.getElementById('confirm-text').textContent = `Yakin pilih Paslon 0${chosen}?`;
      document.getElementById('confirm').showModal();
    });
    document.getElementById('confirm-yes').addEventListener('click', async ()=>{
      const fp = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('voter_fp')) || deviceFingerprint();
      const res = await castVote(nis, fp, chosen);
      if (!res.ok) { alert(res.msg); return; }
      // Bukti anonim: hash nis+timestamp
      const raw = nis+'|'+Date.now();
      const code = (typeof btoa !== 'undefined' ? btoa(raw) : Buffer.from(raw).toString('base64')).slice(0,12).toUpperCase();
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('thank_code', code);
      location.href = 'thankyou.html';
    });
    document.getElementById('confirm-no').addEventListener('click', ()=>document.getElementById('confirm').close());
  });
  document.getElementById('logout')?.addEventListener('click', ()=>{ if (typeof sessionStorage !== 'undefined') sessionStorage.clear(); location.href='index.html'; });
}
