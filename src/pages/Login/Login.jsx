import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, message, Spin, Alert } from "antd";
import loginService from "../../../src/api/loginService";
import "./Login.css";

const Login = () => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setLoading(true);
    setError(""); // Clear previous errors

    try {
      const { success, userDetails } = await loginService.login(
        values.userName,
        values.password
      );

      if (success) {
        message.success("Login Successful!", 2);

        // Save user object, including role
        localStorage.setItem("user", JSON.stringify(userDetails));
        localStorage.setItem("userRoles", JSON.stringify(userDetails.role));

        // Redirect based on role
        setTimeout(() => {
          if (userDetails.role.toLowerCase() === "student") {
            navigate("/students");
          } else {
            navigate("/main-dashboard");
          }
          setLoading(false);
        }, 2000);
      } else {
        throw new Error("Invalid username or password");
      }
    } catch (loginError) {
      console.error("Login failed:", loginError);
      setError("Invalid username or password");
      setLoading(false);
    }
  };

  return (
    <div
      className="container"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div className="form-container">
        <p className="title">BCAS Grade Portal</p>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: "10px" }}
          />
        )}

        <Form className="form" onFinish={handleSubmit}>
          <Form.Item
            name="userName"
            rules={[
              {
                required: true,
                message: "Please enter your student number or email!",
              },
            ]}
          >
            <Input className="input" placeholder="Student number or username" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please enter your password!" }]}
          >
            <Input.Password className="input" placeholder="Password" />
          </Form.Item>
          <p className="page-link">
            {/* <span className="page-link-label">Forgot Password?</span> */}
          </p>
          <Button
            htmlType="submit"
            className="form-btn"
            block
            disabled={loading}
          >
            {loading ? <Spin size="small" /> : "Login"}
          </Button>
        </Form>
        <p className="sign-up-label">
          {/* Don't have an account? <span className="sign-up-link">Sign up</span> */}
        </p>
      </div>
    </div>
  );
};

export default Login;
