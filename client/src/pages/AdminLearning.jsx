import React, { useState, useEffect } from 'react';
import { 
  Plus, Upload, Trash2, Edit, Users, BarChart3, 
  Settings, Save, X, Search, FileText, Video, 
  Globe, Layout, PieChart, Activity, UserCheck,
  CheckCircle2, AlertCircle, Loader2, Sparkles,
  Layers, Database, Cloud, Share2, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import { storage } from '../firebase';

const AdminLearning = () => {
  const [courses, setCourses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [tab, setTab] = useState('courses'); // 'courses' | 'analytics'

  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    category: 'Technical',
    difficulty: 'Intermediate',
    duration: '',
    thumbnail: '',
    assignedTo: 'all', // 'all', department name, or email
    resourceLinks: [],
    tags: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Courses
      const courseSnap = await getDocs(query(collection(db, 'courses'), orderBy('createdAt', 'desc')));
      const coursesData = courseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(coursesData);

      // Fetch Employee Progress for Analytics
      const progressSnap = await getDocs(collection(db, 'employeeProgress'));
      const progressData = progressSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnalytics(progressData);

      // Fetch Employees for assignment
      const empSnap = await getDocs(collection(db, 'employees'));
      const empData = empSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(empData);
    } catch (err) {
      console.error("Admin fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...courseForm,
        tags: courseForm.tags.split(',').map(t => t.trim()),
        updatedAt: serverTimestamp()
      };

      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), payload);
      } else {
        await addDoc(collection(db, 'courses'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }
      
      setShowModal(false);
      setEditingCourse(null);
      setCourseForm({
        title: '', description: '', category: 'Technical',
        difficulty: 'Intermediate', duration: '', thumbnail: '',
        assignedTo: 'all', resourceLinks: [], tags: ''
      });
      fetchData();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm("Permanently delete this learning protocol?")) return;
    try {
      await deleteDoc(doc(db, 'courses', id));
      fetchData();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const storageRef = ref(storage, `learning/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      null, 
      (error) => {
        console.error("Upload failed (Check CORS):", error);
        alert("Upload blocked by CORS policy. Please run the gsutil command provided to authorize localhost.");
        setUploading(false);
      }, 
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setCourseForm(prev => ({
          ...prev,
          resourceLinks: [...prev.resourceLinks, { 
            url: downloadURL, 
            name: file.name,
            type: file.type.includes('video') ? 'video' : 'doc' 
          }]
        }));
        setUploading(false);
      }
    );
  };

  const categories = ['AI', 'Web Development', 'Editing', 'Technical', 'Compliance', 'Soft Skills', 'Security', 'Management'];
  const difficulties = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  return (
    <div className="w-full space-y-4 pb-10 overflow-y-auto custom-scrollbar px-2 sm:px-4">
      {/* 1. ADMIN HEADER - COMPACT VERSION */}
      <section className="relative overflow-hidden rounded-[20px] md:rounded-[24px] bg-white border border-slate-100 shadow-xl p-4 md:p-6">
         <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[60px] pointer-events-none" />
         
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
             <div className="space-y-1">
                <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-slate-900/5 border border-slate-900/10 text-slate-900 text-[8px] font-black uppercase tracking-widest w-fit">
                   <Database size={10} className="text-amber-600" />
                   Knowledge Node
                </div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
                   Learning <span className="text-amber-500">Ops.</span>
                </h1>
             </div>

             <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 justify-center w-full sm:w-auto">
                   <button onClick={() => setTab('courses')} className={`flex-1 sm:flex-initial text-center px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'courses' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-900'}`}>
                      Registry
                   </button>
                   <button onClick={() => setTab('analytics')} className={`flex-1 sm:flex-initial text-center px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${tab === 'analytics' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-900'}`}>
                      Analytics
                   </button>
                </div>
                <button 
                   onClick={() => { setEditingCourse(null); setShowModal(true); }}
                   className="h-10 px-6 bg-amber-500 text-slate-900 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2 w-full sm:w-auto shrink-0"
                >
                   <Plus size={14} /> New Protocol
                </button>
             </div>
          </div>
       </section>

       {tab === 'courses' ? (
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* LEFT: COURSE LIST */}
            <div className="lg:col-span-8 space-y-4">
               <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                     <Layers size={14} className="text-slate-400" />
                     <h3 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Active Curriculum ({courses.length})</h3>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {courses.map((course) => (
                     <motion.div 
                       key={course.id}
                       initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                       className="bg-white p-4 rounded-[20px] md:rounded-[24px] border border-slate-100 shadow-md group hover:border-amber-500/20 transition-all"
                     >
                        <div className="flex items-start justify-between gap-3">
                           <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm shrink-0">
                              <img src={course.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&q=80'} className="w-full h-full object-cover" alt="" />
                           </div>
                           <div className="flex-1 min-w-0">
                              <h4 className="text-[11px] md:text-xs font-black text-slate-900 uppercase tracking-tight line-clamp-1">{course.title}</h4>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{course.category} • {course.difficulty}</p>
                           </div>
                           <div className="flex items-center gap-1.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingCourse(course); setCourseForm({...course, tags: course.tags.join(', ')}); setShowModal(true); }} className="w-7.5 h-7.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center border border-slate-100 shadow-inner">
                                  <Edit size={12} />
                              </button>
                              <button onClick={() => handleDeleteCourse(course.id)} className="w-7.5 h-7.5 rounded-lg bg-slate-50 text-rose-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center border border-slate-100 shadow-inner">
                                  <Trash2 size={12} />
                              </button>
                           </div>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between pt-3 border-t border-slate-50">
                           <div className="flex items-center gap-1.5 min-w-0">
                              <Users size={10} className="text-slate-300 shrink-0" />
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">
                                 <span className="text-slate-950">{course.assignedTo}</span>
                              </span>
                           </div>
                           <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest shrink-0">Live Node</span>
                        </div>
                     </motion.div>
                  ))}
               </div>
            </div>

            {/* RIGHT: QUICK ANALYTICS */}
            <div className="lg:col-span-4 space-y-4">
               <div className="glass-card !p-6 border-slate-100 rounded-[24px] md:rounded-[28px] bg-slate-900 text-white shadow-xl overflow-hidden relative">
                  <h3 className="text-xs font-black tracking-tighter uppercase italic leading-none mb-4 relative z-10">Pulse Metrics</h3>
                  
                  <div className="space-y-4 relative z-10">
                     <div className="flex items-center justify-between">
                        <div>
                           <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Avg Completion</p>
                           <h4 className="text-lg font-black tracking-tighter text-amber-500">78.4%</h4>
                        </div>
                        <PieChart size={24} className="text-amber-500/20" />
                     </div>
                     
                     <div className="space-y-3">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Activity Feed</p>
                        {[1,2].map(i => (
                          <div key={i} className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center">
                                <UserCheck size={10} className="text-emerald-400" />
                             </div>
                             <p className="text-[9px] font-bold truncate opacity-80">User Node {i} Sync Complete</p>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
         </div>
       ) : (
         /* ANALYTICS TAB CONTENT - COMPACT */
         <div className="bg-white rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-xl overflow-hidden p-4 md:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between mb-6">
               <div className="space-y-0.5">
                  <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Learning Insights</h2>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Performance metrics</p>
               </div>
               <button className="px-4 h-10 bg-slate-50 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-900 border border-slate-100 hover:bg-white transition-all flex items-center justify-center gap-2 w-fit">
                  <Share2 size={14} /> Export
               </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-8">
               <div className="p-5 md:p-6 rounded-[20px] md:rounded-[24px] bg-slate-50 border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Enrollments</p>
                  <h4 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter mt-1">{analytics.length}</h4>
               </div>
               <div className="p-5 md:p-6 rounded-[20px] md:rounded-[24px] bg-slate-50 border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Participation</p>
                  <h4 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter mt-1">92%</h4>
               </div>
               <div className="p-5 md:p-6 rounded-[20px] md:rounded-[24px] bg-amber-500 text-slate-900 shadow-lg">
                  <p className="text-[8px] font-black opacity-60 uppercase tracking-widest">Certificates</p>
                  <h4 className="text-xl md:text-2xl font-black tracking-tighter mt-1">24</h4>
               </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar -mx-4 md:-mx-6 px-4 md:px-6">
               <table className="w-full text-left min-w-[600px]">
                 <thead>
                    <tr className="border-b border-slate-50">
                       <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Employee</th>
                       <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol</th>
                       <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Progression</th>
                       <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {analytics.map((item) => {
                       const emp = employees.find(e => e.id === item.userId || e.email === item.userId);
                       const course = courses.find(c => c.id === item.courseId);
                       return (
                         <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="py-4">
                               <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-slate-900 overflow-hidden shrink-0">
                                     <img src={emp?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${emp?.name}`} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                     <p className="text-[11px] font-black text-slate-900 uppercase leading-none">{emp?.name || item.userId}</p>
                                  </div>
                                </div>
                            </td>
                            <td className="py-4">
                               <p className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[150px]">{course?.title || item.courseId}</p>
                            </td>
                            <td className="py-4">
                               <div className="flex items-center gap-3">
                                  <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                                     <div className="h-full bg-amber-500 rounded-full" style={{ width: `${item.progressPercentage}%` }} />
                                  </div>
                                  <span className="text-[10px] font-black text-slate-900">{item.progressPercentage}%</span>
                                </div>
                            </td>
                            <td className="py-4">
                               <span className={`px-2 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest ${item.progressPercentage === 100 ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-900'}`}>
                                  {item.progressPercentage === 100 ? 'CERTIFIED' : 'ACTIVE'}
                                </span>
                            </td>
                         </tr>
                       );
                    })}
                 </tbody>
               </table>
            </div>
         </div>
       )}

       {/* MODAL: CREATE/EDIT PROTOCOL */}
       <AnimatePresence>
         {showModal && (
           <div className="fixed inset-0 z-[250] flex items-center justify-center p-2 sm:p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" />
             
             <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-4xl bg-white rounded-[24px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10"
             >
                <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                   <div className="flex items-center gap-3">
                      <div className="w-9 h-9 md:w-10 md:h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-900 shrink-0">
                         <Plus size={18} className="md:size-[20px]" />
                      </div>
                      <div>
                         <h2 className="text-base md:text-xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{editingCourse ? 'Edit Protocol' : 'Deploy Protocol'}</h2>
                         <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Configuration Node</p>
                      </div>
                   </div>
                   <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-white hover:bg-slate-100 rounded-lg flex items-center justify-center transition-all border border-slate-100 shrink-0">
                      <X size={16} />
                   </button>
                </div>

                <form onSubmit={handleSaveCourse} className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-4">
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Protocol Title</label>
                            <input 
                              required type="text" placeholder="COURSE NAME"
                              value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})}
                              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-900 text-xs font-black focus:bg-white focus:border-amber-500/50 outline-none transition-all" 
                            />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                            <textarea 
                              required placeholder="OVERVIEW" rows={3}
                              value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})}
                              className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-900 text-xs font-medium focus:bg-white focus:border-amber-500/50 outline-none transition-all resize-none" 
                            />
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                               <select 
                                 value={courseForm.category} onChange={e => setCourseForm({...courseForm, category: e.target.value})}
                                 className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                               >
                                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                               </select>
                            </div>
                            <div className="space-y-1.5">
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Difficulty</label>
                               <select 
                                 value={courseForm.difficulty} onChange={e => setCourseForm({...courseForm, difficulty: e.target.value})}
                                 className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                               >
                                  {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
                               </select>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Thumbnail URL</label>
                            <input 
                              type="text" placeholder="IMAGE URL"
                              value={courseForm.thumbnail} onChange={e => setCourseForm({...courseForm, thumbnail: e.target.value})}
                              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-900 focus:bg-white outline-none" 
                            />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Assignment</label>
                            <select 
                              value={courseForm.assignedTo} onChange={e => setCourseForm({...courseForm, assignedTo: e.target.value})}
                              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                            >
                               <option value="all">Global Access</option>
                               <option value="Engineering">Engineering</option>
                               <option value="Management">Management</option>
                               <option value="Design">Creative Node</option>
                               <option value="AI Specialist">AI Specialist</option>
                               <option value="Web Developer">Web Developer</option>
                               <option value="Editor">Video Editor</option>
                            </select>
                         </div>
                         <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                            <div className="flex items-center justify-between">
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Protocol Resources (Cloud Assets)</p>
                               <div className="flex items-center gap-2">
                                  <label className="cursor-pointer h-7 px-3 bg-amber-500 text-slate-900 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2">
                                     {uploading ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
                                     {uploading ? 'Syncing...' : 'Upload File'}
                                     <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                  </label>
                               </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                               <input 
                                 type="text" placeholder="PASTE EXTERNAL URL"
                                 id="resUrl"
                                 className="flex-1 h-9 px-3 rounded-lg bg-white border border-slate-100 text-[9px] font-bold text-slate-900 focus:border-amber-500 outline-none transition-all"
                               />
                               <button 
                                 type="button"
                                 onClick={() => {
                                   const url = document.getElementById('resUrl').value;
                                   if (url) {
                                     setCourseForm({...courseForm, resourceLinks: [...courseForm.resourceLinks, { url, name: 'External Link', type: url.includes('youtube') || url.includes('vimeo') ? 'video' : 'doc' }]});
                                     document.getElementById('resUrl').value = '';
                                   }
                                 }}
                                 className="h-9 px-3 bg-slate-900 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-amber-500 transition-all"
                               >
                                 Link
                               </button>
                            </div>

                            <div className="space-y-2 max-h-[120px] overflow-y-auto custom-scrollbar pt-2">
                               {courseForm.resourceLinks.map((res, idx) => (
                                 <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                                    {res.type === 'video' ? <Video size={10} className="text-amber-500" /> : <FileText size={10} className="text-blue-500" />}
                                    <div className="flex-1 min-w-0">
                                       <p className="text-[9px] font-black text-slate-900 uppercase truncate">{res.name || 'External Asset'}</p>
                                       <p className="text-[7px] font-bold text-slate-400 truncate uppercase">{res.url}</p>
                                    </div>
                                    <X 
                                      size={12} 
                                      className="text-slate-300 hover:text-rose-500 cursor-pointer transition-colors" 
                                      onClick={() => setCourseForm({...courseForm, resourceLinks: courseForm.resourceLinks.filter((_, i) => i !== idx)})}
                                    />
                                 </div>
                               ))}
                               {courseForm.resourceLinks.length === 0 && (
                                 <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                                    <Cloud size={20} className="mx-auto text-slate-200 mb-1" />
                                    <p className="text-[8px] font-bold text-slate-300 uppercase">No assets deployed</p>
                                 </div>
                               )}
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="mt-6 md:mt-8 shrink-0">
                      <button 
                        type="submit" disabled={loading}
                        className="w-full h-12 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-amber-500 hover:text-slate-900 transition-all flex items-center justify-center gap-3"
                      >
                         {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
                         {editingCourse ? 'Commit Protocol' : 'Initialize Protocol'}
                      </button>
                   </div>
                </form>
             </motion.div>
           </div>
         )}
       </AnimatePresence>
    </div>
  );
};

export default AdminLearning;
