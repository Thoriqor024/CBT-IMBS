export function calculateItemDifficulty(totalAssigned, totalCorrect) {
  const total = Number(totalAssigned) || 0;
  const correct = Number(totalCorrect) || 0;
  if (total <= 0) {
    return { difficultyIndex: 0, difficulty: 'Belum diuji' };
  }
  const difficultyIndex = Math.round((correct / total) * 100) / 100;
  let difficulty = 'Sedang';
  if (difficultyIndex >= 0.70) {
    difficulty = 'Mudah';
  } else if (difficultyIndex >= 0.30) {
    difficulty = 'Sedang';
  } else {
    difficulty = 'Sukar';
  }
  return { difficultyIndex, difficulty };
}

