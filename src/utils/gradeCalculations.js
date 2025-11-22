// utils/gradeCalculations.js - Handle both PascalCase and camelCase

const normalizeRawScore = (score, total) => {
  if (total === 0 || !total) return 0;
  return Math.round(((score / total) * 100) * 100) / 100;
};

export const calculateMidtermGrade = (student, weights, gradeScale) => {
  console.log("🔵 Calculating for:", student.studentFullName);

  if (!weights || !gradeScale || gradeScale.length === 0) {
    console.warn("⚠️ Missing weights or grade scale");
    return student;
  }

  // Handle both camelCase and PascalCase property names
  const getWeight = (camelName, pascalName) => {
    return Number(weights[camelName] || weights[pascalName] || 0);
  };

  const quizWeight = getWeight('quizWeighted', 'QuizWeighted');
  const classStandingWeight = getWeight('classStandingWeighted', 'ClassStandingWeighted');
  const sepWeight = getWeight('sepWeighted', 'SEPWeighted');
  const projectWeight = getWeight('projectWeighted', 'ProjectWeighted');
  const midtermWeight = getWeight('midtermWeighted', 'MidtermWeighted');

  console.log("⚖️ WEIGHTS:", {
    quizWeight,
    classStandingWeight,
    sepWeight,
    projectWeight,
    midtermWeight
  });

  // ===== Quizzes =====
  const totalQuizScore = (student.quizzes || []).reduce(
    (sum, q) => sum + (Number(q.quizScore) || 0),
    0
  );
  const totalQuizPossible = (student.quizzes || []).reduce(
    (sum, q) => sum + (Number(q.totalQuizScore) || 0),
    0
  );
  
  const quizPG = normalizeRawScore(totalQuizScore, totalQuizPossible);
  const quizWeighted = Math.round(quizPG * quizWeight * 100) / 100;

  console.log("📝 Quiz:", { totalQuizScore, totalQuizPossible, quizPG, quizWeighted });

  // ===== Class Standing =====
  const totalCSScore = (student.classStandingItems || []).reduce(
    (sum, cs) => sum + (Number(cs.score) || 0),
    0
  );
  const totalCSPossible = (student.classStandingItems || []).reduce(
    (sum, cs) => sum + (Number(cs.total) || 0),
    0
  );
  
  const classStandingPG = normalizeRawScore(totalCSScore, totalCSPossible);
  const recitationScore = Number(student.recitationScore) || 0;
  const attendanceScore = Number(student.attendanceScore) || 0;
  
  const cssAverage = Math.round(((recitationScore + attendanceScore + classStandingPG) / 3) * 100) / 100;
  const classStandingWeighted = Math.round(cssAverage * classStandingWeight * 100) / 100;

  console.log("👥 Class Standing:", { 
    totalCSScore, 
    totalCSPossible, 
    classStandingPG,
    recitationScore,
    attendanceScore,
    cssAverage, 
    classStandingWeighted 
  });

  // ===== SEP =====
  const sepScore = Number(student.sepScore) || 0;
  const seppg = sepScore;
  const sepWeighted = Math.round(seppg * sepWeight * 100) / 100;

  console.log("📚 SEP:", { sepScore, seppg, sepWeighted });

  // ===== Project =====
  const projectScore = Number(student.projectScore) || 0;
  const projectPG = projectScore;
  const projectWeighted = Math.round(projectPG * projectWeight * 100) / 100;

  console.log("🎯 Project:", { projectScore, projectPG, projectWeighted });

  // ===== Prelim + Midterm =====
  const prelimScore = Number(student.prelimScore) || 0;
  const midtermScore = Number(student.midtermScore) || 0;
  const prelimTotal = Number(student.prelimTotal) || 0;
  const midtermTotal = Number(student.midtermTotal) || 0;
  
  const totalScorePrelimAndMidterm = prelimScore + midtermScore;
  const overallPrelimAndMidterm = prelimTotal + midtermTotal;
  
  const combinedPrelimMidtermAverage = normalizeRawScore(
    totalScorePrelimAndMidterm, 
    overallPrelimAndMidterm
  );
  const midtermPG = combinedPrelimMidtermAverage;
  const midtermExamWeighted = Math.round(midtermPG * midtermWeight * 100) / 100;

  console.log("📊 Exams:", { 
    prelimScore,
    midtermScore,
    totalScorePrelimAndMidterm,
    overallPrelimAndMidterm,
    combinedPrelimMidtermAverage,
    midtermPG,
    midtermExamWeighted
  });

  // ===== Total Midterm Grade =====
  const totalMidtermGrade = Math.round(
    (quizWeighted +
    classStandingWeighted +
    sepWeighted +
    projectWeighted +
    midtermExamWeighted) * 100
  ) / 100;

  const totalMidtermGradeRounded = Math.round(totalMidtermGrade);

  console.log("🎓 TOTAL:", {
    quizWeighted,
    classStandingWeighted,
    sepWeighted,
    projectWeighted,
    midtermExamWeighted,
    sum: quizWeighted + classStandingWeighted + sepWeighted + projectWeighted + midtermExamWeighted,
    totalMidtermGrade,
    totalMidtermGradeRounded
  });

  // ===== Grade Point Equivalent =====
  let gradePointEquivalent = 5.00;
  
  if (totalMidtermGradeRounded <= 73) {
    gradePointEquivalent = 5.00;
  } else {
    const match = gradeScale.find(gp => {
      const minPercentage = gp.minPercentage !== undefined && gp.minPercentage !== null 
        ? Number(gp.minPercentage) 
        : (gp.MinPercentage !== undefined && gp.MinPercentage !== null ? Number(gp.MinPercentage) : null);
      const maxPercentage = Number(gp.maxPercentage || gp.MaxPercentage || 100);
      
      return (minPercentage === null || totalMidtermGradeRounded >= minPercentage) &&
             totalMidtermGradeRounded <= maxPercentage;
    });
    gradePointEquivalent = Number(match?.gradePoint || match?.GradePoint || 5.00);
  }

  console.log("✅ Grade Point:", gradePointEquivalent);
  console.log("================================\n");

  return {
    ...student,
    totalQuizScore,
    quizPG,
    quizWeighted,
    recitationScore,
    attendanceScore,
    classStandingTotalScore: totalCSPossible,
    classStandingPG,
    classStandingAverage: cssAverage,
    classStandingWeighted,
    sepScore,
    seppg,
    sepweighted: sepWeighted,
    projectScore,
    projectPG,
    projectWeighted,
    prelimScore,
    prelimTotal,
    midtermScore,
    midtermTotal,
    totalScorePrelimAndMidterm,
    overallPrelimAndMidterm,
    combinedPrelimMidtermAverage,
    midtermPG,
    midtermExamWeighted,
    totalMidtermGrade,
    totalMidtermGradeRounded,
    gradePointEquivalent,
  };
};