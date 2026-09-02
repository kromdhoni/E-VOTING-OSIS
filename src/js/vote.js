import { supabase } from './supabase.js';
import { deviceFingerprint } from './utils.js';

const isBrowser = typeof document !== 'undefined';

const stepNis     = isBrowser ? document.getElementById('step-nis') : null;
const stepVoted   = isBrowser ? document.getElementById('step-voted') : null;
const stepCands   = isBrowser ? document.getElementById('step-candidates') : null;
const stepSuccess = isBrowser ? document.getElementById('step-success') : null;
const nisForm     = isBrowser ? document.getElementById('nis-form') : null;
const nisInput    = isBrowser ? document.getElementById('nis-input') : null;
const nisError    = isBrowser ? document.getElementById('nis-error') : null;
const grid        = isBrowser ? document.getElementById('candidates-grid') : null;
const voterInfo   = isBrowser ? document.getElementById('voter-info') : null;
const confirmDlg  = isBrowser ? document.getElementById('confirm') : null;
const confirmTxt  = isBrowser ? document.getElementById('confirm-text') : null;
const confirmYes  = isBrowser ? document.getElementById('confirm-yes') : null;
const confirmNo   = isBrowser ? document.getElementById('confirm-no') : null;

function showStep(el) {
  [stepNis, stepVoted, stepCands, stepSuccess].forEach(s => s?.classList.add('hidden'));
  el?.classList.remove('hidden');
}

async function checkElectionOpen() {
  const { data, error } = await supabase.from('election_config').select('is_open').eq('id', 1).single();
  if (error || !data) return true;
  return !!data.is_open;
}

async function verifyNis(nis) {
  const { data, error } = await supabase.from('voters').select('nis, nama, kelas, has_voted').eq('nis', nis).single();
  if (error || !data) return { ok: false, msg: 'NIS tidak ditemukan' };
  if (data.has_voted) return { ok: false, voted: true, msg: 'Anda sudah memilih' };
  return { ok: true, voter: data };
}

export async function loadCandidates() {
  const { data, error } = await supabase.from('candidates').select('*').order('nomor_urut');
  if (error) throw error;
  return data || [];
}

export async function castVote(nis, candidateId) {
  const fp = deviceFingerprint();
  const { data, error } = await supabase.rpc('cast_vote', {
    p_nis: nis,
    p_token: 'verified',
    p_candidate_id: candidateId,
    p_fingerprint: fp,
  });
  if (error) return { ok: false, msg: error.message };
  return data;
}

async function auditLog(action, nis, meta) {
  await supabase.from('audit_log').insert({ action, voter_nis: nis, meta });
}

/* ── Show candidates ── */
async function showCandidates(nis, voter) {
  const cands = await loadCandidates();
  voterInfo.textContent = `${voter.nama} — ${voter.kelas}`;

  grid.innerHTML = cands.map(c => `
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all duration-200 group">
      <div class="relative">
        <img src="${c.foto_url || '/src/assets/placeholder.webp'}" class="w-full h-48 object-cover" loading="lazy" />
        <div class="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-brand-700 font-extrabold text-lg px-3 py-1 rounded-xl shadow-sm">
          0${c.nomor_urut}
        </div>
      </div>
      <div class="p-4">
        <h3 class="font-bold text-slate-800 text-sm">${c.nama_ketua}</h3>
        <p class="text-xs text-slate-400 mb-1">& ${c.nama_wakil}</p>
        ${c.visi ? `<p class="text-xs text-slate-500 line-clamp-2 mb-3">${c.visi}</p>` : ''}
        <button data-candidate="${c.id}" data-nomor="${c.nomor_urut}" data-nama="${c.nama_ketua} & ${c.nama_wakil}" class="choose w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors">
          Pilih
        </button>
      </div>
    </div>
  `).join('');

  showStep(stepCands);
}

if (isBrowser) {
  /* ── NIS form submit ── */
  nisForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nis = nisInput.value.trim();
    if (!nis) return;

    nisError.classList.add('hidden');

    const open = await checkElectionOpen();
    if (!open) {
      nisError.textContent = 'Voting belum dibuka oleh panitia';
      nisError.classList.remove('hidden');
      return;
    }

    const res = await verifyNis(nis);
    if (!res.ok) {
      if (res.voted) {
        showStep(stepVoted);
      } else {
        nisError.textContent = res.msg;
        nisError.classList.remove('hidden');
      }
      return;
    }

    sessionStorage.setItem('voter_nis', nis);
    sessionStorage.setItem('voter_name', res.voter.nama);

    await auditLog('login_success', nis, { fp: deviceFingerprint() });

    showCandidates(nis, res.voter);
  });

  /* ── Candidate click → confirm dialog ── */
  let chosenId = null;
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.choose');
    if (!btn) return;
    chosenId = Number(btn.dataset.candidate);
    confirmTxt.textContent = `Yakin pilih Paslon 0${btn.dataset.nomor} — ${btn.dataset.nama}?`;
    confirmDlg.showModal();
  });

  confirmNo.addEventListener('click', () => confirmDlg.close());

  confirmYes.addEventListener('click', async () => {
    const nis = sessionStorage.getItem('voter_nis');
    if (!nis || !chosenId) return;

    confirmYes.disabled = true;
    confirmYes.textContent = 'Memproses...';

    const res = await castVote(nis, chosenId);
    if (!res.ok) {
      alert(res.msg || 'Gagal mencatat suara');
      confirmYes.disabled = false;
      confirmYes.textContent = 'Ya, Pilih';
      confirmDlg.close();
      return;
    }

    const raw = nis + '|' + Date.now();
    const code = btoa(raw).slice(0, 12).toUpperCase();
    sessionStorage.setItem('thank_code', code);

    await auditLog('vote_success', nis, { candidate_id: chosenId });

    confirmDlg.close();
    document.getElementById('success-code').textContent = code;
    showStep(stepSuccess);

    setTimeout(() => {
      sessionStorage.clear();
      location.reload();
    }, 2500);
  });

  /* ── Auto-init: if NIS already in sessionStorage (from index.html login), skip NIS form ── */
  (async () => {
    const existingNis = sessionStorage.getItem('voter_nis');
    if (!existingNis) return;

    const open = await checkElectionOpen();
    if (!open) {
      nisError.textContent = 'Voting belum dibuka oleh panitia';
      nisError.classList.remove('hidden');
      sessionStorage.clear();
      return;
    }

    const res = await verifyNis(existingNis);
    if (!res.ok) {
      sessionStorage.clear();
      if (res.voted) showStep(stepVoted);
      return;
    }

    showCandidates(existingNis, res.voter);
  })();
}
