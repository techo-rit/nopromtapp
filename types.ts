// types.ts

export type NavCategory = "Try on" | "Creators"; // <--- Add this line

export interface Stack {
  id: string;
  name: string;
  imageUrl: string;
}

export interface Template {
  id: string;
  name: string;
  stackId: string;
  imageUrl: string;
  prompt: string | Record<string, any>;
  aspectRatio: string;
  keywords?: string[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
  createdAt: Date;
  lastLogin: Date;
}