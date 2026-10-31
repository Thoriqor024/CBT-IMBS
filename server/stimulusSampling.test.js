import test from 'node:test';
import assert from 'node:assert/strict';

// Isolated simulation of the sampling logic implemented in server/index.js
function sampleQuestions({ allMC = [], allEssay = [], mcCount = 0, essayCount = 0 }) {
  let essayPicks = [];
  if (essayCount > 0) {
    const stimMap = new Map();
    const standalone = [];
    for (const q of allEssay) {
      if (q.stimulus_id) {
        if (!stimMap.has(q.stimulus_id)) stimMap.set(q.stimulus_id, []);
        stimMap.get(q.stimulus_id).push(q);
      } else {
        standalone.push(q);
      }
    }
    let remaining = essayCount;
    // Rule: Pada essay, jika wacana terpilih maka seluruh butir soalnya dikeluarkan (100%)
    for (const [, group] of stimMap.entries()) {
      if (group.length <= remaining) {
        essayPicks.push(...group);
        remaining -= group.length;
      }
    }
    for (const q of standalone) {
      if (remaining <= 0) break;
      essayPicks.push(q);
      remaining--;
    }
    if (remaining > 0) {
      for (const q of allEssay) {
        if (remaining <= 0) break;
        if (!essayPicks.some(p => p.id === q.id)) {
          essayPicks.push(q);
          remaining--;
        }
      }
    }
  }

  let mcPicks = [];
  if (mcCount > 0) {
    const stimMap = new Map();
    const standalone = [];
    for (const q of allMC) {
      if (q.stimulus_id) {
        if (!stimMap.has(q.stimulus_id)) stimMap.set(q.stimulus_id, []);
        stimMap.get(q.stimulus_id).push(q);
      } else {
        standalone.push(q);
      }
    }
    let remaining = mcCount;
    // Rule: Pada PG, minimal 60% dari total soal wacana tersebut diambil jika wacana terpilih
    for (const [, group] of stimMap.entries()) {
      const min60 = Math.ceil(group.length * 0.6);
      if (remaining >= min60) {
        const take = Math.min(group.length, remaining);
        mcPicks.push(...group.slice(0, take));
        remaining -= take;
      }
    }
    for (const q of standalone) {
      if (remaining <= 0) break;
      mcPicks.push(q);
      remaining--;
    }
    if (remaining > 0) {
      for (const q of allMC) {
        if (remaining <= 0) break;
        if (!mcPicks.some(p => p.id === q.id)) {
          mcPicks.push(q);
          remaining--;
        }
      }
    }
  }

  return { mcPicks, essayPicks };
}

test('Essay sampling: includes 100% of stimulus child questions when selected', () => {
  const allEssay = [
    { id: 1, stimulus_id: 10 },
    { id: 2, stimulus_id: 10 },
    { id: 3, stimulus_id: 10 },
    { id: 4, stimulus_id: null },
    { id: 5, stimulus_id: null },
  ];

  // Requesting 3 essay questions: should take all 3 questions from stimulus 10 (100%)
  const { essayPicks } = sampleQuestions({ allEssay, essayCount: 3 });
  assert.equal(essayPicks.length, 3);
  assert.deepEqual(essayPicks.map(q => q.id), [1, 2, 3]);
  assert.ok(essayPicks.every(q => q.stimulus_id === 10));
});

test('PG sampling: includes at least 60% of child questions when stimulus is selected', () => {
  // Stimulus with 5 questions -> 60% = 3 questions
  const allMC = [
    { id: 101, stimulus_id: 20 },
    { id: 102, stimulus_id: 20 },
    { id: 103, stimulus_id: 20 },
    { id: 104, stimulus_id: 20 },
    { id: 105, stimulus_id: 20 },
    { id: 106, stimulus_id: null },
    { id: 107, stimulus_id: null },
    { id: 108, stimulus_id: null },
  ];

  // Requesting 4 PG questions: quota is >= 3, so stimulus 20 can be picked with 4 questions (80% >= 60%)
  const { mcPicks } = sampleQuestions({ allMC, mcCount: 4 });
  assert.equal(mcPicks.length, 4);
  const fromStim = mcPicks.filter(q => q.stimulus_id === 20);
  assert.ok(fromStim.length >= 3, 'Must take at least 60% (3 out of 5)');
});

test('PG sampling: skips stimulus if remaining quota is less than 60%', () => {
  // Stimulus with 5 questions -> 60% = 3 questions. But quota is only 2.
  const allMC = [
    { id: 201, stimulus_id: 30 },
    { id: 202, stimulus_id: 30 },
    { id: 203, stimulus_id: 30 },
    { id: 204, stimulus_id: 30 },
    { id: 205, stimulus_id: 30 },
    { id: 206, stimulus_id: null },
    { id: 207, stimulus_id: null },
  ];

  const { mcPicks } = sampleQuestions({ allMC, mcCount: 2 });
  assert.equal(mcPicks.length, 2);
  // Should NOT pick partial < 60% from stimulus 30, picks standalone instead
  assert.deepEqual(mcPicks.map(q => q.id), [206, 207]);
});

