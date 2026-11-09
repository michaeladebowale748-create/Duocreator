import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Canvas } from 'fabric';
import {
  ArrowDownToLine, ArrowLeftRight, Check, ChevronDown, ChevronRight, ClipboardPaste, Cloud, Command, Copy,
  Crop, Eye, EyeOff, FileImage, FileJson2, FileText, FolderOpen, Frame, Grid2X2, ImagePlus, Layers3, LockKeyhole, LogOut, Moon, Sun,
  Plus, Search, Settings2, Shapes, Sparkles, Type, Undo2, Redo2, Upload, ZoomIn, ZoomOut,
} from 'lucide-react';
import { EditorCanvas } from './components/EditorCanvas';
import { Inspector } from './components/Inspector';
import { presets, type SizePreset } from './presets';
import { figmaPayloadToArtboard, formatBytes, parseFigmaClipboard } from './lib/figmaPaste';
import { importImage, importPdf, importSvg } from './lib/imports';
import { exportArtboard } from './lib/exports';
import { findLayoutIssues, resizeArtboard } from './lib/resize';
import { loadLatestProject, saveProject } from './lib/projectStore';
import { supabase, supabaseConfigured } from './lib/supabase';
import type { Artboard, DesignObject, DesignProject } from './types';

const STORAGE_KEY = 'duocreator.projects.v1';
const AUTH_HERO_IMAGES = [
  '/brand-imagery/duocreator-soft-grade-01.webp',
  '/brand-imagery/duocreator-soft-grade-02.webp',
  '/brand-imagery/duocreator-soft-grade-03.webp',
  '/brand-imagery/duocreator-soft-grade-04.webp',
  '/brand-imagery/duocreator-soft-grade-05.webp',
  '/brand-imagery/duocreator-soft-grade-06.webp',
];

function demoProject(): DesignProject {
  const master: Artboard = {
    id: 'master', name: 'Instagram post', width: 1080, height: 1350, category: 'Social', isMaster: true, source: 'native',
    objects: [
      { id: 'bg', name: 'Soft paper background', type: 'rect', x: 0, y: 0, width: 1080, height: 1350, fill: '#eff0e8', locked: true },
      { id: 'orb', name: 'Tangerine form', type: 'ellipse', x: 700, y: 135, width: 300, height: 300, fill: '#de7855' },
      { id: 'label', name: 'Series label', type: 'text', x: 82, y: 82, width: 460, height: 50, fill: '#343a32', text: 'DUOCREATOR STUDIO  /  FIELD NOTES', fontFamily: 'Inter', fontSize: 22, fontWeight: '600' },
      { id: 'headline', name: 'Campaign headline', type: 'text', x: 80, y: 355, width: 790, height: 345, fill: '#191919', text: 'Good things\ntake shape.', fontFamily: 'Georgia', fontSize: 118, fontWeight: '700' },
      { id: 'stamp', name: 'Edition stamp pill', type: 'rect', x: 80, y: 1065, width: 235, height: 136, fill: '#191919' },
      { id: 'stamp-text', name: 'Edition details', type: 'text', x: 105, y: 1088, width: 190, height: 92, fill: '#ffffff', text: '01 / 06\nResize with intention', fontFamily: 'Inter', fontSize: 20, fontWeight: '500' },
      { id: 'line', name: 'Footer rule', type: 'line', x: 360, y: 1130, width: 530, height: 0, fill: '#343a32', stroke: '#343a32', strokeWidth: 2 },
      { id: 'footer', name: 'Footer text', type: 'text', x: 360, y: 1153, width: 510, height: 40, fill: '#343a32', text: 'ONE IDEA. EVERY FORMAT.', fontFamily: 'Inter', fontSize: 18, fontWeight: '600' },
    ],
  };
  return { id: 'project-field-notes', name: 'Field Notes — Spring launch', updatedAt: new Date().toISOString(), artboards: [master] };
}

