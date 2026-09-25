import { supabase } from './supabase.js';
import { getResults } from './results.js';

const ADMIN_PASSWORD = 'SMK14ADMIN';
const isBrowser = typeof document !== 'undefined';

export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildMetaHTML({ total, startAt, endAt }) {
  const fmt = d => (d ? new Date(d).toLocaleString('id-ID') : '-');
  return `<div class="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 rounded-xl p-4 border border-slate-100">
    <div><span class="text-slate-400">Voting dibuka:</span><br/><b>${fmt(startAt)}</b></div>
    <div><span class="text-slate-400">Voting ditutup:</span><br/><b>${fmt(endAt)}</b></div>
    <div><span class="text-slate-400">Total suara masuk:</span><br/><b>${total} suara</b></div>
  </div>`;
}

export function buildStatsHTML({ totalVoters, totalVotes }) {
  const pct = totalVoters ? Math.round((totalVotes / totalVoters) * 100) : 0;
  const abstain = totalVoters - totalVotes;
  const cards = [
    ['Total Pemilih', totalVoters, 'text-slate-800'],
    ['Suara Masuk', totalVotes, 'text-emerald-600'],
    ['Partisipasi', pct + '%', 'text-brand-600'],
    ['Tidak Memilih', abstain, 'text-amber-600'],
  ];
  return cards.map(([label, val, cls]) => `
    <div class="print-avoid-break bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
      <div class="text-2xl sm:text-3xl font-extrabold ${cls}">${val}</div>
      <div class="text-xs text-slate-400 font-semibold mt-1">${label}</div>
    </div>`).join('');
}

export function buildWinnerHTML(winner) {
  if (!winner || !winner.count) return '';
  return `<div class="print-avoid-break bg-amber-50 rounded-2xl p-5 border border-amber-200 text-center">
    <div class="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Pemenang Pemilihan</div>
    <div class="text-lg font-extrabold text-slate-800">Pasangan Calon 0${winner.nomor} — ${esc(winner.nama)}</div>
    <div class="text-3xl font-extrabold text-amber-600 mt-1">${winner.count} suara (${winner.percent}%)</div>
  </div>`;
}

export function buildCandidatesHTML(results) {
  return results.map((r, i) => `
    <div class="print-avoid-break flex items-center gap-4 p-4 rounded-xl ${i === 0 && r.count > 0 ? 'bg-brand-50 border border-brand-200' : 'bg-slate-50 border border-slate-100'}">
      <div class="w-12 h-12 rounded-xl ${i === 0 && r.count > 0 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'} flex items-center justify-center font-extrabold text-lg flex-shrink-0">0${r.nomor}</div>
      <div class="flex-1 min-w-0">
        <div class="font-bold text-sm text-slate-800">${esc(r.nama)}</div>
        <div class="flex items-center gap-3 mt-2">
          <div class="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden">
            <div class="${i === 0 && r.count > 0 ? 'bg-brand-500' : 'bg-slate-400'} h-full rounded-full" style="width:${r.percent}%"></div>
          </div>
          <span class="text-sm font-bold text-slate-600 w-20 text-right">${r.count} suara</span>
          <span class="text-sm font-bold text-slate-400 w-12 text-right">${r.percent}%</span>
        </div>
      </div>
    </div>`).join('');
}

export function buildKelasTableHTML(perKelas) {
  const rows = Object.entries(perKelas)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => {
      const pct = v.total ? Math.round((v.voted / v.total) * 100) : 0;
      return `<tr class="border-b border-slate-50">
        <td class="py-2 px-3 font-medium text-slate-700">${esc(k)}</td>
        <td class="py-2 px-3 text-center">${v.total}</td>
        <td class="py-2 px-3 text-center font-semibold text-emerald-600">${v.voted}</td>
        <td class="py-2 px-3 text-center text-slate-400">${v.total - v.voted}</td>
        <td class="py-2 px-3">
          <div class="flex items-center gap-2">
            <div class="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden"><div class="bg-brand-500 h-full rounded-full" style="width:${pct}%"></div></div>
            <span class="text-xs font-bold text-slate-500 w-10 text-right">${pct}%</span>
          </div>
        </td>
      </tr>`;
    }).join('');
  return `<table class="w-full text-sm"><thead><tr class="bg-slate-50 border-b border-slate-200">
    <th class="text-left py-2 px-3 font-semibold text-slate-500">Kelas</th>
    <th class="py-2 px-3 font-semibold text-slate-500">Pemilih</th>
    <th class="py-2 px-3 font-semibold text-slate-500">Memilih</th>
    <th class="py-2 px-3 font-semibold text-slate-500">Absen</th>
    <th class="py-2 px-3 font-semibold text-slate-500">Partisipasi</th>
  </tr></thead><tbody>${rows}</tbody></table>`;
}

async function getParticipation() {
  const { data } = await supabase.from('voters').select('kelas, has_voted');
  const safe = data || [];
  const perKelas = {};
  safe.forEach(v => {
    perKelas[v.kelas] = perKelas[v.kelas] || { total: 0, voted: 0 };
    perKelas[v.kelas].total++;
    if (v.has_voted) perKelas[v.kelas].voted++;
  });
  return { totalVoters: safe.length, perKelas };
}

async function load() {
  const report = document.getElementById('report');
  const locked = document.getElementById('locked');
  try {
    const [res, part] = await Promise.all([getResults(), getParticipation()]);
    locked.classList.add('hidden');
    report.classList.remove('hidden');
    document.getElementById('lap-meta').innerHTML = buildMetaHTML(res);
    document.getElementById('lap-stats').innerHTML = buildStatsHTML({ totalVoters: part.totalVoters, totalVotes: res.total });
    document.getElementById('lap-winner').innerHTML = buildWinnerHTML(res.results[0]);
    document.getElementById('lap-candidates').innerHTML = buildCandidatesHTML(res.results);
    document.getElementById('lap-kelas').innerHTML = buildKelasTableHTML(part.perKelas);
    document.getElementById('lap-place').textContent = 'Sumobito, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('lap-updated').textContent = 'Terakhir dimuat ' + new Date().toLocaleTimeString('id-ID');
  } catch (e) {
    report.classList.add('hidden');
    locked.classList.remove('hidden');
  }
}

if (isBrowser) {
  document.getElementById('gate-login')?.addEventListener('click', () => {
    const pass = document.getElementById('gate-pass').value;
    if (pass === ADMIN_PASSWORD) {
      document.getElementById('gate').classList.add('hidden');
      load();
      setInterval(load, 15000);
    } else {
      const err = document.getElementById('gate-error');
      err.textContent = 'Password salah!';
      err.classList.remove('hidden');
    }
  });
  document.getElementById('gate-pass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('gate-login').click();
  });
  document.getElementById('btn-refresh-laporan')?.addEventListener('click', load);
}
