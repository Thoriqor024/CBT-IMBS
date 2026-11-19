// Simulasikan perpindahan kelas sekaligus agar pratinjau dan penyimpanan
// memakai keputusan ruang yang sama, termasuk kapasitas kelas tujuan per ruang.
export function buildClassTransferPlan({ students = [], placements = [], targetClass, activeStudentIds = [] } = {}) {
  const active = new Set((activeStudentIds || []).map(String));
  const placementsByStudent = new Map();
  for (const placement of placements) {
    const key = String(placement.studentId);
    if (!placementsByStudent.has(key)) placementsByStudent.set(key, []);
    placementsByStudent.get(key).push(placement);
  }

  const roomCapacity = new Map();
  const planned = students.map(student => {
    const id = String(student.id);
    const base = { id: student.id, name: student.name, username: student.username, fromClass: String(student.className || '') };
    if (base.fromClass === targetClass) return { ...base, status: 'unchanged', roomChanges: [], unassigned: false };
    if (active.has(id)) return { ...base, status: 'blocked', reason: 'Sedang mengerjakan ujian aktif.', roomChanges: [], unassigned: false };

    const roomChanges = [];
    for (const placement of placementsByStudent.get(id) || []) {
      const roomKey = String(placement.roomId);
      const quota = (Array.isArray(placement.quotas) ? placement.quotas : [])
        .find(item => String(item.className) === targetClass);
      if (!roomCapacity.has(roomKey)) {
        const occupied = Number(placement.targetCount) || 0;
        roomCapacity.set(roomKey, quota ? Math.max(0, Number(quota.count) - occupied) : 0);
      }
      const available = roomCapacity.get(roomKey);
      if (quota && available > 0) {
        roomChanges.push({ roomId: Number(placement.roomId), name: placement.name, action: 'updated' });
        roomCapacity.set(roomKey, available - 1);
      } else {
        roomChanges.push({ roomId: Number(placement.roomId), name: placement.name, action: 'removed' });
      }
    }

    return {
      ...base,
      status: 'will_move',
      roomChanges,
      unassigned: !roomChanges.some(change => change.action === 'updated'),
    };
  });

  const changes = planned.flatMap(student => student.roomChanges);
  return {
    targetClass,
    students: planned,
    summary: {
      selected: planned.length,
      willMove: planned.filter(student => student.status === 'will_move').length,
      unchanged: planned.filter(student => student.status === 'unchanged').length,
      blocked: planned.filter(student => student.status === 'blocked').length,
      roomUpdates: changes.filter(change => change.action === 'updated').length,
      roomRemovals: changes.filter(change => change.action === 'removed').length,
      unassigned: planned.filter(student => student.status === 'will_move' && student.unassigned).length,
    },
  };
}
