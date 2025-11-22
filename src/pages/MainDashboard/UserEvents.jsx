import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axiosInstance from "../../api/axiosInstance";

function UserEvents() {
  const [userEvents, setUserEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadUserEvents();
  }, []);

  const loadUserEvents = async () => {
    try {
      const res = await axiosInstance.get("/Auth/user-events");
      setUserEvents(res.data); // Assuming the API returns a list of user events
    } catch (error) {
      toast.error("Failed to load user events.");
      console.error(error);
    }
  };

  const filteredEvents = userEvents
    .filter((event) =>
      event.eventDescription.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const timestampA = new Date(a.timestamp);
      const timestampB = new Date(b.timestamp);
      return sortAsc ? timestampA - timestampB : timestampB - timestampA;
    });

  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const displayedEvents = filteredEvents.slice(
    (currentPage - 1) * itemsPerPage,
    itemsPerPage === "All" ? filteredEvents.length : currentPage * itemsPerPage
  );

  return (
    <div style={{ fontSize: 12 }}>
      {/* <div className="row mb-3">
        <div className="col-md-6">
          <input
            className="form-control"
            placeholder="Search by Event Description..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={itemsPerPage}
            onChange={e => {
              const value = e.target.value === 'All' ? 'All' : parseInt(e.target.value);
              setItemsPerPage(value);
              setCurrentPage(1);
            }}
          >
            {[5, 10, 20, 'All'].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
      </div> */}

      <table className="table table-bordered table-hover">
        <thead className="table-light">
          <tr>
            <th
              onClick={() => setSortAsc((prev) => !prev)}
              style={{ cursor: "pointer" }}
            >
              Event Description {sortAsc ? "▲" : "▼"}
            </th>
            <th style={{ width: 50 }}>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {displayedEvents.map((event) => (
            <tr key={event.id}>
              <td>{event.eventDescription}</td>
              <td>{new Date(event.timestamp).toLocaleString()}</td>
            </tr>
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

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
}

export default UserEvents;
