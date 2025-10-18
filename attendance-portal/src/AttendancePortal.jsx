import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./index.css";

const AttendancePortal = () => {
  const [view, setView] = useState("day");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [employeeAttendance, setEmployeeAttendance] = useState([]);
  const [employeeMonthlyData, setEmployeeMonthlyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredAttendanceData, setFilteredAttendanceData] = useState([]);

  const totalPresent = filteredAttendanceData.filter(d => d.status === "present").length;
  const totalAbsent = filteredAttendanceData.filter(d => d.status === "absent").length;




  const isException = (val) =>
    typeof val === "string" && val.trim().toLowerCase() === "yes";

  // Fetch all employees
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();

      // keep only employees WITHOUT AttendanceException = YES (case/space-safe)
      const filtered = data.filter(emp => !isException(emp.AttendanceException));

      setEmployees(filtered);

      // if currently selected employee was filtered out, clear the selection
      if (selectedEmployee && !filtered.some(e =>
        String(e.emp_id) === String(selectedEmployee)
      )) {
        setSelectedEmployee("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all attendance records
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/attendance");
      if (!response.ok) {
        throw new Error("Failed to fetch attendance data");
      }
      const data = await response.json();
      setAttendanceData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceRange = async (start, end) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/attendance/range?start_date=${start}&end_date=${end}&employee_id=${selectedEmployee}`);
      if (!response.ok) throw new Error("Failed to fetch range attendance data");

      const data = await response.json();
      const groupedData = groupAttendanceByDate(data); // your existing grouping logic
      const mergedWithAbsent = mergeAttendanceWithAbsent(groupedData, start, end);
      setFilteredAttendanceData(mergedWithAbsent);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMonthDateRange = (monthString) => {
    const [year, month] = monthString.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // last day of month
    const formatDate = (d) => d.toISOString().split('T')[0];
    return { start: formatDate(start), end: formatDate(end) };
  };



  // Fetch specific employee attendance
  const fetchEmployeeAttendance = async (empId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employees/${empId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch employee attendance");
      }
      const data = await response.json();
      setEmployeeAttendance(data.attendance || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateDateRange = (start, end) => {
    const dates = [];
    const current = new Date(start);
    const endDate = new Date(end);

    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return dates.map(d =>
      d.toISOString().split('T')[0] // "YYYY-MM-DD"
    );
  };

  const getDayName = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };


  const getCalendarMonthRange = (monthString) => {
    const [year, month] = monthString.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    let end;

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // 🔸 If selected month is the current month — end on today's date
    if (month === currentMonth && year === currentYear) {
      end = today;
    } else {
      // 🔸 Otherwise end on the last day of the selected month
      end = new Date(year, month, 0);
    }

    const formatDate = (d) => d.toISOString().split('T')[0];
    return { start: formatDate(start), end: formatDate(end) };
  };


  const mergeAttendanceWithAbsent = (records, start, end) => {
    const allDates = generateDateRange(start, end);

    // Make a map of present records by date
    const recordMap = {};
    records.forEach(rec => {
      const dateKey = rec.attendance_date.split('T')[0];
      recordMap[dateKey] = rec;
    });

    // Build final list with both present and absent
    const merged = allDates.map(date => {
      if (recordMap[date]) {
        return {
          ...recordMap[date],
          status: (recordMap[date].check_in || recordMap[date].check_out) ? "present" : "absent"
        };
      } else {
        return {
          attendance_date: date,
          check_in: "-",
          check_out: "-",
          overtime: 0,
          status: "absent"
        };
      }
    });

    // Sort ascending
    merged.sort((a, b) => new Date(a.attendance_date) - new Date(b.attendance_date));

    return merged;
  };


  const groupAttendanceByDate = (records) => {
    const grouped = {};

    records.forEach(rec => {
      const key = `${rec.emp_id}_${rec.attendance_date}`;
      if (!grouped[key]) {
        grouped[key] = {
          ...rec,
          check_in: rec.check_in,
          check_out: rec.check_out,
        };
      } else {
        // Choose earliest check-in
        if (rec.check_in && (!grouped[key].check_in || rec.check_in < grouped[key].check_in)) {
          grouped[key].check_in = rec.check_in;
        }
        // Choose latest check-out
        if (rec.check_out && (!grouped[key].check_out || rec.check_out > grouped[key].check_out)) {
          grouped[key].check_out = rec.check_out;
        }
      }
    });

    return Object.values(grouped);
  };


  // Fetch employee monthly report
  const fetchEmployeeMonthlyReport = async (empId, month) => {
    try {
      setLoading(true);

      // 🧭 1. Strictly use calendar month (1st to 30/31)
      const { start, end } = getCalendarMonthRange(month);

      // 🧭 2. Fetch all records for this employee
      const response = await fetch(
        `/api/attendance/range?start_date=${start}&end_date=${end}&employee_id=${empId}`
      );
      if (!response.ok) throw new Error("Failed to fetch monthly data");

      const data = await response.json();

      // 🧹 3. Filter strictly between start and end date (removes 31/08)
      const filteredData = data.filter(r => {
        const date = r.attendance_date.split('T')[0];
        return date >= start && date <= end;
      });

      // 🧮 4. Calculate total minutes worked from check_in/check_out
      const calculateTotalMinutes = (checkIn, checkOut) => {
        if (!checkIn || !checkOut || checkIn === "-" || checkOut === "-") return 0;
        const [inH, inM] = checkIn.split(':').map(Number);
        const [outH, outM] = checkOut.split(':').map(Number);
        let total = (outH * 60 + outM) - (inH * 60 + inM);
        if (total < 0) total += 24 * 60; // overnight fix
        return total;
      };

      const totalMinutes = filteredData.reduce((acc, r) => {
        return acc + calculateTotalMinutes(r.check_in, r.check_out);
      }, 0);
      const totalHours = (totalMinutes / 60).toFixed(1);

      // 🧮 5. Group & merge absent dates
      const grouped = groupAttendanceByDate(filteredData);
      const merged = mergeAttendanceWithAbsent(grouped, start, end);

      // 📝 6. Set final state
      setFilteredAttendanceData(merged);
      setEmployeeMonthlyData({
        stats: {
          total_hours: totalHours,
          total_overtime_minutes: filteredData.reduce(
            (acc, r) => acc + (r.overtime || 0),
            0
          ),
        },
        attendance: merged,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  // Load initial data
  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
  }, []);

  // Fetch employee attendance when selected
  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeeAttendance(selectedEmployee);
      fetchEmployeeMonthlyReport(selectedEmployee, selectedMonth);
    }
  }, [selectedEmployee, selectedMonth]);

  const SegmentedControl = ({ current }) => (
    <div className="inline-flex rounded-xl bg-slate-100 p-1 shadow-inner">
      <button
        onClick={() => setView("day")}
        className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
            ${current === "day"
            ? "bg-white text-indigo-600 shadow-sm"
            : "text-slate-600 hover:text-slate-900"}`}
      >
        Day View
      </button>
      <button
        onClick={() => setView("employee")}
        className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
            ${current === "employee"
            ? "bg-white text-indigo-600 shadow-sm"
            : "text-slate-600 hover:text-slate-900"}`}
      >
        Employee View
      </button>
    </div>
  );

  // Format time from HH:MM:SS to HH:MM AM/PM
  const formatTime = (timeString) => {
    if (!timeString || timeString === "-" || timeString === null) return "-";

    const [hours, minutes] = timeString.split(':');
    const hourNum = parseInt(hours, 10);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum % 12 || 12;

    return `${displayHour}:${minutes} ${period}`;
  };

  // Format API date to match selectedDate format (YYYY-MM-DD)
  const formatAPIDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toISOString().split('T')[0];
  };

  // Filter attendance for selected date
  const getDayAttendanceData = () => {
    if (!attendanceData.length || !employees.length) return [];

    // Create a map of employees for quick lookup
    const employeeMap = {};
    employees.forEach(emp => {
      employeeMap[emp.emp_id] = emp;
    });

    // Group attendance by employee ID for the selected date
    const attendanceByEmployee = {};
    attendanceData.forEach(record => {
      const recordDate = formatAPIDate(record.attendance_date);
      if (recordDate === selectedDate) {
        if (!attendanceByEmployee[record.emp_id]) {
          attendanceByEmployee[record.emp_id] = [];
        }
        attendanceByEmployee[record.emp_id].push(record);
      }
    });

    // Create the day attendance data
    return employees.map(emp => {
      const empAttendance = attendanceByEmployee[emp.emp_id];

      // If no attendance record found for this date
      if (!empAttendance || empAttendance.length === 0) {
        return {
          id: emp.emp_id,
          name: emp.Name,
          phone: emp.PhoneNumber,
          checkIn: "-",
          checkOut: "-",
          overtime: 0,
          status: "absent"
        };
      }

      // Get the latest record (assuming multiple records might exist)
      const latestRecord = empAttendance[empAttendance.length - 1];

      return {
        id: emp.emp_id,
        name: emp.Name,
        phone: emp.PhoneNumber,
        checkIn: latestRecord.check_in,
        checkOut: latestRecord.check_out,
        overtime: latestRecord.overtime || 0,
        status: (latestRecord.check_in || latestRecord.check_out) ? "present" : "absent"

      };
    });
  };

  // Calculate hours worked
  const calculateHoursWorked = (checkIn, checkOut) => {
    if (!checkIn || !checkOut || checkIn === "-" || checkOut === "-" || checkIn === null || checkOut === null) return "0h 0m";

    const [inHours, inMinutes] = checkIn.split(':').map(Number);
    const [outHours, outMinutes] = checkOut.split(':').map(Number);

    let totalMinutes = (outHours * 60 + outMinutes) - (inHours * 60 + inMinutes);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes}m`;
  };

  // Format overtime minutes to hours and minutes
  const formatOvertime = (time, inputFormat = 'minutes') => {
    if (time === null || time === undefined || time === 0) return "0m";

    if (inputFormat === 'hours') {
      // Convert hours to minutes
      const totalMinutes = Math.round(time * 60);
      return `${totalMinutes}m`;
    } else {
      // Input is in minutes (this is what your backend returns)
      if (time < 60) {
        return `${time}m`;
      } else {
        const hours = Math.floor(time / 60);
        const mins = time % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
      }
    }
  };

  const StatusBadge = ({ status }) => {
    let colorClass = "";
    let text = "";

    if (status === "present") {
      colorClass = "bg-green-100 text-green-800";
      text = "Present";
    } else if (status === "absent") {
      colorClass = "bg-rose-100 text-rose-800";
      text = "Absent";
    } else if (status === "sunday") {
      colorClass = "bg-slate-200 text-slate-700";
      text = "Sunday";
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {text}
      </span>
    );
  };


  // Format date for display
  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Format month for display (e.g., August 2025)
  const formatDisplayMonth = (monthString) => {
    const [year, month] = monthString.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric'
    });
  };

  // Get stats for the day
  const getDayStats = () => {
    const dayData = getDayAttendanceData();
    const presentCount = dayData.filter(item => item.status === "present").length;

    return {
      total: dayData.length,
      present: presentCount,
      absent: dayData.length - presentCount
    };
  };

  const handleQuickFilter = (filterType) => {
    const today = new Date();
    let start = '';
    let end = '';

    switch (filterType) {
      case 'last7Days':
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        end = new Date(today);
        break;

      case 'last30Days':
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        end = new Date(today);
        break;

      case 'thisMonthCycle':
        const day = today.getDate();
        const month = today.getMonth();
        const year = today.getFullYear();
        if (day < 20) {
          start = new Date(year, month - 1, 20);
        } else {
          start = new Date(year, month, 20);
        }
        end = new Date(today);
        break;

      case 'lastMonthCycle':
        const day2 = today.getDate();
        const month2 = today.getMonth();
        const year2 = today.getFullYear();
        if (day2 < 20) {
          start = new Date(year2, month2 - 2, 20);
          end = new Date(year2, month2 - 1, 19);
        } else {
          start = new Date(year2, month2 - 1, 20);
          end = new Date(year2, month2, 19);
        }
        break;

      default:
        return;
    }

    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const formattedStart = formatDate(start);
    const formattedEnd = formatDate(end);

    setStartDate(formattedStart);
    setEndDate(formattedEnd);

    // Optional: you can trigger your range fetch here if needed
    fetchAttendanceRange(formattedStart, formattedEnd);
  };


  const dayStats = getDayStats();
  const dayAttendanceData = getDayAttendanceData();

  return (
    <div className="h-screen sm:h-auto w-screen sm:w-auto overflow-x-hidden bg-slate-50 font-inter flex flex-col">
      <header className="w-full bg-white border-b border-slate-200/70 shadow-sm">
        <div className="px-6 py-4 relative flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight">Attendance Portal</h1>
              <p className="text-sm text-slate-500">Track employee attendance records</p>
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-sm text-slate-600 mr-3">{formatDisplayDate(selectedDate)}</span>
            <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">v1.0</div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 py-8 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="mb-4 sm:mb-0">
            <h2 className="text-2xl font-bold text-slate-900">Attendance Records</h2>
            <p className="text-slate-500 mt-1">View and manage daily attendance</p>
          </div>
          <SegmentedControl current={view} />
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            Error: {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {!loading && view === "day" && (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-end gap-4">
              {/* Select Date on the left */}
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full sm:w-64 rounded-lg border border-slate-300 bg-white pl-4 pr-10 py-2.5 text-slate-900 shadow-sm
                              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                </div>
              </div>

              {/* Stats on the right */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-600">{dayStats.total} employees</span>
                <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded-lg">{dayStats.present} present</span>
                <span className="text-sm text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">{dayStats.absent} absent</span>
              </div>
            </div>

            <div className="p-2 sm:p-4">
              <div className="overflow-x-auto w-full rounded-lg border border-slate-200">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50/80">
                    <tr className="text-slate-600">
                      <th className="p-4 text-sm font-semibold">Exec Name</th>
                      <th className="p-4 text-sm font-semibold">Phone Number</th>
                      <th className="p-4 text-sm font-semibold">Check In</th>
                      <th className="p-4 text-sm font-semibold">Check Out</th>
                      <th className="p-4 text-sm font-semibold">Overtime</th>
                      <th className="p-4 text-sm font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dayAttendanceData.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-medium text-slate-900">{item.name}</td>
                        <td className="p-4 text-slate-600">{item.phone}</td>
                        <td className="p-4">
                          <span className={`font-medium ${item.checkIn !== "-" ? "text-slate-900" : "text-slate-400"}`}>
                            {formatTime(item.checkIn)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`font-medium ${item.checkOut !== "-" ? "text-slate-900" : "text-slate-400"}`}>
                            {formatTime(item.checkOut)}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-purple-600">
                            {formatOvertime(item.overtime)}
                          </span>
                        </td>
                        <td className="p-4">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 text-sm text-slate-500 flex items-center justify-between">
                <span>Tip: Use the date picker to view a specific day's records.</span>
                <button className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center">
                  {/* Export CSV */}
                  {/* <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg> */}
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {!loading && view === "employee" && (
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200/70 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.emp_id} value={emp.emp_id}>{emp.Name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={() => handleQuickFilter('last7Days')}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-indigo-100 rounded-lg text-slate-700 hover:text-indigo-600"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => handleQuickFilter('last30Days')}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-indigo-100 rounded-lg text-slate-700 hover:text-indigo-600"
              >
                Last 30 Days
              </button>
              <button
                onClick={() => handleQuickFilter('thisMonthCycle')}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-indigo-100 rounded-lg text-slate-700 hover:text-indigo-600"
              >
                This Month Cycle
              </button>
              <button
                onClick={() => handleQuickFilter('lastMonthCycle')}
                className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-indigo-100 rounded-lg text-slate-700 hover:text-indigo-600"
              >
                Last Month Cycle
              </button>
            </div>


            {employeeMonthlyData && (
              <div className="p-6 border-b border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-2 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-green-600">Present Days</p>
                      {/* <p className="text-xl font-bold text-green-800">{employeeMonthlyData.stats.total_present}</p> */}
                      <p className="text-xl font-bold text-green-800">{totalPresent}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-rose-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="bg-rose-100 p-2 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-rose-600">Absent Days</p>
                      <p className="text-xl font-bold text-rose-800">{totalAbsent}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-2 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600">Total Hours</p>
                      <p className="text-xl font-bold text-blue-800">{parseFloat(employeeMonthlyData.stats.total_hours).toFixed(1)}h</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="bg-purple-100 p-2 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-purple-600">Overtime</p>
                      <p className="text-xl font-bold text-purple-800">{formatOvertime(employeeMonthlyData.stats.total_overtime_minutes)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-2 sm:p-4">
              <div className="overflow-x-auto w-full rounded-lg border border-slate-200">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50/80">
                    <tr className="text-slate-600">
                      <th className="p-4 text-sm font-semibold">Date</th>
                      <th className="p-4 text-sm font-semibold">Check In</th>
                      <th className="p-4 text-sm font-semibold">Check Out</th>
                      <th className="p-4 text-sm font-semibold">Hours</th>
                      <th className="p-4 text-sm font-semibold">Overtime</th>
                      <th className="p-4 text-sm font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(filteredAttendanceData.length > 0
                      ? filteredAttendanceData
                      : employeeMonthlyData?.attendance || []
                    ).map((item) => (
                      <tr key={item.id}>
                        <td className={`p-4 font-medium flex items-center gap-2 ${new Date(item.attendance_date).getDay() === 0 ? 'text-red-500' : 'text-slate-900'
                          }`}>
                          {formatDisplayDate(item.attendance_date)}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${new Date(item.attendance_date).getDay() === 0
                            ? 'bg-red-100 text-red-600'
                            : 'bg-slate-100 text-slate-600'
                            }`}>
                            {getDayName(item.attendance_date)}
                          </span>
                        </td>

                        <td className="p-4 text-slate-600">{formatTime(item.check_in)}</td>
                        <td className="p-4 text-slate-600">{formatTime(item.check_out)}</td>
                        <td className="p-4">
                          {calculateHoursWorked(item.check_in, item.check_out)}
                        </td>
                        <td className="p-4 text-purple-600">{formatOvertime(item.overtime)}</td>
                        <td className="p-4">
                          <StatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}

                  </tbody>
                </table>
              </div>

              <div className="px-4 py-3 text-sm text-slate-500 flex items-center justify-between">
                <span>
                  {employeeMonthlyData
                    ? `Showing ${employeeMonthlyData.attendance.length} entries for ${formatDisplayMonth(selectedMonth)}.`
                    : "Select an employee to view their attendance records."}
                </span>
                <div className="flex items-center space-x-2">
                  <button className="px-3 py-1.5 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:border-slate-300">
                    Previous
                  </button>
                  <button className="px-3 py-1.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
                    Next
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </main>
    </div>
  );
};

export default AttendancePortal;