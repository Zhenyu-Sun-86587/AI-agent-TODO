import type { ReactNode } from "react";
import type { AuthPageProps } from "../../pages/AuthPage";
import AuthPage from "../../pages/AuthPage";

interface AuthGateProps extends AuthPageProps {
  children: ReactNode;
  isAuthenticated: boolean;
}

export default function AuthGate({ children, isAuthenticated, ...authPageProps }: AuthGateProps) {
  // 未登录时直接切回认证页，让布局层不用关心登录态分支。
  if (!isAuthenticated) {
    return <AuthPage {...authPageProps} />;
  }

  return <>{children}</>;
}
