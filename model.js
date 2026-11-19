import {taipeiDate} from './preferences.js?v=3.3-library';
export const TOPICS={A1:['跟家人的互動','日常作息','自我介紹','興趣與偏好'],A2:['拜訪親人','在商店買東西','談論天氣','問路']};
export const THEMES=['family','routine','intro','hobby','visit','shop','weather','directions'];
export const SCENE_LABELS=[['一起準備午餐','一起擺餐具','一起整理客廳'],['早晨梳洗','準備上學','睡前時光'],['教室裡的新朋友','公園裡認識彼此','校門口的招呼'],['公園裡的興趣','一起玩音樂','喜歡的點心'],['帶著禮物拜訪','在客廳聊聊天','庭院裡幫忙'],['市場買水果','麵包店買點心','文具店挑用品'],['晴天的公園','下雨的街道','起風的日子'],['公車站問路','尋找公園','看地圖找方向']];
export const countWords=text=>String(text).trim().split(/\s+/u).filter(Boolean).length;
export const limitFor=level=>level==='A2'?12:6;
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const imageKeyFor=topic=>THEMES[Object.values(TOPICS).flat().indexOf(topic)];
export const sceneLabel=key=>{const [theme,index]=key.split('-');return SCENE_LABELS[THEMES.indexOf(theme)]?.[Number(index)]||'老師上傳的圖片';};
export const field=(text='',chinese='')=>({text,chinese,mtChinese:''});
export const MAX_CARDS=3;
export const MAX_QUESTIONS=5;
export const totalQuestions=lesson=>lesson.cards.reduce((n,c)=>n+c.hotspots.length,0);
export function newQuestion(){return {x:50,y:60,question:field(),options:[field(),field(),field()],correct:0};}
export function newCard(index=0){return {level:'A1',topic:TOPICS.A1[0],image:`family-${index%3}`,customImage:'',hotspots:[newQuestion()]};}
export function newLesson(){return {version:3,id:crypto.randomUUID(),title:taipeiDate(),ethnicity:'排灣',language:'pwn_Cent',voice:'排灣_中_男聲',updatedAt:new Date().toISOString(),audio:{},cards:[newCard()]};}
export function addQuestion(card){if(card.hotspots.length>=MAX_QUESTIONS)return false;card.hotspots.push(newQuestion());return true;}
export function removeQuestion(card,index){if(card.hotspots.length<=1||!Number.isInteger(index)||index<0||index>=card.hotspots.length)return false;card.hotspots.splice(index,1);return true;}
export function addCard(lesson){if(lesson.cards.length>=MAX_CARDS)return -1;lesson.cards.push(newCard(lesson.cards.length));return lesson.cards.length-1;}
export function removeCard(lesson,index){if(lesson.cards.length<=1||!Number.isInteger(index)||index<0||index>=lesson.cards.length)return false;lesson.cards.splice(index,1);return true;}
export const lessonTitle=x=>x.title.trim()||x.cards.map(c=>c.topic).join(' × ');
export const completeHotspot=(h,level)=>[h.question,...h.options].every(f=>!(f.audioSource==='recording'&&!f.recordingKey)&&f.text.trim()&&countWords(f.text)<=limitFor(level)&&(f.chinese.trim()||f.mtChinese.trim()));
export const completedCount=x=>x.cards.reduce((n,c)=>n+c.hotspots.filter(h=>completeHotspot(h,c.level)).length,0);
export function errorsFor(x){const errors=[];if(!x.language||!x.voice)errors.push('請選擇語別與配音員');x.cards.forEach((c,i)=>c.hotspots.forEach((h,j)=>[h.question,...h.options].forEach((f,k)=>{const label=`圖卡 ${i+1}・問題 ${j+1}・${k===0?'問題句':`選項 ${String.fromCharCode(64+k)}`}`;if(f.audioSource==='recording'&&!f.recordingKey)errors.push(`${label}尚未錄音，請先錄音或改選合成語音`);if(!f.text.trim())errors.push(`${label}尚未填寫族語`);else if(countWords(f.text)>limitFor(c.level))errors.push(`${label}超過 ${limitFor(c.level)} 詞`);if(!f.chinese.trim()&&!f.mtChinese.trim())errors.push(`${label}尚未填寫中文解釋`);})));return errors;}
export function nextImage(card,other,random=Math.random){const list=[0,1,2].map(i=>`${imageKeyFor(card.topic)}-${i}`).filter(key=>key!==card.image&&key!==other?.image);return list[Math.floor(random()*list.length)]||`${imageKeyFor(card.topic)}-0`;}
export function parseLesson(input){
 const x=structuredClone(typeof input==='string'?JSON.parse(input):input);
 if(!x||![1,2,3].includes(x.version)||!Array.isArray(x.cards)||x.cards.length<1||x.cards.length>MAX_CARDS)throw Error('不是支援的教材格式');
 if(x.version===1){x.cards.forEach(c=>{c.level=x.level;c.topic=x.topic;c.customImage='';});if(x.title==='這是什麼？一起認識水果')x.title='';delete x.level;delete x.topic;}x.version=3;
 for(const key of ['title','ethnicity','language','voice'])if(typeof x[key]!=='string'||x[key].length>(key==='title'?100:300))throw Error('教材欄位格式錯誤');
 if(typeof x.id!=='string'||!/^[a-f0-9-]{36}$/i.test(x.id))throw Error('教材編號格式錯誤');
 for(const c of x.cards){
  if(!['A1','A2'].includes(c.level)||!TOPICS[c.level].includes(c.topic)||!new RegExp(`^(${THEMES.join('|')})-[012]$`).test(c.image)||!Array.isArray(c.hotspots)||c.hotspots.length<1||c.hotspots.length>MAX_QUESTIONS)throw Error('圖卡設定格式錯誤');
  c.customImage??='';if(typeof c.customImage!=='string'||c.customImage.length>1500000||(c.customImage&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(c.customImage)&&!/^https:\/\//.test(c.customImage)))throw Error('圖片格式不支援');
  for(const h of c.hotspots){if(!Number.isFinite(h.x)||!Number.isFinite(h.y)||h.x<0||h.x>100||h.y<0||h.y>100||![0,1,2].includes(h.correct)||!Array.isArray(h.options)||h.options.length!==3)throw Error('問題熱點格式錯誤');for(const f of [h.question,...h.options])for(const key of ['text','chinese','mtChinese'])if(typeof f?.[key]!=='string'||f[key].length>3000)throw Error('問答格式錯誤');}
 }
 for(const c of x.cards)for(const h of c.hotspots)for(const f of [h.question,...h.options]){if(f.audioSource!==undefined&&!['tts','recording'].includes(f.audioSource))throw Error('聲音來源格式錯誤');if(f.recordingKey!==undefined&&!/^[a-f0-9]{64}$/.test(f.recordingKey))throw Error('錄音格式錯誤');}
 x.audio??={};if(!x.audio||Array.isArray(x.audio)||typeof x.audio!=='object')throw Error('語音資料格式錯誤');
 for(const [key,url]of Object.entries(x.audio))if(!/^[a-f0-9]{64}$/.test(key)||typeof url!=='string'||url.length>5000000||!/^https:\/\//.test(url))throw Error('語音網址格式錯誤');
 return x;
}
