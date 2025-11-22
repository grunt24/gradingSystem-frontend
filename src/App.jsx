import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Login from './pages/Login/Login.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import MainDashboard from './pages/MainDashboard/MainDashboard.jsx';

import PageLayout from './components/PageLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import './components/Menulist.css';
import Subjects from "./pages/MainDashboard/Subjects.jsx";
import Teacher from "./pages/MainDashboard/Teacher/Teacher.jsx";
import StudentSubject from "./pages/MainDashboard/StudentSubject.jsx";
import TeacherGrading from "./pages/MainDashboard/TeacherGrading.jsx";
import UserEvents from "./pages/MainDashboard/UserEvents.jsx";
import MidtermGrades from "./pages/MainDashboard/MidtermGrades.jsx";
import FinalGrade from "./pages/MainDashboard/FinalGrades.jsx";
import ViewingOfGrades from "./pages/MainDashboard/ViewingOfGrades.jsx";
import TeacherStudents from "./pages/MainDashboard/Teacher/TeacherStudents.jsx";
import AcademicPeriods from "./pages/MainDashboard/AcademicPeriods.jsx";

const router = createBrowserRouter([
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <PageLayout />,
        children: [
          { path: "/dashboard", element: <Dashboard /> },
          { path: "/main-dashboard", element: <MainDashboard /> },
          { path: "/subjects", element: <Subjects /> },
          { path: "/teachers", element: <Teacher /> },
          { path: "/students", element: <StudentSubject /> },
          { path: "/teacher-grading", element: <TeacherGrading /> },
          { path: "/events", element: <UserEvents /> },
          { path: "/midterm", element: <MidtermGrades /> },
          { path: "/finals", element: <FinalGrade /> },
          { path: "/view-grades", element: <ViewingOfGrades /> },
          { path: "/teacher-students", element: <TeacherStudents /> },
          { path: "/academic-periods", element: <AcademicPeriods /> },

        ],
      }
    ],
  },
  { path: "/", element: <Login /> },
]);

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
