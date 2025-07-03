// src/services/leave-request-service.ts
'use server';

import * as path from 'path';
import { readDb, writeDb } from '@/lib/json-db-utils';
import { notifyUsersByRole, notifyUserById } from './notification-service';

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

const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'leave_requests.json');

export async function addLeaveRequest(data: AddLeaveRequestData): Promise<LeaveRequest> {
  const leaveRequests = await readDb<LeaveRequest[]>(DB_PATH, []);
  const now = new Date();

  const newRequest: LeaveRequest = {
    id: `leave_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    userId: data.userId,
    username: data.username,
    displayName: data.displayName || data.username,
    requestDate: now.toISOString(),
    leaveType: data.leaveType,
    startDate: data.startDate,
    endDate: data.endDate,    
    reason: data.reason,
    status: 'Pending',
  };

  leaveRequests.push(newRequest);
  await writeDb(DB_PATH, leaveRequests);

  const notificationMessage = `Permintaan izin baru dari ${newRequest.displayName} (${newRequest.leaveType}) dari tanggal ${newRequest.startDate} hingga ${newRequest.endDate}.`;
  await notifyUsersByRole('Owner', notificationMessage);

  console.log(`[LeaveRequestService] Leave request added for ${data.username}. Owners notified.`);
  return newRequest;
}

export async function getAllLeaveRequests(): Promise<LeaveRequest[]> {
  const allRequests = await readDb<LeaveRequest[]>(DB_PATH, []);
  return allRequests.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
}

export async function getApprovedLeaveRequests(): Promise<LeaveRequest[]> {
  const allRequests = await readDb<LeaveRequest[]>(DB_PATH, []);
  return allRequests.filter(req => req.status === 'Approved');
}

export async function approveLeaveRequest(requestId: string, approverUserId: string, approverUsername: string): Promise<LeaveRequest | null> {
  const leaveRequests = await readDb<LeaveRequest[]>(DB_PATH, []);
  const requestIndex = leaveRequests.findIndex(req => req.id === requestId);

  if (requestIndex === -1) {
    console.warn(`[LeaveRequestService] Leave request with ID ${requestId} not found for approval.`);
    return null;
  }

  if (leaveRequests[requestIndex].status !== 'Pending') {
    console.warn(`[LeaveRequestService] Leave request ${requestId} is not in Pending state, cannot approve.`);
    return null; 
  }

  leaveRequests[requestIndex].status = 'Approved';
  leaveRequests[requestIndex].approvedRejectedBy = approverUserId;
  leaveRequests[requestIndex].approvedRejectedAt = new Date().toISOString();

  await writeDb(DB_PATH, leaveRequests);
  const updatedRequest = leaveRequests[requestIndex];

  const employeeNotificationMessage = `Permintaan izin Anda (${updatedRequest.leaveType}) dari ${updatedRequest.startDate} hingga ${updatedRequest.endDate} telah disetujui oleh ${approverUsername}.`;
  await notifyUserById(updatedRequest.userId, employeeNotificationMessage);
  console.log(`[LeaveRequestService] User ${updatedRequest.userId} notified of leave approval.`);

  return updatedRequest;
}

export async function rejectLeaveRequest(requestId: string, rejectorUserId: string, rejectorUsername: string, rejectionReason: string): Promise<LeaveRequest | null> {
  const leaveRequests = await readDb<LeaveRequest[]>(DB_PATH, []);
  const requestIndex = leaveRequests.findIndex(req => req.id === requestId);

  if (requestIndex === -1) {
    console.warn(`[LeaveRequestService] Leave request with ID ${requestId} not found for rejection.`);
    return null;
  }

  if (leaveRequests[requestIndex].status !== 'Pending') {
    console.warn(`[LeaveRequestService] Leave request ${requestId} is not in Pending state, cannot reject.`);
    return null; 
  }

  leaveRequests[requestIndex].status = 'Rejected';
  leaveRequests[requestIndex].approvedRejectedBy = rejectorUserId;
  leaveRequests[requestIndex].approvedRejectedAt = new Date().toISOString();
  leaveRequests[requestIndex].rejectionReason = rejectionReason;

  await writeDb(DB_PATH, leaveRequests);
  const updatedRequest = leaveRequests[requestIndex];
  
  const employeeNotificationMessage = `Permintaan izin Anda (${updatedRequest.leaveType}) dari ${updatedRequest.startDate} hingga ${updatedRequest.endDate} telah ditolak oleh ${rejectorUsername}. Alasan: ${rejectionReason}`;
  await notifyUserById(updatedRequest.userId, employeeNotificationMessage);
  console.log(`[LeaveRequestService] User ${updatedRequest.userId} notified of leave rejection.`);

  return updatedRequest;
}

export async function getLeaveRequestsByUserId(userId: string): Promise<LeaveRequest[]> {
    const allRequests = await readDb<LeaveRequest[]>(DB_PATH, []);
    return allRequests.filter(req => req.userId === userId).sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
}
