import React, { useEffect, useState } from "react";
import { Table, Card, Spin } from "antd";
import axiosInstance from "../../api/axiosInstance";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const FinalCourseGrade = () => {
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const fetchFinalCourseGrades = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/FinalsGrade/finals-course-grade");
      setGrades(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch final course grades");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinalCourseGrades();
  }, []);

  // Update window width for responsiveness
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const columns = [
    { title: "Student Name", dataIndex: "studentName", key: "studentName", responsive: ["xs", "sm", "md", "lg", "xl"] },
    { title: "Computed Midterm Grade", dataIndex: "computedTotalMidtermGrade", key: "computedTotalMidtermGrade", responsive: ["sm", "md", "lg", "xl"] },
    { title: "Rounded Midterm Grade", dataIndex: "roundedTotalMidtermGrade", key: "roundedTotalMidtermGrade", responsive: ["sm", "md", "lg", "xl"] },
    { title: "Computed Final Grade", dataIndex: "computedTotalFinalGrade", key: "computedTotalFinalGrade", responsive: ["sm", "md", "lg", "xl"] },
    { title: "Rounded Final Grade", dataIndex: "roundedTotalFinalGrade", key: "roundedFinalGrade", responsive: ["sm", "md", "lg", "xl"] },
    { title: "Computed Final Course Grade", dataIndex: "computedFinalCourseGrade", key: "computedFinalCourseGrade", responsive: ["md", "lg", "xl"] },
    { title: "Rounded Final Course Grade", dataIndex: "roundedFinalCourseGrade", key: "roundedFinalCourseGrade", responsive: ["md", "lg", "xl"] },
  ];

  // Horizontal scroll only for small screens
  const scrollX = windowWidth < 992 ? "max-content" : undefined;

  // Adjust font size based on screen width
  const fontSize = windowWidth < 576 ? 10 : windowWidth < 768 ? 11 : 12;
  const headerFontSize = windowWidth < 576 ? 11 : windowWidth < 768 ? 12 : 13;

  return (
    <div style={{ padding: 24 }}>
      <ToastContainer position="top-right" newestOnTop />
      <Card title="Final Course Grades">
        {loading ? (
          <Spin size="large" style={{ display: "block", margin: "20px auto" }} />
        ) : (
          <Table
            columns={columns}
            dataSource={grades}
            rowKey={(record) => record.id}
            pagination={{ pageSize: 10 }}
            scroll={scrollX ? { x: scrollX } : undefined}
            components={{
              header: {
                cell: ({ children, ...props }) => (
                  <th {...props} style={{ fontSize: headerFontSize, padding: "6px 8px" }}>
                    {children}
                  </th>
                ),
              },
              body: {
                cell: ({ children, ...props }) => (
                  <td {...props} style={{ fontSize: fontSize, padding: "4px 8px" }}>
                    {children}
                  </td>
                ),
              },
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default FinalCourseGrade;
