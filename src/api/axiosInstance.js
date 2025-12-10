import axios from "axios";

const getApiBaseUrl = () => {
  // const isLocalhost = window.location.hostname === 'localhost';
  // return isLocalhost
  //   ? 'https://localhost:7255/api'
  //   : 'http://bcasgradesystemapi.runasp.net/api';
// return 'http://bcasgradesystemapi.runasp.net/api';
return 'https://localhost:7255/api';


};

const getCurrentToken = () => localStorage.getItem("token");

// Create the Axios instance
const axiosInstance = axios.create({
  baseURL: getApiBaseUrl()
    // timeout: 50000
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = getCurrentToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
