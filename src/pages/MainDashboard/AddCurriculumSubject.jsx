import React, { useEffect, useState } from "react";
import {
  Card,
  Typography,
  Select,
  Button,
  message,
  Spin,
  Form,
  Table,
} from "antd";
import axiosInstance from "../../api/axiosInstance";

const { Title } = Typography;
const { Option } = Select;

const AddCurriculumSubject = () => {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [yearLevel, setYearLevel] = useState(null);
  const [semester, setSemester] = useState(null);
  const [curriculumSubjects, setCurriculumSubjects] = useState([]);

  useEffect(() => {
    fetchAllSubjects();
    fetchCurriculumSubjects();
  }, []);

  const fetchAllSubjects = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/Subjects");
      setSubjects(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      message.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurriculumSubjects = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/StudentSubjects/curriculum");

      if (Array.isArray(res.data)) {
        const grouped = {};

        res.data.forEach((group) => {
          const key = `${group.yearLevel} - ${group.semester}`;
          grouped[key] = {
            key,
            yearLevel: group.yearLevel,
            semester: group.semester,
            subjects: group.subjects.map((s) => ({
              key: s.curriculumSubjectId,
              subjectId: s.subjectId,
              subjectCode: s.subjectCode,
              subjectName: s.subjectName,
              credits: s.units || s.credits,
              department: s.department,
            })),
          };
        });

        setCurriculumSubjects(Object.values(grouped));
      } else {
        setCurriculumSubjects([]);
      }
    } catch (err) {
      message.error("Failed to load curriculum subjects");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSubject || !yearLevel || !semester) {
      message.warning("Please select subject, year level, and semester");
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.post("/StudentSubjects/add", {
        SubjectId: selectedSubject,
        YearLevel: yearLevel,
        Semester: semester,
      });
      message.success("Subject successfully added to curriculum");
      setSelectedSubject(null);
      setYearLevel(null);
      setSemester(null);
      fetchCurriculumSubjects();
    } catch (err) {
      message.error(
        err.response?.data?.message || "Failed to add subject to curriculum"
      );
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: "Subject Name", dataIndex: "subjectName", key: "subjectName" },
    { title: "Subject Code", dataIndex: "subjectCode", key: "subjectCode" },
    // { title: "Year Level", dataIndex: "yearLevel", key: "yearLevel" },
    // { title: "Semester", dataIndex: "semester", key: "semester" },
    { title: "Credits", dataIndex: "credits", key: "credits" },
    { title: "Department", dataIndex: "department", key: "department" },
  ];

  return (
    <Card style={{ margin: 20 }}>
      <Title level={4}>Add Subject to Curriculum</Title>
      <Form layout="vertical">
        <Form.Item label="Select Subject">
          <Select
            placeholder="Select Subject"
            value={selectedSubject}
            onChange={(val) => setSelectedSubject(val)}
            showSearch
            optionFilterProp="children"
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {subjects.map((s) => (
              <Option key={s.id} value={s.id}>
                {s.subjectName} ({s.subjectCode})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Year Level">
          <Select
            placeholder="Select Year Level"
            value={yearLevel}
            onChange={setYearLevel}
          >
            <Option value="1ST YEAR">1st Year</Option>
            <Option value="2ND YEAR">2nd Year</Option>
            <Option value="3RD YEAR">3rd Year</Option>
            <Option value="4TH YEAR">4th Year</Option>
          </Select>
        </Form.Item>

        <Form.Item label="Semester">
          <Select
            placeholder="Select Semester"
            value={semester}
            onChange={setSemester}
          >
            <Option value="First">First</Option>
            <Option value="Second">Second</Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            Add to Curriculum
          </Button>
          <Button style={{ marginLeft: 8 }} onClick={fetchCurriculumSubjects}>
            Refresh Table
          </Button>
        </Form.Item>
      </Form>
      <Title level={5} style={{ marginTop: 24 }}>
        Current Curriculum Subjects
      </Title>
      <Table
        columns={[
          { title: "Year Level", dataIndex: "yearLevel" },
          { title: "Semester", dataIndex: "semester" },
          {
            title: "Total Subjects",
            render: (_, record) => record.subjects.length,
          },
        ]}
        expandable={{
          expandedRowRender: (record) => (
            <Table
              columns={columns}
              dataSource={record.subjects}
              pagination={false}
              rowKey={(item) => item.subjectId}
            />
          ),
          defaultExpandedRowKeys: curriculumSubjects
            .filter(
              (c) =>
                c.yearLevel === "4TH YEAR" &&
                (c.semester === "First" || c.semester === "Second")
            )
            .map((c) => c.key),
        }}
        dataSource={curriculumSubjects}
        rowKey={(record) => record.key}
        loading={loading}
        locale={{ emptyText: "No subjects found" }}
      />
      ;
    </Card>
  );
};

export default AddCurriculumSubject;
