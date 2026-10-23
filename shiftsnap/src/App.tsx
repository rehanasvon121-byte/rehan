import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { CalendarDays, Download, Palette, RotateCcw, Save, Upload, WandSparkles, ChevronLeft, ChevronRight, ClipboardPaste, Image, Check, Moon, Sun, Coffee } from 'lucide-react'

type Shift = 'pagi' | 'sore' | 'malam' | 'libur'
type Schedule = Record<string, Shift>
type Settings = {
  title: string; owner: string; background: string; surface: string; text: string; muted: string;
  pagi: string; sore: string; malam: string; libur: string; accent: string; radius: number; gap: number;
  fontSize: number; showLegend: boolean; showOutside: boolean; border: boolean; theme: string;
}
const defaults: Settings = {
  title: 'Jadwal Kerja', owner: '', background: '#101827', surface: '#1b2638', text: '#f4f7fb',
  muted: '#9aa8bc', pagi: '#f5bd4f', sore: '#8b8cf6', malam: '#5ba8ff', libur: '#55c7a5', accent: '#f5bd4f',
  radius: 14, gap: 7, fontSize: 13, showLegend: true, showOutside: false, border: true, theme: 'Midnight'
}
const presets: {name:string; values: Partial<Settings>}[] = [
  {name:'Midnight',values:{background:'#101827',surface:'#1b2638',text:'#f4f7fb',muted:'#9aa8bc',pagi:'#f5bd4f',sore:'#8b8cf6',malam:'#5ba8ff',libur:'#55c7a5',accent:'#f5bd4f'}},
  {name:'Pastel',values:{background:'#f5f1eb',surface:'#fffdf9',text:'#303344',muted:'#89899a',pagi:'#f6c8a8',sore:'#c9c5f5',malam:'#a9d5ff',libur:'#b8e0d2',accent:'#b68c77'}},
  {name:'Forest',values:{background:'#10251f',surface:'#1c3930',text:'#f0f7f1',muted:'#a0b9ad',pagi:'#f0c66b',sore:'#91b9e7',malam:'#7cb8ff',libur:'#7ed4a7',accent:'#7ed4a7'}},
  {name:'Clean',values:{background:'#f3f6fa',surface:'#ffffff',text:'#182230',muted:'#68778b',pagi:'#f6d365',sore:'#a9a5f5',malam:'#8fcaff',libur:'#9bdfc7',accent:'#4f6bdb'}},
  {name:'Neon',values:{background:'#11111b',surface:'#202033',text:'#f8f7ff',muted:'#a4a1c1',pagi:'#ffcc66',sore:'#b69cff',malam:'#55baff',libur:'#62e6c5',accent:'#b69cff'}}
]
const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
const weekdays = ['Sen','Sel','Rab','Kam','Jum','Sab','Min']
const keyOf = (y:number,m:number,d:number) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
const shiftLabels: Record<Shift,string> = {pagi:'PAGI',sore:'SORE',malam:'MALAM',libur:'LIBUR'}
const shiftColors = (s:Shift, settings:Settings) => s==='pagi'?settings.pagi:s==='sore'?settings.sore:s==='malam'?settings.malam:settings.libur

