import { supabase } from './supabase.js';
import { parseCSV, generateToken } from './utils.js';

const ADMIN_PASSWORD = 'SMK14ADMIN';
let chartParticipation = null;
let chartVotes = null;
let refreshInterval = null;

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
  const { data } = await supabase.from('voters').select('kelas, has_voted, nama, nis');
  const safe = data || [];
  const total=safe.length, voted=safe.filter(v=>v.has_voted).length;
  const perKelas={}; safe.forEach(v=>{ perKelas[v.kelas]=perKelas[v.kelas]||{total:0,voted:0}; perKelas[v.kelas].total++; if(v.has_voted) perKelas[v.kelas].voted++; });
  return { total, voted, perKelas, voters: safe };
}
export async function getLiveVoteCount() {
  const { data: votes } = await supabase.from('votes').select('candidate_id');
  const { data: cands } = await supabase.from('candidates').select('id, nomor_urut, nama_ketua, nama_wakil');
  const safeVotes = votes || [];
  const safeCands = cands || [];
  const counts = {};
  safeVotes.forEach(v => { counts[v.candidate_id] = (counts[v.candidate_id] || 0) + 1; });
  return safeCands.map(c => ({
    id: c.id,
    nomor: c.nomor_urut,
    nama: `${c.nama_ketua} & ${c.nama_wakil}`,
    count: counts[c.id] || 0,
  }));
}

