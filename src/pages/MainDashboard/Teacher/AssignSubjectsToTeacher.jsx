import React, { useEffect, useState } from "react";
import { Card, Select, Button, Table, Tag } from "antd";
import { toast, ToastContainer } from "react-toastify";
import axiosInstance from "../../../api/axiosInstance";

const { Option } = Select;

function AssignSubjectsToTeacher() {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);

  const [assignedSubjects, setAssignedSubjects] = useState([]);

  useEffect(() => {
    loadTeachers();
    loadSubjects();
  }, []);

  const loadTeachers = async () => {
    try {
      const res = await axiosInstance.get("/Teachers");
      setTeachers(res.data);
    } catch (error) {
      toast.error("Failed to load teachers");
    }
  };

  const loadSubjects = async () => {
    try {
      const res = await axiosInstance.get("/Subjects");
      setSubjects(res.data);
    } catch (error) {
      toast.error("Failed to load subjects");
    }
  };

  const loadTeacherSubjects = async (teacherId) => {
    try {
      const res = await axiosInstance.get(`/Teachers/${teacherId}`);

      const teacher = res.data;

      setAssignedSubjects(teacher.subjects || []);

      const currentSubjects = (teacher.subjects || [])
        .map((s) => s.id)
        .filter((id) => id !== null && id !== undefined);

      setSelectedSubjectIds(currentSubjects);
    } catch (error) {
      toast.error("Failed to load teacher’s subjects");
    }
  };

  const handleTeacherChange = async (teacherId) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    setSelectedTeacher(teacher);

    await loadTeacherSubjects(teacherId);
  };

  const handleAssignSubjects = async () => {
    if (!selectedTeacher) {
      toast.warning("Select a teacher first");
      return;
    }

    const cleanSubjectIds = selectedSubjectIds.filter(
      (id) => id !== null && id !== undefined
    );

    const payload = {
      fullname: selectedTeacher.fullname,
      userId: selectedTeacher.userId,
      subjectIds: cleanSubjectIds,
    };

    try {
      await axiosInstance.put(`/Teachers/${selectedTeacher.id}`, payload);

      toast.success("Subjects updated successfully!");

      // ✅ reload subjects table
      await loadTeacherSubjects(selectedTeacher.id);
    } catch (error) {
      console.error(error);
      toast.error("Failed to assign subjects");
    }
  };

  // ✅ Table columns
  const subjectColumns = [
    {
      title: "Subject Name",
      dataIndex: "subjectName",
      key: "subjectName",
    },
    {
      title: "Code",
      dataIndex: "subjectCode",
      key: "subjectCode",
    },
    {
      title: "Credits",
      dataIndex: "credits",
      key: "credits",
      align: "center",
    },
    {
      title: "Status",
      key: "status",
      render: () => <Tag color="blue">Assigned</Tag>,
    },
  ];

  return (
    <Card title="Assign Subjects to Teacher">
      {/* ✅ TABLE OF ASSIGNED SUBJECTS */}
      {selectedTeacher && (
        <div className="mb-4">
          <h5 className="fw-bold">
            Assigned Subjects of {selectedTeacher.fullname}
          </h5>

          <Table
            columns={subjectColumns}
            dataSource={assignedSubjects}
            rowKey="id"
            pagination={false}
            bordered
          />
        </div>
      )}

      {/* Select Teacher */}
      <div className="mb-3">
        <label className="form-label fw-bold">Select Teacher</label>
        <Select
          showSearch
          style={{ width: "100%" }}
          placeholder="Select a teacher"
          onChange={handleTeacherChange}
          optionFilterProp="children"
        >
          {teachers.map((t) => (
            <Option key={t.id} value={t.id}>
              {t.fullname}
            </Option>
          ))}
        </Select>
      </div>

      {/* Assign Subjects */}
      {selectedTeacher && (
        <>
          <div className="mb-3">
            <label className="form-label fw-bold">Assign Subjects</label>
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              value={selectedSubjectIds}
              onChange={(values) =>
                setSelectedSubjectIds(
                  values.filter((v) => v !== null && v !== undefined)
                )
              }
              placeholder="Select subjects..."
            >
              {subjects.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.subjectName}
                </Option>
              ))}
            </Select>
          </div>

          <Button type="primary" onClick={handleAssignSubjects}>
            Save Assignment
          </Button>
        </>
      )}

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </Card>
  );
}

export default AssignSubjectsToTeacher;
