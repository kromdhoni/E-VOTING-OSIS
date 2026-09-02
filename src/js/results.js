import { supabase } from './supabase.js';

export async function getResults() {
  const { data: cfg } = await supabase.from('election_config').select('is_open').eq('id', 1).single();
  if (cfg?.is_open) throw new Error('Voting masih buka — hasil terkunci');
  const { data: votes } = await supabase.from('votes').select('candidate_id');
  const safeVotes = votes || [];
  const counts = {};
  safeVotes.forEach(v => { counts[v.candidate_id] = (counts[v.candidate_id] || 0) + 1; });
  const total = safeVotes.length;
  const { data: cands } = await supabase.from('candidates').select('id,nomor_urut,nama_ketua,nama_wakil');
  const safeCands = cands || [];
  return safeCands.map(c => ({
    candidate_id: c.id,
    nomor: c.nomor_urut,
    nama: `${c.nama_ketua} & ${c.nama_wakil}`,
    count: counts[c.id] || 0,
    percent: total ? Math.round((counts[c.id] || 0) / total * 100) : 0
  }));
}

export async function exportPDF(results) {
  const text = `HASIL E-VOTING OSIS SMK YPM 14\n${new Date().toLocaleString('id-ID')}\n\n` + results.map(r => `Paslon 0${r.nomor} ${r.nama}: ${r.count} suara (${r.percent}%)`).join('\n');
  return new Blob([text], { type: 'application/pdf' });
}
