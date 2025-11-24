import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    fetchAllData();
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
        if (cs.label && cs.total !== undefined)
          csMap[subj][cs.label] = cs.total;
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
  const addClassStandingColumn = () =>
    setClassStandingCount((prev) => prev + 1);

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

  const saveAll = async () => {
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
            finalsTotal:
              finalsTotals[student.subjectName] ?? student.finalsTotal ?? 0,
          };

          return {
            ...student,
            academicPeriodId,
            academicYear,
            academicYearId,
            semester,
            attendanceScore:
              formItem.attendanceScore ?? student.attendanceScore ?? 0,
            recitationScore:
              formItem.recitationScore ?? student.recitationScore ?? 0,
            projectScore: formItem.projectScore ?? student.projectScore ?? 0,
            sepScore:
              student.department?.toUpperCase() === "BSED"
                ? formItem.sepScore ?? student.sepScore ?? 0
                : 0,
            finalsScore: formItem.finalsScore ?? student.finalsScore ?? 0,
            finalsTotal: subjTotals.finalsTotal,
            quizzes: Object.entries(formItem)
              .filter(
                ([key, val]) =>
                  key.startsWith("quiz") && val?.quizScore !== undefined
              )
              .map(([key, val]) => ({
                label: key,
                quizScore: val.quizScore,
                totalQuizScore:
                  subjTotals.quizTotals[key] ?? val.totalQuizScore ?? 0,
              })),
            classStandingItems: Object.entries(formItem)
              .filter(
                ([key, val]) =>
                  key.startsWith("classStanding") && val?.score !== undefined
              )
              .map(([key, val]) => ({
                label: key,
                score: val.score,
                total: subjTotals.classStandingTotals[key] ?? val.total ?? 0,
              })),
          };
        })
        .filter(Boolean);

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
  };

  const subjects = [...new Set(grades.map((g) => g.subjectName))];

  const renderTableForSubject = (subjectName) => {
    const subjectGrades = grades.filter((g) => g.subjectName === subjectName);
    const isBSED = subjectGrades.some(
      (g) => g.department?.toUpperCase() === "BSED"
    );

    const quizColumns = [
      {
        title: (
          <Button
            icon={<PlusOutlined />}
            size="small"
            onClick={addQuizColumn}
          ></Button>
        ),
        children: [
          ...Array.from({ length: quizCount }, (_, i) => {
            const quizKey = `quiz${i + 1}`;
            const totalForThisQuiz =
              quizTotals[subjectName]?.[quizKey] ??
              subjectGrades[0]?.quizzes?.[i]?.totalQuizScore ??
              undefined;
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
                        editForm.setFieldValue(
                          [record.id, quizKey, "totalQuizScore"],
                          val
                        )
                      );
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
                <Form.Item
                  name={[record.id, quizKey, "quizScore"]}
                  initialValue={record.quizzes?.[i]?.quizScore}
                  style={{ margin: 0 }}
                >
                  <InputNumber
                    min={0}
                    style={{ width: 70 }}
                    placeholder="Score"
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
                    {Object.values(quizTotals[subjectName] || {}).reduce(
                      (sum, val) => sum + (Number(val) || 0),
                      0
                    )}
                  </Tag>
                </div>
              </div>
            ),
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
    ];

    const classStandingColumns = [
      {
        title: (
          <Button
            icon={<PlusOutlined />}
            size="small"
            onClick={addClassStandingColumn}
          >
            {/* Add Class Standing */}
          </Button>
        ),
        children: [
          ...Array.from({ length: classStandingCount }, (_, i) => {
            const csKey = `classStanding${i + 1}`;
            const totalForThisCS =
              classStandingTotals[subjectName]?.[csKey] ??
              subjectGrades[0]?.classStandingItems?.[i]?.total ??
              undefined;
            return {
              title: (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    CS {i + 1}
                  </div>
                  <InputNumber
                    min={1}
                    value={totalForThisCS}
                    onChange={(val) => {
                      if (typeof val !== "number" || isNaN(val)) return;
                      setClassStandingTotals((prev) => ({
                        ...prev,
                        [subjectName]: { ...prev[subjectName], [csKey]: val },
                      }));
                      subjectGrades.forEach((record) =>
                        editForm.setFieldValue([record.id, csKey, "total"], val)
                      );
                    }}
                    style={{ width: 50, marginTop: 4 }}
                    placeholder="Total"
                  />
                </div>
              ),
              key: csKey,
              align: "center",
              render: (_, record) => (
                <Form.Item
                  name={[record.id, csKey, "score"]}
                  initialValue={record.classStandingItems?.[i]?.score}
                  style={{ margin: 0 }}
                >
                  <InputNumber
                    min={0}
                    style={{ width: 70 }}
                    placeholder="Score"
                  />
                </Form.Item>
              ),
            };
          }),
          {
            title: (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: "bold" }}>Total CS</div>
                <div>
                  <Tag color="green" style={{ fontWeight: 600, marginLeft: 6 }}>
                    OCS:{" "}
                    {Object.values(
                      classStandingTotals[subjectName] || {}
                    ).reduce((sum, val) => sum + (Number(val) || 0), 0)}
                  </Tag>
                </div>
              </div>
            ),
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
    ];

    const otherColumns = [
      {
        title: "Name",
        dataIndex: "studentFullName",
        width: 100,
      },
      {
        title: (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: "bold" }}>Finals Total</div>
            <InputNumber
              min={1}
              value={
                finalsTotals[subjectName] ??
                subjectGrades[0]?.finalsTotal ??
                undefined
              }
              onChange={(val) => {
                if (typeof val !== "number" || isNaN(val)) return;
                setFinalsTotals((prev) => ({ ...prev, [subjectName]: val }));
                subjectGrades.forEach((record) =>
                  editForm.setFieldValue([record.id, "finalsTotal"], val)
                );
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
              <Form.Item
                name={[record.id, "finalsScore"]}
                initialValue={record.finalsScore ?? undefined}
                style={{ margin: 0 }}
              >
                <InputNumber
                  min={0}
                  style={{ width: 60 }}
                  placeholder="Score"
                />
              </Form.Item>
            ),
          },
        ],
      },

      ...[
        "recitationScore",
        "attendanceScore",
        "projectScore",
        ...(isBSED ? ["sepScore"] : []),
      ].map((field) => ({
        title: field,
        key: field,
        render: (_, record) => (
          <Form.Item
            name={[record.id, field]}
            initialValue={
              record[field] === 0 || record[field] === null
                ? null
                : record[field]
            }
            style={{ margin: 0 }}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: 60 }}
              placeholder={field}
            />
          </Form.Item>
        ),
      })),
      {
        title: "Total Grade",
        dataIndex: "totalFinalsGrade",
        key: "totalFinalsGrade",
        // fixed: "right",
        width: 80,
        render: (grade) =>
          grade >= 75 ? (
            <Tag color="green">{grade}</Tag>
          ) : (
            <Tag color="red">{grade}</Tag>
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
        title={<Title level={4}>{subjectName}</Title>}
        style={{ marginBottom: 24, borderRadius: 8 }}
      >
        <Form form={editForm} component={false}>
          <Table
            bordered
            rowKey="id"
            className="midterm-table"
            dataSource={subjectGrades}
            columns={[
              ...otherColumns.slice(0, 2),
              ...quizColumns,
              ...classStandingColumns,
              ...otherColumns.slice(2),
            ]}
            pagination={false}
            scroll={{ x: "max-content", y: 600 }} // horizontal scroll will adapt to content width
            style={{ overflowX: "auto" }}
          />
        </Form>
      </Card>
    );
  };

  return (
    <Spin spinning={loading}>
      <GradePercentage />
      <div
        style={{ marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap" }}
      >
        <Button type="primary" icon={<SaveOutlined />} onClick={saveAll}>
          Save All Scores
        </Button>

        <Button
          type="primary"
          loading={calculating}
          onClick={() => handleCalculateGrades("finals")}
        >
          Calculate Finals
        </Button>
      </div>

      <h5>
        AY {academicPeriod.academicYear} - {academicPeriod.semester} Semester
        Finals
      </h5>

      {subjects.map((subjectName) => renderTableForSubject(subjectName))}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </Spin>
  );
}
