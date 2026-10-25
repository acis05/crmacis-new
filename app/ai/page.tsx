import Shell from "@/components/Shell";import {currentUser} from "@/lib/access";import AiForm from "@/components/AiForm";
export default async function AI(){await currentUser();return <Shell><h1>AI Sales Analyst</h1><div className="card"><p>Analisis didasarkan pada data yang boleh diakses oleh akun Anda. Angka dihitung oleh server, AI hanya menginterpretasi.</p><AiForm/></div></Shell>}
