"use server";

import { redirect } from "next/navigation";
import { clearAdminCookie, setAdminCookie } from "@/lib/admin/auth";

export const loginAdmin = async (formData: FormData) => {
  const password = String(formData.get("password") ?? "").trim();
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword) {
    throw new Error("Missing ADMIN_PASSWORD environment variable.");
  }

  if (password !== expectedPassword) {
    redirect("/admin?error=1");
  }

  setAdminCookie();
  redirect("/admin/stories");
};

export const logoutAdmin = async () => {
  clearAdminCookie();
  redirect("/admin");
};
