function escapeRegex(string) {
  return string.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

export function gradesForTeacherClasses(classNames, grades) {
  const orderedGrades = [...new Set(grades.map(grade => String(grade).trim()).filter(Boolean))]
    .sort((left, right) => right.length - left.length);
  return [...new Set(classNames.flatMap(className => {
    const norm = String(className).trim();
    const stripped = norm.replace(/^(kelas|kls|class)\s*[-:]?\s*/i, '');
    const grade = orderedGrades.find(candidate => stripped === candidate
      || stripped.startsWith(candidate + ' ')
      || stripped.startsWith(candidate + '-')
      || new RegExp('(^|[^a-zA-Z0-9])' + escapeRegex(candidate) + '([^a-zA-Z0-9]|$)', 'i').test(norm));
    return grade ? [grade] : [];
  }))];
}

export function hasTeacherGrant(assignments, subjectId, className) {
  return assignments.some(assignment => Number(assignment.subjectId) === Number(subjectId)
    && assignment.className === className);
}
