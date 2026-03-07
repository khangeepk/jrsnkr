import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { players } from "@/lib/data/mock"
import { Trophy, Activity, Medal } from "lucide-react"

export default function PlayersPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-screen-2xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-primary dark:text-emerald-400">Player Profiles</h1>
                    <p className="text-muted-foreground mt-1">Manage club members, rankings, and history.</p>
                </div>
                <Button variant="emerald">Add New Player</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {players.map(player => (
                    <Card key={player.id} className="hover-scale">
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold text-lg">
                                        {player.name.charAt(0)}
                                    </div>
                                    <div>
                                        <CardTitle className="text-xl">{player.name}</CardTitle>
                                        <CardDescription className="flex items-center mt-1 text-accent font-medium">
                                            <Medal className="w-4 h-4 mr-1" />
                                            {player.rank}
                                        </CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pb-4">
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="bg-muted p-3 rounded-lg flex flex-col items-center">
                                    <span className="text-sm text-muted-foreground mb-1 flex items-center">
                                        <Trophy className="w-4 h-4 mr-1" /> Points
                                    </span>
                                    <span className="font-bold text-lg text-foreground">{player.points.toLocaleString()}</span>
                                </div>
                                <div className="bg-muted p-3 rounded-lg flex flex-col items-center">
                                    <span className="text-sm text-muted-foreground mb-1 flex items-center">
                                        <Activity className="w-4 h-4 mr-1" /> Games
                                    </span>
                                    <span className="font-bold text-lg text-foreground">{player.gamesPlayed}</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full">View Full History</Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
