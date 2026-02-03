
import React, { useMemo } from 'react';
import { Course } from '../types';

interface CourseCardProps {
  course: Course;
  onClick: (courseId: string) => void;
  showProgress?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({ course, onClick, showProgress }) => {
  const isExpired = course.expiryDate ? new Date(course.expiryDate) < new Date() : false;
  const isComingSoon = course.isComingSoon;
  const isStockOut = course.isStockOut;

  const timeLabel = useMemo(() => {
    if (isStockOut) return "Registry Closed";
    if (isComingSoon) return "Neural Sync Pending";
    if (!course.expiryDate) return null;
    const now = new Date();
    const expiry = new Date(course.expiryDate);
    const diff = expiry.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return "Expired";
    if (days === 0) return "Expires Today";
    if (days === 1) return "1 day left";
    if (days <= 7) return `${days} days left`;
    return `Ends ${expiry.toLocaleDateString()}`;
  }, [course.expiryDate, isComingSoon, isStockOut]);

  return (
    <div 
      onClick={() => onClick(course.id)}
      className={`bg-slate-900 rounded-[32px] border overflow-hidden cursor-pointer group hover:shadow-2xl transition-all duration-500 flex flex-col h-full relative ${
        isStockOut
          ? 'border-rose-500/20 grayscale shadow-inner'
          : isComingSoon 
            ? 'border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]' 
            : 'border-slate-800 hover:border-indigo-500/50'
      }`}
    >
      {isExpired && (
        <div className="absolute top-4 right-4 z-20 px-3 py-1 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-xl animate-pulse">
          Access Revoked
        </div>
      )}

      {isStockOut && (
        <div className="absolute top-4 right-4 z-20 px-3 py-1 bg-rose-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-xl flex items-center space-x-2 animate-pulse">
          <i className="fas fa-lock"></i>
          <span>Capacity Reached</span>
        </div>
      )}

      {isComingSoon && !isStockOut && (
        <div className="absolute top-4 right-4 z-20 px-3 py-1 bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-widest rounded-lg shadow-xl flex items-center space-x-2 animate-pulse">
          <i className="fas fa-bolt"></i>
          <span>Coming Soon</span>
        </div>
      )}

      <div className="relative aspect-video overflow-hidden">
        <img 
          src={course.thumbnail} 
          alt={course.title} 
          className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${isStockOut ? 'opacity-20' : isComingSoon ? 'opacity-40 grayscale blur-[2px] group-hover:blur-0 group-hover:grayscale-0 group-hover:opacity-100' : 'opacity-90 group-hover:opacity-100'}`}
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className={`px-3 py-1 bg-slate-950/80 backdrop-blur-md rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-xl ${isStockOut ? 'text-rose-400 border-rose-500/20' : 'text-indigo-400 border-slate-800'}`}>
            {course.category}
          </div>
        </div>
        {!isComingSoon && !isStockOut && (
          <div className="absolute bottom-4 right-4 px-4 py-2 bg-indigo-600 rounded-2xl text-white font-black text-sm shadow-2xl border border-indigo-500/30">
            ${(course.price || 0).toFixed(2)}
          </div>
        )}
        {isComingSoon && !isStockOut && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin"></div>
          </div>
        )}
      </div>
      
      <div className="p-6 md:p-7 flex flex-col flex-1">
        <div className="flex items-center space-x-3 mb-4">
          <img src={course.instructorAvatar} alt={course.instructor} className="w-7 h-7 rounded-lg border border-slate-800" />
          <span className="text-[10px] text-slate-500 font-black tracking-tight uppercase">{course.instructor}</span>
        </div>
        
        <h3 className={`text-lg md:text-xl font-black mb-4 line-clamp-2 min-h-[3rem] md:min-h-[3.5rem] leading-tight transition-colors ${isStockOut ? 'text-slate-600' : isComingSoon ? 'text-slate-400 group-hover:text-amber-400' : 'text-slate-100 group-hover:text-indigo-400'}`}>
          {course.title}
        </h3>
        
        <div className="flex items-center space-x-4 text-[10px] text-slate-500 mb-auto font-black uppercase tracking-widest">
          <span className="flex items-center">
            <i className={`fas fa-star ${isStockOut ? 'text-slate-800' : isComingSoon ? 'text-slate-700' : 'text-amber-500'} mr-2`}></i>
            <span className="text-slate-300">{course.rating || 0}</span>
          </span>
          <span className="flex items-center">
            <i className="fas fa-user-group mr-2 opacity-50"></i>
            {(course.studentsCount || 0).toLocaleString()}
          </span>
        </div>

        {timeLabel && (
          <div className={`mt-4 flex items-center space-x-2 px-3 py-1.5 rounded-xl border ${isStockOut ? 'bg-rose-500/5 border-rose-500/20 text-rose-500' : isExpired ? 'bg-rose-500/5 border-rose-500/20 text-rose-500' : isComingSoon ? 'bg-amber-500/5 border-amber-500/20 text-amber-500' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
            <i className={`fas ${isStockOut ? 'fa-ban' : isExpired ? 'fa-calendar-xmark' : isComingSoon ? 'fa-satellite-dish' : 'fa-clock'} text-[10px]`}></i>
            <span className="text-[9px] font-black uppercase tracking-widest">
              {timeLabel}
            </span>
          </div>
        )}

        {!showProgress && (
          <div className="pt-6 mt-6 border-t border-slate-800 flex justify-end items-center">
            {isStockOut ? (
              <button className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-800 w-full cursor-not-allowed">
                Registration Closed <i className="fas fa-lock ml-3"></i>
              </button>
            ) : isComingSoon ? (
              <div className="flex flex-col w-full">
                <button className="text-amber-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center bg-amber-500/10 px-4 py-2.5 rounded-xl border border-amber-500/20 w-full hover:bg-amber-500 hover:text-slate-950 transition-all">
                  Notify Me <i className="fas fa-bell ml-3"></i>
                </button>
              </div>
            ) : (
              <button className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] group-hover:translate-x-2 transition-transform flex items-center bg-indigo-500/10 px-4 py-2.5 rounded-xl border border-indigo-500/20 w-full justify-center md:w-auto">
                Enroll <i className="fas fa-arrow-right ml-3"></i>
              </button>
            )}
          </div>
        )}
        
        {showProgress && (
          <div className="pt-6 mt-6 border-t border-slate-800">
             <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Momentum</span>
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">75%</span>
             </div>
             <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: '75%' }}></div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseCard;
