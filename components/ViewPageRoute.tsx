
import React from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import CourseView from './CourseView';
import { Course, User } from '../types';

interface ViewPageProps {
  courses: Course[];
  user: User;
  handleUpdateUser: (u: User) => void;
  handleAddLessonResource: any;
  initialLessonId?: string;
}

const ViewPageRoute: React.FC<ViewPageProps> = ({ courses, user, handleUpdateUser, handleAddLessonResource, initialLessonId }) => {
  const { id, lessonId } = useParams();
  const navigate = useNavigate();
  const course = courses.find(c => c.id === id);
  
  if (!course) return <Navigate to="/dashboard" />;
  
  const handleLessonChange = (newLessonId: string) => {
    navigate(`/view/${id}/${newLessonId}`, { replace: true });
  };
  
  return (
    <CourseView 
      course={course} 
      user={user} 
      onBack={() => navigate('/dashboard')} 
      initialLessonId={lessonId || initialLessonId} 
      onLessonChange={handleLessonChange}
      onQuizComplete={(lid, att) => { 
        const updated = { ...user, quizScores: { ...user.quizScores, [lid]: att } }; 
        handleUpdateUser(updated); 
      }} 
      onNotesUpdate={(lid, content) => { 
        const updated = { ...user, notes: { ...(user.notes || {}), [lid]: content } }; 
        handleUpdateUser(updated); 
      }} 
      onAddResource={(rid, res) => handleAddLessonResource(course.id, rid, res)} 
    />
  );
};

export default ViewPageRoute;
