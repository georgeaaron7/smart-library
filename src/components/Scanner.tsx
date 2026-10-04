'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { CameraOff, Check, Keyboard, SwitchCamera, Flashlight, X } from 'lucide-react';

export function Scanner({title,onScan,onClose}:{title:string;onScan:(value:string)=>void;onClose:()=>void}) {
 const video=useRef<HTMLVideoElement>(null); const controls=useRef<IScannerControls|null>(null);
 const [error,setError]=useState(''); const [manual,setManual]=useState(''); const [devices,setDevices]=useState<MediaDeviceInfo[]>([]); const [deviceId,setDeviceId]=useState<string>(''); const [done,setDone]=useState(false);const [torch,setTorch]=useState(false);const [torchAvailable,setTorchAvailable]=useState(false);
 useEffect(()=>{ let mounted=true;const reader=new BrowserMultiFormatReader();
  async function start(){try { if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access is unavailable. Enter the code manually.');
   const list=await BrowserMultiFormatReader.listVideoInputDevices();if(mounted)setDevices(list);
   const chosen=deviceId||list.find(d=>/back|rear|environment/i.test(d.label))?.deviceId;
   controls.current=await reader.decodeFromVideoDevice(chosen||undefined,video.current!,result=>{if(result&&!done){setDone(true);try{const audio=new AudioContext();const tone=audio.createOscillator();const gain=audio.createGain();tone.frequency.value=660;gain.gain.value=.045;tone.connect(gain);gain.connect(audio.destination);tone.start();tone.stop(audio.currentTime+.09);tone.onended=()=>audio.close()}catch{}controls.current?.stop();onScan(result.getText());}});if(mounted)setTorchAvailable(!!controls.current.switchTorch);
  }catch(e){if(mounted)setError(e instanceof Error?e.message:'Camera access is unavailable. Enter the code manually.');}}
  start();return()=>{mounted=false;controls.current?.stop();};
 },[deviceId,onScan,done]);
 return <div className="modal-backdrop" role="presentation"><div className="scanner-modal" role="dialog" aria-modal="true" aria-label={title}>
  <div className="modal-head"><div><span className="eyebrow">CAMERA SCANNER</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close scanner"><X size={20}/></button></div>
  <div className="scanner-frame"><video ref={video} autoPlay playsInline muted/><span className="scan-corner top-left"/><span className="scan-corner top-right"/><span className="scan-corner bottom-left"/><span className="scan-corner bottom-right"/>{error&&<div className="scanner-error"><CameraOff size={28}/><p>{error}</p></div>}{done&&<div className="scanner-success"><Check size={34}/></div>}</div>
  <p className="helper">Position the QR code or ISBN barcode inside the frame.</p>
  {devices.length>1&&<label className="select-line"><SwitchCamera size={17}/> Camera <select value={deviceId} onChange={e=>setDeviceId(e.target.value)}><option value="">Automatic</option>{devices.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label||'Camera'}</option>)}</select></label>}
  {torchAvailable&&<button className="button secondary torch-button" onClick={async()=>{try{await controls.current?.switchTorch?.(!torch);setTorch(!torch)}catch{setError('Flashlight is unavailable on this camera.')}}}><Flashlight size={16}/>{torch?'Turn flashlight off':'Turn flashlight on'}</button>}
  <form className="manual-entry" onSubmit={e=>{e.preventDefault();if(manual.trim())onScan(manual.trim())}}><Keyboard size={18}/><input aria-label="Enter code manually" placeholder="Enter code manually" value={manual} onChange={e=>setManual(e.target.value)}/><button className="button primary" type="submit">Use code</button></form>
  <button className="button ghost full" onClick={onClose}>Cancel</button>
 </div></div>;
}
