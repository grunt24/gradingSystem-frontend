import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Table,
  Button,
  InputNumber,
  Tag,
  Form,
  Spin,
  Typography,
  Card,
  message,
} from "antd";
import { SaveOutlined, PlusOutlined } from "@ant-design/icons";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "../../api/axiosInstance";
import loginService from "../../api/loginService";
import GradePercentage from "./Graph/GradePercentage";
import debounce from "lodash/debounce";

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

  // ref to hold debounced function so we can cancel on unmount
  const debouncedRef = useRef(null);

  useEffect(() => {
    fetchAllData();
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
    [] // stable
  );

  const saveAll = useCallback(async () => {
    try {
      setLoading(true);
      const values = await editForm.validateFields();

      const payload = Object.keys(values)
        .map((studentId) => {
          const formItem = values[studentId];
          const student = grades.find((g) => g.id === parseInt(studentId));
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

  const renderTableForSubject = (subjectName) => {
    const subjectGrades = grades.filter((g) => g.subjectName === subjectName);
    const isBSED = subjectGrades.some((g) => g.department?.toUpperCase() === "BSED");

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
                  <InputNumber
                    min={1}
                    value={totalForThisQuiz}
                    onChange={(val) => {
                      if (typeof val !== "number" || isNaN(val)) return;
                      setQuizTotals((prev) => ({
                        ...prev,
                        [subjectName]: { ...prev[subjectName], [quizKey]: val },
                      }));
                      subjectGrades.forEach((record) =>
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
              render: (_, record) => (
                <Form.Item name={[record.id, quizKey, "quizScore"]} initialValue={record.quizzes?.[i]?.quizScore} style={{ margin: 0 }}>
                  <InputNumber
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
              ),
            };
          }),
          {
            title: (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "bold" }}>Total Quiz</div>
                <div>
                  <Tag color="green" style={{ fontWeight: 600, marginLeft: 6 }}>
                    OTQ:{" "}
                    {Object.values(quizTotals[subjectName] || {}).reduce((sum, val) => sum + (Number(val) || 0), 0)}
                  </Tag>
                </div>
              </div>
            ),
            render: (_, record) => {
              const total = (record.quizzes || []).reduce((sum, q) => sum + (q.quizScore || 0), 0);
              return <Tag color="blue">{total}</Tag>;
            },
          },
        ],
      },
    ];

    const classStandingColumns = [
      {
        title: <Button icon={<PlusOutlined />} size="small" onClick={addClassStandingColumn} />,
        children: [
          // Attendance inside CS group (left)
          {
            title: "Attendance",
            key: "Attendance",
            align: "center",
            width: 80,
            render: (_, record) => (
              <Form.Item name={[record.id, "Attendance"]} initialValue={record.attendanceScore ?? 0} style={{ margin: 0 }}>
                <InputNumber
                  min={0}
                  style={{ width: 60 }}
                  placeholder="Atten"
                  onChange={() => {
                    // update form value then trigger debounce
                    triggerAutoSaveAndCalculate();
                  }}
                />
              </Form.Item>
            ),
          },

          // Recitation inside CS group (after Attendance)
          {
            title: "Recitation",
            key: "Recitation",
            align: "center",
            width: 80,
            render: (_, record) => (
              <Form.Item name={[record.id, "Recitation"]} initialValue={record.recitationScore ?? 0} style={{ margin: 0 }}>
                <InputNumber
                  min={0}
                  style={{ width: 60 }}
                  placeholder="Recit"
                  onChange={() => {
                    triggerAutoSaveAndCalculate();
                  }}
                />
              </Form.Item>
            ),
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
                  <InputNumber
                    min={1}
                    value={totalForThisCS}
                    onChange={(val) => {
                      if (typeof val !== "number" || isNaN(val)) return;
                      setClassStandingTotals((prev) => ({
                        ...prev,
                        [subjectName]: { ...prev[subjectName], [csKey]: val },
                      }));
                      subjectGrades.forEach((record) => editForm.setFieldValue([record.id, csKey, "total"], val));
                      triggerAutoSaveAndCalculate();
                    }}
                    style={{ width: 50, marginTop: 4 }}
                    placeholder="Total"
                  />
                </div>
              ),
              key: csKey,
              align: "center",
              render: (_, record) => (
                <Form.Item name={[record.id, csKey, "score"]} initialValue={record.classStandingItems?.[i]?.score} style={{ margin: 0 }}>
                  <InputNumber
                    min={0}
                    max={totalForThisCS ?? Infinity}
                    style={{ width: 70 }}
                    placeholder="Score"
                    onChange={() => {
                      triggerAutoSaveAndCalculate();
                    }}
                  />
                </Form.Item>
              ),
            };
          }),

          // Total CS column
          {
            title: (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "bold" }}>Total CS</div>
                <Tag color="green" style={{ fontWeight: 600, marginLeft: 6 }}>
                  OCS:{" "}
                  {Object.values(classStandingTotals[subjectName] || {}).reduce((sum, val) => sum + (Number(val) || 0), 0)}
                </Tag>
              </div>
            ),
            render: (_, record) => {
              const total = (record.classStandingItems || []).reduce((sum, cs) => sum + (cs.score || 0), 0);
              return <Tag color="purple">{total}</Tag>;
            },
          },
        ],
      },
    ];

    const otherColumns = [
      {
        title: "Name",
        dataIndex: "studentFullName",
        width: 100,
      },

      // Project Score and SEP (if BSED) — these come after Attendance/Rec in the layout because those are in CS group now
      ...[
        "Project Score",
        ...(isBSED ? ["sepScore"] : []),
      ].map((field) => ({
        title: field,
        key: field,
        render: (_, record) => (
          <Form.Item
            name={[record.id, field]}
            initialValue={record[field] === 0 || record[field] === null ? null : record[field]}
            style={{ margin: 0 }}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: 60 }}
              placeholder={field}
              onChange={() => {
                triggerAutoSaveAndCalculate();
              }}
            />
          </Form.Item>
        ),
      })),

      {
        title: (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: "bold" }}>Final Exam Total</div>
            <InputNumber
              min={1}
              value={finalsTotals[subjectName] ?? subjectGrades[0]?.finalsTotal ?? undefined}
              onChange={(val) => {
                if (typeof val !== "number" || isNaN(val)) return;
                setFinalsTotals((prev) => ({ ...prev, [subjectName]: val }));
                subjectGrades.forEach((record) => editForm.setFieldValue([record.id, "finalsTotal"], val));
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
            render: (_, record) => (
              <Form.Item name={[record.id, "finalsScore"]} initialValue={record.finalsScore ?? undefined} style={{ margin: 0 }}>
                <InputNumber
                  min={0}
                  max={finalsTotals[subjectName] ?? subjectGrades[0]?.finalsTotal ?? Infinity}
                  style={{ width: 60 }}
                  placeholder="Score"
                  onChange={() => {
                    triggerAutoSaveAndCalculate();
                  }}
                />
              </Form.Item>
            ),
          },
        ],
      },

      {
        title: "Total Grade",
        dataIndex: "totalFinalsGrade",
        key: "totalFinalsGrade",
        width: 80,
        render: (grade) => (grade >= 75 ? <Tag color="green">{grade}</Tag> : <Tag color="red">{grade}</Tag>),
      },

      {
        title: "Equivalent",
        dataIndex: "gradePointEquivalent",
        key: "gradePointEquivalent",
        width: 90,
        render: (val) => (
          <strong style={{ color: "#52c41a" }}>{val?.toFixed(2) || "0.00"}</strong>
        ),
      },
    ];

    return (
      <Card key={subjectName} title={<Title level={4}>{subjectName}</Title>} style={{ marginBottom: 24, borderRadius: 8 }}>
        <Form form={editForm} component={false}>
          <Table
            bordered
            rowKey="id"
            className="midterm-table"
            dataSource={subjectGrades}
            columns={[
              otherColumns[0], // Name
              ...quizColumns,
              ...classStandingColumns,
              ...otherColumns.slice(1), // rest (project, sep, finals etc.)
            ]}
            pagination={false}
            scroll={{ x: "max-content", y: 600 }}
            style={{ overflowX: "auto" }}
          />
        </Form>
      </Card>
    );
  };

  return (
    <Spin spinning={loading}>
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
