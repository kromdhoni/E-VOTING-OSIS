import { supabase } from './supabase.js';

export async function getResults() {
  const { data: cfg } = await supabase.from('election_config').select('is_open, start_at, end_at').eq('id', 1).single();
  if (cfg?.is_open) throw new Error('Voting masih buka — hasil terkunci');
  const { data: votes } = await supabase.from('votes').select('candidate_id, created_at');
  const safeVotes = votes || [];
  const counts = {};
  safeVotes.forEach(v => { counts[v.candidate_id] = (counts[v.candidate_id] || 0) + 1; });
  const total = safeVotes.length;
  const { data: cands } = await supabase.from('candidates').select('id, nomor_urut, nama_ketua, nama_wakil, visi');
  const safeCands = cands || [];
  const results = safeCands.map(c => ({
    candidate_id: c.id,
    nomor: c.nomor_urut,
    nama: `${c.nama_ketua} & ${c.nama_wakil}`,
    visi: c.visi || '',
    count: counts[c.id] || 0,
    percent: total ? Math.round((counts[c.id] || 0) / total * 100) : 0,
  }));
  results.sort((a, b) => b.count - a.count);
  return { results, total, startAt: cfg?.start_at, endAt: cfg?.end_at };
}

export function formatResultsHTML(data) {
  const { results, total, startAt, endAt } = data;
  const winner = results.length > 0 ? results[0] : null;
  const now = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });

  let html = `
    <div class="bg-gradient-to-r from-brand-50 to-emerald-50 rounded-2xl p-5 border border-brand-100 mb-4">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 class="text-lg font-extrabold text-slate-800">Hasil Pemilihan Ketua & Wakil OSIS</h3>
          <p class="text-xs text-slate-400 mt-1">SMK YPM 14 Sumobito — ${now}</p>
        </div>
        <div class="text-right">
          <div class="text-2xl font-extrabold text-brand-600">${total}</div>
          <div class="text-xs text-slate-400">Total Suara</div>
        </div>
      </div>
      ${startAt && endAt ? `
      <div class="flex gap-4 mt-3 text-xs text-slate-500">
        <span>Dibuka: ${new Date(startAt).toLocaleString('id-ID')}</span>
        <span>Ditutup: ${new Date(endAt).toLocaleString('id-ID')}</span>
      </div>` : ''}
    </div>
  `;

  if (winner && winner.count > 0) {
    html += `
      <div class="bg-amber-50 rounded-2xl p-5 border border-amber-200 mb-4 text-center">
        <div class="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Pemenang</div>
        <div class="text-xl font-extrabold text-slate-800">Paslon 0${winner.nomor}</div>
        <div class="text-sm font-semibold text-slate-600">${winner.nama}</div>
        <div class="text-3xl font-extrabold text-amber-600 mt-2">${winner.count} Suara (${winner.percent}%)</div>
      </div>
    `;
  }

  html += '<div class="space-y-3">';
  results.forEach((r, i) => {
    const isWinner = i === 0 && r.count > 0;
    html += `
      <div class="flex items-center gap-4 p-4 rounded-xl ${isWinner ? 'bg-brand-50 border border-brand-200' : 'bg-slate-50 border border-slate-100'}">
        <div class="w-12 h-12 rounded-xl ${isWinner ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'} flex items-center justify-center font-extrabold text-lg flex-shrink-0">
          0${r.nomor}
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-bold text-sm ${isWinner ? 'text-brand-700' : 'text-slate-800'}">${r.nama}</div>
          ${r.visi ? `<div class="text-xs text-slate-400 truncate mt-0.5">${r.visi}</div>` : ''}
          <div class="flex items-center gap-3 mt-2">
            <div class="flex-1 bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <div class="${isWinner ? 'bg-brand-500' : 'bg-slate-400'} h-full rounded-full transition-all duration-700" style="width:${r.percent}%"></div>
            </div>
            <span class="text-sm font-bold ${isWinner ? 'text-brand-600' : 'text-slate-500'} w-20 text-right">${r.count} suara</span>
            <span class="text-sm font-bold ${isWinner ? 'text-brand-600' : 'text-slate-400'} w-12 text-right">${r.percent}%</span>
          </div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  return html;
}

export function exportText(results) {
  const { results: res, total, startAt, endAt } = results;
  const now = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
  const lines = [
    '========================================',
    '  HASIL E-VOTING OSIS SMK YPM 14',
    '  Pemilihan Ketua & Wakil OSIS 2026',
    '========================================',
    '',
    `Tanggal Cetak : ${now}`,
    `Total Suara   : ${total}`,
  ];
  if (startAt) lines.push(`Voting Dibuka : ${new Date(startAt).toLocaleString('id-ID')}`);
  if (endAt) lines.push(`Voting Ditutup: ${new Date(endAt).toLocaleString('id-ID')}`);
  lines.push('', '----------------------------------------', '');
  res.forEach((r, i) => {
    const crown = i === 0 && r.count > 0 ? ' ★ PEMENANG' : '';
    lines.push(`Paslon 0${r.nomor} — ${r.nama}${crown}`);
    lines.push(`  Suara : ${r.count} (${r.percent}%)`);
    if (r.visi) lines.push(`  Visi  : ${r.visi}`);
    lines.push('');
  });
  lines.push('========================================', 'Dicetak oleh Sistem E-Voting OSIS');
  return lines.join('\n');
}
