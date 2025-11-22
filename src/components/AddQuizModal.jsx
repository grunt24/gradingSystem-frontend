// src/components/Modals/AddQuizModal.js
import React, { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  InputNumber,
  Table,
  Spin,
  message,
} from "antd";
import axiosInstance from "../../api/axiosInstance";

const ADD_QUIZ_API = "/Quizzes/add-quiz";

const AddQuizModal = ({ open, onClose, midtermGrades, subjectId, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [quizScores, setQuizScores] = useState([]);

  useEffect(() => {
    if (midtermGrades && midtermGrades.length > 0) {
      const initialScores = midtermGrades.map((student) => ({
        studentId: student.studentId,
        studentName: student.studentFullName,
        midtermGradeId: student.id,
        quizScore: 0,
      }));
      setQuizScores(initialScores);
    }
  }, [midtermGrades]);

  const handleScoreChange = (value, studentId) => {
    const updated = quizScores.map((student) =>
      student.studentId === studentId
        ? { ...student, quizScore: value }
        : student
    );
    setQuizScores(updated);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const payload = {
        subjectId: subjectId,
        quizLabel: values.quizLabel,
        quizTotal: values.quizTotal,
        studentScores: quizScores.map((q) => ({
          studentId: q.studentId,
          midtermGradeId: q.midtermGradeId,
          quizScore: q.quizScore,
        })),
      };

      setLoading(true);
      const response = await axiosInstance.post(ADD_QUIZ_API, payload);

      if (response.status === 200) {
        message.success("Quiz added successfully!");
        onSuccess?.();
        onClose();
      } else {
        message.error("Failed to add quiz.");
      }
    } catch (err) {
      console.error(err);
      message.error("Error adding quiz. Please check the fields.");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "Student Name",
      dataIndex: "studentName",
      key: "studentName",
    },
    {
      title: "Quiz Score",
      key: "quizScore",
      render: (_, record) => (
        <InputNumber
          min={0}
          onChange={(value) => handleScoreChange(value, record.studentId)}
        />
      ),
    },
  ];

  return (
    <Modal
      title="Add Quiz"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Submit"
      width={700}
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical">
          <Form.Item
            label="Quiz Label"
            name="quizLabel"
            rules={[{ required: true, message: "Please input quiz label" }]}
          >
            <Input placeholder="e.g., Quiz 2" />
          </Form.Item>
          <Form.Item
            label="Quiz Total"
            name="quizTotal"
            rules={[{ required: true, message: "Please input quiz total" }]}
          >
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Form>

        <h3 style={{ marginTop: 20 }}>Enter Scores for Students</h3>
        <Table
          rowKey="studentId"
          columns={columns}
          dataSource={quizScores}
          pagination={false}
        />
      </Spin>
    </Modal>
  );
};

export default AddQuizModal;
