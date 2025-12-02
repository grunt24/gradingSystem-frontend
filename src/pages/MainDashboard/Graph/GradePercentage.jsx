  import React, { useEffect, useState } from "react";
  import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
  } from "recharts";
import axiosInstance from "../../../api/axiosInstance";

const PERCENTAGE_API = "/GradeCalculation/grade-percentage";
const EQUIVALENTS_API = "/GradeCalculation/equivalents";

    

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#845EC2"];

  const GradePercentage = () => {
    const [percentageData, setPercentageData] = useState([]);
    const [equivalentData, setEquivalentData] = useState([]);

useEffect(() => {
  const fetchPercentageData = async () => {
    try {
      const res = await axiosInstance.get(PERCENTAGE_API);
      const json = res.data;

      if (json && json.data) {
        const chartData = [
          { name: "Quizzes", value: json.data.quizWeighted },
          { name: "Class Standing", value: json.data.classStandingWeighted },
          { name: "SEP", value: json.data.sepWeighted },
          { name: "Project", value: json.data.projectWeighted },
          { name: "Exam", value: json.data.midtermWeighted },
        ];
        setPercentageData(chartData);
      }
    } catch (err) {
      console.error("Error fetching grade percentages:", err);
    }
  };

  const fetchEquivalentData = async () => {
    try {
      const res = await axiosInstance.get(EQUIVALENTS_API);
      const json = res.data;

      if (json && json.data) {
        setEquivalentData(json.data);
      }
    } catch (err) {
      console.error("Error fetching grade equivalents:", err);
    }
  };

  fetchPercentageData();
  fetchEquivalentData();
}, []);


    return (
      <div className="bg-white shadow-md rounded-2xl p-4">

        {/* Flex container that adapts */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap", // makes them stack on smaller screens
            gap: "20px",
          }}
        >
          {/* Left: Pie Chart */}
          <div
            style={{
              flex: "1 1 400px", // grows, shrinks, min width
              minWidth: "300px",
              background: "#f9fafb",
              padding: "15px",
              borderRadius: "12px",
            }}
          >
            <h3 className="text-lg font-semibold mb-4 text-center">
              Grade Percentage Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={percentageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius="80%"
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) =>
                    `${name} (${(value * 100)}%)`
                  }
                >
                  {percentageData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${(value * 100)}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Right: Table */}
          <div
            style={{
              flex: "-1 1 400px",
              minWidth: "320px",
              background: "#f9fafb",
              padding: "15px",
              borderRadius: "12px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div className="w-full">
              <h3 className="text-lg font-semibold mb-4 text-center">
                Grade Equivalents
              </h3>
              <table className="border-collapse border border-gray-300 text-sm mx-auto">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-300 px-3 py-2">
                      Percentage
                    </th>
                    <th className="border border-gray-300 px-3 py-2">
                      Grade Point
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {equivalentData.map((item, index) => (
                    <tr key={index} className="text-center">
                      <td className="border border-gray-300 px-3 py-2">
                        {item.maxPercentage <= 73
                          ? `${item.maxPercentage} & below`
                          : item.minPercentage === item.maxPercentage
                          ? item.minPercentage
                          : `${item.minPercentage} - ${item.maxPercentage}`}
                      </td>
                      <td className="border border-gray-300 px-3 py-2">
                        {item.gradePoint}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  export default GradePercentage;
