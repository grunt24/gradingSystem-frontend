import { useState } from "react";
import { Table, Button, Modal, Input, Row, Col } from "antd";

const { Search } = Input;

const Dashboard = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isGradeModalVisible, setIsGradeModalVisible] = useState(false); // For grade modal
  const [selectedRecord, setSelectedRecord] = useState(null); // To store selected department/level/section record
  const [selectedStudent, setSelectedStudent] = useState(null); // To store selected student
  const [searchText, setSearchText] = useState("");

  const showModal = (record) => {
    setSelectedRecord(record);
    setIsModalVisible(true);
  };

  const showGradeModal = (student) => {
    setSelectedStudent(student);
    setIsGradeModalVisible(true); // Show grade modal
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setIsGradeModalVisible(false); // Hide grade modal
    setSelectedRecord(null);
    setSelectedStudent(null);
  };

  const data = [
    {
      key: "1",
      department: "College",
      level: "1st Year",
      section: "I-BSIT",
      subjectCode: "IT 9 - Net 1",
      subjectTitle: "Networking 1",
      students: [
        {
          studentId: "2025-102",
          name: "Roxanne Recio",
          grades: [
            { subject: "Networking 1", assessment: 75, quiz: 78, exam: 80 },
          ],
        },
      ],
    },
    {
      key: "2",
      department: "College",
      level: "2nd Year",
      section: "II-BSIT",
      subjectCode: "IT 9 - Net 2",
      subjectTitle: "Networking 2",
      students: [
        {
          studentId: "2025-103",
          name: "Shaina Borres",
          grades: [
            { subject: "Networking 2", assessment: 75, quiz: 78, exam: 80 },
          ],
        },
      ],
    },
    {
      key: "3",
      department: "College",
      level: "3rd Year",
      section: "III-BSIT",
      subjectCode: "CS 1",
      subjectTitle: "Capstone 1",
      students: [
        {
          studentId: "2025-101",
          name: "Lawrence Paolo Mercado Caguicla",
          grades: [
            { subject: "Capstone 1", assessment: 85, quiz1: 60, quiz2: 70, quiz3: 99, exam: 88 },
          ],
        },
        {
          studentId: "2025-104",
          name: "Lance Christian",
          grades: [
            { subject: "Capstone 1", assessment: 99, quiz: 97, exam: 98 },
          ],
        },
      ],
    },
  ];

  const columns = [
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      filters: [
        { text: "COLLEGE", value: "COLLEGE" },
      ],
      onFilter: (value, record) => record.department === value,
    },
    {
      title: "Level",
      dataIndex: "level",
      key: "level",
      filters: [
        { text: "1st Year", value: "1st Year" },
        { text: "2nd Year", value: "2nd Year" },
      ],
      onFilter: (value, record) => record.level === value,
    },
    {
      title: "Section",
      dataIndex: "section",
      key: "section",
      filters: [
        { text: "I-BSIT", value: "I-BSIT" },
        { text: "II-BSBA", value: "II-BSBA" },
        { text: "II-BSED", value: "II-BSED" },
      ],
      onFilter: (value, record) => record.section === value,
    },
    {
      title: "Subject Code",
      dataIndex: "subjectCode",
      key: "subjectCode",
      filters: [
        { text: "IT 9 - Net 2", value: "IT 9 - Net 2" },
        { text: "CS 10 - OOP", value: "CS 10 - OOP" },
      ],
      onFilter: (value, record) => record.subjectCode === value,
    },
    {
      title: "Subject Title",
      dataIndex: "subjectTitle",
      key: "subjectTitle",
      filters: [
        { text: "Networking 2", value: "Networking 2" },
        { text: "Object Oriented Programming", value: "Object Oriented Programming" },
      ],
      onFilter: (value, record) => record.subjectTitle === value,
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button type="primary" onClick={() => showModal(record)}>
          View Students
        </Button>
      ),
    },
  ];

  const studentColumns = [
    { title: "Student ID", dataIndex: "studentId", key: "studentId" },
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Action",
      key: "action",
      render: (_, student) => (
        <Button
          type="primary"
          onClick={() => showGradeModal(student)} // To show grades for selected student
        >
          View Grades
        </Button>
      ),
    },
  ];

  const gradeColumns = [
    { title: "Subject", dataIndex: "subject", key: "subject" },
    { title: "Activity", dataIndex: "assessment", key: "assessment" },
    { title: "Quiz1", dataIndex: "quiz1", key: "quiz1" },
    { title: "Quiz2", dataIndex: "quiz2", key: "quiz2" },
    { title: "Quiz3", dataIndex: "quiz3", key: "quiz3" },

    { title: "Exam", dataIndex: "exam", key: "exam" },
  ];

  return (
    <div style={{ padding: 20, margin: "auto", background: "#fff" }}>
              <h1>School Year: 2025-2025</h1>
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Search
            placeholder="Search..."
            allowClear
            onSearch={(value) => setSearchText(value)}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Col>

      </Row>

      <Table
        columns={columns}
        dataSource={data.filter((item) => {
          const matchesSearch =
            Object.values(item).some((val) =>
              String(val).toLowerCase().includes(searchText.toLowerCase())
            );
          return matchesSearch;
        })}
        pagination={{ pageSize: 5 }}
        rowKey="key"
      />

<Modal
  title="Students List"
  open={isModalVisible}
  onCancel={handleCancel}
  footer={[
    <Button key="close" onClick={handleCancel}>
      Close
    </Button>,
  ]}
>
  {selectedRecord && (
    <>
      <p><strong>Department:</strong> {selectedRecord.department}</p>
      <p><strong>Level:</strong> {selectedRecord.level}</p>
      <p><strong>Section:</strong> {selectedRecord.section}</p>
      <p><strong>Subject Code:</strong> {selectedRecord.subjectCode}</p>
      <p><strong>Subject Title:</strong> {selectedRecord.subjectTitle}</p>

      <h3>Students</h3>

      {/* Filter the students based on the selected subject and level */}
      <Table
        columns={studentColumns}
        dataSource={selectedRecord.students.filter((student) =>
          student.grades.some((grade) => grade.subject === selectedRecord.subjectTitle)
        )}
        pagination={false}
        rowKey="studentId"
      />
    </>
  )}
</Modal>

      <Modal
        title={`Grades for ${selectedStudent?.name}`}
        open={isGradeModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="close" onClick={handleCancel}>
            Close
          </Button>,
        ]}
      >
        {selectedStudent && (
          <Table
            columns={gradeColumns}
            dataSource={selectedStudent.grades}
            pagination={false}
            rowKey="subject"
          />
        )}
      </Modal>
    </div>
  );
};

export default Dashboard;
