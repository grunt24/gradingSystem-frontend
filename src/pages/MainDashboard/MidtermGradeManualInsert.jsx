import React, { useState } from "react";
import axiosInstance from "../../api/axiosInstance"; // ← USE YOUR AXIOS INSTANCE
import './MidtermGrades.css';

const MidtermGradeManualInsert = () => {
  const [grade, setGrade] = useState({
    studentId: "",
    subjectId: "",
    semester: "",
    academicYear: "",
    academicPeriodId: 4,

    quizzes: [],
    recitationScore: 0,
    attendanceScore: 0,

    classStandingItems: [],
    sepScore: 0,
    projectScore: 0,

    prelimScore: 0,
    prelimTotal: 0,
    midtermScore: 0,
    midtermTotal: 0,
  });

  // --- ADD QUIZ ---
  const addQuiz = () => {
    setGrade((prev) => ({
      ...prev,
      quizzes: [
        ...prev.quizzes,
        {
          label: `Quiz ${prev.quizzes.length + 1}`,
          quizScore: 0,
          totalQuizScore: 0,
        },
      ],
    }));
  };

  // --- UPDATE QUIZ FIELD ---
  const updateQuiz = (index, field, value) => {
    setGrade((prev) => {
      const copy = [...prev.quizzes];
      copy[index][field] = value;
      return { ...prev, quizzes: copy };
    });
  };

  // --- ADD CLASS STANDING ITEM ---
  const addCS = () => {
    setGrade((prev) => ({
      ...prev,
      classStandingItems: [
        ...prev.classStandingItems,
        {
          label: `CS ${prev.classStandingItems.length + 1}`,
          score: 0,
          total: 0,
        },
      ],
    }));
  };

  // --- UPDATE CLASS STANDING ITEM ---
  const updateCS = (index, field, value) => {
    setGrade((prev) => {
      const copy = [...prev.classStandingItems];
      copy[index][field] = value;
      return { ...prev, classStandingItems: copy };
    });
  };

  // -------------------------
  //   SUBMIT TO API
  // -------------------------
  const handleSubmit = async () => {
    try {
      console.log("Sending:", grade);

      const res = await axiosInstance.post(
        "/GradeCalculation/manual-insert", // ← EXACT ENDPOINT
        grade
      );

      alert("Grade successfully calculated & saved!");
      console.log("SERVER RESPONSE:", res.data);

    } catch (err) {
      console.error("ERROR SUBMITTING:", err);
      alert("Failed to submit grade.");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Manual Midterm Grade Insert</h2>

      {/* STUDENT INFO */}
      <div className="table-header">
        <label>Student ID:</label>
        <input
          type="number"
          className="input-cell"
          onChange={(e) => setGrade({ ...grade, studentId: Number(e.target.value) })}
        />

        <label>Subject ID:</label>
        <input
          type="number"
          className="input-cell"
          onChange={(e) => setGrade({ ...grade, subjectId: Number(e.target.value) })}
        />
      </div>

      <br />

      {/* QUIZZES */}
      <h3>Quizzes</h3>
      <button onClick={addQuiz}>Add Quiz</button>

      <table className="grades-table">
        <thead>
          <tr>
            <th>Label</th>
            <th>Score</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {grade.quizzes.map((q, i) => (
            <tr key={i}>
              <td>{q.label}</td>
              <td>
                <input
                  type="number"
                  className="input-cell"
                  onChange={(e) => updateQuiz(i, "quizScore", Number(e.target.value))}
                />
              </td>
              <td>
                <input
                  type="number"
                  className="input-cell"
                  onChange={(e) => updateQuiz(i, "totalQuizScore", Number(e.target.value))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />

      {/* RECITATION + ATTENDANCE */}
      <h3>Recitation & Attendance</h3>
      <input
        type="number"
        className="input-cell"
        placeholder="Recitation Score"
        onChange={(e) => setGrade({ ...grade, recitationScore: Number(e.target.value) })}
      />
      <input
        type="number"
        className="input-cell"
        placeholder="Attendance Score"
        style={{ marginLeft: 10 }}
        onChange={(e) => setGrade({ ...grade, attendanceScore: Number(e.target.value) })}
      />

      <br /><br />

      {/* CLASS STANDING */}
      <h3>Class Standing</h3>
      <button onClick={addCS}>Add Item</button>

      <table className="grades-table">
        <thead>
          <tr>
            <th>Label</th>
            <th>Score</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {grade.classStandingItems.map((cs, i) => (
            <tr key={i}>
              <td>{cs.label}</td>
              <td>
                <input
                  type="number"
                  className="input-cell"
                  onChange={(e) => updateCS(i, "score", Number(e.target.value))}
                />
              </td>
              <td>
                <input
                  type="number"
                  className="input-cell"
                  onChange={(e) => updateCS(i, "total", Number(e.target.value))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />

      {/* SEP + PROJECT */}
      <h3>SEP & Project</h3>
      <input
        type="number"
        className="input-cell"
        placeholder="SEP Score"
        onChange={(e) => setGrade({ ...grade, sepScore: Number(e.target.value) })}
      />
      <input
        type="number"
        className="input-cell"
        style={{ marginLeft: 10 }}
        placeholder="Project Score"
        onChange={(e) => setGrade({ ...grade, projectScore: Number(e.target.value) })}
      />

      <br /><br />

      {/* PRELIM + MIDTERM */}
      <h3>Prelim & Midterm Exams</h3>

      <input
        type="number"
        className="input-cell"
        placeholder="Prelim Score"
        onChange={(e) => setGrade({ ...grade, prelimScore: Number(e.target.value) })}
      />
      <input
        type="number"
        className="input-cell"
        style={{ marginLeft: 10 }}
        placeholder="Prelim Total"
        onChange={(e) => setGrade({ ...grade, prelimTotal: Number(e.target.value) })}
      />

      <br /><br />

      <input
        type="number"
        className="input-cell"
        placeholder="Midterm Score"
        onChange={(e) => setGrade({ ...grade, midtermScore: Number(e.target.value) })}
      />
      <input
        type="number"
        className="input-cell"
        style={{ marginLeft: 10 }}
        placeholder="Midterm Total"
        onChange={(e) => setGrade({ ...grade, midtermTotal: Number(e.target.value) })}
      />

      <br /><br />

      <button className="submit-btn" onClick={handleSubmit}>
        Submit Midterm Grade
      </button>
    </div>
  );
};

export default MidtermGradeManualInsert;