function loadProject(): DesignProject {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return demoProject();
    const project = JSON.parse(stored) as DesignProject;
    const sampleMaster = project.artboards.find((board) => board.id === 'master' && board.isMaster);
    if (project.id === 'project-field-notes' && sampleMaster?.width === 1080 && sampleMaster.height === 1080) {
      const verticalScale = 1350 / sampleMaster.height;
      return {
        ...project,
        updatedAt: new Date().toISOString(),
        artboards: project.artboards.map((board) => board.id !== 'master' ? board : {
          ...board,
          height: 1350,
          objects: board.objects.map((object) => object.id === 'bg'
            ? { ...object, height: 1350 }
            : { ...object, y: Math.round(object.y * verticalScale) }),
        }),
      };
    }
    return project;
  } catch { return demoProject(); }
}

export default function App() {
  const [project, setProject] = useState<DesignProject>(loadProject);
  const [activeId, setActiveId] = useState(project.artboards[0]?.id ?? '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [customName, setCustomName] = useState('Custom size');
  const [customWidth, setCustomWidth] = useState(1200);
  const [customHeight, setCustomHeight] = useState(1200);
  const [zoom, setZoom] = useState(.39);
  const [showSafe, setShowSafe] = useState(false);
  const [canvaMessage, setCanvaMessage] = useState(false);
  const [toast, setToast] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [savedAt, setSavedAt] = useState('Saved');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('duocreator.theme') === 'dark' ? 'dark' : 'light');
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [authHeroSlide, setAuthHeroSlide] = useState(0);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authPasswordVisible, setAuthPasswordVisible] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [cloudLoaded, setCloudLoaded] = useState(!supabaseConfigured);
  const [cloudError, setCloudError] = useState('');
  const [cloudRetry, setCloudRetry] = useState(0);
  const [selectedArtboard, setSelectedArtboard] = useState(false);
  const [past, setPast] = useState<DesignProject[]>([]);
  const [future, setFuture] = useState<DesignProject[]>([]);
  const [, setCanvases] = useState<Record<string, Canvas | null>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const active = project.artboards.find((board) => board.id === activeId) ?? project.artboards[0] ?? demoProject().artboards[0];
  const selected = active?.objects.find((object) => object.id === selectedId) ?? null;
  const issues = useMemo(() => active ? findLayoutIssues(active) : [], [active]);
  const matchingPresets = presets.filter((preset) => `${preset.name} ${preset.group}`.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('duocreator.theme', theme);
    const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (favicon) favicon.href = theme === 'dark' ? '/duocreator-icon-on-dark.png' : '/duocreator-icon-on-light.png';
  }, [theme]);

  useEffect(() => {
    if (!supabaseConfigured || !authReady || session) return;
    const timer = window.setInterval(() => {
      setAuthHeroSlide((slide) => (slide + 1) % AUTH_HERO_IMAGES.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [authReady, session?.user.id]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
      setAuthMessage('');
    });
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      setSession(data.session);
      setAuthReady(true);
      if (error) setAuthMessage(error.message);
    }).catch((error: unknown) => {
      if (!active) return;
      setAuthReady(true);
      setAuthMessage(error instanceof Error ? error.message : 'Unable to check your sign-in session.');
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) { setCloudLoaded(true); return; }
    if (!authReady || !session?.user.id) { setCloudLoaded(false); return; }
    let active = true;
    setCloudLoaded(false);
    setCloudError('');
    void loadLatestProject(session.user.id).then((remoteProject) => {
      if (!active) return;
      if (remoteProject) setProject(remoteProject);
      else setProject(loadProject());
      setCloudLoaded(true);
    }).catch((error: unknown) => {
      if (!active) return;
      setCloudError(error instanceof Error ? error.message : 'Could not load your saved designs.');
    });
    return () => { active = false; };
  }, [authReady, session?.user.id, cloudRetry]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    if (!supabaseConfigured) {
      setSavedAt('Saved locally');
      return;
    }
    if (!authReady) { setSavedAt('Connecting…'); return; }
    if (!session) { setSavedAt('Sign in to sync'); return; }
    if (!cloudLoaded) { setSavedAt(cloudError ? 'Cloud unavailable' : 'Loading cloud…'); return; }

    setSavedAt('Saving…');
    const timer = window.setTimeout(() => {
      void saveProject(session.user.id, project).then(() => {
        setSavedAt('Saved');
        setCloudError('');
      }).catch((error: unknown) => {
        setSavedAt('Local copy · sync failed');
        setCloudError(error instanceof Error ? error.message : 'Could not save this design to Supabase.');
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [project, authReady, session?.user.id, cloudLoaded]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const saveHistory = useCallback(() => {
    setPast((items) => [...items.slice(-19), structuredClone(project)]);
    setFuture([]);
  }, [project]);

  const updateArtboard = useCallback((artboardId: string, objectId: string, update: Partial<DesignObject>) => {
    saveHistory();
    setProject((current) => ({ ...current, updatedAt: new Date().toISOString(), artboards: current.artboards.map((board) => board.id !== artboardId ? board : { ...board, objects: board.objects.map((object) => object.id === objectId ? { ...object, ...update } : object) }) }));
  }, [saveHistory]);

  const updateCanvas = useCallback((canvas: Canvas | null) => {
    setCanvases((current) => ({ ...current, [active?.id ?? '']: canvas }));
  }, [active?.id]);
  const onSelectCanvas = useCallback((id: string | null) => { setSelectedId(id || null); setSelectedArtboard(!id); }, []);
  const onModify = useCallback((id: string, update: Partial<DesignObject>) => {
    setProject((current) => ({ ...current, artboards: current.artboards.map((board) => board.id !== active?.id ? board : { ...board, objects: board.objects.map((object) => object.id === id ? { ...object, ...update } : object) }) }));
  }, [active?.id]);

  const addArtboards = useCallback((boards: Artboard[], message: string) => {
    if (!boards.length) return;
    const imported = boards.map((board, index) => ({ ...board, isMaster: index === 0, id: board.id || crypto.randomUUID() }));
    saveHistory();
    setProject({ id: crypto.randomUUID(), name: imported[0].name || 'Untitled project', updatedAt: new Date().toISOString(), artboards: imported });
    setActiveId(imported[0].id);
    setSelectedId(null);
    setSelectedArtboard(true);
    setToast(message);
  }, [saveHistory]);

  const importClipboard = useCallback((text?: string) => {
    const raw = text ?? '';
    try {
      const payload = parseFigmaClipboard(raw);
      const board = figmaPayloadToArtboard(payload);
      addArtboards([board], `Imported ${board.objects.length} editable element${board.objects.length === 1 ? '' : 's'} from ${payload.source.editorType}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Clipboard import failed.';
      setToast(message);
    }
  }, [addArtboards]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const text = event.clipboardData?.getData('text/plain');
      if (!text?.includes('application/vnd.duocreator.figma+json')) return;
      event.preventDefault();
      importClipboard(text);
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [importClipboard]);

  const pasteButton = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.includes('application/vnd.duocreator.figma+json')) throw new Error('Clipboard does not contain a Duocreator frame. Copy a frame in Figma first.');
      importClipboard(text);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Clipboard access is unavailable.');
    }
  };

  const processFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setImporting(true);
    try {
      const boards: Artboard[] = [];
      for (const file of list) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (file.type === 'application/pdf' || extension === 'pdf') boards.push(...await importPdf(file));
        else if (file.type === 'image/svg+xml' || extension === 'svg') boards.push(await importSvg(file));
        else if (file.type.startsWith('image/')) boards.push(await importImage(file));
        else throw new Error(`${file.name} is not a supported PDF, SVG, PNG, or JPEG file.`);
      }
      addArtboards(boards, `Imported ${boards.length} artboard${boards.length === 1 ? '' : 's'}.`);
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'The file could not be imported.');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => { if (event.target.files) void processFiles(event.target.files); };

  const createVariant = (preset: SizePreset) => {
    if (!active) return;
    const master = project.artboards.find((board) => board.isMaster) ?? active;
    const board = resizeArtboard(master, preset);
    saveHistory();
    setProject((current) => ({ ...current, updatedAt: new Date().toISOString(), artboards: [...current.artboards, board] }));
    setActiveId(board.id);
    setSelectedId(null);
    setSelectedArtboard(true);
    setToast(`${preset.name} variant created.`);
  };

  const createCustomVariant = () => {
    if (!active || customWidth < 1 || customHeight < 1) return;
    createVariant({ id: crypto.randomUUID(), name: customName || 'Custom size', group: 'Custom', width: customWidth, height: customHeight });
    setCustomOpen(false);
  };

  const addObject = (type: DesignObject['type']) => {
    if (!active) return;
    const id = crypto.randomUUID();
    const object: DesignObject = type === 'text'
      ? { id, name: 'New text', type, x: active.width * .27, y: active.height * .4, width: active.width * .46, height: 90, fill: '#191919', text: 'Your text', fontFamily: 'Inter', fontSize: 56, fontWeight: '600' }
      : type === 'ellipse'
        ? { id, name: 'Circle', type, x: active.width * .4, y: active.height * .35, width: 180, height: 180, fill: '#de7855' }
        : { id, name: 'Rectangle', type: 'rect', x: active.width * .35, y: active.height * .35, width: 280, height: 180, fill: '#353535' };
    saveHistory();
    setProject((current) => ({ ...current, artboards: current.artboards.map((board) => board.id === active.id ? { ...board, objects: [...board.objects, object] } : board) }));
    setSelectedId(id);
    setSelectedArtboard(false);
    setToast(`${type === 'text' ? 'Text' : type === 'ellipse' ? 'Circle' : 'Shape'} added.`);
  };

  const removeObject = (id: string) => {
    if (!active) return;
    saveHistory();
    setProject((current) => ({ ...current, artboards: current.artboards.map((board) => board.id === active.id ? { ...board, objects: board.objects.filter((object) => object.id !== id) } : board) }));
    setSelectedId(null);
    setSelectedArtboard(true);
  };

  const undo = () => {
    const previous = past[past.length - 1];
    if (!previous) return;
    setFuture((items) => [structuredClone(project), ...items]);
    setPast((items) => items.slice(0, -1));
    setProject(previous);
    setActiveId(previous.artboards[0]?.id ?? '');
    setSelectedId(null);
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setPast((items) => [...items, structuredClone(project)]);
    setFuture((items) => items.slice(1));
    setProject(next);
    setActiveId(next.artboards[0]?.id ?? '');
    setSelectedId(null);
  };

  const doExport = async (format: string, all = false) => {
    setExportOpen(false);
    try {
      const boards = all ? project.artboards : active ? [active] : [];
      for (const board of boards) await exportArtboard(board, format);
      setToast(`${all ? `${boards.length} designs` : active?.name} exported as ${format.toUpperCase()}.`);
    } catch (error) { setToast(error instanceof Error ? error.message : 'Export failed.'); }
  };

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setAuthBusy(true);
    setAuthMessage('');
    try {
      if (authMode === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail.trim(), password: authPassword });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) setAuthMessage('Check your email to confirm your account, then sign in to sync your designs.');
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Authentication failed. Please try again.');
    } finally {
      setAuthBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setAuthBusy(true);
    setAuthMessage('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : 'Google sign-in failed. Please try again.');
      setAuthBusy(false);
    }
  };

  const switchAuthMode = () => {
    const nextMode = authMode === 'sign-in' ? 'sign-up' : 'sign-in';
    setAuthMode(nextMode);
    setAuthHeroSlide(nextMode === 'sign-in' ? 0 : 2);
    setAuthMessage('');
    setAuthPasswordVisible(false);
  };

  const signOut = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setToast(`Could not sign out: ${error.message}`);
  };

  const handleDrop = (event: React.DragEvent) => { event.preventDefault(); void processFiles(event.dataTransfer.files); };
  const objectCount = active?.objects.length ?? 0;

  const fullLogo = theme === 'dark' ? '/duocreator-full-logo-on-dark.png' : '/duocreator-full-logo-on-light.png';

  if (supabaseConfigured && !authReady) return <main className="auth-screen auth-status-screen"><div className="auth-card auth-status"><img src={fullLogo} alt="Duocreator"/><p>Connecting to your workspace…</p></div></main>;

  if (supabaseConfigured && authReady && !session) return <main className={`auth-screen auth-screen-${authMode}`}>
    <div className="auth-layout">
      <section className={`auth-visual ${authMode === 'sign-in' ? 'auth-visual-signin' : 'auth-visual-signup'}`} aria-label="Duocreator introduction">
        <img key={AUTH_HERO_IMAGES[authHeroSlide]} className="auth-visual-photo" src={AUTH_HERO_IMAGES[authHeroSlide]} alt="" />
        <div className="auth-visual-shade" />
        <img className="auth-visual-logo" src="/duocreator-full-logo-on-dark.png" alt="Duocreator" />
        <div className="auth-visual-caption">
          <h2>{authMode === 'sign-in' ? 'Sit back and watch your Duo handle the rest.' : 'Enjoy the fun of creating and leave the boring part to your Duo.'}</h2>
          <div className="auth-slide-dots" role="group" aria-label="Choose a workspace photo">
            {AUTH_HERO_IMAGES.map((photo, index) => <button key={photo} type="button" className={index === authHeroSlide ? 'active' : ''} aria-label={`Show photo ${index + 1} of ${AUTH_HERO_IMAGES.length}`} aria-pressed={index === authHeroSlide} onClick={() => setAuthHeroSlide(index)} />)}
          </div>
        </div>
      </section>
      <section className="auth-form-panel" aria-labelledby="auth-title">
        <div className="auth-form-content">
          <header className="auth-heading">
            <h1 id="auth-title">{authMode === 'sign-in' ? 'Hey! Welcome back🎉' : 'Create an account👌'}</h1>
            <p>{authMode === 'sign-in' ? 'Sign in to open your saved projects and keep your work in sync everywhere.' : 'Sign up to create projects, generate editable varying canvas and keep your work in sync everywhere.'}</p>
          </header>
          <form id="duocreator-auth-form" className="auth-form" onSubmit={(event) => void submitAuth(event)}>
            <div className="auth-fields">
              <label className="auth-field">Email address
                <input type="email" autoComplete="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="Enter your email address" />
              </label>
              <label className="auth-field">Password
                <span className="auth-password-wrap">
                  <input type={authPasswordVisible ? 'text' : 'password'} autoComplete={authMode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} maxLength={14} required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Input your password" />
                  <button type="button" className="auth-password-toggle" onClick={() => setAuthPasswordVisible((visible) => !visible)} aria-label={authPasswordVisible ? 'Hide password' : 'Show password'} aria-pressed={authPasswordVisible}>{authPasswordVisible ? <Eye size={20}/> : <EyeOff size={20}/>}</button>
                </span>
                <small className="auth-password-hint"><strong>Input at least 8 characters, no more than 14 characters.</strong> Uppercase letters, lowercase letters, numbers and symbols are allowed.</small>
              </label>
            </div>
            <div className="auth-actions">
              {authMessage && <p className="auth-message" role="status" aria-live="polite">{authMessage}</p>}
              <div className="auth-primary-actions">
                <button className="auth-submit" type="submit" disabled={authBusy}>{authBusy ? 'Please wait…' : authMode === 'sign-in' ? 'Sign in' : 'Sign Up'}</button>
                <p className="auth-switch">{authMode === 'sign-in' ? 'Don’t have an account?' : 'Already have an account?'} <button type="button" onClick={switchAuthMode}>{authMode === 'sign-in' ? 'Create an account.' : 'Log in.'}</button></p>
              </div>
              {authMode === 'sign-up' && <>
                <div className="auth-divider"><span>Or</span></div>
                <button className="auth-google" type="button" onClick={() => void signInWithGoogle()} disabled={authBusy}><img src="/google-mark.png" alt="" />Sign Up with Google</button>
              </>}
            </div>
          </form>
        </div>
      </section>
    </div>
    <button className="auth-theme-toggle" type="button" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-pressed={theme === 'dark'} onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}>
      {theme === 'light' ? <Moon size={16}/> : <Sun size={16}/>}
    </button>
  </main>;

  if (supabaseConfigured && session && !cloudLoaded) return <main className="auth-screen auth-status-screen"><div className="auth-card auth-status">
    <img src={fullLogo} alt="Duocreator"/>
    {cloudError ? <><p>We couldn’t load your saved workspace.</p><small>{cloudError}</small><button className="auth-submit" onClick={() => setCloudRetry((retry) => retry + 1)}>Retry connection</button><button className="auth-switch" onClick={() => void signOut()}>Sign out</button></> : <p>Loading your saved designs…</p>}
  </div></main>;

  return <div className="app-shell" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
    <header className="topbar">
      <div className="brand-lockup"><img src={fullLogo} alt="Duocreator"/><span className="studio-tag">Studio</span></div>
      <div className="project-name"><span className="project-dot"/> <span>{project.name}</span><span className="save-state"><Check size={12}/>{savedAt}</span></div>
      <div className="top-actions">
        {supabaseConfigured && session && <button className="top-icon" type="button" title={`Sign out ${session.user.email ?? 'account'}`} aria-label="Sign out" onClick={() => void signOut()}><LogOut size={15}/></button>}
        <button className="top-icon theme-toggle" type="button" title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} aria-pressed={theme === 'dark'} onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}>
          {theme === 'light' ? <Moon size={15}/> : <Sun size={15}/>}<span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
        <button className="top-icon" title="Undo" aria-label="Undo" onClick={undo} disabled={!past.length}><Undo2 size={16}/></button>
        <button className="top-icon" title="Redo" aria-label="Redo" onClick={redo} disabled={!future.length}><Redo2 size={16}/></button>
        <button className="export-main" onClick={() => setExportOpen((value) => !value)}><ArrowDownToLine size={15}/> Export <ChevronDown size={14}/></button>
        {exportOpen && <div className="export-menu" ref={exportRef}>
          <div className="menu-title">Export current artboard</div>
          {[['png','PNG image'],['jpeg','JPEG image'],['webp','WebP image'],['svg','SVG vector'],['pdf','PDF document'],['json','Duocreator JSON']].map(([format,label]) => <button key={format} onClick={() => void doExport(format)}><span>{label}</span><span className="menu-ext">.{format}</span></button>)}
          <div className="menu-divider"/><button onClick={() => void doExport('png', true)}><span>Export all artboards</span><span className="menu-ext">{project.artboards.length}</span></button>
        </div>}
      </div>
    </header>

    <div className="workspace">
      <aside className="left-panel">
        <div className="panel-intro"><div><span className="panel-kicker">WORKSPACE</span><strong>Campaigns</strong></div><button className="add-project" title="New project" onClick={() => { const sample = demoProject(); setProject(sample); setActiveId(sample.artboards[0].id); setToast('New project created.'); }}><Plus size={16}/></button></div>
        <button className="project-row active"><FolderOpen size={15}/><span>{project.name}</span><ChevronDown size={13}/></button>
        <div className="sidebar-section-title"><span>ARTBOARDS</span><span>{project.artboards.length}</span></div>
        <div className="artboard-list">
          {project.artboards.map((board, index) => <button key={board.id} className={`artboard-row ${active?.id === board.id ? 'current' : ''}`} onClick={() => { setActiveId(board.id); setSelectedId(null); setSelectedArtboard(true); }}>
            <span className={`artboard-thumb ${board.height > board.width ? 'portrait' : ''}`}><span style={{ background: board.objects.find((o) => o.type === 'rect' && !o.locked)?.fill ?? '#d9d9d9' }}/></span>
            <span className="artboard-info"><strong>{board.name}</strong><small>{board.width} × {board.height}{board.isMaster ? ' · Master' : ''}</small></span><span className="artboard-index">{String(index + 1).padStart(2, '0')}</span>
          </button>)}
        </div>
        <div className="sidebar-tools"><div className="sidebar-section-title"><span>IMPORT</span></div>
          <button className="tool-row" onClick={pasteButton}><ClipboardPaste size={15}/><span>Paste from Figma</span><kbd>⌘ V</kbd></button>
          <button className="tool-row" onClick={() => fileRef.current?.click()}><Upload size={15}/><span>Upload a file</span><span className="tool-hint">PDF, SVG, PNG</span></button>
          <button className="tool-row muted-row" onClick={() => setCanvaMessage(true)}><Cloud size={15}/><span>Connect Canva</span><span className="pending-dot">Soon</span></button>
          {canvaMessage && <div className="canva-note">Canva import will be added after API access is confirmed.</div>}
        </div>
        <div className="sidebar-bottom"><span className="user-avatar"><img src="/duocreator-icon-on-dark.png" alt=""/></span><span><strong>Dara’s workspace</strong><small>Personal studio</small></span><Settings2 size={15}/></div>
      </aside>

      <main className="editor-area">
        <div className="editor-toolbar">
          <div className="tools-group">
            <button className="toolbar-button selected-tool" title="Select"><ArrowLeftRight size={16}/></button>
            <button className="toolbar-button" title="Add text" onClick={() => addObject('text')}><Type size={16}/></button>
            <button className="toolbar-button" title="Add shape" onClick={() => addObject('rect')}><Shapes size={16}/></button>
            <button className="toolbar-button" title="Add image" onClick={() => fileRef.current?.click()}><ImagePlus size={16}/></button>
            <span className="toolbar-separator"/>
            <button className={`toolbar-button ${showSafe ? 'selected-tool' : ''}`} title="Toggle safe area" onClick={() => setShowSafe((value) => !value)}><Crop size={15}/></button>
          </div>
          <div className="canvas-meta"><span>{active?.category ?? 'Artboard'}</span><span className="meta-slash">/</span><strong>{active?.name}</strong></div>
          <div className="zoom-controls"><button className="toolbar-button" title="Zoom out" onClick={() => setZoom((value) => Math.max(.12, value - .05))}><ZoomOut size={15}/></button><button className="zoom-value" onClick={() => setZoom(.39)}>{Math.round(zoom * 100)}%</button><button className="toolbar-button" title="Zoom in" onClick={() => setZoom((value) => Math.min(1.2, value + .05))}><ZoomIn size={15}/></button></div>
        </div>
        <div className="canvas-stage">
          {active ? <div className="canvas-wrap" style={{ width: active.width * zoom, height: active.height * zoom }}>
            <div className="canvas-shadow"><EditorCanvas artboard={active} zoom={zoom} selectedId={selectedId} onSelect={onSelectCanvas} onModify={onModify} onCanvas={updateCanvas} showSafeArea={showSafe}/></div>
          </div> : <div className="empty-workspace"><div className="upload-emblem"><Upload size={24}/></div><h2>Bring a design into the studio</h2><p>Paste from Figma or upload PDF, SVG, PNG, or JPEG.</p><button className="dark-button" onClick={() => fileRef.current?.click()}><Upload size={15}/> Choose a file</button><button className="text-button" onClick={pasteButton}><ClipboardPaste size={14}/> Paste from Figma</button></div>}
          <div className="stage-bottom"><span><Layers3 size={13}/>{objectCount} layers</span>{issues.length > 0 && <span className="issue-pill"><span/> {issues.length} layout warning{issues.length > 1 ? 's' : ''}</span>}<button className="stage-shortcut" onClick={() => setShowSafe((value) => !value)}><Grid2X2 size={13}/> Safe area</button></div>
        </div>
        {active && <div className="resize-dock">
          <div className="resize-copy"><span className="resize-icon"><Sparkles size={15}/></span><span><strong>Make another size</strong><small>Start from the protected master</small></span></div>
          <div className="preset-list">{presets.slice(0, 4).map((preset) => <button key={preset.id} className="preset-chip" onClick={() => createVariant(preset)} title={`${preset.width} × ${preset.height}`}><span>{preset.name}</span><small>{preset.width} × {preset.height}</small></button>)}</div>
          <button className="custom-size-button all-sizes-button" onClick={() => setPresetOpen(true)}><Search size={13}/> All sizes</button>
          <button className="custom-size-button" onClick={() => setCustomOpen(true)}><Plus size={14}/> Custom</button>
        </div>}
      </main>

      <aside className="right-panel">
        <Inspector artboard={active} selected={selected} onUpdate={(id, update) => updateArtboard(active.id, id, update)} onDelete={removeObject}/>
        <div className="layers-panel"><div className="layers-heading"><span><Layers3 size={14}/> Layers</span><button className="icon-btn" title="Add text layer" onClick={() => addObject('text')}><Plus size={15}/></button></div>
          <div className="layer-list">{[...(active?.objects ?? [])].reverse().map((object) => <button key={object.id} className={`layer-row ${selectedId === object.id ? 'layer-selected' : ''}`} onClick={() => { setSelectedId(object.id); setSelectedArtboard(false); }}><span className="layer-grip">⠿</span><span className={`layer-type ${object.type}`}>{object.type === 'text' ? <Type size={13}/> : object.type === 'image' ? <FileImage size={13}/> : object.type === 'ellipse' ? <Grid2X2 size={13}/> : <Frame size={13}/>}</span><span className="layer-name">{object.name}</span>{object.locked && <LockKeyhole size={12} className="layer-lock"/>}{object.visible === false && <span className="layer-hidden">Hidden</span>}</button>)}</div>
        </div>
        <div className="responsive-tip"><Sparkles size={14}/><p>Each size has its own layers. Your master stays untouched.</p></div>
      </aside>
    </div>

    <input ref={fileRef} className="visually-hidden" type="file" accept="application/pdf,image/svg+xml,image/png,image/jpeg,image/webp" multiple onChange={handleFiles}/>
    {presetOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPresetOpen(false); }}><div className="preset-modal" role="dialog" aria-modal="true" aria-labelledby="preset-title"><div className="modal-top"><div><span className="modal-kicker">SIZE CATALOG</span><h2 id="preset-title">Choose a format</h2></div><button className="icon-btn" onClick={() => setPresetOpen(false)} aria-label="Close">×</button></div><label className="preset-search"><Search size={15}/><input autoFocus placeholder="Search social, email, print…" value={query} onChange={(event) => setQuery(event.target.value)}/></label><div className="preset-results">{matchingPresets.map((preset) => <button key={preset.id} className="preset-result" onClick={() => { createVariant(preset); setPresetOpen(false); setQuery(''); }}><span className="preset-result-icon"><Frame size={15}/></span><span><strong>{preset.name}</strong><small>{preset.group}</small></span><span className="preset-result-size">{preset.width} × {preset.height}</span></button>)}{matchingPresets.length === 0 && <div className="preset-empty">No matching sizes. Create a custom artboard instead.</div>}</div><button className="preset-custom-link" onClick={() => { setPresetOpen(false); setCustomOpen(true); }}><Plus size={14}/> Create a custom size</button></div></div>}
    {customOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCustomOpen(false); }}><div className="custom-modal" role="dialog" aria-modal="true" aria-labelledby="custom-title"><div className="modal-top"><div><span className="modal-kicker">NEW ARTBOARD</span><h2 id="custom-title">Set a custom size</h2></div><button className="icon-btn" onClick={() => setCustomOpen(false)} aria-label="Close">×</button></div><label>Artboard name<input value={customName} onChange={(e) => setCustomName(e.target.value)}/></label><div className="custom-fields"><label>Width (px)<input type="number" min="1" value={customWidth} onChange={(e) => setCustomWidth(Number(e.target.value))}/></label><label>Height (px)<input type="number" min="1" value={customHeight} onChange={(e) => setCustomHeight(Number(e.target.value))}/></label></div><p className="modal-note">A new independent layout will be created from your master design.</p><div className="modal-actions"><button className="light-button" onClick={() => setCustomOpen(false)}>Cancel</button><button className="dark-button" onClick={createCustomVariant}>Create artboard</button></div></div></div>}
    {toast && <div className="toast" role="status"><Check size={15}/>{toast}</div>}
    {importing && <div className="import-progress"><span className="progress-shimmer"/>Preparing your design…</div>}
  </div>;
}
