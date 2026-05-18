
import React from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import CourseDetails from './CourseDetails';
import { Course, User } from '../types';

interface CoursePageProps {
  courses: Course[];
  user: User;
  handleEnroll: (id: string) => void;
  handleStartEditing: (id: string) => void;
}

const CoursePageRoute: React.FC<CoursePageProps> = ({ courses, user, handleEnroll, handleStartEditing }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const course = courses.find(c => c.id === id);
  
  if (!course) return <Navigate to="/explore" />;
  
  return (
    <CourseDetails 
      course={course} 
      isAdmin={user.role === 'admin'} 
      isEnrolled={user.enrolledCourses?.includes(course.id) || false} 
      onEnroll={handleEnroll} 
      onAdminEdit={() => handleStartEditing(course.id)} 
      onBack={() => navigate('/explore')} 
    />
  );
};

export default CoursePageRoute;
