import React, { useEffect, useState, useRef } from "react";
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
import { Card, Row, Col, Modal, Table } from "antd";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
    const fetchedRef = useRef(false); 
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
         if (fetchedRef.current) return; // already fetched, skip
    fetchedRef.current = true;
      try {
        const userDetails = loginService.getUserDetails();
        if (userDetails?.role) setUserRole(userDetails.role);

        const { data: users } = await axiosInstance.get("/Auth/all-users");
        const { data: studentGroup } = await axiosInstance.get(
          "/Auth/students-by-year-department"
        );
        setStudentGroupData(studentGroup);

        const { data: gradeResponse } = await axiosInstance.get(
          "/GradeCalculation/grades-count"
        );
        if (gradeResponse.success) setGradeInfo(gradeResponse.data);

        const roles = { Admin: 0, Teacher: 0, Student: 0 };
        users.forEach((user) => {
          if (user.role === "Superadmin") return;
          roles[user.role] = (roles[user.role] || 0) + 1;
        });
        setData(Object.keys(roles).map((role) => ({ role, count: roles[role] })));
        setRoleCounts(roles);

        const gradeCounts = dummyGrades.reduce(
          (acc, g) => {
            if (g.grade >= 75) acc.valid += 1;
            else acc.invalid += 1;
            return acc;
          },
          { valid: 0, invalid: 0 }
        );
        setGradeCounts(gradeCounts);

        if (userDetails.role === "Teacher") {
          // Teacher chart data
          const { data: teacherData } = await axiosInstance.get(
            "/Teachers/my-students"
          );
          setTeacherChartData(
            teacherData.map((sub) => ({
              subjectName: sub.subjectName,
              studentCount: sub.students?.length || 0,
            }))
          );

          // Grade submission status notifications
          const { data: submissionStatus } = await axiosInstance.get(
            "/AcademicPeriods/grade-submission-status"
          );

          if (submissionStatus?.midtermMessage) {
            toast.warning(submissionStatus.midtermMessage, { autoClose: false });
          }

          if (submissionStatus?.finalsMessage) {
            toast.warning(submissionStatus.finalsMessage, { autoClose: false });
          }
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
        toast.error("Failed to load dashboard data!", { autoClose: 5000 });
      }
    };

    fetchUserData();
  }, []);

  const columns = [
    { title: "Student Number", dataIndex: "studentNumber", key: "studentNumber" },
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
      <ToastContainer position="top-right" newestOnTop />

      <Modal
        title={yearDeptModal.title}
        open={yearDeptModal.visible}
        width={800}
        onCancel={() => setYearDeptModal({ visible: false, students: [], title: "" })}
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
          <Col xs={24} sm={24} md={12} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Card title="User Roles Distribution" style={{ flex: 1 }}>
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
                      label
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
            {/* Midterm / Finals Counts */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Card title="Calculated Midterm Grade Count">
                  <div style={{ fontSize: 24, textAlign: "center", padding: "24px 0" }}>
                    {gradeInfo.midtermCount}
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card title="Calculated Finals Grade Count">
                  <div style={{ fontSize: 24, textAlign: "center", padding: "24px 0" }}>
                    {gradeInfo.finalCount}
                  </div>
                </Card>
              </Col>
            </Row>
          </Col>
        )}

        {userRole === "Teacher" && (
          <Col xs={24} sm={24} md={24} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Card title="Calculated Midterm Grade Count">
                  <div style={{ fontSize: 24, textAlign: "center", padding: "24px 0" }}>
                    {gradeInfo.midtermCount}
                  </div>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card title="Calculated Finals Grade Count">
                  <div style={{ fontSize: 24, textAlign: "center", padding: "24px 0" }}>
                    {gradeInfo.finalCount}
                  </div>
                </Card>
              </Col>
            </Row>
            <Card title="My Students List" className="mt-4">
              <TeacherStudents />
            </Card>
          </Col>
        )}
      </Row>
    </>
  );
}

export default MainDashboard;
