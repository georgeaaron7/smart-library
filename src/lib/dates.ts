export function schoolDate(value:string|Date,timezone='Asia/Muscat') {
 return new Intl.DateTimeFormat('en-GB',{timeZone:timezone,day:'2-digit',month:'short',year:'numeric'}).format(new Date(value));
}
export function dayInZone(value:string|Date,timezone='Asia/Muscat') {
 return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
}
export function dayDistance(a:string,b:string) { return Math.round((Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/86400000); }
export function dueFromNow(days:number,timezone='Asia/Muscat') { const d=new Date(dayInZone(new Date(),timezone)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10); }
export function zonedEndOfDay(date:string,timezone='Asia/Muscat') {
 const part=new Intl.DateTimeFormat('en-US',{timeZone:timezone,timeZoneName:'shortOffset'}).formatToParts(new Date(date+'T12:00:00Z')).find(p=>p.type==='timeZoneName')?.value||'GMT';
 const match=part.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
 const offset=match?`${match[1]}${match[2].padStart(2,'0')}:${match[3]||'00'}`:'+00:00';
 return new Date(`${date}T23:59:00${offset}`).toISOString();
}
