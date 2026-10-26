import "./globals.css";import type { Metadata } from "next";
export const metadata:Metadata={title:"SimpleCRM AI",description:"CRM sederhana untuk tim sales"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="id"><body>{children}</body></html>}
