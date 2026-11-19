import {normaliseAudioBlob,playbackErrorMessage} from './audio-format.js?v=3.3-library';
import {synthesizeSpeech,stopSpeech} from './api.js?v=3.3-library';
import {lessonTitle} from './model.js?v=3.3-library';
const encoder=new TextEncoder();
let database;
function openDB(){return database??=new Promise((resolve,reject)=>{const req=indexedDB.open('talking-media-v2',1);req.onupgradeneeded=()=>req.result.createObjectStore('audio');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(Error('無法使用本機語音儲存空間。'));});}
async function readBlob(key){const db=await openDB();return new Promise((resolve,reject)=>{const req=db.transaction('audio').objectStore('audio').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function writeBlob(key,blob){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('audio','readwrite');tx.objectStore('audio').put(blob,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(Error('儲存語音失敗，請檢查裝置空間。'));});}
export async function audioKey(lesson,text){const bytes=await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify([lesson.ethnicity,lesson.voice,text.trim()])));return [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');}
export const usesRecording=f=>f?.audioSource==='recording'&&!!f.recordingKey;
export const fieldAudioKey=(lesson,f)=>usesRecording(f)?Promise.resolve(f.recordingKey):audioKey(lesson,f.text);
export async function saveTeacherAudio(file){
 const blob=await normaliseAudioBlob(file);
 if(blob.size<50||blob.size>10000000||!blob.type.startsWith('audio/'))throw Error('請選擇 10 MB 以下的有效音檔（WAV、MP3、M4A、Ogg 或 WebM）。');
 const bytes=await crypto.subtle.digest('SHA-256',encoder.encode(crypto.randomUUID()));
 const key=[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');await writeBlob(key,blob);return key;
}
export async function audioEntries(lesson){const map=new Map();for(const c of lesson.cards)for(const h of c.hotspots)for(const f of [h.question,...h.options])if(f.text.trim()){const key=await fieldAudioKey(lesson,f);map.set(key,{key,text:f.text,recording:usesRecording(f)});}return [...map.values()];}
export async function preparedCount(lesson){let ready=0;const entries=await audioEntries(lesson);for(const e of entries)if(lesson.audio[e.key]||await readBlob(e.key))ready++;return {ready,total:entries.length};}
export async function prepareAudio(lesson,onProgress,signal){
 const entries=await audioEntries(lesson);let ready=0;
 for(const e of entries){
  signal?.throwIfAborted();
  if(!await readBlob(e.key)){
   if(e.recording&&!lesson.audio[e.key])throw Error('找不到老師的錄音，請重新錄製或上傳，或切回合成語音。');
   const url=lesson.audio[e.key]||await synthesizeSpeech({text:e.text,ethnicity:lesson.ethnicity,voice:lesson.voice});
   signal?.throwIfAborted();const response=await fetch(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)});
   if(!response.ok)throw Error('音檔下載失敗，請重試；已完成的部分會保留。');
   const blob=await normaliseAudioBlob(await response.blob());if(blob.size<50||blob.size>10000000||blob.type.includes('text')||blob.type.includes('json'))throw Error('服務回傳的音檔格式不正確。');
   await writeBlob(e.key,blob);
  }
  ready++;onProgress({ready,total:entries.length,text:e.text});
 }
 return entries;
}
let audio=null,playVersion=0,blobURL='';
export function stopPrepared(){playVersion++;stopSpeech();if(audio){audio.onended=null;audio.onerror=null;audio.pause();audio.removeAttribute('src');audio.load();audio=null;}if(blobURL){URL.revokeObjectURL(blobURL);blobURL='';}}
export async function playPrepared(lesson,text,onStatus,field={text}){
 stopPrepared();const version=playVersion,key=await fieldAudioKey(lesson,field),blob=await readBlob(key);
 if(version!==playVersion)return false;
 const url=blob?URL.createObjectURL(await normaliseAudioBlob(blob)):lesson.audio[key];if(!url){if(usesRecording(field))throw Error('找不到這一句的老師錄音，請回編輯頁重新錄製或上傳。');return false;}
 if(blob)blobURL=url;audio=document.getElementById('prepared-audio-player')||Object.assign(document.createElement('audio'),{id:'prepared-audio-player',hidden:true});if(!audio.isConnected)document.body.append(audio);audio.src=url;audio.load();onStatus('正在播放已準備的語音');
 audio.onended=()=>{if(version===playVersion)onStatus('播放完畢');};audio.onerror=()=>{if(version===playVersion)onStatus('音檔無法播放，請重新準備語音。');};
 try{await audio.play();}catch(error){if(version===playVersion)throw Error(playbackErrorMessage(error));}return true;
}
export const imageSource=card=>card.customImage||`./${card.image}.jpg`;
const dataURL=blob=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('檔案讀取失敗。'));reader.readAsDataURL(blob);});
export async function mediaFiles(lesson){const result=[];for(const e of await audioEntries(lesson)){const blob=await readBlob(e.key);if(!blob)throw Error('請先完成語音準備。');result.push({...e,blob});}return result;}
export async function standaloneLesson(lesson,onProgress=()=>{}){
 const copy=structuredClone(lesson);copy.audio={};
 for(const e of await mediaFiles(lesson)){copy.audio[e.key]=await dataURL(await normaliseAudioBlob(e.blob));onProgress();}
 for(const c of copy.cards){for(const h of c.hotspots)for(const f of [h.question,...h.options])f.audioKey=await fieldAudioKey(copy,f);const response=await fetch(imageSource(c));if(!response.ok)throw Error('圖片讀取失敗。');c.customImage=await dataURL(await response.blob());}
 const template=await fetch('./standalone.html').then(r=>{if(!r.ok)throw Error('教材範本載入失敗。');return r.text();});
 return template.replace('__LESSON_DATA__',()=>JSON.stringify(copy).replaceAll('<','\\u003c')).replace('__LESSON_TITLE__',()=>lessonTitle(copy).replace(/[&<>"']/g,''));
}
