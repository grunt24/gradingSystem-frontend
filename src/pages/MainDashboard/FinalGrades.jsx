import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Table,
  Button,
  Tag,
  Form,
  Spin,
  Typography,
  Card,
  message,
  // 🛑 REMOVED: InputNumber
  Select, // ✅ ADDED: Select
} from "antd";
import { SaveOutlined, PlusOutlined } from "@ant-design/icons";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "../../api/axiosInstance";
import loginService from "../../api/loginService";
import GradePercentage from "./Graph/GradePercentage";
import debounce from "lodash/debounce";
import './MidtermGrades.css';

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
      
      // Pass the fully parsed number back immediately to trigger external state change (Form/State update)
      // Pass 0 if the input is empty string
      onChange(Number(rawValue) || 0); 
    } else {
        // Prevent typing non-digits and show Ant Design warning
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
      // Using type="text" for better control
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
      // Disable default numeric steppers/scrolling behavior
      onWheel={(e) => e.currentTarget.blur()}
      {...rest}
    />
  );
};
// ------------------------------------------------------------------
// 🛑 END OF UPDATED SafeNumberInput
// ------------------------------------------------------------------


const API_URL = "/GradeCalculation/students-finalGrades";
const UPDATE_API_URL = "/FinalsGrade";
const { Title } = Typography;

