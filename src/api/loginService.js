import axiosInstance from "./axiosInstance";

const loginService = {
  async login(username, password) {
    try {
      const response = await axiosInstance.post("/Auth/login/", { username, password });

      // Destructure the response data, now including id
      const { token, username: userName, role, fullname, id, academicYear, semester, academicYearId  } = response.data;

      if (token) {
        const userDetails = {
          id,             // <--- Add this for teacher/user id
          userName,       
          fullname,       
          role,
          academicYear,
          semester, 
          academicYearId
        };
        localStorage.setItem("token", token);
        localStorage.setItem("userDetails", JSON.stringify(userDetails));
        return { success: true, token, userDetails };
      }

      return { success: false, error: "Failed to fetch token" };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || "Login failed" };
    }
  },

  getUserDetails() {
    const userDetails = localStorage.getItem("userDetails");
    return userDetails ? JSON.parse(userDetails) : null;
  },

  getUserRoles() {
    const userDetails = this.getUserDetails();
    return userDetails ? userDetails.role : null;
  },

  getCurrentUserId() {
    const userDetails = this.getUserDetails();
    return userDetails ? userDetails.id : null;
  },

  getToken() {
    return localStorage.getItem("token") || null;
  },
    getAcademicPeriod() {
    const userDetails = this.getUserDetails();
    return userDetails
      ? { academicYear: userDetails.academicYear, semester: userDetails.semester, academicYearId: userDetails.academicYearId }
      : { academicYear: null, semester: null, academicYearId: null };
  },

  logout() {
    localStorage.clear();
    window.location.href = "/";
  },

  isAuthenticated() {
    return !!this.getToken();
  },
};

export default loginService;