// Wire UI
if (typeof document !== 'undefined') {
  document.getElementById('admin-login')?.addEventListener('click', ()=>{
    const pass = document.getElementById('admin-pass').value;
    if (pass === ADMIN_PASSWORD) {
      document.getElementById('login-admin').classList.add('hidden');
      document.getElementById('panel').classList.remove('hidden');
      refresh();
      refreshInterval = setInterval(refresh, 5000);
    } else {
      alert('Password salah!');
    }
  });

  let editMode = false;
  async function refresh() {
    try {
      const scrollY = window.scrollY;
      const { data:cfg, error } = await supabase.from('election_config').select('is_open').eq('id',1).single();
      const statusEl = document.getElementById('status');
      const timeEl = document.getElementById('status-time');
      const btnOpen = document.getElementById('btn-open');
      const btnClose = document.getElementById('btn-close');
      const isOpen = error ? true : !!cfg?.is_open;
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
      const liveVotes = await getLiveVoteCount();

      // Live count cards
      const remaining = part.total - part.voted;
      const pct = part.total ? Math.round(part.voted/part.total*100) : 0;
      document.getElementById('live-total').textContent = part.total;
      document.getElementById('live-voted').textContent = part.voted;
      document.getElementById('live-remaining').textContent = remaining;
      document.getElementById('live-pct').textContent = pct + '%';

      // Participation detail
      const partEl = document.getElementById('participation');
      if (partEl) {
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

      // Voter list (who voted / who didn't)
      const voterTable = document.getElementById('voter-table');
      if (voterTable && part.voters) {
        const sorted = [...part.voters].sort((a,b) => a.nama.localeCompare(b.nama));
        voterTable.innerHTML = `<table class="w-full"><thead><tr class="border-b border-slate-100"><th class="text-left py-1 px-2 font-semibold text-slate-500">NIS</th><th class="text-left py-1 px-2 font-semibold text-slate-500">Nama</th><th class="text-left py-1 px-2 font-semibold text-slate-500">Kelas</th><th class="text-center py-1 px-2 font-semibold text-slate-500">Status</th></tr></thead><tbody>${sorted.map(v=>`<tr class="border-b border-slate-50"><td class="py-1 px-2 font-mono">${v.nis}</td><td class="py-1 px-2">${v.nama}</td><td class="py-1 px-2">${v.kelas}</td><td class="py-1 px-2 text-center">${v.has_voted ? '<span class="text-emerald-600 font-semibold">✓</span>' : '<span class="text-slate-300">—</span>'}</td></tr>`).join('')}</tbody></table>`;
      }

      // Charts
      updateParticipationChart(part.perKelas);
      updateVotesChart(liveVotes);

      // Candidate list
      await loadCandidateList();
      if (!editMode) window.scrollTo(0, scrollY);
    } catch(e) { console.error('Refresh failed:', e); }
  }

  function updateParticipationChart(perKelas) {
    const ctx = document.getElementById('chart-participation');
    if (!ctx) return;
    const labels = Object.keys(perKelas);
    const votedData = labels.map(k => perKelas[k].voted);
    const remainData = labels.map(k => perKelas[k].total - perKelas[k].voted);
    if (chartParticipation) {
      chartParticipation.data.labels = labels;
      chartParticipation.data.datasets[0].data = votedData;
      chartParticipation.data.datasets[1].data = remainData;
      chartParticipation.update('none');
    } else {
      chartParticipation = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Sudah Memilih', data: votedData, backgroundColor: '#10b981', borderRadius: 6 },
            { label: 'Belum Memilih', data: remainData, backgroundColor: '#e2e8f0', borderRadius: 6 },
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } } },
          scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
    }
  }

  function updateVotesChart(liveVotes) {
    const ctx = document.getElementById('chart-votes');
    if (!ctx) return;
    const labels = liveVotes.map(v => `Paslon 0${v.nomor}`);
    const data = liveVotes.map(v => v.count);
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    if (chartVotes) {
      chartVotes.data.labels = labels;
      chartVotes.data.datasets[0].data = data;
      chartVotes.update('none');
    } else {
      chartVotes = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{ data, backgroundColor: colors.slice(0, data.length), borderWidth: 0, hoverOffset: 8 }]
        },
        options: {
          responsive: true,
          cutout: '55%',
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16 } } }
        }
      });
    }
  }

  async function loadCandidateList() {
    const { data: cands } = await supabase.from('candidates').select('*').order('nomor_urut');
    const list = document.getElementById('cand-list');
    if (!list || !cands) return;
    const scrollPos = list.scrollTop;
    list.innerHTML = cands.map(c => `
      <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-xl group">
        <img src="${c.foto_url || '/src/assets/placeholder.webp'}" class="w-12 h-12 rounded-lg object-cover border border-slate-100"/>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-sm text-slate-800">0${c.nomor_urut} — ${c.nama_ketua} & ${c.nama_wakil}</div>
          <div class="text-xs text-slate-400 truncate">${c.visi || '-'}</div>
        </div>
        <button data-edit='${JSON.stringify({id:c.id,nomor_urut:c.nomor_urut,nama_ketua:c.nama_ketua,nama_wakil:c.nama_wakil,visi:c.visi||'',foto_url:c.foto_url||''})}' class="cand-edit text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-200 transition-colors">Edit</button>
        <button data-delete="${c.id}" class="cand-delete text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-200 transition-colors">Hapus</button>
      </div>
    `).join('');
    list.scrollTop = scrollPos;
  }

  document.getElementById('cand-list')?.addEventListener('click', async e => {
    const editBtn = e.target.closest('.cand-edit');
    const deleteBtn = e.target.closest('.cand-delete');
    if (editBtn) {
      editMode = true;
      const c = JSON.parse(editBtn.dataset.edit);
      document.getElementById('cand-edit-id').value = c.id;
      document.querySelector('#cand-form [name="nomor_urut"]').value = c.nomor_urut;
      document.querySelector('#cand-form [name="nama_ketua"]').value = c.nama_ketua;
      document.querySelector('#cand-form [name="nama_wakil"]').value = c.nama_wakil;
      document.querySelector('#cand-form [name="visi"]').value = c.visi;
      if (c.foto_url) {
        document.getElementById('cand-photo-img').src = c.foto_url;
        document.getElementById('cand-photo-preview').classList.remove('hidden');
      }
      document.getElementById('cand-submit-btn').textContent = 'Update Kandidat';
      document.getElementById('cand-cancel-edit').classList.remove('hidden');
    }
    if (deleteBtn) {
      const id = deleteBtn.dataset.delete;
      if (!confirm('Yakin hapus kandidat ini?')) return;
      const { error } = await supabase.from('candidates').delete().eq('id', id);
      if (error) alert('Gagal hapus: ' + error.message);
      else { alert('Kandidat dihapus'); refresh(); }
    }
  });

  document.getElementById('cand-cancel-edit')?.addEventListener('click', () => {
    editMode = false;
    document.getElementById('cand-edit-id').value = '';
    document.getElementById('cand-form').reset();
    document.getElementById('cand-submit-btn').textContent = 'Simpan Kandidat';
    document.getElementById('cand-cancel-edit').classList.add('hidden');
    document.getElementById('cand-photo-preview').classList.add('hidden');
    selectedPhoto = null;
  });

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
    if (refreshInterval) { clearInterval(refreshInterval); refreshInterval = null; }
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
    const editId = document.getElementById('cand-edit-id').value;
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
    };
    if (fotoUrl) payload.foto_url = fotoUrl;

    if (editId) {
      const { error } = await supabase.from('candidates').update(payload).eq('id', editId);
      if (error) alert('Error: '+error.message);
      else { alert('Kandidat diupdate'); document.getElementById('cand-cancel-edit').click(); refresh(); }
    } else {
      const { error } = await supabase.from('candidates').insert(payload);
      if (error) alert('Error: '+error.message);
      else { alert('Kandidat disimpan'); e.target.reset(); selectedPhoto = null; photoPreview.classList.add('hidden'); refresh(); }
    }
    editMode = false;
  });

  document.getElementById('show-results')?.addEventListener('click', async ()=>{
    try {
      const { getResults, formatResultsHTML, exportText } = await import('./results.js');
      const data = await getResults();
      document.getElementById('results').innerHTML = formatResultsHTML(data);
      const text = exportText(data);
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'hasil-osis.txt';
      a.textContent = 'Download Hasil (TXT)';
      a.className = 'btn-primary inline-block mt-4 text-sm';
      document.getElementById('results').appendChild(a);
    } catch(e){ alert(e.message); }
  });
}
