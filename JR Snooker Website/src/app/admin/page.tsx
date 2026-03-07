import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldAlert, UserCog, Check, X } from "lucide-react"

export default function AdminPage() {
    const admins = [
        { id: 1, name: "Super Admin", role: "Master", perms: { view: true, add: true, edit: true, delete: true } },
        { id: 2, name: "Manager John", role: "Manager", perms: { view: true, add: true, edit: true, delete: false } },
        { id: 3, name: "Staff Sarah", role: "Cashier", perms: { view: true, add: true, edit: false, delete: false } },
    ];

    return (
        <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-destructive flex items-center">
                        <ShieldAlert className="w-8 h-8 mr-3" />
                        Admin Control Center
                    </h1>
                    <p className="text-muted-foreground mt-1">Configure system wide settings and manage administrative roles.</p>
                </div>
                <Button variant="default" className="bg-destructive hover:bg-destructive/90 text-white border-none shrink-0">
                    <UserCog className="mr-2 h-4 w-4" /> Add Admin User
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Permission Matrix</CardTitle>
                        <CardDescription>Assign specific rights (Add / Edit / Delete) to sub-admin accounts.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="w-full min-w-[600px] text-sm text-left">
                            <thead className="bg-muted text-muted-foreground uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4 font-semibold rounded-tl-lg">User</th>
                                    <th className="px-6 py-4 font-semibold text-center">View Dashboard</th>
                                    <th className="px-6 py-4 font-semibold text-center text-emerald-600 dark:text-emerald-400">Add Entry</th>
                                    <th className="px-6 py-4 font-semibold text-center text-accent">Edit Entry</th>
                                    <th className="px-6 py-4 font-semibold text-center text-destructive">Delete Entry</th>
                                    <th className="px-6 py-4 font-semibold text-right rounded-tr-lg">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {admins.map((admin) => (
                                    <tr key={admin.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-base">{admin.name}</div>
                                            <div className="text-muted-foreground text-xs">{admin.role}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {admin.perms.view ? <Check className="w-5 h-5 mx-auto text-emerald-500" /> : <X className="w-5 h-5 mx-auto text-muted-foreground" />}
                                        </td>
                                        <td className="px-6 py-4 text-center bg-emerald-500/5">
                                            {admin.perms.add ? <Check className="w-5 h-5 mx-auto text-emerald-500" /> : <X className="w-5 h-5 mx-auto text-muted-foreground" />}
                                        </td>
                                        <td className="px-6 py-4 text-center bg-accent/5">
                                            {admin.perms.edit ? <Check className="w-5 h-5 mx-auto text-accent" /> : <X className="w-5 h-5 mx-auto text-muted-foreground" />}
                                        </td>
                                        <td className="px-6 py-4 text-center bg-destructive/5">
                                            {admin.perms.delete ? <Check className="w-5 h-5 mx-auto text-destructive" /> : <X className="w-5 h-5 mx-auto text-muted-foreground" />}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="outline" size="sm" className="h-8">Configure</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t py-4 text-sm text-muted-foreground">
                        <p>* Master Admin role cannot have permissions reduced.</p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
