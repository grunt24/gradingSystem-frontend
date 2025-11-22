import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, Select, Card, message } from "antd";
import axiosInstance from "../../api/axiosInstance";
import { PlusOutlined } from "@ant-design/icons";

function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  const [form] = Form.useForm();

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setLoading(true);
    const res = await axiosInstance.get("/Subjects");
    setSubjects(res.data);
    setLoading(false);
  };

  const openModal = (record = null) => {
    setEditingSubject(record);

    if (record) {
      form.setFieldsValue({
        subjectCode: record.subjectCode,
        subjectName: record.subjectName,
        description: record.description,
        credits: record.credits,
        department: record.department || record.subjectDepartment || "",
      });
    } else {
      form.resetFields();
    }

    setShowModal(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        subjectCode: values.subjectCode,
        subjectName: values.subjectName,
        description: values.description,
        credits: Number(values.credits),
        department: values.department,
      };

      if (editingSubject) {
        await axiosInstance.put(`/Subjects/${editingSubject.id}`, payload);
        message.success("Subject updated!");
      } else {
        await axiosInstance.post("/Subjects", payload);
        message.success("Subject created!");
      }

      setShowModal(false);
      loadSubjects();
    } catch {}
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: "Are you sure?",
      content: "This will permanently delete the subject.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        await axiosInstance
          .delete(`/Subjects/${id}`)
          .catch(() => message.error("Delete failed"));
        `/Subjects/${id}`;
        message.success("Subject deleted!");
        loadSubjects();
      },
    });
  };

  const columns = [
    {
      title: "Code",
      dataIndex: "subjectCode",
      sorter: (a, b) => a.subjectCode.localeCompare(b.subjectCode),
    },
    {
      title: "Name",
      dataIndex: "subjectName",
      sorter: (a, b) => a.subjectName.localeCompare(b.subjectName),
    },
    {
      title: "Description",
      dataIndex: "description",
      render: (txt) => txt || "―",
    },
    {
      title: "Credits",
      dataIndex: "credits",
    },
    {
      title: "Dept",
      dataIndex: "department",
      render: (txt, rec) => txt || rec.subjectDepartment || "―",
    },
    {
      title: "Category",
      dataIndex: "subjectDepartment",
    },
    {
      title: "Actions",
      render: (_, record) => (
        <>
          <Button type="primary" size="small" onClick={() => openModal(record)}>
            Edit
          </Button>
          <Button
            danger
            size="small"
            style={{ marginLeft: 8 }}
            onClick={() => handleDelete(record.id)}
          >
            Del
          </Button>
        </>
      ),
    },
  ];

  return (
    <Card
      title="Subjects"
      extra={
        <Button className="btn btn-success" onClick={() => openModal()}>
          <PlusOutlined />
        </Button>
      }
    >
      <Table
        dataSource={subjects}
        columns={columns}
        rowKey="id"
        loading={loading}
        scroll={{ y: 500 }}
        pagination={{ pageSize: 10 }}
        size="small"
      />

      <Modal
        open={showModal}
        title={editingSubject ? "Edit Subject" : "Add Subject"}
        onCancel={() => setShowModal(false)}
        onOk={handleSubmit}
        okText={editingSubject ? "Update" : "Create"}
      >
        <Form layout="vertical" form={form}>
          <Form.Item
            label="Subject Code"
            name="subjectCode"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Subject Name"
            name="subjectName"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <Input.TextArea />
          </Form.Item>

          <Form.Item
            label="Credits"
            name="credits"
            rules={[{ required: true }]}
          >
            <Input type="number" />
          </Form.Item>

          <Form.Item
            label="Department"
            name="department"
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value="BSIT">BSIT</Select.Option>
              <Select.Option value="BSBA">BSBA</Select.Option>
              <Select.Option value="BSED">BSED</Select.Option>
              <Select.Option value="BSA">BSA</Select.Option>
              <Select.Option value="GENERAL">GENERAL SUBJECT</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default Subjects;