export default function FinalsGradesTableContent() {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editForm] = Form.useForm();
  const [quizCount, setQuizCount] = useState(1);
  const [classStandingCount, setClassStandingCount] = useState(1);
  const [quizTotals, setQuizTotals] = useState({});
  const [classStandingTotals, setClassStandingTotals] = useState({});
  const [finalsTotals, setFinalsTotals] = useState({});
  const academicPeriod = loginService.getAcademicPeriod();
  const academicPeriodId = academicPeriod?.academicYearId; // ID for API
  const academicYearId = academicPeriod?.academicYearId; // ID for API
  const academicYear = academicPeriod?.academicYear; // ID for API
  const semester = academicPeriod?.semester; // ID for API
  const [calculating, setCalculating] = useState(false);
  
  // ✅ NEW STATE for student adder
  const [availableStudents, setAvailableStudents] = useState([]); 

  // ref to hold debounced function so we can cancel on unmount
  const debouncedRef = useRef(null);

  // ✅ NEW: Fetch all students
  const fetchAllStudents = async () => {
    try {
      const { data: allStudents } = await axiosInstance.get(
        "/Auth/all-students"
      );
      setAvailableStudents(allStudents || []);
    } catch (err) {
      console.error(err);
      message.error("Failed to fetch all students.");
    }
  };

  useEffect(() => {
    fetchAllData();
    fetchAllStudents(); // ✅ Initial student list load
    // cleanup on unmount
    return () => {
      if (debouncedRef.current && debouncedRef.current.cancel) {
        debouncedRef.current.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(API_URL);
      setGrades(res.data?.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!grades.length) return;

    const quizMap = {};
    const csMap = {};
    const finalsMap = {};
    let maxQuiz = 0;
    let maxCS = 0;

    grades.forEach((g) => {
      const subj = g.subjectName;
      if (!quizMap[subj]) quizMap[subj] = {};
      if (!csMap[subj]) csMap[subj] = {};

      g.quizzes?.forEach((q, index) => {
        if (q.label && q.totalQuizScore !== undefined)
          quizMap[subj][q.label] = q.totalQuizScore;
      });

      g.classStandingItems?.forEach((cs, index) => {
        if (cs.label && cs.total !== undefined) csMap[subj][cs.label] = cs.total;
      });

      if (g.finalsTotal !== undefined && g.finalsTotal !== null)
        finalsMap[subj] = g.finalsTotal;

      maxQuiz = Math.max(maxQuiz, g.quizzes?.length || 0);
      maxCS = Math.max(maxCS, g.classStandingItems?.length || 0);
    });

    setQuizTotals(quizMap);
    setClassStandingTotals(csMap);
    setFinalsTotals(finalsMap);

    setQuizCount(Math.max(1, maxQuiz));
    setClassStandingCount(Math.max(1, maxCS));
  }, [grades]);

  const addQuizColumn = () => setQuizCount((prev) => prev + 1);
  const addClassStandingColumn = () => setClassStandingCount((prev) => prev + 1);

  const handleCalculateGrades = useCallback(
    async (type) => {
      setCalculating(true);
      try {
        if (type === "finals") {
          await axiosInstance.post("/GradeCalculation/calculate-finals-all");
          message.success("Finals grades calculated successfully.");
        }
        await fetchAllData();
      } catch (err) {
        console.error(err);
        message.error("Failed to calculate grades.");
      } finally {
        setCalculating(false);
      }
    },
    [fetchAllData] // dependency added
  );

  const saveAll = useCallback(async () => {
    try {
      setLoading(true);
      const values = await editForm.validateFields();

      const payload = Object.keys(values)
        .map((recordId) => {
          // 🛑 NEW: Filter out the temporary student row if it somehow got form values
          if (String(recordId).startsWith('ADD_STUDENT_ROW_')) return null;

          const formItem = values[recordId];
          const student = grades.find((g) => g.id === parseInt(recordId));
          if (!student) return null;

          const subjTotals = {
            quizTotals: quizTotals[student.subjectName] || {},
            classStandingTotals: classStandingTotals[student.subjectName] || {},
            finalsTotal: finalsTotals[student.subjectName] ?? student.finalsTotal ?? 0,
          };

          return {
            ...student,
            academicPeriodId,
            academicYear,
            academicYearId,
            semester,
            attendanceScore: formItem.Attendance ?? student.attendanceScore ?? 0,
            recitationScore: formItem.Recitation ?? student.recitationScore ?? 0,
            projectScore: formItem["Project Score"] ?? student.projectScore ?? 0,
            sepScore:
              student.department?.toUpperCase() === "BSED"
                ? formItem.sepScore ?? student.sepScore ?? 0
                : 0,
            finalsScore: formItem.finalsScore ?? student.finalsScore ?? 0,
            finalsTotal: subjTotals.finalsTotal,
            quizzes: Object.entries(formItem)
              .filter(([key, val]) => key.startsWith("quiz") && val?.quizScore !== undefined)
              .map(([key, val]) => ({
                label: key,
                quizScore: val.quizScore,
                totalQuizScore: subjTotals.quizTotals[key] ?? val.totalQuizScore ?? 0,
              })),
            classStandingItems: Object.entries(formItem)
              .filter(([key, val]) => key.startsWith("classStanding") && val?.score !== undefined)
              .map(([key, val]) => ({
                label: key,
                score: val.score,
                total: subjTotals.classStandingTotals[key] ?? val.total ?? 0,
              })),
          };
        })
        .filter(Boolean);

      // send sequentially to preserve ordering and reduce server load spikes
      for (const record of payload) {
        await axiosInstance.put(`${UPDATE_API_URL}/${record.id}`, record);
      }
      message.success("✅ All finals grades saved successfully!");
    } catch (err) {
      console.error(err);
      message.error("❌ Failed to save grades.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm, grades, quizTotals, classStandingTotals, finalsTotals, academicPeriodId, academicYear, academicYearId, semester]);

  // Create/refresh debounced function whenever saveAll or calculate changes
  useEffect(() => {
    // cleanup old
    if (debouncedRef.current && debouncedRef.current.cancel) {
      debouncedRef.current.cancel();
    }

    // debounce 2000ms
    debouncedRef.current = debounce(async () => {
      try {
        // first save
        await saveAll();
        // then calculate finals
        await handleCalculateGrades("finals");
      } catch (err) {
        console.error("Auto save/calc failed:", err);
      }
    }, 2000);

    return () => {
      if (debouncedRef.current && debouncedRef.current.cancel) {
        debouncedRef.current.cancel();
      }
    };
  }, [saveAll, handleCalculateGrades]);

  // helper to trigger from input onChange
  const triggerAutoSaveAndCalculate = () => {
    if (debouncedRef.current) {
      debouncedRef.current();
    }
  };

  const subjects = [...new Set(grades.map((g) => g.subjectName))];

  // ✅ NEW HANDLER: Student selection and assignment
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
        
        // Reload the table and student list
        fetchAllData(); 
        fetchAllStudents(); 

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
    const isBSED = subjectGrades.some((g) => g.department?.toUpperCase() === "BSED");

    const firstGrade = subjectGrades[0] || {};
    
    // ✅ NEW: Define the permanent ADD_ROW_KEY
    const ADD_ROW_KEY = `ADD_STUDENT_ROW_${subjectName}`;

    // Prepare student list for Select component
    const existingStudentIds = new Set(subjectGrades.map(g => g.studentId));
    const studentsForSelect = availableStudents
        .filter(student => !existingStudentIds.has(student.id))
        .map(student => ({
            value: student.id,
            label: student.fullname,
            subjectId: firstGrade.subjectId, // Pass subject context
            subjectName: subjectName,       // Pass subject context
        }));

    // Prepare table data source: add the permanent select row
    let dataSource = [...subjectGrades].map(g => ({...g, key: g.id}));

    dataSource.push({
        id: ADD_ROW_KEY, // Use a unique ID string
        key: ADD_ROW_KEY,
        studentFullName: '', // Empty value for the Select component
        subjectId: firstGrade.subjectId,
        subjectName: subjectName,
        // Include minimal placeholder data to avoid rendering errors in other columns
        quizzes: Array(quizCount).fill({ quizScore: 0, totalQuizScore: 0 }),
        classStandingItems: Array(classStandingCount).fill({ score: 0, total: 0 }),
        recitationScore: 0, attendanceScore: 0, projectScore: 0, finalsScore: 0,
    });
        
    // ✅ NEW: Helper to return null for the special "Add Student" row in data columns
    const renderCell = (renderFunc) => (_, record) => {
      if (record.key === ADD_ROW_KEY) return null;
      return renderFunc(_, record);
    };


    const quizColumns = [
      {
        title: (
          <Button icon={<PlusOutlined />} size="small" onClick={addQuizColumn}></Button>
        ),
        children: [
          ...Array.from({ length: quizCount }, (_, i) => {
            const quizKey = `quiz${i + 1}`;
            const totalForThisQuiz =
              quizTotals[subjectName]?.[quizKey] ?? subjectGrades[0]?.quizzes?.[i]?.totalQuizScore ?? undefined;
            return {
              title: (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Q{i + 1}</div>
                  <SafeNumberInput
                    min={1}
                    value={totalForThisQuiz}
                    onChange={(val) => {
                      if (typeof val !== "number" || isNaN(val)) return;
                      setQuizTotals((prev) => ({
                        ...prev,
                        [subjectName]: { ...prev[subjectName], [quizKey]: val },
                      }));
                      // Use the full dataSource for updating form fields, including the new row for context
                      dataSource.forEach((record) =>
                        editForm.setFieldValue([record.id, quizKey, "totalQuizScore"], val)
                      );
                      // trigger auto save
                      triggerAutoSaveAndCalculate();
                    }}
                    style={{ width: 80, marginTop: 4 }}
                    placeholder="Total"
                  />
                </div>
              ),
              width: 100,
              key: quizKey,
              align: "center",
              render: renderCell((_, record) => ( // ✅ Applied renderCell
                <Form.Item name={[record.id, quizKey, "quizScore"]} initialValue={record.quizzes?.[i]?.quizScore} style={{ margin: 0 }}>
                  <SafeNumberInput
                    min={0}
                    max={quizTotals[subjectName]?.[quizKey] ?? subjectGrades[0]?.quizzes?.[i]?.totalQuizScore ?? Infinity}
                    style={{ width: 70 }}
                    placeholder="Score"
                    onChange={() => {
                      // Form will set the value; we just trigger debounced save+calc
                      triggerAutoSaveAndCalculate();
                    }}
                  />
                </Form.Item>
              )),
            };
          }),
          {
            title: (
              <div style={{ textAlign: "center" }}>
                {/* <div style={{ fontWeight: "bold" }}>Total Quiz</div> */}
                <div>
                  <Tag color="green" style={{ fontWeight: 600, marginLeft: 6 }}>
                    OTQ:{" "}
                    {Object.values(quizTotals[subjectName] || {}).reduce((sum, val) => sum + (Number(val) || 0), 0)}
                  </Tag>
                </div>
              </div>
            ),
            width: 100,
            render: renderCell((_, record) => { // ✅ Applied renderCell
              const total = (record.quizzes || []).reduce((sum, q) => sum + (q.quizScore || 0), 0);
              return <Tag color="blue">{total}</Tag>;
            }),
          },
                             {
                                title: "PG",
                                width: 80,
                                render: renderCell((_, record) => ( // ✅ Applied renderCell
                                  <Tag color="blue">{record.quizPG?.toFixed(2) || "0.00"}</Tag>
                                )),
                              },
        ],
      },
                  {
                    title: "30%",
                    width: 80,
                    render: renderCell((_, record) => ( // ✅ Applied renderCell
                      <Tag color="green">
                        {record.quizWeightedTotal?.toFixed(2) || "0.00"}
                      </Tag>
                    )),
                  },
    ];

    const classStandingColumns = [
      {
        title: <Button icon={<PlusOutlined />} size="small" onClick={addClassStandingColumn} />,
        children: [
          // Attendance inside CS group (left)
          {
            title: "Att",
            key: "Attendance",
            align: "center",
            width: 80,
            render: renderCell((_, record) => ( // ✅ Applied renderCell
              <Form.Item name={[record.id, "Attendance"]} initialValue={record.attendanceScore ?? 0} style={{ margin: 0 }}>
                <SafeNumberInput
                  min={0}
                  style={{ width: 60 }}
                  placeholder="Atten"
                  onChange={() => {
                    // update form value then trigger debounce
                    triggerAutoSaveAndCalculate();
                  }}
                />
              </Form.Item>
            )),
          },

          // Recitation inside CS group (after Attendance)
          {
            title: "Rec",
            key: "Recitation",
            align: "center",
            width: 80,
            render: renderCell((_, record) => ( // ✅ Applied renderCell
              <Form.Item name={[record.id, "Recitation"]} initialValue={record.recitationScore ?? 0} style={{ margin: 0 }}>
                <SafeNumberInput
                  min={0}
                  style={{ width: 60 }}
                  placeholder="Recit"
                  onChange={() => {
                    triggerAutoSaveAndCalculate();
                  }}
                />
              </Form.Item>
            )),
          },

          // dynamic class standing items
          ...Array.from({ length: classStandingCount }, (_, i) => {
            const csKey = `classStanding${i + 1}`;
            const totalForThisCS =
              classStandingTotals[subjectName]?.[csKey] ?? subjectGrades[0]?.classStandingItems?.[i]?.total ?? undefined;

            return {
              title: (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>CS {i + 1}</div>
                  <SafeNumberInput
                    min={1}
                    value={totalForThisCS}
                    onChange={(val) => {
                      if (typeof val !== "number" || isNaN(val)) return;
                      setClassStandingTotals((prev) => ({
                        ...prev,
                        [subjectName]: { ...prev[subjectName], [csKey]: val },
                      }));
                      dataSource.forEach((record) => editForm.setFieldValue([record.id, csKey, "total"], val));
                      triggerAutoSaveAndCalculate();
                    }}
                    style={{ width: 50, marginTop: 4 }}
                    placeholder="Total"
                  />
                </div>
              ),
              key: csKey,
              align: "center",
              render: renderCell((_, record) => ( // ✅ Applied renderCell
                <Form.Item name={[record.id, csKey, "score"]} initialValue={record.classStandingItems?.[i]?.score} style={{ margin: 0 }}>
                  <SafeNumberInput
                    min={0}
                    max={totalForThisCS ?? Infinity}
                    style={{ width: 70 }}
                    placeholder="Score"
                    onChange={() => {
                      triggerAutoSaveAndCalculate();
                    }}
                  />
                </Form.Item>
              )),
            };
          }),

          // Total CS column
          {
            title: (
              <div style={{ textAlign: "center" }}>
                {/* <div style={{ fontWeight: "bold" }}>Total CS</div> */}
                <Tag color="green" style={{ fontWeight: 600, marginLeft: 6 }}>
                  OCS:{" "}
                  {Object.values(classStandingTotals[subjectName] || {}).reduce((sum, val) => sum + (Number(val) || 0), 0)}
                </Tag>
              </div>
            ),
            width: 80,
            render: renderCell((_, record) => { // ✅ Applied renderCell
              const total = (record.classStandingItems || []).reduce((sum, cs) => sum + (cs.score || 0), 0);
              return <Tag color="purple">{total}</Tag>;
            }),
          },
                             {
                                title: "PG",
                                width: 80,
                                render: renderCell((_, record) => ( // ✅ Applied renderCell
                                  <Tag color="blue">
                                    {record.classStandingPG?.toFixed(2) || "0.00"}
                                  </Tag>
                                )),
                              },
                              
                                        {
                                          title: "AVE",
                                          width: 80,
                                          render: renderCell((_, record) => ( // ✅ Applied renderCell
                                            <Tag color="blue">
                                              {record.classStandingAverage?.toFixed(2) || "0.00"}
                                            </Tag>
                                          )),
                                        },
        ],
      },
    ];

    const otherColumns = [
      {
        title: "Name",
        dataIndex: "studentFullName",
        key: "studentFullName", // Added key
        fixed: "left",
        width: 250, // Increased width for the Select component
        render: (text, record) => { // ✅ Updated render for inline student adder
            if (record.key === ADD_ROW_KEY) {
                return (
                    <Select
                        showSearch
                        style={{ width: '100%' }}
                        placeholder={studentsForSelect.length === 0 ? "No Available Students" : "Select a student to add"}
                        optionFilterProp="children"
                        onChange={handleStudentSelect} 
                        options={studentsForSelect}
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        disabled={studentsForSelect.length === 0} 
                        value={null} 
                    />
                );
            }
            return text;
        }
      },
      {
        title: isBSED ? "25%" : "30%",   // same logic as midterm
        width: 80,
        render: renderCell((_, record) => ( // ✅ Applied renderCell
          <Tag color="green">
            {record.classStandingWeightedTotal?.toFixed(2) || "0.00"}
          </Tag>
        )),
      },

      // Project Score and SEP (if BSED) — these come after Attendance/Rec in the layout because those are in CS group now
      // PROJECT + 10% + SEP (BSED only)
      {
        title: "Project Score",
        key: "Project Score",
        render: renderCell((_, record) => ( // ✅ Applied renderCell
          <Form.Item
            name={[record.id, "Project Score"]}
            initialValue={record.projectScore ?? null}
            style={{ margin: 0 }}
          >
            <SafeNumberInput
              min={0}
              step={0.01}
              style={{ width: 60 }}
              placeholder="Project"
              onChange={triggerAutoSaveAndCalculate}
            />
          </Form.Item>
        )),
      },

      {
        title: "10%",
        key: "projectWeightedTotal",
        width: 80,
        render: renderCell((_, record) => ( // ✅ Applied renderCell
          <Tag color="green">
            {record.projectWeightedTotal?.toFixed(2) || "0.00"}
          </Tag>
        )),
      },

      // SEP only for BSED
      ...(isBSED
        ? [
            {
              title: "SEP",
              key: "sepScore",
              render: renderCell((_, record) => ( // ✅ Applied renderCell
                <Form.Item
                  name={[record.id, "sepScore"]}
                  initialValue={record.sepScore ?? null}
                  style={{ margin: 0 }}
                >
                  <SafeNumberInput
                    min={0}
                    step={0.01}
                    style={{ width: 60 }}
                    placeholder="SEP"
                    onChange={triggerAutoSaveAndCalculate}
                  />
                </Form.Item>
              )),
            },
            {
              title: "5%",
              key: "sepWeightedTotal",
              width: 80,
              render: renderCell((_, record) => ( // ✅ Applied renderCell
                <Tag color="green">
                  {record.sepWeightedTotal?.toFixed(2) || "0.00"}
                </Tag>
              )),
            },
          ]
        : []),

      {
        title: (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: "bold" }}>Final Exam Total</div>
            <SafeNumberInput
              min={1}
              value={finalsTotals[subjectName] ?? subjectGrades[0]?.finalsTotal ?? undefined}
              onChange={(val) => {
                if (typeof val !== "number" || isNaN(val)) return;
                setFinalsTotals((prev) => ({ ...prev, [subjectName]: val }));
                dataSource.forEach((record) => editForm.setFieldValue([record.id, "finalsTotal"], val));
                // trigger autosave after changing totals
                triggerAutoSaveAndCalculate();
              }}
              style={{ width: 50, marginTop: 4 }}
              placeholder="Total"
            />
          </div>
        ),
        key: "finalsTotal",
        children: [
          {
            title: "Total Score",
            render: renderCell((_, record) => ( // ✅ Applied renderCell
              <Form.Item name={[record.id, "finalsScore"]} initialValue={record.finalsScore ?? undefined} style={{ margin: 0 }}>
                <SafeNumberInput
                  min={0}
                  max={finalsTotals[subjectName] ?? subjectGrades[0]?.finalsTotal ?? Infinity}
                  style={{ width: 60 }}
                  placeholder="Score"
                  onChange={() => {
                    triggerAutoSaveAndCalculate();
                  }}
                />
              </Form.Item>
            )),
          },
        ],
      },
            {
              title: "AVE",
              width: 80,
              render: renderCell((_, record) => ( // ✅ Applied renderCell
                <Tag color="green">
                  {record.combinedFinalsAverage?.toFixed(2) || "0.00"}
                </Tag>
              )),
            },
                        {
                    title: "30%",
                    width: 80,
                    render: renderCell((_, record) => ( // ✅ Applied renderCell
                      <Tag color="green">
                        {record.finalsWeightedTotal?.toFixed(2) || "0.00"}
                      </Tag>
                    )),
                  },
      {
        title: "Total Grade",
        dataIndex: "totalFinalsGrade",
        key: "totalFinalsGrade",
        width: 80,
        render: renderCell((grade) => ( // ✅ Applied renderCell
          grade >= 75 ? <Tag color="green">{grade}</Tag> : <Tag color="red">{grade}</Tag>
        )),
      },

      {
        title: "Equivalent",
        dataIndex: "gradePointEquivalent",
        key: "gradePointEquivalent",
        width: 90,
        render: renderCell((val) => ( // ✅ Applied renderCell
          <strong style={{ color: "#52c41a" }}>{val?.toFixed(2) || "0.00"}</strong>
        )),
      },
    ];

    return (
      <Card key={subjectName} title={<Title level={4}>{subjectName}</Title>} style={{ marginBottom: 24, borderRadius: 8 }}>
        <Form form={editForm} component={false}>
          <Table
            bordered
            rowKey="id"
            className="midterm-table" // Changed to finals-table for consistency
            // ✅ Use the modified data source including the new permanent row
            dataSource={dataSource} 
            columns={[
              otherColumns[0], // Name (now with Select logic)
              ...quizColumns,
              ...classStandingColumns,
              ...otherColumns.slice(1), // rest (project, sep, finals etc.)
            ]}
            pagination={false}
            scroll={{ x: "max-content", y: 600 }}
            style={{ overflowX: "auto" }}
            // Apply a distinct class to the permanent Select row
            rowClassName={(record) => {
                if (record.key === ADD_ROW_KEY) return 'add-student-row-highlight';
                return '';
            }}
          />
        </Form>
      </Card>
    );
  };

  return (
    <Spin spinning={loading || calculating}>
      <GradePercentage />
      <div style={{ marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Button type="primary" icon={<SaveOutlined />} onClick={saveAll}>
          Save All Scores
        </Button>

        <Button type="primary" loading={calculating} onClick={() => handleCalculateGrades("finals")}>
          Calculate Finals
        </Button>
      </div>

      <h5>
        AY {academicPeriod?.academicYear} - {academicPeriod?.semester} Semester Finals
      </h5>

      {subjects.map((subjectName) => renderTableForSubject(subjectName))}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </Spin>
  );
}