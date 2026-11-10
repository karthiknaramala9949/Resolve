export type AuthProvider = 'email' | 'phone' | 'google';

export interface UserProfile {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  image: string | null;
  providers: AuthProvider[];
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  phoneVerified: boolean;
  phoneVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
}

export interface RegisterFormData {
  name: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
}

export interface LoginFormData {
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface ForgotPasswordFormData {
  identifier: string;
}

export interface ResetPasswordFormData {
  identifier: string;
  token: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface VerifyOtpFormData {
  phoneNumber: string;
  otp: string;
}

