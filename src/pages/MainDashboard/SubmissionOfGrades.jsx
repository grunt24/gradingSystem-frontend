import React, { useEffect, useState } from "react";
import { Card, Table, DatePicker, Switch, Form, Button } from "antd";
import axiosInstance from "../../api/axiosInstance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import dayjs from "dayjs";

const SubmissionOfGrades = () => {
  const [statusData, setStatusData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchSubmissionStatus = async () => {
    try {
      const { data } = await axiosInstance.get("/AcademicPeriods/grade-submission-status");

      const tableData = [
        {
          key: "midterm",
          type: "Midterm",
          date: data.midtermDate ? dayjs(data.midtermDate).format("YYYY-MM-DD") : "-",
          isOpen: data.isMidterm,
          message: data.midtermMessage || "-",
        },
        {
          key: "finals",
          type: "Finals",
          date: data.finalsDate ? dayjs(data.finalsDate).format("YYYY-MM-DD") : "-",
          isOpen: data.isFinals,
          message: data.finalsMessage || "-",
        },
      ];
      setStatusData(tableData);

      if (data.midtermMessage) toast.warning(data.midtermMessage, { autoClose: false });
      if (data.finalsMessage) toast.warning(data.finalsMessage, { autoClose: false });

      // Prefill form with dayjs objects
      form.setFieldsValue({
        MidtermSubmissionDate: data.midtermDate ? dayjs(data.midtermDate) : null,
        FinalsSubmissionDate: data.finalsDate ? dayjs(data.finalsDate) : null,
        IsMidtermSubmissionOpen: data.isMidterm,
        IsFinalsSubmissionOpen: data.isFinals,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch submission status");
    }
  };

  useEffect(() => {
    fetchSubmissionStatus();
  }, []);

  const columns = [
    { title: "Type", dataIndex: "type", key: "type" },
    { title: "Submission Date", dataIndex: "date", key: "date" },
    {
      title: "Is Submission Open",
      dataIndex: "isOpen",
      key: "isOpen",
      render: (val) => (val ? "Yes" : "No"),
    },
    { title: "Message", dataIndex: "message", key: "message" },
  ];

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await axiosInstance.put("/AcademicPeriods/update-submission-dates", {
        MidtermSubmissionDate: values.MidtermSubmissionDate
          ? values.MidtermSubmissionDate.format("YYYY-MM-DD")
          : null,
        FinalsSubmissionDate: values.FinalsSubmissionDate
          ? values.FinalsSubmissionDate.format("YYYY-MM-DD")
          : null,
        IsMidtermSubmissionOpen: values.IsMidtermSubmissionOpen,
        IsFinalsSubmissionOpen: values.IsFinalsSubmissionOpen,
      });

      toast.success("Submission dates updated successfully!");
      fetchSubmissionStatus();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update submission dates");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <ToastContainer position="top-right" newestOnTop />
      <Card title="Grade Submission Status" style={{ marginBottom: 24 }}>
        <Table columns={columns} dataSource={statusData} pagination={false} rowKey="key" />
      </Card>

      <Card title="Update Submission Dates" style={{ maxWidth: 600, margin: "0 auto" }}>
        <Form layout="vertical" form={form} onFinish={onFinish}>
          <Form.Item label="Midterm Submission Date" name="MidtermSubmissionDate">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            label="Open Midterm Submission"
            name="IsMidtermSubmissionOpen"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item label="Finals Submission Date" name="FinalsSubmissionDate">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            label="Open Finals Submission"
            name="IsFinalsSubmissionOpen"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Update Submission Dates
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SubmissionOfGrades;
