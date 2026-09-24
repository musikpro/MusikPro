"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/security/audit";

const roleSchema=z.object({userId:z.string().min(1).max(120),role:z.enum(["user","admin"])});
export async function setRole(formData:FormData){
  const adminSession=await requireAdmin();
  const parsed=roleSchema.parse(Object.fromEntries(formData));
  if(parsed.userId===adminSession.user.id&&parsed.role!=="admin") throw new Error("Vous ne pouvez pas retirer votre propre rôle admin depuis cet écran.");
  await auth.api.setRole({body:parsed,headers:await headers()});
  await writeAuditLog({action:"user.role.changed",actorId:adminSession.user.id,targetType:"user",targetId:parsed.userId,metadata:{role:parsed.role}});
  revalidatePath("/admin/users");
}

const deleteUserSchema=z.object({userId:z.string().min(1).max(120)});
export async function deleteUser(formData:FormData){
  const adminSession=await requireAdmin();
  const parsed=deleteUserSchema.parse(Object.fromEntries(formData));
  if(parsed.userId===adminSession.user.id) throw new Error("Vous ne pouvez pas supprimer votre propre compte depuis cet écran.");
  await auth.api.removeUser({body:parsed,headers:await headers()});
  await writeAuditLog({action:"user.deleted",actorId:adminSession.user.id,targetType:"user",targetId:parsed.userId});
  revalidatePath("/admin/users");
}
