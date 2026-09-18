import { readDoctorReport } from "@/lib/doctor/read-report";

export default function ProductionDoctorPage(){
  const report=readDoctorReport();
  return <main style={{padding:24,maxWidth:1100,margin:"0 auto"}}>
    <h1>Production Doctor</h1>
    <p>Diagnostic de préparation à la production. Le rapport CLI reste la source de vérité.</p>
    {!report ? <div><p>Aucun rapport généré.</p><pre>npm run doctor:production</pre><pre>npm run doctor:production:online</pre></div> : <>
      <div style={{display:"flex",gap:16,alignItems:"center",margin:"24px 0"}}>
        <strong style={{fontSize:36}}>{report.score}/100</strong><span>{report.verdict}</span>
      </div>
      <div style={{display:"grid",gap:10}}>{report.results.map(r=><div key={r.id} style={{border:"1px solid #ddd",borderRadius:10,padding:14}}>
        <strong>{r.status} — {r.label}</strong><div style={{marginTop:6}}>{r.detail}</div><small>{r.category}</small>
      </div>)}</div>
    </>}
  </main>
}
