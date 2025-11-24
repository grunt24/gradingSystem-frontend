import React, { useState } from "react";
import { toast } from "react-toastify";
import axiosInstance from "../api/axiosInstance";

function AddStudentModal({
  show,
  onClose,
  onSuccess, // callback after student is added
}) {
  const [formData, setFormData] = useState({
    studentNumber: "",
    username: "",
    password: "",
    fullname: "",
    department: "",
    yearLevel: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
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

      // Reset form
      setFormData({
        studentNumber: "",
        username: "",
        password: "",
        fullname: "",
        department: "",
        yearLevel: "",
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error adding student.");
    }
  };

  if (!show) return null;

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      role="dialog"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog" role="document">
        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add New Student</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                aria-label="Close"
              />
            </div>

            <div className="modal-body">
              {/* Student Number */}
              <div className="mb-3">
                <label className="form-label">Student Number</label>
                <input
                  type="text"
                  className="form-control"
                  name="studentNumber"
                  value={formData.studentNumber}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Username, Password, Fullname */}
              {["username", "password", "fullname"].map((f) => (
                <div className="mb-3" key={f}>
                  <label className="form-label text-capitalize">{f}</label>
                  <input
                    type={f === "password" ? "password" : "text"}
                    className="form-control"
                    name={f}
                    value={formData[f]}
                    onChange={handleInputChange}
                    required={f !== "fullname"}
                  />
                </div>
              ))}

              {/* Department */}
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

              {/* Year Level */}
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
                onClick={onClose}
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddStudentModal;
