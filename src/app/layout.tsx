import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'ISG Smart Library System',description:'Library management for Indian School Al Ghubra'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
