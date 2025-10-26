export interface User {
  id: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  password: string;
  photoURL?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  passwordUpdatedAt?: string;
  role?: 'admin' | 'teacher' | 'student';
}

export interface LoginCredentials {
  phoneNumber: string;
  password: string;
}

export interface AuthUser {
  uid: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  photoURL?: string;
  isActive: boolean;
  role?: 'admin' | 'teacher' | 'student';
}
