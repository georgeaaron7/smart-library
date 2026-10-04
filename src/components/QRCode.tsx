'use client';
import { useEffect,useState } from 'react';
import QRCodeLib from 'qrcode';
export function QRCode({value,size=132}:{value:string;size?:number}) {const [src,setSrc]=useState('');useEffect(()=>{QRCodeLib.toDataURL(value,{width:size,margin:1,color:{dark:'#083993',light:'#ffffff'}}).then(setSrc)},[value,size]);return src?<img src={src} width={size} height={size} alt={`QR code for ${value.startsWith('ISG-STUDENT')?'student card':'book copy'}`}/>:<span className="qr-placeholder"/>}
