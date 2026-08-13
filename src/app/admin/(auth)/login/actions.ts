"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = {
  error?: string;
  success?: boolean;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "E-posta ve şifre zorunludur." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/admin",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "E-posta veya şifre hatalı." };
        default:
          return { error: "Giriş yapılamadı. Lütfen tekrar deneyin." };
      }
    }
    throw error;
  }
}
