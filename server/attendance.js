export function summarizeAttendance(students = []) {
  const total = students.length;
  const present = students.filter(student => student?.startedAt).length;
  return { present, absent: total - present, total };
}

export function canExportAttendance(examStatus, students = []) {
  return examStatus === 'completed'
    && students.length > 0
    && students.every(student => student?.status !== 'in_progress');
}
