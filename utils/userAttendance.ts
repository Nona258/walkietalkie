import supabase from './supabase';

export interface UserAttendance {
  id: number;
  createdAt: string;
  employeeStartTime: string | null;
  employeeEndTime: string | null;
  userId: string | null;
  totalHours: string | null;
  status: string | null;
}

/**
 * Get all attendance records for a specific user
 */
export async function getUserAttendances(userId: string): Promise<UserAttendance[]> {
  try {
    const { data, error } = await supabase
      .from('user_attendances')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((record: any) => ({
      id: record.id,
      createdAt: record.created_at,
      employeeStartTime: record.employee_start_time,
      employeeEndTime: record.employee_end_time,
      userId: record.user_id,
      totalHours: record.total_hours,
      status: record.status,
    }));
  } catch (err) {
    console.error('Failed to get user attendances:', err);
    return [];
  }
}

/**
 * Get attendance records for a user within a date range
 */
export async function getUserAttendancesByDateRange(
  userId: string,
  startDate: string, // ISO format: YYYY-MM-DD
  endDate: string // ISO format: YYYY-MM-DD
): Promise<UserAttendance[]> {
  try {
    const { data, error } = await supabase
      .from('user_attendances')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((record: any) => ({
      id: record.id,
      createdAt: record.created_at,
      employeeStartTime: record.employee_start_time,
      employeeEndTime: record.employee_end_time,
      userId: record.user_id,
      totalHours: record.total_hours,
      status: record.status,
    }));
  } catch (err) {
    console.error('Failed to get user attendances by date range:', err);
    return [];
  }
}

/**
 * Get attendance records for a specific date
 */
export async function getUserAttendancesByDate(
  userId: string,
  date: string // ISO format: YYYY-MM-DD
): Promise<UserAttendance[]> {
  return getUserAttendancesByDateRange(userId, date, date);
}

/**
 * Get today's attendance record for a user
 */
export async function getTodayAttendance(userId: string): Promise<UserAttendance | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('user_attendances')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00Z`)
      .lte('created_at', `${today}T23:59:59Z`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    return {
      id: data.id,
      createdAt: data.created_at,
      employeeStartTime: data.employee_start_time,
      employeeEndTime: data.employee_end_time,
      userId: data.user_id,
      totalHours: data.total_hours,
      status: data.status,
    };
  } catch (err) {
    console.error('Failed to get today attendance:', err);
    return null;
  }
}

/**
 * Log employee start time (clock in)
 */
export async function logStartTime(userId: string, startTime: string): Promise<UserAttendance | null> {
  try {
    const { data, error } = await supabase
      .from('user_attendances')
      .insert([
        {
          user_id: userId,
          employee_start_time: startTime,
          status: 'in_progress',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      createdAt: data.created_at,
      employeeStartTime: data.employee_start_time,
      employeeEndTime: data.employee_end_time,
      userId: data.user_id,
      totalHours: data.total_hours,
      status: data.status,
    };
  } catch (err) {
    console.error('Failed to log start time:', err);
    return null;
  }
}

/**
 * Log employee end time (clock out) and calculate total hours
 */
export async function logEndTime(
  attendanceId: number,
  endTime: string
): Promise<UserAttendance | null> {
  try {
    // Get the existing record to calculate hours
    const { data: existingRecord, error: fetchError } = await supabase
      .from('user_attendances')
      .select('*')
      .eq('id', attendanceId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!existingRecord) throw new Error('Attendance record not found');

    // Calculate total hours
    const totalHours = calculateTotalHours(
      existingRecord.employee_start_time,
      endTime
    );

    // Update the record with end time and total hours
    const { data, error } = await supabase
      .from('user_attendances')
      .update({
        employee_end_time: endTime,
        total_hours: totalHours,
        status: 'completed',
      })
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      createdAt: data.created_at,
      employeeStartTime: data.employee_start_time,
      employeeEndTime: data.employee_end_time,
      userId: data.user_id,
      totalHours: data.total_hours,
      status: data.status,
    };
  } catch (err) {
    console.error('Failed to log end time:', err);
    return null;
  }
}

/**
 * Calculate total hours between start and end time
 * Returns format like "8.5 hours" or "8h 30m"
 */
export function calculateTotalHours(
  startTime: string | null,
  endTime: string | null,
  format: 'decimal' | 'verbose' = 'decimal'
): string {
  if (!startTime || !endTime) return '';

  try {
    // Parse time strings (HH:MM or HH:MM:SS)
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    // Convert to minutes
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;

    // Calculate difference
    let diffMinutes = endTotalMinutes - startTotalMinutes;

    // Handle day boundary (if end time is less than start time, assume it's next day)
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }

    // Convert back to hours and minutes
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    if (format === 'verbose') {
      if (minutes === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${minutes}m`;
      }
    } else {
      // Decimal format
      const totalHours = (diffMinutes / 60).toFixed(2);
      return `${totalHours} hours`;
    }
  } catch (err) {
    console.error('Failed to calculate total hours:', err);
    return '';
  }
}

