import {lessonTitle} from './model.js?v=3.3-library';
import {mediaFiles,audioKey,imageSource} from './media.js?v=3.3-library';
import {CONFIG} from './config.js?v=3.3-library';
export const cloudReady=Boolean(CONFIG.SUPABASE_URL&&CONFIG.SUPABASE_ANON_KEY);
let session;
try{session=JSON.parse(sessionStorage.getItem('talking-session')||'null');}catch{session=null;}
export const currentUser=()=>session?.user||null;
const root=CONFIG.SUPABASE_URL.replace(/\/$/,'');
function saveSession(value){session=value;sessionStorage.setItem('talking-session',JSON.stringify(session));}
async function request(path,{method='GET',body,auth=true,headers={}}={}){
  if(!cloudReady)throw Error('雲端服務尚未設定，目前可使用本機草稿與匯出功能。');
  if(auth&&session&&session.expires_at<Date.now()/1000+60){
    const fresh=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token},auth:false});
    saveSession({...fresh,expires_at:Date.now()/1000+fresh.expires_in});
  }
  const response=await fetch(root+path,{method,headers:{apikey:CONFIG.SUPABASE_ANON_KEY,Authorization:`Bearer ${auth&&session?session.access_token:CONFIG.SUPABASE_ANON_KEY}`,'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  const data=await response.text();let parsed;try{parsed=JSON.parse(data);}catch{parsed=null;}
  if(!response.ok)throw Error(parsed?.msg||parsed?.message||'雲端操作失敗，請重新登入後再試。');
  return parsed;
}
export async function sendCode(email){return request('/auth/v1/otp',{method:'POST',auth:false,body:{email,create_user:true}});}
export async function verifyCode(email,token){const result=await request('/auth/v1/verify',{method:'POST',auth:false,body:{email,token,type:'email'}});saveSession({...result,expires_at:Date.now()/1000+result.expires_in});}
export async function signOut(){try{if(session)await request('/auth/v1/logout',{method:'POST'});}finally{saveSession(null);}}
export async function saveCloudLesson(lesson){
  if(!currentUser())throw Error('請先登入教師帳號。');
  await request('/rest/v1/lessons?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:{id:lesson.id,owner_id:currentUser().id,title:lessonTitle(lesson),document:lesson,updated_at:new Date().toISOString()}});
}
export async function listCloudLessons(){if(!currentUser())throw Error('請先登入。');return request('/rest/v1/lessons?select=id,title,document,updated_at&order=updated_at.desc');}
async function uploadAsset(path,blob){
  await request('/auth/v1/user');
  const response=await fetch(root+'/storage/v1/object/lesson-media/'+path,{method:'POST',headers:{apikey:CONFIG.SUPABASE_ANON_KEY,Authorization:`Bearer ${session.access_token}`,'Content-Type':blob.type||'application/octet-stream','x-upsert':'true'},body:blob,signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw Error('媒體上傳失敗，請確認 lesson-media 儲存空間與權限設定。');
  return root+'/storage/v1/object/public/lesson-media/'+path;
}
export async function publishCloudLesson(lesson){
  if(!currentUser())throw Error('請先登入教師帳號。');
  const snapshot=structuredClone(lesson);snapshot.audio={};
  for(const entry of await mediaFiles(lesson))snapshot.audio[entry.key]=await uploadAsset(`${currentUser().id}/audio/${entry.key}.${({'audio/webm':'webm','audio/mp4':'m4a','audio/ogg':'ogg','audio/mpeg':'mp3','audio/flac':'flac'}[entry.blob.type.split(';')[0]]||'wav')}`,entry.blob);
  for(let i=0;i<snapshot.cards.length;i++)if(snapshot.cards[i].customImage){
    const blob=await fetch(imageSource(snapshot.cards[i])).then(r=>r.blob());
    snapshot.cards[i].customImage=await uploadAsset(`${currentUser().id}/images/${lesson.id}-${i}-${Date.now()}.jpg`,blob);
  }
  await saveCloudLesson(snapshot);
  await request('/rest/v1/publications?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates'},body:{id:snapshot.id,owner_id:currentUser().id,document:snapshot,published_at:new Date().toISOString()}});
  const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('lesson',snapshot.id);return url.href;
}
export async function readPublication(id){if(!/^[a-f0-9-]{36}$/i.test(id))throw Error('教材網址格式不正確。');const rows=await request(`/rest/v1/publications?id=eq.${id}&select=document`,{auth:false});if(!rows?.length)throw Error('找不到這份教材，可能尚未發布或已取消分享。');return rows[0].document;}
export async function unpublishLesson(id){return request(`/rest/v1/publications?id=eq.${encodeURIComponent(id)}`,{method:'DELETE'});}
