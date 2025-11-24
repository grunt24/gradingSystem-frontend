import React, { useEffect, useState } from "react";
import { Select, Table, Card, Typography, Spin, message, Button } from "antd";
import axiosInstance from "../../api/axiosInstance";

const { Option } = Select;
const { Title } = Typography;

const StudentRecommendedSubjects = () => {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchRecommendedSubjects(selectedStudentId);
    } else {
      setSubjects([]);
    }
  }, [selectedStudentId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/Auth/all-students");
      if (Array.isArray(res.data)) setStudents(res.data);
      else setStudents([]);
    } catch (err) {
      message.error("Failed to fetch students");
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedSubjects = async (studentId) => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(
        `/StudentSubjects/student/${studentId}/recommended-subjects`
      );
      setSubjects(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      message.error("Failed to fetch recommended subjects");
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubjects = async () => {
    if (!selectedStudentId) {
      message.warning("Please select a student first");
      return;
    }
    if (!subjects.length) {
      message.warning("No subjects to update");
      return;
    }

    try {
      setUpdating(true);

      // map the correct property from API response
      const curriculumSubjectIds = subjects.map((s) => s.curriculumSubjectId);

      await axiosInstance.post("/StudentSubjects/update", {
        studentId: selectedStudentId,
        curriculumSubjectIds: curriculumSubjectIds,
      });

      message.success(
        "Student subjects updated successfully for current academic period."
      );
    } catch (err) {
      message.error(
        err.response?.data?.message || "Failed to update student subjects"
      );
    } finally {
      setUpdating(false);
    }
  };

  const columns = [
    { title: "Subject Name", dataIndex: "subjectName", key: "subjectName" },
    { title: "Subject Code", dataIndex: "subjectCode", key: "subjectCode" },
    { title: "Units", dataIndex: "units", key: "units" },
    { title: "Semester", dataIndex: "semester", key: "semester" },
    { title: "Year Level", dataIndex: "yearLevel", key: "yearLevel" },
  ];

  return (
    <Card style={{ margin: 20 }}>
      <Title level={4}>Subjects to Enroll</Title>

      <div style={{ marginBottom: 16 }}>
        <Select
          style={{ width: 300 }}
          placeholder="Select a student"
          value={selectedStudentId}
          onChange={(value) => setSelectedStudentId(value)}
          loading={loading}
        >
          {students.map((s) => (
            <Option key={s.id} value={s.id}>
              {s.fullname || s.username}
            </Option>
          ))}
        </Select>

        <Button
          type="primary"
          style={{ marginLeft: 8 }}
          onClick={handleUpdateSubjects}
          loading={updating}
          disabled={!selectedStudentId || !subjects.length}
        >
          Update Subjects
        </Button>
      </div>

      {loading ? (
        <Spin />
      ) : (
        <Table
          columns={columns}
          dataSource={subjects}
          rowKey={(record) => record.CurriculumSubjectId || Math.random()}
        />
      )}
    </Card>
  );
};

export default StudentRecommendedSubjects;
