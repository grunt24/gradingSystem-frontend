import React, { useState, useEffect } from "react";
import {
  Steps,
  Button,
  Form,
  Input,
  Select,
  Checkbox,
  Row,
  Col,
  Card,
  Typography,
  message,
  Spin,
  Alert,
  Tag,
} from "antd";
import {
  UserOutlined,
  BookOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import axiosInstance from "../../api/axiosInstance";

const { Title, Text } = Typography;
const { Option } = Select;
const { Step } = Steps;

// API Endpoints (assuming base path is configured in axiosInstance)
const API_BASE = "/StudentRegistrations";
const CREATE_STUDENT_ENDPOINT = `${API_BASE}/create-student`;
const RECOMMENDED_SUBJECTS_ENDPOINT = `${API_BASE}/recommended-subjects`;
const ENROLL_ENDPOINT = `${API_BASE}/enroll-recommended`;

// --- Mock Data (Replace with real API calls if needed) ---
const DEPARTMENT_OPTIONS = [
  { value: "BSIT", label: "Bachelor of Science in Information Technology" },
  { value: "BSED", label: "Bachelor of Secondary Education" },
  { value: "BSBA", label: "Bachelor of Science in Business Administration" },
];
const YEAR_LEVEL_OPTIONS = [
  { value: "1st Year", label: "1st Year" },
  { value: "2nd Year", label: "2nd Year" },
  { value: "3rd Year", label: "3rd Year" },
  { value: "4th Year", label: "4th Year" },
];
// -----------------------------------------------------------

const StudentRegistration = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // State to hold temporary data across steps
  const [studentDetails, setStudentDetails] = useState({});
  const [recommendedSubjects, setRecommendedSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  
  // To hold the automatically generated student number
  const [newStudentNumber, setNewStudentNumber] = useState(null); 

  // --- Handlers for Navigation ---

  const handleNext = async () => {
    try {
      // Validate form fields for the current step
      const values = await form.validateFields();

      if (currentStep === 0) {
        // Step 1: Student Details -> Cache data and move to Step 2
        setStudentDetails(values);
        // We fetch subjects *before* moving to the next step
        await fetchRecommendedSubjects(values.yearLevel, values.department);
      }

      setCurrentStep(currentStep + 1);
    } catch (error) {
      // console.log("Validation Failed:", error);
      message.error("Please fill in all required fields.");
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  // --- Handlers for API Calls ---

  const fetchRecommendedSubjects = async (yearLevel, department) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(
        `${RECOMMENDED_SUBJECTS_ENDPOINT}`,
        {
          params: { yearLevel, department },
        }
      );

      const subjects = Array.isArray(response.data) ? response.data : [];
      setRecommendedSubjects(subjects);

      // Automatically select all recommended subjects initially
      setSelectedSubjectIds(subjects.map(s => s.curriculumSubjectId));

      message.success(`Found ${subjects.length} recommended subjects.`);
    } catch (error) {
      console.error("Error fetching recommended subjects:", error);
      message.error("Failed to fetch recommended subjects.");
      setRecommendedSubjects([]);
      setSelectedSubjectIds([]);
    } finally {
      setLoading(false);
    }
  };

// ... inside StudentRegistration component

  const handleSubmitRegistration = async () => {
    setLoading(true);
    let newStudentId = null;

    try {
      // 1. CREATE STUDENT ACCOUNT
      const studentPayload = {
        fullName: studentDetails.fullName,
        username: studentDetails.username,
        password: studentDetails.password,
        yearLevel: studentDetails.yearLevel,
        department: studentDetails.department,
      };

      message.loading("Step 1/2: Creating student account...", 0);
      const createResponse = await axiosInstance.post(
        CREATE_STUDENT_ENDPOINT,
        studentPayload
      );

      message.destroy();

      const { id, studentNumber } = createResponse.data;
      newStudentId = id;
      setNewStudentNumber(studentNumber);

      if (!newStudentId) {
        throw new Error("Student ID not returned after creation.");
      }

      // 2. ENROLL RECOMMENDED SUBJECTS
      if (selectedSubjectIds.length > 0) {
        message.loading("Step 2/2: Enrolling student in subjects...", 0);

        // ✅ FIX: Map selected curriculumSubjectIds (from state) back to SubjectIds (from API data)
        const finalSubjectIds = recommendedSubjects
          .filter(subject => selectedSubjectIds.includes(subject.curriculumSubjectId))
          .map(subject => subject.subjectId); // <-- Now extracting the correct SubjectId

        // Check if any valid subject IDs were found after mapping
        if (finalSubjectIds.length === 0) {
          message.destroy();
          message.warning("Subjects were selected but no valid Subject IDs were found. Skipping enrollment.");
        } else {
            // Payload matches StudentSubjectsDtoV2 { studentIds: List<int>, subjectIds: List<int>? }
            const enrollmentPayload = {
              studentIds: [newStudentId], // Send single ID wrapped in an array
              subjectIds: finalSubjectIds, // Use the new array of SubjectIds
            };
            
            console.log("Enrollment Payload being sent (SubjectIds):", enrollmentPayload);

            await axiosInstance.post(ENROLL_ENDPOINT, enrollmentPayload);

            message.destroy();
            message.success("✅ Student registered and enrolled successfully!");
        }
      } else {
        message.success("✅ Student registered successfully! No subjects were selected for enrollment.");
      }

      // Move to success screen
      setCurrentStep(3);
    } catch (error) {
      message.destroy();
      console.error("Registration failed:", error);
      const errorMsg = error.response?.data?.message || error.message || "An unexpected error occurred during registration.";
      message.error(`❌ Registration Failed: ${errorMsg}`);
      setNewStudentNumber(null); // Clear number on failure
    } finally {
      setLoading(false);
    }
  };

// ...

  // --- Step Content Components ---

  const stepContent = [
    // Step 0: Student Details
    <Form
      form={form}
      layout="vertical"
      initialValues={studentDetails}
      key="step0"
    >
      <Title level={4}>Student Account and Personal Details</Title>
      <Alert 
        message="Student Number is Auto-Generated" 
        description="The student number will be automatically generated upon final submission." 
        type="info" 
        showIcon 
        style={{ marginBottom: 20 }}
      />
      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            name="fullName"
            label="Full Name"
            rules={[{ required: true, message: "Please enter the full name" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="e.g., Jane Doe" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Please enter a username" }]}
          >
            <Input placeholder="Unique username" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: "Please create a password" }]}
          >
            <Input.Password placeholder="Secure password" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="department"
            label="Department / Course"
            rules={[{ required: true, message: "Please select a course" }]}
          >
            <Select placeholder="Select course">
              {DEPARTMENT_OPTIONS.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="yearLevel"
            label="Year Level"
            rules={[{ required: true, message: "Please select year level" }]}
          >
            <Select placeholder="Select year level">
              {YEAR_LEVEL_OPTIONS.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </Form>,

    // Step 1: Recommended Subjects
    <div key="step1">
      <Title level={4}>
        Recommended Subjects for {studentDetails.department} -{" "}
        {studentDetails.yearLevel}
      </Title>

      <Spin spinning={loading} tip="Fetching subjects...">
        {recommendedSubjects.length > 0 ? (
          <Checkbox.Group
            style={{ width: "100%" }}
            onChange={setSelectedSubjectIds}
            value={selectedSubjectIds}
          >
            <Row gutter={[16, 16]}>
              {recommendedSubjects.map((subject) => (
                <Col span={24} key={subject.curriculumSubjectId}>
                  <Card
                    size="small"
                    style={{
                      backgroundColor: selectedSubjectIds.includes(subject.curriculumSubjectId) ? '#f6ffed' : '#fff',
                      borderColor: selectedSubjectIds.includes(subject.curriculumSubjectId) ? '#52c41a' : '#d9d9d9',
                    }}
                  >
                    <Checkbox value={subject.curriculumSubjectId}>
                      <Text strong>{subject.subjectCode}</Text> -{" "}
                      {subject.subjectName} ({subject.units} Units)
                      <Tag style={{ marginLeft: 8 }} color="blue">
                        {subject.department}
                      </Tag>
                    </Checkbox>
                  </Card>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        ) : (
          <Text type="secondary">
            {loading ? "Loading..." : "No recommended subjects found for the selected year and department. You may proceed without selecting any."}
          </Text>
        )}
      </Spin>
    </div>,

    // Step 2: Confirmation/Review
    <div key="step2">
      <Title level={4}>Review & Finalize Registration</Title>
      <Row gutter={16}>
        <Col span={12}>
          <Card title="Student Details" bordered style={{ height: '100%' }}>
            <p>
              <Text strong>Full Name:</Text> {studentDetails.fullName}
            </p>
            <p>
              <Text strong>Course:</Text> {studentDetails.department}
            </p>
            <p>
              <Text strong>Year Level:</Text> {studentDetails.yearLevel}
            </p>
            <p>
              <Text strong>Username:</Text> {studentDetails.username}
            </p>
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title={`Subjects to Enroll (${selectedSubjectIds.length})`}
            bordered
            style={{ height: '100%', overflowY: 'auto' }}
          >
            {recommendedSubjects
              .filter((s) => selectedSubjectIds.includes(s.curriculumSubjectId))
              .map((s) => (
                <p key={s.curriculumSubjectId} style={{ margin: 0 }}>
                  <Text code>{s.subjectCode}</Text> {s.subjectName}
                </p>
              ))}
            {selectedSubjectIds.length === 0 && (
              <Text type="warning">No subjects selected for enrollment.</Text>
            )}
          </Card>
        </Col>
      </Row>
      <Alert
        message="Final Action: Account Creation and Enrollment"
        description="Click 'Submit Registration' to create the student account (with an auto-generated Student Number) and enroll them in the selected subjects."
        type="info"
        showIcon
        style={{ marginTop: 20 }}
      />
    </div>,

    // Step 3: Success
    <div key="step3" style={{ textAlign: 'center', padding: '50px 0' }}>
      <CheckCircleOutlined style={{ fontSize: 72, color: '#52c41a' }} />
      <Title level={3} style={{ marginTop: 20 }}>
        Registration Complete!
      </Title>
      {newStudentNumber && (
        <Alert
          message={<Text strong style={{ fontSize: '1.2em' }}>New Student Number: {newStudentNumber}</Text>}
          description="Please save this number for future reference."
          type="success"
          showIcon
          style={{ marginTop: 20, maxWidth: 400, margin: '20px auto' }}
        />
      )}
      <Text style={{ display: 'block', marginTop: 10 }}>The new student account has been created and enrollment has been finalized.</Text>
      <a href="/">Login</a>

    </div>,
  ];

  const steps = [
    {
      title: "Student Details",
      icon: <UserOutlined />,
    },
    {
      title: "Select Subjects",
      icon: <BookOutlined />,
    },
    {
      title: "Review & Submit",
      icon: <CheckCircleOutlined />,
    },
  ];

  return (
    <Card style={{ maxWidth: 1000, margin: "40px auto", padding: 24 }}>
      <Title level={2} style={{ textAlign: "center", marginBottom: 30 }}>
        New Student Registration
      </Title>
      <Steps current={currentStep} style={{ marginBottom: 40 }}>
        {steps.map((item) => (
          <Step key={item.title} title={item.title} icon={item.icon} />
        ))}
      </Steps>

      <div className="steps-content" style={{ minHeight: 300 }}>
        {stepContent[currentStep]}
      </div>

      <div className="steps-action" style={{ marginTop: 24, textAlign: 'right' }}>
        {currentStep < 2 && currentStep > 0 && (
          <Button style={{ margin: "0 8px" }} onClick={handlePrev}>
            Previous
          </Button>
        )}

        {currentStep === 0 && (
            <>
    <a href="/" style={{marginRight: 20}}>go back to login</a>
                    <Button type="primary" onClick={handleNext} loading={loading}>
            Next
          </Button>
            </>

        )}

        {currentStep === 1 && (
          <>
            <Button style={{ margin: "0 8px" }} onClick={handlePrev}>
                Previous
            </Button>
            <Button type="primary" onClick={handleNext} disabled={loading}>
                Next
            </Button>
          </>
        )}

        {currentStep === 2 && (
          <>
            <Button style={{ margin: "0 8px" }} onClick={handlePrev} disabled={loading}>
              Previous
            </Button>
            <Button
              type="primary"
              onClick={handleSubmitRegistration}
              loading={loading}
            >
              Submit Registration
            </Button>
          </>
        )}

        {currentStep === 3 && (
          <Button type="default" onClick={() => {
            setCurrentStep(0);
            form.resetFields();
            setStudentDetails({});
            setRecommendedSubjects([]);
            setSelectedSubjectIds([]);
            setNewStudentNumber(null); // Reset generated number
          }}>
            Register Another Student
          </Button>
        )}
      </div>
    </Card>
  );
};

export default StudentRegistration;