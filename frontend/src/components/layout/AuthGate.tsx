import type { ReactNode } from "react";
import type { AuthPageProps } from "../../pages/AuthPage";
import AuthPage from "../../pages/AuthPage";

interface AuthGateProps extends AuthPageProps {
  children: ReactNode;
  isAuthenticated: boolean;
}

export default function AuthGate({ children, isAuthenticated, ...authPageProps }: AuthGateProps) {
  if (!isAuthenticated) {
    return <AuthPage {...authPageProps} />;
  }

  return <>{children}</>;
}
