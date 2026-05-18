import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Play, FileText, CheckCircle2, Clock, 
  Search, Filter, ChevronRight, Award, Flame,
  TrendingUp, Star, LayoutGrid, List, Sparkles,
  ArrowRight, Download, ExternalLink, GraduationCap, Globe, AlertCircle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  getDocs,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';

const Learning = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [myProgress, setMyProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Categories
  const categories = ['All', 'AI', 'Web Development', 'Editing', 'Technical', 'Compliance', 'Soft Skills', 'Security', 'Management'];

  useEffect(() => {
    if (!user) return;

    // 1. Fetch Assigned Courses
    const coursesQuery = query(collection(db, 'courses'));
    const unsubscribeCourses = onSnapshot(coursesQuery, (snapshot) => {
      const allCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter by assignment
      const assigned = allCourses.filter(course => {
        if (course.assignedTo === 'all') return true;
        
        const userRole = user.role?.toLowerCase();
        const assignment = course.assignedTo?.toLowerCase();
        
        // Match by Role or Department
        if (assignment === userRole) return true;
        if (assignment === user.department?.toLowerCase()) return true;
        
        // Match by specific Email if it's an array
        if (Array.isArray(course.assignedTo)) {
          return course.assignedTo.includes(user.email) || course.assignedTo.includes(user.department);
        }
        
        return false;
      });
      
      setCourses(assigned);
      setLoading(false);
    });

    // 2. Fetch My Progress
    const progressRef = collection(db, 'employeeProgress');
    const unsubscribeProgress = onSnapshot(query(progressRef, where('userId', '==', user.uid || user.email)), (snapshot) => {
      const progressMap = {};
      snapshot.docs.forEach(doc => {
        progressMap[doc.data().courseId] = doc.data();
      });
      setMyProgress(progressMap);
    });

    return () => {
      unsubscribeCourses();
      unsubscribeProgress();
    };
  }, [user]);

  const handleUpdateProgress = async (courseId, lessonId) => {
    const progressId = `${user.uid || user.email}_${courseId}`;
    const docRef = doc(db, 'employeeProgress', progressId);
    
    const current = myProgress[courseId] || { completedLessons: [], progressPercentage: 0 };
    if (!current.completedLessons.includes(lessonId)) {
      const newList = [...current.completedLessons, lessonId];
      // Simple calculation for demo
      const percentage = Math.min(100, Math.round((newList.length / 5) * 100)); 
      
      await setDoc(docRef, {
        userId: user.uid || user.email,
        courseId,
        completedLessons: newList,
        progressPercentage: percentage,
        lastAccessed: serverTimestamp()
      }, { merge: true });
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || course.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = [
    { label: 'Courses Active', value: courses.length, icon: BookOpen, color: 'text-blue-500' },
    { label: 'Completed', value: Object.values(myProgress).filter(p => p.progressPercentage === 100).length, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Certificates', value: 0, icon: Award, color: 'text-amber-500' },
    { label: 'Learning Streak', value: '5 Days', icon: Flame, color: 'text-rose-500' },
  ];

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Initializing Knowledge Base...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 md:space-y-8 pb-20 px-2 sm:px-4">
      {/* 1. HERO HEADER */}
      <section className="relative overflow-hidden rounded-[24px] md:rounded-[40px] bg-slate-900 min-h-[220px] md:min-h-[300px] flex items-center p-6 md:p-16 group">
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10 w-full md:w-2/3 space-y-4 md:space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 md:space-y-4">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                <Sparkles size={11} />
                Knowledge Accelerator
             </div>
             <h1 className="text-2xl md:text-6xl font-black text-white tracking-tighter leading-none italic uppercase">
                Master Your <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Expertise.</span>
             </h1>
             <p className="text-slate-400 text-xs md:text-lg max-w-xl font-medium leading-relaxed">
                Access your personalized training protocols and advance through the NexovTech engineering tiers.
              </p>
          </motion.div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 md:pt-4">
             <div className="relative flex-1 max-w-md w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Search protocols..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 md:h-14 pl-11 pr-5 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 text-white text-xs md:text-sm outline-none focus:bg-white/10 focus:border-amber-500/50 transition-all"
                />
             </div>
             <button className="h-11 md:h-14 px-6 md:px-8 bg-amber-500 text-slate-900 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-amber-400 transition-all flex items-center justify-center gap-2.5">
                <TrendingUp size={15} /> Continue Learning
             </button>
          </div>
        </div>

        <div className="hidden lg:block absolute right-16 top-1/2 -translate-y-1/2">
           <div className="relative">
              <div className="w-64 h-64 rounded-full bg-amber-500 blur-[80px] opacity-20 animate-pulse" />
              <GraduationCap size={180} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/5 rotate-12" />
           </div>
        </div>
      </section>

      {/* 2. STATS OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-4 md:p-6 rounded-[20px] md:rounded-[32px] bg-white border border-slate-100 shadow-lg flex items-center gap-3 md:gap-4 group hover:border-amber-500/20 transition-all"
          >
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-center ${stat.color} group-hover:scale-110 transition-transform shrink-0`}>
               <stat.icon size={20} className="md:size-[24px]" />
            </div>
            <div className="min-w-0">
               <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{stat.label}</p>
               <h4 className="text-base md:text-xl font-black text-slate-900 tracking-tighter uppercase leading-none mt-0.5 md:mt-1">{stat.value}</h4>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 3. CATEGORY FILTER */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar px-1 shrink-0">
        {categories.map(cat => (
          <button 
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2.5 rounded-xl font-black text-[9px] md:text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100 hover:text-slate-900'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 4. COURSE GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        <AnimatePresence mode="popLayout">
          {filteredCourses.map((course, i) => {
            const progress = myProgress[course.id]?.progressPercentage || 0;
            return (
              <motion.div 
                layout
                key={course.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                onClick={() => setSelectedCourse(course)}
                className="group cursor-pointer h-full"
              >
                <div className="bg-white rounded-[20px] md:rounded-[32px] overflow-hidden border border-slate-100 shadow-md hover:shadow-xl transition-all h-full flex flex-col">
                   <div className="relative h-40 md:h-48 overflow-hidden bg-slate-150">
                      <img 
                        src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                        alt={course.title}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-md text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-900 shadow-sm">
                        {course.category}
                      </div>
                      <div className={`absolute top-3 right-3 px-1.5 py-0.5 rounded-md text-[6px] md:text-[7px] font-black uppercase tracking-widest shadow-sm ${course.difficulty === 'Expert' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-900'}`}>
                        {course.difficulty}
                      </div>
                   </div>

                   <div className="p-4 md:p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                         <h3 className="text-sm md:text-lg font-black text-slate-900 tracking-tighter uppercase leading-tight line-clamp-2 group-hover:text-amber-600 transition-colors">
                            {course.title}
                         </h3>
                         <div className="flex items-center gap-3 mt-2 md:mt-3">
                            <div className="flex items-center gap-1 text-slate-400">
                               <Clock size={11} />
                               <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest">{course.duration || '2.5 hrs'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-400">
                               <BookOpen size={11} />
                               <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest">5 Lessons</span>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-slate-50">
                         <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                            <span className="text-[9px] font-black text-slate-900 tracking-tighter">{progress}%</span>
                         </div>
                         <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${progress}%` }}
                               className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            />
                         </div>
                      </div>
                   </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 5. COURSE VIEWER MODAL */}
      <AnimatePresence>
        {selectedCourse && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-2 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedCourse(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[24px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col lg:flex-row max-h-[92vh] z-10"
            >
               {/* Sidebar/Outline */}
               <div className="w-full lg:w-80 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-100 flex flex-col shrink-0 max-h-[220px] lg:max-h-none">
                  <div className="p-4 md:p-6 border-b border-slate-100 bg-white shrink-0">
                     <h3 className="text-[8px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Learning Track</h3>
                     <h2 className="text-sm md:text-lg font-black text-slate-900 tracking-tighter uppercase leading-tight line-clamp-1 italic">{selectedCourse.title}</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 custom-scrollbar">
                     {[1,2,3,4,5].map((lesson, idx) => {
                       const isCompleted = myProgress[selectedCourse.id]?.completedLessons?.includes(`L-${idx}`);
                       return (
                         <button 
                           key={idx}
                           onClick={() => handleUpdateProgress(selectedCourse.id, `L-${idx}`)}
                           className={`w-full p-3 md:p-4 rounded-xl md:rounded-2xl flex items-center justify-between group transition-all text-left ${isCompleted ? 'bg-emerald-50 border border-emerald-100' : 'bg-white border border-slate-100 hover:border-amber-500/30'}`}
                         >
                            <div className="flex items-center gap-2 md:gap-3 min-w-0">
                               <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-[9px] md:text-[10px] font-black shrink-0 ${isCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                  {idx + 1}
                               </div>
                               <span className={`text-[10px] md:text-[11px] font-bold uppercase tracking-tight truncate ${isCompleted ? 'text-emerald-700 font-black' : 'text-slate-600'}`}>Module {idx + 1}</span>
                            </div>
                            {isCompleted && <CheckCircle2 size={13} className="text-emerald-500 shrink-0 ml-2" />}
                         </button>
                       );
                     })}
                  </div>
               </div>

               {/* Content Area */}
               <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                  <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 shrink-0">
                     <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-widest">Active Node</span>
                        <h4 className="text-[9px] md:text-[11px] font-black text-slate-900 uppercase tracking-widest hidden sm:block">Video Instruction</h4>
                     </div>
                     <button onClick={() => setSelectedCourse(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-all">
                        <X size={18} className="text-slate-400" />
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar space-y-6 md:space-y-8">
                     <div className="aspect-video w-full rounded-2xl md:rounded-3xl bg-slate-900 overflow-hidden shadow-xl relative group shrink-0">
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="w-14 h-14 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform cursor-pointer">
                              <Play size={24} className="text-slate-900 ml-1 md:size-[32px]" />
                           </div>
                        </div>
                        <img src={selectedCourse.thumbnail} className="w-full h-full object-cover opacity-40" alt="" />
                     </div>

                     <div className="space-y-4 md:space-y-6 max-w-3xl">
                        <div className="space-y-2">
                           <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Resource Documentation</h2>
                           <p className="text-slate-500 text-xs md:text-base font-medium leading-relaxed">
                              {selectedCourse.description || "This specialized module covers the core protocols required for operational excellence. Ensure you review all attached documentation before proceeding to the final assessment."}
                           </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {selectedCourse.resourceLinks?.map((res, idx) => (
                             <a 
                               key={idx}
                               href={res.url} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between group hover:border-amber-500/30 transition-all cursor-pointer min-w-0"
                             >
                                 <div className="flex items-center gap-2.5 min-w-0">
                                    {res.type === 'video' ? <Play className="text-amber-500 shrink-0" size={16} /> : <FileText className="text-blue-500 shrink-0" size={16} />}
                                    <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-slate-900 truncate max-w-[150px] md:max-w-[200px]">{res.name || res.url.split('/').pop() || 'Resource Node'}</span>
                                 </div>
                                 <ExternalLink size={14} className="text-slate-300 group-hover:text-amber-500 transition-colors shrink-0" />
                             </a>
                           ))}
                           {(!selectedCourse.resourceLinks || selectedCourse.resourceLinks.length === 0) && (
                             <div className="col-span-full py-6 md:py-8 rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
                                <AlertCircle size={20} className="mb-1" />
                                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">No additional resources attached</p>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>

                  <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                     <div className="flex items-center gap-2">
                        <Flame size={15} className="text-amber-500" />
                        <span className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest text-center sm:text-left">Recommended Tier 2 specialization after completion.</span>
                     </div>
                     <button className="w-full sm:w-auto px-6 md:px-10 h-11 md:h-14 bg-slate-900 text-white rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-amber-500 transition-all shrink-0">
                        Finalize Session
                     </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Learning;
