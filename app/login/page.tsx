import type { Metadata } from "next";
import { AuthForm } from "@/components/umbra/auth-form";
export const metadata: Metadata = { title: "Entrar" };
export default function Page() {
  return <AuthForm mode="login" />;
}
