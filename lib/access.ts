import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
export async function currentUser() {
  const session=await auth();
  if (!session?.user?.id) redirect("/login");
  const user=await db.user.findUnique({where:{id:session.user.id},select:{id:true,name:true,email:true,role:true,active:true}});
  if (!user?.active) redirect("/login");
  return user;
}
export function leadScope(user:{id:string;role:string}) {return user.role==="ADMIN"?{}:{assignedToId:user.id};}
export async function accessibleLead(id:string,user:{id:string;role:string}) {
  return db.lead.findFirst({where:{id,...leadScope(user)}});
}
