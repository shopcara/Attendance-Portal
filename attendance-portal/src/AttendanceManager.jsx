import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import "./index.css";
import { useNavigate } from 'react-router-dom';

const AttendanceManager = () => {
    const navigate = useNavigate();
    const [attendanceRecords, setAttendanceRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [editingRecord, setEditingRecord] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [filters, setFilters] = useState({
        date: new Date().toISOString().split('T')[0],
        employee_id: ""
    });

    // Fetch all employees
    const fetchEmployees = async () => {
        try {
            const response = await fetch("/api/employees/crud");
            if (!response.ok) throw new Error("Failed to fetch employees");
            const data = await response.json();
            setEmployees(data);
        } catch (err) {
            setError(err.message);
        }
    };

    // Fetch attendance records
    const fetchAttendanceRecords = async () => {
        try {
            setLoading(true);
            setError(null);

            // Build query string with filters
            const params = new URLSearchParams();
            if (filters.date) params.append('date', filters.date);
            if (filters.employee_id) params.append('employee_id', filters.employee_id);

            const queryString = params.toString();
            const url = queryString 
                ? `/api/attendance/crud?${queryString}` 
                : '/api/attendance/crud';

            console.log('Fetching from URL:', url);

            const response = await fetch(url);
            console.log('Response status:', response.status);

            if (!response.ok) throw new Error("Failed to fetch attendance records");

            const data = await response.json();
            setAttendanceRecords(data);
        } catch (err) {
            setError(err.message);
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    // Handle form submission for create/update - FIXED ENDPOINTS
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const formData = new FormData(e.target);
        const recordData = {
            emp_id: parseInt(formData.get('emp_id')),
            attendance_date: formData.get('attendance_date'),
            check_in: formData.get('check_in') || "",
            check_out: formData.get('check_out') || "",
            overtime: formData.get('overtime') || "0"
        };

        try {
            let response;

            if (editingRecord) {
                // CORRECTED: Use the correct endpoint with ID
                response = await fetch(`/api/attendance/crud/${editingRecord.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(recordData)
                });
            } else {
                // CORRECTED: Use the correct endpoint
                response = await fetch('/api/attendance/crud', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(recordData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save record');
            }

            setSuccess('Attendance record saved successfully');
            setEditingRecord(null);
            setIsCreating(false);
            fetchAttendanceRecords(); // Refresh the list
        } catch (err) {
            setError(err.message);
        }
    };

    // Delete an attendance record - FIXED ENDPOINT
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this attendance record?')) {
            return;
        }

        try {
            // CORRECTED: Use the correct endpoint with ID
            const response = await fetch(`/api/attendance/crud/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error("Failed to delete attendance record");
            }

            setSuccess('Attendance record deleted successfully');
            fetchAttendanceRecords(); // Refresh the list
        } catch (err) {
            setError(err.message);
        }
    };

    // Format time for display - IMPROVED TO HANDLE NULL/VALUES
    const formatTime = (timeString) => {
        if (!timeString || timeString === "-" || timeString === null || timeString === "null" || timeString === "") return "-";

        // Handle cases where time might be in different formats
        if (typeof timeString === 'string' && timeString.includes(':')) {
            const [hours, minutes] = timeString.split(':');
            const hourNum = parseInt(hours, 10);
            const period = hourNum >= 12 ? 'PM' : 'AM';
            const displayHour = hourNum % 12 || 12;

            return `${displayHour}:${minutes} ${period}`;
        }

        return "-";
    };

    // Format date for display - IMPROVED ERROR HANDLING
    const formatDisplayDate = (dateString) => {
        try {
            if (!dateString) return "Invalid Date";

            const date = new Date(dateString);
            if (isNaN(date.getTime())) return "Invalid Date";

            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Date formatting error:', error);
            return "Invalid Date";
        }
    };

    // Load initial data
    useEffect(() => {
        fetchEmployees();
        fetchAttendanceRecords();
    }, []);

    // Apply filters when they change
    useEffect(() => {
        fetchAttendanceRecords();
    }, [filters.date, filters.employee_id]);

    return (
        <div className="min-h-screen bg-slate-50 font-inter p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center text-slate-600 hover:text-slate-900 mb-4"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Portal
                            </button>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Attendance Management</h1>
                            <p className="text-slate-500 mt-1">Create, edit and manage attendance records</p>
                        </div>
                        <button
                            onClick={() => {
                                setIsCreating(true);
                                setEditingRecord(null);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg flex items-center"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            New Record
                        </button>
                    </div>
                </header>

                {/* Filters */}
                <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                            <input
                                type="date"
                                value={filters.date}
                                onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
                            <select
                                value={filters.employee_id}
                                onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">All Employees</option>
                                {employees.map(emp => (
                                    <option key={emp.emp_id} value={emp.emp_id}>{emp.Name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={fetchAttendanceRecords}
                                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2.5 rounded-lg"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                        {success}
                    </div>
                )}

                {/* Create/Edit Form */}
                {(isCreating || editingRecord) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-slate-200"
                    >
                        <h2 className="text-xl font-semibold text-slate-900 mb-4">
                            {editingRecord ? 'Edit Attendance Record' : 'Create New Attendance Record'}
                        </h2>

                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
                                    <select
                                        name="emp_id"
                                        required
                                        defaultValue={editingRecord?.emp_id || ''}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Select Employee</option>
                                        {employees.map(emp => (
                                            <option key={emp.emp_id} value={emp.emp_id}>{emp.Name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        name="attendance_date"
                                        required
                                        defaultValue={editingRecord?.attendance_date || new Date().toISOString().split('T')[0]}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Check In</label>
                                    <input
                                        type="time"
                                        name="check_in"
                                        step="1" 
                                        defaultValue={editingRecord?.check_in || ''}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Check Out</label>
                                    <input
                                        type="time"
                                        name="check_out"
                                        step="1" 
                                        defaultValue={editingRecord?.check_out || ''}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Overtime (minutes)</label>
                                    <input
                                        type="number"
                                        name="overtime"
                                        min="0"
                                        step="1"
                                        defaultValue={editingRecord?.overtime || '0'}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingRecord(null);
                                        setIsCreating(false);
                                    }}
                                    className="px-4 py-2.5 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-300 hover:border-slate-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                                >
                                    {editingRecord ? 'Update Record' : 'Create Record'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}

                {/* Attendance Records Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h2 className="text-xl font-semibold text-slate-900">Attendance Records</h2>
                        <p className="text-slate-500 mt-1">
                            {attendanceRecords.length} records found
                            {filters.date && ` for ${formatDisplayDate(filters.date)}`}
                            {filters.employee_id && ` (filtered)`}
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employee</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check In</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Check Out</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Overtime</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {attendanceRecords.map(record => (
                                        <tr key={record.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-slate-900">{record.Name}</div>
                                                <div className="text-sm text-slate-500">ID: {record.emp_id}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                                {formatDisplayDate(record.attendance_date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                                {formatTime(record.check_in)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                                {formatTime(record.check_out)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                                {record.overtime ? `${record.overtime} mins` : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => {
                                                        setEditingRecord(record);
                                                        setIsCreating(false);
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(record.id)}
                                                    className="text-rose-600 hover:text-rose-900"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {attendanceRecords.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                                                No attendance records found. {filters.employee_id || filters.date ? 'Try changing your filters.' : 'Create a new record to get started.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendanceManager;