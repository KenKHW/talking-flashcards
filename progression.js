export function nextExercise(cards,cardIndex,questionIndex,solved){
 const list=cards.flatMap((card,c)=>card.hotspots.map((_,q)=>({cardIndex:c,questionIndex:q,key:`${c}-${q}`})));
 const current=list.findIndex(x=>x.cardIndex===cardIndex&&x.questionIndex===questionIndex);
 for(let offset=1;offset<=list.length;offset++){const item=list[(current+offset)%list.length];if(!solved.has(item.key))return {cardIndex:item.cardIndex,questionIndex:item.questionIndex};}
 return null;
}
