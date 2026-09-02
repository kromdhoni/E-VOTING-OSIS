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
    try {
      const { data:cfg, error } = await supabase.from('election_config').select('is_open').eq('id',1).single();
      const statusEl = document.getElementById('status');
      const timeEl = document.getElementById('status-time');
      const btnOpen = document.getElementById('btn-open');
      const btnClose = document.getElementById('btn-close');
      const isOpen = error ? true : !!cfg?.is_open;
      if (error) { console.error('Refresh error:', error); }
      if (statusEl) {
        statusEl.textContent = isOpen ? '🟢 BUKA' : '🔴 TUTUP';
        statusEl.className = isOpen
          ? 'text-3xl font-extrabold mt-1 text-emerald-600'
          : 'text-3xl font-extrabold mt-1 text-red-500';
      }
      if (btnOpen) {
        btnOpen.className = isOpen
          ? 'bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md hover:shadow-glow active:scale-[0.98] flex items-center gap-2 cursor-default opacity-100'
          : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold text-sm px-6 py-3 rounded-xl transition-all duration-200 hover:shadow-md active:scale-[0.98] flex items-center gap-2';
        btnOpen.disabled = isOpen;
      }
      if (btnClose) {
        btnClose.className = isOpen
          ? 'bg-red-100 hover:bg-red-200 text-red-700 font-bold text-sm px-6 py-3 rounded-xl transition-all duration-200 hover:shadow-md active:scale-[0.98] flex items-center gap-2'
          : 'bg-red-500 hover:bg-red-600 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] flex items-center gap-2 cursor-default opacity-100';
        btnClose.disabled = !isOpen;
      }
      if (timeEl) timeEl.textContent = 'Terakhir diubah: ' + new Date().toLocaleTimeString('id-ID');
      const part = await getParticipation();
      const partEl = document.getElementById('participation');
      if (partEl) {
        const pct = part.total ? Math.round(part.voted/part.total*100) : 0;
        partEl.innerHTML = `
          <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl mb-2">
            <span class="text-sm font-medium text-slate-600">Total Pemilih</span>
            <span class="font-bold text-slate-800">${part.voted} / ${part.total} (${pct}%)</span>
          </div>
          <div class="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div class="bg-brand-500 h-full rounded-full transition-all duration-500" style="width:${pct}%"></div>
          </div>
          <div class="mt-3 space-y-1">
            ${Object.entries(part.perKelas).map(([k,v])=>`
              <div class="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-slate-50">
                <span class="font-medium text-slate-600">${k}</span>
                <span class="text-slate-400">${v.voted}/${v.total}</span>
              </div>
            `).join('')}
          </div>
        `;
      }
    } catch(e) { console.error('Refresh failed:', e); }
  }
  document.getElementById('btn-open')?.addEventListener('click', async ()=>{
    const { error } = await supabase.from('election_config').update({ is_open:true, start_at: new Date().toISOString() }).eq('id',1);
    if (error) { alert('Gagal buka: '+error.message); return; }
    await refresh();
  });
  document.getElementById('btn-close')?.addEventListener('click', async ()=>{
    const { error } = await supabase.from('election_config').update({ is_open:false, end_at: new Date().toISOString() }).eq('id',1);
    if (error) { alert('Gagal tutup: '+error.message); return; }
    await refresh();
  });
  document.getElementById('btn-logout')?.addEventListener('click', ()=>{
    document.getElementById('panel').classList.add('hidden');
    document.getElementById('login-admin').classList.remove('hidden');
    document.getElementById('admin-pass').value = '';
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
  let selectedPhoto = null;
  const photoInput = document.getElementById('cand-photo');
  const photoPreview = document.getElementById('cand-photo-preview');
  const photoImg = document.getElementById('cand-photo-img');
  const photoRemove = document.getElementById('cand-photo-remove');

  photoInput?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2*1024*1024) { alert('Ukuran foto maks 2MB'); return; }
    selectedPhoto = file;
    photoImg.src = URL.createObjectURL(file);
    photoPreview.classList.remove('hidden');
  });

  photoRemove?.addEventListener('click', () => {
    selectedPhoto = null;
    photoInput.value = '';
    photoPreview.classList.add('hidden');
  });

  document.getElementById('cand-form')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    let fotoUrl = null;
    if (selectedPhoto) {
      const ext = selectedPhoto.name.split('.').pop();
      const fileName = `paslon_${fd.get('nomor_urut')}_${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('candidate-photos').upload(fileName, selectedPhoto);
      if (uploadErr) { alert('Gagal upload foto: '+uploadErr.message); return; }
      const { data: urlData } = supabase.storage.from('candidate-photos').getPublicUrl(fileName);
      fotoUrl = urlData.publicUrl;
    }
    const payload = {
      nomor_urut: Number(fd.get('nomor_urut')),
      nama_ketua: fd.get('nama_ketua'),
      nama_wakil: fd.get('nama_wakil'),
      visi: fd.get('visi'),
      foto_url: fotoUrl,
    };
    const {error}=await supabase.from('candidates').insert(payload);
    if(error) alert('Error: '+error.message);
    else {
      alert('Kandidat disimpan');
      e.target.reset();
      selectedPhoto = null;
      photoPreview.classList.add('hidden');
    }
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