function App() {
  const now = new Date()
  const [year,setYear] = useState(now.getFullYear())
  const [month,setMonth] = useState(now.getMonth())
  const [schedule,setSchedule] = useState<Schedule>({})
  const [selected,setSelected] = useState(keyOf(now.getFullYear(),now.getMonth(),now.getDate()))
  const [entryMode,setEntryMode] = useState<'calendar'|'text'>('calendar')
  const [bulkText,setBulkText] = useState('')
  const [settings,setSettings] = useState<Settings>(defaults)
  const [format,setFormat] = useState<'wallpaper'|'calendar'>('calendar')
  const [rangeMode,setRangeMode] = useState(true)
  const [rangeStart,setRangeStart] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-20`)
  const [rangeEnd,setRangeEnd] = useState(`${now.getFullYear()}-${String(now.getMonth()+2>12?1:now.getMonth()+2).padStart(2,'0')}-20`)
  const [notice,setNotice] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('shiftsnap-v1')
      if (saved) {
        const data = JSON.parse(saved)
        if (data.schedule) setSchedule(data.schedule)
        if (data.settings) setSettings({...defaults,...data.settings})
        if (data.year) setYear(data.year)
        if (typeof data.month === 'number') setMonth(data.month)
      }
    } catch { /* ignore malformed local data */ }
  }, [])
  useEffect(() => {
    localStorage.setItem('shiftsnap-v1',JSON.stringify({schedule,settings,year,month}))
  },[schedule,settings,year,month])

  const daysInMonth = new Date(year,month+1,0).getDate()
  const firstOffset = (new Date(year,month,1).getDay()+6)%7
  const cells = useMemo(() => {
    const arr: {day:number; current:boolean; dateKey:string}[] = []
    if (settings.showOutside) {
      for (let i=firstOffset-1;i>=0;i--) {
        const d = new Date(year,month,0-i)
        arr.push({day:d.getDate(),current:false,dateKey:keyOf(d.getFullYear(),d.getMonth(),d.getDate())})
      }
    } else {
      for(let i=0;i<firstOffset;i++) arr.push({day:0,current:false,dateKey:''})
    }
    for(let d=1;d<=daysInMonth;d++) arr.push({day:d,current:true,dateKey:keyOf(year,month,d)})
    if(settings.showOutside) {
      let d=1
      while(arr.length%7!==0) { arr.push({day:d,current:false,dateKey:keyOf(year,month+1,d)}); d++ }
    } else {
      while(arr.length%7!==0) arr.push({day:0,current:false,dateKey:''})
    }
    return arr
  },[year,month,daysInMonth,firstOffset,settings.showOutside])

  const setSetting = <K extends keyof Settings>(key:K,value:Settings[K]) => setSettings(s=>({...s,[key]:value}))
  const setShift = (dateKey:string,shift?:Shift) => setSchedule(prev => {
    const next={...prev}
    if(shift) next[dateKey]=shift; else delete next[dateKey]
    return next
  })
  const applyPreset = (name:string) => {
    const p=presets.find(x=>x.name===name)
    if(p) setSettings(s=>({...s,...p.values,theme:name}))
  }
  const shiftCounts = useMemo(() => Object.values(schedule).reduce((a,s)=>({...a,[s]:a[s]+1}),{pagi:0,sore:0,malam:0,libur:0}),[schedule])
  const changeMonth = (delta:number) => {
    const d = new Date(year,month+delta,1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
    setSelected(keyOf(d.getFullYear(),d.getMonth(),1))
  }
  const parseBulk = () => {
    const text=bulkText.trim()
    if(!text) { setNotice('Silakan masukkan jadwal terlebih dahulu.'); return }
    const next={...schedule}
    let count=0
    const tokens=text.split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean)
    for(const token of tokens) {
      const match=token.match(/^(\d{1,2})\s*[:=\-]?\s*(pagi|p|sore|s|malam|malem|m|libur|l|off|o)$/i)
      if(!match) continue
      const day=Number(match[1]); const code=match[2].toLowerCase()
      if(day<1 || day>daysInMonth) continue
      const shift:Shift = ['pagi','p'].includes(code)?'pagi':['sore','s'].includes(code)?'sore':['malam','malem','m'].includes(code)?'malam':'libur'
      next[keyOf(year,month,day)]=shift; count++
    }
    if(count) {setSchedule(next);setNotice(`${count} jadwal berhasil dimasukkan.`)}
    else setNotice('Format belum dikenali. Contoh: 1P, 2P, 3L, 4S, 5M.')
  }
  const saveNow = () => {
    localStorage.setItem('shiftsnap-v1',JSON.stringify({schedule,settings,year,month}))
    setNotice('Jadwal dan desain berhasil disimpan di browser ini.')
  }
  const resetDesign = () => { setSettings(defaults); setNotice('Desain dikembalikan ke pengaturan awal.') }
  const downloadImage = async () => {
    if(!previewRef.current) return
    try {
      setNotice('Menyiapkan gambar…')
      const node=previewRef.current
      const dataUrl=await toPng(node,{pixelRatio:2,cacheBust:true,backgroundColor:settings.background})
      const a=document.createElement('a')
      a.download=`ShiftSnap_${rangeMode?'Periode_'+rangeStart+'_sampai_'+rangeEnd:monthNames[month]+'_'+year}_${format==='wallpaper'?'Wallpaper':'Kalender'}.png`
      a.href=dataUrl; a.click()
      setNotice('Gambar PNG berhasil dibuat.')
    } catch (e) {
      console.error(e); setNotice('Ekspor gagal. Coba lagi atau gunakan browser Chrome terbaru.')
    }
  }
  const exportJSON = () => {
    const blob=new Blob([JSON.stringify({schedule,settings,year,month},null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob); const a=document.createElement('a')
    a.href=url; a.download=`ShiftSnap_${monthNames[month]}_${year}.json`; a.click(); URL.revokeObjectURL(url)
  }
  const importJSON = (file?:File) => {
    if(!file) return
    const reader=new FileReader()
    reader.onload=()=>{try{
      const d=JSON.parse(String(reader.result))
      if(d.schedule) setSchedule(d.schedule)
      if(d.settings) setSettings({...defaults,...d.settings})
      if(Number.isInteger(d.year)) setYear(d.year)
      if(Number.isInteger(d.month)&&d.month>=0&&d.month<12) setMonth(d.month)
      setNotice('Data berhasil diimpor.')
    }catch{setNotice('File JSON tidak valid.')}}
    reader.readAsText(file)
  }
  const copyPreviousMonth = () => {
    const prev = new Date(year,month-1,1)
    const prevPrefix=`${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}-`
    const next={...schedule}
    for(const k of Object.keys(next)) if(k.startsWith(`${year}-${String(month+1).padStart(2,'0')}-`)) delete next[k]
    for(let d=1;d<=Math.min(daysInMonth,new Date(prev.getFullYear(),prev.getMonth()+1,0).getDate());d++){
      const val=schedule[prevPrefix+String(d).padStart(2,'0')]
      if(val) next[keyOf(year,month,d)]=val
    }
    setSchedule(next);setNotice('Jadwal bulan sebelumnya berhasil disalin untuk tanggal yang tersedia.')
  }

  const rangeDates = useMemo(() => {
    if (!rangeMode || !rangeStart || !rangeEnd || rangeStart > rangeEnd) return []
    const out: {day:number;current:boolean;dateKey:string;date:Date}[] = []
    const start = new Date(rangeStart+'T12:00:00'); const end = new Date(rangeEnd+'T12:00:00')
    for (const d = new Date(start); d <= end && out.length < 100; d.setDate(d.getDate()+1)) out.push({day:d.getDate(),current:true,dateKey:keyOf(d.getFullYear(),d.getMonth(),d.getDate()),date:new Date(d)})
    return out
  },[rangeMode,rangeStart,rangeEnd])
  const rangeWeekdayOffset = rangeDates.length ? (rangeDates[0].date.getDay()+6)%7 : 0
  const previewDays = rangeMode ? [...Array.from({length:rangeWeekdayOffset},()=>({day:0,current:false,dateKey:''})), ...rangeDates] : format==='wallpaper' ? Array.from({length:daysInMonth},(_,i)=>({day:i+1,current:true,dateKey:keyOf(year,month,i+1)})) : cells
  const isWallpaper = format==='wallpaper' && !rangeMode
  const rangeLabel = rangeStart && rangeEnd ? `${new Date(rangeStart+'T12:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long'})} – ${new Date(rangeEnd+'T12:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}` : 'Pilih periode jadwal'
  const rangeValid = !rangeMode || (rangeStart && rangeEnd && rangeStart <= rangeEnd)
  const previewStyle = {
    '--bg':settings.background,'--surface':settings.surface,'--text':settings.text,'--muted':settings.muted,
    '--pagi':settings.pagi,'--sore':settings.sore,'--malam':settings.malam,'--libur':settings.libur,'--accent':settings.accent,
    '--radius':`${settings.radius}px`,'--cell-gap':`${settings.gap}px`,'--font-size':`${settings.fontSize}px`
  } as React.CSSProperties

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><CalendarDays size={21}/></div><div><strong>ShiftSnap</strong><span>Studio Jadwal Kerja</span></div></div>
      <div className="top-actions"><span className="saved-indicator"><span/> Tersimpan otomatis</span><button className="icon-button" title="Simpan sekarang" onClick={saveNow}><Save size={17}/></button></div>
    </header>
    <main className="page">
      <section className="intro"><div><div className="eyebrow"><WandSparkles size={14}/> SHIFT PLANNER</div><h1><em>Jadwal kerja</em> yang lebih teratur.</h1><p>Atur jadwal kerja, sesuaikan desain, lalu unduh sebagai gambar untuk disimpan di perangkat Anda.</p></div><div className="month-chip"><CalendarDays size={17}/><span>{monthNames[month]} {year}</span></div></section>
      <div className="workspace">
        <aside className="editor-column">
          <section className="panel">
            <div className="panel-heading"><div className="step">01</div><div><h2>Jadwal Kerja</h2><p>Pilih tanggal dan tentukan jenis shift.</p></div></div>
            <div className="range-settings"><label className="range-toggle"><input type="checkbox" checked={rangeMode} onChange={e=>setRangeMode(e.target.checked)}/><span>Jadwal berdasarkan rentang tanggal</span></label>{rangeMode&&<div className="range-date-fields"><label>Mulai<input type="date" value={rangeStart} onChange={e=>setRangeStart(e.target.value)}/></label><label>Selesai<input type="date" value={rangeEnd} min={rangeStart} onChange={e=>setRangeEnd(e.target.value)}/></label></div>}{rangeMode&&<p>Preview dan hasil download menampilkan tanggal dalam periode ini saja.</p>}</div>
            <div className="month-controls"><button className="icon-button" onClick={()=>changeMonth(-1)} aria-label="Bulan sebelumnya"><ChevronLeft size={18}/></button><strong>{monthNames[month]} {year}</strong><button className="icon-button" onClick={()=>changeMonth(1)} aria-label="Bulan berikutnya"><ChevronRight size={18}/></button></div>
            <div className="weekday-row">{weekdays.map(d=><span key={d}>{d}</span>)}</div>
            <div className="input-calendar">{cells.map((c,i)=>c.day===0?<div key={`blank-${i}`} className="calendar-blank"/>:<button key={c.dateKey} className={`date-cell ${!c.current?'outside':''} ${selected===c.dateKey?'selected':''}`} onClick={()=>{setSelected(c.dateKey);if(!c.current){const dt=new Date(c.dateKey+'T12:00:00');setYear(dt.getFullYear());setMonth(dt.getMonth())}}}><span>{c.day}</span>{schedule[c.dateKey]&&<i style={{background:shiftColors(schedule[c.dateKey],settings)}}/>}</button>)}</div>
            <div className="selected-date">Tanggal dipilih <strong>{selected ? new Date(selected+'T12:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '—'}</strong></div>
            <div className="shift-buttons">{(['pagi','sore','malam','libur'] as Shift[]).map(s=><button key={s} className={`shift-choice ${schedule[selected]===s?'active':''}`} onClick={()=>setShift(selected,s)}><span style={{background:settings[s]}}/>{shiftLabels[s]}</button>)}<button className="clear-choice" onClick={()=>setShift(selected,undefined)} title="Kosongkan tanggal"><RotateCcw size={15}/></button></div>
            <div className="stats-row"><div><Sun size={15}/><span>Pagi</span><b>{shiftCounts.pagi}</b></div><div><Moon size={15}/><span>Sore</span><b>{shiftCounts.sore}</b></div><div><Moon size={15}/><span>Malam</span><b>{shiftCounts.malam}</b></div><div><Coffee size={15}/><span>Libur</span><b>{shiftCounts.libur}</b></div></div>
            <button className="subtle-button full" onClick={copyPreviousMonth}>Salin jadwal bulan sebelumnya</button>
            <div className="entry-switch"><button className={entryMode==='calendar'?'active':''} onClick={()=>setEntryMode('calendar')}><CalendarDays size={15}/> Kalender</button><button className={entryMode==='text'?'active':''} onClick={()=>setEntryMode('text')}><ClipboardPaste size={15}/> Input teks</button></div>
            {entryMode==='text'&&<div className="bulk-entry"><label htmlFor="bulk">Isi beberapa tanggal sekaligus</label><textarea id="bulk" value={bulkText} onChange={e=>setBulkText(e.target.value)} placeholder="Contoh: 1P, 2P, 3L, 4S, 5S&#10;P = Pagi · S = Sore · M = Malam · L = Libur"/><button className="primary-button full" onClick={parseBulk}>Terapkan jadwal</button></div>}
          </section>
          <section className="panel">
            <div className="panel-heading"><div className="step">02</div><div><h2>Personalisasi</h2><p>Sesuaikan tampilan dengan preferensi Anda.</p></div></div>
            <div className="field"><label>Judul jadwal</label><input value={settings.title} onChange={e=>setSetting('title',e.target.value)} placeholder="Jadwal Kerja"/></div>
            <div className="field"><label>Nama (opsional)</label><input value={settings.owner} onChange={e=>setSetting('owner',e.target.value)} placeholder="Masukkan nama"/></div>
            <div className="field"><label>Preset warna</label><div className="preset-grid">{presets.map(p=><button key={p.name} className={`preset ${settings.theme===p.name?'active':''}`} onClick={()=>applyPreset(p.name)}><span className="swatches">{[p.values.pagi,p.values.sore,p.values.libur].map(c=><i key={c} style={{background:c}}/>)}</span>{p.name}</button>)}</div></div>
            <div className="field"><label>Warna desain</label><div className="color-grid">{([{key:'background',label:'Latar'},{key:'surface',label:'Kartu'},{key:'text',label:'Teks'},{key:'accent',label:'Aksen'},{key:'pagi',label:'Pagi'},{key:'sore',label:'Sore'},{key:'malam',label:'Malam'},{key:'libur',label:'Libur'}] as {key:keyof Settings;label:string}[]).map(c=><label className="color-field" key={c.key}><input type="color" value={String(settings[c.key])} onChange={e=>setSetting(c.key,e.target.value)}/><span>{c.label}</span></label>)}</div></div>
            <div className="field range-field"><label>Sudut rounded <b>{settings.radius}px</b></label><input type="range" min="0" max="28" value={settings.radius} onChange={e=>setSetting('radius',Number(e.target.value))}/></div>
            <div className="field range-field"><label>Jarak tanggal <b>{settings.gap}px</b></label><input type="range" min="2" max="14" value={settings.gap} onChange={e=>setSetting('gap',Number(e.target.value))}/></div>
            <div className="field range-field"><label>Ukuran teks <b>{settings.fontSize}px</b></label><input type="range" min="9" max="18" value={settings.fontSize} onChange={e=>setSetting('fontSize',Number(e.target.value))}/></div>
            <div className="toggle-list"><label><span>Tampilkan legenda</span><input type="checkbox" checked={settings.showLegend} onChange={e=>setSetting('showLegend',e.target.checked)}/></label><label><span>Tampilkan tanggal luar bulan</span><input type="checkbox" checked={settings.showOutside} onChange={e=>setSetting('showOutside',e.target.checked)}/></label><label><span>Border halus pada tanggal</span><input type="checkbox" checked={settings.border} onChange={e=>setSetting('border',e.target.checked)}/></label></div>
            <button className="subtle-button full" onClick={resetDesign}><RotateCcw size={15}/> Reset desain</button>
          </section>
        </aside>

        <section className="preview-column">
          <div className="preview-top"><div><div className="eyebrow"><Image size={14}/> LIVE PREVIEW</div><h2>Begini hasilnya</h2><p>Setiap perubahan langsung kelihatan di sini.</p></div><div className="format-switch"><button className={format==='calendar'?'active':''} onClick={()=>setFormat('calendar')}>Kalender</button><button className={format==='wallpaper'?'active':''} onClick={()=>setFormat('wallpaper')}>Wallpaper HP</button></div></div>
          <div className={`preview-stage ${format==='wallpaper'?'wallpaper-stage':''}`}>
            <div ref={previewRef} className={`export-art ${isWallpaper?'wallpaper-art':'calendar-art'}`} style={previewStyle}>
              <div className="art-topline"><span className="art-brand">SHIFTSNAP <i/></span><span className="art-year">{year}</span></div>
              <div className="art-heading"><div><div className="art-kicker">WORK SCHEDULE</div><h3>{settings.title || 'Jadwal Kerja'}</h3><div className="art-month">{rangeMode ? rangeLabel : `${monthNames[month]} ${year}`}</div>{settings.owner&&<div className="art-owner">{settings.owner}</div>}</div><div className="art-month-mark">{rangeMode ? 'RANGE' : String(month+1).padStart(2,'0')}</div></div>
              <div className="art-weekdays">{weekdays.map(d=><span key={d}>{d}</span>)}</div>
              <div className={`art-grid ${isWallpaper?'art-grid-wallpaper':''} ${rangeMode?'range-art-grid':''}`}>{previewDays.map((c,i)=>{
                const shift=schedule[c.dateKey]
                const itemDate = c.dateKey ? new Date(c.dateKey+'T12:00:00') : null
                const today=!!itemDate&&itemDate.getDate()===now.getDate()&&itemDate.getMonth()===now.getMonth()&&itemDate.getFullYear()===now.getFullYear()
                return <div key={`${c.dateKey}-${i}`} className={`art-day ${!c.current?'art-outside':''} ${today?'art-today':''}`} style={{borderRadius:settings.radius,background:shift?shiftColors(shift,settings)+'20':settings.surface,border:settings.border?`1px solid ${shift?shiftColors(shift,settings)+'88':'#ffffff18'}`:'1px solid transparent'}}>
                  <span className="art-day-number" style={{color:c.current?settings.text:settings.muted}}>{c.day||''}</span>
                  {shift&&<span className="art-shift" style={{background:shiftColors(shift,settings),color:'#17202c',borderRadius:Math.min(settings.radius,8)}}>{shiftLabels[shift]}</span>}
                  {today&&<span className="today-dot" style={{background:settings.accent}}/>}
                </div>
              })}</div>
              {settings.showLegend&&<div className="art-legend">{(['pagi','sore','malam','libur'] as Shift[]).map(s=><span key={s}><i style={{background:settings[s]}}/>{shiftLabels[s]}</span>)}</div>}
              <div className="art-footer"><span>{settings.owner?`Dibuat untuk ${settings.owner}`:'JADWAL KERJA · LEBIH TERATUR'}</span><span>{shiftCounts.pagi}P · {shiftCounts.sore}S · {shiftCounts.malam}M · {shiftCounts.libur}L</span></div>
            </div>
          </div>
          <div className="download-panel"><div className="download-copy"><div className="download-icon"><Download size={19}/></div><div><strong>Jadwal siap diunduh</strong><span>PNG resolusi tinggi · {rangeMode?'Jadwal satu periode':format==='wallpaper'?'Wallpaper 9:16':'Kalender bulanan'}</span></div></div><button className="primary-button download-button" disabled={!rangeValid} onClick={downloadImage}><Download size={17}/> Download PNG</button></div>
          <div className="secondary-actions"><button className="subtle-button" onClick={saveNow}><Save size={15}/> Simpan data</button><button className="subtle-button" onClick={exportJSON}><Download size={15}/> Ekspor JSON</button><button className="subtle-button" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Impor JSON</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e=>{importJSON(e.target.files?.[0]);e.currentTarget.value=''}}/></div>
          {notice&&<div className="notice" role="status"><Check size={15}/>{notice}<button onClick={()=>setNotice('')} aria-label="Tutup">×</button></div>}
          <div className="tip-card"><div className="tip-icon"><Palette size={18}/></div><div><strong>Panduan</strong><p>Pilih tanggal pada kalender, tentukan jenis shift, lalu periksa hasilnya pada pratinjau. Jadwal tersimpan otomatis di browser perangkat ini.</p></div></div>
        </section>
      </div>
      <footer className="footer"><span>ShiftSnap © {now.getFullYear()}</span><span>Dibuat untuk jadwal kerja yang lebih rapi.</span></footer>
    </main>
  </div>
}
export default App
