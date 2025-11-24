import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "../../api/axiosInstance";
import loginService from "../../api/loginService";
import { Card, Tabs, Spin, Select as AntSelect } from "antd";

const { Option } = AntSelect;

function StudentSubject() {
  // State to manage the list of students.
  const [students, setStudents] = useState([]);
  // State to map user IDs to their assigned subjects, including grades.
  const [subjectsMap, setSubjectsMap] = useState({});
  // State for all available subjects in the system.
  const [availableSubjects, setAvailableSubjects] = useState([]);
  // State to track which student's details are currently expanded.
  const [expandedUserId, setExpandedUserId] = useState(null);
  // State to control visibility of the "Add Student" modal.
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  // State to control visibility of the "Assign Subjects" modal.
  const [showAssignSubjectsModal, setShowAssignSubjectsModal] = useState(false);
  // State for the new student form data.
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullname: "",
    department: "",
    yearLevel: "",
  });
  // State for the student ID selected in the "Assign Subjects" modal.
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  // State for the subject IDs selected in the "Assign Subjects" modal.
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  // State for the role of the current user.
  const [currentRole, setCurrentRole] = useState("");
  // Loading state for fetching data.
  const [loading, setLoading] = useState(true);

  // Table state for filtering, sorting, and pagination.
  const [searchTerm, setSearchTerm] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState("fullname"); // default sort field
  const [selectedStudentIds, setSelectedStudentIds] = useState([]); // array now

  // Main function to fetch all necessary data from the backend.
  const fetchStudentsAndSubjects = async () => {
    setLoading(true);
    try {
      const userDetails = loginService.getUserDetails();
      setCurrentRole(userDetails.role || "");

      // ✅ Fetch all students
      const { data: allStudents } = await axiosInstance.get(
        "/Auth/all-students"
      );

      // ✅ Filter for logged-in student if role is Student
      const filteredStudents =
        userDetails.role === "Student"
          ? allStudents.filter((s) => s.username === userDetails.userName)
          : allStudents;

      setStudents(filteredStudents);

      // ✅ Fetch all student-subject assignments
      const { data: studentSubjectsData } = await axiosInstance.get(
        "/StudentSubjects"
      );

      let map = {};

      if (userDetails.role !== "Student") {
        // ✅ For Teacher/Admin — Fetch grades normally
        const uniqueSubjectIds = new Set();
        studentSubjectsData.forEach((s) => {
          s.subjects.forEach((sub) => uniqueSubjectIds.add(sub.subjectId));
        });

        const subjectIdArray = Array.from(uniqueSubjectIds);
        const gradePromises = subjectIdArray.map((subjectId) =>
          axiosInstance.get(`/Grades/subject/${subjectId}`).catch((error) => {
            console.error(
              `Failed to fetch grades for subject ${subjectId}:`,
              error
            );
            return { data: [] };
          })
        );

        const gradeResults = await Promise.all(gradePromises);
        const gradesMap = {};
        gradeResults.forEach((res, index) => {
          const subjectId = subjectIdArray[index];
          gradesMap[subjectId] = res.data;
        });

        map = studentSubjectsData.reduce((acc, s) => {
          acc[s.userId] = s.subjects.map((sub) => {
            const studentGrades = (gradesMap[sub.subjectId] || []).find(
              (g) => g.studentId === s.userId
            );
            return {
              ...sub,
              mainGrade: studentGrades?.mainGrade || null,
              calculatedGrade: studentGrades?.calculatedGrade || null,
              scores: studentGrades?.scores || [],
            };
          });
          return acc;
        }, {});
      } else {
        // ✅ For Student — Skip grade fetching (avoid 403)
        map = studentSubjectsData.reduce((acc, s) => {
          acc[s.userId] = s.subjects.map((sub) => ({
            ...sub,
            mainGrade: null,
            calculatedGrade: null,
            scores: [],
          }));
          return acc;
        }, {});
      }

      setSubjectsMap(map);

      // ✅ Fetch all available subjects for modal use
      const { data: availData } = await axiosInstance.get("/Subjects");
      setAvailableSubjects(availData);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load student or subject data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsAndSubjects();
  }, []);

  // Toggle the visibility of a student's subjects.
  const toggleDetails = (id) =>
    setExpandedUserId((prev) => (prev === id ? null : id));

  // Handle input change in the "Add Student" form.
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submission for adding a new student.
  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post("/Auth/create-student", {
        studentNumber: formData.studentNumber,
        username: formData.username,
        password: formData.password,
        fullname: formData.fullname,
        department: formData.department,
        yearLevel: formData.yearLevel,
        role: "Student",
      });
      toast.success("Student added successfully!");
      setShowAddStudentModal(false);
      setFormData({
        studentNumber: "",
        username: "",
        password: "",
        fullname: "",
        department: "",
        yearLevel: "",
      });
      fetchStudentsAndSubjects();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error adding student.");
    }
  };

  // Display a confirmation toast for deleting a student.
  const confirmDelete = (id) => {
    toast.info(
      () => (
        <div>
          Are you sure you want to delete this student?
          <div className="mt-2">
            <button
              className="btn btn-sm btn-danger me-2"
              onClick={async () => {
                try {
                  await axiosInstance.delete(`/Auth/delete-user/${id}`);
                  toast.dismiss();
                  toast.success("Student deleted successfully.");
                  fetchStudentsAndSubjects();
                } catch (err) {
                  toast.dismiss();
                  toast.error("Failed to delete student.");
                  console.error(err);
                }
              }}
            >
              Yes, delete
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => toast.dismiss()}
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      {
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false,
      }
    );
  };

  // Handle form submission for assigning subjects to a student.
  const handleAssignSubjects = async (e) => {
    e.preventDefault();
    if (!selectedStudentIds.length)
      return toast.error("Please select at least one student.");
    if (!selectedSubjectIds.length)
      return toast.error("Please select at least one subject.");

    try {
      await axiosInstance.post("/StudentSubjects", {
        // make a new endpoint
        studentIds: selectedStudentIds,
        subjectIds: selectedSubjectIds,
      });

      toast.success("Subjects assigned successfully!");
      setShowAssignSubjectsModal(false);
      setSelectedStudentIds([]);
      setSelectedSubjectIds([]);
      fetchStudentsAndSubjects();
    } catch (err) {
      console.error(err);
      toast.error(
        err.response?.data?.message || "An unexpected error occurred."
      );
    }
  };

  // Filtering, sorting, and pagination logic.
  const filteredStudents = students
    .filter((s) => {
      const term = searchTerm.toLowerCase();
      const nameMatch = s.fullname?.toLowerCase().includes(term);
      const yearMatch = s.yearLevel?.toLowerCase().includes(term);
      return nameMatch || yearMatch;
    })
    .sort((a, b) => {
      if (sortField === "fullname") {
        return sortAsc
          ? a.fullname.localeCompare(b.fullname)
          : b.fullname.localeCompare(a.fullname);
      }
      if (sortField === "yearLevel") {
        const order = ["1st year", "2nd year", "3rd year", "4th year"];
        const getIndex = (y) => order.indexOf(y?.toLowerCase?.() || "");
        return sortAsc
          ? getIndex(a.yearLevel) - getIndex(b.yearLevel)
          : getIndex(b.yearLevel) - getIndex(a.yearLevel);
      }
      return 0;
    });

  // ✅ Apply pagination AFTER filtering
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const displayedStudents =
    itemsPerPage === "All"
      ? filteredStudents
      : filteredStudents.slice(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage
        );

  // ✅ Group AFTER filtering so search affects results properly
  const grouped = filteredStudents.reduce((acc, s) => {
    const dept = s.department || "Unknown Department";
    const year = s.yearLevel || "Unknown Year";
    if (!acc[dept]) acc[dept] = {};
    if (!acc[dept][year]) acc[dept][year] = [];
    acc[dept][year].push(s);
    return acc;
  }, {});

  return (
    <Card>
      <div>
        <h2 className="mb-4">Student Management</h2>

        <div className="d-flex justify-content-between align-items-center mb-3">
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ display: "flex", gap: "10px" }}>
              {currentRole === "Admin" && (
                <button
                  className="btn btn-success"
                  onClick={() => setShowAddStudentModal(true)}
                >
                  Add Student
                </button>
              )}

              {currentRole === "Teacher" && (
                <button
                  className="btn btn-info"
                  onClick={() => setShowAssignSubjectsModal(true)}
                >
                  Assign Subjects to Students
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="row my-3">
          <div className="col-md-6">
            <input
              className="form-control"
              placeholder="Search by Name or Year Level..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <select
              className="form-select"
              value={itemsPerPage}
              onChange={(e) => {
                const value =
                  e.target.value === "All" ? "All" : parseInt(e.target.value);
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
            >
              {[5, 10, 20, "All"].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center my-5">
            <Spin size="large" />
            <p className="mt-2">Loading students and grades...</p>
          </div>
        ) : (
          <Tabs
            type="card"
            items={Object.entries(grouped).map(([dept, years]) => ({
              key: dept,
              label: dept,
              children: (
                <Tabs
                  type="line"
                  items={Object.entries(years).map(
                    ([year, studentsByYear]) => ({
                      key: year,
                      label: year,
                      children: (
                        <div className="table-responsive mt-3">
                          <table className="table table-bordered table-hover">
                            <thead className="table-light">
                              <tr>
                                <th>Student Number</th>
                                <th>Full Name</th>
                                <th>Subjects</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentsByYear.map((student) => (
                                <tr key={student.id}>
                                  <td>{student.studentNumber}</td>
                                  <td>{student.fullname}</td>
                                  <td>
                                    {subjectsMap[student.id] &&
                                    subjectsMap[student.id].length > 0 ? (
                                      <ul className="list-unstyled mb-0">
                                        {subjectsMap[student.id].map((sub) => (
                                          <li key={sub.subjectId}>
                                            <strong>{sub.subjectName}</strong> (
                                            {sub.subjectCode}) –{" "}
                                            <em>{sub.teacherName}</em>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <span className="text-muted">
                                        No subjects
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    {currentRole !== "Student" && (
                                      <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() =>
                                          confirmDelete(student.id)
                                        }
                                      >
                                        Delete
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ),
                    })
                  )}
                />
              ),
            }))}
          />
        )}

        <div className="d-flex justify-content-between">
          <button
            className="btn btn-secondary"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((prev) => prev - 1)}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            Next
          </button>
        </div>

        {/* Add Student Modal */}
        {showAddStudentModal && (
          <div
            className="modal show d-block"
            tabIndex="-1"
            role="dialog"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog" role="document">
              <form onSubmit={handleAddStudent}>
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Add New Student</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowAddStudentModal(false)}
                      aria-label="Close"
                    />
                  </div>
                  <div className="modal-body">
                    {/* Student Number input */}
                    <div className="mb-3">
                      <label className="form-label">Student Number</label>
                      <input
                        type="text"
                        className="form-control"
                        name="studentNumber"
                        value={formData.studentNumber || ""}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    {/* Existing inputs */}
                    {["username", "password", "fullname"].map((f) => (
                      <div className="mb-3" key={f}>
                        <label className="form-label text-capitalize">
                          {f}
                        </label>
                        <input
                          type={f === "password" ? "password" : "text"}
                          className="form-control"
                          name={f}
                          value={formData[f] || ""}
                          onChange={handleInputChange}
                          required={f !== "fullname"}
                        />
                      </div>
                    ))}

                    <div className="mb-3">
                      <label className="form-label">Department</label>
                      <div className="btn-group d-flex flex-wrap gap-2">
                        {["BSBA", "BSIT", "BSA", "BSED"].map((dept) => (
                          <button
                            type="button"
                            key={dept}
                            className={`btn ${
                              formData.department === dept
                                ? "btn-primary"
                                : "btn-outline-primary"
                            } rounded-pill`}
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                department: dept,
                              }))
                            }
                          >
                            {dept}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Year Level</label>
                      <div className="btn-group d-flex flex-wrap gap-2">
                        {["1st year", "2nd year", "3rd year", "4th year"].map(
                          (year) => (
                            <button
                              type="button"
                              key={year}
                              className={`btn ${
                                formData.yearLevel === year
                                  ? "btn-primary"
                                  : "btn-outline-primary"
                              } rounded-pill`}
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  yearLevel: year,
                                }))
                              }
                            >
                              {year}
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="submit" className="btn btn-primary">
                      Add Student
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowAddStudentModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Subjects Modal */}
        {showAssignSubjectsModal && (
          <div
            className="modal show d-block"
            tabIndex="-1"
            role="dialog"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog" role="document">
              <form onSubmit={handleAssignSubjects}>
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Assign Subjects to Student</h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowAssignSubjectsModal(false)}
                      aria-label="Close"
                    />
                  </div>
                  <div className="modal-body">
                    {/* Select Student (Ant Design Select with search & virtualization) */}
                    <div className="mb-3">
                      <label className="form-label">Select Students</label>
                      <AntSelect
                        mode="multiple" // ✅ allow multiple selection
                        showSearch
                        suffixIcon={null}
                        allowClear
                        placeholder="Search and select students"
                        style={{ width: "100%" }}
                        optionFilterProp="label"
                        onChange={(val) => setSelectedStudentIds(val)} // array of selected IDs
                        value={selectedStudentIds}
                        dropdownMatchSelectWidth={false}
                        getPopupContainer={(triggerNode) =>
                          triggerNode.parentNode
                        }
                        filterOption={(input, option) => {
                          if (!option) return false;
                          const label = String(
                            option.label || ""
                          ).toLowerCase();
                          return label.includes(input.toLowerCase());
                        }}
                        virtual
                      >
                        {students.map((s) => (
                          <Option
                            key={s.id}
                            value={s.id}
                            label={`${s.fullname} — ${
                              s.yearLevel || "N/A"
                            } Year`}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span>
                                <strong>{s.fullname}</strong>
                              </span>
                              <small className="text-muted">
                                {s.yearLevel || "N/A"} - {s.department || "-"}
                              </small>
                            </div>
                          </Option>
                        ))}
                      </AntSelect>
                    </div>

                    {/* Filter Subjects by Department */}
                    {/* Filter Subjects by Department */}
                    <div className="mb-3">
                      <label className="form-label">Select Subjects</label>
                      <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                        {availableSubjects.length > 0 ? (
                          availableSubjects
                            .filter((sub) => {
                              if (
                                sub.subjectDepartment?.toLowerCase() ===
                                "general"
                              )
                                return true;

                              // if no student selected, show all subjects
                              if (selectedStudentIds.length === 0) return true;

                              // otherwise, filter by department of selected students
                              return selectedStudentIds.some((id) => {
                                const student = students.find(
                                  (s) => s.id === id
                                );
                                return (
                                  student?.department?.toLowerCase() ===
                                  sub.subjectDepartment?.toLowerCase()
                                );
                              });
                            })
                            .map((sub) => (
                              <div key={sub.id} className="form-check">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`sub-${sub.id}`}
                                  checked={selectedSubjectIds.includes(sub.id)}
                                  onChange={() => {
                                    setSelectedSubjectIds((prev) =>
                                      prev.includes(sub.id)
                                        ? prev.filter((id) => id !== sub.id)
                                        : [...prev, sub.id]
                                    );
                                  }}
                                />
                                <label
                                  className="form-check-label"
                                  htmlFor={`sub-${sub.id}`}
                                >
                                  {sub.subjectName} ({sub.subjectCode}) —{" "}
                                  <em>{sub.subjectDepartment}</em>
                                </label>
                              </div>
                            ))
                        ) : (
                          <p className="text-muted">No subjects available.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="submit" className="btn btn-primary">
                      Assign Subjects
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowAssignSubjectsModal(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      </div>
    </Card>
  );
}

export default StudentSubject;
