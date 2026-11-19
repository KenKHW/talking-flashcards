export function synthesisHint(seconds){return seconds>=15?'等候較久，服務可能較忙。請保持頁面開啟，不用重複按；教材內容會保留。':'正在等候語音服務回應，請保持頁面開啟，不用重複按。';}
export function synthesisFailure(error){const message=error?.message||'無法取得語音';if(['TimeoutError','AbortError'].includes(error?.name)||/90 秒|逾時|timeout/i.test(message))return '語音服務等候逾時，教材內容已保留。請稍後按「重新嘗試」。';return `${message} 教材內容已保留，請檢查連線後按「重新嘗試」。`;}
