import { supabase } from './supabase.js';
import { parseCSV, generateToken } from './utils.js';

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
// Wire UI (simplified) - guard for vitest / non-browser env
if (typeof document !== 'undefined') {
  document.getElementById('admin-login')?.addEventListener('click', async ()=>{
    const email=document.getElementById('admin-email').value, pass=document.getElementById('admin-pass').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) alert(error.message); else { document.getElementById('login-admin').classList.add('hidden'); document.getElementById('panel').classList.remove('hidden'); refresh(); }
  });
  async function refresh() {
    const { data:cfg }=await supabase.from('election_config').select('is_open').eq('id',1).single();
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = cfg?.is_open?'🟢 BUKA':'🔴 TUTUP';
    const part=await getParticipation(); const partEl=document.getElementById('participation');
    if (partEl) partEl.innerHTML=`Total: ${part.voted}/${part.total} (${Math.round(part.voted/part.total*100||0)}%)`+Object.entries(part.perKelas).map(([k,v])=>`<div>${k}: ${v.voted}/${v.total}</div>`).join('');
  }
  document.getElementById('btn-open')?.addEventListener('click', ()=>toggleElection(true).then(refresh));
  document.getElementById('btn-close')?.addEventListener('click', ()=>toggleElection(false).then(refresh));
  document.getElementById('csv-file')?.addEventListener('change', async e=>{
    const text=await e.target.files[0].text(); const res=await importVoters(text); alert(`Import ${res.count} voters`);
    // Offer download token PDF (simple)
    const blob=new Blob([res.tokens.map(t=>`${t.nis},${t.token_hash}`).join('\n')],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tokens.csv'; a.click();
    refresh();
  });
  document.getElementById('cand-form')?.addEventListener('submit', async e=>{
    e.preventDefault(); const fd=new FormData(e.target); const payload=Object.fromEntries(fd); payload.nomor_urut=Number(payload.nomor_urut);
    await supabase.from('candidates').insert(payload); alert('Kandidat disimpan'); e.target.reset();
  });
  document.getElementById('show-results')?.addEventListener('click', async ()=>{
    try {
      const { getResults, exportPDF } = await import('./results.js');
      const res = await getResults();
      document.getElementById('results').innerHTML = res.map(r=>`<div>Paslon 0${r.nomor} - ${r.nama}: <b>${r.count}</b> (${r.percent}%)</div>`).join('');
      const chart=document.getElementById('chart'); chart.classList.remove('hidden');
      const blob=await exportPDF(res); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='hasil-osis.pdf'; a.textContent='Download PDF'; document.getElementById('results').appendChild(a);
    } catch(e){ alert(e.message); }
  });
}
