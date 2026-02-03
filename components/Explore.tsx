
import React, { useState, useMemo } from 'react';
import { Course } from '../types';
import CourseCard from './CourseCard';

interface ExploreProps {
  onCourseClick: (id: string) => void;
  courses: Course[];
}

const Explore: React.FC<ExploreProps> = ({ onCourseClick, courses }) => {
  const [filter, setFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'All' | 'Available' | 'Locked'>('All');

  const dynamicCategories = ['All', ...new Set(courses.map(c => c.category || 'Academic'))];

  const filteredCourses = useMemo(() => {
    return courses.filter(c => {
      const matchesCategory = filter === 'All' || c.category === filter;
      const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           c.instructor.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAvailability = availabilityFilter === 'All' || 
                                 (availabilityFilter === 'Available' && !c.isStockOut) ||
                                 (availabilityFilter === 'Locked' && c.isStockOut);
      
      return matchesCategory && matchesSearch && matchesAvailability;
    });
  }, [courses, filter, searchTerm, availabilityFilter]);

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in pb-12">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 px-1 md:px-0">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none">Catalog</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">Neural-Linked Expert Programs</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="flex items-center space-x-3 bg-slate-900 px-4 py-3.5 rounded-2xl border border-slate-800 w-full sm:w-80 shadow-xl focus-within:border-indigo-500/50 transition-all">
            <i className="fas fa-search text-slate-700 text-xs"></i>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search syllabus..." 
              className="w-full bg-transparent border-none focus:ring-0 text-xs text-slate-300 py-1 font-bold placeholder:text-slate-800"
            />
          </div>
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner shrink-0 w-full sm:w-auto">
             {['All', 'Available', 'Locked'].map((opt) => (
                <button 
                  key={opt}
                  onClick={() => setAvailabilityFilter(opt as any)}
                  className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${availabilityFilter === opt ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                >
                  {opt}
                </button>
             ))}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 sticky top-[72px] md:top-0 z-20 md:z-10 bg-slate-950 md:bg-transparent">
        {dynamicCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
              filter === cat 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' 
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 pb-10">
        {filteredCourses.length > 0 ? (
          filteredCourses.map(course => (
            <CourseCard key={course.id} course={course} onClick={onCourseClick} />
          ))
        ) : (
          <div className="col-span-full py-24 flex flex-col items-center text-center opacity-30">
            <i className="fas fa-search text-3xl mb-5 text-slate-700"></i>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">No nodes matching registry</h3>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mt-2">Try adjusting your search parameters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
