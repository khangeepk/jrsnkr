import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { tables, players, recentTransactions } from "@/lib/data/mock"
import { Activity, Clock, Users, DollarSign } from "lucide-react"

export default function Home() {
  const activeTables = tables.filter(t => t.status === "active").length;
  const totalRevenue = recentTransactions.reduce((acc, curr) => curr.status === "completed" ? acc + curr.amount : acc, 0);

  return (
    <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-primary dark:text-emerald-400">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome to JR Snooker Lounge Control Center.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Tables</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {activeTables} <span className="text-lg text-muted-foreground font-normal">/ {tables.length}</span>
            </div>
            <p className="text-xs text-emerald-500 mt-1 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
              Live capacity
            </p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Daily Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">428</div>
            <p className="text-xs text-muted-foreground mt-1">+4 new this week</p>
          </CardContent>
        </Card>

        <Card className="hover-scale">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Session Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">1h 45m</div>
            <p className="text-xs text-muted-foreground mt-1">Based on today's active games</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Session Overview */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Live Table Status</CardTitle>
            <CardDescription>Currently active tables and player counts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tables.filter(t => t.status === "active").map(table => (
                <div key={table.id} className="flex items-center justify-between p-4 border rounded-lg bg-background/50 glassmorphism hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    <div>
                      <p className="font-semibold">{table.name}</p>
                      <p className="text-sm text-muted-foreground">Players: {table.players}/{table.maxPlayers}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">01:24:15</p>
                    <p className="text-xs text-muted-foreground">Running</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions List */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest POS entries.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{tx.type}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className={`text-sm font-semibold ${tx.status === 'pending' ? 'text-accent' : 'text-foreground'}`}>
                    ${tx.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
