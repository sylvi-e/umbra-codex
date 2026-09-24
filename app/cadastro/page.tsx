import type { Metadata } from "next";
import { AuthForm } from "@/components/umbra/auth-form";
export const metadata: Metadata = { title: "Criar conta" };
export default function Page() {
  return <AuthForm mode="signup" />;
}
