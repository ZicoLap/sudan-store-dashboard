import { Address } from "./address.models";

export interface AppUser {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string; // Consider using union type: 'customer' | 'store_owner' | 'admin'
  gender: string; // Consider using union type: 'male' | 'female' | 'other'
  birthday: string; // ISO 8601 date string
  createdAt: string; // ISO 8601 date string
  phoneNumber: string;
  addresses: Address[];
  
  // Computed property (you'll need to calculate this in your Angular service/component)
  fullName: string; // firstName + ' ' + lastName
}

export type UserRole = 'customer' | 'store_owner' | 'admin';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface StrictAppUser extends Omit<AppUser, 'role' | 'gender'> {
  role: UserRole;
  gender: Gender;
}