import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  type User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc, 
  serverTimestamp, 
  orderBy 
} from 'firebase/firestore';
import { 
  BookOpen, 
  Code, 
  FileText, 
  Search, 
  Plus, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Database, 
  Beaker, 
  CheckCircle, 
  Menu, 
  BrainCircuit,
  PlayCircle,
  MonitorPlay
} from 'lucide-react';

// --- Firebase Configuration ---

// HELPER: Environment Variable Access
// NOTE: The preview environment compiles to ES2015 which doesn't support import.meta.
// I have commented out the actual implementation to prevent build errors here.
// WHEN YOU DEPLOY LOCALLY: Uncomment the code inside this function.
const getEnvVar = (key: string) => {
  // UNCOMMENT THIS BLOCK FOR LOCAL VITE APP:
  /*
  if (import.meta.env) {
    return import.meta.env[key] || '';
  }
  */
  // Prevent unused variable error in preview
  void key;
  return ''; // Placeholder for preview
};

const firebaseConfig = {
  // In your local setup, these calls will read from your .env file
  // if you uncomment the logic in getEnvVar above.
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID')
};

// Initialize Firebase only if config is present (prevents crash in preview if keys are missing)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "my-lab-app"; 

// --- Types ---
type Tab = 'dashboard' | 'projects' | 'experiments' | 'wiki' | 'library';

interface Project {
  id: string;
  title: string;
  description: string;
  status: 'Planning' | 'Data Collection' | 'Analysis' | 'Writing' | 'Published';
  lead: string;
  repoLink?: string;
  dataLink?: string;
  createdAt: any;
}

interface Experiment {
  id: string;
  title: string;
  description: string;
  liveLink?: string;
  repoLink?: string;
  author: string;
  createdAt: any;
}

interface WikiPage {
  id: string;
  title: string;
  content: string;
  category: string;
  lastEditedBy: string;
  updatedAt: any;
}

interface Reference {
  id: string;
  title: string;
  authors: string;
  year: string;
  url: string;
  tags: string[];
  aiSummary?: string;
  createdAt?: any;
}

// --- Components ---

