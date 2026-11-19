import {parseLesson} from './model.js?v=3.2-audio-simple';
export async function portableLink(lesson) {
  if(!globalThis.CompressionStream)throw Error('這個瀏覽器不支援分享連結，請改用新版 Chrome、Edge 或 Safari。');
  const stream=new Blob([JSON.stringify(lesson)]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
  const encoded=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
  const url=new URL(location.href);url.search='';url.hash=`material=${encoded}`;
  if(url.href.length>12000)throw Error('這份教材的分享網址較長，請使用雲端發布或匯出教材。');
  return url.href;
}
export async function readPortable(encoded) {
  if(encoded.length>20000)throw Error('教材連結過長。');
  const bytes=Uint8Array.from(atob(encoded.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
  const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks=[];let total=0;
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>3200000){await reader.cancel();throw Error('教材內容過大。');}chunks.push(value);}
  return parseLesson(await new Blob(chunks).text());
}
export function qrMarkup(url) {
  // QR codes are generated locally; lesson URLs are never sent to a QR service.
  try{const qr=globalThis.qrcode(0,'L');qr.addData(url);qr.make();return qr.createSvgTag({cellSize:3,margin:12,scalable:true,alt:'掃描開啟學生教材'});}catch{return '<p>網址較長，請直接複製連結分享。</p>';}
}
