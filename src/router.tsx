import { Switch, Route, Redirect, useLocation } from "wouter";
import { useAuth } from "@/store/auth";
import { LoginPage } from "@/pages/login";
import { Layout } from "@/components/layout";
import { DashboardPage } from "@/pages/dashboard";
import { InventoryPage } from "@/pages/inventory";
import { RequestPage } from "@/pages/request";
import { AlertsPage } from "@/pages/alerts";
import MapPage from "@/pages/map";
import { DispatchPage } from "@/pages/dispatch";
import { TrackingPage } from "@/pages/tracking";
import { TransactionsPage } from "@/pages/transactions";

export function RequireAuth({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) return null;
  if (!profile) {
    navigate("/login");
    return null;
  }
  if (!roles.includes(profile.role)) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-500">
        <p className="font-medium">Access denied</p>
        <p className="text-sm mt-1">Your role ({profile.role}) is not authorized for this page.</p>
      </div>
    );
  }
  return <>{children}</>;
}

export function AppRouter() {
  const { isAuthenticated, loading, signOut } = useAuth();

  if (loading) return null;

  const protectedRoutes = (
    <Switch>
      <Route path="/login">
        <Redirect to="/dashboard" />
      </Route>
      <Route path="/dashboard">
        <DashboardPage />
      </Route>
      <Route path="/inventory">
        <RequireAuth roles={["requester", "supplier", "administrator"]}>
          <InventoryPage />
        </RequireAuth>
      </Route>
      <Route path="/request">
        <RequireAuth roles={["requester", "administrator"]}>
          <RequestPage />
        </RequireAuth>
      </Route>
      <Route path="/alerts">
        <RequireAuth roles={["supplier", "administrator"]}>
          <AlertsPage />
        </RequireAuth>
      </Route>
      <Route path="/map">
        <RequireAuth roles={["requester", "supplier", "administrator"]}>
          <MapPage />
        </RequireAuth>
      </Route>
      <Route path="/dispatch">
        <RequireAuth roles={["supplier", "administrator"]}>
          <DispatchPage />
        </RequireAuth>
      </Route>
      <Route path="/tracking">
        <RequireAuth roles={["requester", "supplier", "administrator"]}>
          <TrackingPage />
        </RequireAuth>
      </Route>
      <Route path="/transactions">
        <RequireAuth roles={["administrator", "supplier", "requester"]}>
          <TransactionsPage />
        </RequireAuth>
      </Route>
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
    </Switch>
  );

  if (!isAuthenticated) {
    return <LoginPage onSignOut={signOut} />;
  }

  return (
    <div className="h-screen flex flex-col">
      <Layout signOut={signOut}>{protectedRoutes}</Layout>
    </div>
  );
}
