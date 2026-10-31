/**
 * Hitung skor pilihan ganda kompleks berdasarkan Opsi 2 (Skor Parsial ANBK).
 * Net correct = max(0, correct_chosen - wrong_chosen).
 * Score = round((net / total_keys) * total_points, 2).
 */
export function scoreComplexMC(studentAnswer, keyAnswer, totalPoints) {
  if (!studentAnswer || !keyAnswer || totalPoints <= 0) return 0;
  const parseKeys = s => [...new Set(String(s).toUpperCase().split(/[^A-Z0-9]+/).map(x => x.trim()).filter(Boolean))];
  const keys = parseKeys(keyAnswer);
  const student = parseKeys(studentAnswer);
  if (!keys.length) return 0;
  const keySet = new Set(keys);
  let correctCount = 0;
  let wrongCount = 0;
  for (const choice of student) {
    if (keySet.has(choice)) correctCount++;
    else wrongCount++;
  }
  const net = Math.max(0, correctCount - wrongCount);
  const fraction = net / keys.length;
  return Math.round(fraction * totalPoints * 100) / 100;
}

