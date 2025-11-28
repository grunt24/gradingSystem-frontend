import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Table,
  Button,
  InputNumber,
  Spin,
  message,
  Typography,
  Card,
  Tag,
  Grid,
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
  const [calculating, setCalculating] = useState(false);
  const isSmallScreen = window.innerWidth < 1024;
  const screens = useBreakpoint();
  const isSmall = !screens.lg;

  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [selectedSubjectForAdding, setSelectedSubjectForAdding] =
    useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const modifiedGradesRef = useRef(new Map());

  useEffect(() => {
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
    fetchWeightsAndScale();
  }, []);

  const gradesRef = useRef(grades);

  useEffect(() => {
    gradesRef.current = grades;
  }, [grades]);

  const saveToBackend = useCallback(async () => {
    if (modifiedGradesRef.current.size === 0) {
      console.log("⚠️ No changes to save");
      return;
    }

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
      const payload = syncedGrades.map((student) => ({
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
        sepWeighted: student.sepweighted || 0,

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

      const lastModifiedId = modifiedIds[modifiedIds.length - 1];
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

      modifiedGradesRef.current.clear();

      message.success("✅ Grades saved successfully!");
    } catch (err) {
      message.error(
        "❌ Failed to save: " + (err.response?.data?.message || err.message)
      );
    } finally {
      setSaving(false);
    }
  }, [academicPeriodId, academicYear, semester, subjectTotals]);

  // Debounced version
  const debouncedSave = useCallback(
    debounce(() => {
      saveToBackend();
    }, 2000),
    [saveToBackend]
  );

  const fetchAvailableStudents = async () => {
    try {
      const { data: allStudents } = await axiosInstance.get(
        "/Auth/all-students"
      );
      setAvailableStudents(allStudents || []);
    } catch (err) {
      console.error(err);
      message.error("Failed to fetch students.");
    }
  };

  const openAddStudentModal = (subject) => {
    setSelectedSubjectForAdding(subject);
    setSelectedStudentIds([]);
    fetchAvailableStudents();
    setShowAddStudentModal(true);
  };

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

        const updatedGrade = { ...grade };

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
            [field]: value || 0,
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
            [field]: value || 0,
          };
          updatedGrade.classStandingItems = classStandingItems;
        } else {
          updatedGrade[field] = value || 0;
        }

        // Mark as modified
        modifiedGradesRef.current.set(recordId, updatedGrade); // Store the UPDATED grade

        // Recalculate instantly if weights are loaded
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

    // Trigger debounced save AFTER state update
    debouncedSave();
  };

  // Update totals handler
  const updateTotals = (subjectName, field, index, val) => {
    console.log("Updating totals:", { subjectName, field, index, val });

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
            [field]: val || 0,
          },
        };
      }

      return {
        ...prev,
        [subjectName]: {
          ...currentSubject,
          [field]: {
            ...currentSubject[field],
            [index]: val || 0,
          },
        },
      };
    });

    // Update all grades for this subject with new totals
    setGrades((prevGrades) => {
      return prevGrades.map((grade) => {
        if (grade.subjectName !== subjectName) return grade;

        const updatedGrade = { ...grade };

        if (field === "prelimTotal") {
          updatedGrade.prelimTotal = val || 0;
        } else if (field === "midtermTotal") {
          updatedGrade.midtermTotal = val || 0;
        } else if (field === "quizTotals") {
          const quizzes = [...(updatedGrade.quizzes || [])];
          if (quizzes[index - 1]) {
            quizzes[index - 1].totalQuizScore = val || 0;
          }
          updatedGrade.quizzes = quizzes;
        } else if (field === "classStandingTotals") {
          const classStandingItems = [
            ...(updatedGrade.classStandingItems || []),
          ];
          if (classStandingItems[index - 1]) {
            classStandingItems[index - 1].total = val || 0;
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

  useEffect(() => {
    fetchAllData();
  }, []);

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

  const handleCalculateGrades = async (type) => {
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
  };

  const subjects = [...new Set(grades.map((g) => g.subjectName))];

  const renderTableForSubject = (subjectName) => {
    const subjectGrades = grades.filter((g) => g.subjectName === subjectName);
    const isBSED = subjectGrades.some(
      (g) => g.department?.toUpperCase() === "BSED"
    );

    const quizCount = quizCountBySubject[subjectName] || 1;
    const csCount = classStandingCountBySubject[subjectName] || 1;
    const totals = subjectTotals[subjectName] || {
      quizTotals: {},
      classStandingTotals: {},
      prelimTotal: 0,
      midtermTotal: 0,
    };

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

    const quizColumns = Array.from({ length: quizCount }, (_, i) => ({
      title: `Q${i + 1}`,
      align: "center",
      width: 100, // Added fixed width
      children: [
        {
          title: (
            <InputNumber
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
          render: (_, record) => (
            <InputNumber
              min={0}
                max={totals.quizTotals[i + 1] || Infinity} 
              value={record.quizzes?.[i]?.quizScore || 0}
              onChange={(val) =>
                handleInputChange(record.id, "quizScore", val, i, null)
              }
              style={{ width: 50, textAlign: "center" }}
              placeholder="Score"
            />
          ),
        },
      ],
    }));

    const classStandingColumns = Array.from({ length: csCount }, (_, i) => ({
      title: `CS${i + 1}`,
      width: 70, // Added fixed width
      children: [
        {
          title: (
            <InputNumber
              min={1}
              value={totals.classStandingTotals[i + 1] || ""}
              onChange={(val) =>
                updateTotals(subjectName, "classStandingTotals", i + 1, val)
              }
              style={{ width: 60 }}
              placeholder="Total"
            />
          ),
          width: 110, // Added fixed width
          render: (_, record) => (
            <InputNumber
              min={0}
                              max={totals.classStandingTotals[i + 1] || Infinity} 
              value={record.classStandingItems?.[i]?.score || 0}
              onChange={(val) =>
                handleInputChange(record.id, "score", val, null, i)
              }
              style={{ width: 55 }}
              placeholder="Score"
            />
          ),
        },
      ],
    }));

    const columns = [
      // {
      //   title: "Student #",
      //   dataIndex: "studentNumber",
      //   key: "studentNumber",
      //   width: 100, // Reduced from 120
      // },
      {
        title: "Name",
        dataIndex: "studentFullName",
        key: "studentFullName",
        // fixed: "left",
        width: 150, // Reduced from 200
      },
      { title: "QUIZZES", children: quizColumns },
      {
        title: (
          <Button
            icon={<PlusOutlined />}
            size="small"
            onClick={addQuizColumn}
          ></Button>
        ),
        align: "center",
        width: 100, // Reduced from 150
        children: [
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
            width: 100, // Added fixed width
            render: (_, record) => {
              const total = (record.quizzes || []).reduce(
                (sum, q) => sum + (q.quizScore || 0),
                0
              );
              return <Tag color="blue">{total}</Tag>;
            },
          },
        ],
      },

      { title: "CLASS STANDING", children: classStandingColumns },
      {
        title: (
          <Button
            icon={<PlusOutlined />}
            size="small"
            onClick={addClassStandingColumn}
          >
            {/* Add CS */}
          </Button>
        ),
        width: 90, // Reduced from 150
        children: [
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
            width: 90, // Added fixed width
            render: (_, record) => {
              const total = (record.classStandingItems || []).reduce(
                (sum, cs) => sum + (cs.score || 0),
                0
              );
              return <Tag color="purple">{total}</Tag>;
            },
          },
        ],
      },

      {
        title: "Rec",
        width: 80, // Reduced from 100
        render: (_, record) => (
          <InputNumber
            min={0}
            value={record.recitationScore || 0}
            onChange={(val) =>
              handleInputChange(record.id, "recitationScore", val)
            }
            style={{ width: 60 }}
          />
        ),
      },
      {
        title: "Attendance",
        width: 20, // Reduced from 100
        render: (_, record) => (
          <InputNumber
            min={0}
            value={record.attendanceScore || 0}
            onChange={(val) =>
              handleInputChange(record.id, "attendanceScore", val)
            }
            style={{ width: 60 }}
          />
        ),
      },
      ...(isBSED
        ? [
            {
              title: "SEP",
              width: 70, // Reduced from 100
              render: (_, record) => (
                <InputNumber
                  min={0}
                  value={record.sepScore || 0}
                  onChange={(val) =>
                    handleInputChange(record.id, "sepScore", val)
                  }
                  style={{ width: 55 }}
                />
              ),
            },
          ]
        : []),
      {
        title: "Project",
        width: 70, // Reduced from 100
        render: (_, record) => (
          <InputNumber
            min={0}
            value={record.projectScore || 0}
            onChange={(val) =>
              handleInputChange(record.id, "projectScore", val)
            }
            style={{ width: 55 }}
          />
        ),
      },
      {
        title: "Prelim",
        width: 90, // Added width
        children: [
          {
            title: (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "bold", fontSize: 12 }}>
                  Prelim Total
                </div>
                <InputNumber
                  min={0}
                  value={totals.prelimTotal || 0}
                  onChange={(val) =>
                    updateTotals(subjectName, "prelimTotal", null, val)
                  }
                  style={{ width: 60 }}
                />
              </div>
            ),
            width: 90, // Reduced from 100
            render: (_, record) => (
              <InputNumber
                min={0}
          max={totals.prelimTotal || 0}
                value={record.prelimScore || 0}
                onChange={(val) =>
                  handleInputChange(record.id, "prelimScore", val)
                }
                style={{ width: 60 }}
              />
            ),
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
                <div style={{ fontWeight: "bold", fontSize: 12 }}>
                  Midterm Total
                </div>
                <InputNumber
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
            render: (_, record) => (
              <InputNumber
                min={0}
          max={totals.midtermTotal}
                value={record.midtermScore || 0}
                onChange={(val) =>
                  handleInputChange(record.id, "midtermScore", val)
                }
                style={{ width: 60 }}
              />
            ),
          },
        ],
      },

      {
        title: (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: "bold", fontSize: 12 }}>Total Score</div>
            <Tag
              color="green"
              style={{ fontWeight: 600, marginTop: 4, fontSize: 11 }}
            >
              TS: {(totals.prelimTotal || 0) + (totals.midtermTotal || 0)}
            </Tag>
          </div>
        ),
        width: 90, // Reduced from 120
        render: (_, record) => {
          const prelim = record.prelimScore || 0;
          const midterm = record.midtermScore || 0;
          const total = prelim + midterm;
          return (
            <Tag color="purple" style={{ fontWeight: 600 }}>
              {total}
            </Tag>
          );
        },
      },

      {
        title: "Midterm Grade",
        dataIndex: "totalMidtermGrade",
        key: "totalMidtermGrade",
        // fixed: "right",
        width: 100, // Reduced from 120
        render: (val) => (
          <strong style={{ color: "#1890ff" }}>
            {val?.toFixed(2) || "0.00"}
          </strong>
        ),
      },
      {
        title: "Equivalent",
        dataIndex: "gradePointEquivalent",
        key: "gradePointEquivalent",
        // fixed: "right",
        width: 90, // Reduced from 100
        render: (val) => (
          <strong style={{ color: "#52c41a" }}>
            {val?.toFixed(2) || "0.00"}
          </strong>
        ),
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
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() =>
                openAddStudentModal({
                  id: subjectGrades[0]?.subjectId, // get subjectId from the first grade in this subject
                  name: subjectName,
                })
              }
            >
              Add Student
            </Button>
          </div>
        }
        style={{ marginBottom: 32 }}
      >
        <Table
          rowKey="id"
          className="midterm-table"
          dataSource={subjectGrades}
          columns={columns.map((col) => ({ ...col, align: "center" }))}
          pagination={false}
          scroll={isSmall ? { x: "max-content" } : undefined}
          style={{ textAlign: "center", width: "100%" }}
          // tableLayout="fixed"
          // bordered
        />
      </Card>
    );
  };

  return (
    <Spin spinning={loading} tip="Loading...">
      <div style={{ marginBottom: 20 }}>
        <GradePercentage />
      </div>

      <div style={{ marginBottom: 16 }}>
        {/* <Button
          type="primary"
          loading={calculating}
          onClick={() => handleCalculateGrades("finals")}
        >
          Calculate Finals
        </Button> */}
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

      {showAddStudentModal && (
        <div
          className="add-student-modal"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              width: 400,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <h3>Add Students to {selectedSubjectForAdding?.name}</h3>
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {availableStudents.map((student) => (
                <div key={student.id}>
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudentIds((prev) => [...prev, student.id]);
                      } else {
                        setSelectedStudentIds((prev) =>
                          prev.filter((id) => id !== student.id)
                        );
                      }
                    }}
                  />{" "}
                  {student.fullname}
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 16,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <Button
                type="primary"
                onClick={async () => {
                  if (!selectedStudentIds.length)
                    return message.warning("Select at least one student");

                  try {
                    await Promise.all(
                      selectedStudentIds.map((studentId) => {
                        return axiosInstance.post("/StudentSubjects", {
                          studentId: studentId,
                          subjectIds: [selectedSubjectForAdding.id], // send as array
                        });
                      })
                    );

                    toast.success("Students assigned successfully!");
                    setShowAddStudentModal(false);
                    setSelectedStudentIds([]);
                    fetchAllData(); // reload the table
                  } catch (err) {
                    console.error(err);
                    toast.error(
                      err.response?.data?.message ||
                        "Failed to assign subjects."
                    );
                  }
                }}
              >
                Add Selected
              </Button>

              <Button onClick={() => setShowAddStudentModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </Spin>
  );
}
