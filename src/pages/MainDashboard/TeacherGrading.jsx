import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "../../api/axiosInstance";
import loginService from "../../api/loginService";

function TeacherGrading() {
  // State to manage the list of subjects assigned to the logged-in teacher.
  const [subjects, setSubjects] = useState([]);
  // State for the currently selected subject from the dropdown.
  const [selectedSubject, setSelectedSubject] = useState(null);
  // State for the currently selected student.
  const [selectedStudent, setSelectedStudent] = useState(null);
  // State to hold a single student's grades, including multiple scores.
  const [studentData, setStudentData] = useState({
    scores: [],
    calculatedGrade: null,
    mainGrade: null,
  });
  // Loading state for API calls.
  const [loading, setLoading] = useState(false);

  // Fetch subjects on initial component mount.
  useEffect(() => {
    const userDetails = loginService.getUserDetails();
    if (userDetails && userDetails.id) {
      const fetchSubjects = async () => {
        setLoading(true);
        try {
          const res = await axiosInstance.get(
            `/Subjects/teacher/${userDetails.id}`
          );
          setSubjects(res.data);
        } catch (error) {
          toast.error("Failed to load subjects.");
          console.error("Error fetching subjects:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchSubjects();
    }
  }, []);

  // Effect to update student data when a new student is selected.
  useEffect(() => {
    if (selectedStudent && selectedSubject) {
      // Find the full student object from the selected subject's student list
      const fullStudent = selectedSubject.students.find(
        (s) => s.studentId === selectedStudent.studentId
      );
      if (fullStudent) {
        // Assuming the API returns a 'scores' array and grades
        setStudentData({
          scores: fullStudent.scores || [],
          calculatedGrade: fullStudent.calculatedGrade,
          mainGrade: fullStudent.mainGrade,
        });
      } else {
        setStudentData({ scores: [], calculatedGrade: null, mainGrade: null });
      }
    } else {
      setStudentData({ scores: [], calculatedGrade: null, mainGrade: null });
    }
  }, [selectedStudent, selectedSubject]);

  // Handle adding a new score row for the selected student.
  const handleAddScore = () => {
    setStudentData((prev) => ({
      ...prev,
      scores: [
        ...prev.scores,
        {
          scoreType: "",
          score: "",
          total: "",
        },
      ],
    }));
  };

  // Handle changes to an individual score entry.
  const handleScoreChange = (index, field, value) => {
    const newScores = [...studentData.scores];
    newScores[index][field] = value;
    setStudentData((prev) => ({
      ...prev,
      scores: newScores,
    }));
  };

  // Handle changes to the main grade input field.
  const handleMainGradeChange = (value) => {
    setStudentData((prev) => ({
      ...prev,
      mainGrade: value !== "" ? parseFloat(value) : null,
    }));
  };

  // Calculate the total percentage from all scores.
  const calculatePercentage = () => {
    let totalScore = 0;
    let totalMaxScore = 0;
    studentData.scores.forEach((s) => {
      totalScore += parseFloat(s.score) || 0;
      totalMaxScore += parseFloat(s.total) || 0;
    });

    if (totalMaxScore === 0) {
      return 0;
    }

    const percentage = (totalScore / totalMaxScore) * 100;
    return percentage.toFixed(2);
  };

  // Handle saving all grades for the selected student.
  const handleSaveGrades = async () => {
    if (!selectedSubject || !selectedStudent) {
      toast.error("Please select a subject and student first.");
      return;
    }

    setLoading(true);
    try {
      // Calculate the percentage grade before sending the payload.
      const calculatedGradeValue = parseFloat(calculatePercentage());

      // Construct the payload for the API.
      // Note: the `type` key is used to match the backend DTO.
      const payload = {
        studentId: selectedStudent.studentId,
        subjectId: selectedSubject.id,
        mainGrade: studentData.mainGrade,
        calculatedGrade: calculatedGradeValue,
        scores: studentData.scores.map((score) => ({
          type: score.scoreType,
          score: parseFloat(score.score),
          total: parseFloat(score.total),
        })),
      };

      await axiosInstance.post(`/Grades/save`, [payload]);
      toast.success("Grades saved successfully!");

      // Update the local state to reflect the saved grades.
      setSubjects((prevSubjects) => {
        // Find the subject to update
        return prevSubjects.map((subject) => {
          if (subject.id === selectedSubject.id) {
            // Find the student within that subject and update their grades.
            const updatedStudents = subject.students.map((student) => {
              if (student.studentId === selectedStudent.studentId) {
                return {
                  ...student,
                  mainGrade: payload.mainGrade,
                  calculatedGrade: payload.calculatedGrade,
                  scores: payload.scores,
                };
              }
              return student;
            });
            return { ...subject, students: updatedStudents };
          }
          return subject;
        });
      });

      // Update the selected subject state to trigger a re-render of the grading form.
      setSelectedSubject((prev) => ({
        ...prev,
        students: prev.students.map((student) => {
          if (student.studentId === selectedStudent.studentId) {
            return {
              ...student,
              mainGrade: payload.mainGrade,
              calculatedGrade: payload.calculatedGrade,
              scores: payload.scores,
            };
          }
          return student;
        }),
      }));
    } catch (error) {
      toast.error("Failed to save grades.");
      console.error("Error saving grades:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Teacher Grading Portal</h4>
        </div>
        <div className="card-body">
          {/* Subject Selection */}
          <div className="mb-4">
            <label htmlFor="subject-select" className="form-label">
              Select a Subject
            </label>
            <select
              id="subject-select"
              className="form-select"
              value={selectedSubject?.id || ""}
              onChange={(e) => {
                const subject = subjects.find(
                  (s) => s.id === parseInt(e.target.value)
                );
                setSelectedSubject(subject);
                setSelectedStudent(null); // Reset student selection
              }}
            >
              <option value="">-- Choose a subject --</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.subjectCode} - {subject.subjectName}
                </option>
              ))}
            </select>
          </div>

          {/* Student Selection */}
          {selectedSubject && (
            <div className="mb-4">
              <label htmlFor="student-select" className="form-label">
                Select a Student
              </label>
              <select
                id="student-select"
                className="form-select"
                value={selectedStudent?.studentId || ""}
                onChange={(e) => {
                  const student = selectedSubject.students.find(
                    (s) => s.studentId === parseInt(e.target.value)
                  );
                  setSelectedStudent(student);
                }}
              >
                <option value="">-- Choose a student --</option>
                {selectedSubject.students.map((student) => (
                  <option key={student.studentId} value={student.studentId}>
                    {student.fullname}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grading Form */}
          {selectedStudent && (
            <>
              <h5>Grading for: {selectedStudent.fullname}</h5>
              <div className="table-responsive">
                <table className="table table-bordered table-striped mt-3">
                  <thead className="table-dark">
                    <tr>
                      <th>Score Type</th>
                      <th>Score</th>
                      <th>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentData.scores.map((score, index) => (
                      <tr key={index}>
                        <td className="align-middle">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="e.g., Quiz #1"
                            value={score.scoreType}
                            onChange={(e) =>
                              handleScoreChange(
                                index,
                                "scoreType",
                                e.target.value
                              )
                            }
                          />
                        </td>
                        <td className="align-middle">
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            placeholder="Score"
                            value={score.score}
                            onChange={(e) =>
                              handleScoreChange(index, "score", e.target.value)
                            }
                          />
                        </td>
                        <td className="align-middle">
                          <input
                            type="number"
                            className="form-control form-control-sm"
                            placeholder="Total"
                            value={score.total}
                            onChange={(e) =>
                              handleScoreChange(index, "total", e.target.value)
                            }
                          />
                        </td>
                        <td className="align-middle text-center">
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => {
                              const newScores = studentData.scores.filter(
                                (_, i) => i !== index
                              );
                              setStudentData((prev) => ({
                                ...prev,
                                scores: newScores,
                              }));
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className="btn btn-secondary btn-sm mb-3"
                onClick={handleAddScore}
              >
                + Add Score
              </button>

              <div className="d-flex justify-content-between align-items-center mt-3">
                <h5 className="mb-0">
                  Calculated Percentage: {calculatePercentage()}%
                </h5>

                <div className="d-flex align-items-center">
                  <h5 className="me-3 mb-0">Main Grade:</h5>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    style={{ width: "100px" }}
                    placeholder="Final Grade"
                    value={studentData.mainGrade || ""}
                    onChange={(e) => handleMainGradeChange(e.target.value)}
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end mt-4">
                <button
                  className="btn btn-primary"
                  onClick={handleSaveGrades}
                  disabled={loading || !selectedStudent || !selectedSubject}
                >
                  {loading ? "Saving..." : "Save Grades"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}

export default TeacherGrading;
