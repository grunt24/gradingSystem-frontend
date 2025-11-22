import axiosInstance from "./axiosInstance";

const academicPeriodService = {
  async getCurrentAcademicPeriod() {
    try {
      const response = await axiosInstance.get("/AcademicPeriods/current");
      // The backend now returns Id, academicYear, and Semester
      const { id, academicYear, semester } = response.data;
      return { id, academicYear, semester };
    } catch (error) {
      console.error("Failed to fetch current academic period", error);
      return { id: null, academicYear: null, semester: null };
    }
  },

  async getAllAcademicPeriods() {
    try {
      const response = await axiosInstance.get("/AcademicPeriods/all");
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch all academic periods", error);
      return [];
    }
  },

  async setCurrentAcademicPeriod(dto) {
    try {
      const response = await axiosInstance.post("/AcademicPeriods/set-current", dto);
      return response.data;
    } catch (error) {
      console.error("Failed to set current academic period", error);
      throw error;
    }
  },

  async updateAcademicPeriod(id, dto) {
    try {
      const response = await axiosInstance.put(`/AcademicPeriods/${id}`, dto);
      return response.data;
    } catch (error) {
      console.error("Failed to update academic period", error);
      throw error;
    }
  }
};

export default academicPeriodService;
