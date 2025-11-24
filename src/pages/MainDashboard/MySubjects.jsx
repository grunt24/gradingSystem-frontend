import React, { useEffect, useState } from "react";
import { Table, Select, Typography, Card, Spin, message } from "antd";
import axios from "axios";
import loginService from "../../api/loginService";
import academicPeriodService from "../../api/AcademicPeriodService";

const { Title } = Typography;
const { Option } = Select;

const axiosInstance = axios.create({
  baseURL: "https://localhost:7255/api",
  headers: {
    Authorization: `Bearer ${loginService.getToken()}`,
  },
});

const MySubjects = () => {
  const [loading, setLoading] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [academicPeriods, setAcademicPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    fetchStudentData();
    fetchAcademicPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId !== null) {
      fetchSubjectsByPeriod();
    }
  }, [selectedPeriodId]);

  const fetchStudentData = () => {
    const userDetails = loginService.getUserDetails();
    if (userDetails) {
      setStudentName(userDetails.fullname || userDetails.userName);
    } else {
      message.error("Student details not found. Please login.");
    }
  };

  const fetchAcademicPeriods = async () => {
    try {
      setLoading(true);
      const periods = await academicPeriodService.getAllAcademicPeriods();
      setAcademicPeriods(periods);
      const currentPeriod = periods.find((p) => p.isCurrent);
      if (currentPeriod) setSelectedPeriodId(currentPeriod.id);
    } catch (err) {
      message.error("Failed to load academic periods");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectsByPeriod = async () => {
    try {
      setLoading(true);
      const period = academicPeriods.find(
        (p) => p.id === Number(selectedPeriodId)
      );
      if (!period) return;

      const academicYear = `${period.startYear}-${period.endYear}`;
      const semester = period.semester.toLowerCase();

      const res = await axiosInstance.get("/StudentSubjects/student", {
        params: { academicYear, semester },
      });

      setSubjects(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      message.error(
        `Failed to fetch subjects: ${
          err.response?.data?.message || err.message
        }`
      );
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Student Name",
      dataIndex: "studentFullName",
      key: "studentFullName",
    },
    { title: "Subject Name", dataIndex: "subjectName", key: "subjectName" },
    { title: "Academic Year", dataIndex: "academicYear", key: "academicYear" },
  ];

  return (
    <Card style={{ margin: 20 }}>
      <Title level={4}>Subjects for: {studentName}</Title>

      <div style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 300 }}
          value={selectedPeriodId}
          onChange={(value) => setSelectedPeriodId(value)}
          placeholder="Select Academic Period"
        >
          {academicPeriods.map((p) => (
            <Option key={p.id} value={p.id}>
              AY {p.startYear}-{p.endYear} - {p.semester} Semester
            </Option>
          ))}
        </Select>
      </div>

      {loading ? (
        <Spin />
      ) : (
        <Table
          columns={columns}
          dataSource={subjects}
          rowKey={(record) => record.studentSubjectId || Math.random()}
        />
      )}
    </Card>
  );
};

export default MySubjects;
