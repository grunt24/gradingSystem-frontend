import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Table,
  Button,
  Spin,
  message,
  Typography,
  Card,
  Tag,
  Grid,
  Select, 
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import GradePercentage from "./Graph/GradePercentage";
import axiosInstance from "../../api/axiosInstance";
import loginService from "../../api/loginService";
import { debounce } from "lodash";
import { calculateMidtermGrade } from "../../utils/gradeCalculations";
import "./MidtermGrades.css";

const { useBreakpoint } = Grid;

const API_URL = "/GradeCalculation/students-midtermGrades";
const UPDATE_API_URL = "/GradeCalculation";
const { Title } = Typography;

// ------------------------------------------------------------------
// 🛑 UPDATED SafeNumberInput: Uses local state and standard HTML <input>
// ------------------------------------------------------------------
const SafeNumberInput = ({ value, onChange, min = 0, max = 999, style, ...rest }) => {
  // Use internal state to hold the input string for fluid typing
  const [inputValue, setInputValue] = useState(String(value ?? ""));

  // Sync internal state with external prop `value` when it changes from outside
  useEffect(() => {
    // Only update if the external value is numerically different from the internal value
    if (Number(inputValue) !== value) {
      setInputValue(String(value ?? ""));
    }
  }, [value]);

  // Handle every change (keystroke)
  const handleChange = (e) => {
    const rawValue = e.target.value;
    
    // Allow empty string (for clearing) or strings containing only digits
    if (rawValue === "" || /^\d+$/.test(rawValue)) {
      setInputValue(rawValue);
      
      // Pass the fully parsed number back immediately to trigger external state change
      // Pass 0 if the input is empty string
      onChange(Number(rawValue) || 0); 
    } else {
        message.warning("Only numbers (0–9) are allowed");
    }
  };
  
  // Use onBlur to enforce limits/cleanup when the user leaves the field
  const handleBlur = () => {
      let finalValue = Number(inputValue);
      
      // Enforce min and max limits
      if (finalValue > max) {
          finalValue = max;
          message.warning(`Maximum allowed score is ${max}`);
      }
      if (finalValue < min) {
          finalValue = min;
      }
      
      // If the input was blank/invalid (NaN), set to 0
      if (isNaN(finalValue)) {
          finalValue = 0;
      }
      
      // Update the local state to reflect the final, clean number
      setInputValue(String(finalValue));
      
      // Call external onChange one last time with the clean number
      onChange(finalValue);
  }


  return (
    <input
      // 🛑 Using type="text" for better control and preventing Ant Design InputNumber issues
      type="text"
      value={inputValue}
      onChange={handleChange}
      onBlur={handleBlur}
      // Apply Ant Design InputNumber styling
      style={{ 
          width: 60, 
          textAlign: 'center', 
          border: '1px solid #d9d9d9', 
          borderRadius: 4, 
          padding: '4px 11px', 
          height: 32,
          ...style 
      }}
      // Disable Ant Design's default numeric steppers/scrolling behavior
      onWheel={(e) => e.currentTarget.blur()}
      {...rest}
    />
  );
};
// ------------------------------------------------------------------
// 🛑 END OF UPDATED SafeNumberInput
// ------------------------------------------------------------------


