import React, { useEffect, useState } from "react";
import {
  Table,
  Spin,
  Typography,
  Card,
  Tag,
  message,
  Switch,
  Button,
  Modal,
  Form,
  InputNumber,
  Select,
} from "antd";
import AcademicPeriodService from "../../api/AcademicPeriodService";
import { PlusOutlined } from "@ant-design/icons";

const { Title } = Typography;
const { Option } = Select;

const AcademicPeriods = () => {
  const [AcademicPeriods, setAcademicPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchAcademicPeriods = async () => {
    setLoading(true);
    try {
      const periods = await academicPeriodService.getAllAcademicPeriods();
      setAcademicPeriods(periods);
    } catch (error) {
      message.error("Failed to fetch academic periods.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademicPeriods();
  }, []);

  const handleToggleCurrent = async (record) => {
    setUpdatingId(record.id);
    try {
      await AcademicPeriodService.updateAcademicPeriod(record.id, {
        startYear: record.startYear,
        endYear: record.endYear,
        semester: record.semester,
      });

      message.success(
        `${record.startYear}-${record.endYear} ${record.semester} is now the current academic period.`
      );

      await fetchAcademicPeriods();
    } catch (error) {
      message.error("Failed to update current academic period.");
      console.error(error);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAddPeriod = async (values) => {
    try {
      await AcademicPeriodService.setCurrentAcademicPeriod(values);
      message.success(
        `${values.startYear}-${values.endYear} ${values.semester} added and set as current.`
      );
      setModalVisible(false);
      form.resetFields();
      await fetchAcademicPeriods();
    } catch (error) {
      message.error("Failed to add academic period.");
      console.error(error);
    }
  };

  const columns = [
    {
      title: "Academic Year",
      key: "academicYear",
      render: (_, record) => `${record.startYear}-${record.endYear}`,
    },
    {
      title: "Semester",
      dataIndex: "semester",
      key: "semester",
    },
    {
      title: "Current",
      dataIndex: "isCurrent",
      key: "isCurrent",
      render: (value, record) => (
        <Switch
          checked={value}
          loading={updatingId === record.id}
          onChange={() => handleToggleCurrent(record)}
          checkedChildren="Current"
          unCheckedChildren="Not Current"
        />
      ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value) => new Date(value).toLocaleString(),
    },
  ];

  return (
    <Spin spinning={loading} tip="Loading academic periods...">
      <Card
        style={{ margin: 20, overflowX: "auto" }}
        bodyStyle={{ padding: 0 }}
        title={<Title level={4}>Academic Periods</Title>}
        extra={
          <Button
            className="btn btn-success"
            onClick={() => setModalVisible(true)}
          >
            <PlusOutlined />
          </Button>
        }
      >
        <Table
          rowKey="id"
          dataSource={academicPeriods}
          columns={columns}
          pagination={{ pageSize: 10 }}
          scroll={{ x: "max-content", y: 400 }}
        />
      </Card>

      {/* Modal for adding new academic period */}
      <Modal
        title="Add Academic Period"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        okText="Add & Set Current"
      >
        <Form form={form} layout="vertical" onFinish={handleAddPeriod}>
          <Form.Item
            label="Start Year"
            name="startYear"
            rules={[{ required: true, message: "Start year is required" }]}
          >
            <InputNumber min={2000} max={2100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="End Year"
            name="endYear"
            rules={[{ required: true, message: "End year is required" }]}
          >
            <InputNumber min={2000} max={2100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label="Semester"
            name="semester"
            rules={[{ required: true, message: "Semester is required" }]}
          >
            <Select placeholder="Select semester">
              <Option value="First">First</Option>
              <Option value="Second">Second</Option>
              {/* <Option value="Summer">Summer</Option> */}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Spin>
  );
};

export default AcademicPeriods;
