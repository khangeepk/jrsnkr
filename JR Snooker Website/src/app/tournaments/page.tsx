import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trophy, Swords, Calendar } from "lucide-react"

export default function TournamentsPage() {
    const matches = [
        { id: 1, p1: "Ronnie O'Sullivan", p2: "John Higgins", stage: "Semi-Final", score: "4 - 2", status: "Live", time: "Now" },
        { id: 2, p1: "Judd Trump", p2: "Neil Robertson", stage: "Semi-Final", score: "0 - 0", status: "Upcoming", time: "18:00" },
        { id: 3, p1: "Mark Selby", p2: "Ding Junhui", stage: "Quarter-Final", score: "5 - 3", status: "Finished", time: "Yesterday" },
    ]

    return (
        <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-primary dark:text-emerald-400">Tournament Board</h1>
                    <p className="text-muted-foreground mt-1">Live brackets and club match schedules.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Matches Feed */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-accent/40 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
                        <CardHeader className="bg-accent/5 pb-4 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center text-accent">
                                        <Trophy className="w-5 h-5 mr-2" />
                                        Winter Open Championship 2026
                                    </CardTitle>
                                    <CardDescription className="mt-1">Main Event - Final Stages</CardDescription>
                                </div>
                                <div className="bg-background px-3 py-1 rounded-full text-sm font-medium border text-muted-foreground flex items-center">
                                    <Calendar className="w-4 h-4 mr-2" /> Feb 26 - Mar 5
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-border">
                                {matches.map(match => (
                                    <div key={match.id} className="p-6 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row items-center justify-between gap-4">

                                        <div className="flex items-center justify-center gap-6 flex-1 w-full">
                                            <div className="text-right flex-1">
                                                <p className="font-bold text-lg">{match.p1}</p>
                                            </div>
                                            <div className="flex flex-col items-center justify-center w-24">
                                                <div className="bg-background border rounded px-3 py-1 text-lg font-mono font-bold w-full text-center tracking-widest shadow-inner">
                                                    {match.score}
                                                </div>
                                                <span className="text-xs text-muted-foreground mt-2 uppercase tracking-wider">{match.stage}</span>
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className="font-bold text-lg">{match.p2}</p>
                                            </div>
                                        </div>

                                        <div className="w-24 text-center sm:text-right">
                                            {match.status === "Live" && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 animate-pulse">
                                                    Live
                                                </span>
                                            )}
                                            {match.status === "Upcoming" && (
                                                <span className="text-sm font-medium text-emerald-500">{match.time}</span>
                                            )}
                                            {match.status === "Finished" && (
                                                <span className="text-sm text-muted-foreground">FT</span>
                                            )}
                                        </div>

                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Stats / Leaderboard */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Swords className="w-5 h-5 mr-2 text-primary" />
                                Club Leaderboard
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="flex items-center justify-between bg-background/50 p-3 rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 1 ? 'bg-yellow-400 text-yellow-900' : i === 2 ? 'bg-gray-300 text-gray-800' : i === 3 ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                                                {i}
                                            </div>
                                            <span className="font-medium">Player {i}</span>
                                        </div>
                                        <span className="font-mono text-sm text-emerald-500">{1000 - (i * 50)} pts</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}
