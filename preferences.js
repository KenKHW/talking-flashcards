// Match actual TTS voices to the selected MT dialect, retaining upstream IDs.
export function voicesFor(catalog,ethnicity,language){
 const row=catalog[ethnicity],label=row?.languages.find(([,id])=>id===language)?.[0];
 return (row?.voices||[]).filter(([,id])=>id.slice(0,id.lastIndexOf('_'))===label).map(([name,id])=>[name.split('_').at(-1),id]);
}
export function alignVoice(lesson,catalog){const list=voicesFor(catalog,lesson.ethnicity,lesson.language);if(!list.some(([,id])=>id===lesson.voice))lesson.voice=list[0]?.[1]||'';return list;}
export function taipeiDate(date=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 const get=type=>parts.find(p=>p.type===type).value;return `${get('year')}-${get('month')}-${get('day')}`;
}
