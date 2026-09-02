import { supabase } from './supabase.js';
import { parseCSV, generateToken } from './utils.js';

const ADMIN_PASSWORD = 'SMK14ADMIN';

export async function importVoters(csvText) {
  const rows = parseCSV(csvText);
  const payload = rows.map(r=>({ nis:r.nis, nama:r.nama, kelas:r.kelas, token_hash: generateToken() }));
  const { error } = await supabase.from('voters').insert(payload);
  if (error) throw error;
  return { count: payload.length, tokens: payload };
}
export async function toggleElection(isOpen) {
  const { error } = await supabase.from('election_config').update({ is_open:isOpen }).eq('id',1);
  if (error) throw error;
  return { isOpen };
}
export async function getParticipation() {
  const { data } = await supabase.from('voters').select('kelas, has_voted');
  const safe = data || [];
  const total=safe.length, voted=safe.filter(v=>v.has_voted).length;
  const perKelas={}; safe.forEach(v=>{ perKelas[v.kelas]=perKelas[v.kelas]||{total:0,voted:0}; perKelas[v.kelas].total++; if(v.has_voted) perKelas[v.kelas].voted++; });
  return { total, voted, perKelas };
}
// Wire UI
if (typeof document !== 'undefined') {
  document.getElementById('admin-login')?.addEventListener('click', ()=>{
    const pass = document.getElementById('admin-pass').value;
    if (pass === ADMIN_PASSWORD) {
      document.getElementById('login-admin').classList.add('hidden');
      document.getElementById('panel').classList.remove('hidden');
      refresh();
    } else {
      alert('Password salah!');
    }
  });
  async function refresh() {
    const { data:cfg }=await supabase.from('election_config').select('is_open').eq('id',1).single();
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = cfg?.is_open?'🟢 BUKA':'🔴 TUTUP';
    const part=await getParticipation(); const partEl=document.getElementById('participation');
    if (partEl) partEl.innerHTML=`Total: ${part.voted}/${part.total} (${Math.round(part.voted/part.total*100||0)}%)`+Object.entries(part.perKelas).map(([k,v])=>`<div>${k}: ${v.voted}/${v.total}</div>`).join('');
  }
  document.getElementById('btn-open')?.addEventListener('click', async ()=>{
    await toggleElection(true);
    await refresh();
  });
  document.getElementById('btn-close')?.addEventListener('click', async ()=>{
    await toggleElection(false);
    await refresh();
  });
  document.getElementById('csv-file')?.addEventListener('change', async e=>{
    try {
      const text=await e.target.files[0].text();
      const res=await importVoters(text);
      alert(`Import ${res.count} voters`);
      const blob=new Blob([res.tokens.map(t=>`${t.nis},${t.token_hash}`).join('\n')],{type:'text/csv'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tokens.csv'; a.click();
      refresh();
    } catch(err) { alert('Error: '+err.message); }
  });
  document.getElementById('cand-form')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const payload=Object.fromEntries(fd);
    payload.nomor_urut=Number(payload.nomor_urut);
    const {error}=await supabase.from('candidates').insert(payload);
    if(error) alert('Error: '+error.message);
    else { alert('Kandidat disimpan'); e.target.reset(); }
  });
  document.getElementById('show-results')?.addEventListener('click', async ()=>{
    try {
      const { getResults, exportPDF } = await import('./results.js');
      const res = await getResults();
      document.getElementById('results').innerHTML = res.map(r=>`
        <div class="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
          <div class="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center font-bold text-brand-700">0${r.nomor}</div>
          <div class="flex-1">
            <div class="font-semibold text-sm">${r.nama}</div>
            <div class="text-xs text-slate-400">${r.count} suara (${r.percent}%)</div>
          </div>
          <div class="h-3 bg-slate-200 rounded-full flex-1 max-w-[200px] overflow-hidden">
            <div class="h-full bg-brand-500 rounded-full" style="width:${r.percent}%"></div>
          </div>
        </div>
      `).join('');
      const blob=await exportPDF(res);
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      a.download='hasil-osis.pdf';
      a.textContent='Download PDF';
      a.className='btn-primary inline-block mt-4 text-sm';
      document.getElementById('results').appendChild(a);
    } catch(e){ alert(e.message); }
  });
}
