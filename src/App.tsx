import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { IconHome, IconUsers, IconSettings } from "@tabler/icons-react";
import { useState } from "react";
import UsersTable from "@/components/UsersTable";
import { UserDetail } from "@/components/UserDetail";
import { mockUsers } from "@/data/mockUsers";
import type { User } from "@/data/mockUsers";

function App() {
  const [page, setPage] = useState<"Home" | "Users" | "Settings">("Users");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const TitleIcon =
    page === "Home" ? IconHome : page === "Users" ? IconUsers : IconSettings;

  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full">
        <Sidebar>
          <SidebarHeader>
            <div>Dashboard</div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Main</SidebarGroupLabel>
              <SidebarSeparator />
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={page === "Home"}
                    onClick={() => setPage("Home")}
                  >
                    <IconHome />
                    <span>Home</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={page === "Users"}
                    onClick={() => setPage("Users")}
                  >
                    <IconUsers />
                    <span>Users</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={page === "Settings"}
                    onClick={() => setPage("Settings")}
                  >
                    <IconSettings />
                    <span>Settings</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter />
        </Sidebar>

        <SidebarInset>
          <header className="flex h-14 items-center gap-3 border-b px-4">
            <SidebarTrigger />
            <h3 className="font-semibold flex items-center gap-2">
              <TitleIcon />
              <span>{page}</span>
            </h3>
          </header>

          <div className="px-4 py-4 w-full max-w-6xl mx-auto">
            {page === "Home" && (
              <div className="rounded-md border p-6">
                Welcome to the dashboard.
              </div>
            )}

            {page === "Users" && (
              <div className="space-y-4">
                <UsersTable
                  users={mockUsers}
                  onSelect={(u: User) => {
                    setSelectedUser(u);
                    setDetailOpen(true);
                  }}
                />
                <UserDetail
                  user={selectedUser}
                  open={detailOpen}
                  onOpenChange={setDetailOpen}
                />
              </div>
            )}

            {page === "Settings" && (
              <div className="rounded-md border p-6 text-sm text-muted-foreground">
                Settings coming soon.
              </div>
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default App;
