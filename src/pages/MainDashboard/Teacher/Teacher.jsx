import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "../../../api/axiosInstance";
import loginService from "../../../api/loginService";
import { Card } from "antd";
import { PlusOutlined } from "@ant-design/icons";

function Teacher() {
  const [teachers, setTeachers] = useState([]);
  const [expandedTeacherId, setExpandedTeacherId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [loggedInUsername, setLoggedInUsername] = useState("");
  const [formData, setFormData] = useState({
    fullname: "",
    userId: null,
    username: "",
    password: "",
  });

  // Table state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const userDetails = loginService.getUserDetails();
    if (userDetails) {
      setUserRole(userDetails.role);
      setLoggedInUsername(userDetails.userName || userDetails.username);
      if (userDetails.role === "Teacher") {
        loadTeacherById(userDetails.id);
      } else if (userDetails.role === "Admin") {
        loadAllTeachers();
      }
    }
  }, []);

  useEffect(() => {
    if (userRole && loggedInUsername) {
      loadAllTeachers();
    }
  }, [userRole, loggedInUsername]);

  const loadTeacherById = async (teacherId) => {
    try {
      const res = await axiosInstance.get(`/Teachers/${teacherId}`);
      setTeachers([res.data]);
    } catch (error) {
      toast.error("Failed to load your teacher details.");
    }
  };

  const loadAllTeachers = async () => {
    try {
      const res = await axiosInstance.get("/Teachers");
      setTeachers(res.data);
    } catch (error) {
      toast.error("Failed to load teachers.");
    }
  };

  const openModal = (teacher = null) => {
    if (teacher) {
      setEditing(teacher);
      setFormData({
        fullname: teacher.fullname,
        userId: teacher.userId,
        username: teacher.username,
        password: "",
      });
    } else {
      setEditing(null);
      setFormData({
        fullname: "",
        username: "",
        password: "",
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = editing
      ? {
          fullname: formData.fullname,
          userId: formData.userId,
        }
      : {
          fullname: formData.fullname,
          username: formData.username,
          password: formData.password,
        };

    try {
      if (editing) {
        await axiosInstance.put(`/Teachers/${editing.id}`, payload);
      } else {

        // await axiosInstance.post(`/Teachers/create-teacher`, payload);

        await axiosInstance.post(`/Teachers/create-teacher-with-subjects`, payload);
      }

      toast.success(`Teacher ${editing ? "updated" : "created"} successfully!`);
      setShowModal(false);
      loadAllTeachers();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        `Failed to ${editing ? "update" : "create"} teacher.`;
      toast.error(message);
    }
  };

  const confirmDelete = (id) => {
    toast.info(
      () => (
        <div>
          Are you sure you want to delete this teacher?
          <div className="mt-2">
            <button
              className="btn btn-sm btn-danger me-2"
              onClick={async () => {
                try {
                  await axiosInstance.delete(`/Teachers/${id}`);
                  toast.dismiss();
                  toast.success("Teacher deleted.");
                  loadAllTeachers();
                } catch (err) {
                  toast.dismiss();
                  toast.error("Failed to delete.");
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

  const toggleSubjects = (teacherId) => {
    setExpandedTeacherId((prev) => (prev === teacherId ? null : teacherId));
  };

const filteredTeachers = teachers
  .filter((t) => {
    const name = t.fullname || "";
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  })
  .sort((a, b) => {
    const nameA = (a.fullname || "").toLowerCase();
    const nameB = (b.fullname || "").toLowerCase();
    return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  });


  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const displayedTeachers = filteredTeachers.slice(
    (currentPage - 1) * itemsPerPage,
    itemsPerPage === "All"
      ? filteredTeachers.length
      : currentPage * itemsPerPage
  );

  if (userRole === "Teacher" || userRole === "User") {
    return null;
  }

  return (
    <Card>
      <div>
        <button className="btn btn-success mb-3" onClick={() => openModal()}>
          <PlusOutlined />
        </button>

        <div className="row mb-3">
          <div className="col-md-6">
            <input
              className="form-control"
              placeholder="Search by Full Name..."
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

        <table className="table table-bordered table-hover">
          <thead className="table-light">
            <tr>
              <th
                onClick={() => setSortAsc((prev) => !prev)}
                style={{ cursor: "pointer" }}
              >
                Full Name {sortAsc ? "▲" : "▼"}
              </th>
              <th style={{ width: "350px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedTeachers.map((teacher) => (
              <React.Fragment key={teacher.id}>
                <tr>
                  <td>{teacher.fullname}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-info me-2"
                      onClick={() => toggleSubjects(teacher.id)}
                    >
                      {expandedTeacherId === teacher.id
                        ? "Hide Subjects"
                        : "View Subjects"}
                    </button>

                    <button
                      className="btn btn-sm btn-primary me-2"
                      onClick={() => openModal(teacher)}
                    >
                      Edit
                    </button>

                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => confirmDelete(teacher.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>

                {/* SUBJECT ROW */}
                {expandedTeacherId === teacher.id && (
                  <tr>
                    <td colSpan="2">
                      <strong>Assigned Subjects:</strong>

                      {teacher.subjects && teacher.subjects.length > 0 ? (
                        <ul className="mt-2">
                          {teacher.subjects.map((sub, index) => (
                            <li key={index}>
                              <b>{sub.subjectName}</b> ({sub.subjectCode}) –{" "}
                              {sub.credits} units
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2">No subject assigned.</p>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

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

        {/* Modal */}
        {showModal && (
          <div
            className="modal show d-block"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog">
              <form onSubmit={handleSubmit} className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editing ? "Edit Teacher" : "Add Teacher"}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  />
                </div>

                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Fullname</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.fullname}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          fullname: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  {!editing && (
                    <>
                      <div className="mb-3">
                        <label className="form-label">Username</label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.username}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              username: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Password</label>
                        <input
                          type="password"
                          className="form-control"
                          value={formData.password}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          required
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="modal-footer">
                  <button type="submit" className="btn btn-primary">
                    {editing ? "Update" : "Create"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
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

export default Teacher;
