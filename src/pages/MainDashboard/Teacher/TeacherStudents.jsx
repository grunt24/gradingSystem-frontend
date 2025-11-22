import React, { useEffect, useState } from "react";
import axiosInstance from "../../../api/axiosInstance";
import { Table, Input, Spin, Typography, Card } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Title } = Typography;

const TeacherStudents = () => {
  const [subjects, setSubjects] = useState([]);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    const fetchSubjectsWithStudents = async () => {
      try {
        const response = await axiosInstance.get("/Teachers/my-students");

        const subjectsWithKeys = response.data.map((subject, index) => ({
          ...subject,
          key: index,
          students: subject.students.map((student, i) => ({
            ...student,
            key: `${subject.subjectId}-${student.userId}-${i}`,
          })),
        }));

        setSubjects(subjectsWithKeys);
        setFilteredSubjects(subjectsWithKeys);
      } catch (err) {
        console.error("Failed to fetch subjects and students:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjectsWithStudents();
  }, []);

  const handleSearch = (e) => {
    const keyword = e.target.value.toLowerCase();
    setSearchKeyword(keyword);

    if (!keyword) {
      setFilteredSubjects(subjects);
      return;
    }

    const filtered = subjects
      .map((subject) => {
        const subjectMatch =
          subject.subjectName.toLowerCase().includes(keyword) ||
          subject.subjectCode.toLowerCase().includes(keyword);

        const filteredStudents = subject.students.filter((student) =>
          student.fullname?.toLowerCase().includes(keyword)
        );

        if (subjectMatch || filteredStudents.length > 0) {
          return {
            ...subject,
            students: subjectMatch ? subject.students : filteredStudents,
          };
        }

        return null;
      })
      .filter(Boolean);

    setFilteredSubjects(filtered);
  };

  const studentColumns = [
    {
      title: "Student Name",
      dataIndex: "fullname",
      key: "fullname",
    },
    {
      title: "Year Level",
      dataIndex: "yearLevel",
      key: "yearLevel",
      render: (text) => text || "N/A",
    },
  ];

  return (
    <div
      style={{
        // padding: '24px',
        overflow: "auto",
        maxHeight: "calc(100vh - 150px)",
      }}
    >
      <Input
        placeholder="Search by subject or student name..."
        prefix={<SearchOutlined />}
        value={searchKeyword}
        onChange={handleSearch}
        allowClear
        style={{ marginBottom: 24, maxWidth: 400 }}
      />

      {loading ? (
        <div className="text-center">
          <Spin size="large" tip="Loading..." />
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="alert alert-info">No subjects or students found.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {filteredSubjects.map((subject) => (
            <Card
              key={subject.subjectId}
              title={`${subject.subjectName} (${subject.subjectCode})`}
              variant="outlined"
              style={{
                width: "100%",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                borderRadius: "8px",
              }}
            >
              {subject.students.length === 0 ? (
                <p className="text-muted">No students enrolled.</p>
              ) : (
                <Table
                  columns={studentColumns}
                  dataSource={subject.students}
                  pagination={{ pageSize: 5 }}
                  variant
                  scroll={{ x: true }}
                />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherStudents;
