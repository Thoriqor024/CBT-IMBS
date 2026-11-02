import { useCallback, useEffect, useMemo, useState } from 'react';
import readXlsxFile from 'read-excel-file/browser';
import { exportResults } from './resultsExport.js';
import { exportItemAnalysis } from './itemAnalysisExport.js';
import { exportQuestionBank } from './questionBankExport.js';
import { LayoutDashboard, BookOpen, Users, ClipboardList, Database, ChartNoAxesColumn, BarChart3, Settings, Search, Bell, Plus, ChevronDown, MoreHorizontal, ArrowUpRight, Clock3, CircleCheck, CircleAlert, Sparkles, FileSpreadsheet, Shuffle, ChevronRight, X, Menu, GraduationCap, BookMarked, CalendarDays, Layers3, Check, Download, Upload, Eye, Trash2, ShieldCheck, Scale, Wifi, CircleHelp, LogOut, KeyRound, Play, Pause, LockKeyhole, RefreshCw, Pencil, Copy } from 'lucide-react';
import { api } from './api';
import { getInitialSchoolCode, saveLastSchoolCode } from './tenantDiscovery.js';
import StudentPortal from './StudentPortal.jsx';
import Monitor from './Monitor.jsx';
import MonitorDashboard from './MonitorDashboard.jsx';
import { QuestionBankBuilder, QuestionList } from './QuestionBankBuilder.jsx';
import SubjectCreateForm from './SubjectCreateForm.jsx';
import TeacherCreateForm from './TeacherCreateForm.jsx';
import ProfileEditForm from './ProfileEditForm.jsx';
import { downloadStudentImportTemplate } from './studentImportFormat.js';
import { downloadTeacherImportTemplate } from './teacherImportFormat.js';
import PlatformOwnerLogin from './PlatformOwnerLogin.jsx';

