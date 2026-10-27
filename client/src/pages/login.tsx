import { useLocation } from "wouter";
import { AuthModal } from "@/components/auth-modal";
import { getSafeReturnTo } from "@/lib/auth-redirect";

export default function Login() {
  const [, navigate] = useLocation();
  const returnTo = getSafeReturnTo(new URLSearchParams(window.location.search).get("next"));

  return (
    <AuthModal
      open
      defaultTab="signin"
      onOpenChange={(open) => {
        if (!open) navigate(returnTo);
      }}
    />
  );
}
