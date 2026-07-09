import type { TicketStatus, TicketCategory } from 'core';

export const Role = {
  ADMIN: 'ADMIN',
  AGENT: 'AGENT',
} as const;

export type Role = typeof Role[keyof typeof Role];

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface EndUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}



export interface Message {
  id: string;
  ticketId: string;
  sender: 'STUDENT' | 'SYSTEM_AI' | 'AGENT';
  senderEmail: string;
  body: string;
  messageId?: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNumber: number;
  studentEmail: string;
  subject: string;
  status: TicketStatus;
  category: TicketCategory;
  aiSummary?: string;
  aiSuggestedReply?: string;
  aiConfidence?: number;
  assignedTo?: { id: string; email: string; role: string; name: string } | null;
  messages?: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface KBArticle {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author?: { email: string };
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalTickets: number;
  statusStats: {
    OPEN: number;
    RESOLVED: number;
    CLOSED: number;
  };
  categoryStats: {
    GENERAL_QUESTION: number;
    TECHNICAL_QUESTION: number;
    REFUND_REQUEST: number;
  };
  aiMetrics: {
    autoResolved: number;
    manualResolved: number;
    avgConfidence: number;
  };
}

import axios from 'axios';

// Create an axios instance configured with withCredentials to support database session cookies
const axiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// API client wrapper for relative API calls using Axios
async function request<T>(path: string, options: any = {}): Promise<T> {
  try {
    const response = await axiosInstance({
      url: path,
      method: options.method || 'GET',
      data: options.body ? JSON.parse(options.body) : undefined,
      headers: options.headers,
    });
    return response.data;
  } catch (error: any) {
    const errMsg = error.response?.data?.error || error.message || 'API request failed';
    throw new Error(errMsg);
  }
}


export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
    me: () => request<{ user: User }>('/api/auth/me'),
  },
  tickets: {
    list: (params: { 
      status?: string; 
      category?: string; 
      search?: string; 
      sortBy?: string; 
      sortOrder?: string;
      studentEmail?: string;
      minConfidence?: string;
      maxConfidence?: string;
      dateRange?: string;
      page?: number;
      limit?: number;
    } = {}) => {
      const query = new URLSearchParams();
      if (params.status) {
        query.append('status', params.status);
      }
      if (params.category) {
        query.append('category', params.category);
      }
      if (params.search) {
        query.append('search', params.search);
      }
      if (params.sortBy) {
        query.append('sortBy', params.sortBy);
      }
      if (params.sortOrder) {
        query.append('sortOrder', params.sortOrder);
      }
      if (params.studentEmail) {
        query.append('studentEmail', params.studentEmail);
      }
      if (params.minConfidence) {
        query.append('minConfidence', params.minConfidence);
      }
      if (params.maxConfidence) {
        query.append('maxConfidence', params.maxConfidence);
      }
      if (params.dateRange) {
        query.append('dateRange', params.dateRange);
      }
      if (params.page !== undefined) {
        query.append('page', params.page.toString());
      }
      if (params.limit !== undefined) {
        query.append('limit', params.limit.toString());
      }
      return request<{ 
        tickets: Ticket[]; 
        total?: number; 
        page?: number; 
        limit?: number; 
        totalPages?: number; 
      }>(`/api/tickets?${query.toString()}`);
    },
    get: (id: string) => request<{ ticket: Ticket }>(`/api/tickets/${id}`),
    update: (id: string, updates: { status?: string; category?: string; assignedToId?: string | null }) =>
      request<{ ticket: Ticket }>(`/api/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    reply: (id: string, body: string, bodyHtml?: string) =>
      request<{ message: Message }>(`/api/tickets/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body, bodyHtml }),
      }),
    listAgents: () =>
      request<{ agents: { id: string; email: string; role: string; name: string }[] }>('/api/tickets/agents'),
  },
  kb: {
    list: () => request<{ articles: KBArticle[] }>('/api/kb'),
    get: (id: string) => request<{ article: KBArticle }>(`/api/kb/${id}`),
    create: (article: { title: string; content: string }) =>
      request<{ article: KBArticle }>('/api/kb', {
        method: 'POST',
        body: JSON.stringify(article),
      }),
    update: (id: string, article: { title: string; content: string }) =>
      request<{ article: KBArticle }>(`/api/kb/${id}`, {
        method: 'PUT',
        body: JSON.stringify(article),
      }),
    delete: (id: string) => request<{ message: string }>(`/api/kb/${id}`, { method: 'DELETE' }),
  },
  agents: {
    list: () => request<{ agents: User[] }>('/api/agents'),
    create: (agent: { email: string; password: string; role?: string }) =>
      request<{ agent: User }>('/api/agents', {
        method: 'POST',
        body: JSON.stringify(agent),
      }),
    delete: (id: string) => request<{ message: string }>(`/api/agents/${id}`, { method: 'DELETE' }),
  },
  users: {
    list: (params?: { search?: string }) => {
      const query = new URLSearchParams();
      if (params?.search) {
        query.append('search', params.search);
      }
      return request<{ users: EndUser[] }>(`/api/users?${query.toString()}`);
    },
    create: (data: { name: string; email: string; password: string }) =>
      request<{ user: EndUser }>('/api/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { name: string; email: string; password?: string }) =>
      request<{ user: EndUser }>(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<{ message: string }>(`/api/users/${id}`, { method: 'DELETE' }),
  },
  dashboard: {
    stats: () => request<DashboardStats>('/api/dashboard/stats'),
  },
  emails: {
    inbound: (data: { from: string; subject: string; text: string; headers?: string }) =>
      request<{ success: boolean; ticketId: string }>('/api/emails/inbound', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
