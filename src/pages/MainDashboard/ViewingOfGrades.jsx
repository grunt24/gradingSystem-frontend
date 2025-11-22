import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Tabs,
  Card,
  Row,
  Col,
  Select,
  Space,
  message,
  Switch,
  Popconfirm,
} from "antd";
import axiosInstance from "../../api/axiosInstance";
import loginService from "../../api/loginService";

export default function StudentsGradesTable() {
  const [studentsByDept, setStudentsByDept] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedAY, setSelectedAY] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [academicPeriods, setAcademicPeriods] = useState([]);

  // ✅ Updated: fetch from AcademicPeriods endpoint
  const fetchYearSemesterFilters = async () => {
    try {
      const res = await axiosInstance.get("/AcademicPeriods/all");
      const periods = res.data;

      if (Array.isArray(periods) && periods.length > 0) {
        setAcademicPeriods(periods);

        const current = periods.find((p) => p.isCurrent);
        if (current) {
          setSelectedAY(current.academicYear);
          setSelectedSemester(current.semester);
        }

        const userDetails = loginService.getUserDetails();
        if (userDetails?.role) setUserRole(userDetails.role);
      }
    } catch {
      message.error("Failed to load academic periods.");
    }
  };

  const fetchGrades = async (ay, sem) => {
    if (!ay || !sem) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(
        "/GradeCalculation/students-grades-by-ay-semester",
        { params: { academicYear: ay, semester: sem } }
      );

      if (res.data.success && Array.isArray(res.data.data)) {
        const rawData = res.data.data;

        const grouped = rawData.reduce((deptAcc, item) => {
          if (!deptAcc[item.department]) deptAcc[item.department] = {};
          if (!deptAcc[item.department][item.yearLevel])
            deptAcc[item.department][item.yearLevel] = {};
          if (!deptAcc[item.department][item.yearLevel][item.studentId]) {
            deptAcc[item.department][item.yearLevel][item.studentId] = {
              studentId: item.studentId,
              studentFullName: item.studentFullName,
              yearLevel: item.yearLevel,
              subjects: [],
            };
          }

          const finalsData = Array.isArray(item.finalGrade)
            ? item.finalGrade.find((f) => f.subjectId === item.subjectId)
            : item.finalGrade;

          deptAcc[item.department][item.yearLevel][
            item.studentId
          ].subjects.push({
            subjectName: item.subjectName,
            subjectCode: item.subjectCode,
            midterm: item.midtermGrade ?? null,
            finals: finalsData ?? null,
          });

          return deptAcc;
        }, {});

        const finalGrouped = Object.fromEntries(
          Object.entries(grouped).map(([dept, yearLevels]) => [
            dept,
            Object.fromEntries(
              Object.entries(yearLevels).map(([year, studentsObj]) => [
                year,
                Object.values(studentsObj),
              ])
            ),
          ])
        );

        setStudentsByDept(finalGrouped);
      } else {
        message.warning("No grades found for the selected filters.");
        setStudentsByDept({});
      }
    } catch (err) {
      console.error("Error fetching grades:", err);
      message.error("Failed to fetch student grades.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYearSemesterFilters();
  }, []);

  useEffect(() => {
    if (selectedAY && selectedSemester) {
      fetchGrades(selectedAY, selectedSemester);
    }
  }, [selectedAY, selectedSemester]);

  const handleViewGrades = (student) => {
    setSelectedStudent(student);
    setIsModalVisible(true);
  };

  const handleClose = () => {
    setIsModalVisible(false);
    setSelectedStudent(null);
  };

  const columns = [
    {
      title: "Student Name",
      dataIndex: "studentFullName",
      key: "studentFullName",
    },
    { title: "Year Level", dataIndex: "yearLevel", key: "yearLevel" },

    ...(userRole === "Admin"
      ? [
          {
            title: "Midterm Visible",
            key: "midtermVisible",
            render: (_, record) => (
              <Switch
                checkedChildren="Shown"
                unCheckedChildren="Hidden"
                checked={record.subjects.every((s) => s.midterm?.isVisible)}
                disabled={userRole !== "Admin"}
                onChange={async (checked) => {
                  try {
                    await axiosInstance.put(
                      `/ReleaseGrades/toggle-visibility?userId=${record.studentId}&isVisible=${checked}&gradeType=midterm`
                    );
                    message.success(
                      `Midterm grade for ${record.studentFullName} ${
                        checked ? "shown" : "hidden"
                      }.`
                    );
                    fetchGrades(selectedAY, selectedSemester);
                  } catch {
                    message.error("Failed to update midterm visibility.");
                  }
                }}
              />
            ),
          },

          // ✅ Finals Toggle Column
          {
            title: "Finals Visible",
            key: "finalsVisible",
            render: (_, record) => (
              <Switch
                checkedChildren="Shown"
                unCheckedChildren="Hidden"
                checked={record.subjects.every((s) => s.finals?.isVisible)}
                disabled={userRole !== "Admin"}
                onChange={async (checked) => {
                  try {
                    await axiosInstance.put(
                      `/ReleaseGrades/toggle-visibility?userId=${record.studentId}&isVisible=${checked}&gradeType=finals`
                    );
                    message.success(
                      `Finals grade for ${record.studentFullName} ${
                        checked ? "shown" : "hidden"
                      }.`
                    );
                    fetchGrades(selectedAY, selectedSemester);
                  } catch {
                    message.error("Failed to update finals visibility.");
                  }
                }}
              />
            ),
          },
        ]
      : []),
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button type="primary" onClick={() => handleViewGrades(record)}>
          View Grades
        </Button>
      ),
    },
  ];

  const quizColumns = [
    { title: "Quiz", dataIndex: "label", key: "label" },
    { title: "Score", dataIndex: "quizScore", key: "quizScore" },
    { title: "Total", dataIndex: "totalQuizScore", key: "totalQuizScore" },
  ];

  const classItemsColumns = [
    { title: "Class Standing Items", dataIndex: "label", key: "label" },
    { title: "Score", dataIndex: "score", key: "score" },
    { title: "Total", dataIndex: "total", key: "total" },
  ];

  return (
    <Card>
      <div style={{ padding: 24 }}>
        <h2>Student Grades by Academic Year & Semester</h2>

        <div style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Select
              placeholder="Select Academic Period"
              style={{ width: 200 }}
              options={academicPeriods?.map((p) => ({
                label: `AY ${p.academicYear} ${p.semester}`,
                value: `${p.academicYear}-${p.semester}`,
              }))}
              value={
                selectedAY && selectedSemester
                  ? `${selectedAY}-${selectedSemester}`
                  : null
              }
              onChange={(val) => {
                const [year, sem] = val.split("-");
                setSelectedAY(year);
                setSelectedSemester(sem);
              }}
            />

            {userRole === "Admin" && (
              <Space direction="vertical">
                <Popconfirm
                  title="Release all Midterm Grades?"
                  description="This will make ALL midterm grades visible to students."
                  okText="Yes, Release"
                  cancelText="Cancel"
                  onConfirm={async () => {
                    try {
                      await axiosInstance.put(
                        `/ReleaseGrades/release-midterm?isVisible=true`
                      );
                      message.success(
                        "All midterm grades released successfully!"
                      );
                      fetchGrades(selectedAY, selectedSemester);
                    } catch {
                      message.error("Failed to release midterm grades.");
                    }
                  }}
                >
                  <Button type="primary" style={{ width: 200 }}>
                    Release Midterm Grades
                  </Button>
                </Popconfirm>

                <Popconfirm
                  title="Release all Finals Grades?"
                  description="This will make ALL finals grades visible to students."
                  okText="Yes, Release"
                  cancelText="Cancel"
                  onConfirm={async () => {
                    try {
                      await axiosInstance.put(
                        `/ReleaseGrades/release-finals?isVisible=true`
                      );
                      message.success(
                        "All finals grades released successfully!"
                      );
                      fetchGrades(selectedAY, selectedSemester);
                    } catch {
                      message.error("Failed to release finals grades.");
                    }
                  }}
                >
                  <Button type="primary" style={{ width: 200 }}>
                    Release Finals Grades
                  </Button>
                </Popconfirm>
              </Space>
            )}
          </Space>
        </div>

        <Tabs
          type="card"
          items={Object.entries(studentsByDept).map(([dept, yearLevels]) => ({
            key: dept,
            label: dept,
            children: (
              <Tabs
                type="line"
                items={Object.entries(yearLevels).map(([year, students]) => ({
                  key: year,
                  label: year,
                  children: (
                    <Table
                      columns={columns}
                      dataSource={students}
                      rowKey="studentId"
                      loading={loading}
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: "max-content" }}
                    />
                  ),
                }))}
              />
            ),
          }))}
        />

        <Modal
          title={
            selectedStudent
              ? `${selectedStudent.studentFullName}'s Grades`
              : "Grades"
          }
          open={isModalVisible}
          onCancel={handleClose}
          footer={null}
          width={800}
        >
          {selectedStudent && (
            <Tabs
              type="card"
              items={selectedStudent.subjects.map((subject, idx) => ({
                key: idx,
                label: `${subject.subjectName} (${subject.subjectCode})`,
                children: (
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Card title="Midterm Breakdown" variant="outlined">
                        {subject.midterm ? (
                          <>
                            <p>
                              <strong>Calculated Midterm Grade:</strong>{" "}
                              {subject.midterm.totalMidtermGrade ??
                                "Not Yet Released"}
                            </p>
                            <p>
                              <strong>Rounded Midterm Grade:</strong>{" "}
                              {subject.midterm.totalMidtermGradeRounded ??
                                "Not Yet Released"}
                            </p>
                            <p>
                              <strong>Grade Point Equivalent:</strong>{" "}
                              {subject.midterm.gradePointEquivalent ??
                                "Not Yet Released"}
                            </p>
                            <p>
                              <strong>Quiz PG:</strong>{" "}
                              {subject.midterm.quizPG ?? "N/A"}
                            </p>
                            <p>
                              <strong>Recitation:</strong>{" "}
                              {subject.midterm.recitationScore ?? "N/A"}
                            </p>
                            <p>
                              <strong>Attendance:</strong>{" "}
                              {subject.midterm.attendanceScore ?? "N/A"}
                            </p>
                            <p>
                              <strong>Class Standing PG:</strong>{" "}
                              {subject.midterm.classStandingPG ?? "N/A"}
                            </p>
                            <p>
                              <strong>Project:</strong>{" "}
                              {subject.midterm.projectScore ?? "N/A"}
                            </p>
                            <p>
                              <strong>SEP:</strong>{" "}
                              {subject.midterm.sepScore ?? "N/A"}
                            </p>

                            {subject.midterm.quizzes?.length > 0 && (
                              <Table
                                columns={quizColumns}
                                dataSource={subject.midterm.quizzes}
                                pagination={false}
                                rowKey="id"
                                size="small"
                              />
                            )}
                            {subject.midterm.classStandingItems?.length > 0 && (
                              <Table
                                columns={classItemsColumns}
                                dataSource={subject.midterm.classStandingItems}
                                pagination={false}
                                rowKey="id"
                                size="small"
                              />
                            )}
                          </>
                        ) : (
                          <p>No midterm data available.</p>
                        )}
                      </Card>
                    </Col>
                    <Col xs={24} md={12}>
                      <Card title="Finals Breakdown" variant="outlined">
                        {subject.finals ? (
                          <>
                            <p>
                              <strong>Calculated Finals Grade:</strong>{" "}
                              {subject.finals.totalFinalsGrade ??
                                "Not Yet Released"}
                            </p>
                            <p>
                              <strong>Rounded Finals Grade:</strong>{" "}
                              {subject.finals.totalFinalsGradeRounded ??
                                "Not Yet Released"}
                            </p>
                            <p>
                              <strong>Grade Point Equivalent:</strong>{" "}
                              {subject.finals.gradePointEquivalent ??
                                "Not Yet Released"}
                            </p>
                            <p>
                              <strong>Quiz PG:</strong>{" "}
                              {subject.finals.quizPG ?? "N/A"}
                            </p>
                            <p>
                              <strong>Recitation:</strong>{" "}
                              {subject.finals.recitationScore ?? "N/A"}
                            </p>
                            <p>
                              <strong>Attendance:</strong>{" "}
                              {subject.finals.attendanceScore ?? "N/A"}
                            </p>
                            <p>
                              <strong>Class Standing PG:</strong>{" "}
                              {subject.finals.classStandingPG ?? "N/A"}
                            </p>
                            <p>
                              <strong>Project:</strong>{" "}
                              {subject.finals.projectScore ?? "N/A"}
                            </p>
                            <p>
                              <strong>SEP:</strong>{" "}
                              {subject.finals.sepScore ?? "N/A"}
                            </p>

                            {subject.finals.quizzes?.length > 0 && (
                              <Table
                                columns={quizColumns}
                                dataSource={subject.finals.quizzes}
                                pagination={false}
                                rowKey="id"
                                size="small"
                              />
                            )}
                            {subject.finals.classStandingItems?.length > 0 && (
                              <Table
                                columns={classItemsColumns}
                                dataSource={subject.finals.classStandingItems}
                                pagination={false}
                                rowKey="id"
                                size="small"
                              />
                            )}
                          </>
                        ) : (
                          <p>No finals data available.</p>
                        )}
                      </Card>
                    </Col>
                  </Row>
                ),
              }))}
            />
          )}
        </Modal>
      </div>
    </Card>
  );
}
