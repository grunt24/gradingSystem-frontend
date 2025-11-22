import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, Row, Col, Modal, Table, Button } from "antd";
import StudentSubject from "./StudentSubject";
import Teacher from "./Teacher/Teacher";
import Subjects from "./Subjects";
import UserEvents from "./UserEvents";
import axiosInstance from "../../api/axiosInstance";
import dummyGrades from "../../api/dummyGrades";
import loginService from "../../api/loginService";
import TeacherStudents from "./Teacher/TeacherStudents";

function MainDashboard() {
  const [data, setData] = useState([]);
  const [roleCounts, setRoleCounts] = useState({});
  const [gradeCounts, setGradeCounts] = useState({ valid: 0, invalid: 0 });
  const [studentGroupData, setStudentGroupData] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [yearDeptModal, setYearDeptModal] = useState({
    visible: false,
    students: [],
    title: "",
  });
  const [gradeInfo, setGradeInfo] = useState({
    midtermCount: 0,
    finalCount: 0,
    currentSemester: "",
    currentAcademicYear: "",
  });
  const [teacherChartData, setTeacherChartData] = useState([]);

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#a83279"];
  const getColor = (index) => COLORS[index % COLORS.length];

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDetails = loginService.getUserDetails();
        if (userDetails?.role) {
          setUserRole(userDetails.role);
        }

        const { data: users } = await axiosInstance.get("/Auth/all-users");
        const { data: studentGroup } = await axiosInstance.get(
          "/Auth/students-by-year-department"
        );
        setStudentGroupData(studentGroup);

        const { data: gradeResponse } = await axiosInstance.get(
          "/GradeCalculation/grades-count"
        );
        if (gradeResponse.success) {
          setGradeInfo(gradeResponse.data);
        }

        const roles = { Admin: 0, Teacher: 0, Student: 0 };
        users.forEach((user) => {
          if (user.role === "Superadmin") return;
          const role = user.role;
          roles[role] = (roles[role] || 0) + 1;
        });

        const gradeCounts = dummyGrades.reduce(
          (acc, g) => {
            if (g.grade >= 75) acc.valid += 1;
            else acc.invalid += 1;
            return acc;
          },
          { valid: 0, invalid: 0 }
        );

        setData(
          Object.keys(roles).map((role) => ({ role, count: roles[role] }))
        );
        setRoleCounts(roles);
        setGradeCounts(gradeCounts);

        if (userDetails.role === "Teacher") {
          const { data: teacherData } = await axiosInstance.get(
            "/Teachers/my-students"
          );

          const chartData = teacherData.map((sub) => ({
            subjectName: sub.subjectName,
            studentCount: sub.students?.length || 0,
          }));
          setTeacherChartData(chartData);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };

    fetchUserData();
  }, []);

  const columns = [
    {
      title: "Student Number",
      dataIndex: "studentNumber",
      key: "studentNumber",
    },
    { title: "Full Name", dataIndex: "fullname", key: "fullname" },
    { title: "Department", dataIndex: "department", key: "department" },
    { title: "Year Level", dataIndex: "yearLevel", key: "yearLevel" },
    { title: "Username", dataIndex: "username", key: "username" },
  ];

  const deptMap = {};
  studentGroupData.forEach((yearGroup) => {
    yearGroup.departments.forEach((dept) => {
      if (!deptMap[dept.department]) deptMap[dept.department] = [];
      deptMap[dept.department].push({
        yearLevel: yearGroup.yearLevel,
        count: dept.count,
        students: dept.students,
      });
    });
  });

  return (
    <>
      <Modal
        title={yearDeptModal.title}
        open={yearDeptModal.visible}
        width={800}
        onCancel={() =>
          setYearDeptModal({ visible: false, students: [], title: "" })
        }
        footer={null}
      >
        <Table
          dataSource={yearDeptModal.students}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 5 }}
        />
      </Modal>

      <Row gutter={[16, 16]} style={{ marginTop: 40 }}>
        {userRole === "Admin" && (
          <Col
            xs={24}
            sm={24}
            md={12}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            <Card title="User Roles Distribution" variant style={{ flex: 1 }}>
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      dataKey="count"
                      nameKey="role"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      label
                    >
                      {data.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Card title="Calculated Midterm Grade Count" variant>
                  <div
                    style={{
                      fontSize: 24,
                      textAlign: "center",
                      padding: "24px 0",
                    }}
                  >
                    {gradeInfo.midtermCount}
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card title="Calculated Finals Grade Count" variant>
                  <div
                    style={{
                      fontSize: 24,
                      textAlign: "center",
                      padding: "24px 0",
                    }}
                  >
                    {gradeInfo.finalCount}
                  </div>
                </Card>
              </Col>
            </Row>
          </Col>
        )}

        <Col
          xs={24}
          sm={24}
          md={userRole === "Teacher" ? 24 : 12}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {userRole === "Admin" && (
            <Card variant style={{ flex: 1 }}>
              <UserEvents />
            </Card>
          )}

          {userRole === "Teacher" && (
            <>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Card title="Calculated Midterm Grade Count" variant>
                    <div
                      style={{
                        fontSize: 24,
                        textAlign: "center",
                        padding: "24px 0",
                      }}
                    >
                      {gradeInfo.midtermCount}
                    </div>
                  </Card>
                </Col>
                <Col xs={24} sm={12}>
                  <Card title="Calculated Finals Grade Count" variant>
                    <div
                      style={{
                        fontSize: 24,
                        textAlign: "center",
                        padding: "24px 0",
                      }}
                    >
                      {gradeInfo.finalCount}
                    </div>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Col>
      </Row>

      {userRole === "Teacher" && (
        <Card title="My Students List" className="mt-4" variant={false}>
          <TeacherStudents />
        </Card>
      )}

      {/* REMOVED SUBJECTS & TEACHER MANAGEMENT */}
    </>
  );
}

export default MainDashboard;
