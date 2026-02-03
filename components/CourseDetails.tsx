
import React, { useState } from 'react';
import { Course, Lesson } from '../types';
import { saveWaitlistEntry } from '../services/storage';

interface CourseDetailsProps {
  course: Course;
  isAdmin: boolean;
  isEnrolled: boolean;
  onEnroll: (courseId: string) => void;
  onAdminEdit: () => void;
  onBack: () => void;
}

const CourseDetails: React.FC<CourseDetailsProps> = ({ course, isAdmin, isEnrolled, onEnroll, onAdminEdit, onBack }) => {
  const [view, setView] = useState<'details' | 'checkout'>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistJoined, setWaitlistJoined] = useState(false);

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccess(true);
      setTimeout(() => onEnroll(course.id), 1500);
    }, 2000);
  };

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail) return;
    setIsProcessing(true);
    
    try {
      await saveWaitlistEntry({
        id: Math.random().toString(36).substr(2, 9),
        courseId: course.id,
        email: waitlistEmail,
        timestamp: new Date()
      });
      setIsProcessing(false);
      setWaitlistJoined(true);
    } catch (err) {
      console.error("Waitlist Error:", err);
      setIsProcessing(false);
      alert("Failed to join waitlist. Please try again.");
    }
  };

  const roadmapItems = course.roadmap && course.roadmap.length > 0 ? course.roadmap : [
    { icon: 'fa-tv', text: `${course.lessons.length} HD Modules` },
    { icon: 'fa-sparkles', text: 'AI Tutoring' },
    { icon: 'fa-file-pdf', text: 'Study Materials' },
    { icon: 'fa-infinity', text: 'Lifetime Access' },
    { icon: 'fa-certificate', text: 'Certification' },
  ];

  if (view === 'checkout') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-full max-w-2xl bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-6 md:p-8 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
            <button 
              onClick={() => setView('details')} 
              className="flex items-center space-x-2 text-slate-500 hover:text-white transition-colors text-[9px] font-black uppercase tracking-widest"
            >
              <i className="fas fa-arrow-left"></i>
              <span>Details</span>
            </button>
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Checkout</span>
          </div>
          <div className="p-6 md:p-12">
            {paymentSuccess ? (
              <div className="text-center py-8 animate-in zoom-in duration-500">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl border border-emerald-500/20 shadow-inner">
                  <i className="fas fa-check"></i>
                </div>
                <h3 className="text-xl font-black text-white mb-2">Authenticated</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Establishing Neural Enrollment...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4">Summary</h3>
                    <div className="flex items-center space-x-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                      <img src={course.thumbnail} className="w-12 h-12 object-cover rounded-xl shrink-0" alt="" />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white truncate">{course.title}</p>
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">${(course.price || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 bg-indigo-600 rounded-2xl text-white shadow-xl">
                    <p className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">Due Now</p>
                    <p className="text-3xl font-black">${(course.price || 0).toFixed(2)}</p>
                  </div>
                </div>
                <form onSubmit={handlePayment} className="space-y-5">
                  <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Card Details</h3>
                  <div className="space-y-4">
                    <input type="text" placeholder="Card Number" disabled={isProcessing} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3.5 text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="MM/YY" disabled={isProcessing} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3.5 text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" />
                      <input type="text" placeholder="CVC" disabled={isProcessing} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3.5 text-white font-bold text-xs focus:border-indigo-500 outline-none transition-all" />
                    </div>
                  </div>
                  <button disabled={isProcessing} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50">
                    {isProcessing ? 'Authorizing...' : `Pay Total`}
                  </button>
                  <p className="text-[7px] text-slate-700 font-black uppercase text-center tracking-widest"><i className="fas fa-lock mr-1.5"></i> SSL 256-bit Encrypted</p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 animate-in fade-in duration-700 max-w-7xl mx-auto px-0 md:px-0">
      {/* Mobile Top Image */}
      <div className="md:hidden w-full aspect-video relative overflow-hidden mb-6 rounded-b-[40px] border-b border-slate-800 shadow-2xl">
         <img src={course.thumbnail} className={`w-full h-full object-cover ${course.isComingSoon || course.isStockOut ? 'grayscale brightness-[0.4]' : ''}`} alt="" />
         <button onClick={onBack} className="absolute top-6 left-6 w-10 h-10 bg-slate-950/60 backdrop-blur-lg rounded-xl border border-white/10 flex items-center justify-center text-white"><i className="fas fa-arrow-left text-sm"></i></button>
         {(course.isComingSoon || course.isStockOut) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-4">
                <i className={`fas ${course.isStockOut ? 'fa-lock' : 'fa-hourglass-half'} ${course.isStockOut ? 'text-rose-500' : 'text-amber-500'} text-2xl mb-2 animate-bounce`}></i>
                <p className="text-[8px] font-black text-white uppercase tracking-[0.3em]">{course.isStockOut ? 'Registry Locked' : 'Synchronizing'}</p>
              </div>
            </div>
         )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 px-4 md:px-0">
        <button onClick={onBack} className="hidden md:flex items-center space-x-3 text-slate-400 hover:text-white transition-all group">
          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-indigo-500 transition-all"><i className="fas fa-arrow-left text-xs"></i></div>
          <span className="text-[10px] font-black uppercase tracking-widest">Catalog</span>
        </button>
        {isAdmin && <button onClick={onAdminEdit} className="w-full md:w-auto px-5 py-3 bg-slate-900 text-indigo-400 border border-indigo-900/40 rounded-xl hover:bg-indigo-600/10 transition-all text-[9px] font-black uppercase tracking-widest">Edit Node Configuration</button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 px-4 md:px-0">
        <div className="lg:col-span-8 space-y-10 md:space-y-12">
          <div className="space-y-6">
            <div className="flex items-center justify-start gap-3 mb-2 flex-wrap">
               <span className={`px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full border ${course.isStockOut ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : course.isComingSoon ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>{course.category}</span>
               {!course.isComingSoon && !course.isStockOut && <div className="flex items-center text-[9px] text-amber-500 font-black bg-amber-500/5 px-2 py-1 rounded-full border border-amber-500/10"><i className="fas fa-star mr-1.5"></i> {course.rating} Rating</div>}
            </div>
            
            {course.isStockOut && (
              <div className="inline-flex items-center space-x-3 bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-2xl text-rose-500 mb-2">
                <i className="fas fa-lock text-[10px]"></i>
                <span className="text-[10px] font-black uppercase tracking-widest">Identity Capacity Reached</span>
              </div>
            )}
            
            {course.isComingSoon && !course.isStockOut && (
              <div className="inline-flex items-center space-x-3 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-2xl text-amber-500 mb-2">
                <i className="fas fa-rocket animate-pulse text-[10px]"></i>
                <span className="text-[10px] font-black uppercase tracking-widest">{course.comingSoonTagline || 'Link Pending Deployment'}</span>
              </div>
            )}

            <h1 className={`text-3xl md:text-6xl font-black tracking-tighter leading-tight md:leading-none ${course.isStockOut ? 'text-slate-500' : 'text-white'}`}>{course.title}</h1>
            <p className="text-sm md:text-lg text-slate-400 leading-relaxed max-w-3xl">{course.description}</p>
          </div>

          {course.isComingSoon && !course.isStockOut && (
            <div className="p-6 md:p-8 bg-slate-900/50 border border-amber-500/10 rounded-[28px] md:rounded-[32px] space-y-5 animate-in slide-in-from-bottom-2">
               <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Registry Sync</h3>
                  <span className="text-[10px] font-black text-white">{course.syncProgress || 10}%</span>
               </div>
               <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                  <div className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse" style={{ width: `${course.syncProgress || 10}%` }}></div>
               </div>
               <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest text-center">Architecting core modules and expert expert nodes...</p>
            </div>
          )}

          <div className="space-y-8 md:space-y-10">
            <h3 className="text-lg md:text-2xl font-black text-white tracking-tight flex items-center">
               <i className={`fas ${course.isComingSoon ? 'fa-satellite-dish' : 'fa-map-location-dot'} mr-3 md:mr-4 text-indigo-500`}></i> 
               {course.isComingSoon ? 'Theoretical Map' : 'Curriculum Blueprint'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {course.subjects.map((subject) => (
                <div key={subject.id} className="p-5 md:p-6 bg-slate-900/50 border border-slate-800 rounded-[24px] md:rounded-[32px] group transition-all text-left">
                  <div className="flex items-center space-x-4">
                    <div className={`w-11 h-11 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-lg md:text-2xl shadow-inner border group-hover:scale-105 transition-transform shrink-0 ${subject.color}`}>
                      <i className={`fas ${subject.icon}`}></i>
                    </div>
                    <div className="min-w-0">
                       <h4 className="text-base md:text-xl font-black text-slate-100 uppercase tracking-tight leading-tight truncate">{subject.name}</h4>
                       <p className="text-[8px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">{subject.subSubjects.length} Specialized Nodes</p>
                    </div>
                  </div>
                </div>
              ))}
              {(course.subjects.length === 0 || course.isComingSoon) && (
                <div className="col-span-full py-12 px-6 border-2 border-dashed border-slate-800 rounded-[32px] md:rounded-[40px] text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-800">
                    <i className="fas fa-brain fa-spin text-lg"></i>
                  </div>
                  <p className="text-slate-500 font-bold italic text-[11px] md:text-sm px-4">
                    Registry architecture is currently being established by our faculty.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar / CTA */}
        <div className="lg:col-span-4 mt-10 lg:mt-0">
          <div className="lg:sticky lg:top-8 bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-800 overflow-hidden shadow-2xl relative">
            <div className="hidden md:block relative">
              <img src={course.thumbnail} className={`w-full aspect-video object-cover ${course.isComingSoon || course.isStockOut ? 'grayscale brightness-[0.3]' : ''}`} alt="" />
              {(course.isComingSoon || course.isStockOut) && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center px-4">
                    <i className={`fas ${course.isStockOut ? 'fa-lock' : 'fa-hourglass-half'} ${course.isStockOut ? 'text-rose-500' : 'text-amber-500'} text-3xl mb-3 animate-bounce`}></i>
                    <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">{course.isStockOut ? 'LOCKED' : 'SYNCING'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 md:p-10 space-y-8 md:space-y-10">
              <div className="space-y-4">
                 <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Neural Advantages</h4>
                 <ul className="space-y-4 md:space-y-5">
                   {roadmapItems.map((item, i) => (
                     <li key={i} className="flex items-center text-[10px] md:text-[11px] font-bold text-slate-300">
                        <div className={`w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mr-4 shadow-sm shrink-0 ${course.isStockOut ? 'text-slate-700' : course.isComingSoon ? 'text-amber-500' : 'text-indigo-400'}`}>
                           <i className={`fas ${item.icon} text-[10px]`}></i>
                        </div>
                        <span className="leading-tight">{item.text}</span>
                     </li>
                   ))}
                 </ul>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800/50">
                 {course.isStockOut ? (
                   <div className="p-6 md:p-8 bg-rose-500/5 border border-rose-500/20 rounded-3xl text-center space-y-4">
                      <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Registry Saturated</p>
                      <button onClick={onBack} className="w-full py-3 bg-slate-950 border border-slate-800 rounded-xl text-[8px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-all">Explore Other Nodes</button>
                   </div>
                 ) : course.isComingSoon ? (
                   <div className="space-y-4">
                     {waitlistJoined ? (
                       <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-1.5 animate-in zoom-in duration-300">
                         <i className="fas fa-check-circle text-emerald-500 text-lg"></i>
                         <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Sequenced</p>
                       </div>
                     ) : (
                       <form onSubmit={handleWaitlist} className="space-y-4">
                         <div className="space-y-2">
                           <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">Identity Sync Gateway</label>
                           <input type="email" required placeholder="neural@eduworld.ct.ws" value={waitlistEmail} onChange={(e) => setWaitlistEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:border-amber-500 outline-none transition-all" />
                         </div>
                         <button type="submit" disabled={isProcessing} className="w-full py-4.5 rounded-xl font-black uppercase text-[10px] tracking-[0.25em] transition-all shadow-xl bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 disabled:opacity-50 flex items-center justify-center h-12">
                           {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : 'Request Notification'}
                         </button>
                       </form>
                     )}
                   </div>
                 ) : (
                   <div className="space-y-4">
                     <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Registration Fee</span>
                        <span className="text-lg font-black text-white">${(course.price || 0).toFixed(2)}</span>
                     </div>
                     <button onClick={() => setView('checkout')} disabled={isEnrolled} className={`w-full py-4.5 rounded-xl font-black uppercase text-[10px] tracking-[0.25em] transition-all shadow-xl h-12 ${isEnrolled ? 'bg-slate-950 text-slate-700 border border-slate-800 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20 active:scale-[0.98]'}`}>
                        {isEnrolled ? 'Identity Verified' : 'Initialize Access'}
                     </button>
                   </div>
                 )}
                 <p className="text-[8px] text-slate-700 font-bold uppercase text-center tracking-widest opacity-60">
                   {course.isStockOut ? 'Waiting for node rotation' : 'Secure Neural Transmission Guaranteed'}
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;
