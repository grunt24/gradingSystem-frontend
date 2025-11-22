// src/data/mockGrades.js

const dummyGrades = [
  { studentId: 4, subjectId: 1, grade: 85 }, // valid
  { studentId: 6, subjectId: 2, grade: 72 }, // invalid
  { studentId: 4, subjectId: 3, grade: 90 }, // valid
  { studentId: 6, subjectId: 1, grade: 80 }, // valid
  { studentId: 5, subjectId: 4, grade: 60 }, // invalid
];

export default dummyGrades;
