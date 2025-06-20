// src/services/leave-request-service.ts
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';
import { notifyUsersByRole, notifyUserById } from './notification-service';
import type { User } from './user-service';

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

const DB_PATH = path.resolve(process.cwd(), 'src', 'database', 'leave_requests.json'); // Corrected filename

async function readLeaveRequests(): Promise<LeaveRequest[]> {
  try {
    await fs.access(DB_PATH);
  } catch (error) {
    console.log("[LeaveRequestService/JSON] Leave requests database file not found, creating a new one.");
    await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8');
    return [];
  }
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    if (data.trim() === "") return [];
    return JSON.parse(data) as LeaveRequest[];
  } catch (error) {
    console.error("[LeaveRequestService/JSON] Error reading or parsing leave requests database:", error);
    await fs.writeFile(DB_PATH, JSON.stringify([], null, 2), 'utf8'); // Reset if corrupted
    return [];
  }
}

async function writeLeaveRequests(requests: LeaveRequest[]): Promise<void> {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(requests, null, 2), 'utf8');
  } catch (error) {
    console.error("[LeaveRequestService/JSON] Error writing leave requests database:", error);
    throw new Error('Failed to save leave request data.');
  }
}

export async function addLeaveRequest(data: AddLeaveRequestData): Promise<LeaveRequest> {
  const leaveRequests = await readLeaveRequests();
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
  await writeLeaveRequests(leaveRequests);

  const notificationMessage = `Permintaan izin baru dari ${newRequest.displayName} (${newRequest.leaveType}) dari tanggal ${newRequest.startDate} hingga ${newRequest.endDate}.`;
  await notifyUsersByRole('Owner', notificationMessage); // Assuming Owner approves

  console.log(`[LeaveRequestService/JSON] Leave request added for ${data.username}. Owners notified.`);
  return newRequest;
}

export async function getAllLeaveRequests(): Promise<LeaveRequest[]> {
  const allRequests = await readLeaveRequests();
  return allRequests.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
}


export async function getApprovedLeaveRequests(): Promise<LeaveRequest[]> {
  const allRequests = await readLeaveRequests();
  return allRequests.filter(req => req.status === 'Approved');
}

export async function approveLeaveRequest(requestId: string, approverUserId: string, approverUsername: string): Promise<LeaveRequest | null> {
  const leaveRequests = await readLeaveRequests();
  const requestIndex = leaveRequests.findIndex(req => req.id === requestId);

  if (requestIndex === -1) {
    console.warn(`[LeaveRequestService/JSON] Leave request with ID ${requestId} not found for approval.`);
    return null;
  }

  if (leaveRequests[requestIndex].status !== 'Pending') {
    console.warn(`[LeaveRequestService/JSON] Leave request ${requestId} is not in Pending state, cannot approve.`);
    return null; 
  }

  leaveRequests[requestIndex].status = 'Approved';
  leaveRequests[requestIndex].approvedRejectedBy = approverUserId;
  leaveRequests[requestIndex].approvedRejectedAt = new Date().toISOString();

  await writeLeaveRequests(leaveRequests);
  const updatedRequest = leaveRequests[requestIndex];

  const employeeNotificationMessage = `Permintaan izin Anda (${updatedRequest.leaveType}) dari ${updatedRequest.startDate} hingga ${updatedRequest.endDate} telah disetujui oleh ${approverUsername}.`;
  await notifyUserById(updatedRequest.userId, employeeNotificationMessage);
  console.log(`[LeaveRequestService/JSON] User ${updatedRequest.userId} notified of leave approval.`);

  return updatedRequest;
}

export async function rejectLeaveRequest(requestId: string, rejectorUserId: string, rejectorUsername: string, rejectionReason: string): Promise<LeaveRequest | null> {
  const leaveRequests = await readLeaveRequests();
  const requestIndex = leaveRequests.findIndex(req => req.id === requestId);

  if (requestIndex === -1) {
    console.warn(`[LeaveRequestService/JSON] Leave request with ID ${requestId} not found for rejection.`);
    return null;
  }

  if (leaveRequests[requestIndex].status !== 'Pending') {
    console.warn(`[LeaveRequestService/JSON] Leave request ${requestId} is not in Pending state, cannot reject.`);
    return null; 
  }

  leaveRequests[requestIndex].status = 'Rejected';
  leaveRequests[requestIndex].approvedRejectedBy = rejectorUserId;
  leaveRequests[requestIndex].approvedRejectedAt = new Date().toISOString();
  leaveRequests[requestIndex].rejectionReason = rejectionReason;

  await writeLeaveRequests(leaveRequests);
  const updatedRequest = leaveRequests[requestIndex];
  
  const employeeNotificationMessage = `Permintaan izin Anda (${updatedRequest.leaveType}) dari ${updatedRequest.startDate} hingga ${updatedRequest.endDate} telah ditolak oleh ${rejectorUsername}. Alasan: ${rejectionReason}`;
  await notifyUserById(updatedRequest.userId, employeeNotificationMessage);
  console.log(`[LeaveRequestService/JSON] User ${updatedRequest.userId} notified of leave rejection.`);

  return updatedRequest;
}

export async function getLeaveRequestsByUserId(userId: string): Promise<LeaveRequest[]> {
    const allRequests = await readLeaveRequests();
    return allRequests.filter(req => req.userId === userId).sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
}
