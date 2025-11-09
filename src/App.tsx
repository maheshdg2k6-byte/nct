import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AccountProvider } from "./contexts/AccountContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load pages for better performance
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Journal = lazy(() => import("./pages/Journal"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Playbooks = lazy(() => import("./pages/Playbooks"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Settings = lazy(() => import("./pages/Settings"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const SharedPortfolio = lazy(() => import("./pages/SharedPortfolio"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Landing = lazy(() => import("./pages/Landing"));

// Loading fallback component (no animations for faster render)
const PageSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-64" />
    <div className="space-y-3">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  </div>
);

// Optimized query client with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/landing" replace />;
  }

  return <>{children}</>;
}

// Auth Route Component (redirect authenticated users to dashboard)
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AccountProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Landing page for non-authenticated users */}
              <Route 
                path="/landing" 
                element={
                  <AuthRoute>
                    <Suspense fallback={<PageSkeleton />}>
                      <Landing />
                    </Suspense>
                  </AuthRoute>
                }
              />
              
              {/* Protected routes for authenticated users */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Suspense fallback={<PageSkeleton />}>
                        <Dashboard />
                      </Suspense>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/journal" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Suspense fallback={<PageSkeleton />}>
                        <Journal />
                      </Suspense>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Suspense fallback={<PageSkeleton />}>
                        <Analytics />
                      </Suspense>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/calendar" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Suspense fallback={<PageSkeleton />}>
                        <Calendar />
                      </Suspense>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/playbooks" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Suspense fallback={<PageSkeleton />}>
                        <Playbooks />
                      </Suspense>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/accounts" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Suspense fallback={<PageSkeleton />}>
                        <Accounts />
                      </Suspense>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Suspense fallback={<PageSkeleton />}>
                        <Settings />
                      </Suspense>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/portfolio" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Suspense fallback={<PageSkeleton />}>
                        <Portfolio />
                      </Suspense>
                    </Layout>
                  </ProtectedRoute>
                }
              />
              
              {/* Public shared portfolio route (no auth required) */}
              <Route 
                path="/shared-portfolio/:token" 
                element={
                  <Suspense fallback={<PageSkeleton />}>
                    <SharedPortfolio />
                  </Suspense>
                }
              />
              
              {/* Catch all route - redirect to landing if not authenticated */}
              <Route path="*" element={<Navigate to="/landing" replace />} />
            </Routes>
          </BrowserRouter>
        </AccountProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