export default function MidtermGradesTableContent() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quizCountBySubject, setQuizCountBySubject] = useState({});
  const [classStandingCountBySubject, setClassStandingCountBySubject] =
    useState({});
  const [subjectTotals, setSubjectTotals] = useState({});
  const [weights, setWeights] = useState(null);
  const [gradeScale, setGradeScale] = useState([]);
  const academicPeriod = loginService.getAcademicPeriod();
  const academicPeriodId = academicPeriod?.academicYearId;
  const academicYear = academicPeriod?.academicYear;
  const semester = academicPeriod?.semester;
  
  // 🛑 NEW STATE: To store available students keyed by SubjectId, replacing the old global list
  const [availableStudentsBySubject, setAvailableStudentsBySubject] = useState({});

  const modifiedGradesRef = useRef(new Map());

  // Function to fetch all grade data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const gradesResp = await axiosInstance.get(API_URL);
      const fetchedGrades = gradesResp.data?.data || [];

      setGrades(fetchedGrades);

      const quizCounts = {};
      const csCounts = {};
      const totalsBySubject = {};

      fetchedGrades.forEach((g) => {
        if (!quizCounts[g.subjectName]) {
          quizCounts[g.subjectName] = (g.quizzes || []).length || 1;
        }
        if (!csCounts[g.subjectName]) {
          csCounts[g.subjectName] = (g.classStandingItems || []).length || 1;
        }

        if (!totalsBySubject[g.subjectName]) {
          totalsBySubject[g.subjectName] = {
            quizTotals: {},
            classStandingTotals: {},
            prelimTotal: g.prelimTotal || 0,
            midtermTotal: g.midtermTotal || 0,
          };
        }

        (g.quizzes || []).forEach((q, idx) => {
          totalsBySubject[g.subjectName].quizTotals[idx + 1] =
            q.totalQuizScore || 0;
        });

        (g.classStandingItems || []).forEach((c, idx) => {
          totalsBySubject[g.subjectName].classStandingTotals[idx + 1] =
            c.total || 0;
        });
      });

      setQuizCountBySubject(quizCounts);
      setClassStandingCountBySubject(csCounts);
      setSubjectTotals(totalsBySubject);

      console.log("Data loaded:", fetchedGrades.length, "grades");
    } catch (err) {
      console.error("Failed to load data:", err);
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  // ❌ REMOVED: fetchAllStudents function (replaced by fetchAvailableStudentsForSubject)

  const fetchWeightsAndScale = async () => {
    try {
      const [weightsResp, scaleResp] = await Promise.all([
        axiosInstance.get("/GradeCalculation/grade-percentage"),
        axiosInstance.get("/GradeCalculation/equivalents"),
      ]);

      const weightsData = weightsResp.data?.data || weightsResp.data;
      const scaleData = scaleResp.data?.data || scaleResp.data;

      setWeights(weightsData);
      setGradeScale(Array.isArray(scaleData) ? scaleData : [scaleData]);
    } catch (err) {
      message.error("Failed to load grade configuration");
    }
  };

  // 🛑 NEW FUNCTION: Fetches students available for a specific subject
  const fetchAvailableStudentsForSubject = useCallback(async (subjectId, subjectName) => {
    // Prevent fetching if subjectId is invalid
    if (!subjectId) return;

    try {
      const res = await axiosInstance.get(
        // Use the new endpoint
        `/StudentSubjects/available-for-subject/${subjectId}`
      );
      
      // Ensure we treat non-array results (like a message string from the server) as an empty list
      const students = Array.isArray(res.data) ? res.data : [];

      setAvailableStudentsBySubject(prev => ({
        ...prev,
        [subjectId]: students,
      }));

    } catch (err) {
      console.error(`Failed to fetch available students for ${subjectName}:`, err);
    }
  }, []); 

  useEffect(() => {
    fetchWeightsAndScale();
    fetchAllData(); // Initial grade data load
    // ❌ REMOVED: fetchAllStudents call
  }, []);

  // 🛑 NEW EFFECT: Triggers fetchAvailableStudentsForSubject for all displayed subjects
  useEffect(() => {
    const uniqueSubjects = grades.reduce((acc, grade) => {
        // Collect unique subjectId and subjectName pairs
        if (grade.subjectId && !acc.some(s => s.subjectId === grade.subjectId)) {
            acc.push({ subjectId: grade.subjectId, subjectName: grade.subjectName });
        }
        return acc;
    }, []);

    uniqueSubjects.forEach(({ subjectId, subjectName }) => {
        // Only fetch if the data hasn't been loaded yet for this subjectId
        if (!availableStudentsBySubject.hasOwnProperty(subjectId)) {
             fetchAvailableStudentsForSubject(subjectId, subjectName);
        }
    });

  }, [grades, fetchAvailableStudentsForSubject, availableStudentsBySubject]);

  const gradesRef = useRef(grades);

  useEffect(() => {
    gradesRef.current = grades;
  }, [grades]);

  const saveToBackend = useCallback(async () => {
    if (modifiedGradesRef.current.size === 0) {
      console.log("⚠️ No changes to save");
      return;
    }
    // ... (rest of saveToBackend logic remains the same)
    try {
      setSaving(true);
      const currentGrades = gradesRef.current;
      /* ✅ Inject correct subject totals into EACH student */
      const syncedGrades = currentGrades.map((student) => {
        const subjectTotal = subjectTotals[student.subjectName];
        if (subjectTotal) {
          return {
            ...student,
            prelimTotal: subjectTotal.prelimTotal || 0,
            midtermTotal: subjectTotal.midtermTotal || 0,
          };
        }
        return student;
      });
      /* ✅ Build payload with correct totals */
      const payload = syncedGrades
        // Filter out the permanent "add student" row
        .filter(student => !student.key?.startsWith('ADD_STUDENT_ROW_'))
        .map((student) => ({
        id: student.id,
        studentId: student.studentId,
        subjectId: student.subjectId,
        academicPeriodId: academicPeriodId,
        studentNumber: student.studentNumber,
        studentFullName: student.studentFullName,
        department: student.department,
        subjectCode: student.subjectCode,
        subjectName: student.subjectName,
        subjectTeacher: student.subjectTeacher,
        semester: semester,
        academicYear: academicYear,
        quizzes: (student.quizzes || []).map((q) => ({
          id: q.id || 0,
          label: q.label,
          quizScore: Number(q.quizScore) || 0,
          totalQuizScore: Number(q.totalQuizScore) || 0,
        })),
        totalQuizScore: student.totalQuizScore || 0,
        quizPG: student.quizPG || 0,
        quizWeighted: student.quizWeighted || 0,
        classStandingItems: (student.classStandingItems || []).map((cs) => ({
          id: cs.id || 0,
          label: cs.label,
          score: Number(cs.score) || 0,
          total: Number(cs.total) || 0,
        })),
        recitationScore: student.recitationScore || 0,
        attendanceScore: student.attendanceScore || 0,
        classStandingTotalScore: student.classStandingTotalScore || 0,
        classStandingAverage: student.classStandingAverage || 0,
        classStandingPG: student.classStandingPG || 0,
        classStandingWeighted: student.classStandingWeighted || 0,
        sepScore:
          student.department?.toUpperCase() === "BSED"
            ? student.sepScore || 0
            : 0,
        seppg: student.seppg || 0,
        sepWeightedTotal: student.sepweightedTotal || 0,
        projectScore: student.projectScore || 0,
        projectPG: student.projectPG || 0,
        projectWeighted: student.projectWeighted || 0,
        prelimScore: student.prelimScore || 0,
        prelimTotal: student.prelimTotal || 0,
        midtermScore: student.midtermScore || 0,
        midtermTotal: student.midtermTotal || 0,
        totalScorePerlimAndMidterm: student.totalScorePerlimAndMidterm || 0,
        overallPrelimAndMidterm: student.overallPrelimAndMidterm || 0,
        combinedPrelimMidtermAverage: student.combinedPrelimMidtermAverage || 0,
        midtermPG: student.midtermPG || 0,
        midtermExamWeighted: student.midtermExamWeighted || 0,
        totalMidtermGrade: student.totalMidtermGrade || 0,
        totalMidtermGradeRounded: student.totalMidtermGradeRounded || 0,
        gradePointEquivalent: student.gradePointEquivalent || 0,
      }));
      console.log("✅ Sending payload with", payload.length, "grades");
      /* ✅ Log correct modified rows */
      const modifiedIds = Array.from(modifiedGradesRef.current.keys());
      console.log("✅ Modified IDs:", modifiedIds);
      const lastModifiedId = modifiedIds.find(id => !id.startsWith('ADD_STUDENT_ROW_'));
      const modifiedGradePayload = payload.find((p) => p.id === lastModifiedId);
      console.log("✅ Last modified grade in payload:", {
        id: modifiedGradePayload?.id,
        studentId: modifiedGradePayload?.studentId,
        prelimScore: modifiedGradePayload?.prelimScore,
        prelimTotal: modifiedGradePayload?.prelimTotal,
        midtermScore: modifiedGradePayload?.midtermScore,
        midtermTotal: modifiedGradePayload?.midtermTotal,
        totalMidtermGrade: modifiedGradePayload?.totalMidtermGrade,
      });
      await axiosInstance.put(`${UPDATE_API_URL}/batch-update`, payload);
      // ⏳ Wait 2 seconds before triggering midterm recalculation
      await new Promise((resolve) => setTimeout(resolve, 2000));
      // 🔥 Call your calculate-midterm-all endpoint
      await axiosInstance.post(`${UPDATE_API_URL}/calculate-midterm-all`);
      modifiedGradesRef.current.clear();
      message.success("✅ Grades saved & midterm recalculated!");
      
      // ✅ RELOAD: Fetch new data after successful save and recalculation
      fetchAllData();
    } catch (err) {
      message.error(
        "❌ Failed to save: " + (err.response?.data?.message || err.message)
      );
    } finally {
      setSaving(false);
    }
  }, [academicPeriodId, academicYear, semester, subjectTotals, fetchAllData]);

  // Debounced version
  const debouncedSave = useCallback(
    debounce(() => {
      saveToBackend();
    }, 2000),
    [saveToBackend]
  );

  const handleInputChange = (
    recordId,
    field,
    value,
    quizIndex = null,
    csIndex = null
  ) => {
    console.log("Input changed:", {
      recordId,
      field,
      value,
      quizIndex,
      csIndex,
    });

    setGrades((prevGrades) => {
      const newGrades = prevGrades.map((grade) => {
        if (grade.id !== recordId) return grade;
        // Don't modify the permanent Add Row
        if (String(recordId).startsWith('ADD_STUDENT_ROW_')) return grade;

        const updatedGrade = { ...grade };

        // 🛑 Convert value to a number here for calculation/storage uniformity
        const numericValue = Number(value) || 0; 

        if (quizIndex !== null) {
          const quizzes = [...(updatedGrade.quizzes || [])];
          while (quizzes.length <= quizIndex) {
            quizzes.push({
              label: `quiz${quizzes.length + 1}`,
              quizScore: 0,
              totalQuizScore: 0,
            });
          }
          quizzes[quizIndex] = {
            ...quizzes[quizIndex],
            [field]: numericValue, // Use numericValue
          };
          updatedGrade.quizzes = quizzes;
        } else if (csIndex !== null) {
          const classStandingItems = [
            ...(updatedGrade.classStandingItems || []),
          ];
          while (classStandingItems.length <= csIndex) {
            classStandingItems.push({
              label: `classStanding${classStandingItems.length + 1}`,
              score: 0,
              total: 0,
            });
          }
          classStandingItems[csIndex] = {
            ...classStandingItems[csIndex],
            [field]: numericValue, // Use numericValue
          };
          updatedGrade.classStandingItems = classStandingItems;
        } else {
          updatedGrade[field] = numericValue; // Use numericValue
        }

        modifiedGradesRef.current.set(recordId, updatedGrade);

        if (weights && gradeScale.length > 0) {
          const calculated = calculateMidtermGrade(
            updatedGrade,
            weights,
            gradeScale
          );
          console.log("Calculated grade:", calculated.totalMidtermGrade);

          // Update the ref with calculated values
          modifiedGradesRef.current.set(recordId, calculated);

          return calculated;
        }

        return updatedGrade;
      });

      return newGrades;
    });

    debouncedSave();
  };

  // Update totals handler
  const updateTotals = (subjectName, field, index, val) => {
    console.log("Updating totals:", { subjectName, field, index, val });

    // 🛑 Convert value to a number here for calculation/storage uniformity
    const numericVal = Number(val) || 0; 


    setSubjectTotals((prev) => {
      const currentSubject = prev[subjectName] || {
        quizTotals: {},
        classStandingTotals: {},
        prelimTotal: 0,
        midtermTotal: 0,
      };

      if (field === "prelimTotal" || field === "midtermTotal") {
        return {
          ...prev,
          [subjectName]: {
            ...currentSubject,
            [field]: numericVal, // Use numericVal
          },
        };
      }

      return {
        ...prev,
        [subjectName]: {
          ...currentSubject,
          [field]: {
            ...currentSubject[field],
            [index]: numericVal, // Use numericVal
          },
        },
      };
    });

    // Update all grades for this subject with new totals
    setGrades((prevGrades) => {
      return prevGrades.map((grade) => {
        if (grade.subjectName !== subjectName) return grade;
        // Don't modify the permanent Add Row
        if (grade.key?.startsWith('ADD_STUDENT_ROW_')) return grade;

        const updatedGrade = { ...grade };

        if (field === "prelimTotal") {
          updatedGrade.prelimTotal = numericVal; // Use numericVal
        } else if (field === "midtermTotal") {
          updatedGrade.midtermTotal = numericVal; // Use numericVal
        } else if (field === "quizTotals") {
          const quizzes = [...(updatedGrade.quizzes || [])];
          if (quizzes[index - 1]) {
            quizzes[index - 1].totalQuizScore = numericVal; // Use numericVal
          }
          updatedGrade.quizzes = quizzes;
        } else if (field === "classStandingTotals") {
            // 💡 FIX: Ensure the student's classStandingItems array is long enough 
            // for the index being updated before setting the total score.
            let classStandingItems = [
                ...(updatedGrade.classStandingItems || []),
            ];
            
            // Pad the array up to the required index (index is 1-based, array is 0-based)
            while (classStandingItems.length < index) { 
                classStandingItems.push({
                    label: `classStanding${classStandingItems.length + 1}`,
                    score: 0,
                    total: 0,
                });
            }

            // Now safely set the new total value for this item (index - 1)
            if (classStandingItems[index - 1]) {
                classStandingItems[index - 1].total = numericVal;
            }
          
            updatedGrade.classStandingItems = classStandingItems;
        }

        // Mark as modified
        modifiedGradesRef.current.set(grade.id, updatedGrade);

        if (weights && gradeScale.length > 0) {
          const recalculated = calculateMidtermGrade(
            updatedGrade,
            weights,
            gradeScale
          );

          modifiedGradesRef.current.set(grade.id, recalculated);

          return recalculated;
        }

        return updatedGrade;
      });
    });

    debouncedSave();
  };

  const subjects = [...new Set(grades.map((g) => g.subjectName))];

  // ✅ UPDATED HANDLER: Student selection and assignment
  const handleStudentSelect = async (studentId, studentOption) => {
    const subjectName = studentOption.subjectName;
    const subjectId = studentOption.subjectId;
    
    if (!subjectId) {
        message.error("Cannot add student: Subject ID not found.");
        return;
    }

    try {
        message.loading(`Adding ${studentOption.label} to ${subjectName}...`, 0);

        // API call using the corrected DTO format (StudentIds)
        await axiosInstance.post("/StudentSubjects", {
            StudentIds: [studentId], // Pass the single student ID inside an array
            subjectIds: [subjectId],
        });

        message.destroy();
        toast.success(`${studentOption.label} assigned successfully!`);
        
        // 1. Reload the table data (fetchAllData)
        fetchAllData(); 
        
        // 2. 🛑 RE-FETCH: Refresh the list of *available* students for this subject
        // This is crucial to immediately remove the assigned student from the dropdown.
        fetchAvailableStudentsForSubject(subjectId, subjectName);

    } catch (err) {
        message.destroy();
        console.error(err);
        toast.error(
            err.response?.data?.message ||
            `Failed to assign ${studentOption.label} to subject.`
        );
    }
  };


  const renderTableForSubject = (subjectName) => {
    const subjectGrades = grades.filter((g) => g.subjectName === subjectName);

    const hasBSED = subjectGrades.some(
      (g) => g.department?.trim().toUpperCase() === "BSED"
    );

    const firstGrade = subjectGrades[0] || {};
    const firstDept = firstGrade.department?.trim().toUpperCase();
    const classStandingPercentTitle = firstDept === "BSED" ? "25%" : "30%";

    const quizCount = quizCountBySubject[subjectName] || 1;
    const csCount = classStandingCountBySubject[subjectName] || 1;
    const totals = subjectTotals[subjectName] || {
      quizTotals: {},
      classStandingTotals: {},
      prelimTotal: 0,
      midtermTotal: 0,
    };
    
    // ✅ NEW: Define the permanent ADD_ROW_KEY
    const ADD_ROW_KEY = `ADD_STUDENT_ROW_${subjectName}`;
    const subjectId = firstGrade.subjectId; // Get the subjectId

    const addQuizColumn = () => {
      setQuizCountBySubject((prev) => ({
        ...prev,
        [subjectName]: (prev[subjectName] || 3) + 1,
      }));
    };

    const addClassStandingColumn = () => {
      setClassStandingCountBySubject((prev) => ({
        ...prev,
        [subjectName]: (prev[subjectName] || 3) + 1,
      }));
    };

    // 🛑 UPDATED: Get list from subject-specific state
    const studentsForSelectRaw = availableStudentsBySubject[subjectId] || [];

    const studentsForSelect = studentsForSelectRaw.map(student => ({
        value: student.id,
        // The API returns 'fullname'
        label: student.fullname,
        subjectId: firstGrade.subjectId, 
        subjectName: subjectName,       
    }));
        
    // Prepare table data source
    let dataSource = [...subjectGrades].map(g => ({...g, key: g.id}));

    // ✅ ALWAYS ADD THE PERMANENT SELECT ROW
    dataSource.push({
        id: ADD_ROW_KEY, // Use a unique ID string
        key: ADD_ROW_KEY,
        studentFullName: '', // Empty value for the Select component
        subjectId: firstGrade.subjectId,
        subjectName: subjectName,
        // Include minimal placeholder data to avoid rendering errors in other columns
        quizzes: Array(quizCount).fill({ quizScore: 0, totalQuizScore: totals.quizTotals[1] || 0 }), 
        classStandingItems: Array(csCount).fill({ score: 0, total: totals.classStandingTotals[1] || 0 }), 
        recitationScore: 0, attendanceScore: 0, projectScore: 0, prelimScore: 0, midtermScore: 0,
    });


    // Helper to return null for the special "Add Student" row in data columns
    const renderCell = (renderFunc) => (_, record) => {
      if (record.key === ADD_ROW_KEY) return null;
      return renderFunc(_, record);
    };

    const quizColumns = Array.from({ length: quizCount }, (_, i) => ({
      title: `Q${i + 1}`,
      align: "center",
      width: 100, // Added fixed width
      children: [
        {
          title: (
            <SafeNumberInput
              min={1}
              value={totals.quizTotals[i + 1] || ""}
              onChange={(val) =>
                updateTotals(subjectName, "quizTotals", i + 1, val)
              }
              style={{ width: 50 }}
              placeholder="Total"
            />
          ),
          align: "center",
          width: 100, // Added fixed width
          render: renderCell((_, record) => ( // Use renderCell
                <SafeNumberInput
                min={0}
                max={totals.quizTotals[i + 1] || Infinity}
                value={record.quizzes?.[i]?.quizScore || 0}
                onChange={(val) =>
                    handleInputChange(record.id, "quizScore", val, i, null)
                }
                style={{ width: 50, textAlign: "center" }}
                placeholder="Score"
                />
            )
          )
        },
      ],
    }));

    const classStandingColumns = Array.from({ length: csCount }, (_, i) => {
      const initialTotalValue =
        firstGrade?.classStandingItems?.[i]?.total ||
        totals.classStandingTotals[i + 1] ||
        "";

      return {
        title: `CS${i + 1}`,
        width: 70, // Added fixed width
        children: [
          {
            title: (
              <SafeNumberInput
                min={1}
                value={initialTotalValue}
                onChange={(val) =>
                  updateTotals(subjectName, "classStandingTotals", i + 1, val)
                }
                style={{ width: 60 }}
                placeholder="Total"
              />
            ),
            width: 110, // Added fixed width
            render: renderCell((_, record) => ( // Use renderCell
                    <SafeNumberInput
                    min={0} // MAX value should still come from the subjectTotals state for correct validation
                    max={totals.classStandingTotals[i + 1] || Infinity}
                    value={record.classStandingItems?.[i]?.score || 0}
                    onChange={(val) =>
                        handleInputChange(record.id, "score", val, null, i)
                    }
                    style={{ width: 55 }}
                    placeholder="Score"
                    />
                )
            )
          },
        ],
      };
    });

    const columns = [
      {
        title: "Name",
        dataIndex: "studentFullName",
        key: "studentFullName",
        fixed: "left",
        width: 250, // Increased width for the Select component
        render: (text, record) => {
            if (record.key === ADD_ROW_KEY) {
                // Check if the subject's student list has been loaded (i.e., it exists in the map)
                const isStudentsLoaded = availableStudentsBySubject.hasOwnProperty(subjectId);

                return (
                    <Select
                        showSearch
                        style={{ width: '100%' }}
                        // 🛑 Placeholder indicates fetching status or availability
                        placeholder={
                            !subjectId 
                                ? "Subject ID missing" 
                                : !isStudentsLoaded 
                                    ? "Loading available students..." 
                                    : studentsForSelect.length === 0 
                                        ? "No Available Students" 
                                        : "Select a student to add"
                        }
                        optionFilterProp="children"
                        // Pass subject info via the onChange and option payload
                        onChange={handleStudentSelect} 
                        options={studentsForSelect}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        // 🛑 Disable if subjectId is missing, still loading, or list is empty
                        disabled={!subjectId || !isStudentsLoaded || studentsForSelect.length === 0} 
                        value={null} // Keep the Select unselected
                    />
                );
            }
            return text;
        }
      },
      {
        title: (
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            <span>QUIZZES</span>
            <Button
              icon={<PlusOutlined />}
              size="small"
              onClick={addQuizColumn}
            />
          </div>
        ),

        children: [
          // All Q1, Q2, Q3...
          ...quizColumns,

          // Total Quiz (right side)
          {
            title: (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "bold", fontSize: 12 }}>
                  Total Quiz
                </div>
                <Tag
                  color="green"
                  style={{ fontWeight: 600, marginLeft: 6, fontSize: 11 }}
                >
                  OTQ:{" "}
                  {Object.values(totals.quizTotals || {}).reduce(
                    (sum, val) => sum + (Number(val) || 0),
                    0
                  )}
                </Tag>
              </div>
            ),
            align: "center",
            width: 100,
            render: renderCell((_, record) => { // Use renderCell
              const total = (record.quizzes || []).reduce(
                (sum, q) => sum + (q.quizScore || 0),
                0
              );
              return <Tag color="blue">{total}</Tag>;
            }),
          },

          // PG (last)
          {
            title: "PG",
            width: 80,
            render: renderCell((_, record) => ( // Use renderCell
              <Tag color="blue">{record.quizPG?.toFixed(2) || "0.00"}</Tag>
            )),
          },
        ],
      },
      {
        title: "30%",
        width: 80,
        render: renderCell((_, record) => ( // Use renderCell
          <Tag color="green">
            {record.quizWeightedTotal?.toFixed(2) || "0.00"}
          </Tag>
        )),
      },
      {
        title: (
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            <span>CLASS STANDING</span>
            <Button
              icon={<PlusOutlined />}
              size="small"
              onClick={addClassStandingColumn}
            />
          </div>
        ),

        children: [
          // 👉 Recitation (left side)
          {
            title: "Rec",
            width: 80,
            render: renderCell((_, record) => ( // Use renderCell
              <SafeNumberInput
                min={0}
                value={record.recitationScore || 0}
                onChange={(val) =>
                  handleInputChange(record.id, "recitationScore", val)
                }
                style={{ width: 60 }}
              />
            )),
          },

          // 👉 Attendance (left side)
          {
            title: "Attendance",
            width: 80,
            render: renderCell((_, record) => ( // Use renderCell
              <SafeNumberInput
                min={0}
                value={record.attendanceScore || 0}
                onChange={(val) =>
                  handleInputChange(record.id, "attendanceScore", val)
                }
                style={{ width: 60 }}
              />
            )),
          },

          // All dynamic CS columns
          ...classStandingColumns,

          // Total CS (right side)
          {
            title: (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "bold", fontSize: 12 }}>Total CS</div>
                <Tag
                  color="green"
                  style={{ fontWeight: 600, marginLeft: 6, fontSize: 11 }}
                >
                  OCS:{" "}
                  {Object.values(totals.classStandingTotals || {}).reduce(
                    (sum, val) => sum + (Number(val) || 0),
                    0
                  )}
                </Tag>
              </div>
            ),
            width: 90,
            render: renderCell((_, record) => { // Use renderCell
              const total = (record.classStandingItems || []).reduce(
                (sum, cs) => sum + (cs.score || 0),
                0
              );
              return <Tag color="purple">{total}</Tag>;
            }),
          },

          // PG column
          {
            title: "PG",
            width: 80,
            render: renderCell((_, record) => ( // Use renderCell
              <Tag color="blue">
                {record.classStandingPG?.toFixed(2) || "0.00"}
              </Tag>
            )),
          },
          {
            title: "AVE",
            width: 80,
            render: renderCell((_, record) => ( // Use renderCell
              <Tag color="blue">
                {record.classStandingAverage?.toFixed(2) || "0.00"}
              </Tag>
            )),
          },

          // Weighted 20%
        ],
      },
      {
        title: classStandingPercentTitle,
        width: 80,
        render: renderCell((_, record) => ( // Use renderCell
          <Tag color="green">
            {record.classStandingWeighted?.toFixed(2) || "0.00"}
          </Tag>
        )),
      },
      ...(hasBSED
        ? [
            {
              title: "SEP",
              width: 70,
              align: "center",
              render: renderCell((_, record) => { // Use renderCell
                if (record.department?.trim().toUpperCase() !== "BSED") {
                  return null; // hides the cell for non-BSED
                }
                return (
                  <SafeNumberInput
                    min={0}
                    value={record.sepScore || 0}
                    onChange={(val) =>
                      handleInputChange(record.id, "sepScore", val)
                    }
                    style={{ width: 55 }}
                  />
                );
              }),
            },
          ]
        : []),
      ...(hasBSED
        ? [
            {
              title: "5%",
              width: 80,
              render: renderCell((_, record) => ( // Use renderCell
                <Tag color="green">
                  {record.sepWeightedTotal?.toFixed(2) || "0.00"}
                </Tag>
              )),
            },
          ]
        : []),

      {
        title: "Project",
        width: 70, // Reduced from 100
        render: renderCell((_, record) => ( // Use renderCell
          <SafeNumberInput
            min={0}
            value={record.projectScore || 0}
            onChange={(val) =>
              handleInputChange(record.id, "projectScore", val)
            }
            style={{ width: 55 }}
          />
        )),
      },
      {
        title: "10%",
        width: 80,
        render: renderCell((_, record) => ( // Use renderCell
          <Tag color="green">
            {record.projectWeighted?.toFixed(2) || "0.00"}
          </Tag>
        )),
      },
      {
        title: "Prelim",
        width: 90, // Added width
        children: [
          {
            title: (
              <div style={{ textAlign: "center" }}>
                <SafeNumberInput
                  min={0}
                  value={totals.prelimTotal || 0}
                  onChange={(val) =>
                    updateTotals(subjectName, "prelimTotal", null, val)
                  }
                  style={{ width: 50 }}
                />
              </div>
            ),
            width: 90, // Reduced from 100
            render: renderCell((_, record) => ( // Use renderCell
              <SafeNumberInput
                min={0}
                max={totals.prelimTotal || 0}
                value={record.prelimScore || 0}
                onChange={(val) =>
                  handleInputChange(record.id, "prelimScore", val)
                }
                style={{ width: 60 }}
              />
            )),
          },
        ],
      },
      {
        title: "Midterm",
        width: 90, // Added width
        children: [
          {
            title: (
              <div style={{ textAlign: "center" }}>
                <SafeNumberInput
                  min={0}
                  value={totals.midtermTotal || 0}
                  onChange={(val) =>
                    updateTotals(subjectName, "midtermTotal", null, val)
                  }
                  style={{ width: 60 }}
                />
              </div>
            ),
            width: 90, // Reduced from 100
            render: renderCell((_, record) => ( // Use renderCell
              <SafeNumberInput
                min={0}
                max={totals.midtermTotal}
                value={record.midtermScore || 0}
                onChange={(val) =>
                  handleInputChange(record.id, "midtermScore", val)
                }
                style={{ width: 60 }}
              />
            )),
          },
        ],
      },

      {
        title: (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: "bold", fontSize: 12 }}>TS</div>
            <Tag
              color="green"
              style={{ fontWeight: 600, marginTop: 4, fontSize: 11 }}
            >
              TS: {(totals.prelimTotal || 0) + (totals.midtermTotal || 0)}
            </Tag>
          </div>
        ),
        width: 60, // Reduced from 120
        render: renderCell((_, record) => { // Use renderCell
          const prelim = record.prelimScore || 0;
          const midterm = record.midtermScore || 0;
          const total = prelim + midterm;
          return (
            <Tag color="purple" style={{ fontWeight: 600 }}>
              {total}
            </Tag>
          );
        }),
      },
      {
        title: "AVE",
        width: 80,
        render: renderCell((_, record) => ( // Use renderCell
          <Tag color="green">
            {record.combinedPrelimMidtermAverage?.toFixed(2) || "0.00"}
          </Tag>
        )),
      },
      {
        title: "30%",
        width: 80,
        render: renderCell((_, record) => ( // Use renderCell
          <Tag color="green">
            {record.midtermExamWeighted?.toFixed(2) || "0.00"}
          </Tag>
        )),
      },

      {
        title: "Grade",
        dataIndex: "totalMidtermGrade",
        key: "totalMidtermGrade",
        fixed: "right",
        width: 60, // Reduced from 120
        render: renderCell((val) => ( // Use renderCell
          <strong style={{ color: "#1890ff" }}>
            {val?.toFixed(2) || "0.00"}
          </strong>
        )),
      },
      {
        title: "Equiv",
        dataIndex: "gradePointEquivalent",
        key: "gradePointEquivalent",
        // fixed: "right",
        width: 60, // Reduced from 100
        render: renderCell((val) => ( // Use renderCell
          <strong style={{ color: "#52c41a" }}>
            {val?.toFixed(2) || "0.00"}
          </strong>
        )),
      },
    ];

    return (
      <Card
        key={subjectName}
        title={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Title level={4} style={{ margin: 0 }}>
              {subjectName}
            </Title>
          </div>
        }
        style={{ marginBottom: 32 }}
      >
        <div style={{ overflowX: "auto" }}>
          <Table
            className="midterm-table"
            columns={columns}
            // ✅ Use the modified data source including the new permanent row
            dataSource={dataSource} 
            pagination={false}
            bordered
            rowKey="id"
            scroll={{ x: "max-content" }}
            // Apply a distinct class to the permanent Select row
            rowClassName={(record) => {
                if (record.key === ADD_ROW_KEY) return 'add-student-row-highlight';
                return '';
            }}
          />
        </div>
      </Card>
    );
  };

  return (
    <Spin spinning={loading} tip="Loading...">
      <div style={{ marginBottom: 20 }}>
        <GradePercentage />
      </div>

      <div style={{ marginBottom: 16 }}>
        {saving && (
          <span style={{ marginLeft: 10, color: "#1890ff", fontWeight: 500 }}>
            ⏳ Auto-saving...
          </span>
        )}
      </div>

      <h5>
        AY {academicPeriod?.academicYear} - {academicPeriod?.semester} Semester
        Midterm
      </h5>

      {subjects.map((subjectName) => renderTableForSubject(subjectName))}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </Spin>
  );
}