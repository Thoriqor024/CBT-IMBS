import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert, Clock3, GraduationCap, LockKeyhole, LogOut, MonitorCheck, MonitorX, RefreshCw, Save, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { api } from './api';
import { deleteSessionDrafts, getDrafts, markDraftSynced, saveDraft, verifyEncryptedStorage } from './examStorage';
import { FormulaText } from './FormulaText.jsx';

export default function StudentPortal({user,onLogout}) {
  const [exams,setExams]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [selectedExam,setSelectedExam]=useState(null);
  const [entryPin,setEntryPin]=useState('');
  const [session,setSession]=useState(null);
  const [busy,setBusy]=useState(false);
  const [screenDetails,setScreenDetails]=useState(null);
  const [screenOverride,setScreenOverride]=useState(false);
  const [screenState,setScreenState]=useState('idle');
  const [screenMessage,setScreenMessage]=useState('');

  const loadExams=async()=>{
    setError('');
    try{setExams(await api('/student/exams'));}
    catch(err){setError(err.message);}
    finally{setLoading(false);}
  };
  useEffect(()=>{
    try{
      const saved=localStorage.getItem('imbs_active_exam_session');
      if(saved&&!session){
        const parsed=JSON.parse(saved);
        if(parsed?.id&&parsed.status==='in_progress'){
          setSession(parsed);
        }
      }
    }catch{}
    loadExams();
  },[]);

  const selectExam=exam=>{
    setSelectedExam(exam);setEntryPin('');setScreenOverride(false);setScreenState('idle');
    setScreenMessage('');setScreenDetails(null);setError('');
  };
  const prepareAndStart=async()=>{
    if(!selectedExam)return;
    const isNew=selectedExam.sessionStatus==='not_started';
    if(isNew&&!/^\d{4,6}$/.test(entryPin)){
      setError('Masukkan PIN ujian 4–6 digit dari pengawas.');return;
    }
    setBusy(true);setError('');setScreenState('checking');
    try{
      const fullScreenPromise=document.fullscreenElement?Promise.resolve(true):
        (document.documentElement.requestFullscreen?document.documentElement.requestFullscreen().then(()=>true).catch(()=>false):Promise.resolve(false));
      const screenDetailsPromise=typeof window.getScreenDetails==='function'
        ?window.getScreenDetails().catch(()=>null):Promise.resolve(null);
      const [fullScreenOk,details]=await Promise.all([fullScreenPromise,screenDetailsPromise]);
      setScreenDetails(details);
      const multiple=Boolean((details&&details.screens.length>1)||window.screen?.isExtended===true);
      if(multiple){
        setScreenState('multiple');
        setScreenMessage('Terdeteksi lebih dari satu layar. Cabut monitor atau proyektor kedua, lalu coba lagi.');
        return;
      }
      const verified=Boolean(details);
      if(!verified&&!screenOverride){
        setScreenState('unverified');
        setScreenMessage('Browser tidak memberi akses pemeriksaan layar. Minta pengawas memeriksa perangkat secara langsung, lalu centang konfirmasi untuk melanjutkan.');
        return;
      }
      setScreenState(verified?'ready':'unverified');
      if(verified)setScreenMessage('Satu layar terdeteksi. Browser akan membuka ujian dalam layar penuh.');
      if(!fullScreenOk){
        setScreenState('fullscreen');
        setScreenMessage('Mode layar penuh belum aktif. Izinkan layar penuh pada browser, lalu coba lagi.');
        return;
      }
      await verifyEncryptedStorage();
      const started=await api(`/student/exams/${selectedExam.examId}/start`,{
        method:'POST',body:JSON.stringify(isNew?{pin:entryPin}:{})
      });
      if(started.status==='completed'||started.status==='locked')await deleteSessionDrafts(started.id).catch(()=>{});
      const activeSession={...started,examId:selectedExam.examId,subject:selectedExam.subject,topic:selectedExam.topic};
      try{localStorage.setItem('imbs_active_exam_session',JSON.stringify(activeSession));}catch{}
      setSession(activeSession);
      setSelectedExam(null);
    }catch(err){setError(err.message);setScreenState('ready');}
    finally{setBusy(false);}
  };

  if(session)return <ExamRunner key={session.id} user={user} initialSession={session} screenDetails={screenDetails}
    onExit={async()=>{
      try{localStorage.removeItem('imbs_active_exam_session');}catch{}
      setSession(null);setScreenDetails(null);setSelectedExam(null);await loadExams();
    }}/>;

  return <div className="student-portal">
    <header className="portal-top">
      <div className="portal-brand"><i className="portal-logo"><GraduationCap size={19}/></i><div><b>IMBS CBT</b></div></div>
      <div className="portal-user"><span>{user.name}</span><button onClick={onLogout}><LogOut size={14}/> Keluar</button></div>
    </header>
    <main className="portal-main">
      <section className="portal-greeting"><h1>Selamat datang, {user.name}</h1><p>Pilih ujian yang sedang dibuka oleh pengawas.</p></section>
      {error&&<div className="portal-error" role="alert"><AlertTriangle size={16}/>{error}<button onClick={loadExams}>Coba lagi</button></div>}
      <div className="portal-section-heading"><h2>Daftar ujian</h2><button onClick={loadExams} disabled={loading}><RefreshCw size={14}/> Perbarui</button></div>
      {loading?<div className="portal-empty"><RefreshCw size={22}/><b>Memuat ujian¦</b></div>:
        exams.length?<div className="portal-exams">{exams.map(exam=><article className="portal-exam" key={exam.sessionId}>
          <i className="portal-exam-icon"><BookOpen size={19}/></i>
          <div className="portal-exam-info"><span className="portal-exam-state">{portalStatus(exam.sessionStatus,exam.examStatus)}</span>
            <h3>{exam.title}</h3><p>{exam.subject} Â· {exam.grade ? `Kelas ${exam.grade}  ` : ''}{exam.topic}  {exam.durationMinutes} menit</p>
            {exam.sessionStatus==='not_started'&&exam.examStatus==='active'&&!exam.pinReady&&<small className="portal-warning">Menunggu PIN dari pengawas.</small>}
          </div>
          {exam.sessionStatus==='not_started'&&exam.examStatus==='active'&&<button className="portal-start" disabled={!exam.pinReady} onClick={()=>selectExam(exam)}><LockKeyhole size={15}/> Masukkan PIN</button>}
          {exam.sessionStatus==='in_progress'&&<button className="portal-start" onClick={()=>selectExam(exam)}><BookOpen size={15}/> Lanjutkan</button>}
          {exam.sessionStatus==='completed'&&<span className="portal-done"><CheckCircle2 size={15}/> Selesai Nilai guru: {exam.score??'menunggu input'}</span>}
          {exam.sessionStatus==='locked'&&<span className="portal-locked"><AlertTriangle size={15}/> Terkunci Nilai guru: {exam.score??'menunggu input'}</span>}
        </article>)}</div>:<div className="portal-empty"><BookOpen size={24}/><b>Belum ada ujian</b><span>Ujian akan muncul setelah admin mengaktifkannya.</span></div>}
      <aside className="portal-rules"><b>Catatan sebelum mulai</b><ul><li>Siapkan satu layar dan sambungkan jaringan sekolah.</li><li>Jawaban disimpan terenkripsi di perangkat sebelum disinkronkan.</li><li>Jika jaringan terputus, jawaban tetap tersimpan di perangkat. Sambungkan kembali untuk mengirim atau mengumpulkan ujian.</li><li>Pemeriksaan layar bergantung pada dukungan dan izin browser; pengawas tetap perlu memeriksa perangkat yang tidak mendukungnya.</li></ul></aside>
    </main>
    {selectedExam&&<div className="exam-preflight-backdrop" role="presentation">
      <section className="exam-preflight" role="dialog" aria-modal="true" aria-labelledby="preflight-title">
        <button className="exam-preflight-close" onClick={()=>setSelectedExam(null)} aria-label="Tutup">Ã—</button>
        <div className="preflight-icon"><ShieldCheck size={21}/></div><h2 id="preflight-title">Persiapan ujian</h2>
        <p>{selectedExam.title} Â· {selectedExam.durationMinutes} menit</p>
        {selectedExam.sessionStatus==='not_started'&&<label className="preflight-pin">PIN dari pengawas<input autoFocus inputMode="numeric" maxLength={6} value={entryPin} onChange={e=>setEntryPin(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢"/></label>}
        <div className={`preflight-screen ${screenState==='multiple'?'is-blocked':screenState==='unverified'||screenState==='fullscreen'?'is-unknown':''}`}>
          {screenState==='multiple'?<MonitorX size={18}/>:screenState==='checking'?<RefreshCw size={18}/>:<MonitorCheck size={18}/>}
          <span>{screenMessage||'Saat mulai, browser akan meminta izin memeriksa layar dan menampilkan ujian dalam layar penuh.'}</span>
        </div>
        {screenState==='unverified'&&<label className="preflight-override"><input type="checkbox" checked={screenOverride} onChange={e=>setScreenOverride(e.target.checked)}/> Pengawas sudah memeriksa bahwa perangkat hanya memakai satu layar.</label>}
        {error&&<div className="portal-error" role="alert"><AlertTriangle size={15}/>{error}</div>}
        <div className="preflight-actions"><button className="secondary" onClick={()=>setSelectedExam(null)}>Batal</button><button className="portal-start" disabled={busy||(screenState==='unverified'&&!screenOverride)} onClick={prepareAndStart}>{busy?'Memeriksaâ€¦':screenState==='multiple'?'Periksa layar lagi':selectedExam.sessionStatus==='in_progress'?'Lanjutkan ujian':'Periksa perangkat & mulai'}</button></div>
      </section>
    </div>}
  </div>;
}

function ExamRunner({user,initialSession,screenDetails,onExit}){
  const [session,setSession]=useState(initialSession);
  const sessionRef=useRef(initialSession);
  const [answers,setAnswers]=useState({});
  const answersRef=useRef({});
  const [draftReady,setDraftReady]=useState(false);
  const [index,setIndex]=useState(0);
  const [online,setOnline]=useState(navigator.onLine);
  const [saveState,setSaveState]=useState('Memuat jawaban');
  const [error,setError]=useState('');
  const [storageError,setStorageError]=useState('');
  const [seconds,setSeconds]=useState(0);
  const [timerReady,setTimerReady]=useState(false);
  const [screenBlocked,setScreenBlocked]=useState(false);
  const [fullscreenLost,setFullscreenLost]=useState(!document.fullscreenElement);
  const [showKeyboard,setShowKeyboard]=useState(false);
  const [busy,setBusy]=useState(false);
  const [showSubmitModal,setShowSubmitModal]=useState(false);
  const [isProbing,setIsProbing]=useState(false);
  const [probeFeedback,setProbeFeedback]=useState('');
  const queueRef=useRef(new Map());
  const timerRef=useRef(null);
  const syncTimerRef=useRef(null);
  const persistPromiseRef=useRef(null);
  const syncPromiseRef=useRef(null);
  const syncRef=useRef(null);
  const submitRef=useRef(null);
  const autoSubmitRef=useRef(false);
  const isSubmittingRef=useRef(false);
  const initialServerEpoch=Date.parse(initialSession.serverTime);
  const serverClockRef=useRef({epoch:Number.isFinite(initialServerEpoch)?initialServerEpoch:Date.now(),monotonic:performance.now()});
  const textareaRef=useRef(null);
  const questions=session.questions||[];
  const question=questions[index];
  const relatedPositions = useMemo(() => {
    if (!question?.stimulus?.id) return [];
    return questions
      .map((q, idx) => (q.stimulus?.id === question.stimulus.id ? (q.position || idx + 1) : null))
      .filter(Boolean);
  }, [question?.stimulus?.id, questions]);
  const answeredCount=questions.filter(q=>String(answers[q.id]||'').trim()).length;
  const isFinished=session.status==='completed'||session.status==='locked';
  const violationReviewRequired=Boolean(session.violationReviewRequired);
  const updateSession=next=>{
    sessionRef.current=typeof next==='function'?next(sessionRef.current):next;
    setSession(sessionRef.current);
    if(sessionRef.current?.status==='in_progress'){
      try{localStorage.setItem('imbs_active_exam_session',JSON.stringify(sessionRef.current));}catch{}
    }
  };
  const acceptFinalStatus=async current=>{
    if(current.status!=='completed'&&current.status!=='locked')return false;
    isSubmittingRef.current=true;
    try{localStorage.removeItem('imbs_active_exam_session');}catch{}
    updateSession({...sessionRef.current,...current});
    clearTimeout(timerRef.current);clearTimeout(syncTimerRef.current);queueRef.current.clear();
    await deleteSessionDrafts(session.id).catch(()=>{});
    return true;
  };
  const refreshSessionStatus=async()=>{
    try{
      const current=await api(`/student/sessions/${session.id}`);
      if(await acceptFinalStatus(current))return true;
      updateSession(previous=>({...previous,status:current.status,violationCount:current.violationCount,pendingViolationCount:current.pendingViolationCount,violationReviewRequired:Boolean(current.violationReviewRequired)}));
      return false;
    }
    catch{return false;}
  };
  const syncPending=async()=>{
    if(syncPromiseRef.current)return syncPromiseRef.current;
    const job=(async()=>{
      if(!navigator.onLine){setSaveState('Tersimpan lokal menunggu jaringan');return false;}
      try{
        const drafts=(await getDrafts(session.id)).filter(item=>item.dirty).sort((a,b)=>a.sequence-b.sequence);
        for(const draft of drafts){
          await api(`/student/sessions/${session.id}/responses/${draft.questionId}`,{method:'PUT',body:JSON.stringify({answer:draft.answer})});
          await markDraftSynced(session.id,draft.questionId,draft.sequence);
        }
        setSaveState('Semua jawaban tersinkron');setError('');return true;
      }catch(err){
        if(err.message.includes('Waktu ujian telah habis')||err.message.includes('tidak menerima jawaban')||err.message.includes('menunggu keputusan')){
          try{
            await refreshSessionStatus();
          }catch{}
        }
        setSaveState('Tersimpan lokal menunggu sinkronisasi');setError(err.message);return false;
      }
    })();
    syncPromiseRef.current=job;
    try{return await job;}finally{syncPromiseRef.current=null;}
  };
  const persistLocal=async()=>{
    if(persistPromiseRef.current)return persistPromiseRef.current;
    const job=(async()=>{
      try{
        while(queueRef.current.size){
          const [[questionId,answer]]=queueRef.current.entries();
          await saveDraft(session.id,questionId,answer);
          if(queueRef.current.get(questionId)===answer)queueRef.current.delete(questionId);
        }
        setStorageError('');
        return true;
      }catch(err){setStorageError(err.message);setSaveState('Gagal menyimpan draf lokal');return false;}
    })();
    persistPromiseRef.current=job;
    try{return await job;}finally{persistPromiseRef.current=null;}
  };
  const flushAndSync=async()=>{
    if(!(await persistLocal()))return false;
    return syncPending();
  };
  syncRef.current=flushAndSync;

  const probeAndReconnect=async()=>{
    if(isProbing)return;
    setIsProbing(true);
    setProbeFeedback('Memeriksa koneksi server...');
    try{
      const controller=new AbortController();
      const timeoutId=setTimeout(()=>controller.abort(),3500);
      const resp=await fetch('/api/settings?_probe='+Date.now(),{method:'GET',cache:'no-store',signal:controller.signal});
      clearTimeout(timeoutId);
      if(resp.ok){
        setOnline(true);
        setProbeFeedback('Koneksi terhubung! Menyinkronkan antrean...');
        const synced=await flushAndSync();
        setProbeFeedback(synced?'Koneksi aktif & jawaban tersinkronisasi.':'Koneksi aktif. Sinkronisasi sedang diproses.');
      }else{
        setOnline(false);
        setProbeFeedback('Server merespons status non-aktif. Coba lagi.');
      }
    }catch{
      setOnline(false);
      setProbeFeedback('Koneksi masih terputus. Jawaban tetap aman di perangkat.');
    }finally{
      setIsProbing(false);
      setTimeout(()=>setProbeFeedback(''),4000);
    }
  };

  useEffect(()=>{
    let live=true;
    (async()=>{
      const next={};
      for(const item of session.questions||[])next[item.id]=item.answer||'';
      try{
        const drafts=await getDrafts(session.id);
        for(const draft of drafts)if(draft.dirty)next[draft.questionId]=draft.answer;
        if(live){answersRef.current=next;setAnswers(next);setSaveState(drafts.some(d=>d.dirty)?'Ada jawaban menunggu sinkronisasi':'Semua jawaban tersinkron');setDraftReady(true);}
        if(drafts.some(d=>d.dirty)&&navigator.onLine)await syncPending();
      }catch(err){if(live){answersRef.current=next;setAnswers(next);setStorageError(err.message);setSaveState('Draf lokal tidak dapat dibaca');setDraftReady(true);}}
    })();
    return()=>{live=false;clearTimeout(timerRef.current);clearTimeout(syncTimerRef.current);};
  },[session.id]);

  const saveAnswer=(questionId,value)=>{
    const next={...answersRef.current,[questionId]:value};answersRef.current=next;setAnswers(next);
    queueRef.current.set(String(questionId),String(value??''));
    setSaveState('Menyimpan terenkripsi di perangkatâ€¦');clearTimeout(timerRef.current);
    timerRef.current=setTimeout(async()=>{
      if(await persistLocal()){
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current=setTimeout(()=>syncPending(),600);
      }
    },140);
  };

  const performSubmit=async automatic=>{
    if(isSubmittingRef.current||autoSubmitRef.current||sessionRef.current.status!=='in_progress'||sessionRef.current.violationReviewRequired)return;
    if(!navigator.onLine){setError('Jawaban tersimpan di perangkat, tetapi ujian perlu koneksi untuk disinkronkan dan dikumpulkan.');return;}
    isSubmittingRef.current=true;
    autoSubmitRef.current=true;
    setBusy(true);
    setError('');
    setShowSubmitModal(false);
    try{
      clearTimeout(timerRef.current);clearTimeout(syncTimerRef.current);
      if(!(await flushAndSync()))throw new Error('Belum semua jawaban tersinkron. Sambungkan jaringan lalu coba lagi.');
      const result=await api(`/student/sessions/${session.id}/submit`,{method:'POST'});
      const finished={...sessionRef.current,...result};updateSession(finished);
      await deleteSessionDrafts(session.id).catch(()=>{});
    }catch(err){
      setError(err.message);
      isSubmittingRef.current=false;
      autoSubmitRef.current=false;
    }finally{
      setBusy(false);
    }
  };
  const submitExam=automatic=>{
    if(automatic){
      performSubmit(true);
    }else{
      setShowSubmitModal(true);
    }
  };
  submitRef.current=performSubmit;

  useEffect(()=>{
    const sync=()=>{setOnline(navigator.onLine);if(navigator.onLine)syncRef.current?.();};
    window.addEventListener('online',sync);window.addEventListener('offline',sync);
    return()=>{window.removeEventListener('online',sync);window.removeEventListener('offline',sync);};
  },[]);

  useEffect(()=>{
    if(session.status!=='in_progress')return;
    const update=()=>{
      const deadline=Date.parse(session.expiresAt);
      const serverNow=serverClockRef.current.epoch+(performance.now()-serverClockRef.current.monotonic);
      setSeconds(Number.isFinite(deadline)?Math.max(0,Math.ceil((deadline-serverNow)/1000)):0);
      setTimerReady(true);
    };
    update();const timer=window.setInterval(update,1000);return()=>clearInterval(timer);
  },[session.id,session.status,session.expiresAt]);

  useEffect(()=>{
    if(timerReady&&session.status==='in_progress'&&seconds===0&&online&&!violationReviewRequired)submitRef.current?.(true);
  },[timerReady,seconds,online,session.status,violationReviewRequired]);

  useEffect(()=>{
    if(session.status!=='in_progress')return;
    const heartbeat=async()=>{
      if(!navigator.onLine)return;
      try{
        const result=await api(`/student/sessions/${session.id}/heartbeat`,{method:'POST'});
        const serverTime=Date.parse(result.serverTime);
        if(Number.isFinite(serverTime))serverClockRef.current={epoch:serverTime,monotonic:performance.now()};
        if(result.status==='completed'||result.status==='locked')await acceptFinalStatus(result);
        else if(Boolean(result.violationReviewRequired)!==Boolean(sessionRef.current.violationReviewRequired))await refreshSessionStatus();
        else updateSession(previous=>({...previous,violationCount:result.violationCount??previous.violationCount,pendingViolationCount:result.pendingViolationCount??previous.pendingViolationCount,violationReviewRequired:Boolean(result.violationReviewRequired)}));
      }catch(err){
        if(err.message.includes('habis'))submitRef.current?.(true);
        else if(err.message.includes('tidak aktif'))await refreshSessionStatus();
      }
    };
    const timer=window.setInterval(heartbeat,5000);return()=>clearInterval(timer);
  },[session.id,session.status]);

  useEffect(()=>{
    if(session.status!=='in_progress')return;
    const inspect=()=>{
      const count=screenDetails?.screens?.length;
      setScreenBlocked(count>1||window.screen?.isExtended===true);
    };
    const onScreensChange=()=>inspect();
    const timer=window.setInterval(inspect,2000);
    screenDetails?.addEventListener?.('screenschange',onScreensChange);inspect();
    return()=>{clearInterval(timer);screenDetails?.removeEventListener?.('screenschange',onScreensChange);};
  },[session.id,session.status,screenDetails]);

  useEffect(()=>{
    if(session.status!=='in_progress')return;
    const report=async(code,detail)=>{
      if(!navigator.onLine||sessionRef.current.violationReviewRequired||isSubmittingRef.current||sessionRef.current.status!=='in_progress')return;
      try{
        const result=await api(`/student/sessions/${session.id}/violations`,{method:'POST',body:JSON.stringify({code,detail})});
        const hadHold=Boolean(sessionRef.current.violationReviewRequired),reportedHold=Boolean(result.violationReviewRequired);
        if(reportedHold)updateSession(previous=>({...previous,violationCount:result.violationCount,pendingViolationCount:result.pendingViolationCount,violationReviewRequired:true}));
        if(reportedHold!==hadHold)await refreshSessionStatus();
        else if(!reportedHold)updateSession(previous=>({...previous,violationCount:result.violationCount,pendingViolationCount:result.pendingViolationCount}));
        if(result.locked)await acceptFinalStatus({status:'locked',score:null,finalScore:null});
      }catch{}
    };
    const onVisibility=()=>{if(document.visibilityState==='hidden'&&!isSubmittingRef.current&&sessionRef.current.status==='in_progress')report('tab_hidden','Tab ujian tidak aktif.');};
    const onBlur=()=>{if(!isSubmittingRef.current&&sessionRef.current.status==='in_progress')report('window_blur','Jendela ujian kehilangan fokus.');};
    const onFullscreen=()=>{
      const lost=!document.fullscreenElement;setFullscreenLost(lost);
      if(lost&&!isSubmittingRef.current&&sessionRef.current.status==='in_progress')report('fullscreen_exit','Mode layar penuh berakhir.');
    };
    const onContextMenu=event=>{event.preventDefault();report('context_menu','Menu konteks diblokir di halaman ujian.');};
    const onKeyDown=event=>{
      // F5: silent intercept — no violation, no reload. Reload exits fullscreen before
      // fullscreenchange fires, breaking monitoring. Use "Refresh Jaringan" button instead.
      if(event.key==='F5'){event.preventDefault();return;}
      const key=event.key.toLowerCase(),command=event.ctrlKey||event.metaKey;
      const blocked=(command&&['t','n','w','r','p','s','u','h','j','l','k','f'].includes(key))||
        (command&&event.shiftKey&&['i','j','c','n','m','p'].includes(key))||
        event.key==='F11'||event.key==='F12'||
        (event.altKey&&['ArrowLeft','ArrowRight'].includes(event.key));
      if(blocked){event.preventDefault();report('blocked_shortcut',`Pintasan ${event.key} dicegah oleh halaman.`);}
    };
    const onClipboard=event=>{event.preventDefault();report('clipboard','Percobaan salin atau tempel di halaman ujian.');};
    document.addEventListener('visibilitychange',onVisibility);window.addEventListener('blur',onBlur);
    document.addEventListener('fullscreenchange',onFullscreen);document.addEventListener('contextmenu',onContextMenu);
    document.addEventListener('copy',onClipboard);document.addEventListener('cut',onClipboard);document.addEventListener('paste',onClipboard);
    document.addEventListener('keydown',onKeyDown);
    return()=>{document.removeEventListener('visibilitychange',onVisibility);window.removeEventListener('blur',onBlur);
      document.removeEventListener('fullscreenchange',onFullscreen);document.removeEventListener('contextmenu',onContextMenu);
      document.removeEventListener('copy',onClipboard);document.removeEventListener('cut',onClipboard);document.removeEventListener('paste',onClipboard);
      document.removeEventListener('keydown',onKeyDown);};
  },[session.id,session.status]);

  const requestFullscreen=async()=>{
    try{await document.documentElement.requestFullscreen?.();setFullscreenLost(!document.fullscreenElement);}
    catch{setError('Browser menolak mode layar penuh. Coba tombol kembali ke layar penuh.');}
  };
  const insertArabic=character=>{
    const element=textareaRef.current;
    if(!element||question?.type!=='essay')return;
    const start=element.selectionStart,end=element.selectionEnd,current=String(answers[question.id]||'');
    const next=current.slice(0,start)+character+current.slice(end);saveAnswer(question.id,next);
    requestAnimationFrame(()=>{element.focus();element.setSelectionRange(start+character.length,start+character.length);});
  };
  const insertCombiningMark=mark=>{
    const element=textareaRef.current;
    if(!element||question?.type!=='essay')return;
    const start=element.selectionStart,end=element.selectionEnd,current=String(answers[question.id]||'');
    let insertion=start;
    while(insertion<end&&/[\u064B-\u065F\u0670]/.test(current[insertion]))insertion++;
    const next=current.slice(0,insertion)+mark+current.slice(end);saveAnswer(question.id,next);
    requestAnimationFrame(()=>{element.focus();element.setSelectionRange(insertion+mark.length,insertion+mark.length);});
  };
  const deletePrevious=()=>{
    const element=textareaRef.current;
    if(!element||question?.type!=='essay')return;
    const start=element.selectionStart,end=element.selectionEnd,current=String(answers[question.id]||'');
    if(start===0&&end===0)return;
    const from=start===end?Math.max(0,start-1):start;
    const next=current.slice(0,from)+current.slice(end);saveAnswer(question.id,next);
    requestAnimationFrame(()=>{element.focus();element.setSelectionRange(from,from);});
  };
  const handleAnswerKeyDown=event=>{
    const key=event.key.toLowerCase();
    const mark=ARABIC_HARAKAT[key]||((event.key==='~'||event.code==='Backquote')?ARABIC_HARAKAT['~']:null);
    if(event.shiftKey&&mark){event.preventDefault();insertCombiningMark(mark);}
  };

  if(isFinished)return <div className="exam-screen"><div className={`exam-finished-card ${session.status==='locked'?'locked':''}`}>
    {session.status==='locked'?<AlertTriangle size={36}/>:<CheckCircle2 size={36}/>}<h1>{session.status==='locked'?'سُجِّلَتْ مُخَالَفَةٌ':'تم تسليم الاختبار'}</h1>
    <p>{session.status==='locked'?'Akses ujian dihentikan setelah batas pelanggaran terlampaui. Nilai akhir ditentukan guru.':`Nilai akhir guru: ${session.score??'menunggu input guru'}`}</p>
    <button onClick={onExit}>Kembali ke daftar ujian</button>
  </div></div>;

  return <div className="exam-screen">
    <header className="exam-top"><div className="exam-brand"><div><b>IMBS CBT · {session.title}</b><small>{user.name} · {user.className || session.studentClass || 'Siswa'}{session.grade ? ` (Kelas ${session.grade})` : ''} · {session.subject||'Ujian'}</small></div></div>
      <div className="exam-tools">
        <button type="button" className={`exam-probe-button ${isProbing?'probing':''}`} onClick={probeAndReconnect} title="Periksa dan hubungkan ulang jaringan ke server" style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 9px',fontSize:'12px',fontWeight:600,borderRadius:6,border:'1px solid #10b981',background:isProbing?'#ecfdf5':'#fff',color:'#047857',cursor:'pointer'}}>
          <RefreshCw size={13} className={isProbing?'spin':''} style={{animation:isProbing?'spin 1s linear infinite':'none'}}/>
          <span>{isProbing?'Memeriksa…':'Refresh Jaringan'}</span>
        </button>
        <div className={`exam-net ${online?'is-online':'is-offline'}`}>{online?<Wifi size={14}/>:<WifiOff size={14}/>}<span>{online?'Online':'Offline · tersimpan lokal'}</span></div>
        <div className="autosave-state"><Save size={13}/>{saveState}</div><div className={`exam-timer ${seconds<300?'timer-warning':''}`}><Clock3 size={15}/>{formatTime(seconds)}</div>
      </div>
    </header>
    <div className="exam-body"><aside className="exam-sidebar"><div className="exam-side-title"><b>Nomor soal</b><span>{answeredCount}/{questions.length} terjawab</span></div>
      <div className="question-map">{questions.map((item,i)=><button key={item.id} disabled={violationReviewRequired} className={`${index===i?'current':''} ${String(answers[item.id]||'').trim()?'answered':''}`} onClick={()=>setIndex(i)}>{i+1}</button>)}</div>
      <div className="map-legend"><span><i className="map-current"/>Nomor aktif</span><span><i className="map-done"/>Sudah dijawab</span></div>
      <div className="exam-student-info">
        <small>IDENTITAS PESERTA</small>
        <b>{user.name}</b>
        <b>{user.username}</b>
        <div className="exam-student-class-badge">
          <span>Kelas / Tingkat</span>
          <b>{user.className || session.studentClass || 'Siswa'}{session.grade ? ` · Kelas ${session.grade}` : ''}</b>
        </div>
      </div>
      <button className="exam-submit" disabled={!draftReady||busy||Boolean(storageError)||violationReviewRequired} onClick={()=>submitExam(false)}><Check size={15}/>{busy?'Menyinkronkan…':'Kumpulkan ujian'}</button>
    </aside>
    <main className="exam-question-area"><div className="exam-breadcrumb"><span>{session.subject||'Ujian'}</span><ChevronRight size={13}/><b>Soal {index+1} dari {questions.length}</b><span className="autosave-state">{online?'Jawaban disinkronkan otomatis':'Jawaban tersimpan lokal'}</span></div>
      {(error||storageError)&&<div className="exam-warning danger"><AlertTriangle size={15}/>{storageError||error}</div>}
      {!online&&<div className="exam-warning">
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',width:'100%',justifyContent:'space-between'}}>
          <span style={{display:'inline-flex',alignItems:'center',gap:6}}><WifiOff size={15}/>Koneksi terputus. Jawaban tetap aman tersimpan terenkripsi di IndexedDB perangkat.</span>
          <button type="button" className="retry-probe-button" disabled={isProbing} onClick={probeAndReconnect} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',fontSize:'12px',fontWeight:600,borderRadius:6,border:'1px solid #c97a18',background:'#fff',color:'#a5590c',cursor:'pointer'}}>
            <RefreshCw size={13} className={isProbing?'spin':''} style={{animation:isProbing?'spin 1s linear infinite':'none'}}/>
            <span>{isProbing?'Menghubungkan…':'Hubungkan Ulang Sekarang'}</span>
          </button>
        </div>
        {probeFeedback&&<div style={{marginTop:6,fontSize:'12px',fontWeight:600,color:'#258a63'}}>{probeFeedback}</div>}
      </div>}
      {online&&probeFeedback&&<div className="exam-warning" style={{borderColor:'#10b981',background:'#ecfdf5',color:'#065f46'}}><Check size={15}/>{probeFeedback}</div>}
      {violationReviewRequired&&<div className="exam-violation-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="violation-warning-title"><section className="exam-violation-dialog"><AlertTriangle size={30}/><h2 id="violation-warning-title">Ujian dijeda untuk peninjauan Admin</h2><p>{session.violationThreshold||2} pelanggaran atau sinyal pelanggaran telah mencapai ambang tinjauan. Ujian tidak dapat dilanjutkan sampai Admin memutuskan. Jika dinyatakan false positive, Anda dapat melanjutkan; jika dikonfirmasi, akses ujian akan diblokir.</p><small>Popup ini tidak dapat ditutup dari halaman siswa.</small></section></div>}
      {screenBlocked&&<div className="exam-security-overlay" role="alertdialog" aria-modal="true"><MonitorX size={42}/><h2>Terdeteksi layar kedua</h2><p>Cabut monitor atau proyektor kedua untuk membuka kembali ujian. Jawaban yang sudah tersimpan tetap aman.</p></div>}
      {fullscreenLost&&!screenBlocked&&<div className="exam-security-overlay fullscreen-shield" role="alertdialog" aria-modal="true"><ShieldCheck size={42}/><h2>Mode layar penuh berakhir</h2><p>Interaksi soal dijeda. Kembali ke mode layar penuh untuk melanjutkan.</p><button onClick={requestFullscreen}>العودة إلى ملء الشاشة</button></div>}
      {showSubmitModal&&<div className="exam-preflight-backdrop" role="presentation">
        <section className="exam-preflight" role="dialog" aria-modal="true" aria-labelledby="submit-modal-title">
          <button className="exam-preflight-close" onClick={()=>setShowSubmitModal(false)} aria-label="Tutup">×</button>
          <div className="preflight-icon"><CheckCircle2 size={24}/></div>
          <h2 id="submit-modal-title">Kumpulkan Ujian?</h2>
          <p>Anda sudah menjawab <b>{answeredCount}</b> dari <b>{questions.length}</b> soal.</p>
          {answeredCount<questions.length&&<div className="exam-warning" style={{marginTop:0,marginBottom:14}}>
            <AlertTriangle size={15}/><span>Perhatian: Masih ada <b>{questions.length-answeredCount}</b> soal yang belum dijawab.</span>
          </div>}
          <p style={{fontSize:'12px',color:'#6b7c72',marginBottom:0}}>Pastikan seluruh jawaban telah diperiksa. Setelah dikumpulkan, ujian akan diselesaikan dan jawaban tidak dapat diubah kembali.</p>
          <div className="preflight-actions" style={{marginTop:18}}>
            <button className="secondary" onClick={()=>setShowSubmitModal(false)} disabled={busy}>Periksa Kembali</button>
            <button className="portal-start" disabled={busy} onClick={()=>performSubmit(false)}>{busy?'Menyinkronkan…':<><Check size={14}/> Ya, Kumpulkan Ujian</>}</button>
          </div>
        </section>
      </div>}
      {question&&<>
        <article className="exam-question-card" lang={session.languageCode||'id'} dir={session.textDirection||'auto'}>
          {question.stimulus && (
            <section className="exam-stimulus-card" dir={session.textDirection||'auto'}>
              <div className="exam-stimulus-badge">
                <BookOpen size={13} />
                <span>BACAAN / WACANA</span>
              </div>
              {question.stimulus.title && <h2 className="exam-stimulus-title">{question.stimulus.title}</h2>}
              {question.stimulus.mediaUrl && (
                <figure className="exam-stimulus-media">
                  <img src={question.stimulus.mediaUrl} alt={question.stimulus.mediaAltText || 'Gambar wacana'} />
                </figure>
              )}
              {question.stimulus.content && (
                <div className="exam-stimulus-content" dir="auto">
                  <FormulaText>{question.stimulus.content}</FormulaText>
                </div>
              )}
              <div className="exam-stimulus-note">
                <CircleAlert size={14} />
                <span>
                  {session.languageCode === 'ar'
                    ? `ملاحظة: هذا النص/الصورة مستخدم للإجابة على الأسئلة رقم ${relatedPositions.join('، ')}`
                    : `Catatan: Bacaan/gambar di atas digunakan untuk menjawab Soal No. ${relatedPositions.join(', ')}`}
                </span>
              </div>
            </section>
          )}
          <div className="exam-question-meta">
            <span>{question.type==='complex_mc'?(session.languageCode==='ar'?'اختيار من متعدد معقد (حدد جميع الخيارات الصحيحة)':`Pilihan ganda kompleks (centang semua jawaban yang benar) · ${question.points} poin`):question.type==='mc'?('Pilihan ganda · '+question.points+' poin'):'Uraian · dinilai guru (0-100)'}</span>
            <span>{session.languageCode==='ar'?'سؤال '+(index+1):'Soal '+(index+1)}</span>
          </div>
          <h1 dir="auto"><FormulaText>{question.prompt}</FormulaText></h1>
          {question.media?.[0]&&<figure className="exam-question-media"><img src={question.media[0].url} alt={question.media[0].altText}/></figure>}
          {question.type==='complex_mc'?(
            <div className="answer-options complex-options" dir="auto">
              {(question.options||[]).map((option,i)=>{
                const label=String.fromCharCode(65+i);
                const currentAnswer=String(answers[question.id]||'');
                const chosenList=currentAnswer?currentAnswer.split(',').map(s=>s.trim()).filter(Boolean):[];
                const chosen=chosenList.includes(label);
                const toggleOption=()=>{
                  const nextList=chosen?chosenList.filter(l=>l!==label):[...chosenList,label];
                  nextList.sort();
                  saveAnswer(question.id,nextList.join(','));
                };
                return <div key={`${question.id}-${i}`} className={`complex-option-item${chosen?' selected':''}`}>
                  <input type="checkbox" className="sr-only" checked={chosen} onChange={toggleOption} />
                  <span className="option-letter">{chosen?<Check size={14} color="#fff"/>:label}</span>
                  <b className="option-text"><FormulaText>{option}</FormulaText></b>
                  {chosen&&<span className="option-selected">✓ Terpilih</span>}
                </div>;
              })}
            </div>
          ):question.type==='mc'?(
            <div className="answer-options" dir="auto">{(question.options||[]).map((option,i)=>{
              const label=String.fromCharCode(65+i),chosen=answers[question.id]===label;
              return <button key={`${question.id}-${i}`} className={chosen?'chosen':''} disabled={!draftReady||screenBlocked||fullscreenLost||Boolean(storageError)||violationReviewRequired} onClick={()=>saveAnswer(question.id,label)}><span>{label}</span><b><FormulaText>{option}</FormulaText></b>{chosen&&<Check size={17}/>}</button>;
            })}</div>
          ):<><textarea ref={textareaRef} className="essay-answer" dir="auto" value={answers[question.id]||''} disabled={!draftReady||screenBlocked||fullscreenLost||Boolean(storageError)||violationReviewRequired} onKeyDown={handleAnswerKeyDown} onChange={e=>saveAnswer(question.id,e.target.value)} placeholder={session.languageCode==='ar'?'اكتب إجابتك هنا…':'Tulis jawaban di sini…'}/>
            {session.languageCode==='ar'&&<div className="arabic-keyboard"><div className="keyboard-head"><b>لوحة المفاتيح العربية</b><button disabled={violationReviewRequired} onClick={()=>setShowKeyboard(!showKeyboard)}>{showKeyboard?'Sembunyikan':'Tampilkan'}</button></div>{showKeyboard&&!violationReviewRequired&&<ArabicKeyboard onInsert={insertArabic} onInsertMark={insertCombiningMark} onBackspace={deletePrevious} onEnter={()=>insertArabic('\n')}/>}</div>}</>}
        </article>
        <div className="exam-navigation"><button disabled={index===0||violationReviewRequired} onClick={()=>setIndex(x=>Math.max(0,x-1))}><ChevronLeft size={14}/>Sebelumnya</button><span>{answeredCount} dari {questions.length} soal terjawab</span><button className="next-question" disabled={index>=questions.length-1||violationReviewRequired} onClick={()=>setIndex(x=>Math.min(questions.length-1,x+1))}>Berikutnya<ChevronRight size={14}/></button></div>
      </>}
    </main></div>
    <div className="exam-watermark" aria-hidden="true">IMBS CBT Â· {user.name} ({user.username})</div>
  </div>;
}

const ARABIC_HARAKAT={q:'\u064e',e:'\u064f',a:'\u0650',x:'\u0652',w:'\u064b',r:'\u064c',s:'\u064d','`':'\u0651','~':'\u0651'};
const ARABIC_KEYBOARD_ROWS=[
  [{key:'`',label:'`',value:'\u0630'},...['1','2','3','4','5','6','7','8','9','0','-','='].map(key=>({key,label:key,value:key})),{special:'backspace',label:'⌫'}],
  [{special:'tab',label:'TAB'},...['q','w','e','r','t','y','u','i','o','p','[',']','\\'].map((key,index)=>({key,label:key,value:['\u0636','\u0635','\u062b','\u0642','\u0641','\u063a','\u0639','\u0647','\u062e','\u062d','\u062c','\u062f','\\'][index]}))],
  [{special:'caps',label:'CAPS'},...['a','s','d','f','g','h','j','k','l',';','\''].map((key,index)=>({key,label:key,value:['\u0634','\u0633','\u064a','\u0628','\u0644','\u0627','\u062a','\u0646','\u0645','\u0643','\u0637'][index]})),{special:'enter',label:'ENTER'}],
  [{special:'shift',label:'SHIFT'},...['z','x','c','v','b','n','m',',','.','/'].map((key,index)=>({key,label:key,value:['\u0626','\u0621','\u0624','\u0631','\u0644\u0627','\u0649','\u0629','\u0648','\u0632','\u0638'][index]})),{special:'shift',label:'SHIFT'}],
  [{special:'space',label:'SPACE'}],
];

function ArabicKeyboard({onInsert,onInsertMark,onBackspace,onEnter}){
  const [shiftActive,setShiftActive]=useState(false);
  const press=key=>{if(shiftActive&&ARABIC_HARAKAT[key])onInsertMark(ARABIC_HARAKAT[key]);else onInsert(key);};
  const pressSpecial=special=>{if(special==='backspace')onBackspace();else if(special==='enter')onEnter();else if(special==='tab')onInsert('\t');else if(special==='space')onInsert(' ');else if(special==='shift')setShiftActive(current=>!current);};
  return <div className={`arabic-keyboard-layout${shiftActive?' shift-active':''}`}>
    {ARABIC_KEYBOARD_ROWS.map((row,rowIndex)=><div className={`keyboard-row keyboard-row-${rowIndex+1}`} key={rowIndex}>{row.map((item,index)=>{
      const display=item.key&&shiftActive&&ARABIC_HARAKAT[item.key]?ARABIC_HARAKAT[item.key]:item.value||item.label;
      return <button type="button" className={`keyboard-key ${item.special||''}`} key={`${rowIndex}-${index}`} onClick={()=>item.special?pressSpecial(item.special):press(item.key)} aria-label={item.special||item.key}>
        {item.key&&<small>{item.label}</small>}<b>{display}</b>
      </button>;
    })}</div>)}
    <p className="arabic-keyboard-help">Gunakan Shift untuk harakat: Fathah Shift+Q, Dammah Shift+E, Kasrah Shift+A, Sukun Shift+X, Fathah Tanwin Shift+W, Dammah Tanwin Shift+R, Kasrah Tanwin Shift+S, Tasydid Shift+~.</p>
  </div>;
}

function portalStatus(sessionStatus,examStatus){
  if(sessionStatus==='locked')return 'TERKUNCI';
  if(sessionStatus==='completed')return 'SELESAI';
  if(sessionStatus==='in_progress')return 'SEDANG DIKERJAKAN';
  return examStatus==='active'?'TERSEDIA':'Menunggu jadwal';
}

function formatTime(value){const seconds=Math.max(0,Number(value)||0);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