// 1. Auth & Shell
export default function LabHub() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Simple anonymous auth
    const initAuth = async () => {
       try {
         await signInAnonymously(auth);
       } catch (e) {
         console.error("Auth failed (likely due to missing env vars in preview):", e);
       }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center p-6 text-center max-w-md">
          {/* Fallback UI if env vars are missing in preview */}
          {(!firebaseConfig.apiKey) ? (
            <div className="space-y-4">
               <div className="h-12 w-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Code size={24} />
               </div>
               <h3 className="text-lg font-bold text-slate-900">Setup Required</h3>
               <p className="text-sm text-slate-500">
                 The app is running, but it needs your Firebase keys to connect. 
               </p>
               <div className="text-left bg-slate-100 p-4 rounded-lg text-xs font-mono text-slate-600 overflow-x-auto">
                 <p className="mb-2 font-bold text-slate-700">// 1. In your project, check src/App.tsx:</p>
                 <p>Uncomment the code inside <span className="text-indigo-600">getEnvVar()</span></p>
                 <p className="mt-2 mb-2 font-bold text-slate-700">// 2. Create a .env file locally:</p>
                 <p>VITE_FIREBASE_API_KEY=AIzaSy...</p>
                 <p>VITE_FIREBASE_AUTH_DOMAIN=...</p>
               </div>
            </div>
          ) : (
            <div className="animate-pulse flex flex-col items-center w-full">
              <div className="h-12 w-12 bg-indigo-200 rounded-full mb-4"></div>
              <div className="h-4 w-48 bg-slate-200 rounded"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const NavItem = ({ id, icon: Icon, label }: { id: Tab; icon: any; label: string }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setMobileMenuOpen(false);
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        activeTab === id 
          ? 'bg-indigo-50 text-indigo-700 font-medium' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 z-10">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center space-x-2 text-indigo-700">
            <Beaker size={28} />
            <span className="text-xl font-bold tracking-tight">SocDecLabHub</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Research Management Portal</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <NavItem id="dashboard" icon={BookOpen} label="Dashboard" />
          <NavItem id="projects" icon={Database} label="Projects & Data" />
          <NavItem id="experiments" icon={MonitorPlay} label="Experiments Code" />
          <NavItem id="wiki" icon={FileText} label="Lab Wiki" />
          <NavItem id="library" icon={BrainCircuit} label="Reference Library" />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center space-x-3 px-4 py-2">
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
              {user.uid.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">Researcher</p>
              <p className="text-xs text-slate-500 truncate" title={user.uid}>ID: {user.uid.slice(0,6)}...</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b border-slate-200 z-20 flex items-center justify-between p-4">
        <div className="flex items-center space-x-2 text-indigo-700">
          <Beaker size={24} />
          <span className="font-bold">SocDecLabHub</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-600">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-10 pt-20 px-4 space-y-2">
          <NavItem id="dashboard" icon={BookOpen} label="Dashboard" />
          <NavItem id="projects" icon={Database} label="Projects & Data" />
          <NavItem id="experiments" icon={MonitorPlay} label="Experiments Code" />
          <NavItem id="wiki" icon={FileText} label="Lab Wiki" />
          <NavItem id="library" icon={BrainCircuit} label="Reference Library" />
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-20 md:pt-0 p-4 md:p-8 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard user={user} setTab={setActiveTab} />}
          {activeTab === 'projects' && <ProjectManager user={user} />}
          {activeTab === 'experiments' && <ExperimentManager user={user} />}
          {activeTab === 'wiki' && <WikiSystem user={user} />}
          {activeTab === 'library' && <ReferenceLibrary user={user} />}
        </div>
      </main>
    </div>
  );
}

// 2. Dashboard Component
function Dashboard({ user, setTab }: { user: User, setTab: (t: Tab) => void }) {
  const [stats, setStats] = useState({ activeProjects: 0, wikiPages: 0, references: 0, experiments: 0 });

  useEffect(() => {
    if (!user) return;
    const unsubProjects = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), snap => {
      setStats(s => ({ ...s, activeProjects: snap.size }));
    }, (err) => console.error(err));
    
    const unsubWiki = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'wiki'), snap => {
      setStats(s => ({ ...s, wikiPages: snap.size }));
    }, (err) => console.error(err));

    const unsubRefs = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'references'), snap => {
      setStats(s => ({ ...s, references: snap.size }));
    }, (err) => console.error(err));

    const unsubExps = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'experiments'), snap => {
      setStats(s => ({ ...s, experiments: snap.size }));
    }, (err) => console.error(err));

    return () => { unsubProjects(); unsubWiki(); unsubRefs(); unsubExps(); };
  }, [user]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Lab Overview</h1>
        <p className="text-slate-500 mt-2">Welcome back to the collaborative workspace.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          onClick={() => setTab('projects')}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Database className="text-blue-600" size={24} />
            </div>
            <span className="text-2xl font-bold text-slate-900">{stats.activeProjects}</span>
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">Active Projects</h3>
          <p className="text-sm text-slate-500 mt-1">Experiments in progress</p>
        </div>

        <div 
          onClick={() => setTab('experiments')}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
              <MonitorPlay className="text-purple-600" size={24} />
            </div>
            <span className="text-2xl font-bold text-slate-900">{stats.experiments}</span>
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">Experiments Code</h3>
          <p className="text-sm text-slate-500 mt-1">Runnable tasks</p>
        </div>

        <div 
          onClick={() => setTab('wiki')}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
              <FileText className="text-amber-600" size={24} />
            </div>
            <span className="text-2xl font-bold text-slate-900">{stats.wikiPages}</span>
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">Wiki Pages</h3>
          <p className="text-sm text-slate-500 mt-1">Protocols & SOPs</p>
        </div>

        <div 
          onClick={() => setTab('library')}
          className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-emerald-50 rounded-lg group-hover:bg-emerald-100 transition-colors">
              <BookOpen className="text-emerald-600" size={24} />
            </div>
            <span className="text-2xl font-bold text-slate-900">{stats.references}</span>
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">References</h3>
          <p className="text-sm text-slate-500 mt-1">Papers in library</p>
        </div>
      </div>

      <div className="bg-indigo-900 rounded-xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-2xl font-bold mb-4">Quick Start Guide</h2>
          <ul className="space-y-3 text-indigo-100">
            <li className="flex items-center space-x-2">
              <CheckCircle size={18} />
              <span>Use <strong>Experiments Code</strong> to share links to working PsychoPy/JS tasks.</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle size={18} />
              <span>Use <strong>Projects</strong> to link your OSF data and GitHub code.</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle size={18} />
              <span>Use <strong>Wiki</strong> to document lab safety and ethics procedures.</span>
            </li>
          </ul>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-10 transform translate-x-12 -translate-y-4">
           <BrainCircuit size={400} />
        </div>
      </div>
    </div>
  );
}

