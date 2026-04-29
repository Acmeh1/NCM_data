import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invokeCloudFunction } from "@/lib/cloudFunctions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Shield, Factory, Wrench, RefreshCw, UserPlus, Eye, Pencil, PieChart, CheckCircle, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { uuidv4 } from "@/lib/uuid";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserWithPermissions {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  approved: boolean;
  production_view: boolean;
  production_edit: boolean;
  maintenance_view: boolean;
  maintenance_edit: boolean;
  dashboard_view: boolean;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [invitePerms, setInvitePerms] = useState({
    production_view: false,
    production_edit: false,
    maintenance_view: false,
    maintenance_edit: false,
    dashboard_view: false,
  });
  const [inviting, setInviting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, approved");
      if (profilesError) throw profilesError;

      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: permissions } = await supabase
        .from("user_permissions")
        .select("user_id, permission_key, can_view, can_edit");

      const userList: UserWithPermissions[] = (profiles || []).map((p) => {
        const userRoles = roles?.filter((r) => r.user_id === p.id) || [];
        const isAdmin = userRoles.some((r) => r.role === "admin");
        const userPerms: any[] = permissions?.filter((perm: any) => perm.user_id === p.id) || [];
        const prodPerm = userPerms.find((pp: any) => pp.permission_key === "production");
        const maintPerm = userPerms.find((pp: any) => pp.permission_key === "maintenance");
        const dashPerm = userPerms.find((pp: any) => pp.permission_key === "dashboard");

        return {
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          role: isAdmin ? "admin" : "user",
          approved: p.approved ?? false,
          production_view: prodPerm?.can_view ?? false,
          production_edit: prodPerm?.can_edit ?? false,
          maintenance_view: maintPerm?.can_view ?? false,
          maintenance_edit: maintPerm?.can_edit ?? false,
          dashboard_view: dashPerm?.can_view ?? false,
        };
      });

      setUsers(userList);
    } catch (e: any) {
      toast.error("Erreur: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleApproval = async (userId: string, currentApproved: boolean) => {
    const saveKey = userId + "approval";
    setSaving(saveKey);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ approved: !currentApproved })
        .eq("id", userId);
      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, approved: !currentApproved } : u))
      );
      toast.success(!currentApproved ? "Utilisateur approuvé" : "Utilisateur mis en attente");
    } catch (e: any) {
      toast.error("Erreur: " + e.message);
    } finally {
      setSaving(null);
    }
  };

  const updatePermission = async (
    userId: string,
    key: string,
    field: "can_view" | "can_edit",
    value: boolean
  ) => {
    const saveKey = userId + key + field;
    setSaving(saveKey);
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      const currentView = key === "production" ? user.production_view : key === "maintenance" ? user.maintenance_view : user.dashboard_view;
      const currentEdit = key === "production" ? user.production_edit : key === "maintenance" ? user.maintenance_edit : false;

      const newView = field === "can_view" ? value : currentView;
      const newEdit = field === "can_edit" ? value : currentEdit;
      const finalEdit = !newView ? false : newEdit;

      // Pas de contrainte UNIQUE dans la table, donc pas d'upsert (ON CONFLICT) possible
      const { data: existing, error: existingError } = await supabase
        .from("user_permissions")
        .select("id")
        .eq("user_id", userId)
        .eq("permission_key", key)
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;

      const { error } = existing
        ? await supabase
            .from("user_permissions")
            .update({ can_view: newView, can_edit: finalEdit })
            .eq("id", existing.id)
        : await supabase.from("user_permissions").insert({
            id: uuidv4(),
            user_id: userId,
            permission_key: key,
            can_view: newView,
            can_edit: finalEdit,
          });
      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          if (key === "production") {
            return { ...u, production_view: newView, production_edit: finalEdit };
          }
          if (key === "maintenance") {
            return { ...u, maintenance_view: newView, maintenance_edit: finalEdit };
          }
          return { ...u, dashboard_view: newView };
        })
      );
      toast.success("Permission mise à jour");
    } catch (e: any) {
      toast.error("Erreur: " + e.message);
    } finally {
      setSaving(null);
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    setSaving(userId + "delete");
    try {
      const { data, error } = await invokeCloudFunction("delete-user", { user_id: userId });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${userName || "Utilisateur"} supprimé`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (e: any) {
      toast.error("Erreur: " + e.message);
    } finally {
      setSaving(null);
    }
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    setSaving(userId + "role");
    console.log(`Toggling role for ${userId}. Current: ${currentRole}`);
    try {
      if (currentRole === "user") {
        // Promote to admin
        // 1. Check if they already have the role to avoid 400s
        const { data: existing } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("role", "admin" as any)
          .maybeSingle();

        if (!existing) {
          const { error: roleError } = await supabase.from("user_roles").insert({ 
            id: uuidv4(), 
            user_id: userId, 
            role: "admin" as any 
          });
          if (roleError) {
            console.error("Role (Insert) Error:", JSON.stringify(roleError, null, 2));
            throw roleError;
          }
        }
        
        // 2. Also ensure they are approved in profiles
        const { error: profileError } = await supabase.from("profiles").update({ approved: true }).eq("id", userId);
        if (profileError) {
          console.error("Profile Update Error:", JSON.stringify(profileError, null, 2));
          throw profileError;
        }
      } else {
        // Downgrade to user
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin" as any);
        if (error) {
          console.error("Role (Delete) Error:", JSON.stringify(error, null, 2));
          throw error;
        }
      }
      
      // Wait a tiny bit for the DB to propagate
      setTimeout(async () => {
        await fetchUsers();
        toast.success("Rôle mis à jour");
      }, 500);
      
    } catch (e: any) {
      console.error("Caught Exception:", JSON.stringify(e));
      toast.error("Erreur: " + e.message);
    } finally {
      setSaving(null);
    }
  };

  const inviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error("L'email est requis");
      return;
    }
    if (!invitePassword || invitePassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setInviting(true);
    try {
      const { data, error } = await invokeCloudFunction("invite-user", {
          email: inviteEmail.trim(),
          password: invitePassword,
          full_name: inviteName.trim(),
          permissions: [
            { key: "production", can_view: invitePerms.production_view, can_edit: invitePerms.production_edit },
            { key: "maintenance", can_view: invitePerms.maintenance_view, can_edit: invitePerms.maintenance_edit },
            { key: "dashboard", can_view: invitePerms.dashboard_view, can_edit: false },
          ],
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Utilisateur ${inviteEmail} créé avec succès`);
      setDialogOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInvitePassword("");
      setInvitePerms({ production_view: false, production_edit: false, maintenance_view: false, maintenance_edit: false, dashboard_view: false });
      await fetchUsers();
    } catch (e: any) {
      toast.error("Erreur: " + e.message);
    } finally {
      setInviting(false);
    }
  };

  // Separate pending and approved users
  const pendingUsers = users.filter((u) => !u.approved && u.role !== "admin");
  const approvedUsers = users.filter((u) => u.approved || u.role === "admin");

  return (
    <div className="space-y-6 max-w-[950px]">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérer les accès, permissions de lecture et modification
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <UserPlus className="h-4 w-4" />
                Ajouter un utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer un utilisateur</DialogTitle>
                <DialogDescription>
                  L'utilisateur pourra se connecter immédiatement avec ces identifiants.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email *</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="nom@entreprise.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-password">Mot de passe *</Label>
                  <Input
                    id="invite-password"
                    type="password"
                    placeholder="Minimum 6 caractères"
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Nom complet</Label>
                  <Input
                    id="invite-name"
                    placeholder="Prénom Nom"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label>Permissions</Label>
                  <div className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">
                        <Factory className="h-4 w-4" /> Production
                      </span>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Eye className="h-3.5 w-3.5" /> Voir
                          <Switch
                            checked={invitePerms.production_view}
                            onCheckedChange={(v) =>
                              setInvitePerms((p) => ({
                                ...p,
                                production_view: v,
                                production_edit: v ? p.production_edit : false,
                              }))
                            }
                          />
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Pencil className="h-3.5 w-3.5" /> Modifier
                          <Switch
                            checked={invitePerms.production_edit}
                            disabled={!invitePerms.production_view}
                            onCheckedChange={(v) =>
                              setInvitePerms((p) => ({ ...p, production_edit: v }))
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">
                        <Wrench className="h-4 w-4" /> Maintenance
                      </span>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Eye className="h-3.5 w-3.5" /> Voir
                          <Switch
                            checked={invitePerms.maintenance_view}
                            onCheckedChange={(v) =>
                              setInvitePerms((p) => ({
                                ...p,
                                maintenance_view: v,
                                maintenance_edit: v ? p.maintenance_edit : false,
                              }))
                            }
                          />
                        </label>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Pencil className="h-3.5 w-3.5" /> Modifier
                          <Switch
                            checked={invitePerms.maintenance_edit}
                            disabled={!invitePerms.maintenance_view}
                            onCheckedChange={(v) =>
                              setInvitePerms((p) => ({ ...p, maintenance_edit: v }))
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">
                        <PieChart className="h-4 w-4" /> Tableau de Bord
                      </span>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <Eye className="h-3.5 w-3.5" /> Voir
                          <Switch
                            checked={invitePerms.dashboard_view}
                            onCheckedChange={(v) =>
                              setInvitePerms((p) => ({ ...p, dashboard_view: v }))
                            }
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={inviteUser} disabled={inviting}>
                  {inviting ? "Création…" : "Créer l'utilisateur"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Chargement…</p>
      ) : users.length === 0 ? (
        <p className="text-muted-foreground text-sm">Aucun utilisateur trouvé.</p>
      ) : (
        <div className="space-y-6">
          {/* Pending users section */}
          {pendingUsers.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-orange-600">
                <Clock className="h-5 w-5" />
                En attente d'approbation ({pendingUsers.length})
              </h2>
              {pendingUsers.map((u) => (
                <Card key={u.id} className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/10 dark:border-orange-900/30">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {u.full_name || "Sans nom"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 text-orange-600 border-orange-300">
                          <Clock className="h-3 w-3 mr-1" />
                          En attente
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => toggleApproval(u.id, u.approved)}
                          disabled={saving === u.id + "approval"}
                          className="gap-1.5"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approuver
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" className="gap-1.5" disabled={saving === u.id + "delete"}>
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {u.full_name || u.email} sera définitivement supprimé. Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUser(u.id, u.full_name || u.email || "")}>
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Approved users section */}
          <div className="space-y-3">
            {pendingUsers.length > 0 && (
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Utilisateurs approuvés ({approvedUsers.length})
              </h2>
            )}
            {approvedUsers.map((u) => (
              <Card key={u.id}>
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {u.full_name || "Sans nom"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"} className="shrink-0">
                        <Shield className="h-3 w-3 mr-1" />
                        {u.role === "admin" ? "Admin" : "Utilisateur"}
                      </Badge>
                      {u.role !== "admin" && (
                        <Badge variant="outline" className="shrink-0 text-green-600 border-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approuvé
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {u.role !== "admin" && (
                        <>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-medium w-24 flex items-center gap-1.5">
                              <Factory className="h-3.5 w-3.5" /> Production
                            </span>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <Eye className="h-3 w-3 text-muted-foreground" />
                              <Switch
                                checked={u.production_view}
                                disabled={saving?.startsWith(u.id)}
                                onCheckedChange={(v) => updatePermission(u.id, "production", "can_view", v)}
                              />
                            </label>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                              <Switch
                                checked={u.production_edit}
                                disabled={!u.production_view || saving?.startsWith(u.id)}
                                onCheckedChange={(v) => updatePermission(u.id, "production", "can_edit", v)}
                              />
                            </label>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-medium w-24 flex items-center gap-1.5">
                              <Wrench className="h-3.5 w-3.5" /> Maintenance
                            </span>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <Eye className="h-3 w-3 text-muted-foreground" />
                              <Switch
                                checked={u.maintenance_view}
                                disabled={saving?.startsWith(u.id)}
                                onCheckedChange={(v) => updatePermission(u.id, "maintenance", "can_view", v)}
                              />
                            </label>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                              <Switch
                                checked={u.maintenance_edit}
                                disabled={!u.maintenance_view || saving?.startsWith(u.id)}
                                onCheckedChange={(v) => updatePermission(u.id, "maintenance", "can_edit", v)}
                              />
                            </label>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-medium w-24 flex items-center gap-1.5">
                              <PieChart className="h-3.5 w-3.5" /> Tableau de Bord
                            </span>
                            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                              <Eye className="h-3 w-3 text-muted-foreground" />
                              <Switch
                                checked={u.dashboard_view}
                                disabled={saving?.startsWith(u.id)}
                                onCheckedChange={(v) => updatePermission(u.id, "dashboard", "can_view", v)}
                              />
                            </label>
                          </div>
                        </>
                      )}
                      <div className="flex gap-2 self-end">
                        {u.role !== "admin" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-orange-600"
                            disabled={saving === u.id + "approval"}
                            onClick={() => toggleApproval(u.id, u.approved)}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Suspendre
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          disabled={saving === u.id + "role"}
                          onClick={() => toggleRole(u.id, u.role)}
                        >
                          {u.role === "admin" ? "Rétrograder" : "Promouvoir Admin"}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-xs text-destructive" disabled={saving === u.id + "delete"}>
                              <Trash2 className="h-3 w-3 mr-1" />
                              Supprimer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {u.full_name || u.email} sera définitivement supprimé. Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUser(u.id, u.full_name || u.email || "")}>
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
