import { useLocation } from "wouter";
import { AuthModal } from "@/components/auth-modal";

export default function Login() {
  const [, navigate] = useLocation();

  return (
    <AuthModal
      open
      defaultTab="signin"
      onOpenChange={(open) => {
        if (!open) navigate("/");
      }}
    />
  );
}
