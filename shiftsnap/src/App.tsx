import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { CalendarDays, Download, Palette, RotateCcw, Save, Upload, WandSparkles, ChevronLeft, ChevronRight, ClipboardPaste, Image, Check, Moon, Sun, Sunset, Coffee, X, Info, CircleAlert, HelpCircle } from 'lucide-react'

type Shift = 'pagi' | 'sore' | 'malam' | 'libur'
type Schedule = Record<string, Shift>
type Settings = {
  title: string; owner: string; background: string; surface: string; text: string; muted: string;
  pagi: string; sore: string; malam: string; libur: string; accent: string; theme: string;
}
const defaults: Settings = {
  title: 'Jadwal Kerja', owner: '', background: '#0B1B2B', surface: '#142A40', text: '#F1F8FC',
  muted: '#9BB4C8', pagi: '#F4C66A', sore: '#55BCEB', malam: '#8C9EF5', libur: '#62D4BE', accent: '#55C9EF', theme: 'Ice Blue'
}
const presets: {name:string; values: Partial<Settings>}[] = [
  {name:'Ice Blue',values:{background:'#0B1B2B',surface:'#142A40',text:'#F1F8FC',muted:'#9BB4C8',pagi:'#F4C66A',sore:'#55BCEB',malam:'#8C9EF5',libur:'#62D4BE',accent:'#55C9EF'}},
  {name:'Pastel',values:{background:'#f5f1eb',surface:'#fffdf9',text:'#303344',muted:'#89899a',pagi:'#f6c8a8',sore:'#c9c5f5',malam:'#a9d5ff',libur:'#b8e0d2',accent:'#b68c77'}},
  {name:'Forest',values:{background:'#10251f',surface:'#1c3930',text:'#f0f7f1',muted:'#a0b9ad',pagi:'#f0c66b',sore:'#91b9e7',malam:'#7cb8ff',libur:'#7ed4a7',accent:'#7ed4a7'}},
  {name:'Clean',values:{background:'#f3f6fa',surface:'#ffffff',text:'#182230',muted:'#68778b',pagi:'#f6d365',sore:'#a9a5f5',malam:'#8fcaff',libur:'#9bdfc7',accent:'#4f6bdb'}},
  {name:'Neon',values:{background:'#11111b',surface:'#202033',text:'#f8f7ff',muted:'#a4a1c1',pagi:'#ffcc66',sore:'#b69cff',malam:'#55baff',libur:'#62e6c5',accent:'#b69cff'}}
]
// Kunci penyimpanan memakai ejaan "HanShift". Data lama (HannShift-*) tetap dibaca agar jadwal yang sudah tersimpan tidak hilang.
const STORAGE_KEY = 'HanShift-v1'
const LEGACY_STORAGE_KEY = 'HannShift-v1'
const TUTORIAL_KEY = 'HanShift-tutorial-seen'
const LEGACY_TUTORIAL_KEY = 'HannShift-tutorial-seen'
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
  // Rentang awal: tanggal 20 bulan ini sampai tanggal 20 bulan depan (tahun ikut naik otomatis saat Desember).
  const [rangeStart,setRangeStart] = useState(() => keyOf(now.getFullYear(),now.getMonth(),20))
  const [rangeEnd,setRangeEnd] = useState(() => { const e = new Date(now.getFullYear(),now.getMonth()+1,20); return keyOf(e.getFullYear(),e.getMonth(),20) })
  const [notice,setNotice] = useState('')
  const [showAbout,setShowAbout] = useState(false)
  const [showSplash,setShowSplash] = useState(true)
  const [splashExiting,setSplashExiting] = useState(false)
  const [showTutorial,setShowTutorial] = useState(false)
  const [tutorialStep,setTutorialStep] = useState(0)
  const [tourRect,setTourRect] = useState<{top:number;left:number;width:number;height:number}|null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const tourCardRef = useRef<HTMLElement>(null)
  const [tourCardPos, setTourCardPos] = useState<React.CSSProperties>({})

  // Penyimpanan browser bisa saja diblokir/penuh (mis. mode private), jadi selalu dibungkus try/catch.
  const persist = () => {
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify({schedule,settings,year,month})); return true }
    catch { return false }
  }
  const finishSplash = () => { setSplashExiting(true); window.setTimeout(() => setShowSplash(false), 700) }
  const closeTutorial = () => { setShowTutorial(false); try { localStorage.setItem(TUTORIAL_KEY,'yes') } catch { /* storage may be unavailable */ } }

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setSplashExiting(true), 3500)
    const removeTimer = window.setTimeout(() => setShowSplash(false), 4200)
    return () => { window.clearTimeout(exitTimer); window.clearTimeout(removeTimer) }
  }, [])
  const tutorialSteps = [
    { target: 'welcome', title: 'Selamat datang di HanShift', description: 'Ini adalah ruang kerja utama HanShift. Semua proses membuat jadwal, mengatur desain, dan melihat hasilnya tersedia dalam satu halaman.', tip: 'Ikuti sorotan untuk mengenal bagian penting aplikasi.' },
    { target: 'schedule', title: 'Pilih tanggal jadwal', description: 'Gunakan kalender ini untuk memilih tanggal yang ingin kamu atur. Periode jadwal bisa disesuaikan melalui pengaturan tanggal di atas kalender.', tip: 'Tanggal yang dipilih akan menjadi target pengaturan shift.' },
    { target: 'shifts', title: 'Pilih jenis shift', description: 'Setelah memilih tanggal, tentukan apakah kamu bekerja Pagi, Sore, Malam, atau sedang Libur.', tip: 'Ulangi langkah ini untuk tanggal lainnya. Kamu juga bisa memakai Input teks untuk mengisi banyak tanggal.' },
    { target: 'personalize', title: 'Buat tampilan sesuai selera', description: 'Di bagian Personalisasi, kamu bisa mengganti judul, nama, preset warna, dan warna desain agar jadwal punya tampilan yang kamu suka.', tip: 'Setiap perubahan akan langsung terlihat pada pratinjau.' },
    { target: 'preview', title: 'Lihat hasil secara langsung', description: 'Bagian ini menampilkan gambaran jadwal yang akan diunduh. Coba ganti format Kalender atau Wallpaper HP untuk melihat perbedaannya.', tip: 'Periksa kembali tanggal dan warna sebelum mengunduh.' },
    { target: 'download', title: 'Simpan dan bagikan jadwal', description: 'Jika hasilnya sudah sesuai, tekan Download PNG untuk menyimpan jadwal sebagai gambar berkualitas tinggi.', tip: 'Data jadwal juga tersimpan otomatis di browser perangkat ini.' }
  ]

  useEffect(() => {
    if (!showTutorial) { setTourRect(null); return }
    const selector = `[data-tour="${tutorialSteps[tutorialStep]?.target}"]`
    const target = document.querySelector<HTMLElement>(selector)
    if (!target) { setTourRect(null); return }
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const r = target.getBoundingClientRect()
        const pad = 9
        const top = Math.max(8, r.top - pad)
        const left = Math.max(8, r.left - pad)
        setTourRect({ top, left, width: Math.max(40, Math.min(r.width + pad * 2, window.innerWidth - left - 8)), height: Math.max(40, Math.min(r.height + pad * 2, window.innerHeight - top - 8)) })
      })
    }
    const settle = window.setTimeout(measure, 420)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { window.clearTimeout(settle); cancelAnimationFrame(frame); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [showTutorial, tutorialStep])

  // Hitung posisi tour card secara dinamis agar tidak menutupi elemen yang disorot.
  useEffect(() => {
    if (!tourRect) { setTourCardPos({}); return }
    const GAP = 18        // jarak antara spotlight ring dan card
    const MARGIN = 14     // jarak aman dari tepi layar
    const cardH = tourCardRef.current?.offsetHeight || 290
    const vh = window.innerHeight
    const spotlightBottom = tourRect.top + tourRect.height
    const spaceBelow = vh - spotlightBottom - GAP
    const spaceAbove = tourRect.top - GAP
    let top: number
    if (spaceBelow >= cardH + MARGIN) {
      // Cukup ruang di bawah elemen → tampilkan di bawah spotlight
      top = spotlightBottom + GAP
    } else if (spaceAbove >= cardH + MARGIN) {
      // Cukup ruang di atas elemen → tampilkan di atas spotlight
      top = tourRect.top - GAP - cardH
    } else {
      // Tidak ada ruang ideal → tempel di bawah layar dengan margin
      top = vh - cardH - MARGIN
    }
    // Pastikan card tidak keluar viewport
    top = Math.max(MARGIN, Math.min(top, vh - cardH - MARGIN))
    setTourCardPos({ top, bottom: 'auto' })
  }, [tourRect])

  useEffect(() => {
    if (showSplash) return
    let seen = false
    try { seen = localStorage.getItem(TUTORIAL_KEY) === 'yes' || localStorage.getItem(LEGACY_TUTORIAL_KEY) === 'yes' } catch { /* storage may be unavailable */ }
    if (!seen) { const timer = window.setTimeout(() => setShowTutorial(true), 200); return () => window.clearTimeout(timer) }
  }, [showSplash])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
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
    persist()
  },[schedule,settings,year,month])

  const daysInMonth = new Date(year,month+1,0).getDate()
  const firstOffset = (new Date(year,month,1).getDay()+6)%7
  const cells = useMemo(() => {
    // Sel kosong (day 0) mengisi hari sebelum tanggal 1 dan sesudah tanggal terakhir agar grid tetap 7 kolom.
    const arr: {day:number; current:boolean; dateKey:string}[] = []
    for(let i=0;i<firstOffset;i++) arr.push({day:0,current:false,dateKey:''})
    for(let d=1;d<=daysInMonth;d++) arr.push({day:d,current:true,dateKey:keyOf(year,month,d)})
    while(arr.length%7!==0) arr.push({day:0,current:false,dateKey:''})
    return arr
  },[year,month,daysInMonth,firstOffset])

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
  const changeMonth = (delta:number) => {
    const d = new Date(year,month+delta,1)
    setYear(d.getFullYear()); setMonth(d.getMonth())
    setSelected(keyOf(d.getFullYear(),d.getMonth(),1))
  }
  const parseBulk = () => {
    const text = bulkText.trim()
    if (!text) {
      setNotice('Silakan masukkan jadwal terlebih dahulu.')
      return
    }

    const next = { ...schedule }
    const appliedKeys = new Set<string>()
    let formatRecognized = false
    // Mode rentang: angka tanggal dicocokkan ke tanggal-tanggal di dalam periode (bisa lintas bulan).
    // Mode bulanan: angka tanggal dipakai pada bulan yang sedang dibuka di editor.
    const resolveDayKeys = (day: number): string[] => {
      if (rangeMode && rangeDates.length) return rangeDates.filter(r => r.day === day).map(r => r.dateKey)
      return day >= 1 && day <= daysInMonth ? [keyOf(year, month, day)] : []
    }
    const lines = text.split(/[\n;]+/).map(line => line.trim()).filter(Boolean)
    const shiftAliases: Record<string, Shift> = {
      pagi: 'pagi', p: 'pagi',
      sore: 'sore', s: 'sore',
      malam: 'malam', malem: 'malam', m: 'malam',
      libur: 'libur', l: 'libur', off: 'libur', o: 'libur'
    }

    for (const line of lines) {
      // Supports grouped input such as "1-5 pagi" or "1,2,3,4,5 pagi".
      const groupedMatch = line.match(/^([\d,\s-]+?)\s*(pagi|p|sore|s|malam|malem|m|libur|l|off|o)$/i)

      if (groupedMatch) {
        const datePart = groupedMatch[1].trim()
        const shift = shiftAliases[groupedMatch[2].toLowerCase()]
        const days = new Set<number>()
        const dateParts = datePart.split(',').map(part => part.trim()).filter(Boolean)

        for (const part of dateParts) {
          const rangeMatch = part.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/)
          if (rangeMatch) {
            const startDay = Number(rangeMatch[1])
            const endDay = Number(rangeMatch[2])
            if (startDay <= endDay) {
              for (let day = startDay; day <= endDay; day++) days.add(day)
            }
          } else if (/^\d{1,2}$/.test(part)) {
            days.add(Number(part))
          }
        }

        if (days.size) formatRecognized = true
        for (const day of days) {
          for (const dateKey of resolveDayKeys(day)) {
            next[dateKey] = shift
            appliedKeys.add(dateKey)
          }
        }
        continue
      }

      // Retains the older format: "1p, 2s, 3m, 4l".
      const tokens = line.split(',').map(token => token.trim()).filter(Boolean)
      for (const token of tokens) {
        const match = token.match(/^(\d{1,2})\s*[:=]?\s*(pagi|p|sore|s|malam|malem|m|libur|l|off|o)$/i)
        if (!match) continue

        formatRecognized = true
        const day = Number(match[1])
        const shift = shiftAliases[match[2].toLowerCase()]
        for (const dateKey of resolveDayKeys(day)) {
          next[dateKey] = shift
          appliedKeys.add(dateKey)
        }
      }
    }

    const count = appliedKeys.size
    if (count) {
      setSchedule(next)
      setNotice(`${count} tanggal berhasil dimasukkan atau diperbarui.`)
    } else if (formatRecognized) {
      setNotice(rangeMode && rangeDates.length ? 'Tanggal tersebut tidak ada di periode yang dipilih.' : 'Tanggal tersebut tidak ada di bulan yang sedang dibuka.')
    } else {
      setNotice('Format belum dikenali. Contoh: 1-5 pagi, 6,7,8 sore, atau 9-12 malam. Format lama seperti 1p, 2s juga tetap bisa.')
    }
  }
  const saveNow = () => {
    setNotice(persist() ? 'Jadwal dan desain berhasil disimpan di browser ini.' : 'Gagal menyimpan di browser ini (penyimpanan diblokir atau penuh). Gunakan Ekspor JSON sebagai cadangan.')
  }
  const resetDesign = () => { setSettings(defaults); setNotice('Desain dikembalikan ke pengaturan awal.') }
  const resetSchedule = () => {
    const hasSchedule = Object.keys(schedule).length > 0
    if (!hasSchedule) {
      setNotice('Jadwal sudah kosong. Anda dapat langsung memasukkan jadwal baru.')
      return
    }
    const confirmed = window.confirm('Hapus semua jadwal shift yang sudah ditandai? Pengaturan desain tetap tersimpan dan tindakan ini tidak dapat dibatalkan.')
    if (!confirmed) return
    setSchedule({})
    setBulkText('')
    setNotice('Semua jadwal berhasil direset. Anda dapat memasukkan jadwal baru.')
  }
  const downloadImage = async () => {
    if(!previewRef.current) return
    let exportHost: HTMLDivElement | null = null
    try {
      setNotice('Menyiapkan gambar…')
      // Render a detached copy at a fixed design width so mobile viewport
      // dimensions never shrink the exported calendar.
      exportHost = document.createElement('div')
      exportHost.style.cssText = 'position:fixed;left:-12000px;top:0;width:900px;pointer-events:none;z-index:-1;'
      const exportNode = previewRef.current.cloneNode(true) as HTMLDivElement
      exportNode.classList.add('export-fixed')
      exportNode.style.width = format === 'wallpaper' ? '360px' : '900px'
      exportNode.style.maxWidth = 'none'
      exportHost.appendChild(exportNode)
      document.body.appendChild(exportHost)
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      // Pastikan font sudah siap sebelum digambar, supaya hasil PNG tidak memakai font cadangan.
      if ('fonts' in document) await document.fonts.ready
      const dataUrl=await toPng(exportNode,{
        pixelRatio:2,
        cacheBust:true,
        backgroundColor:settings.background,
        width:format === 'wallpaper' ? 360 : 900
      })
      const a=document.createElement('a')
      a.download=`HanShift_${rangeMode?'Periode_'+rangeStart+'_sampai_'+rangeEnd:monthNames[month]+'_'+year}_${format==='wallpaper'?'Wallpaper':'Kalender'}.png`
      a.href=dataUrl; a.click()
      setNotice('Gambar PNG berhasil dibuat.')
    } catch (e) {
      console.error(e); setNotice('Ekspor gagal. Coba lagi atau gunakan browser Chrome terbaru.')
    } finally {
      exportHost?.remove()
    }
  }
  const exportJSON = () => {
    const blob=new Blob([JSON.stringify({schedule,settings,year,month},null,2)],{type:'application/json'})
    const url=URL.createObjectURL(blob); const a=document.createElement('a')
    a.href=url; a.download=`HanShift_${monthNames[month]}_${year}.json`; a.click(); URL.revokeObjectURL(url)
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
  // Hitungan shift hanya untuk tanggal yang tampil di preview/gambar (periode atau bulan aktif).
  const shiftCounts = useMemo(() => {
    const keys = rangeMode ? rangeDates.map(r => r.dateKey) : Array.from({length:daysInMonth},(_,i)=>keyOf(year,month,i+1))
    const counts: Record<Shift,number> = {pagi:0,sore:0,malam:0,libur:0}
    for (const k of keys) { const sh = schedule[k]; if (sh) counts[sh]++ }
    return counts
  },[schedule,rangeMode,rangeDates,daysInMonth,year,month])
  const rangeWeekdayOffset = rangeDates.length ? (rangeDates[0].date.getDay()+6)%7 : 0
  const previewDays = rangeMode ? [...Array.from({length:rangeWeekdayOffset},()=>({day:0,current:false,dateKey:''})), ...rangeDates] : format==='wallpaper' ? Array.from({length:daysInMonth},(_,i)=>({day:i+1,current:true,dateKey:keyOf(year,month,i+1)})) : cells
  const isWallpaper = format==='wallpaper'
  const rangeLabel = rangeStart && rangeEnd ? `${new Date(rangeStart+'T12:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long'})} – ${new Date(rangeEnd+'T12:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}` : 'Pilih periode jadwal'
  const rangeValid = !rangeMode || (rangeStart && rangeEnd && rangeStart <= rangeEnd)
  const previewStyle = {
    '--bg':settings.background,'--surface':settings.surface,'--text':settings.text,'--muted':settings.muted,
    '--pagi':settings.pagi,'--sore':settings.sore,'--malam':settings.malam,'--libur':settings.libur,'--accent':settings.accent,
    '--radius':'0px','--cell-gap':'5px','--font-size':'16px'
  } as React.CSSProperties

  if (showSplash) {
    return <div className={`splash-screen ${splashExiting ? 'splash-exiting' : ''}`} role="status" aria-label="Memuat HanShift" onClick={finishSplash}>
      <button type="button" className="splash-skip" onClick={e=>{e.stopPropagation();finishSplash()}}>Lewati</button>
      <div className="splash-orbit splash-orbit-top"/>
      <div className="splash-orbit splash-orbit-bottom"/>
      <div className="splash-content">
        <div className="splash-logo"><img src="/hanshift-icon.png" alt="Logo HanShift" className="hanshift-logo" /></div>
        <h1 className="splash-title">Han<span>Shift</span></h1>
        <p className="splash-tagline">Atur jadwal kerja dengan lebih mudah.</p>
        <div className="splash-loading"><span/></div>
        <div className="splash-loading-label">Menyiapkan jadwalmu...</div>
      </div>
      <div className="splash-credit">Dibuat oleh Rehan</div>
    </div>
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><img src="/hanshift-icon.png" alt="" /></div><div><strong>HanShift</strong><span>By Rehan</span></div></div>
      <div className="top-actions"><span className="saved-indicator"><span/> Tersimpan otomatis</span><button className="icon-button help-button" title="Cara menggunakan HanShift" aria-label="Cara menggunakan HanShift" onClick={()=>{setTutorialStep(0);setShowTutorial(true)}}><HelpCircle size={18}/><span className="help-label">Bantuan</span></button><button className="icon-button" title="Simpan sekarang" onClick={saveNow}><Save size={17}/></button></div>
    </header>
    <main className="page">
      <section className="intro" data-tour="welcome"><div><div className="eyebrow"><WandSparkles size={14}/> SHIFT PLANNER</div><h1><em>Jadwal kerja</em> yang lebih teratur.</h1><p>Atur jadwal kerja, pilih warna, lalu unduh sebagai gambar yang rapi untuk disimpan dan dibagikan.</p></div><div className="month-chip"><CalendarDays size={17}/><span>{monthNames[month]} {year}</span></div></section>
      <div className="workspace">
        <aside className="editor-column">
          <section className="panel">
            <div className="panel-heading"><div className="step">01</div><div><h2>Jadwal Kerja</h2><p>Pilih tanggal dan tentukan jenis shift.</p></div></div>
            <div className="range-settings"><label className="range-toggle"><input type="checkbox" checked={rangeMode} onChange={e=>setRangeMode(e.target.checked)}/><span>Jadwal berdasarkan rentang tanggal</span></label>{rangeMode&&<div className="range-date-fields"><label>Mulai<input type="date" value={rangeStart} onChange={e=>setRangeStart(e.target.value)}/></label><label>Selesai<input type="date" value={rangeEnd} min={rangeStart} onChange={e=>setRangeEnd(e.target.value)}/></label></div>}{rangeMode&&<p>Preview dan hasil download menampilkan tanggal dalam periode ini saja.</p>}</div>
            <div className="month-controls"><button className="icon-button" onClick={()=>changeMonth(-1)} aria-label="Bulan sebelumnya"><ChevronLeft size={18}/></button><strong>{monthNames[month]} {year}</strong><button className="icon-button" onClick={()=>changeMonth(1)} aria-label="Bulan berikutnya"><ChevronRight size={18}/></button></div>
            <div className="weekday-row">{weekdays.map(d=><span key={d}>{d}</span>)}</div>
            <div className="input-calendar" data-tour="schedule">{cells.map((c,i)=>c.day===0?<div key={`blank-${i}`} className="calendar-blank"/>:<button key={c.dateKey} className={`date-cell ${selected===c.dateKey?'selected':''}`} onClick={()=>setSelected(c.dateKey)}><span>{c.day}</span>{schedule[c.dateKey]&&<i style={{background:shiftColors(schedule[c.dateKey],settings)}}/>}</button>)}</div>
            <div className="selected-date">Tanggal dipilih <strong>{selected ? new Date(selected+'T12:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '—'}</strong></div>
            <div className="shift-buttons" data-tour="shifts">{(['pagi','sore','malam','libur'] as Shift[]).map(s=><button key={s} className={`shift-choice ${schedule[selected]===s?'active':''}`} onClick={()=>setShift(selected,s)}><span style={{background:settings[s]}}/>{shiftLabels[s]}</button>)}<button className="clear-choice" onClick={()=>setShift(selected,undefined)} title="Kosongkan tanggal"><RotateCcw size={15}/></button></div>
            <div className="stats-row"><div><Sun size={15}/><span>Pagi</span><b>{shiftCounts.pagi}</b></div><div><Sunset size={15}/><span>Sore</span><b>{shiftCounts.sore}</b></div><div><Moon size={15}/><span>Malam</span><b>{shiftCounts.malam}</b></div><div><Coffee size={15}/><span>Libur</span><b>{shiftCounts.libur}</b></div></div>
            <button className="subtle-button full" onClick={copyPreviousMonth}>Salin jadwal bulan sebelumnya</button>
            <button className="subtle-button full reset-schedule-button" onClick={resetSchedule}><RotateCcw size={15}/> Reset seluruh jadwal</button>
            <div className="entry-switch"><button className={entryMode==='calendar'?'active':''} onClick={()=>setEntryMode('calendar')}><CalendarDays size={15}/> Kalender</button><button className={entryMode==='text'?'active':''} onClick={()=>setEntryMode('text')}><ClipboardPaste size={15}/> Input teks</button></div>
            {entryMode==='text'&&<div className="bulk-entry"><label htmlFor="bulk">Isi beberapa tanggal sekaligus</label>{rangeMode&&<p className="bulk-hint">Mode rentang aktif: angka tanggal diterapkan ke tanggal yang cocok di dalam periode.</p>}<textarea id="bulk" value={bulkText} onChange={e=>setBulkText(e.target.value)} placeholder="Contoh: 1-5 pagi&#10;6,7,8 sore&#10;9-12 malam&#10;13-15 libur&#10;&#10;Format lama juga bisa: 1p, 2s, 3m, 4l"/><button className="primary-button full" onClick={parseBulk}>Terapkan jadwal</button></div>}
          </section>
          <section className="panel" data-tour="personalize">
            <div className="panel-heading"><div className="step">02</div><div><h2>Personalisasi</h2><p>Sesuaikan tampilan dengan preferensi Anda.</p></div></div>
            <div className="field"><label>Judul jadwal</label><input value={settings.title} onChange={e=>setSetting('title',e.target.value)} placeholder="Jadwal Kerja"/></div>
            <div className="field"><label>Nama (opsional)</label><input value={settings.owner} onChange={e=>setSetting('owner',e.target.value)} placeholder="Masukkan nama"/></div>
            <div className="field"><label>Preset warna</label><div className="preset-grid" data-tour="personalize">{presets.map(p=><button key={p.name} className={`preset ${settings.theme===p.name?'active':''}`} onClick={()=>applyPreset(p.name)}><span className="swatches">{[p.values.pagi,p.values.sore,p.values.libur].map(c=><i key={c} style={{background:c}}/>)}</span>{p.name}</button>)}</div></div>
            <div className="field"><label>Warna desain</label><div className="color-grid">{([{key:'background',label:'Latar'},{key:'surface',label:'Kartu'},{key:'text',label:'Teks'},{key:'accent',label:'Aksen'},{key:'pagi',label:'Pagi'},{key:'sore',label:'Sore'},{key:'malam',label:'Malam'},{key:'libur',label:'Libur'}] as {key:keyof Settings;label:string}[]).map(c=><label className="color-field" key={c.key}><input type="color" value={String(settings[c.key])} onChange={e=>setSetting(c.key,e.target.value)}/><span>{c.label}</span></label>)}</div></div>
            <div className="tip-card design-note"><div className="tip-icon"><Palette size={18}/></div><div><strong>Desain tabel otomatis</strong><p>Ukuran tanggal, jarak, bentuk kotak, dan label shift sudah diatur agar hasil unduhan selalu rapi. Anda tetap bisa mengganti warna sesuai selera.</p></div></div>
            <button className="subtle-button full" onClick={resetDesign}><RotateCcw size={15}/> Reset warna</button>
          </section>
        </aside>

        <section className="preview-column">
          <div className="preview-top"><div><div className="eyebrow"><Image size={14}/> LIVE PREVIEW</div><h2>Ini adalah contoh hasilnya</h2><p>Setiap perubahan langsung kelihatan di sini.</p><p>Anda bisa mengatur tanggalnya di tabel "Jadwal Kerja" di bawah.</p></div><div className="format-switch"><button className={format==='calendar'?'active':''} onClick={()=>setFormat('calendar')}>Kalender</button><button className={format==='wallpaper'?'active':''} onClick={()=>setFormat('wallpaper')}>Wallpaper HP</button></div></div>
          <div data-tour="preview" className={`preview-stage ${format==='wallpaper'?'wallpaper-stage':''}`}>
            <div ref={previewRef} className={`export-art ${isWallpaper?'wallpaper-art':'calendar-art'}`} style={previewStyle}>
              <div className="art-topline"><span className="art-brand">HanShift <i/></span><span className="art-year">{year}</span></div>
              <div className="art-heading"><div><div className="art-kicker">WORK SCHEDULE</div><h3>{settings.title || 'Jadwal Kerja'}</h3><div className="art-month">{rangeMode ? rangeLabel : `${monthNames[month]} ${year}`}</div>{settings.owner&&<div className="art-owner">{settings.owner}</div>}</div><div className="art-month-mark">{rangeMode ? 'RANGE' : String(month+1).padStart(2,'0')}</div></div>
              <div className="art-weekdays">{weekdays.map(d=><span key={d}>{d}</span>)}</div>
              <div className={`art-grid ${isWallpaper?'art-grid-wallpaper':''} ${rangeMode?'range-art-grid':''}`}>{previewDays.map((c,i)=>{
                const shift=schedule[c.dateKey]
                const itemDate = c.dateKey ? new Date(c.dateKey+'T12:00:00') : null
                const today=!!itemDate&&itemDate.getDate()===now.getDate()&&itemDate.getMonth()===now.getMonth()&&itemDate.getFullYear()===now.getFullYear()
                return <div key={`${c.dateKey}-${i}`} className={`art-day ${!c.current?'art-outside':''} ${today?'art-today':''}`} style={{background:shift?shiftColors(shift,settings)+'20':settings.surface,border:`1px solid ${shift?shiftColors(shift,settings)+'88':'#ffffff18'}`}}>
                  <span className="art-day-number" style={{color:c.current?settings.text:settings.muted}}>{c.day||''}</span>
                  {shift&&<span className="art-shift" style={{background:shiftColors(shift,settings),color:'#17202c',borderRadius:0}}>{shiftLabels[shift]}</span>}
                  {today&&<span className="today-dot" style={{background:settings.accent}}/>}
                </div>
              })}</div>
              <div className="art-legend">{(['pagi','sore','malam','libur'] as Shift[]).map(s=><span key={s}><i style={{background:settings[s]}}/>{shiftLabels[s]}</span>)}</div>
              <div className="art-footer"><span>{settings.owner?`Dibuat untuk ${settings.owner}`:'JADWAL KERJA · LEBIH TERATUR'}</span><span>{(shiftCounts).pagi} Pagi · {(shiftCounts).sore} Sore · {(shiftCounts).malam} Malam · {(shiftCounts).libur} Libur</span><span className="export-credit">Created by HanShift</span></div>
            </div>
          </div>
          <div className="download-panel"><div className="download-copy"><div className="download-icon"><Download size={19}/></div><div><strong>Jadwal siap diunduh</strong><span>PNG resolusi tinggi · {format==='wallpaper'?(rangeMode?'Wallpaper 9:16 · satu periode':'Wallpaper 9:16'):(rangeMode?'Jadwal satu periode':'Kalender bulanan')}</span></div></div><button data-tour="download" className="primary-button download-button" disabled={!rangeValid} onClick={downloadImage}><Download size={17}/> Download PNG</button></div>
          <div className="secondary-actions"><button className="subtle-button" onClick={saveNow}><Save size={15}/> Simpan data</button><button className="subtle-button" onClick={exportJSON}><Download size={15}/> Ekspor JSON</button><button className="subtle-button" onClick={()=>fileRef.current?.click()}><Upload size={15}/> Impor JSON</button><input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e=>{importJSON(e.target.files?.[0]);e.currentTarget.value=''}}/></div>
          {notice&&<div className="notice" role="status"><Check size={15}/>{notice}<button onClick={()=>setNotice('')} aria-label="Tutup">×</button></div>}
          <div className="tip-card"><div className="tip-icon"><CircleAlert size={18}/></div><div><strong>Panduan</strong><p>Pilih tanggal pada kalender, tentukan jenis shift, lalu periksa hasilnya pada pratinjau. Jadwal tersimpan otomatis di browser perangkat ini.</p></div></div>
        </section>
      </div>
      <footer className="footer"><span>HanShift © {now.getFullYear()}</span><span className="footer-credit">Dibuat oleh Rehan <button type="button" className="about-link" onClick={()=>setShowAbout(true)}><Info size={13}/> Tentang aplikasi</button></span></footer>
      {showTutorial&&<div className="spotlight-tour" role="presentation">
        <svg className="tour-dimmer" aria-hidden="true"><defs><mask id="tour-cutout"><rect width="100%" height="100%" fill="white"/>{tourRect&&<rect x={tourRect.left} y={tourRect.top} width={tourRect.width} height={tourRect.height} rx="16" fill="black" className="tour-mask-hole"/>}</mask></defs><rect width="100%" height="100%" fill="rgba(3, 10, 20, .78)" mask="url(#tour-cutout)"/></svg>
        {tourRect&&<div className="tour-spotlight-ring" style={{top:tourRect.top,left:tourRect.left,width:tourRect.width,height:tourRect.height}}/>}
        <section ref={tourCardRef} className="tour-card" style={tourCardPos} role="dialog" aria-modal="true" aria-labelledby="tour-title" key={tutorialStep}>
          <div className="tour-card-top"><span className="tour-kicker">HANSHIFT GUIDE</span><span className="tour-counter">{tutorialStep+1} / {tutorialSteps.length}</span><button type="button" className="tour-close" onClick={closeTutorial} aria-label="Tutup tutorial"><X size={17}/></button></div>
          <div className="tutorial-progress">{tutorialSteps.map((_,i)=><span key={i} className={i<=tutorialStep?'active':''}/>)}</div>
          <div className="tour-card-content"><div className="tour-sparkle"><WandSparkles size={18}/></div><h2 id="tour-title">{tutorialSteps[tutorialStep].title}</h2><p>{tutorialSteps[tutorialStep].description}</p><div className="tutorial-tip"><strong>Tips</strong><span>{tutorialSteps[tutorialStep].tip}</span></div></div>
          <div className="tour-card-actions"><button type="button" className="tour-skip" onClick={closeTutorial}>Lewati</button><div className="tour-nav">{tutorialStep>0&&<button type="button" className="tour-prev" onClick={()=>setTutorialStep(v=>Math.max(0,v-1))}>Kembali</button>}{tutorialStep<tutorialSteps.length-1?<button type="button" className="primary-button" onClick={()=>setTutorialStep(v=>Math.min(tutorialSteps.length-1,v+1))}>Berikutnya <ChevronRight size={16}/></button>:<button type="button" className="primary-button" onClick={closeTutorial}>Mulai gunakan <Check size={16}/></button>}</div></div>
        </section>
      </div>}
      {showAbout&&<div className="about-overlay" role="presentation" onClick={()=>setShowAbout(false)}><section className="about-dialog" role="dialog" aria-modal="true" aria-labelledby="about-title" onClick={e=>e.stopPropagation()}><button type="button" className="about-close" onClick={()=>setShowAbout(false)} aria-label="Tutup"><X size={18}/></button><div className="about-logo"><img src="/hanshift-icon.png" alt="Logo HanShift" /></div><div className="about-eyebrow">TENTANG APLIKASI</div><h2 id="about-title">HanShift</h2><p className="about-credit">By Rehan</p><p>HanShift membantu Anda menyusun jadwal kerja, menyesuaikan tampilan, dan mengunduh jadwal sebagai gambar agar mudah disimpan dan dibagikan.</p><div className="about-version">Studio Jadwal Kerja · Versi 1.0</div><button type="button" className="primary-button full" onClick={()=>setShowAbout(false)}>Tutup</button></section></div>}
    </main>
  </div>
}
export default App
