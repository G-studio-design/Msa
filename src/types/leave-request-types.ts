// src/types/leave-request-types.ts

export interface LeaveRequest {
  id: string;
  userId: string; 
  username: string; 
  displayName?: string; 
  requestDate: string; // ISO string
  leaveType: string; 
  startDate: string; // ISO string (date only)
  endDate: string; // ISO string (date only)
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedRejectedBy?: string; 
  approvedRejectedAt?: string; // ISO string
  rejectionReason?: string; 
}

export interface AddLeaveRequestData {
  userId: string;
  username: string;
  displayName?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}
