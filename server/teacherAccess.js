import { matchBankGrade } from './gradeMatching.js';

export function gradesForTeacherClasses(classNames, grades) {
  return [...new Set(classNames
    .map(className => matchBankGrade(className, grades))
    .filter(Boolean))];
}

export function hasTeacherGrant(assignments, subjectId, className) {
  return assignments.some(assignment => Number(assignment.subjectId) === Number(subjectId)
    && assignment.className === className);
}
