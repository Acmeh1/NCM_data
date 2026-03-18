import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Auth from "@/pages/Auth";
import { Clock } from "lucide-react";

export default function AuthGuard({ children }: { children?: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const [approved, setApproved] = useState<boolean | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true);

  useEffect(() => {
    if (!user) {
      setApproved(null);
      setCheckingApproval(false);
      return;
    }

    const checkApproval = async () => {
      setCheckingApproval(true);
      const { data } = await supabase
        .from("profiles")
        .select("approved")
        .eq("id", user.id)
        .single();
      setApproved(true); // ON FORCE L'ACCÈS ICI
      setCheckingApproval(false);
    };

    checkApproval();

    // Listen for realtime approval changes
    const channel = supabase
      .channel(`approval-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => {
          setApproved(true); // ON FORCE L'ACCÈS ICI AUSSI
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading || checkingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-8 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">Compte en attente d'approbation</h1>
          <p className="text-sm text-muted-foreground">
            Votre compte a été créé avec succès. Un administrateur doit approuver votre accès avant que vous puissiez utiliser l'application.
          </p>
          <button
            onClick={signOut}
            className="text-sm text-primary underline hover:no-underline"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  return <>{children || <Outlet />}</>;
}
