import { useQuery } from "@tanstack/react-query";
import { isAdminQuery, profileQuery } from "@/lib/queries";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  target_exam_code: string;
  target_year: number;
  target_date: string | null;
  study_level: string;
  daily_question_goal: number;
  daily_minutes_goal: number;
  preferred_subjects: string[];
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
  plan_tier: string;
}

export function useProfile() {
  return useQuery({ ...profileQuery, select: (d) => d as unknown as Profile | null });
}

export function useIsAdmin() {
  return useQuery(isAdminQuery);
}
