export type TeacherFeaturedCourse = {
  id: string;
  title: string;
  thumbnail_url: string | null;
};

export type TeacherDiscoveryCard = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email_masked: string | null;
  skills: string[];
  featured_courses: TeacherFeaturedCourse[];
  total_students: number;
};

export type TeacherDiscoveryPayload = {
  total: number;
  teachers: TeacherDiscoveryCard[];
  categories: string[];
};

export type TeacherPublicCourse = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  course_type: string;
  thumbnail_url: string | null;
  created_at: string;
};

export type TeacherPublicProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email_masked: string | null;
  skills: string[];
  published_courses: TeacherPublicCourse[];
  total_students: number;
};