/**
 * Get attendance statistics for a user
 */
export async function getUserAttendanceStats(userId: string): Promise<{
  totalRecords: number;
  completedRecords: number;
  inProgressRecords: number;
  totalHoursWorked: number;
  averageHoursPerDay: number;
}> {
  try {
    const { data, error } = await supabase
      .from('user_attendances')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const records = data || [];
    const completed = records.filter((r: any) => r.status === 'completed');
    let totalHours = 0;

    completed.forEach((record: any) => {
      if (record.total_hours) {
        // Extract numeric value from "X hours" or "X.X hours" format
        const hours = parseFloat(record.total_hours);
        if (!isNaN(hours)) {
          totalHours += hours;
        }
      }
    });

    return {
      totalRecords: records.length,
      completedRecords: completed.length,
      inProgressRecords: records.length - completed.length,
      totalHoursWorked: parseFloat(totalHours.toFixed(2)),
      averageHoursPerDay:
        completed.length > 0 ? parseFloat((totalHours / completed.length).toFixed(2)) : 0,
    };
  } catch (err) {
    console.error('Failed to get attendance stats:', err);
    return {
      totalRecords: 0,
      completedRecords: 0,
      inProgressRecords: 0,
      totalHoursWorked: 0,
      averageHoursPerDay: 0,
    };
  }
}

/**
 * Get attendance for a specific month
 */
export async function getUserMonthlyAttendance(
  userId: string,
  year: number,
  month: number // 1-12
): Promise<UserAttendance[]> {
  try {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    return getUserAttendancesByDateRange(userId, startDate, endDate);
  } catch (err) {
    console.error('Failed to get monthly attendance:', err);
    return [];
  }
}

/**
 * Check if user is currently clocked in
 */
export async function isUserClockedIn(userId: string): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('user_attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .gte('created_at', `${today}T00:00:00Z`)
      .lte('created_at', `${today}T23:59:59Z`)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return !!data;
  } catch (err) {
    console.error('Failed to check clock in status:', err);
    return false;
  }
}

/**
 * Get current active attendance record for user
 */
export async function getActiveClockedInRecord(userId: string): Promise<UserAttendance | null> {
  try {
    const { data, error } = await supabase
      .from('user_attendances')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    return {
      id: data.id,
      createdAt: data.created_at,
      employeeStartTime: data.employee_start_time,
      employeeEndTime: data.employee_end_time,
      userId: data.user_id,
      totalHours: data.total_hours,
      status: data.status,
    };
  } catch (err) {
    console.error('Failed to get active clocked in record:', err);
    return null;
  }
}

/**
 * Update attendance status manually
 */
export async function updateAttendanceStatus(
  attendanceId: number,
  status: 'in_progress' | 'completed' | 'absent' | 'cancelled'
): Promise<UserAttendance | null> {
  try {
    const { data, error } = await supabase
      .from('user_attendances')
      .update({ status })
      .eq('id', attendanceId)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      createdAt: data.created_at,
      employeeStartTime: data.employee_start_time,
      employeeEndTime: data.employee_end_time,
      userId: data.user_id,
      totalHours: data.total_hours,
      status: data.status,
    };
  } catch (err) {
    console.error('Failed to update attendance status:', err);
    return null;
  }
}

/**
 * Get attendance by ID
 */
export async function getAttendanceById(id: number): Promise<UserAttendance | null> {
  try {
    const { data, error } = await supabase
      .from('user_attendances')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (!data) return null;

    return {
      id: data.id,
      createdAt: data.created_at,
      employeeStartTime: data.employee_start_time,
      employeeEndTime: data.employee_end_time,
      userId: data.user_id,
      totalHours: data.total_hours,
      status: data.status,
    };
  } catch (err) {
    console.error('Failed to get attendance by ID:', err);
    return null;
  }
}

/**
 * Get attendance with user details (joined with users table)
 */
export async function getAttendanceWithUserDetails(
  startDate: string,
  endDate: string
): Promise<
  Array<{
    attendance: UserAttendance;
    user: {
      id: string;
      fullName: string;
      email: string;
      role: string;
    } | null;
  }>
> {
  try {
    const { data, error } = await supabase
      .from('user_attendances')
      .select(
        `
        id,
        created_at,
        employee_start_time,
        employee_end_time,
        user_id,
        total_hours,
        status,
        user:user_id (
          id,
          full_name,
          email,
          role
        )
      `
      )
      .gte('created_at', `${startDate}T00:00:00Z`)
      .lte('created_at', `${endDate}T23:59:59Z`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((record: any) => ({
      attendance: {
        id: record.id,
        createdAt: record.created_at,
        employeeStartTime: record.employee_start_time,
        employeeEndTime: record.employee_end_time,
        userId: record.user_id,
        totalHours: record.total_hours,
        status: record.status,
      },
      user: record.user
        ? {
            id: record.user.id,
            fullName: record.user.full_name,
            email: record.user.email,
            role: record.user.role,
          }
        : null,
    }));
  } catch (err) {
    console.error('Failed to get attendance with user details:', err);
    return [];
  }
}