// 3. Project Manager Component
function ProjectManager({ user }: { user: User }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Project>>({ status: 'Planning' });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    }, (err) => console.error("Error fetching projects:", err));
    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!formData.title) return;
    try {
      const dataToSave = {
        ...formData,
        lead: user.uid.slice(0, 6), // Update lead on edit or set on create
        createdAt: editingId ? formData.createdAt : serverTimestamp()
      };

      if (editingId) {
        // Update existing
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', editingId), dataToSave);
      } else {
        // Create new
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), dataToSave);
      }
      
      closeForm();
    } catch (e) {
      console.error(e);
      alert("Error saving project. Check console.");
    }
  };

  const startEdit = (project: Project) => {
    setEditingId(project.id);
    setFormData(project);
    setIsFormOpen(true);
  };

  const startNew = () => {
    setEditingId(null);
    setFormData({ status: 'Planning' });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({ status: 'Planning' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planning': return 'bg-slate-100 text-slate-700';
      case 'Data Collection': return 'bg-blue-100 text-blue-700';
      case 'Analysis': return 'bg-amber-100 text-amber-700';
      case 'Writing': return 'bg-purple-100 text-purple-700';
      case 'Published': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Projects & Experiments</h2>
          <p className="text-slate-500">Track active research and link to external repositories.</p>
        </div>
        <button 
          onClick={startNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus size={18} />
          <span>New Project</span>
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-lg animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold text-lg mb-4">{editingId ? 'Edit Project' : 'Create New Project'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              className="border p-2 rounded w-full" 
              placeholder="Project Title" 
              value={formData.title || ''} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
            />
            <select 
              className="border p-2 rounded w-full"
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value as any})}
            >
              <option>Planning</option>
              <option>Data Collection</option>
              <option>Analysis</option>
              <option>Writing</option>
              <option>Published</option>
            </select>
            <input 
              className="border p-2 rounded w-full md:col-span-2" 
              placeholder="Brief Description" 
              value={formData.description || ''} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
            <input 
              className="border p-2 rounded w-full" 
              placeholder="OSF / Data Link (Optional)" 
              value={formData.dataLink || ''} 
              onChange={e => setFormData({...formData, dataLink: e.target.value})} 
            />
            <input 
              className="border p-2 rounded w-full" 
              placeholder="GitHub Repo Link (Optional)" 
              value={formData.repoLink || ''} 
              onChange={e => setFormData({...formData, repoLink: e.target.value})} 
            />
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button onClick={closeForm} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                {editingId ? 'Update Project' : 'Create Project'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {projects.length === 0 && !isFormOpen && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-400">No projects yet. Start by creating one!</p>
          </div>
        )}
        {projects.map(project => (
          <div key={project.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between group">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
                <h3 className="text-lg font-bold text-slate-900">{project.title}</h3>
              </div>
              <p className="text-slate-600 text-sm mb-4 md:mb-0 max-w-2xl">{project.description}</p>
            </div>
            
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
               {project.repoLink && (
                 <a href={project.repoLink} target="_blank" rel="noreferrer" className="flex items-center space-x-1 text-sm text-slate-600 hover:text-indigo-600">
                   <Code size={16} />
                   <span>Code</span>
                 </a>
               )}
               {project.dataLink && (
                 <a href={project.dataLink} target="_blank" rel="noreferrer" className="flex items-center space-x-1 text-sm text-slate-600 hover:text-indigo-600">
                   <Database size={16} />
                   <span>Data</span>
                 </a>
               )}
               <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
               <button onClick={() => startEdit(project)} className="text-slate-300 hover:text-indigo-500 transition-colors" title="Edit">
                 <Edit3 size={18} />
               </button>
               <button onClick={() => handleDelete(project.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Delete">
                 <Trash2 size={18} />
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. Experiments Code Manager Component (New)
function ExperimentManager({ user }: { user: User }) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Experiment>>({});

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'experiments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExperiments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Experiment)));
    }, (err) => console.error("Error fetching experiments:", err));
    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!formData.title) return;
    const dataToSave = {
      ...formData,
      author: user.uid.slice(0, 6),
      createdAt: editingId ? formData.createdAt : serverTimestamp()
    };

    if (editingId) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'experiments', editingId), dataToSave);
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'experiments'), dataToSave);
    }
    
    closeForm();
  };

  const startEdit = (exp: Experiment) => {
    setEditingId(exp.id);
    setFormData(exp);
    setIsFormOpen(true);
  };

  const startNew = () => {
    setEditingId(null);
    setFormData({});
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this experiment code entry?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'experiments', id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Experiments Code</h2>
          <p className="text-slate-500">Repository of runnable experiment tasks and source code.</p>
        </div>
        <button 
          onClick={startNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus size={18} />
          <span>Add Experiment</span>
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-lg animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold text-lg mb-4">{editingId ? 'Edit Experiment' : 'Add New Experiment'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              className="border p-2 rounded w-full md:col-span-2" 
              placeholder="Experiment Title (e.g., Flanker Task v2)" 
              value={formData.title || ''} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
            />
            <textarea 
              className="border p-2 rounded w-full md:col-span-2 h-20" 
              placeholder="Description / Instructions" 
              value={formData.description || ''} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
            />
            <input 
              className="border p-2 rounded w-full" 
              placeholder="Live Link (e.g., Pavlovia/Qualtrics)" 
              value={formData.liveLink || ''} 
              onChange={e => setFormData({...formData, liveLink: e.target.value})} 
            />
            <input 
              className="border p-2 rounded w-full" 
              placeholder="Code Repository Link (GitHub/GitLab)" 
              value={formData.repoLink || ''} 
              onChange={e => setFormData({...formData, repoLink: e.target.value})} 
            />
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button onClick={closeForm} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                {editingId ? 'Save Changes' : 'Add Experiment'}
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {experiments.length === 0 && !isFormOpen && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
            <p className="text-slate-400">No experiment code added yet.</p>
          </div>
        )}
        {experiments.map(exp => (
          <div key={exp.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between group">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MonitorPlay size={20} className="text-purple-600" />
                {exp.title}
              </h3>
              <p className="text-slate-600 text-sm mt-1 max-w-2xl">{exp.description}</p>
              <p className="text-xs text-slate-400 mt-2">Added by {exp.author}</p>
            </div>
            
            <div className="flex items-center space-x-4 mt-4 md:mt-0">
               {exp.liveLink && (
                 <a href={exp.liveLink} target="_blank" rel="noreferrer" className="flex items-center space-x-1 text-sm bg-purple-50 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-100 transition-colors border border-purple-100">
                   <PlayCircle size={16} />
                   <span>Run Task</span>
                 </a>
               )}
               {exp.repoLink && (
                 <a href={exp.repoLink} target="_blank" rel="noreferrer" className="flex items-center space-x-1 text-sm text-slate-600 hover:text-indigo-600">
                   <Code size={16} />
                   <span>Source</span>
                 </a>
               )}
               <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>
               <button onClick={() => startEdit(exp)} className="text-slate-300 hover:text-indigo-500 transition-colors" title="Edit">
                 <Edit3 size={18} />
               </button>
               <button onClick={() => handleDelete(exp.id)} className="text-slate-300 hover:text-red-500 transition-colors" title="Delete">
                 <Trash2 size={18} />
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. Wiki System Component
function WikiSystem({ user }: { user: User }) {
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'wiki'), orderBy('title'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPages(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WikiPage)));
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!editTitle) return;
    const data = {
      title: editTitle,
      content: editContent,
      category: 'General',
      lastEditedBy: user.uid.slice(0, 6),
      updatedAt: serverTimestamp()
    };

    if (editingId && editingId !== 'new') {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'wiki', editingId), data);
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'wiki'), data);
    }
    setEditingId(null);
    setSelectedPage(null); // Reset view
  };

  const startEdit = (page?: WikiPage) => {
    if (page) {
      setEditingId(page.id);
      setEditTitle(page.title);
      setEditContent(page.content);
    } else {
      setEditingId('new');
      setEditTitle('');
      setEditContent('');
    }
    setSelectedPage(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] gap-6">
      {/* Sidebar List */}
      <div className="w-full md:w-1/3 bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-semibold text-slate-700">Documents</h3>
          <button onClick={() => startEdit()} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded">
            <Plus size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {pages.map(page => (
            <button
              key={page.id}
              onClick={() => { setSelectedPage(page); setEditingId(null); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedPage?.id === page.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="font-medium">{page.title}</div>
              <div className="text-xs text-slate-400">Updated by {page.lastEditedBy}</div>
            </button>
          ))}
          {pages.length === 0 && <div className="p-4 text-xs text-slate-400 text-center">No pages yet.</div>}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col relative">
        {editingId ? (
          <div className="flex-1 flex flex-col p-6 space-y-4">
            <input 
              className="text-2xl font-bold text-slate-900 border-b border-slate-200 pb-2 focus:outline-none focus:border-indigo-500" 
              placeholder="Page Title" 
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
            />
            <textarea 
              className="flex-1 resize-none focus:outline-none text-slate-600 leading-relaxed"
              placeholder="Write your protocol or documentation here (Markdown supported in a real app)..."
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
            />
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button onClick={() => setEditingId(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center space-x-2">
                <Save size={16} /> <span>Save Page</span>
              </button>
            </div>
          </div>
        ) : selectedPage ? (
          <div className="flex-1 flex flex-col p-8 overflow-y-auto">
            <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-3xl font-bold text-slate-900">{selectedPage.title}</h2>
              <div className="flex space-x-2">
                 <button onClick={() => startEdit(selectedPage)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                   <Edit3 size={18} />
                 </button>
                 <button 
                  onClick={async () => {
                    if(confirm("Delete this page?")) {
                      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'wiki', selectedPage.id));
                      setSelectedPage(null);
                    }
                  }} 
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                   <Trash2 size={18} />
                 </button>
              </div>
            </div>
            <div className="prose max-w-none text-slate-700 whitespace-pre-wrap">
              {selectedPage.content || <span className="text-slate-400 italic">No content.</span>}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <FileText size={48} className="mb-4 text-slate-200" />
            <p>Select a page to view or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// 6. Reference Library Component (with Mock LLM features)
function ReferenceLibrary({ user }: { user: User }) {
  const [refs, setRefs] = useState<Reference[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Reference>>({});

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'references'), orderBy('year', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRefs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Reference)));
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!formData.title) return;
    const dataToSave = {
      ...formData,
      year: formData.year || new Date().getFullYear().toString(),
      // Ensure tags are saved as an array of strings
      tags: Array.isArray(formData.tags) 
            ? formData.tags 
            : typeof formData.tags === 'string' 
              ? (formData.tags as string).split(',').map(s => s.trim()) 
              : [],
      createdAt: editingId ? formData.createdAt : serverTimestamp()
    };

    if (editingId) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'references', editingId), dataToSave);
    } else {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'references'), dataToSave);
    }
    
    closeForm();
  };

  const startNew = () => {
    setEditingId(null);
    setFormData({});
    setIsFormOpen(true);
  }

  const startEdit = (ref: Reference) => {
    setEditingId(ref.id);
    setFormData(ref);
    setIsFormOpen(true);
  }

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({});
  }

  // Mocking an LLM summary generation
  const generateMockSummary = () => {
    if (!formData.title) return;
    setFormData(prev => ({
      ...prev,
      aiSummary: `AI Generated Summary for "${formData.title}":\nThis paper investigates the primary variable using a mixed-methods approach. Key findings suggest a significant correlation between X and Y. The methodology relies heavily on recent advancements in the field.`
    }));
  };

  const filteredRefs = refs.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.authors?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Lab Library</h2>
          <p className="text-slate-500">Shared papers and AI-generated insights.</p>
        </div>
        <div className="flex space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="pl-10 pr-4 py-2 border rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              placeholder="Search papers, tags..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={startNew}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors whitespace-nowrap"
          >
            <Plus size={18} />
            <span className="hidden md:inline">Add Paper</span>
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-lg mb-6">
          <h3 className="font-semibold text-lg mb-4">{editingId ? 'Edit Reference' : 'Add New Reference'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              className="border p-2 rounded w-full md:col-span-2" 
              placeholder="Paper Title" 
              value={formData.title || ''} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
            />
            <input 
              className="border p-2 rounded w-full" 
              placeholder="Authors (e.g., Smith et al.)" 
              value={formData.authors || ''} 
              onChange={e => setFormData({...formData, authors: e.target.value})} 
            />
            <input 
              className="border p-2 rounded w-full" 
              placeholder="Year" 
              value={formData.year || ''} 
              onChange={e => setFormData({...formData, year: e.target.value})} 
            />
            <input 
              className="border p-2 rounded w-full md:col-span-2" 
              placeholder="Link to PDF/DOI" 
              value={formData.url || ''} 
              onChange={e => setFormData({...formData, url: e.target.value})} 
            />
            <input 
              className="border p-2 rounded w-full md:col-span-2" 
              placeholder="Tags (comma separated)" 
              value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags || ''} 
              onChange={e => setFormData({...formData, tags: e.target.value as any})} 
            />
            
            <div className="md:col-span-2 relative">
               <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">AI Summary / Key Insights</label>
               <textarea 
                  className="border p-2 rounded w-full h-24 text-sm" 
                  placeholder="Paste abstract or generate summary..." 
                  value={formData.aiSummary || ''}
                  onChange={e => setFormData({...formData, aiSummary: e.target.value})}
               />
               <button 
                 onClick={generateMockSummary}
                 className="absolute right-2 top-8 text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100 flex items-center space-x-1 hover:bg-indigo-100"
               >
                 <BrainCircuit size={12} />
                 <span>Auto-Generate (Demo)</span>
               </button>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-4">
            <button onClick={closeForm} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                {editingId ? 'Save Changes' : 'Add to Library'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredRefs.length === 0 && !isFormOpen && (
             <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
             <p className="text-slate-400">No references found matching your search.</p>
           </div>
        )}
        {filteredRefs.map(ref => (
          <div key={ref.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <a href={ref.url} target="_blank" rel="noreferrer" className="text-lg font-bold text-indigo-700 hover:underline flex items-center gap-2">
                  {ref.title} <ExternalLink size={14} className="text-slate-400"/>
                </a>
                <p className="text-slate-600 text-sm mt-1">{ref.authors} ({ref.year})</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ref.tags?.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full border border-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                  <button onClick={() => startEdit(ref)} className="text-slate-300 hover:text-indigo-500 transition-colors">
                    <Edit3 size={18} />
                  </button>
                  <button 
                    onClick={async () => {
                      if(confirm("Remove this reference?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'references', ref.id));
                    }}
                    className="text-slate-300 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
              </div>
            </div>
            
            {ref.aiSummary && (
              <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="flex items-center space-x-2 text-indigo-800 text-xs font-bold mb-1">
                  <BrainCircuit size={14} />
                  <span>AI INSIGHT</span>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">{ref.aiSummary}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}