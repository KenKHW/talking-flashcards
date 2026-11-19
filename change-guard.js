export function hasQuestionContent(card){return card.hotspots.some(h=>[h.question,...h.options].some(f=>['text','chinese','mtChinese'].some(key=>typeof f[key]==='string'&&f[key].trim())));}
