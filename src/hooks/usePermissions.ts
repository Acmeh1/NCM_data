import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type PermissionKey = "production" | "maintenance" | "dashboard";

interface UserPermissions {
  production: boolean;
  maintenance: boolean;
  dashboard: boolean;
  productionEdit: boolean;
  maintenanceEdit: boolean;
  isAdmin: boolean;
  loading: boolean;
}

export function usePermissions(): UserPermissions {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState({
    production: false,
    maintenance: false,
    dashboard: false,
    productionEdit: false,
    maintenanceEdit: false,
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions({
        production: false,
        maintenance: false,
        dashboard: false,
        productionEdit: false,
        maintenanceEdit: false,
      });
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const admin = roleData?.some((r) => r.role === "admin") ?? false;
    setIsAdmin(admin);

    if (admin) {
      setPermissions({
        production: true,
        maintenance: true,
        dashboard: true,
        productionEdit: true,
        maintenanceEdit: true,
      });
      setLoading(false);
      return;
    }

    const { data: permData } = await supabase
      .from("user_permissions")
      .select("permission_key, can_view, can_edit")
      .eq("user_id", user.id);

    const perms = {
      production: false,
      maintenance: false,
      dashboard: false,
      productionEdit: false,
      maintenanceEdit: false,
    };

    permData?.forEach((p: any) => {
      if (p.permission_key === "production") {
        perms.production = p.can_view;
        perms.productionEdit = p.can_edit;
      } else if (p.permission_key === "maintenance") {
        perms.maintenance = p.can_view;
        perms.maintenanceEdit = p.can_edit;
      } else if (p.permission_key === "dashboard") {
        perms.dashboard = p.can_view;
      }
    });

    setPermissions(perms);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`permissions-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_permissions", filter: `user_id=eq.${user.id}` },
        () => fetchPermissions()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${user.id}` },
        () => fetchPermissions()
      )
      .subscribe();

    const onFocus = () => fetchPermissions();
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, fetchPermissions]);

  return { ...permissions, isAdmin, loading };
}
