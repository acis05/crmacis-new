import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
async function main(){
  const email=process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password=process.env.ADMIN_PASSWORD;
  if(!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password || password.length<16 || password==="use-a-unique-long-random-password") throw new Error("Set ADMIN_EMAIL and a unique ADMIN_PASSWORD (min 16 chars).");
  if(await db.user.count({where:{role:"ADMIN"}})) throw new Error("Admin already exists; seed refused.");
  await db.user.create({data:{name:process.env.ADMIN_NAME||"Administrator",email,passwordHash:await bcrypt.hash(password,12),role:"ADMIN"}});
  console.log("Admin created:",email);
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
