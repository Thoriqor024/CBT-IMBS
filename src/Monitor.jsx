import { useEffect, useState } from 'react';
import { RefreshCw, CircleAlert, ShieldCheck, ChevronDown, ChevronUp, Clock3, Wifi, WifiOff, Check, X, RotateCcw } from 'lucide-react';

const eventLabels = {
  tab_hidden: 'Tab ujian tersembunyi',
  window_blur: 'Jendela kehilangan fokus',
  fullscreen_exit: 'Keluar dari layar penuh',
  blocked_shortcut: 'Pintasan terlarang',
  clipboard: 'Akses clipboard',
  context_menu: 'Menu klik kanan',
  admin_report: 'Catatan pengawas',
  admin_reset: 'Sesi dipulihkan oleh pengawas',
};

export default function Monitor({exam,students,canManage,canRecordViolation=false,onRefresh,onViolation,onReviewEvent,onReviewSession,onReset}){
  const [expanded,setExpanded]=useState({});
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{if(!exam?.id)return;const refresh=setInterval(()=>onRefresh(),5000),clock=setInterval(()=>setNow(Date.now()),1000);return()=>{clearInterval(refresh);clearInterval(clock);};},[exam?.id]);
  const count={running:students.filter(s=>s.status==='in_progress').length,done:students.filter(s=>s.status==='completed'&&!Number(s.violationCount)).length,warning:students.filter(s=>s.status==='in_progress'&&(s.violationReviewRequired||Number(s.violationCount)>0)).length,blocked:students.filter(s=>s.status==='locked').length,pending:students.reduce((total,s)=>total+(s.events||[]).filter(event=>event.reviewStatus==='pending').length,0)};
  const toggle=id=>setExpanded(current=>({...current,[id]:!current[id]}));
  return <>
    <div className="monitor-legend"><span><i className="monitor-signal in_progress"/>Sedang ujian · abu-abu</span><span><i className="monitor-signal completed"/>Selesai · hijau</span><span><i className="monitor-signal warning"/>Menunggu keputusan · kuning</span><span><i className="monitor-signal violation"/>Diblokir oleh pengawas · merah</span></div>
    <div className="monitor-toolbar"><span>{students.length} peserta · {count.running} mengerjakan · {count.done} selesai · {count.warning} perlu ditinjau · {count.blocked} diblokir · {count.pending} sinyal menunggu tinjauan</span><button className="secondary" onClick={onRefresh}><RefreshCw size={14}/> Perbarui</button></div>
    <div className="monitor-list">{students.map(s=>{
      const n=Number(s.violationCount)||0,blocked=s.status==='locked',reviewRequired=s.status==='in_progress'&&Boolean(s.violationReviewRequired),warning=!blocked&&(reviewRequired||n>0),signal=blocked?'violation':warning?'warning':s.status;
      const label=blocked?'DIBLOKIR':reviewRequired?'MENUNGGU PENGAWAS':warning?`PERINGATAN ${n}/2`:s.status==='in_progress'?'SEDANG UJIAN':s.status==='completed'?'SELESAI':'BELUM MULAI';
      const events=Array.isArray(s.events)?[...s.events].reverse():[];
      return <div className="monitor-person" key={s.id}>
        <div className={`monitor-row ${blocked?'has-violation':warning?'has-warning':''}`}>
          <span className={`monitor-signal ${signal}`}/><b>{s.name}</b><code>{s.username}</code><span>{s.className}</span>
          <span className={`monitor-state ${blocked?'violation-text':warning?'warning-text':''}`}>{label}{s.status==='in_progress'&&(()=>{const live=Boolean(s.lastPingAt&&now-Date.parse(s.lastPingAt)<35000);return <small className={`monitor-presence ${live?'online':'offline'}`}>{live?<Wifi size={11}/>:<WifiOff size={11}/>} {live?'Online':'Terputus'}</small>;})()}</span>
          <span>{s.score??'—'}</span>
          <div className="monitor-actions">
            {events.length>0&&<button className="evidence-toggle" onClick={()=>toggle(s.id)} title="Tampilkan riwayat sinyal"><Clock3 size={13}/>{events.length}{expanded[s.id]?<ChevronUp size={13}/>:<ChevronDown size={13}/>}</button>}
            {canRecordViolation&&exam?.status==='active'&&s.status==='in_progress'&&!reviewRequired&&<button className="flag-action" title="Catat pelanggaran yang diamati pengawas" onClick={()=>onViolation(s)}><CircleAlert size={14}/></button>}
            {canManage&&exam?.status==='active'&&(s.status==='locked'||n>0)&&<button title="Pulihkan sesi dengan alasan audit" onClick={()=>onReset(s)}><RotateCcw size={14}/></button>}
            {(s.status==='completed'||s.status==='locked')&&<span className="monitor-locked-mark">{blocked?<CircleAlert size={15}/>:<ShieldCheck size={15}/>}</span>}
          </div>
        </div>
        {reviewRequired&&canManage&&<section className="monitor-threshold-review" aria-label={`Keputusan pengawas untuk ${s.name}`}>
          <div><b>Ambang dua pelanggaran tercapai.</b><p>{s.pendingViolationCount||0} sinyal masih menunggu tinjauan. Periksa riwayat sebelum memilih keputusan.</p>{events.length>0&&<button className="evidence-toggle" onClick={()=>toggle(s.id)}>{expanded[s.id]?'Sembunyikan riwayat':'Lihat riwayat'} {expanded[s.id]?<ChevronUp size={13}/>:<ChevronDown size={13}/>}</button>}</div>
          <div className="monitor-threshold-actions"><button className="confirm" onClick={()=>onReviewSession(s,'block')}><Check size={13}/> Konfirmasi blokir</button><button className="dismiss" onClick={()=>onReviewSession(s,'false_positive')}><X size={13}/> False positive</button></div>
        </section>}
        {expanded[s.id]&&<div className="monitor-evidence" aria-label={`Riwayat sinyal ${s.name}`}>
          {events.map((event,index)=><article className="monitor-evidence-item" key={`${event.createdAt}-${index}`}>
            <i className={`monitor-signal ${blocked?'violation':'warning'}`}/>
            <div><b>{eventLabels[event.code]||event.code} · {event.code==='admin_reset'?'TINDAKAN PENGAWAS':event.reviewStatus==='pending'?'MENUNGGU TINJAUAN':event.reviewStatus==='confirmed'?'DIKONFIRMASI':'FALSE POSITIVE'}</b><time>{new Date(event.createdAt).toLocaleString('id-ID')}</time>{event.detail&&<p dir="auto">{event.detail}</p>}{event.reviewReason&&<p>Keputusan pengawas: {event.reviewReason}</p>}{canManage&&event.reviewStatus==='pending'&&!reviewRequired&&<div className="monitor-review-actions"><button className="confirm" onClick={()=>onReviewEvent(s,event,'confirm')}><Check size={12}/> Konfirmasi</button><button className="dismiss" onClick={()=>onReviewEvent(s,event,'dismiss')}><X size={12}/> False positive</button></div>}</div>
          </article>)}
        </div>}
      </div>;
    })}{!students.length&&<div className="monitor-empty">Belum ada siswa yang ditugaskan pada sesi ini.</div>}</div>
    <div className="form-note"><ShieldCheck size={16}/>{canManage?'Dua sinyal yang menunggu atau sudah dikonfirmasi menahan sesi sampai pengawas memilih konfirmasi blokir atau false positive. Konfirmasi memblokir akses; false positive membuka kembali ujian.':'Sinyal browser ditinjau pengawas dan tidak otomatis mengunci sesi.'} Riwayat sinyal bukan bukti tunggal. Pemantauan diperbarui setiap 5 detik.</div>
  </>;
}
