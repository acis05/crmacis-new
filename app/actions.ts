"use server";
import { db } from "@/lib/db";
import { currentUser, accessibleLead } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LeadStatus, ActivityType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signOut } from "@/auth";
const clean=(v:FormDataEntryValue|null)=>String(v??"").trim();
const uuid=z.string().uuid();
function refresh(){for(const p of ["/dashboard","/leads","/pipeline","/follow-ups","/ai"])revalidatePath(p);}
export async function logout(){await signOut({redirectTo:"/login"});}
export async function addLead(form:FormData){
 const u=await currentUser();
 const name=clean(form.get("name")),phone=clean(form.get("phone"));
 if(!name || name.length>150 || !phone || phone.length>40)throw new Error("Nama dan telepon wajib diisi");
 const requested=clean(form.get("assignedToId"));
 const assignedToId=u.role==="ADMIN" && uuid.safeParse(requested).success?requested:u.id;
 const owner=await db.user.findFirst({where:{id:assignedToId,active:true}});
 if(!owner)throw new Error("Sales tidak valid");
 const estimatedValue=Number(clean(form.get("estimatedValue"))||0);
 if(!Number.isFinite(estimatedValue)||estimatedValue<0||estimatedValue>999999999999)throw new Error("Nilai tidak valid");
 await db.lead.create({data:{name,phone,source:clean(form.get("source")).slice(0,100)||null,product:clean(form.get("product")).slice(0,150)||null,estimatedValue,assignedToId,createdById:u.id}});
 refresh();redirect("/leads");
}
export async function updateLead(form:FormData){
 const u=await currentUser();const id=clean(form.get("id"));
 if(!uuid.safeParse(id).success||!await accessibleLead(id,u))throw new Error("Tidak punya akses");
 const name=clean(form.get("name")),phone=clean(form.get("phone"));
 if(!name||name.length>150||!phone||phone.length>40)throw new Error("Data tidak valid");
 const requested=clean(form.get("assignedToId"));
 const assignedToId=u.role==="ADMIN"&&uuid.safeParse(requested).success?requested:undefined;
 if(assignedToId&&!await db.user.findFirst({where:{id:assignedToId,active:true}}))throw new Error("Sales tidak valid");
 await db.lead.update({where:{id},data:{name,phone,source:clean(form.get("source")).slice(0,100)||null,product:clean(form.get("product")).slice(0,150)||null,...(assignedToId?{assignedToId}:{})}});
 refresh();redirect("/leads/"+id);
}
export async function setStatus(form:FormData){
 const u=await currentUser();const id=clean(form.get("id"));
 const parsed=z.nativeEnum(LeadStatus).safeParse(clean(form.get("status")));
 if(!uuid.safeParse(id).success||!parsed.success)throw new Error("Status tidak valid");
 const lead=await accessibleLead(id,u);if(!lead)throw new Error("Tidak punya akses");
 const status=parsed.data,reason=clean(form.get("lostReason")),value=Number(clean(form.get("closedValue"))||0);
 if(status==="LOST"&&!reason)throw new Error("Alasan gagal wajib diisi");
 if(status==="WON"&&(!Number.isFinite(value)||value<0))throw new Error("Nilai closing tidak valid");
 if(lead.status!==status)await db.$transaction(async tx=>{
  await tx.lead.update({where:{id},data:{status,lostReason:status==="LOST"?reason:null,closedValue:status==="WON"?value:null,closedAt:status==="WON"?new Date():null}});
  await tx.statusHistory.create({data:{leadId:id,userId:u.id,oldStatus:lead.status,newStatus:status}});
 });
 refresh();redirect("/leads/"+id);
}
export async function addActivity(form:FormData){
 const u=await currentUser(),id=clean(form.get("id"));
 if(!uuid.safeParse(id).success||!await accessibleLead(id,u))throw new Error("Tidak punya akses");
 const notes=clean(form.get("notes"));const type=z.nativeEnum(ActivityType).safeParse(clean(form.get("type")));
 if(!notes||notes.length>3000||!type.success)throw new Error("Aktivitas tidak valid");
 await db.activity.create({data:{leadId:id,userId:u.id,type:type.data,notes}});revalidatePath("/leads/"+id);
}
export async function addFollowUp(form:FormData){
 const u=await currentUser(),id=clean(form.get("id"));
 const lead=uuid.safeParse(id).success?await accessibleLead(id,u):null;
 if(!lead)throw new Error("Tidak punya akses");
 const dueAt=new Date(clean(form.get("dueAt")));
 if(Number.isNaN(dueAt.getTime()))throw new Error("Tanggal tidak valid");
 await db.followUp.create({data:{leadId:id,userId:lead.assignedToId,dueAt,notes:clean(form.get("notes")).slice(0,1000)||null}});
 refresh();redirect("/leads/"+id);
}
export async function finishFollowUp(form:FormData){
 const u=await currentUser(),id=clean(form.get("id"));
 if(!uuid.safeParse(id).success)throw new Error("Tidak valid");
 const task=await db.followUp.findFirst({where:{id,...(u.role==="ADMIN"?{}:{userId:u.id})}});
 if(!task)throw new Error("Tidak punya akses");
 await db.followUp.update({where:{id},data:{status:"DONE",completedAt:new Date()}});refresh();
}
export async function createSales(form:FormData){
 const u=await currentUser();if(u.role!=="ADMIN")throw new Error("Admin only");
 const email=clean(form.get("email")).toLowerCase(),name=clean(form.get("name")),password=clean(form.get("password"));
 if(!z.string().email().safeParse(email).success||!name||name.length>100||password.length<16)throw new Error("Nama/email tidak valid; password minimal 16 karakter");
 await db.user.create({data:{email,name,passwordHash:await bcrypt.hash(password,12),role:"SALES"}});
 revalidatePath("/settings");redirect("/settings");
}
