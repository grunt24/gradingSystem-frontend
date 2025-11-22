import { useEffect, useState } from "react";
import { Menu, Select, message } from "antd";
import { HomeFilled, RightOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import logoImg from "../../src/assets/bcas-logo.png";
import academicPeriodService from "../../src/api/AcademicPeriodService";

const { Option } = Select;

const SidebarMenu = ({ collapsed, onMenuSelect }) => {
  const [fullname, setUserName] = useState("");
  const [role, setRole] = useState("");
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [allPeriods, setAllPeriods] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Get user info from localStorage
    const userDetails = localStorage.getItem("userDetails");
    if (userDetails) {
      const parsed = JSON.parse(userDetails);
      setUserName(parsed.fullname);
      setRole(parsed.role);
    }

    fetchAcademicData();
  }, []);

  const fetchAcademicData = async () => {
    try {
      // Fetch all periods first
      const periods = await academicPeriodService.getAllAcademicPeriods();
      setAllPeriods(periods);

      // Find and set the current period
      const currentPeriodData = periods.find((p) => p.isCurrent);
      if (currentPeriodData) {
        setCurrentPeriod(currentPeriodData.id);
      }
    } catch (err) {
      console.error("Error fetching academic data:", err);
    }
  };

  const handlePeriodChange = async (periodId) => {
    setLoading(true);
    try {
      const selectedPeriod = allPeriods.find((p) => p.id === periodId);

      if (selectedPeriod) {
        await academicPeriodService.updateAcademicPeriod(periodId, {
          startYear: selectedPeriod.startYear,
          endYear: selectedPeriod.endYear,
          semester: selectedPeriod.semester,
        });

        setCurrentPeriod(periodId);
        message.success(
          `AY ${selectedPeriod.startYear}-${selectedPeriod.endYear} ${selectedPeriod.semester} Semester is now current.`
        );

        // Refresh the periods list to update the isCurrent flags
        await fetchAcademicData();
      }
    } catch (error) {
      message.error("Failed to update academic period.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Menu for all roles
  const menuItemsByRole = {
    Student: [
      {
        key: "students",
        icon: <RightOutlined />,
        label: (
          <Link to="/students" style={{ textDecoration: "none" }}>
            Students
          </Link>
        ),
      },
      {
        key: "viewing",
        icon: <RightOutlined />,
        label: (
          <Link to="/view-grades" style={{ textDecoration: "none" }}>
            View Grades
          </Link>
        ),
      },
    ],
    Teacher: [
      {
        key: "dashboard",
        icon: <HomeFilled />,
        label: (
          <Link to="/main-dashboard" style={{ textDecoration: "none" }}>
            Dashboard
          </Link>
        ),
      },
      {
        key: "midterm",
        icon: <RightOutlined />,
        label: (
          <Link to="/midterm" style={{ textDecoration: "none" }}>
            Student Midterm Grades
          </Link>
        ),
      },
      {
        key: "finals",
        icon: <RightOutlined />,
        label: (
          <Link to="/finals" style={{ textDecoration: "none" }}>
            Student Final Grades
          </Link>
        ),
      },
      {
        key: "myStudents",
        icon: <RightOutlined />,
        label: (
          <Link
            to="/teacher-students"
            style={{ textDecoration: "none" }}
            className="no-underline"
          >
            My Students
          </Link>
        ),
      },
    ],
    Admin: [
      {
        key: "dashboard",
        icon: <HomeFilled />,
        label: (
          <Link to="/main-dashboard" style={{ textDecoration: "none" }}>
            Dashboard
          </Link>
        ),
      },
      {
        key: "subjects",
        icon: <RightOutlined />,
        label: (
          <Link to="/subjects" style={{ textDecoration: "none" }}>
            Subjects
          </Link>
        ),
      },
      {
        key: "teachers",
        icon: <RightOutlined />,
        label: <Link to="/teachers">Teachers</Link>,
      },
      {
        key: "students",
        icon: <RightOutlined />,
        label: <Link to="/students">Students</Link>,
      },
      {
        key: "viewing",
        icon: <RightOutlined />,
        label: <Link to="/view-grades">View Grades</Link>,
      },
      // {
      //   key: "academicPeriods",
      //   icon: <RightOutlined />,
      //   label: <Link to="/academic-periods">Academic Periods</Link>,
      // },
    ],
    Superadmin: [
      {
        key: "dashboard",
        icon: <HomeFilled />,
        label: <Link to="/main-dashboard">Dashboard</Link>,
      },
      {
        key: "subjects",
        icon: <RightOutlined />,
        label: <Link to="/subjects">Subjects</Link>,
      },
      {
        key: "teachers",
        icon: <RightOutlined />,
        label: <Link to="/teachers">Teachers</Link>,
      },
      {
        key: "students",
        icon: <RightOutlined />,
        label: <Link to="/students">Students</Link>,
      },
      {
        key: "viewing",
        icon: <RightOutlined />,
        label: <Link to="/view-grades">View Grades</Link>,
      },
    ],
  };

  const items = menuItemsByRole[role] || [];

  return (
    <>
      {/* Logo and Greetings */}
      {!collapsed && (
        <div
          className="sidebar-top"
          style={{ textAlign: "center", padding: "16px" }}
        >
          <img
            src={logoImg}
            alt="Logo"
            style={{ width: "80px", marginBottom: "8px", borderRadius: "8px" }}
          />
          {fullname && (
            <div className="greeting-container">
              <div className="greeting-content">
                <span>Hello, </span>
                <span className="username">{fullname}.</span>

                {/* Academic Period Selector */}
                <div className="academic-info" style={{ marginTop: "8px" }}>
                  <Select
                    value={currentPeriod}
                    onChange={handlePeriodChange}
                    loading={loading}
                    style={{ width: "100%", fontSize: "12px" }}
                    placeholder="Select Academic Period"
                    dropdownStyle={{ fontSize: "12px" }}
                  >
                    {allPeriods.map((period) => (
                      <Option key={period.id} value={period.id}>
                        AY {period.startYear}-{period.endYear} -{" "}
                        {period.semester} Semester
                      </Option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <Menu
        theme="light"
        mode="inline"
        style={{ minHeight: "auto" }}
        items={items}
        className="no-underline"
        onClick={onMenuSelect}
      />
    </>
  );
};

export default SidebarMenu;