const nav=[['Ringkasan',LayoutDashboard],['Mata Pelajaran',BookMarked],['Bank Soal',BookOpen],['Siswa',Users],['Ujian',ClipboardList],['Pantau Ujian',Eye],['Hasil Ujian',ChartNoAxesColumn],['Analisis Soal',BarChart3]];
const DEFAULT_SETTINGS={schoolName:'IMBS Islamic School',academicYear:'2026/2027',semester:'Ganjil',classes:['VII A','VII B','VIII A','VIII B','IX A','IX B'],grades:['VII','VIII','IX'],defaultExamDurationMinutes:90,violationThreshold:2,mcWeightPercentage:50,essayWeightPercentage:50};
const copySettings=settings=>({...settings,classes:[...settings.classes],grades:[...settings.grades]});
const showDemoAccounts=import.meta.env.VITE_SHOW_DEMO_ACCOUNTS==='true';
const tenantLoginEnabled=import.meta.env.VITE_TENANCY_ENABLED==='true';
const parseCsv=text=>{const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'&&text[i+1]==='"'&&quoted){cell+='"';i++;}else if(c==='"')quoted=!quoted;else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}if(cell||row.length){row.push(cell);rows.push(row);}return rows;};
const IMAGE_ACCEPT='image/jpeg,image/png,image/webp';
const validQuestionImage=file=>!file||(['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size<=3*1024*1024);
function blankBankQuestion(type){return type==='mc'?{prompt:'',options:['','','',''],answerKey:'',points:'1',imageFile:null,imageAltText:'',stimulusIndex:null}:{prompt:'',rubric:'',points:'1',imageFile:null,imageAltText:'',stimulusIndex:null};}
function resizeBankQuestions(type,questions,count){return Array.from({length:count},(_,index)=>questions[index]||blankBankQuestion(type));}
function isBankQuestionFilled(question){return Boolean(question.prompt?.trim()||question.rubric?.trim()||question.answerKey?.trim()||question.options?.some(option=>option.trim())||question.imageFile||question.imageAltText?.trim()||(question.stimulusIndex!==null&&question.stimulusIndex!==undefined));}

export default function App(){
  const [subjectReturnModal,setSubjectReturnModal]=useState('');
  const [user,setUser]=useState(null),[booting,setBooting]=useState(true),[page,setPage]=useState('Ringkasan'),[mobile,setMobile]=useState(false),[modal,setModal]=useState(''),[toast,setToast]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [students,setStudents]=useState([]),[banks,setBanks]=useState([]),[subjects,setSubjects]=useState([]),[exams,setExams]=useState([]),[results,setResults]=useState([]),[dashboard,setDashboard]=useState({students:0,banks:0,exams:0,average:0}),[query,setQuery]=useState(''),[selectedBank,setSelectedBank]=useState(null),[questions,setQuestions]=useState([]),[selectedExam,setSelectedExam]=useState(null),[monitor,setMonitor]=useState([]),[monitorRefreshKey,setMonitorRefreshKey]=useState(0),[pinInfo,setPinInfo]=useState({available:false,issuedAt:null,expiresAt:null}),[pinValidityMinutes,setPinValidityMinutes]=useState('15'),[credentials,setCredentials]=useState([]),[selectedResult,setSelectedResult]=useState(null),[essayResponses,setEssayResponses]=useState([]),[releasedPin,setReleasedPin]=useState(''),[schoolSettings,setSchoolSettings]=useState(copySettings(DEFAULT_SETTINGS)),[settingsForm,setSettingsForm]=useState(copySettings(DEFAULT_SETTINGS));
  const [studentForm,setStudentForm]=useState({name:'',email:'',className:DEFAULT_SETTINGS.classes[0]}),[bankForm,setBankForm]=useState({subjectId:'',grade:DEFAULT_SETTINGS.grades[0],topic:'',mcCount:'0',essayCount:'0'}),[bankQuestions,setBankQuestions]=useState({mc:[],essay:[]}),[bankStimuli,setBankStimuli]=useState([]),[bankQuestionError,setBankQuestionError]=useState(''),[examForm,setExamForm]=useState({title:'',bankId:'',bankIds:[],className:DEFAULT_SETTINGS.classes[0],classNames:DEFAULT_SETTINGS.classes.slice(0,1),mcCount:1,essayCount:0,durationMinutes:DEFAULT_SETTINGS.defaultExamDurationMinutes});
  const [questionForm,setQuestionForm]=useState({type:'mc',prompt:'',options:['','','',''],answerKey:'',points:1,imageFile:null,imageAltText:''}),[questionFormError,setQuestionFormError]=useState('');
  const [teacherFormError,setTeacherFormError]=useState('');
  const [profileFormError,setProfileFormError]=useState('');
  const [teacherList,setTeacherList]=useState([]),[teacherToEdit,setTeacherToEdit]=useState(null),[subjectToEdit,setSubjectToEdit]=useState(null),[selectedAnalysisBankId,setSelectedAnalysisBankId]=useState(''),[analysisData,setAnalysisData]=useState(null),[analysisLoading,setAnalysisLoading]=useState(false);
  const isAdmin=user?.role==='admin';
  const isPengawas=user?.role==='pengawas';
  const isPlatformOwner=user?.role==='platform_owner';
  const canManageExamMonitoring=user?.role==='admin'||user?.role==='teacher'||user?.role==='pengawas';
  const canRecordExamViolation=user?.role==='admin'||user?.role==='teacher';
  const notify=message=>{setToast(message);setTimeout(()=>setToast(''),3000);};
  const loadItemAnalysis=useCallback(async(bankId)=>{if(!bankId){setAnalysisData(null);return;}setAnalysisLoading(true);try{const data=await api('/banks/'+bankId+'/analysis');setAnalysisData(data);}catch(err){setError(err.message);setAnalysisData(null);}finally{setAnalysisLoading(false);}},[]);
  const loadAll=useCallback(async()=>{if(!user)return;setError('');try{if(user.role==='pengawas'){setExams(await api('/exams'));setDashboard({students:0,banks:0,exams:0,average:0});setStudents([]);setBanks([]);setSubjects([]);setResults([]);return;}const [d,s,b,sub,e,r,settings]=await Promise.all([api('/dashboard'),api('/students'),api('/banks'),api('/subjects'),api('/exams'),api('/results'),api('/settings')]);setDashboard(d);setStudents(s);setBanks(b);setSubjects(sub);setExams(e);setResults(r);setSchoolSettings(settings);setSettingsForm(copySettings(settings));setStudentForm(f=>({...f,className:settings.classes.includes(f.className)?f.className:settings.classes[0]}));setBankForm(f=>({...f,subjectId:f.subjectId||String(sub.find(x=>x.name==='Bahasa Arab')?.id||sub[0]?.id||''),grade:settings.grades.includes(f.grade)?f.grade:settings.grades[0]}));setExamForm(f=>({...f,bankId:f.bankId||String(b.find(x=>x.subject==='Bahasa Arab')?.id||b[0]?.id||''),bankIds:f.bankIds?.length?f.bankIds:(b[0]?[b[0].id]:[]),className:settings.classes.includes(f.className)?f.className:settings.classes[0],classNames:f.classNames?.length?f.classNames.filter(c=>settings.classes.includes(c)):[settings.classes[0]]}));}catch(err){setError(err.message);}},[user]);
  useEffect(()=>{
    api('/auth/me').then(r=>{
      setUser(r.user);
      if(r.user?.role==='student')try{localStorage.setItem('imbs_cached_student',JSON.stringify(r.user));}catch{}
    }).catch(()=>{
      try{
        const cached=localStorage.getItem('imbs_cached_student');
        if(cached)setUser(JSON.parse(cached));
      }catch{}
    }).finally(()=>setBooting(false));
  },[]);
  useEffect(()=>{if(isPengawas)setPage('Ujian');},[isPengawas]);
  useEffect(()=>{if(user&&user.role!=='student')loadAll();},[user,loadAll]);
  useEffect(()=>{if(user?.role==='admin')api('/teachers').then(setTeacherList).catch(err=>setError(err.message));else setTeacherList([]);},[user]);
  useEffect(()=>{if(page==='Analisis Soal'&&banks.length){const target=selectedAnalysisBankId&&banks.some(b=>String(b.id)===String(selectedAnalysisBankId))?selectedAnalysisBankId:String(banks[0]?.id||'');if(target&&target!==selectedAnalysisBankId)setSelectedAnalysisBankId(target);if(target)loadItemAnalysis(target);}},[page,banks,selectedAnalysisBankId,loadItemAnalysis]);
  const run=async action=>{setBusy(true);setError('');try{return await action();}catch(err){setError(err.message);notify(err.message);return null;}finally{setBusy(false);}};
  const saveSettings=async()=>{const mc=Number(settingsForm.mcWeightPercentage),essay=Number(settingsForm.essayWeightPercentage);if(settingsForm.mcWeightPercentage===''||settingsForm.essayWeightPercentage===''||!Number.isInteger(mc)||!Number.isInteger(essay)||mc<0||mc>100||essay<0||essay>100||mc+essay!==100){notify('Bobot PG + Essay harus bilangan bulat 0-100 dan total 100.');return;}const payload={...settingsForm,defaultExamDurationMinutes:Number(settingsForm.defaultExamDurationMinutes),violationThreshold:Number(settingsForm.violationThreshold),mcWeightPercentage:mc,essayWeightPercentage:essay};const saved=await run(()=>api('/settings',{method:'PUT',body:JSON.stringify(payload)}));if(saved){setSchoolSettings(saved);setSettingsForm(copySettings(saved));setStudentForm(form=>({...form,className:saved.classes.includes(form.className)?form.className:saved.classes[0]}));setBankForm(form=>({...form,grade:saved.grades.includes(form.grade)?form.grade:saved.grades[0]}));setExamForm(form=>({...form,className:saved.classes.includes(form.className)?form.className:saved.classes[0]}));notify('Pengaturan sekolah berhasil disimpan dan dicatat di audit.');}};
  const openExamCreate=()=>{setExamForm(form=>({...form,className:schoolSettings.classes[0],classNames:form.classNames?.length?form.classNames:[schoolSettings.classes[0]],bankIds:form.bankIds?.length?form.bankIds:(banks[0]?[banks[0].id]:[]),durationMinutes:schoolSettings.defaultExamDurationMinutes}));setModal('exam');};
  const openBankCreate=()=>{setBankStimuli([]);setModal('bank');};
  const openModal=name=>name==='exam'?openExamCreate():name==='bank'?openBankCreate():setModal(name);
  const login=async(e,credentials)=>{e?.preventDefault();setBusy(true);setError('');try{const platformOwner=credentials.platformOwner===true;const path=platformOwner?'/platform/auth/login':'/auth/login';const payload=platformOwner?{email:credentials.email,password:credentials.password}:tenantLoginEnabled?credentials:{username:credentials.username,password:credentials.password};const r=await api(path,{method:'POST',body:JSON.stringify(payload)});if(payload.schoolCode)saveLastSchoolCode(payload.schoolCode);if(r.user?.role==='student')try{localStorage.setItem('imbs_cached_student',JSON.stringify(r.user));}catch{}setUser(r.user);}catch(err){setError(err.message);}finally{setBusy(false);}};
  const logout=async()=>{await api('/auth/logout',{method:'POST'}).catch(()=>{});try{localStorage.removeItem('imbs_cached_student');localStorage.removeItem('imbs_active_exam_session');}catch{}setUser(null);setPage('Ringkasan');};
  const saveOwnProfile=async changes=>{setProfileFormError('');setBusy(true);try{const result=await api('/account/profile',{method:'PUT',body:JSON.stringify(changes)});setUser(current=>current?{...current,...result}:current);setModal('');notify(result.passwordChanged?'Profil diperbarui. Sesi login lain telah dicabut.':'Nama profil diperbarui.');}catch(err){setProfileFormError(err.message||'Profil tidak dapat diperbarui.');}finally{setBusy(false);}};
  const addStudent=async()=>{const r=await run(()=>api('/students',{method:'POST',body:JSON.stringify(studentForm)}));if(r){setCredentials([r]);setStudentForm({name:'',email:'',className:schoolSettings.classes[0]});setModal('credentials');await loadAll();notify('Akun siswa dibuat. Simpan token sekarang; token tidak bisa dibaca ulang.');}};
  const importStudents=async file=>{if(!file)return;await run(async()=>{let rows;if(file.name.toLowerCase().endsWith('.csv'))rows=parseCsv(await file.text());else {const sheets=await readXlsxFile(file);rows=Array.isArray(sheets?.[0]?.data)?sheets[0].data:sheets;}if(rows.length<2)throw new Error('File belum berisi baris siswa.');const headers=rows[0].map(x=>String(x).toLowerCase().trim());const ni=headers.findIndex(x=>['nama','nama siswa','name'].includes(x)),ei=headers.findIndex(x=>['email','email siswa'].includes(x)),ci=headers.findIndex(x=>['kelas','class'].includes(x));if(ni<0||ci<0)throw new Error('Header wajib berisi nama siswa dan kelas.');const mapped=rows.slice(1).filter(x=>String(x[ni]||'').trim()).map(x=>({name:String(x[ni]).trim(),email:ei>=0?String(x[ei]||'').trim():'',className:String(x[ci]||'').trim()}));if(!mapped.length)throw new Error('Tidak ada nama siswa valid di file.');const r=await api('/students/import',{method:'POST',body:JSON.stringify({rows:mapped})});setCredentials(r.students);setModal('credentials');await loadAll();notify(`${r.students.length} siswa diimpor; unduh token sebelum menutup dialog.`);});};
  const importTeachers=async file=>{if(!file)return;await run(async()=>{let rows;if(file.name.toLowerCase().endsWith('.csv'))rows=parseCsv(await file.text());else {const sheets=await readXlsxFile(file);rows=Array.isArray(sheets?.[0]?.data)?sheets[0].data:sheets;}if(rows.length<2)throw new Error('File belum berisi baris guru.');const headers=rows[0].map(x=>String(x).toLowerCase().trim());const ni=headers.findIndex(x=>['nama','name'].includes(x)),ui=headers.findIndex(x=>['username','username akses'].includes(x)),pi=headers.findIndex(x=>['password','kata sandi','sandi'].includes(x)),ci=headers.findIndex(x=>['kelas','class'].includes(x)),si=headers.findIndex(x=>['mata pelajaran','subject','mapel'].includes(x)),ei=headers.findIndex(x=>['email','email guru'].includes(x));if(ni<0||ui<0||pi<0||ci<0||si<0)throw new Error('Header wajib berisi nama, username, password, kelas, dan mata pelajaran.');const mapped=rows.slice(1).filter(x=>String(x[ni]||'').trim()&&String(x[ui]||'').trim()&&String(x[pi]||'').trim()).map(x=>({name:String(x[ni]).trim(),username:String(x[ui]).trim(),password:String(x[pi]).trim(),className:String(x[ci]||'').trim(),subjectName:String(x[si]||'').trim(),email:ei>=0?String(x[ei]||'').trim():undefined}));if(!mapped.length)throw new Error('Tidak ada guru valid di file.');const r=await api('/teachers/import',{method:'POST',body:JSON.stringify({rows:mapped})});setTeacherList(current=>[...r.teachers,...current]);setModal('');await loadAll();notify(`${r.teachers.length} guru diimpor.`);});};
  const setBankQuestionCount=(type,value)=>{const field=type==='mc'?'mcCount':'essayCount';setBankForm(form=>({...form,[field]:value}));if(value===''||!/^\d+$/.test(value))return;const count=Number(value);if(count>1000)return;const current=bankQuestions[type];if(count<current.length&&current.slice(count).some(isBankQuestionFilled)&&!window.confirm(`${current.length-count} form yang sudah berisi akan dihapus. Lanjutkan?`)){setBankForm(form=>({...form,[field]:String(current.length)}));return;}setBankQuestions(currentQuestions=>({...currentQuestions,[type]:resizeBankQuestions(type,currentQuestions[type],count)}));setBankQuestionError('');};
  const updateBankQuestion=(type,index,changes)=>setBankQuestions(current=>({...current,[type]:current[type].map((question,i)=>i===index?{...question,...changes}:question)}));
  const applyImportedQuestions=({mc,essay,stimuli=[]})=>{const hasContent=[...bankQuestions.mc,...bankQuestions.essay].some(isBankQuestionFilled)||bankStimuli.length>0;if(hasContent&&!window.confirm('Soal yang sudah diisi akan diganti dengan hasil import. Lanjutkan?'))return false;setBankStimuli((stimuli||[]).map(s=>({title:s.title||'',content:s.content||''})));setBankQuestions({mc:mc.map(question=>({...question,stimulusIndex:question.stimulusIndex??null,points:String(question.points),imageFile:null,imageAltText:''})),essay:essay.map(question=>({...question,stimulusIndex:question.stimulusIndex??null,points:String(question.points),imageFile:null,imageAltText:''}))});setBankForm(form=>({...form,mcCount:String(mc.length),essayCount:String(essay.length)}));setBankQuestionError('');return true;};
  const sendQuestionImage=async(questionId,file,altText)=>{const formData=new FormData();formData.append('image',file);formData.append('altText',altText.trim());return api('/questions/'+questionId+'/media',{method:'POST',body:formData});};
  const addBank=async()=>{setBankQuestionError('');const mcCount=Number(bankForm.mcCount),essayCount=Number(bankForm.essayCount),drafts=[...bankQuestions.mc.map(question=>({...question,type:'mc',answerKey:question.answerKey,options:question.options})),...bankQuestions.essay.map(question=>({...question,type:'essay',answerKey:question.rubric,options:[]}))],questions=drafts.map(({imageFile,imageAltText,...question})=>question);if(!bankForm.subjectId||!bankForm.topic.trim()){setBankQuestionError('Pilih mata pelajaran dan isi topik/materi.');return;}if(!Number.isInteger(mcCount)||!Number.isInteger(essayCount)||mcCount<0||essayCount<0||mcCount+essayCount<1||mcCount+essayCount>1000||bankQuestions.mc.length!==mcCount||bankQuestions.essay.length!==essayCount){setBankQuestionError('Jumlah PG dan essay harus berupa bilangan bulat dengan total 1–1.000 soal.');return;}for(let i=0;i<bankStimuli.length;i++){if(!bankStimuli[i]?.title?.trim()){setBankQuestionError(`Wacana ${i+1}: judul wacana/cerita wajib diisi.`);return;}}for(let i=0;i<drafts.length;i++){const q=drafts[i],label=q.type==='mc'?'PG '+(i+1):'Essay '+(i+1);if(q.imageFile&&(!validQuestionImage(q.imageFile)||!q.imageAltText.trim())){setBankQuestionError(label+': gambar harus JPG, PNG, atau WebP maksimal 3 MB dan deskripsinya wajib diisi.');return;}}for(let i=0;i<bankQuestions.mc.length;i++){const q=bankQuestions.mc[i];if(!q.prompt.trim()){setBankQuestionError('PG '+(i+1)+': isi pertanyaan.');return;}if(q.options.some(option=>!option.trim())){setBankQuestionError('PG '+(i+1)+': lengkapi opsi A sampai D.');return;}if(!['A','B','C','D'].includes(q.answerKey)||!q.options['ABCD'.indexOf(q.answerKey)]?.trim()){setBankQuestionError('PG '+(i+1)+': pilih kunci jawaban yang memiliki opsi.');return;}if(!Number.isFinite(Number(q.points))||Number(q.points)<=0){setBankQuestionError('PG '+(i+1)+': bobot harus lebih besar dari 0.');return;}}for(let i=0;i<bankQuestions.essay.length;i++){const q=bankQuestions.essay[i];if(!q.prompt.trim()){setBankQuestionError('Essay '+(i+1)+': isi pertanyaan.');return;}if(!q.rubric.trim()){setBankQuestionError('Essay '+(i+1)+': isi rubrik atau panduan koreksi.');return;}if(!Number.isFinite(Number(q.points))||Number(q.points)<=0){setBankQuestionError('Essay '+(i+1)+': bobot harus lebih besar dari 0.');return;}}const result=await run(()=>api('/banks',{method:'POST',body:JSON.stringify({subjectId:bankForm.subjectId,grade:bankForm.grade,topic:bankForm.topic,questions,stimuli:bankStimuli})}));if(!result)return;const failed=[];let pgNumber=0,essayNumber=0;for(let i=0;i<drafts.length;i++){const q=drafts[i],number=q.type==='mc'?++pgNumber:++essayNumber;if(!q.imageFile)continue;try{await sendQuestionImage(result.questionIds[i],q.imageFile,q.imageAltText);}catch(error){failed.push((q.type==='mc'?'PG ':'Essay ')+number+': '+error.message);}}const subject=subjects.find(item=>String(item.id)===String(bankForm.subjectId));setBankForm(form=>({...form,topic:'',mcCount:'0',essayCount:'0'}));setBankQuestions({mc:[],essay:[]});setBankStimuli([]);await loadAll();if(failed.length){setSelectedBank({id:result.id,subject:subject?.name||'Mata pelajaran',grade:bankForm.grade,topic:bankForm.topic});setQuestions(await api('/banks/'+result.id+'/questions'));setModal('questions');notify('Bank tersimpan. Sebagian gambar gagal diunggah; unggah ulang dari daftar soal. '+failed.join(' '));}else{setModal('');notify(questions.length+' soal tersimpan dalam bank.');}};
  const addSubject=()=>{setSubjectToEdit(null);setSubjectReturnModal('bank');setModal('subject');};
  const addSubjectStandalone=()=>{setSubjectToEdit(null);setSubjectReturnModal('');setModal('subject');};
  const editSubject=subject=>{setSubjectToEdit(subject);setSubjectReturnModal('');setModal('subject');};
  const updateSubject=async subject=>{const result=await run(()=>api('/subjects/'+subject.id,{method:'PUT',body:JSON.stringify({name:subject.name,languageCode:subject.languageCode,textDirection:subject.textDirection})}));if(result){await loadAll();setSubjectToEdit(null);setModal('');notify('Mata pelajaran berhasil diperbarui.');}};
  const deleteSubject=async subject=>{if(!window.confirm(`Hapus mata pelajaran "${subject.name}"? Tindakan ini tidak dapat dibatalkan.`))return;const result=await run(()=>api('/subjects/'+subject.id,{method:'DELETE'}));if(result){await loadAll();notify('Mata pelajaran berhasil dihapus.');}};
  const createTeacher=async teacher=>{setTeacherFormError('');setBusy(true);try{const result=await api('/teachers',{method:'POST',body:JSON.stringify(teacher)});setTeacherList(current=>[result,...current]);setModal('');notify('Akun staf dibuat. Username akses: '+result.username);}catch(err){setTeacherFormError(err.message||'Akun staf tidak dapat dibuat.');}finally{setBusy(false);}};
  const updateTeacherAccess=async changes=>{setTeacherFormError('');setBusy(true);try{const result=await api('/teachers/'+changes.id+'/access',{method:'PUT',body:JSON.stringify(changes)});setTeacherList(current=>current.map(teacher=>String(teacher.id)===String(result.id)?{...teacher,...result}:teacher));setTeacherToEdit(null);setModal('');notify('Akses guru diperbarui.');}catch(err){setTeacherFormError(err.message||'Akses guru tidak dapat diperbarui.');}finally{setBusy(false);}};
  const deleteTeacher=async teacher=>{if(!window.confirm(`Hapus akun guru ${teacher.name} (${teacher.username})? Akses login akan dicabut. Data soal, ujian, jawaban, dan nilai tetap disimpan. Tindakan ini tidak dapat dibatalkan.`))return;const result=await run(()=>api(`/teachers/${teacher.id}`,{method:'DELETE'}));if(result){setTeacherList(current=>current.filter(item=>String(item.id)!==String(teacher.id)));notify('Akun guru dihapus dan seluruh sesi login dicabut.');}};
  const saveSubject=async subject=>{const result=await run(()=>api('/subjects',{method:'POST',body:JSON.stringify(subject)}));if(result){await loadAll();setBankForm(form=>({...form,subjectId:String(result.id)}));setSubjectToEdit(null);setModal(subjectReturnModal);notify('Mata pelajaran ditambahkan.');}};
  const openQuestions=async bank=>{setSelectedBank(bank);const result=await run(()=>api('/banks/'+bank.id+'/questions'));if(result){setQuestions(result);setModal('questions');}};
  const exportBank=async bank=>{const result=await run(()=>api('/banks/'+bank.id+'/questions'));if(result)exportQuestionBank(bank,result);};
  const refreshQuestions=async()=>{if(!selectedBank)return;const result=await api('/banks/'+selectedBank.id+'/questions');setQuestions(result);};
  const uploadQuestionMedia=async(questionId,file,altText)=>{if(!altText.trim()){notify('Isi deskripsi gambar sebelum mengunggah.');return;}if(!validQuestionImage(file)){notify('Gunakan gambar JPG, PNG, atau WebP maksimal 3 MB.');return;}const result=await run(()=>sendQuestionImage(questionId,file,altText));if(result){await refreshQuestions();notify('Gambar soal tersimpan.');}};
  const deleteQuestionMedia=async(mediaId)=>{if(!window.confirm('Hapus gambar pendukung soal ini?'))return;const result=await run(()=>api('/question-media/'+mediaId,{method:'DELETE'}));if(result){await refreshQuestions();notify('Gambar soal dihapus.');}};
  const deleteQuestion=async question=>{if(!window.confirm(`Hapus soal ini dari bank "${selectedBank?.topic}"? Tindakan ini tidak dapat dibatalkan.`))return;const result=await run(()=>api('/questions/'+question.id,{method:'DELETE'}));if(result){await refreshQuestions();await loadAll();notify('Soal dihapus dari bank.');}};
  const addQuestion=async()=>{setQuestionFormError('');if(questionForm.imageFile&&Number(selectedBank?.examCount)>0){setQuestionFormError('Gambar soal harus disiapkan sebelum bank dijadwalkan.');return;}if(!questionForm.prompt.trim()){setQuestionFormError('Pertanyaan wajib diisi.');return;}if(questionForm.imageFile&&(!validQuestionImage(questionForm.imageFile)||!questionForm.imageAltText.trim())){setQuestionFormError('Gambar harus JPG, PNG, atau WebP maksimal 3 MB dan deskripsinya wajib diisi.');return;}if(questionForm.type==='mc'&&(questionForm.options.some(option=>!option.trim())||!['A','B','C','D'].includes(questionForm.answerKey)||!questionForm.options['ABCD'.indexOf(questionForm.answerKey)]?.trim())){setQuestionFormError('Lengkapi opsi A–D dan pilih kunci jawaban yang terisi.');return;}if(questionForm.type==='essay'&&!questionForm.answerKey.trim()){setQuestionFormError('Rubrik atau panduan koreksi wajib diisi.');return;}if(!Number.isFinite(Number(questionForm.points))||Number(questionForm.points)<=0){setQuestionFormError('Bobot harus lebih besar dari 0.');return;}const {imageFile,imageAltText,...payload}=questionForm;const result=await run(()=>api('/banks/'+selectedBank.id+'/questions',{method:'POST',body:JSON.stringify(payload)}));if(result){let mediaError='';if(imageFile){try{await sendQuestionImage(result.id,imageFile,imageAltText);}catch(error){mediaError=error.message;}}await refreshQuestions();setQuestionForm({type:'mc',prompt:'',options:['','','',''],answerKey:'',points:1,imageFile:null,imageAltText:''});setModal('questions');notify(mediaError?'Soal tersimpan, tetapi gambar gagal diunggah: '+mediaError:'Butir soal tersimpan.');}};
  const createExam=async()=>{const payload={...examForm,bankId:examForm.bankIds?.[0]||examForm.bankId,className:(examForm.classNames||[]).join(', ')||examForm.className};const r=await run(()=>api('/exams',{method:'POST',body:JSON.stringify(payload)}));if(r){setModal('');await loadAll();notify(`Rancangan ujian dibuat untuk ${r.participants} siswa. Soal telah diacak per peserta.`);}};
  const setExamStatus=async(exam,status)=>{const r=await run(()=>api(`/exams/${exam.id}/status`,{method:'PATCH',body:JSON.stringify({status})}));if(r){await loadAll();notify(`Status ujian: ${status}`);}};
  const openMonitor=async exam=>{setSelectedExam(exam);setReleasedPin('');const m=await run(()=>api(`/exams/${exam.id}/monitor`));if(m){setMonitor(m.students);setPinInfo(m.pin);setModal('monitor');}};
  const refreshMonitor=async()=>{if(!selectedExam)return;try{const m=await api(`/exams/${selectedExam.id}/monitor`);setMonitor(m.students);setPinInfo(m.pin);}catch(err){setError(err.message);}};
  const releaseExamPin=async()=>{if(!selectedExam)return;const validityMinutes=Number(pinValidityMinutes);if(!Number.isSafeInteger(validityMinutes)||validityMinutes<1||validityMinutes>2147483647){setError('Masa berlaku PIN harus berupa bilangan bulat menit yang positif.');return;}setBusy(true);setError('');try{const result=await api(`/exams/${selectedExam.id}/pin`,{method:'POST',body:JSON.stringify({validityMinutes})});setReleasedPin(result.pin);setPinInfo({available:true,issuedAt:result.issuedAt,expiresAt:result.expiresAt});notify('PIN diterbitkan. Sampaikan langsung kepada peserta; PIN lama sudah tidak berlaku.');}catch(err){setError(err.message);}finally{setBusy(false);}};
  const openEssayReview=async result=>{setSelectedResult(result);const q=await run(()=>api(`/results/${result.examId}/${result.studentId}/essays`));if(q){setEssayResponses(q);setModal('essay-review');}};
  const saveEssayGrade=async(questionId,score)=>{const r=await run(()=>api('/results/'+selectedResult.examId+'/'+selectedResult.studentId+'/essays/'+questionId,{method:'PUT',body:JSON.stringify({score:Number(score)})}));if(r){setEssayResponses(await api('/results/'+selectedResult.examId+'/'+selectedResult.studentId+'/essays'));await loadAll();notify(r.finalScore!==null&&r.finalScore!==undefined?`Nilai essay tersimpan. Nilai akhir dihitung otomatis: ${formatPoints(r.finalScore)}`:'Nilai essay tersimpan.');}};
  const saveFinalScore=async(result,score)=>{const r=await run(()=>api('/results/'+result.examId+'/'+result.studentId+'/final-score',{method:'PUT',body:JSON.stringify({score:Number(score)})}));if(r){await loadAll();notify('Nilai akhir tersimpan.');}};
  const refreshMonitorData=async()=>{const m=await api(`/exams/${selectedExam.id}/monitor`);setMonitor(m.students);setPinInfo(m.pin);};
  const recordViolation=async student=>{const examId=student.examId||selectedExam?.id;if(!examId)return;const reason=window.prompt(`Catatan pelanggaran untuk ${student.name}:`,'Perlu ditinjau pengawas');if(reason===null)return;const r=await run(()=>api(`/exams/${examId}/monitor/${student.id}/violation`,{method:'POST',body:JSON.stringify({reason})}));if(r){if(selectedExam?.id===examId)await refreshMonitorData();setMonitorRefreshKey(key=>key+1);await loadAll();notify(`Pelanggaran ${student.name} dicatat. Indikator diperbarui.`);}};
  const reviewViolationEvent=async(student,event,decision)=>{const examId=student.examId||selectedExam?.id;if(!examId)return;const action=decision==='confirm'?'konfirmasi sebagai pelanggaran':'tandai sebagai false positive';const reason=window.prompt(`Alasan untuk ${action} pada ${student.name}:`);if(reason===null)return;const r=await run(()=>api(`/exams/${examId}/monitor/${student.id}/events/${event.id}/review`,{method:'POST',body:JSON.stringify({decision,reason})}));if(r){if(selectedExam?.id===examId)await refreshMonitorData();setMonitorRefreshKey(key=>key+1);await loadAll();notify(decision==='confirm'?'Insiden dikonfirmasi dan dicatat.':'Sinyal ditandai sebagai false positive.');}};
  const reviewViolationSession=async(student,decision)=>{const examId=student.examId||selectedExam?.id;if(!examId)return;const action=decision==='block'?'konfirmasi blokir':'menandai false positive';const reason=window.prompt(`Alasan untuk ${action} pada ${student.name}:`);if(reason===null)return;const r=await run(()=>api(`/exams/${examId}/monitor/${student.id}/decision`,{method:'POST',body:JSON.stringify({decision,reason})}));if(r){if(selectedExam?.id===examId)await refreshMonitorData();setMonitorRefreshKey(key=>key+1);await loadAll();notify(decision==='block'?'Akses ujian siswa diblokir.':'False positive dicatat; siswa dapat melanjutkan ujian.');}};
  const resetStudentSession=async student=>{const examId=student.examId||selectedExam?.id;if(!examId)return;const reason=window.prompt(`Alasan memulihkan sesi ${student.name}:`);if(reason===null)return;const r=await run(()=>api(`/exams/${examId}/monitor/${student.id}/reset`,{method:'POST',body:JSON.stringify({reason})}));if(r){if(selectedExam?.id===examId)await refreshMonitorData();setMonitorRefreshKey(key=>key+1);await loadAll();notify(`Sesi ${student.name} dipulihkan; pengawasannya tetap aktif.`);}};
  const deleteStudent=async student=>{if(!window.confirm(`Hapus akun ${student.name} (${student.username})? Semua sesi ujian, jawaban, nilai, dan log pelanggaran siswa ini ikut terhapus permanen. Sesi login juga dicabut. Tindakan ini tidak dapat dibatalkan.`))return;const r=await run(()=>api(`/students/${student.id}`,{method:'DELETE'}));if(r){await loadAll();notify(`Akun siswa dihapus bersama ${r.deleted.sessions} sesi ujian, ${r.deleted.responses} jawaban, dan ${r.deleted.violations} log pelanggaran.`);}};
  const deleteExam=async exam=>{if(exam.status==='active'||exam.in_progress>0){notify('Akhiri ujian dan pastikan tidak ada peserta yang sedang mengerjakan sebelum menghapus.');return;}const message=`Hapus ujian "${exam.title}" untuk kelas ${exam.className}? ${exam.participants} sesi peserta akan ikut dihapus, termasuk jawaban, nilai, dan log pelanggaran. Tindakan ini tidak dapat dibatalkan.`;if(!window.confirm(message))return;const result=await run(()=>api(`/exams/${exam.id}`,{method:'DELETE'}));if(result){await loadAll();notify(`Ujian dihapus bersama ${result.deleted.sessions} sesi dan ${result.deleted.responses} jawaban.`);}};
  const deleteBank=async bank=>{const examCount=Number(bank.examCount)||0,sessionCount=Number(bank.sessionCount)||0;const message=`Hapus bank soal "${bank.subject} · ${bank.topic}" kelas ${bank.grade}? ${bank.count} soal, ${examCount} jadwal ujian, dan ${sessionCount} sesi peserta akan ikut dihapus, termasuk jawaban, nilai, dan log pelanggaran. Tindakan ini tidak dapat dibatalkan.`;if(!window.confirm(message))return;const result=await run(()=>api(`/banks/${bank.id}`,{method:'DELETE'}));if(result){if(selectedBank?.id===bank.id)setModal('');await loadAll();notify(`Bank soal dihapus bersama ${result.deleted.exams} ujian dan ${result.deleted.sessions} sesi.`);}};
  const visibleStudents=useMemo(()=>students.filter(s=>(s.name+s.username+s.className).toLowerCase().includes(query.toLowerCase())),[students,query]);
  const downloadCredentials=()=>{const headers=tenantLoginEnabled?'nama,email,username,password awal,kelas\n':'nama,username,token,kelas\n';const content=headers+credentials.map(x=>(tenantLoginEnabled?[x.name,x.email,x.username,x.token,x.className]:[x.name,x.username,x.token,x.className]).map(v=>`"${String(v||'').replaceAll('"','""')}"`).join(',')).join('\n')+'\n';const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));a.download='kredensial-siswa-imbs.csv';a.click();URL.revokeObjectURL(a.href);};
  if(booting)return <div className="loading-screen"><div className="brand-mark"><GraduationCap/></div><span>Memuat ruang kerja IMBS...</span></div>;
  if(!user&&window.location.pathname==='/platform')return <PlatformOwnerLogin onLogin={login} busy={busy} error={error}/>;
  if(!user)return <><Login onLogin={login} busy={busy} error={error} tenancyEnabled={tenantLoginEnabled}/><a href="/platform" className="text-button" style={{position:'fixed',left:'50%',bottom:16,transform:'translateX(-50%)',zIndex:20}}>Masuk sebagai pemilik platform</a></>;
  if(user.role==='platform_owner')return <PlatformOwnerConsole user={user} onLogout={logout}/>;
  if(user.role==='student')return <StudentPortal user={user} onLogout={logout}/>;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <GraduationCap size={21} />
          </div>
          <div>
            <b>
              IMBS<span> CBT</span>
            </b>
            <small>INTEGRATED EXAM SYSTEM</small>
          </div>
          <button className="mobile-close" onClick={() => setMobile(false)}>
            <X size={18} />
          </button>
        </div>
        <div className="school-chip">
          <div className="school-avatar">
            {schoolSettings.schoolName.trim().charAt(0).toUpperCase() || "I"}
          </div>
          <div>
            <strong>{schoolSettings.schoolName}</strong>
            <small>Academic workspace</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-caption">MENU UTAMA</div>
        <nav>
          {nav
            .filter(
              ([name]) =>
                (name === "Ujian" || name === "Pantau Ujian" || !isPengawas) &&
                (name !== "Siswa" || isAdmin) &&
                (name !== "Pantau Ujian" || canManageExamMonitoring),
            )
            .map(([name, Icon]) => (
              <button
                key={name}
                className={`nav-item ${page === name ? "selected" : ""}`}
                onClick={() => {
                  setPage(name);
                  setMobile(false);
                  setQuery("");
                }}
              >
                <Icon size={18} />
                <span>{name}</span>
                {name === "Siswa" && (
                  <i className="nav-count">{students.length}</i>
                )}
              </button>
            ))}
        </nav>
        {isAdmin && (
          <>
            <div className="nav-caption manage-caption">PENGELOLAAN</div>
            <button
              className={
                "nav-item " + (page === "Pengaturan" ? "selected" : "")
              }
              onClick={() => {
                setPage("Pengaturan");
                setMobile(false);
                setQuery("");
              }}
            >
              <Settings size={18} />
              <span>Pengaturan</span>
            </button>
            <button
              className={
                "nav-item " + (page === "Akun staf" ? "selected" : "")
              }
              onClick={() => {
                setPage("Akun staf");
                setMobile(false);
                setQuery("");
              }}
            >
              <GraduationCap size={18} />
              <span>Akun staf</span>
            </button>
          </>
        )}
        <div className="sidebar-bottom">
          {showDemoAccounts && (
            <div className="help-card">
              <div className="help-icon">
                <CircleHelp size={17} />
              </div>
              <b>Butuh bantuan?</b>
              <p>
                Masuk dengan akun demo admin atau guru untuk mencoba dashboard.
              </p>
              <button
                onClick={() =>
                  notify("Admin: admin / admin123 · Guru: guru / guru123")
                }
              >
                Akun demo <ArrowUpRight size={14} />
              </button>
            </div>
          )}
          <div className="profile">
            <div className="profile-avatar">
              {user.role === "admin"
                ? "AD"
                : user.role === "teacher"
                  ? "GU"
                  : user.role === "pengawas"
                    ? "PW"
                  : user.role === "platform_owner"
                    ? "PO"
                    : "SW"}
            </div>
            <div className="profile-text">
              <b>{user.name}</b>
              <small>
                {roleLabel(user.role)} · {user.className || "IMBS"}
              </small>
            </div>
            <button className="profile-edit-button" aria-label="Edit profil akun" title="Edit profil akun" onClick={() => { setProfileFormError(""); setModal("profile"); }}>
              <Pencil size={15} />
            </button>
            <button aria-label="Keluar" title="Keluar" onClick={logout}>
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      {mobile && <div className="scrim" onClick={() => setMobile(false)} />}
      <main className="main-area">
        <header className="topbar">
          <div className="top-left">
            <button className="mobile-menu" onClick={() => setMobile(true)}>
              <Menu size={20} />
            </button>
            <div className="crumb">
              Workspace <ChevronRight size={14} /> <strong>{page}</strong>
            </div>
          </div>
          <div className="top-actions">
            <div className="session-pill">
              <span /> {schoolSettings.semester} {schoolSettings.academicYear}
            </div>
            <button
              className="icon-button notification"
              onClick={() => notify("Tidak ada notifikasi baru")}
            >
              <Bell size={18} />
            </button>
            <div className="top-avatar">
              {user.role === "admin"
                ? "AD"
                : user.role === "teacher"
                  ? "GU"
                  : user.role === "pengawas"
                    ? "PW"
                  : user.role === "platform_owner"
                    ? "PO"
                    : "SW"}
            </div>
          </div>
        </header>
        <div className="content">
          {error && (
            <div className="error-banner">
              <CircleAlert size={16} />
              {error}
              <button
                onClick={() => {
                  setError("");
                  loadAll();
                }}
              >
                <RefreshCw size={14} /> Coba lagi
              </button>
            </div>
          )}
          {page === "Ringkasan" && (
            <Dashboard
              user={user}
              dashboard={dashboard}
              exams={exams}
              banks={banks}
              students={students}
              onPage={setPage}
              onModal={openModal}
              onMonitor={openMonitor}
              onRefresh={loadAll}
            />
          )}
          {page === "Siswa" && (
            <StudentsPage
              students={visibleStudents}
              total={students.length}
              quota={dashboard?.quota}
              query={query}
              setQuery={setQuery}
              onCreate={() => setModal("student")}
              onImport={() => setModal("import")}
              onDelete={deleteStudent}
              onTemplate={downloadStudentImportTemplate}
            />
          )}
          {page === "Akun staf" && isAdmin && (
            <TeacherAccountsPage
              teachers={teacherList}
              subjects={subjects}
              quota={dashboard?.quota}
              onAdd={() => { setTeacherFormError(""); setModal("teacher-add"); }}
              onImport={() => { setModal("teacher-import"); }}
              onEdit={(teacher) => { setTeacherToEdit(teacher); setTeacherFormError(""); setModal("teacher-access"); }}
              onDelete={deleteTeacher}
            />
          )}
          {page === "Mata Pelajaran" && (
            <SubjectsPage
              subjects={subjects}
              banks={banks}
              query={query}
              setQuery={setQuery}
              isAdmin={isAdmin}
              onAdd={addSubjectStandalone}
              onEdit={editSubject}
              onDelete={deleteSubject}
            />
          )}
          {page === "Bank Soal" && (
            <BanksPage
              banks={banks}
              query={query}
              setQuery={setQuery}
              isAdmin={isAdmin}
              busy={busy}
              onCreate={() => setModal("bank")}
              onCreateSubject={addSubjectStandalone}
              onOpen={openQuestions}
              onExport={exportBank}
              onDelete={deleteBank}
            />
          )}
          {page === "Ujian" && (
            <ExamsPage
              exams={exams}
              isAdmin={isAdmin}
              busy={busy}
              onCreate={openExamCreate}
              onStatus={setExamStatus}
              canRunExam={isAdmin || isPengawas}
              onMonitor={openMonitor}
              onDelete={deleteExam}
            />
          )}
          {page === "Pantau Ujian" && canManageExamMonitoring && (
            <MonitorDashboard
              refreshKey={monitorRefreshKey}
              busy={busy}
              onReviewEvent={reviewViolationEvent}
              onReviewSession={reviewViolationSession}
              onViolation={recordViolation}
              onReset={resetStudentSession}
              canRecordViolation={canRecordExamViolation}
            />
          )}
          {page === "Hasil Ujian" && (
            <ResultsPage
              results={results}
              onReview={openEssayReview}
              onSaveFinalScore={saveFinalScore}
              busy={busy}
            />
          )}
          {page === "Analisis Soal" && (
            <ItemAnalysisPage
              banks={banks}
              selectedBankId={selectedAnalysisBankId}
              onSelectBank={(id) => {
                setSelectedAnalysisBankId(id);
                loadItemAnalysis(id);
              }}
              analysisData={analysisData}
              loading={analysisLoading}
              onExport={() => {
                if (!analysisData?.items?.length) return;
                exportItemAnalysis(analysisData.items, `Analisis_Soal_${(analysisData.bank?.topic || 'Bank').replace(/\s+/g, '_')}.xlsx`);
              }}
              query={query}
              setQuery={setQuery}
            />
          )}
          {page === "Pengaturan" && isAdmin && (
            <SettingsPage
              settings={settingsForm}
              onChange={setSettingsForm}
              onSave={saveSettings}
              onCancel={() => setSettingsForm(copySettings(schoolSettings))}
              busy={busy}
            />
          )}
        </div>
        <footer className="footer">
          <span>© 2026 IMBS CBT · Sistem Ujian Terintegrasi</span>
          <span>
            <i className="status-dot" /> API & database aktif
          </span>
        </footer>
      </main>
      {modal && (
        <Modal
          title={modal === "profile" ? "Edit profil akun" : modal === "teacher-add" ? "Tambah staf" : modal === "teacher-import" ? "Import guru" : modal === "teacher-access" ? "Atur akses staf" : modal === "subject" ? (subjectToEdit ? "Edit mata pelajaran" : "Tambah mata pelajaran") : modalTitle(modal, selectedBank, selectedExam)}
          className={modal === "bank" ? "question-bank-modal" : modal === "exam" ? "exam-create-modal" : ""}
          onClose={() => {
            setModal("");
            setSubjectToEdit(null);
            setError("");
            setReleasedPin("");
          }}
        >
          {modal === "profile" && (
            <ProfileEditForm
              key={user.id}
              user={user}
              busy={busy}
              error={profileFormError}
              onSave={saveOwnProfile}
              onCancel={() => setModal("")}
            />
          )}
          {modal === "student" && (
            <>
              <label>
                Nama lengkap siswa
                <input
                  autoFocus
                  value={studentForm.name}
                  onChange={(e) =>
                    setStudentForm({ ...studentForm, name: e.target.value })
                  }
                  placeholder="Contoh: Ahmad Fadhil"
                />
              </label>
              {tenantLoginEnabled && <label>Email login siswa<input type="email" autoComplete="email" value={studentForm.email} onChange={event=>setStudentForm({...studentForm,email:event.target.value})} required/></label>}
              <label>
                Kelas
                <select
                  value={studentForm.className}
                  onChange={(e) =>
                    setStudentForm({
                      ...studentForm,
                      className: e.target.value,
                    })
                  }
                >
                  {schoolSettings.classes.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <div className="form-note">
                <ShieldCheck size={16} /> Username unik dan token awal akan
                dibuat server. Token ditampilkan satu kali.
              </div>
              <ModalActions
                close={() => setModal("")}
                save={addStudent}
                busy={busy}
                label="Buat akun siswa"
              />
            </>
          )}
          {modal === "import" && (
            <>
              <div className="upload-zone">
                <div>
                  <FileSpreadsheet size={24} />
                </div>
                <b>Import daftar siswa dari Excel atau CSV</b>
                <p>
                  Baris pertama wajib memiliki kolom nama siswa dan kelas. Batas
                  500 siswa per proses.
                </p>
                <label className="upload-button">
                  Pilih file
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(e) => importStudents(e.target.files?.[0])}
                  />
                </label>
              </div>
              <div className="form-note">
                <CircleAlert size={16} /> Token siswa dihasilkan server dan
                hanya tersedia saat file hasil kredensial diunduh.
              </div>
              <div className="modal-actions">
                <button
                  className="secondary"
                    onClick={downloadStudentImportTemplate}
                >
                  <Download size={15} /> Template Excel
                </button>
                <button className="secondary" onClick={() => setModal("")}>
                  Tutup
                </button>
              </div>
            </>
          )}
          {modal === "teacher-add" && (
            <div>
              <TeacherCreateForm
                classes={schoolSettings.classes}
                subjects={subjects}
                tenancyEnabled={tenantLoginEnabled}
                busy={busy}
                error={teacherFormError}
                onSave={createTeacher}
                onCancel={() => setModal("")}
              />
            </div>
          )}
          {modal === "teacher-import" && (
            <>
              <div className="upload-zone">
                <div>
                  <FileSpreadsheet size={24} />
                </div>
                <b>Import daftar guru dari Excel atau CSV</b>
                <p>
                  Baris pertama wajib memiliki kolom nama, username, password, kelas, dan mata pelajaran. Batas 500 guru per proses.
                </p>
                <label className="upload-button">
                  Pilih file
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={(e) => importTeachers(e.target.files?.[0])}
                  />
                </label>
              </div>
              <div className="form-note">
                <CircleAlert size={16} /> Pastikan nama kelas dan mata pelajaran sudah sesuai dengan Pengaturan sekolah.
              </div>
              <div className="modal-actions">
                <button
                  className="secondary"
                  onClick={() => downloadTeacherImportTemplate({ classes: schoolSettings.classes, subjects: subjects.map(s => s.name) })}
                >
                  <Download size={15} /> Template Excel
                </button>
                <button className="secondary" onClick={() => setModal("")}>
                  Tutup
                </button>
              </div>
            </>
          )}
          {modal === "teacher-access" && teacherToEdit && (
            <TeacherCreateForm
              key={teacherToEdit.id}
              teacher={teacherToEdit}
              classes={schoolSettings.classes}
              subjects={subjects}
              busy={busy}
              error={teacherFormError}
              onSave={updateTeacherAccess}
              onCancel={() => { setTeacherToEdit(null); setModal(""); }}
            />
          )}
          {modal === "subject" && (
            <SubjectCreateForm
              initialData={subjectToEdit}
              onSave={subjectToEdit ? updateSubject : saveSubject}
              onCancel={() => {
                setSubjectToEdit(null);
                setModal(subjectReturnModal || "");
              }}
              busy={busy}
            />
          )}
          {modal === "bank" && (
            <>
              <div className="question-bank-body">
                <QuestionBankBuilder
                  form={bankForm}
                  subjects={subjects}
                  grades={schoolSettings.grades}
                  questions={bankQuestions}
                  stimuli={bankStimuli}
                  error={bankQuestionError}
                  onFormChange={(changes) =>
                    setBankForm((form) => ({ ...form, ...changes }))
                  }
                  onCountChange={setBankQuestionCount}
                  onQuestionChange={updateBankQuestion}
                  onStimuliChange={setBankStimuli}
                  onAddSubject={isAdmin ? addSubject : undefined}
                  onImportQuestions={applyImportedQuestions}
                />
              </div>
              <ModalActions
                close={() => setModal("")}
                save={addBank}
                busy={busy}
                label="Simpan bank & soal"
              />
            </>
          )}{" "}
          {modal === "questions" && (
            <QuestionList
              bank={selectedBank}
              questions={questions}
              onAdd={() => setModal("question-add")}
              onUploadMedia={uploadQuestionMedia}
              onDeleteMedia={deleteQuestionMedia}
              onDeleteQuestion={deleteQuestion}
            />
          )}
          {modal === "question-add" && (
            <>
              <label>
                Jenis soal
                <select
                  value={questionForm.type}
                  onChange={(event) => {
                    setQuestionForm((form) => ({
                      ...form,
                      type: event.target.value,
                    }));
                    setQuestionFormError("");
                  }}
                >
                  <option value="mc">Pilihan ganda</option>
                  <option value="essay">Essay</option>
                </select>
              </label>
              <label>
                Pertanyaan
                <textarea
                  dir="auto"
                  rows="3"
                  value={questionForm.prompt}
                  onChange={(event) =>
                    setQuestionForm((form) => ({
                      ...form,
                      prompt: event.target.value,
                    }))
                  }
                  placeholder="Tulis pertanyaan; rumus LaTeX: \(x^2\)"
                />
              </label>
              <div className="form-note">
                Rumus: <code>\(x^2\)</code> sebaris atau{" "}
                <code>\[x^2+y^2\]</code> baris sendiri.
              </div>
              <label className="question-image-picker">
                Gambar pendukung (opsional)
                <span>
                  {Number(selectedBank?.examCount) > 0
                    ? "Gambar terkunci karena bank sudah dijadwalkan"
                    : "Unggah JPG, PNG, atau WebP"}
                </span>
                <input
                  type="file"
                  disabled={Number(selectedBank?.examCount) > 0}
                  accept={IMAGE_ACCEPT}
                  onChange={(event) =>
                    setQuestionForm((form) => ({
                      ...form,
                      imageFile: event.target.files?.[0] || null,
                      imageAltText: "",
                    }))
                  }
                />
              </label>
              {questionForm.imageFile && (
                <label>
                  Deskripsi gambar
                  <input
                    maxLength="500"
                    value={questionForm.imageAltText}
                    onChange={(event) =>
                      setQuestionForm((form) => ({
                        ...form,
                        imageAltText: event.target.value,
                      }))
                    }
                    placeholder="Jelaskan isi gambar"
                  />
                </label>
              )}
              {questionForm.type === "mc" ? (
                <>
                  <div className="form-cols option-fields">
                    {questionForm.options.map((option, index) => (
                      <label key={index}>
                        Opsi {String.fromCharCode(65 + index)}
                        <input
                          dir="auto"
                          value={option}
                          onChange={(event) =>
                            setQuestionForm((form) => ({
                              ...form,
                              options: form.options.map((value, i) =>
                                i === index ? event.target.value : value,
                              ),
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <label>
                    Kunci jawaban
                    <select
                      value={questionForm.answerKey}
                      onChange={(event) =>
                        setQuestionForm((form) => ({
                          ...form,
                          answerKey: event.target.value,
                        }))
                      }
                    >
                      <option value="">Pilih kunci</option>
                      {["A", "B", "C", "D"].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <label>
                  Rubrik / panduan koreksi
                  <textarea
                    dir="auto"
                    rows="3"
                    value={questionForm.answerKey}
                    onChange={(event) =>
                      setQuestionForm((form) => ({
                        ...form,
                        answerKey: event.target.value,
                      }))
                    }
                  />
                </label>
              )}
              <label>
                Bobot nilai
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={questionForm.points}
                  onChange={(event) =>
                    setQuestionForm((form) => ({
                      ...form,
                      points: event.target.value,
                    }))
                  }
                />
              </label>
              {questionFormError && (
                <div className="question-form-error" role="alert">
                  {questionFormError}
                </div>
              )}
              <ModalActions
                close={() => setModal("questions")}
                save={addQuestion}
                busy={busy}
                label="Simpan soal"
              />
            </>
          )}
          {modal === "exam" && (
            <>
              <div className="exam-section">
                <div className="section-label"><BookOpen size={14} />Nama ujian</div>
                <input
                  autoFocus
                  className="exam-title-input"
                  value={examForm.title}
                  onChange={(e) =>
                    setExamForm({ ...examForm, title: e.target.value })
                  }
                  placeholder="Contoh: Ujian Harian Bab 1"
                />
              </div>
              <div className="exam-section">
                <div className="section-label"><Database size={14} />Bank soal (kombinasi beberapa bank)</div>
                <div className="bank-scroll-wrapper">
                  <div className="exam-bank-list">
                    {banks.map((b) => {
                      const isChecked = examForm.bankIds?.includes(b.id);
                      const initial = (b.subject?.charAt(0) || '?').toUpperCase();
                      const badgeMap = { S: 'bg-emerald-50 text-emerald-600', H: 'bg-amber-50 text-amber-600', A: 'bg-indigo-50 text-indigo-600' };
                      const badgeClass = badgeMap[initial] || 'bg-slate-50 text-slate-600';
                      return (
                        <label key={b.id} className={`exam-bank-card${isChecked ? ' selected' : ''}`}>
                          <input type="checkbox" checked={isChecked} onChange={(e) => {
                            const cur = examForm.bankIds || [];
                            const updated = e.target.checked ? [...cur, b.id] : cur.filter(id => id !== b.id);
                            setExamForm({ ...examForm, bankIds: updated, bankId: updated[0] || '' });
                          }} />
                          <div className={`bank-avatar ${badgeClass}`}>{initial}</div>
                          <div className="bank-info">
                            <div className="bank-title">{b.subject}</div>
                            <div className="bank-subtitle">Kelas {b.grade} · {b.topic}</div>
                          </div>
                          <div className="bank-row">
                            <span className="bank-meta">{b.count} soal tersedia</span>
                            <span className="bank-count">{b.count}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="exam-section">
                <div className="section-label"><CalendarDays size={14} />Kelas peserta (kombinasi beberapa kelas)</div>
                <div className="exam-class-select">
                  <div className="exam-classes-grid">
                    {schoolSettings.classes.map((cls) => {
                      const isChecked = examForm.classNames?.includes(cls);
                      return (
                        <label key={cls} className={`exam-check-item${isChecked ? ' selected' : ''}`}>
                          <input type="checkbox" checked={isChecked} onChange={(e) => {
                            const cur = examForm.classNames || [];
                            const updated = e.target.checked ? [...cur, cls] : cur.filter(c => c !== cls);
                            setExamForm({ ...examForm, classNames: updated, className: updated[0] || '' });
                          }} />
                          <span>{cls}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="exam-section exam-section-divider">
                <div className="section-label"><BarChart3 size={14} />Jumlah soal &amp; durasi</div>
                <div className="form-cols">
                  <label>
                    <span>PG (soal)</span>
                    <input
                      type="number"
                      min="0"
                      value={examForm.mcCount}
                      onChange={(e) =>
                        setExamForm({ ...examForm, mcCount: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span>Essay (soal)</span>
                    <input
                      type="number"
                      min="0"
                      value={examForm.essayCount}
                      onChange={(e) =>
                        setExamForm({ ...examForm, essayCount: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    <span>Durasi (menit)</span>
                    <input
                      type="number"
                      min="1"
                      value={examForm.durationMinutes}
                      onChange={(e) =>
                        setExamForm({
                          ...examForm,
                          durationMinutes: e.target.value,
                        })}
                    />
                  </label>
                </div>
                {Number(examForm.mcCount || 0) + Number(examForm.essayCount || 0) > 0 && (
                  <div className="exam-total-chip">
                    <BookOpen size={14} />
                    <span>Total soal</span>
                    <b>
                      {Number(examForm.mcCount || 0) +
                        Number(examForm.essayCount || 0)}
                    </b>
                  </div>
                )}
              </div>
              <div className="form-note">
                <Shuffle size={16} /> Server akan mengambil soal acak sesuai
                jenis dan membuat urutan berbeda untuk setiap siswa kelas
                terpilih.
              </div>
              <ModalActions
                close={() => setModal("")}
                save={createExam}
                busy={busy}
                label="Buat rancangan ujian"
                icon={<Plus size={16} />}
              />
            </>
          )}{modal === "monitor" && (
            <>
              {canManageExamMonitoring && selectedExam?.status === "active" && (
                <section className="exam-pin-panel">
                  <div>
                    <b>PIN masuk ujian</b>
                    <small>
                      Terbitkan sesaat sebelum ujian. PIN baru membatalkan PIN
                      sebelumnya. PIN adalah penghalang akses, bukan bukti
                      lokasi.
                    </small>
                    <label className="pin-validity">
                      Masa berlaku PIN (menit)
                      <input
                        type="number"
                        min="1"
                        max="2147483647"
                        step="1"
                        required
                        value={pinValidityMinutes}
                        onChange={(e) => setPinValidityMinutes(e.target.value)}
                      />
                    </label>
                    <small>
                      {pinInfo.available
                        ? "PIN tersedia"
                        : "PIN tidak tersedia atau kedaluwarsa"}
                      {pinInfo.expiresAt
                        ? ` · Expiry ${new Date(pinInfo.expiresAt).toLocaleString("id-ID")}`
                        : pinInfo.issuedAt
                          ? " · PIN lama perlu diterbitkan ulang"
                          : " · Belum diterbitkan"}
                    </small>
                  </div>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={releaseExamPin}
                  >
                    {busy
                      ? "Menerbitkan…"
                      : releasedPin
                        ? "Terbitkan PIN baru"
                        : "Terbitkan PIN"}
                  </button>
                  {releasedPin && (
                    <output aria-live="polite">{releasedPin}</output>
                  )}
                  {error && <p role="alert">{error}</p>}
                </section>
              )}
              <Monitor
                exam={selectedExam}
                students={monitor}
                canManage={canManageExamMonitoring}
                canRecordViolation={canRecordExamViolation}
                onRefresh={refreshMonitor}
                onViolation={recordViolation}
                onReviewEvent={reviewViolationEvent}
                onReviewSession={reviewViolationSession}
                onReset={resetStudentSession}
              />
            </>
          )}
          {modal === "essay-review" && (
            <EssayReview
              result={selectedResult}
              answers={essayResponses}
              onGrade={saveEssayGrade}
              busy={busy}
            />
          )}
          {modal === "credentials" && (
            <>
              <div className="credential-warning">
                <KeyRound size={17} />
                Simpan kredensial ini sekarang. Token tidak ditampilkan lagi
                setelah dialog ditutup.
              </div>
              <div className="credential-list">
                {credentials.map((s) => (
                  <div className="credential-row" key={s.username}>
                    <b>{s.name}</b>
                    <span>{s.className}</span>
                    <code>{s.username}</code>
                    <code>{s.token}</code>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button className="secondary" onClick={() => setModal("")}>
                  Saya sudah simpan
                </button>
                <button className="primary" onClick={downloadCredentials}>
                  <Download size={15} /> Unduh kredensial CSV
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
      {toast && (
        <div className="toast">
          <CircleCheck size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}

function roleLabel(role){return role==='admin'?'Admin':role==='teacher'?'Guru':role==='pengawas'?'Pengawas':role==='platform_owner'?'Pemilik Platform':'Siswa';}

function PlatformOwnerConsole({ user, onLogout }) {
  const [overview, setOverview] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [form, setForm] = useState({
    schoolCode: '',
    displayName: '',
    adminName: '',
    adminEmail: '',
    trialDays: '30',
    maxStudents: '400',
    maxTeachers: '25',
  });
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [ovData, tData] = await Promise.all([
        api('/platform/overview'),
        api('/platform/tenants').catch(() => ({ tenants: [] })),
      ]);
      setOverview(ovData);
      setTenants(tData?.tenants || []);
    } catch {
      setOverview(prev => prev || {
        mode: 'local-safe-pilot',
        tenantModeEnabled: false,
        localDeployment: true,
        controlPlaneReady: false,
        provisioningReady: false,
        productionGuard: true,
      });
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const submitOnboarding = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const payload = {
        schoolCode: form.schoolCode.trim().toLowerCase(),
        displayName: form.displayName.trim(),
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim().toLowerCase(),
        trialDays: Number(form.trialDays) || 30,
        maxStudents: Number(form.maxStudents) || 400,
        maxTeachers: Number(form.maxTeachers) || 25,
      };
      const result = await api('/platform/onboarding', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setCredentialsModal(result);
      setMessage({ type: 'success', text: `Sekolah "${result.displayName}" (${result.schoolCode}) berhasil diprovisioning.` });
      setForm({
        schoolCode: '',
        displayName: '',
        adminName: '',
        adminEmail: '',
        trialDays: '30',
        maxStudents: '400',
        maxTeachers: '25',
      });
      loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Onboarding gagal.' });
    } finally {
      setBusy(false);
    }
  };

  const handleStatusToggle = async (tenant) => {
    const nextStatus = tenant.status === 'suspended' ? 'active' : 'suspended';
    setActionBusyId(tenant.id);
    try {
      await api(`/platform/tenants/${tenant.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadData();
    } catch (err) {
      alert(`Gagal mengubah status: ${err.message}`);
    } finally {
      setActionBusyId(null);
    }
  };

  const [editingTenant, setEditingTenant] = useState(null);
  const [editForm, setEditForm] = useState({ maxStudents: '400', maxTeachers: '25', extendTrialDays: '0', status: 'active' });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  const openEditModal = (t) => {
    setEditingTenant(t);
    setEditForm({
      maxStudents: String(t.maxStudents || 400),
      maxTeachers: String(t.maxTeachers || 25),
      extendTrialDays: '0',
      status: t.status || 'active',
    });
    setEditError('');
  };

  const submitEditTenant = async (e) => {
    e.preventDefault();
    if (!editingTenant) return;
    setEditBusy(true);
    setEditError('');
    try {
      const payload = {
        maxStudents: Number(editForm.maxStudents),
        maxTeachers: Number(editForm.maxTeachers),
        status: editForm.status,
      };
      const days = Number(editForm.extendTrialDays);
      if (days > 0) payload.extendTrialDays = days;
      await api(`/platform/tenants/${editingTenant.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setEditingTenant(null);
      await loadData();
      setMessage({ type: 'success', text: `Paket & kuota sekolah "${editingTenant.displayName}" berhasil diperbarui.` });
    } catch (err) {
      setEditError(err.message || 'Gagal memperbarui kuota tenant.');
    } finally {
      setEditBusy(false);
    }
  };

  const copyCredentials = () => {
    if (!credentialsModal) return;
    const text = [
      `=== KREDENSIAL SEKOLAH BARU ===`,
      `Kode Sekolah: ${credentialsModal.schoolCode}`,
      `Nama Sekolah: ${credentialsModal.displayName}`,
      `Database: ${credentialsModal.databaseName}`,
      `Admin Username: ${credentialsModal.admin?.username}`,
      `Admin Email: ${credentialsModal.admin?.email}`,
      `Password Awal: ${credentialsModal.initialPassword}`,
      `Trial Berakhir: ${credentialsModal.trialEndsAt ? new Date(credentialsModal.trialEndsAt).toLocaleDateString('id-ID') : '-'}`,
      `Catatan: Password ini hanya tampil sekali saat provisioning.`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const downloadCredentialsCsv = () => {
    if (!credentialsModal) return;
    const headers = ['Kode Sekolah', 'Nama Sekolah', 'Database', 'Admin Username', 'Admin Email', 'Password Awal', 'Trial Berakhir'];
    const row = [
      `"${credentialsModal.schoolCode}"`,
      `"${credentialsModal.displayName}"`,
      `"${credentialsModal.databaseName}"`,
      `"${credentialsModal.admin?.username}"`,
      `"${credentialsModal.admin?.email}"`,
      `"${credentialsModal.initialPassword}"`,
      `"${credentialsModal.trialEndsAt || ''}"`,
    ];
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), row.join(',')].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `kredensial-${credentialsModal.schoolCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const trialTenants = tenants.filter(t => t.status === 'trial').length;

  return (
    <div className="app-shell">
      <aside className="sidebar" style={{ width: '260px' }}>
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={21} /></div>
          <div>
            <b>Platform<span> Control</span></b>
            <small>PBM / SaaS Provisioner</small>
          </div>
        </div>
        <div className="nav-caption">OPERASI</div>
        <nav>
          <button className="nav-item selected" type="button"><Settings size={18} /><span>Overview</span></button>
          <button className="nav-item" type="button" onClick={onLogout}><LogOut size={18} /><span>Keluar</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="profile">
            <div className="profile-avatar">PO</div>
            <div className="profile-text">
              <b>{user.name}</b>
              <small>{roleLabel(user.role)}</small>
            </div>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="top-left"><div className="crumb">Platform <ChevronRight size={14}/> <strong>Multi-Tenant Control</strong></div></div>
          <div className="top-actions">
            <button className="secondary text-button" onClick={loadData} title="Perbarui Data">
              <RefreshCw size={15}/> Segarkan
            </button>
            <div className="session-pill">
              <span/> {overview?.provisioningReady ? 'Provisioner Aktif' : 'Provisioner Dikunci'}
            </div>
          </div>
        </header>
        <div className="content">
          <section className="stats-grid">
            <Stat title="Sekolah terdaftar" value={totalTenants} hint={`${activeTenants} aktif · ${trialTenants} trial`} icon={Users} tone="blue" onClick={() => {}} />
            <Stat title="Control-plane" value={overview?.controlPlaneReady ? 'Siap' : 'Belum siap'} hint="cbt_control_plane terhubung" icon={KeyRound} tone="purple" onClick={() => {}} />
            <Stat title="Provisioning engine" value={overview?.provisioningReady ? 'Siap' : 'Terkunci'} hint={overview?.provisioningReady ? 'Dedicated DB & role generator' : 'Belum terhubung'} icon={ShieldCheck} tone="orange" onClick={() => {}} />
            <Stat title="Isolasi cbt_imbs" value="100% Aman" hint="Database legacy IMBS tidak tersentuh" icon={Check} tone="green" onClick={() => {}} />
          </section>

          <div className="dashboard-grid">
            <section className="panel activity-panel">
              <div className="panel-head">
                <div>
                  <h2>Provisioning sekolah baru</h2>
                  <p>Membuat database PostgreSQL dedicated, role migration & aplikasi, serta akun admin sekolah.</p>
                </div>
              </div>
              <form onSubmit={submitOnboarding} className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label style={{ gridColumn: 'span 1' }}>
                  Kode sekolah (slug)
                  <input
                    value={form.schoolCode}
                    onChange={(event) => setForm({ ...form, schoolCode: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="misal: sekolah-demo-a"
                    required
                    disabled={!overview?.provisioningReady || busy}
                  />
                  <small style={{ color: '#777', fontSize: '11px' }}>Hanya huruf kecil, angka, dan tanda hubung.</small>
                </label>
                <label style={{ gridColumn: 'span 1' }}>
                  Nama sekolah
                  <input
                    value={form.displayName}
                    onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                    placeholder="misal: SMA Negeri 1 Demo"
                    required
                    disabled={!overview?.provisioningReady || busy}
                  />
                </label>
                <label style={{ gridColumn: 'span 1' }}>
                  Nama admin sekolah
                  <input
                    value={form.adminName}
                    onChange={(event) => setForm({ ...form, adminName: event.target.value })}
                    placeholder="misal: Budi Santoso, S.Kom"
                    required
                    disabled={!overview?.provisioningReady || busy}
                  />
                </label>
                <label style={{ gridColumn: 'span 1' }}>
                  Email admin sekolah
                  <input
                    type="email"
                    value={form.adminEmail}
                    onChange={(event) => setForm({ ...form, adminEmail: event.target.value })}
                    placeholder="misal: admin@sekolah-demo.id"
                    required
                    disabled={!overview?.provisioningReady || busy}
                  />
                </label>
                <label style={{ gridColumn: 'span 1' }}>
                  Durasi masa uji coba (Hari)
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={form.trialDays}
                    onChange={(event) => setForm({ ...form, trialDays: event.target.value })}
                    required
                    disabled={!overview?.provisioningReady || busy}
                  />
                </label>
                <div style={{ display: 'flex', gap: '8px', gridColumn: 'span 1' }}>
                  <label style={{ flex: 1 }}>
                    Batas siswa
                    <input
                      type="number"
                      min="10"
                      max="10000"
                      value={form.maxStudents}
                      onChange={(event) => setForm({ ...form, maxStudents: event.target.value })}
                      required
                      disabled={!overview?.provisioningReady || busy}
                    />
                  </label>
                  <label style={{ flex: 1 }}>
                    Batas guru
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={form.maxTeachers}
                      onChange={(event) => setForm({ ...form, maxTeachers: event.target.value })}
                      required
                      disabled={!overview?.provisioningReady || busy}
                    />
                  </label>
                </div>
                <div style={{ gridColumn: 'span 2', marginTop: '8px' }}>
                  <button className="primary" type="submit" disabled={busy || !overview?.provisioningReady} style={{ width: '100%', justifyContent: 'center' }}>
                    <Plus size={16} /> {busy ? 'Memproses provisioning database & schema…' : 'Provisioning Sekolah Baru'}
                  </button>
                </div>
                {message && (
                  <div style={{ gridColumn: 'span 2' }} className={message.type === 'success' ? 'session-pill' : 'login-error'}>
                    {message.type === 'success' ? <CircleCheck size={16} /> : <CircleAlert size={16} />} {message.text}
                  </div>
                )}
              </form>
            </section>

            <section className="panel activity-panel">
              <div className="panel-head">
                <div>
                  <h2>Arsitektur multi-tenant</h2>
                  <p>Status isolasi dan kendali database control-plane.</p>
                </div>
              </div>
              <div className="detail-stack">
                <div className="quick-item"><span><b>Mode sistem</b><small>{overview?.mode || 'local-safe-pilot'}</small></span><ShieldCheck size={17}/></div>
                <div className="quick-item"><span><b>Control-plane registry</b><small>cbt_control_plane.tenants</small></span><KeyRound size={17}/></div>
                <div className="quick-item"><span><b>Kriptografi rahasia database</b><small>AES-256-GCM via master key</small></span><LockKeyhole size={17}/></div>
                <div className="quick-item"><span><b>Isolasi data database</b><small>Dedicated DB (cbt_t_*) per sekolah</small></span><Layers3 size={17}/></div>
                <div className="quick-item"><span><b>Perlindungan cbt_imbs</b><small>Read/write legacy IMBS terpisah</small></span><Check size={17}/></div>
              </div>
            </section>
          </div>

          <section className="panel full-panel" style={{ marginTop: '20px' }}>
            <div className="panel-head">
              <div>
                <h2>Daftar tenant / sekolah terdaftar</h2>
                <p>Seluruh sekolah terisolasi yang telah diprovisioning pada control-plane.</p>
              </div>
              <button className="secondary" onClick={loadData}>
                <RefreshCw size={14}/> Segarkan
              </button>
            </div>
            <div className="student-table wide">
              <div className="table-row table-label" style={{ gridTemplateColumns: '100px minmax(130px,1.2fr) minmax(140px,1.3fr) 125px 95px 85px 165px' }}>
                <span>KODE</span>
                <span>NAMA SEKOLAH</span>
                <span>DATABASE</span>
                <span>KUOTA</span>
                <span>MASA AKTIF</span>
                <span>STATUS</span>
                <span>TINDAKAN</span>
              </div>
              {tenants.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#888' }}>
                  Belum ada tenant sekolah terdaftar. Gunakan formulir di atas untuk melakukan provisioning sekolah pertama.
                </div>
              ) : (
                tenants.map((t) => (
                  <div className="table-row" key={t.id} style={{ gridTemplateColumns: '100px minmax(130px,1.2fr) minmax(140px,1.3fr) 125px 95px 85px 165px' }}>
                    <span className="mono" style={{ fontWeight: 'bold' }}>{t.schoolCode}</span>
                    <span title={t.displayName} style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.displayName}</span>
                    <span className="mono" title={t.databaseName} style={{ fontSize: '11px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.databaseName}</span>
                    <span style={{ fontSize: '12px' }}>{t.maxStudents} sis / {t.maxTeachers} gur</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString('id-ID') : '-'}
                    </span>
                    <span>
                      <span className={`status-pill ${t.status === 'active' ? 'status-active' : t.status === 'trial' ? 'status-trial' : 'status-suspended'}`}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          backgroundColor: t.status === 'active' ? '#e6f7ed' : t.status === 'trial' ? '#fef8e7' : '#fdeeed',
                          color: t.status === 'active' ? '#1b873f' : t.status === 'trial' ? '#b5850b' : '#c92a2a',
                        }}>
                        {t.status.toUpperCase()}
                      </span>
                    </span>
                    <span style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="secondary"
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                        onClick={() => openEditModal(t)}
                      >
                        Ubah Paket
                      </button>
                      <button
                        className="secondary"
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                        disabled={actionBusyId === t.id}
                        onClick={() => handleStatusToggle(t)}
                      >
                        {actionBusyId === t.id ? '…' : t.status === 'suspended' ? 'Aktifkan' : 'Tangguhkan'}
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>

      {credentialsModal && (
        <div className="modal-backdrop" onClick={() => setCredentialsModal(null)}>
          <div className="modal" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>Kredensial Admin Sekolah</h2>
                <p>Simpan kredensial ini sekarang. Kata sandi ini hanya ditampilkan satu kali.</p>
              </div>
              <button className="icon-btn" onClick={() => setCredentialsModal(null)}><X size={18}/></button>
            </div>
            <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '8px', fontSize: '13px', color: '#874d00' }}>
                <CircleAlert size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                <strong>Perhatian:</strong> Kredensial akun admin pertama untuk tenant ini tidak disimpan dalam bentuk teks biasa. Harap salin atau unduh sebelum menutup jendela ini.
              </div>
              <div className="detail-stack" style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                <div className="quick-item"><span><b>Kode Sekolah</b><small className="mono">{credentialsModal.schoolCode}</small></span></div>
                <div className="quick-item"><span><b>Nama Sekolah</b><small>{credentialsModal.displayName}</small></span></div>
                <div className="quick-item"><span><b>Database Dedicated</b><small className="mono">{credentialsModal.databaseName}</small></span></div>
                <div className="quick-item"><span><b>Username Admin</b><small className="mono">{credentialsModal.admin?.username}</small></span></div>
                <div className="quick-item"><span><b>Email Admin</b><small className="mono">{credentialsModal.admin?.email}</small></span></div>
                <div className="quick-item" style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span>
                    <b style={{ color: '#0f766e' }}>Kata Sandi Awal</b>
                    <div className="mono" style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e293b', marginTop: '4px', letterSpacing: '0.5px' }}>
                      {credentialsModal.initialPassword}
                    </div>
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-foot" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '16px 24px' }}>
              <button className="secondary" onClick={copyCredentials}>
                <Copy size={15}/> {copied ? 'Tersalin!' : 'Salin Teks'}
              </button>
              <button className="secondary" onClick={downloadCredentialsCsv}>
                <Download size={15}/> Unduh CSV
              </button>
              <button className="primary" onClick={() => setCredentialsModal(null)}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTenant && (
        <div className="modal-backdrop" onClick={() => setEditingTenant(null)}>
          <div className="modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>Ubah Paket & Kuota Sekolah</h2>
                <p>{editingTenant.displayName} <span className="mono">({editingTenant.schoolCode})</span></p>
              </div>
              <button className="icon-btn" onClick={() => setEditingTenant(null)}><X size={18}/></button>
            </div>
            <form onSubmit={submitEditTenant} style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <label>
                  Batas Siswa
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    value={editForm.maxStudents}
                    onChange={(e) => setEditForm({ ...editForm, maxStudents: e.target.value })}
                    required
                  />
                </label>
                <label>
                  Batas Guru
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={editForm.maxTeachers}
                    onChange={(e) => setEditForm({ ...editForm, maxTeachers: e.target.value })}
                    required
                  />
                </label>
              </div>
              <label>
                Tambah Masa Aktif (+ Hari)
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={editForm.extendTrialDays}
                  onChange={(e) => setEditForm({ ...editForm, extendTrialDays: e.target.value })}
                  placeholder="0 (tidak menambah)"
                />
                <small style={{ color: '#777', fontSize: '11px' }}>
                  Masa aktif saat ini: {editingTenant.trialEndsAt ? new Date(editingTenant.trialEndsAt).toLocaleDateString('id-ID') : '-'}
                </small>
              </label>
              <label>
                Status Tenant
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="active">Active (Aktif)</option>
                  <option value="trial">Trial (Uji Coba)</option>
                  <option value="suspended">Suspended (Ditangguhkan)</option>
                  <option value="closed">Closed (Ditutup)</option>
                </select>
              </label>
              {editError && (
                <div className="login-error"><CircleAlert size={15}/> {editError}</div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="secondary" onClick={() => setEditingTenant(null)}>Batal</button>
                <button type="submit" className="primary" disabled={editBusy}>
                  {editBusy ? 'Menyimpan…' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
function modalTitle(type,bank,exam){return type==='student'?'Tambah siswa':type==='import'?'Import siswa':type==='subject'?'Mata pelajaran':type==='bank'?'Buat bank soal':type==='questions'?`${bank?.subject} · ${bank?.topic}`:type==='question-add'?'Tambah butir soal':type==='essay-review'?'Koreksi jawaban essay':type==='exam'?'Buat rancangan ujian':type==='monitor'?`Pantau · ${exam?.title}`:'Kredensial siswa';}
function Login({onLogin,busy,error,tenancyEnabled}){const [schoolCode,setSchoolCode]=useState(()=>getInitialSchoolCode()),[identity,setIdentity]=useState(showDemoAccounts?'admin':''),[password,setPassword]=useState(showDemoAccounts?'admin123':'');return <div className="login-screen"><div className="login-card"><div className="brand login-brand"><div className="brand-mark"><GraduationCap size={22}/></div><div><b>IMBS<span> CBT</span></b><small>INTEGRATED EXAM SYSTEM</small></div></div><div className="eyebrow"><ShieldCheck size={14}/> PORTAL AKADEMIK IMBS</div><h1>Selamat datang</h1><p>Masuk untuk mengelola ujian dan pembelajaran.</p><form onSubmit={e=>onLogin(e,tenancyEnabled?{schoolCode,email:identity,password}:{username:identity,password})}>{tenancyEnabled&&<label>Kode sekolah<input autoFocus={!schoolCode} value={schoolCode} onChange={e=>setSchoolCode(e.target.value)} autoComplete="organization" required/></label>}<label>{tenancyEnabled?'Email':'Username'}<input autoFocus={Boolean(!tenancyEnabled||schoolCode)} type={tenancyEnabled?'email':'text'} value={identity} onChange={e=>setIdentity(e.target.value)} autoComplete={tenancyEnabled?'username':'username'} required/></label><label>Kata sandi<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/></label>{error&&<div className="login-error"><CircleAlert size={15}/>{error}</div>}<button className="primary login-submit" disabled={busy||!identity||!password||(tenancyEnabled&&!schoolCode)}>{busy?'Memeriksa...':'Masuk ke dashboard'}<ArrowUpRight size={16}/></button></form>{showDemoAccounts&&!tenancyEnabled&&<><div className="demo-accounts"><b>Akun demo untuk pemeriksaan</b><button onClick={()=>{setIdentity('admin');setPassword('admin123');}}>Admin <code>admin / admin123</code></button><button onClick={()=>{setIdentity('guru');setPassword('guru123');}}>Guru <code>guru / guru123</code></button><button onClick={()=>{setIdentity('IMBS-24001');setPassword('ujian123');}}>Siswa <code>IMBS-24001 / ujian123</code></button></div><small className="login-foot">Versi lokal pengembangan · Ganti kredensial demo sebelum dipakai sungguhan</small></>}</div></div>;}
function Dashboard({user,dashboard,exams,banks,students,onPage,onModal,onMonitor,onRefresh}){const current=exams.find(e=>e.status==='active')||exams[0];return <><div className="welcome-row"><div><div className="eyebrow"><Sparkles size={14}/> RUANG KERJA AKADEMIK</div><h1>Assalamu’alaikum, {user.name.split(' ')[0]} <span>👋</span></h1><p>Ringkasan aktivitas akademik IMBS saat ini.</p></div><div className="button-row"><button className="secondary" onClick={onRefresh}><RefreshCw size={15}/> Perbarui</button>{user.role==='admin'&&<button className="primary" onClick={()=>onModal('exam')}><Plus size={17}/> Buat ujian</button>}</div></div>{dashboard?.quota&&<div className="activity-alert" style={{marginBottom:16}}><div className="alert-icon"><ShieldCheck size={17}/></div><span><b>Paket SaaS Aktif: Status {String(dashboard.quota.status||'active').toUpperCase()}</b><small>Batas Siswa: {dashboard.students} / {dashboard.quota.maxStudents} · Batas Guru: {dashboard.quota.maxTeachers ? `${dashboard.quota.maxTeachers} akun` : '—'}{dashboard.quota.trialEndsAt ? ` · Masa Uji Coba hingga ${new Date(dashboard.quota.trialEndsAt).toLocaleDateString('id-ID')}` : ''}</small></span><Wifi size={17} className="wifi"/></div>}<section className="stats-grid"><Stat title="Total siswa" value={dashboard.quota?.maxStudents ? `${dashboard.students} / ${dashboard.quota.maxStudents}` : dashboard.students} hint={dashboard.quota?.maxStudents ? `Kuota: ${Math.round((dashboard.students / dashboard.quota.maxStudents) * 100)}% terpakai` : "Akun siswa aktif"} icon={Users} tone="blue" onClick={()=>onPage('Siswa')}/><Stat title="Bank soal" value={dashboard.banks} hint="Dikelompokkan per mapel" icon={BookMarked} tone="green" onClick={()=>onPage('Bank Soal')}/><Stat title="Ujian berjalan / jadwal" value={dashboard.exams} hint="Sesi ujian aktif atau terjadwal" icon={ClipboardList} tone="purple" onClick={()=>onPage('Ujian')}/><Stat title="Rata-rata nilai" value={dashboard.average?Number(dashboard.average).toFixed(1):'—'} hint="Dari ujian terkoreksi" icon={ChartNoAxesColumn} tone="orange" onClick={()=>onPage('Hasil Ujian')}/></section><div className="dashboard-grid"><section className="panel activity-panel"><div className="panel-head"><div><h2>Sesi ujian</h2><p>Status dan jumlah peserta berdasarkan database</p></div><button className="text-button" onClick={()=>onPage('Ujian')}>Lihat semua <ArrowUpRight size={15}/></button></div>{current?<><div className="exam-feature"><div className="exam-icon"><BookOpen size={20}/></div><div className="exam-detail"><div className={current.status==='active'?'live-label':'upcoming-label'}><span/> {statusLabel(current.status)}</div><h3>{current.title} · Kelas {current.className}</h3><p><CalendarDays size={14}/> {current.subject} · {current.topic} <span>·</span> <Clock3 size={14}/> {current.durationMinutes} menit</p></div><button className="more-btn" onClick={()=>onMonitor(current)} title="Pantau peserta"><Eye size={17}/></button></div><div className="exam-progress"><div className="progress-label"><span>Progres peserta</span><b>{current.in_progress+current.completed} <small>/ {current.participants} siswa</small></b></div><div className="progress-track"><i style={{width:`${current.participants?Math.min(100,(current.completed+current.in_progress)/current.participants*100):0}%`}}/></div><div className="progress-foot"><span><i className="dot green-dot"/> {current.in_progress} mengerjakan</span><span><i className="dot gray-dot"/> {current.participants-current.completed-current.in_progress} belum mulai</span><span><i className="dot red-dot"/> {current.violations} pelanggaran</span></div></div><div className="activity-alert"><div className="alert-icon"><ShieldCheck size={17}/></div><span><b>Data peserta tersimpan di PostgreSQL</b><small>Urutan soal dibuat server saat rancangan ujian disimpan.</small></span><Wifi size={17} className="wifi"/></div></>:<Empty message="Belum ada sesi ujian" detail="Buat rancangan ujian untuk mulai melihat peserta."/>}</section><section className="panel quick-panel"><div className="panel-head"><div><h2>Akses cepat</h2><p>Tindakan yang dapat dijalankan</p></div></div><div className="quick-list">{user.role==='admin'&&<><Quick icon={Users} color="lavender" title="Tambah siswa" desc="Buat username & token akses" onClick={()=>onModal('student')}/><Quick icon={FileSpreadsheet} color="sky" title="Import siswa" desc="Unggah Excel atau CSV" onClick={()=>onModal('import')}/><Quick icon={Shuffle} color="peach" title="Atur ujian" desc="Acak soal berbeda tiap peserta" onClick={()=>onModal('exam')}/></>}<Quick icon={BookOpen} color="mint" title="Buat bank soal" desc="Simpan soal per mata pelajaran" onClick={()=>onModal('bank')}/></div></section></div><div className="bottom-grid"><section className="panel students-panel"><div className="panel-head"><div><h2>Siswa terbaru</h2><p>Akun di database</p></div><button className="text-button" onClick={()=>onPage('Siswa')}>Kelola siswa <ArrowUpRight size={15}/></button></div><div className="student-table"><div className="table-row table-label"><span>NAMA SISWA</span><span>USERNAME</span><span>KELAS</span><span>STATUS</span></div>{students.slice(0,4).map((s,i)=><div className="table-row" key={s.id}><span className="student-name"><i className={`mini-avatar av-${i%4}`}>{s.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</i>{s.name}</span><span className="mono">{s.username}</span><span>{s.className}</span><span><i className="status-dot"/> Aktif</span></div>)}</div></section><section className="panel bank-summary"><div className="panel-head"><div><h2>Bank soal terbaru</h2><p>Terhubung ke data soal</p></div><button className="text-button" onClick={()=>onPage('Bank Soal')}>Kelola <ArrowUpRight size={15}/></button></div><div className="subject-bars">{banks.slice(0,4).map(b=><div className="subject-line" key={b.id}><span>{b.subject} {b.grade}</span><div><i style={{width:`${Math.min(100,b.count*2)}%`,background:'#55b895'}}/></div><b>{b.count}</b></div>)}{!banks.length&&<Empty message="Belum ada bank soal"/>}</div></section></div></>;}
function Stat({title,value,hint,icon:Icon,tone,onClick}){return <button className="stat-card" onClick={onClick}><div className={`stat-icon ${tone}`}><Icon size={19}/></div><div className="stat-copy"><span>{title}</span><b>{value}</b><small>{hint}</small></div><span className="stat-foot">Lihat detail <ArrowUpRight size={13}/></span></button>;}
function Quick({icon:Icon,color,title,desc,onClick}){return <button className="quick-item" onClick={onClick}><i className={color}><Icon size={18}/></i><span><b>{title}</b><small>{desc}</small></span><ChevronRight size={17}/></button>;}
function StudentsPage({
  students,
  total,
  quota,
  query,
  setQuery,
  onCreate,
  onImport,
  onDelete,
  onTemplate,
}) {
  return (
    <>
      <PageTitle
        eyebrow="DATA AKADEMIK"
        title="Data siswa"
        desc="Kelola akun siswa dan kredensial akses ujian."
        actions={
          <>
            <button className="secondary" onClick={onImport}>
              <Upload size={16} /> Import data
            </button>
            <button className="primary" onClick={onCreate}>
              <Plus size={17} /> Tambah siswa
            </button>
          </>
        }
      />
      <section className="panel full-panel">
        <div className="toolbar">
          <SearchBox
            query={query}
            setQuery={setQuery}
            placeholder="Cari nama, username, atau kelas..."
          />
          <button className="secondary" onClick={onTemplate}>
            <Download size={15} /> Template CSV
          </button>
        </div>
        <div className="student-table wide student-list-scroll">
          <div className="table-row table-label">
            <span>NAMA SISWA</span>
            <span>USERNAME</span>
            <span>KELAS</span>
            <span>AKUN</span>
            <span></span>
          </div>
          {students.map((s, i) => (
            <div className="table-row" key={s.id}>
              <span className="student-name">
                <i className={`mini-avatar av-${i % 4}`}>
                  {s.name
                    .split(" ")
                    .map((x) => x[0])
                    .slice(0, 2)
                    .join("")}
                </i>
                {s.name}
              </span>
              <span className="mono">{s.username}</span>
              <span>{s.className}</span>
              <span>
                <i className="status-dot" /> Aktif
              </span>
              <span>
                <button
                  className="row-action"
                  title="Hapus siswa"
                  onClick={() => onDelete(s)}
                >
                  <Trash2 size={15} />
                </button>
              </span>
            </div>
          ))}
          {!students.length && (
            <Empty
              message="Siswa tidak ditemukan"
              detail="Ubah pencarian atau tambahkan siswa baru."
            />
          )}
        </div>
        <div className="pagination">
          <span>
            Menampilkan {students.length} dari {total} siswa
            {quota?.maxStudents ? ` (Batas paket sekolah: ${quota.maxStudents} siswa)` : ''}
          </span>
        </div>
      </section>
    </>
  );
}
function TeacherAccountsPage({ teachers, subjects, quota, onAdd, onImport, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const filtered = teachers.filter(t =>
    (t.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.username || "").toLowerCase().includes(search.toLowerCase())
  );
  return (
    <>
      <PageTitle
        eyebrow="PENGELOLAAN AKUN"
        title="Akun staf"
        desc="Kelola akun Guru dan Pengawas sekolah."
        actions={<>
          <button className="secondary" onClick={onImport}><FileSpreadsheet size={17} /> Import Excel</button>
          <button className="primary" onClick={onAdd}><Plus size={17} /> Tambah staf</button>
        </>}
      />
      <section className="panel full-panel teacher-admin-panel">
        <div className="panel-head">
          <div><h2>Daftar staf</h2><p>{filtered.length} dari {teachers.length} akun staf {quota?.maxTeachers ? `(Batas paket: ${quota.maxTeachers} staf)` : ''}</p></div>
        </div>
        <div className="toolbar" style={{ marginTop: 14 }}>
          <SearchBox
            query={search}
            setQuery={setSearch}
            placeholder="Cari nama guru atau username..."
          />
        </div>
        <div className="student-table wide teacher-list-scroll">
          <div className="table-row table-label">
            <span>NAMA GURU</span>
            <span>USERNAME</span>
            <span>KELAS</span>
            <span>MATA PELAJARAN</span>
            <span style={{ textAlign: "right" }}>AKSES</span>
          </div>
          {filtered.map((teacher, i) => <div className="table-row" key={teacher.id}>
            <span className="student-name">
              <i className={`mini-avatar av-${i % 4}`}>
                {teacher.name.split(" ").filter(Boolean).map(x => x[0]).slice(0, 2).join("").toUpperCase()}
              </i>
              {teacher.name}
            </span>
            <span className="mono">{teacher.username}<small style={{display:'block',marginTop:3,color:'#7b8b9b'}}>{teacher.role === 'pengawas' ? 'Pengawas' : 'Guru'}</small></span>
            <span>{teacher.classes.length ? teacher.classes.join(', ') : 'Belum ditetapkan'}</span>
            <span>{teacher.subjectIds.length ? teacher.subjectIds.map(id => subjects.find(subject => Number(subject.id) === Number(id))?.name || id).join(', ') : 'Belum ditetapkan'}</span>
            <span className="teacher-account-actions">
              <button className="secondary" onClick={() => onEdit(teacher)}>Atur akses</button>
              <button className="teacher-delete-button" aria-label={`Hapus akun ${teacher.name}`} onClick={() => onDelete(teacher)}><Trash2 size={13}/> Hapus</button>
            </span>
          </div>)}
          {!filtered.length && (
            <Empty
              message="Guru tidak ditemukan"
              detail={search ? "Tidak ada akun guru yang sesuai dengan kata kunci pencarian." : "Tambahkan akun guru dan tentukan cakupan aksesnya."}
            />
          )}
        </div>
      </section>
    </>
  );
}
function SubjectsPage({ subjects, banks, query, setQuery, isAdmin, onAdd, onEdit, onDelete }) {
  const filtered = subjects.filter(s =>
    (s.name + ' ' + (s.languageCode || '') + ' ' + (s.textDirection || '')).toLowerCase().includes(query.toLowerCase())
  );
  return (
    <>
      <PageTitle
        eyebrow="KURIKULUM & MATERI"
        title="Mata Pelajaran"
        desc="Kelola mata pelajaran yang terhubung ke bank soal dan pelaksanaan ujian."
        actions={isAdmin && (
          <button className="primary" onClick={onAdd}>
            <Plus size={17} /> Tambah mata pelajaran
          </button>
        )}
      />
      <div className="filter-row">
        <SearchBox
          query={query}
          setQuery={setQuery}
          placeholder="Cari mata pelajaran..."
        />
      </div>
      <section className="panel full-panel">
        <div className="panel-head">
          <div>
            <h2>Daftar mata pelajaran</h2>
            <p>{subjects.length} mata pelajaran terdaftar · terintegrasi dengan bank soal & ujian</p>
          </div>
        </div>
        <div className="student-table wide">
          <div className="table-row table-label">
            <span>NAMA MATA PELAJARAN</span>
            <span>BAHASA SOAL</span>
            <span>ARAH TEKS</span>
            <span>BANK SOAL</span>
            {isAdmin && <span>AKSI</span>}
          </div>
          {filtered.map(s => {
            const bankCount = banks.filter(b => Number(b.subject_id) === Number(s.id)).length;
            const langLabel = s.languageCode === 'ar' ? 'Bahasa Arab (ar)' : s.languageCode === 'en' ? 'Bahasa Inggris (en)' : 'Bahasa Indonesia (id)';
            const dirLabel = s.textDirection === 'rtl' ? 'Kanan ke kiri (RTL)' : s.textDirection === 'ltr' ? 'Kiri ke kanan (LTR)' : 'Otomatis';
            return (
              <div className="table-row" key={s.id}>
                <span className="student-name">
                  <i className="mini-avatar av-1"><BookMarked size={14} /></i>
                  {s.name}
                </span>
                <span>{langLabel}</span>
                <span>{dirLabel}</span>
                <span>{bankCount} bank soal</span>
                {isAdmin && (
                  <span className="teacher-account-actions">
                    <button className="secondary" onClick={() => onEdit(s)}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      className="teacher-delete-button"
                      aria-label={`Hapus mata pelajaran ${s.name}`}
                      onClick={() => onDelete(s)}
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
                  </span>
                )}
              </div>
            );
          })}
          {!filtered.length && (
            <Empty
              message="Belum ada mata pelajaran"
              detail="Tambahkan mata pelajaran untuk mulai menyusun bank soal dan ujian."
            />
          )}
        </div>
      </section>
    </>
  );
}
function BanksPage({
  banks,
  query,
  setQuery,
  isAdmin,
  busy,
  onCreate,
  onCreateSubject,
  onOpen,
  onExport,
  onDelete,
}) {
  const shown = banks.filter((b) =>
    (b.subject + b.topic + b.grade).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        eyebrow="MATERI PEMBELAJARAN"
        title="Bank soal"
        desc="Bank dan butir soal tersimpan berdasarkan mata pelajaran serta kelas."
        actions={
          <>
            {isAdmin && (
              <button className="secondary" onClick={onCreateSubject}>
                <Plus size={15} /> Mata pelajaran
              </button>
            )}
            <button className="primary" onClick={onCreate}>
              <Plus size={17} /> Buat bank soal
            </button>
          </>
        }
      />
      <div className="filter-row">
        <SearchBox
          query={query}
          setQuery={setQuery}
          placeholder="Cari mata pelajaran atau topik..."
        />
      </div>
      <div className="banks-grid">
        {shown.map((b) => (
          <article className="bank-card" key={b.id}>
            <div
              className={`bank-cover ${["mint", "blue", "peach", "lilac"][Number(b.id) % 4]}`}
            >
              <div className="bank-cover-icon">
                <BookOpen size={22} />
              </div>
              <span>KELAS {b.grade}</span>
              <div className="arabic-motif" dir="rtl">
                {b.subject === "Bahasa Arab"
                  ? "\u0627\u0644\u0644\u063a\u0629 \u0627\u0644\u0639\u0631\u0628\u064a\u0629"
                  : b.subject}
              </div>
            </div>
            <div className="bank-card-body">
              <div className="bank-subject">{b.subject}</div>
              <h3>{b.topic}</h3>
              <div className="bank-metrics">
                <span>
                  <Layers3 size={14} />
                  {b.count} soal
                </span>
                <span>{b.mc} pilihan ganda</span>
                <span>{b.essay} essay</span>
              </div>
              <div className="bank-card-foot">
                <span>ID bank #{b.id}</span>
                <div className="bank-card-actions">
                  {isAdmin && (
                    <button
                      className="bank-delete-action"
                      disabled={busy}
                      title="Hapus bank soal"
                      aria-label={`Hapus bank soal ${b.topic}`}
                      onClick={() => onDelete(b)}
                    >
                      <Trash2 size={13} /> Hapus
                    </button>
                  )}
                  <button
                    className="bank-view-action"
                    onClick={() => onOpen(b)}
                  >
                    Lihat soal <ArrowUpRight size={14} />
                  </button>
                  <button
                    className="bank-export-action"
                    disabled={busy || !b.count}
                    title="Ekspor bank soal ke Excel"
                    aria-label={`Ekspor bank soal ${b.topic} ke Excel`}
                    onClick={() => onExport(b)}
                  >
                    <Download size={13} /> Excel
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
        {!shown.length && (
          <Empty
            message="Bank soal masih kosong"
            detail="Buat bank berdasarkan mata pelajaran dan kelas."
          />
        )}
      </div>
    </>
  );
}
function ExamsPage({exams,isAdmin,canRunExam=false,busy,onCreate,onStatus,onMonitor,onDelete}) {
  return <><PageTitle eyebrow="PENJADWALAN & DISTRIBUSI" title="Ujian" desc="Susun sesi dari bank spesifik; server menyimpan pembagian soal per peserta." actions={isAdmin?<button className="primary" onClick={onCreate}><Plus size={17}/> Buat ujian</button>:null}/><div className="exam-cards"><section className="panel exam-list-card"><div className="panel-head"><div><h2>Rancangan ujian</h2><p>{exams.length} sesi tersimpan</p></div><RefreshCw size={16} color="#91a0ad"/></div>{exams.map(e=><div className="running-exam" key={e.id}><div className="exam-icon"><BookOpen size={20}/></div><div><div className={e.status==='active'?'live-label':'upcoming-label'}>{statusLabel(e.status)}</div><h3>{e.title} &middot; Kelas {e.className}</h3><p>{e.subject} &middot; {e.mcCount} PG + {e.essayCount} essay &middot; {e.durationMinutes} menit &middot; {e.participants} siswa</p></div><div className="exam-actions"><button className="row-action" title="Pantau peserta" aria-label={`Pantau ${e.title}`} onClick={()=>onMonitor(e)}><Eye size={16}/></button>{canRunExam&&e.status!=='active'&&e.status!=='completed'&&<button className="row-action" title="Jalankan ujian" aria-label={`Jalankan ${e.title}`} onClick={()=>onStatus(e,'active')}><Play size={15}/></button>}{isAdmin&&e.status==='active'&&<button className="row-action" title="Akhiri ujian" aria-label={`Akhiri ${e.title}`} onClick={()=>onStatus(e,'completed')}><Pause size={15}/></button>}{isAdmin&&<button className="row-action delete-action" disabled={busy||e.status==='active'} title={e.status==='active'?'Akhiri ujian sebelum menghapus':e.in_progress>0?'Selesaikan sesi peserta sebelum menghapus':'Hapus ujian simulasi'} aria-label={`Hapus ujian ${e.title}`} onClick={()=>onDelete(e)}><Trash2 size={15}/></button>}</div></div>)}{!exams.length&&<Empty message="Belum ada ujian" detail="Buat rancangan untuk mengacak soal bagi peserta."/>}</section><section className="panel rules-card"><div className="panel-head"><div><h2>Aturan pengacakan</h2><p>Ditegakkan di server</p></div><div className="shuffle-badge"><Shuffle size={18}/></div></div><ul><li><Check size={15}/> Bank soal dan kelas dipilih saat membuat sesi</li><li><Check size={15}/> Kuota PG dan essay divalidasi dengan stok</li><li><Check size={15}/> Soal PG & opsi diacak tiap peserta; soal essay tetap urut</li><li><Check size={15}/> Kunci jawaban tidak dikirim pada API bank</li></ul><div className="rule-note"><CircleAlert size={16}/><span>Pengaktifan sesi belum membuka halaman ujian siswa. Itu masuk Phase 2.</span></div></section></div></>;
}
function ResultsPage({results,onReview,onSaveFinalScore,busy}){
  const flagged=results.filter(result=>result.status==='locked'||Number(result.violationCount)>0||Number(result.pendingViolationCount)>0);
  const completed=results.filter(result=>result.status==='completed'&&!Number(result.violationCount)&&!Number(result.pendingViolationCount));
  return <><PageTitle eyebrow="EVALUASI PEMBELAJARAN" title="Hasil ujian" desc="Tinjau hasil yang selesai dan sesi dengan pelanggaran. Setiap tabel dapat diunduh sebagai Excel."/>
    <div className="results-split">
      <ResultsTablePanel title="Hasil dengan pelanggaran" note="Pelanggaran terkonfirmasi atau sinyal untuk ditinjau" rows={flagged} exportName="hasil-pelanggaran-imbs.xlsx" onReview={onReview} onSaveFinalScore={onSaveFinalScore} busy={busy}/>
      <ResultsTablePanel title="Ujian selesai" note="Sesi selesai tanpa pelanggaran" rows={completed} exportName="hasil-selesai-imbs.xlsx" onReview={onReview} onSaveFinalScore={onSaveFinalScore} busy={busy}/>
    </div>
  </>;
}
function ResultsTablePanel({title,note,rows,exportName,onReview,onSaveFinalScore,busy}){
  const [query,setQuery]=useState('');
  const filteredRows=rows.filter(row=>String(row.studentName||'').toLocaleLowerCase('id-ID').includes(query.toLocaleLowerCase('id-ID').trim()));
  const canExport=rows.length>0&&rows.every(r=>r.finalScore!==null&&r.finalScore!==undefined);
  return <section className="panel results-panel"><div className="panel-head"><div><h2>{title}</h2><p>{rows.length} siswa{query ? ` · ${filteredRows.length} cocok` : ''} · {note}</p></div><button className="secondary" disabled={!canExport} title={!canExport?(rows.length===0?'Belum ada data untuk diekspor':'Eksport Excel hanya aktif ketika semua siswa telah memiliki nilai akhir'):'Eksport ke Excel'} onClick={()=>exportResults(rows,exportName)}><Download size={14}/> Excel</button></div>
    <label className="results-search"><Search size={14}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Cari nama siswa..." aria-label={`Cari nama siswa pada card ${title}`}/></label>
    <div className="student-table wide results-table"><table><thead><tr><th>UJIAN / KELAS</th><th>NAMA SISWA</th><th>STATUS</th><th>PELANGGARAN</th><th>SINYAL MENUNGGU</th><th>PG BENAR</th><th>PG SALAH</th><th>PG KOSONG</th><th>ESSAY</th><th>SELESAI</th><th>NILAI AKHIR</th></tr></thead><tbody>
      {filteredRows.map((r,i)=><tr key={r.examId+'-'+r.studentId+'-'+i}>
        <td><b>{r.title}</b><small>{r.username} · {r.className}</small></td><td>{r.studentName}</td><td>{statusLabel(r.status)}</td><td>{Number(r.violationCount)||0}</td><td>{Number(r.pendingViolationCount)||0}</td>
        <td className="result-metric">{r.mcCorrectCount}<small>{formatPoints(r.mcPointsEarned)} / {formatPoints(r.mcPointsTotal)} poin</small></td>
        <td className="result-metric">{r.mcWrongCount}</td><td className="result-metric">{r.mcUnansweredCount}</td>
        <td>{r.essayCount>0?<button className="text-button" onClick={()=>onReview(r)}>{r.essayPending?'Koreksi':'Lihat nilai'}</button>:'-'}</td>
        <td>{r.finishedAt?new Date(r.finishedAt).toLocaleString('id-ID'):'-'}</td>
        <td className="final-score-display-cell">
          {r.finalScore !== null && r.finalScore !== undefined ? (
            <div className="auto-score-badge" title={`Nilai akhir akumulasi otomatis sistem (PG ${r.mcCorrectCount} benar, Essay terbobot)`}>
              <b>{formatPoints(r.finalScore)}</b>
              <small>Otomatis</small>
            </div>
          ) : r.essayPending ? (
            <span className="auto-score-pending" title="Koreksi essay terlebih dahulu untuk melihat nilai akhir">Perlu Koreksi</span>
          ) : (
            <span className="auto-score-empty">—</span>
          )}
        </td>
      </tr>)}
    </tbody></table>{!filteredRows.length&&<div className="results-table-empty">{rows.length ? 'Tidak ada siswa dengan nama tersebut.' : 'Belum ada hasil pada kategori ini.'}</div>}</div>
  </section>;
}
function FinalScoreInput({result,onSave,busy}){
  const [score,setScore]=useState(result.finalScore??'');
  useEffect(()=>setScore(result.finalScore??''),[result.finalScore]);
  const valid=score!==''&&Number.isFinite(Number(score))&&Number(score)>=0&&Number(score)<=100;
  return <div className="final-score-editor">
    <input type="number" min="0" max="100" step="0.01" value={score} onChange={event=>setScore(event.target.value)} aria-label={"Nilai akhir " + result.studentName} placeholder="0-100"/>
    <button className="primary" disabled={busy||!valid} onClick={()=>onSave(result,score)}>{result.finalScore===null||result.finalScore===undefined?'Simpan':'Perbarui'}</button>
    {result.finalScore!==null&&result.finalScore!==undefined&&<small>Tersimpan: {formatPoints(result.finalScore)}</small>}
  </div>;
}
function EssayReview({result,answers,onGrade,busy}){
  return <><div className="essay-review-heading"><b>{result?.studentName}</b><span>{result?.title} - PG benar {result?.mcCorrectCount}, salah {result?.mcWrongCount}, kosong {result?.mcUnansweredCount}</span></div>
    <div className="essay-review-list">{answers.map(item=><EssayGradeRow key={item.questionId} item={item} onGrade={onGrade} busy={busy}/>)}{!answers.length&&<Empty message="Tidak ada jawaban essay yang perlu dikoreksi."/>}</div>
  </>;
}
function EssayGradeRow({item,onGrade,busy}){
  const [score,setScore]=useState(item.essayScore??'');
  useEffect(()=>setScore(item.essayScore??''),[item.essayScore]);
  const valid=score!==''&&Number.isFinite(Number(score))&&Number(score)>=0&&Number(score)<=100;
  return <article className="essay-grade-card">
    <div className="essay-grade-meta"><b>Jawaban essay (Bobot {item.points ?? 1} poin)</b><span>Skala nilai guru: 0-100</span></div>
    <p dir="auto">{item.prompt}</p><div className="essay-student-answer" dir="auto">{item.answer||'Tidak ada jawaban'}</div>
    <div className="essay-grade-controls"><label>Nilai<input type="number" min="0" max="100" step="0.01" value={score} onChange={event=>setScore(event.target.value)}/><span>/ 100</span></label>
      <button className="primary" disabled={busy||!valid} onClick={()=>onGrade(item.questionId,score)}>{item.essayScore===null||item.essayScore===undefined?'Simpan nilai':'Perbarui nilai'}</button>
    </div>
  </article>;
}
function ItemAnalysisPage({
  banks,
  selectedBankId,
  onSelectBank,
  analysisData,
  loading,
  onExport,
  query,
  setQuery,
}) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [diffFilter, setDiffFilter] = useState('all');
  const [statModal, setStatModal] = useState(null);

  const items = analysisData?.items || [];
  const bank = analysisData?.bank;
  const locked = !loading && selectedBankId && !items.length && !bank;

  const filteredItems = items.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (diffFilter !== 'all' && item.difficulty !== diffFilter) return false;
    if (query && !item.prompt.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const totalAssignedTotal = items.reduce((acc, it) => acc + (it.totalAssigned || 0), 0);
  const totalCorrectTotal = items.reduce((acc, it) => acc + (it.totalCorrect || 0), 0);
  const overallP = totalAssignedTotal > 0 ? (Math.round((totalCorrectTotal / totalAssignedTotal) * 100) / 100).toFixed(2) : '0.00';
  const mudahCount = items.filter(it => it.difficulty === 'Mudah').length;
  const sedangCount = items.filter(it => it.difficulty === 'Sedang').length;
  const sukarCount = items.filter(it => it.difficulty === 'Sukar').length;
  const unassignedCount = items.filter(it => (it.totalAssigned || 0) === 0).length;

  return (
    <>
      <PageTitle
        eyebrow="EVALUASI & KUALITAS SOAL"
        title="Analisis Soal"
        desc="Tingkat kesukaran dan daya serap butir soal dari bank soal yang telah selesai digunakan dalam ujian."
        actions={
          <button
            className="primary"
            disabled={!items.length}
            onClick={onExport}
          >
            <Download size={15} /> Ekspor Excel
          </button>
        }
      />

      <div className="filter-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ minWidth: 260 }}>
          <select
            value={selectedBankId}
            onChange={e => onSelectBank(e.target.value)}
            style={{ width: '100%', height: 38, borderRadius: 8, padding: '0 10px', borderColor: '#dce2e6' }}
          >
            {banks.map(b => (
              <option key={b.id} value={b.id}>
                {b.subject} · Tingkat {b.grade} · {b.topic} ({b.count} soal)
              </option>
            ))}
            {!banks.length && <option value="">Belum ada bank soal</option>}
          </select>
        </div>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ width: 140, height: 38, borderRadius: 8, padding: '0 10px', borderColor: '#dce2e6' }}
        >
          <option value="all">Semua Tipe</option>
          <option value="mc">Pilihan Ganda</option>
          <option value="essay">Essay</option>
        </select>

        <select
          value={diffFilter}
          onChange={e => setDiffFilter(e.target.value)}
          style={{ width: 160, height: 38, borderRadius: 8, padding: '0 10px', borderColor: '#dce2e6' }}
        >
          <option value="all">Semua Kesulitan</option>
          <option value="Mudah">Mudah (P ≥ 0.70)</option>
          <option value="Sedang">Sedang (0.30–0.69)</option>
          <option value="Sukar">Sukar (P &lt; 0.30)</option>
          <option value="Belum diuji">Belum diuji (P = 0)</option>
        </select>

        <div style={{ flex: 1, minWidth: 200 }}>
          <SearchBox
            query={query}
            setQuery={setQuery}
            placeholder="Cari teks butir pertanyaan..."
          />
        </div>
      </div>

      {bank && (
        <section className="stats-grid" style={{ marginBottom: 18 }}>
          <Stat
            title="Total Butir Soal"
            value={items.length}
            hint={`${items.filter(i => i.type === 'mc').length} PG · ${items.filter(i => i.type === 'essay').length} Essay`}
            icon={BookOpen}
            tone="blue"
            onClick={() => setStatModal('bank')}
          />
          <Stat
            title="Peserta Selesai"
            value={`${bank.completedParticipants || 0} / ${bank.totalParticipants || 0}`}
            hint={`Tingkat ${bank.grade} · ${bank.subject}`}
            icon={Users}
            tone="green"
            onClick={() => setStatModal('participants')}
          />
          <Stat
            title="Rata-rata Indeks (P)"
            value={overallP}
            hint="Rasio jawaban benar seluruh butir"
            icon={Scale}
            tone="purple"
            onClick={() => setStatModal('difficulty')}
          />
          <Stat
            title="Komposisi Soal"
            value={`${mudahCount}M · ${sedangCount}S · ${sukarCount}K`}
            hint={unassignedCount > 0 ? `${unassignedCount} belum diuji · klik detail` : "Mudah · Sedang · Sukar"}
            icon={BarChart3}
            tone="orange"
            onClick={() => setStatModal('composition')}
          />
        </section>
      )}

      <section className="panel full-panel">
        <div className="panel-head">
          <div>
            <h2>Tabel Analisis Butir Soal</h2>
            <p>
              {bank ? `${bank.subject} · Tingkat ${bank.grade} · ${bank.topic}` : locked ? 'Bank soal ini belum selesai digunakan dalam ujian.' : 'Pilih bank soal untuk memuat data analisis'}
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8894a3' }}>
            <RefreshCw size={20} className="spinning" /> Memuat analisis soal…
          </div>
        ) : (
          <div className="item-analysis-wrapper">
            <table className="item-analysis-table">
              <thead>
                <tr>
                  <th style={{ width: 50, textAlign: 'center' }}>NO</th>
                  <th style={{ width: 90 }}>TIPE</th>
                  <th>PERTANYAAN</th>
                  <th style={{ width: 75 }}>BOBOT</th>
                  <th style={{ width: 85 }}>TERJAWAB</th>
                  <th style={{ width: 75 }}>BENAR</th>
                  <th style={{ width: 75 }}>SALAH</th>
                  <th style={{ width: 75 }}>KOSONG</th>
                  <th style={{ width: 90 }}>INDEKS P</th>
                  <th style={{ width: 120 }}>KESULITAN</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const diffTone = item.difficulty === 'Mudah'
                    ? { bg: '#eaf6f1', color: '#279a70' }
                    : item.difficulty === 'Sedang'
                      ? { bg: '#fff7ed', color: '#c27803' }
                      : item.difficulty === 'Sukar'
                        ? { bg: '#fdf2f2', color: '#b91c1c' }
                        : { bg: '#f1f5f9', color: '#64748b' };

                  return (
                    <tr key={item.questionId}>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>#{item.number}</td>
                      <td>
                        <span className={`badge ${item.type === 'mc' ? 'badge-neutral' : 'badge-gold'}`}>
                          {item.type === 'mc' ? 'PG' : 'Essay'}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'normal', lineHeight: 1.5, minWidth: 260 }} dir="auto">
                        {item.prompt}
                      </td>
                      <td><b>{item.points} pt</b></td>
                      <td>
                        <b>{item.totalAnswered}</b>
                        <small style={{ color: '#8a96a3', display: 'block', fontSize: 10 }}>
                          {item.totalAssigned > 0 ? Math.round((item.totalAnswered / item.totalAssigned) * 100) : 0}%
                        </small>
                      </td>
                      <td style={{ color: '#16a34a', fontWeight: 700 }}>
                        {item.totalCorrect}
                      </td>
                      <td style={{ color: '#dc2626', fontWeight: 700 }}>
                        {item.totalIncorrect}
                      </td>
                      <td style={{ color: '#6b7280' }}>
                        {item.totalBlank}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {Number(item.difficultyIndex ?? 0).toFixed(2)}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: 12,
                          fontSize: 10,
                          fontWeight: 700,
                          background: diffTone.bg,
                          color: diffTone.color,
                        }}>
                          {item.difficulty}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!filteredItems.length && (
              <Empty
                message={locked ? "Analisis belum tersedia" : "Tidak ada butir soal"}
                detail={locked ? "Bank soal ini belum selesai digunakan dalam ujian." : banks.length ? "Belum ada data butir soal yang sesuai dengan kriteria filter." : "Belum ada bank soal."}
              />
            )}
          </div>
        )}
      </section>

      {statModal === 'bank' && (
        <Modal title="Detail Butir Soal Bank" onClose={() => setStatModal(null)}>
          <div style={{ display: 'grid', gap: 10, padding: '4px 0 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Total Butir di Bank Soal</span>
              <b>{items.length} butir</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Pilihan Ganda (PG)</span>
              <b>{items.filter(i => i.type === 'mc').length} butir</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Essay</span>
              <b>{items.filter(i => i.type === 'essay').length} butir</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Butir Soal Diujikan</span>
              <b style={{ color: '#16a34a' }}>{items.filter(i => (i.totalAssigned || 0) > 0).length} butir</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Butir Belum Diujikan</span>
              <b style={{ color: '#64748b' }}>{unassignedCount} butir</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Total Akumulasi Bobot</span>
              <b>{items.reduce((acc, i) => acc + (Number(i.points) || 1), 0)} pt</b>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="secondary" style={{ flex: 1 }} onClick={() => { setTypeFilter('all'); setStatModal(null); }}>Semua Tipe</button>
              <button className="secondary" style={{ flex: 1 }} onClick={() => { setTypeFilter('mc'); setStatModal(null); }}>Hanya PG</button>
              <button className="secondary" style={{ flex: 1 }} onClick={() => { setTypeFilter('essay'); setStatModal(null); }}>Hanya Essay</button>
            </div>
          </div>
        </Modal>
      )}

      {statModal === 'participants' && (
        <Modal title="Detail Partisipasi Peserta" onClose={() => setStatModal(null)}>
          <div style={{ display: 'grid', gap: 10, padding: '4px 0 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Bank Soal</span>
              <b>{bank?.topic || '-'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Mata Pelajaran</span>
              <b>{bank?.subject || '-'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Tingkatan Kelas</span>
              <b>{bank?.grade || '-'}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Peserta Selesai</span>
              <b style={{ color: '#16a34a' }}>{bank?.completedParticipants || 0} siswa</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Total Terdaftar</span>
              <b>{bank?.totalParticipants || 0} siswa</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Persentase Penyelesaian</span>
              <b>{bank?.totalParticipants > 0 ? Math.round(((bank.completedParticipants || 0) / bank.totalParticipants) * 100) : 0}%</b>
            </div>
          </div>
        </Modal>
      )}

      {statModal === 'difficulty' && (
        <Modal title="Detail Rata-rata Indeks (P)" onClose={() => setStatModal(null)}>
          <div style={{ display: 'grid', gap: 10, padding: '4px 0 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Rata-rata Indeks Kesukaran (P)</span>
              <b style={{ color: '#7c3aed', fontSize: 16 }}>{overallP}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Total Jawaban Benar</span>
              <b style={{ color: '#16a34a' }}>{totalCorrectTotal}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Total Jawaban Salah</span>
              <b style={{ color: '#dc2626' }}>{items.reduce((acc, it) => acc + (it.totalIncorrect || 0), 0)}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8 }}>
              <span style={{ color: '#64748b' }}>Total Soal Kosong</span>
              <b style={{ color: '#64748b' }}>{items.reduce((acc, it) => acc + (it.totalBlank || 0), 0)}</b>
            </div>
            <div style={{ padding: '12px 14px', background: '#f1f5f9', borderRadius: 8, fontSize: 11, lineHeight: 1.6, color: '#475569' }}>
              <b>Panduan Klasifikasi Indeks (P):</b><br/>
              • <b>P ≥ 0.70</b> : Butir soal kategori <b>Mudah</b><br/>
              • <b>0.30 ≤ P &lt; 0.70</b> : Butir soal kategori <b>Sedang</b><br/>
              • <b>P &lt; 0.30</b> : Butir soal kategori <b>Sukar</b>
            </div>
          </div>
        </Modal>
      )}

      {statModal === 'composition' && (
        <Modal title="Detail Komposisi Kesulitan Soal" onClose={() => setStatModal(null)}>
          <div style={{ display: 'grid', gap: 10, padding: '4px 0 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#eaf6f1', borderRadius: 8, color: '#15803d' }}>
              <span>Kategori Mudah (P ≥ 0.70)</span>
              <b>{mudahCount} butir ({items.length ? Math.round((mudahCount / items.length) * 100) : 0}%)</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#fff7ed', borderRadius: 8, color: '#c2410c' }}>
              <span>Kategori Sedang (0.30–0.69)</span>
              <b>{sedangCount} butir ({items.length ? Math.round((sedangCount / items.length) * 100) : 0}%)</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#fdf2f2', borderRadius: 8, color: '#b91c1c' }}>
              <span>Kategori Sukar (P &lt; 0.30)</span>
              <b>{sukarCount} butir ({items.length ? Math.round((sukarCount / items.length) * 100) : 0}%)</b>
            </div>
            {unassignedCount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: 8, color: '#64748b' }}>
                <span>Belum Diujikan (P = 0)</span>
                <b>{unassignedCount} butir ({items.length ? Math.round((unassignedCount / items.length) * 100) : 0}%)</b>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
              <button className="secondary" onClick={() => { setDiffFilter('Mudah'); setStatModal(null); }}>Filter Mudah</button>
              <button className="secondary" onClick={() => { setDiffFilter('Sedang'); setStatModal(null); }}>Filter Sedang</button>
              <button className="secondary" onClick={() => { setDiffFilter('Sukar'); setStatModal(null); }}>Filter Sukar</button>
              <button className="secondary" onClick={() => { setDiffFilter('all'); setStatModal(null); }}>Semua Kesulitan</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
function PageTitle({eyebrow,title,desc,actions}){return <div className="page-title-row"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{desc}</p></div><div className="button-row">{actions}</div></div>;}
function SearchBox({query,setQuery,placeholder}){return <div className="search-box"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={placeholder}/></div>;}
function Empty({message,detail}){return <div className="empty-results"><div><ChartNoAxesColumn size={24}/></div><h3>{message}</h3>{detail&&<p>{detail}</p>}</div>;}
function Modal({title,onClose,children,className=''}){return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className={`modal ${className}`}><div className="modal-head"><div><div className="eyebrow">IMBS CBT</div><h2>{title}</h2></div><button className="icon-button" onClick={onClose}><X size={18}/></button></div>{children}</div></div>;}
function ModalActions({close,save,busy,label,icon}){return <div className="modal-actions"><button className="secondary" onClick={close}>Batal</button><button className="primary" disabled={busy} onClick={save}>{busy?'Menyimpan...':(icon?<><span>{icon}</span>{label}</>:label)}</button></div>;}
function SettingsPage({settings,onChange,onSave,onCancel,busy}){
  const update=(key,value)=>onChange(current=>({...current,[key]:value}));
  return <>
    <PageTitle eyebrow="KONFIGURASI SEKOLAH" title="Pengaturan" desc="Atur identitas sekolah, periode akademik, daftar kelas, dan aturan bawaan ujian." actions={<><button className="secondary" disabled={busy} onClick={onCancel}>Batalkan perubahan</button><button className="primary" disabled={busy} onClick={onSave}>{busy?'Menyimpan...':'Simpan pengaturan'}</button></>}/>
    <div className="settings-grid">
      <div className="settings-col settings-col-main">
        <section className="panel settings-card">
          <div className="settings-card-title"><div><h2>Identitas akademik</h2><p>Informasi yang tampil pada ruang kerja dan header.</p></div><GraduationCap size={19}/></div>
          <label>Nama sekolah<input maxLength="100" value={settings.schoolName} onChange={event=>update('schoolName',event.target.value)} placeholder="Nama sekolah"/></label>
          <div className="settings-fields-row"><label>Tahun ajaran<input value={settings.academicYear} onChange={event=>update('academicYear',event.target.value)} placeholder="2026/2027"/></label><label>Semester<select value={settings.semester} onChange={event=>update('semester',event.target.value)}><option>Ganjil</option><option>Genap</option></select></label></div>
        </section>
        <section className="panel settings-card">
          <div className="settings-card-title"><div><h2>Aturan ujian</h2><p>Nilai awal yang digunakan saat membuat ujian.</p></div><ShieldCheck size={19}/></div>
          <div className="settings-fields-row"><label>Durasi bawaan (menit)<input type="number" min="1" max="480" step="1" value={settings.defaultExamDurationMinutes} onChange={event=>update('defaultExamDurationMinutes',event.target.value)}/></label><label>Batas pelanggaran<input type="number" min="1" max="10" step="1" value={settings.violationThreshold} onChange={event=>update('violationThreshold',event.target.value)}/></label></div>
          <div className="settings-note"><CircleAlert size={15}/><span>Batas pelanggaran baru berlaku setelah disimpan dan tidak dapat diubah saat ujian terjadwal/berlangsung atau siswa sedang mengerjakan. Saat ambang tercapai, sesi menunggu tinjauan Admin.</span></div>
        </section>
        <section className="panel settings-card">
          <div className="settings-card-title"><div><h2>Bobot Penilaian Nilai Akhir</h2><p>Atur persentase akumulasi otomatis untuk nilai PG dan Essay.</p></div><Scale size={19}/></div>
          <div className="settings-fields-row">
            <label>Bobot Nilai PG (%)
              <input type="number" min="0" max="100" step="1" value={settings.mcWeightPercentage ?? 50} onChange={event=>{
                const raw = event.target.value;
                if (raw === '') { update('mcWeightPercentage', ''); return; }
                const val = Number(raw);
                if (!Number.isInteger(val) || val < 0 || val > 100) { update('mcWeightPercentage', raw); return; }
                onChange(current=>({...current, mcWeightPercentage: val, essayWeightPercentage: 100 - val}));
              }}/>
            </label>
            <label>Bobot Nilai Essay (%)
              <input type="number" min="0" max="100" step="1" value={settings.essayWeightPercentage ?? 50} onChange={event=>{
                const raw = event.target.value;
                if (raw === '') { update('essayWeightPercentage', ''); return; }
                const val = Number(raw);
                if (!Number.isInteger(val) || val < 0 || val > 100) { update('essayWeightPercentage', raw); return; }
                onChange(current=>({...current, essayWeightPercentage: val, mcWeightPercentage: 100 - val}));
              }}/>
            </label>
          </div>
          <div className="settings-note"><CircleAlert size={15}/><span>Total bobot PG ({settings.mcWeightPercentage ?? 50}%) + Essay ({settings.essayWeightPercentage ?? 50}%) harus 100%. Sistem otomatis mengakumulasi nilai akhir tiap siswa setelah essay dikoreksi tanpa perlu input manual.</span></div>
        </section>
      </div>
      <div className="settings-col settings-col-side">
        <SettingsListEditor title="Kelas peserta" description="Pilihan kelas untuk siswa dan ujian." values={settings.classes} maximum={40} maximumLength={32} onChange={values=>update('classes',values)}/>
        <SettingsListEditor title="Tingkat bank soal" description="Pilihan tingkat yang digunakan saat membuat bank soal." values={settings.grades} maximum={20} maximumLength={12} onChange={values=>update('grades',values)}/>
      </div>
    </div>
  </>;
}

function SettingsListEditor({title,description,values,maximum,maximumLength,onChange}){
  const [value,setValue]=useState('');
  const [error,setError]=useState('');
  const add=()=>{
    const next=value.trim();
    if(!next){setError('Isi nama sebelum menambahkan.');return;}
    if(next.length>maximumLength){setError(`Maksimal ${maximumLength} karakter.`);return;}
    if(values.some(item=>item.toLocaleLowerCase('id-ID')===next.toLocaleLowerCase('id-ID'))){setError('Item tersebut sudah ada.');return;}
    if(values.length>=maximum){setError(`Maksimal ${maximum} item.`);return;}
    onChange([...values,next]);setValue('');setError('');
  };
  return <section className="panel settings-card settings-list-card">
    <div className="settings-card-title"><div><h2>{title}</h2><p>{description}</p></div><span className="settings-count">{values.length}</span></div>
    <div className="settings-list-input"><input maxLength={maximumLength} value={value} onChange={event=>{setValue(event.target.value);setError('');}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();add();}}} placeholder={`Tambah ${title.toLowerCase()}`}/><button className="secondary" type="button" onClick={add}><Plus size={14}/> Tambah</button></div>
    {error&&<div className="settings-list-error" role="alert">{error}</div>}
    <div className="settings-chips">{values.map(item=><span className="settings-chip" key={item}>{item}<button type="button" aria-label={`Hapus ${item}`} title={`Hapus ${item}`} onClick={()=>{if(values.length>1)onChange(values.filter(value=>value!==item));else setError('Daftar harus menyisakan sedikitnya satu item.');}}><X size={13}/></button></span>)}</div>
    <small className="settings-list-hint">Item yang masih dipakai siswa, ujian, atau bank soal tidak dapat dihapus.</small>
  </section>;
}

function statusLabel(s){return ({draft:'DRAF',scheduled:'TERJADWAL',active:'BERLANGSUNG',completed:'SELESAI',not_started:'BELUM MULAI',in_progress:'MENGERJAKAN',locked:'TERKUNCI',completed:'SELESAI'})[s]||String(s||'').toUpperCase();}
function formatPoints(value){return new Intl.NumberFormat('id-ID',{maximumFractionDigits:2}).format(Number(value)||0);}




